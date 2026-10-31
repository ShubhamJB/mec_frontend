import type * as T from 'three';
import { buildNut, hexPrism } from '../models';
import type { CameraPose, FrameState, Stage, StageContext } from '../types';
import { BOLT_STEEL } from '../fixedColors';
import { damp, metal } from '../util';

const FLOAT_Y = 2.2;
const LAND_Y = 0.15;
const SATELLITES = 3;

export function createPinFinaleStage(ctx: StageContext): Stage {
  const { THREE, palette, originX } = ctx;
  const group = new THREE.Group();
  group.position.x = originX;

  const plate = new THREE.Mesh(hexPrism(THREE, 4.4, 0.5, null, 0.1), metal(THREE, palette.ink, 0.4, 0.45));
  plate.rotation.x = -Math.PI / 2;
  plate.position.y = -0.25;
  group.add(plate);

  const pinMaterial = new THREE.MeshStandardMaterial({ color: new THREE.Color(palette.card), metalness: 0.35, roughness: 0.22, envMapIntensity: 1.2 });
  const pin = new THREE.Group();
  const head = new THREE.Mesh(new THREE.SphereGeometry(1.15, 48, 40), pinMaterial);
  head.position.y = 2.15;
  const tip = new THREE.Mesh(new THREE.ConeGeometry(0.98, 2.3, 48), pinMaterial);
  tip.rotation.x = Math.PI;
  tip.position.y = 0.88;
  const mark = new THREE.Mesh(hexPrism(THREE, 0.52, 0.14, 0.2, 0.02), metal(THREE, palette.ink, 0.5, 0.35));
  mark.position.set(0, 2.2, 1.08);
  pin.add(head, tip, mark);
  pin.position.y = FLOAT_Y;
  group.add(pin);

  const nutMaterial = new THREE.MeshStandardMaterial({ color: new THREE.Color(BOLT_STEEL), metalness: 0.9, roughness: 0.28, envMapIntensity: 1.2 });
  const satellites = Array.from({ length: SATELLITES }, (_, index) => {
    const nut = buildNut(THREE, nutMaterial);
    nut.scale.setScalar(0.3);
    group.add(nut);
    return { nut, phase: (index / SATELLITES) * Math.PI * 2 };
  });

  const rippleMaterial = new THREE.MeshBasicMaterial({ color: new THREE.Color(palette.card), transparent: true, opacity: 0.5, side: THREE.DoubleSide, depthWrite: false });
  const ripples = Array.from({ length: 3 }, () => {
    const ring = new THREE.Mesh(new THREE.RingGeometry(0.92, 1, 72), rippleMaterial.clone());
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = 0.04;
    group.add(ring);
    return ring;
  });

  let y = FLOAT_Y;
  let velocity = 0;
  let orbit = 0;
  let drop = 0;

  const update = (frame: FrameState) => {
    const hovering = frame.shared.ctaHover;
    drop = damp(drop, hovering ? 1 : 0, 5, frame.dt);

    const target = hovering ? LAND_Y : FLOAT_Y + (frame.reduced ? 0 : Math.sin(frame.time * 0.0018) * 0.14);
    const stiffness = hovering ? 90 : 16;
    const damping = hovering ? 6.5 : 7;
    velocity += (target - y) * stiffness * frame.dt;
    velocity *= Math.exp(-damping * frame.dt);
    y = Math.max(LAND_Y, y + velocity * frame.dt);
    if (y === LAND_Y && velocity < 0) velocity = -velocity * 0.45;
    pin.position.y = y;

    pin.rotation.y += frame.dt * (frame.reduced ? 0 : 0.5 + (1 - drop) * 0.4);
    pin.rotation.z = frame.reduced ? 0 : Math.sin(frame.time * 0.0012) * 0.04 * (1 - drop);

    orbit += frame.dt * (0.5 + drop * 2.4);
    satellites.forEach((s, index) => {
      const angle = orbit + s.phase;
      const radius = 3.3 + Math.sin(frame.time * 0.0007 + index) * 0.2;
      s.nut.position.set(Math.cos(angle) * radius, 2.3 + Math.sin(angle * 1.6 + index) * 0.7, Math.sin(angle) * radius);
      s.nut.rotation.set(angle * 1.3, angle, angle * 0.7);
    });

    ripples.forEach((ring, index) => {
      const phase = (frame.time * 0.0006 * (0.5 + drop * 1.6) + index / ripples.length) % 1;
      ring.scale.setScalar(1 + phase * 5.2);
      (ring.material as T.MeshBasicMaterial).opacity = (1 - phase) * (0.12 + drop * 0.7);
    });
  };

  const camera = (): CameraPose => ({
    position: new THREE.Vector3(originX, 5.5, 25.5),
    look: new THREE.Vector3(originX + 5.6, -0.9, 0),
  });

  return {
    group,
    interactives: [] as T.Object3D[],
    update,
    camera,
    hover: () => null,
    click: () => undefined,
    pinned: () => null,
  };
}
