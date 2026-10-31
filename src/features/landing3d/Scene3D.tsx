import React, { useEffect, useRef, useState } from 'react';
import type * as T from 'three';
import { createGarageStage } from './stages/garageCar';
import { createMapStage } from './stages/mapCity';
import { createNutBoltStage } from './stages/nutBolt';
import { createPinFinaleStage } from './stages/pinFinale';
import { createTrustStage } from './stages/trust';
import type { HoverInfo, SharedState, Stage } from './types';
import { clamp01, damp, range, readPalette, smooth } from './util';

interface Scene3DProps {
  ctaHoverRef: React.MutableRefObject<boolean>;
  onStatusChange?: (closed: boolean) => void;
}

interface Tip {
  title: string;
  lines: string[];
}

const STAGE_SPACING = 60;
const FINALE = 4;

export const Scene3D: React.FC<Scene3DProps> = ({ ctaHoverRef, onStatusChange }) => {
  const hostRef = useRef<HTMLDivElement>(null);
  const tipRef = useRef<HTMLDivElement>(null);
  const [tip, setTip] = useState<Tip | null>(null);
  const [supported, setSupported] = useState(true);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    let disposed = false;
    let cleanup: (() => void) | null = null;

    const start = async () => {
      const THREE = await import('three');
      const { RoomEnvironment } = await import('three/examples/jsm/environments/RoomEnvironment.js');
      if (disposed) return;

      let renderer: T.WebGLRenderer;
      try {
        renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
      } catch {
        setSupported(false);
        return;
      }

      const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      const palette = readPalette();
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, window.innerWidth < 800 ? 1.5 : 2));
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 1.05;
      renderer.shadowMap.enabled = true;
      renderer.shadowMap.type = THREE.PCFSoftShadowMap;
      renderer.domElement.setAttribute('aria-hidden', 'true');
      host.appendChild(renderer.domElement);

      const bgColor = new THREE.Color(palette.bg);
      const accentColor = new THREE.Color(palette.field);
      const currentBg = bgColor.clone();
      renderer.setClearColor(currentBg);

      const scene = new THREE.Scene();
      scene.fog = new THREE.Fog(currentBg, 75, 190);
      const pmrem = new THREE.PMREMGenerator(renderer);
      const environment = pmrem.fromScene(new RoomEnvironment(), 0.04);
      scene.environment = environment.texture;
      const sun = new THREE.DirectionalLight(0xffffff, 1.5);
      sun.castShadow = true;
      sun.shadow.mapSize.set(2048, 2048);
      sun.shadow.camera.left = -26;
      sun.shadow.camera.right = 26;
      sun.shadow.camera.top = 26;
      sun.shadow.camera.bottom = -26;
      sun.shadow.camera.near = 1;
      sun.shadow.camera.far = 90;
      sun.shadow.bias = -0.0006;
      sun.shadow.normalBias = 0.03;
      scene.add(sun, sun.target, new THREE.HemisphereLight(0xffffff, 0x888888, 0.55));

      const camera = new THREE.PerspectiveCamera(34, 1, 0.1, 400);
      const shared: SharedState = { ctaHover: false };

      const stages: Stage[] = [
        createNutBoltStage({ THREE, palette, originX: 0 }),
        createMapStage({ THREE, palette, originX: STAGE_SPACING }),
        createGarageStage({ THREE, palette, originX: STAGE_SPACING * 2, onStatusChange }),
        createTrustStage({ THREE, palette, originX: STAGE_SPACING * 3 }),
        createPinFinaleStage({ THREE, palette, originX: STAGE_SPACING * 4 }),
      ];
      stages.forEach((stage) => {
        scene.add(stage.group);
        stage.group.traverse((object) => {
          const mesh = object as T.Mesh;
          if (!mesh.isMesh) return;
          const basic = mesh.material instanceof THREE.MeshBasicMaterial || (Array.isArray(mesh.material) && mesh.material.some((m) => m instanceof THREE.MeshBasicMaterial));
          mesh.castShadow = !basic;
          mesh.receiveShadow = true;
        });
      });

      const chapters = Array.from(document.querySelectorAll<HTMLElement>('[data-chapter]'))
        .sort((a, b) => Number(a.dataset.chapter) - Number(b.dataset.chapter))
        .map((el) => ({ el, beats: Array.from(el.querySelectorAll<HTMLElement>('[data-beat]')) }));

      const resize = () => {
        renderer.setSize(window.innerWidth, window.innerHeight);
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
      };
      resize();
      window.addEventListener('resize', resize);

      const pointer = { x: 0, y: 0 };
      const ndc = new THREE.Vector2(2, 2);
      const onMove = (event: PointerEvent) => {
        pointer.x = (event.clientX / window.innerWidth) * 2 - 1;
        pointer.y = (event.clientY / window.innerHeight) * 2 - 1;
        ndc.set(pointer.x, -pointer.y);
      };
      const onLeave = () => ndc.set(2, 2);
      let hitObject: T.Object3D | null = null;
      let activeStage = 0;
      const onClick = () => {
        if (hitObject) stages[activeStage].click(hitObject);
      };
      renderer.domElement.addEventListener('pointermove', onMove);
      renderer.domElement.addEventListener('pointerleave', onLeave);
      renderer.domElement.addEventListener('click', onClick);

      const raycaster = new THREE.Raycaster();
      const curPos = new THREE.Vector3();
      const curLook = new THREE.Vector3();
      let first = true;
      let bgMix = 0;
      let tipKey = '';
      let tipActive = false;
      const projected = new THREE.Vector3();
      const tmp = new THREE.Vector3();

      const clock = { last: performance.now() };
      let frame = 0;
      const loop = (now: number) => {
        frame = requestAnimationFrame(loop);
        if (document.hidden) {
          clock.last = now;
          return;
        }
        const dt = Math.min(0.05, (now - clock.last) / 1000);
        clock.last = now;
        shared.ctaHover = ctaHoverRef.current;

        const vh = window.innerHeight;
        let active = 0;
        const locals = chapters.map(({ el }, index) => {
          const rect = el.getBoundingClientRect();
          if (rect.top <= vh * 0.5) active = index;
          const runway = rect.height - vh;
          return runway > 0 ? clamp01(-rect.top / runway) : 0;
        });
        if (active !== activeStage) {
          stages[activeStage].hover(null);
          activeStage = active;
        }
        const local = locals[active] ?? 0;

        chapters.forEach(({ beats }, index) => {
          beats.forEach((beat) => {
            const from = Number(beat.dataset.in ?? 0);
            const to = Number(beat.dataset.out ?? 1);
            const fadeIn = from <= 0 ? 1 : smooth(range(locals[index], from, from + 0.08));
            const value = fadeIn * (1 - smooth(range(locals[index], to - 0.08, to)));
            beat.style.opacity = value.toFixed(3);
            beat.style.visibility = value < 0.02 ? 'hidden' : 'visible';
            beat.style.transform = `translateY(${((1 - value) * 18).toFixed(1)}px)`;
          });
        });

        stages.forEach((stage, index) => {
          stage.group.visible = Math.abs(index - active) <= 1;
        });
        const originX = active * STAGE_SPACING;
        sun.target.position.set(originX, 0, -2);
        sun.position.set(originX + 9, 20, 12);
        stages[active].update({ time: now, dt, local, pointer, reduced, shared });
        if (active > 0) stages[active - 1].update({ time: now, dt, local: 1, pointer, reduced, shared });

        const pose = stages[active].camera(local);
        if (first || reduced) {
          curPos.copy(pose.position);
          curLook.copy(pose.look);
          first = false;
        } else {
          curPos.x = damp(curPos.x, pose.position.x, 2.6, dt);
          curPos.y = damp(curPos.y, pose.position.y, 2.6, dt);
          curPos.z = damp(curPos.z, pose.position.z, 2.6, dt);
          curLook.x = damp(curLook.x, pose.look.x, 2.6, dt);
          curLook.y = damp(curLook.y, pose.look.y, 2.6, dt);
          curLook.z = damp(curLook.z, pose.look.z, 2.6, dt);
        }
        const boost = camera.aspect < 1 ? 1 + (1 / camera.aspect - 1) * 0.42 : 1;
        camera.position.copy(curLook).addScaledVector(tmp.copy(curPos).sub(curLook), boost);
        if (!reduced) {
          camera.position.x += pointer.x * 0.35;
          camera.position.y -= pointer.y * 0.2;
        }
        let lift = 0;
        if (active === chapters.length - 1) {
          const exit = Math.max(0, vh - chapters[active].el.getBoundingClientRect().bottom);
          const dist = curPos.distanceTo(curLook);
          lift = exit * ((2 * Math.tan((camera.fov * Math.PI) / 360) * dist) / vh);
        }
        camera.position.y -= lift;
        camera.lookAt(curLook.x, curLook.y - lift, curLook.z);

        bgMix = damp(bgMix, active === FINALE ? 1 : 0, 3, dt);
        currentBg.copy(bgColor).lerp(accentColor, bgMix);
        renderer.setClearColor(currentBg);
        (scene.fog as T.Fog).color.copy(currentBg);

        let info: HoverInfo | null = null;
        hitObject = null;
        if (ndc.x <= 1) {
          raycaster.setFromCamera(ndc, camera);
          const hits = raycaster.intersectObjects(stages[active].interactives, false);
          hitObject = hits.length ? hits[0].object : null;
        }
        info = stages[active].hover(hitObject) ?? stages[active].pinned();
        renderer.domElement.style.cursor = hitObject ? 'pointer' : 'default';

        const key = info ? `${info.title}|${info.lines.join('|')}` : '';
        if (key !== tipKey) {
          tipKey = key;
          setTip(info ? { title: info.title, lines: info.lines } : null);
        }
        tipActive = Boolean(info);
        const el = tipRef.current;
        if (el) {
          if (tipActive && info) {
            projected.copy(info.anchor).project(camera);
            const x = (projected.x * 0.5 + 0.5) * window.innerWidth;
            const y = (-projected.y * 0.5 + 0.5) * window.innerHeight;
            const half = el.offsetWidth / 2 + 12;
            const cx = Math.min(window.innerWidth - half, Math.max(half, x));
            const cy = Math.max(el.offsetHeight + 80, y);
            el.style.transform = `translate(${cx.toFixed(1)}px, ${cy.toFixed(1)}px) translate(-50%, -100%)`;
            el.style.opacity = projected.z < 1 ? '1' : '0';
          } else {
            el.style.opacity = '0';
          }
        }

        renderer.render(scene, camera);
      };
      frame = requestAnimationFrame(loop);

      cleanup = () => {
        cancelAnimationFrame(frame);
        window.removeEventListener('resize', resize);
        renderer.domElement.removeEventListener('pointermove', onMove);
        renderer.domElement.removeEventListener('pointerleave', onLeave);
        renderer.domElement.removeEventListener('click', onClick);
        scene.traverse((object) => {
          const mesh = object as T.Mesh;
          if (mesh.geometry) mesh.geometry.dispose();
          const material = mesh.material as T.Material | T.Material[] | undefined;
          if (material) (Array.isArray(material) ? material : [material]).forEach((m) => {
            (m as T.MeshStandardMaterial).map?.dispose();
            m.dispose();
          });
        });
        environment.dispose();
        pmrem.dispose();
        renderer.dispose();
        renderer.forceContextLoss();
        renderer.domElement.remove();
      };
    };

    start().catch(() => setSupported(false));
    return () => {
      disposed = true;
      cleanup?.();
    };
  }, [ctaHoverRef, onStatusChange]);

  if (!supported) return null;

  return (
    <>
      <div ref={hostRef} className="l3-canvas" />
      <div ref={tipRef} className="l3-tip" role="status" style={{ opacity: 0 }}>
        {tip && (
          <>
            <strong>{tip.title}</strong>
            {tip.lines.map((line) => (
              <span key={line}>{line}</span>
            ))}
          </>
        )}
      </div>
    </>
  );
};
