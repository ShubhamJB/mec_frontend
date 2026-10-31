import type * as T from 'three';
import { REVIEW_COUNTS } from '../content';
import { hexPrism, standingHex } from '../models';
import type { CameraPose, FrameState, HoverInfo, Stage, StageContext } from '../types';
import { createClipboard } from './clipboard';
import { damp, labelTexture, lerp, metal, range, smooth } from '../util';

export function createTrustStage(ctx: StageContext): Stage {
  const { THREE, palette, originX } = ctx;
  const group = new THREE.Group();
  group.position.x = originX;
  const interactives: T.Object3D[] = [];

  const base = new THREE.Mesh(hexPrism(THREE, 11, 0.6, null, 0.12), metal(THREE, palette.card, 0.05, 0.9));
  base.rotation.x = -Math.PI / 2;
  base.position.y = -0.3;
  group.add(base);

  const total = REVIEW_COUNTS.reduce((sum, n) => sum + n, 0);
  const bars = REVIEW_COUNTS.map((count, index) => {
    const rating = 5 - index;
    const height = Math.max(0.16, count * 0.4);
    const bar = new THREE.Mesh(standingHex(THREE, 0.66, height), new THREE.MeshStandardMaterial({ color: new THREE.Color(count > 0 ? palette.accent : palette.muted), metalness: 0.7, roughness: 0.3, envMapIntensity: 1.1 }));
    const holder = new THREE.Group();
    holder.position.set(-5.2 + index * 1.55, 0, 1);
    bar.userData.rating = rating;
    holder.add(bar);

    const countLabel = new THREE.Mesh(
      new THREE.PlaneGeometry(1, 1),
      new THREE.MeshBasicMaterial({
        map: labelTexture(THREE, (c, size) => {
          c.fillStyle = '#ffffff';
          c.font = `700 ${size * 0.5}px sans-serif`;
          c.textAlign = 'center';
          c.textBaseline = 'middle';
          c.fillText(String(count), size / 2, size / 2);
        }),
        transparent: true,
      }),
    );
    countLabel.rotation.x = -Math.PI / 2;
    countLabel.position.y = height + 0.16;
    holder.add(countLabel);

    const ratingLabel = new THREE.Mesh(
      new THREE.PlaneGeometry(0.9, 0.9),
      new THREE.MeshBasicMaterial({
        map: labelTexture(THREE, (c, size) => {
          c.fillStyle = palette.ink;
          c.font = `700 ${size * 0.55}px sans-serif`;
          c.textAlign = 'center';
          c.textBaseline = 'middle';
          c.fillText(String(rating), size / 2, size / 2);
        }),
        transparent: true,
      }),
    );
    ratingLabel.rotation.x = -Math.PI / 2;
    ratingLabel.position.set(0, 0.02, 1.4);
    holder.add(ratingLabel);

    group.add(holder);
    interactives.push(bar);
    return { holder, bar, count, rating, height, bump: 0 };
  });

  const cardTexture = (approved: boolean) =>
    labelTexture(
      THREE,
      (c, size) => {
        c.fillStyle = palette.card;
        c.fillRect(0, 0, size, size);
        c.fillStyle = palette.ink;
        c.font = `700 ${size * 0.075}px sans-serif`;
        c.textAlign = 'left';
        c.fillText('Boudha Car Care', size * 0.08, size * 0.2);
        c.fillStyle = palette.muted;
        c.font = `500 ${size * 0.05}px sans-serif`;
        c.fillText('Registration v1 · 6 services · 7-day schedule', size * 0.08, size * 0.3);
        c.fillStyle = approved ? palette.open : palette.paused;
        c.font = `800 ${size * 0.11}px sans-serif`;
        c.fillText(approved ? 'APPROVED' : 'PENDING REVIEW', size * 0.08, size * 0.62);
        c.fillStyle = palette.muted;
        c.font = `500 ${size * 0.05}px sans-serif`;
        c.fillText(approved ? 'Public now. Logged in the audit trail.' : 'Waiting for an administrator.', size * 0.08, size * 0.74);
      },
      1024,
    );
  const cardMaterial = new THREE.MeshBasicMaterial({ map: cardTexture(false) });
  const card = new THREE.Mesh(new THREE.BoxGeometry(3.9, 0.16, 3.9), [metal(THREE, palette.surface), metal(THREE, palette.surface), cardMaterial, metal(THREE, palette.surface), metal(THREE, palette.surface), metal(THREE, palette.surface)]);
  card.position.set(6.6, 0.08, -0.3);
  group.add(card);

  const seal = new THREE.Group();
  const sealBody = new THREE.Mesh(standingHex(THREE, 1, 0.4), metal(THREE, palette.accent, 0.8, 0.3));
  const sealRing = new THREE.Mesh(standingHex(THREE, 0.7, 0.45, 0.03), metal(THREE, palette.card, 0.6, 0.35));
  sealRing.position.y = 0.04;
  const sealHandle = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.36, 0.9, 24), metal(THREE, palette.ink, 0.7, 0.35));
  sealHandle.position.y = 0.85;
  seal.add(sealBody, sealRing, sealHandle);
  seal.position.set(6.6, 4.4, -0.3);
  group.add(seal);

  const clipboard = createClipboard(THREE, palette);
  clipboard.group.position.set(1.9, 2.4, 3);
  clipboard.group.scale.setScalar(1.02);
  group.add(clipboard.group);

  let approved = false;
  let hoveredRating: number | null = null;

  const update = (frame: FrameState) => {
    bars.forEach((bar, index) => {
      const rise = smooth(range(frame.local, 0.04 + index * 0.06, 0.3 + index * 0.06));
      bar.bump = damp(bar.bump, bar.rating === hoveredRating ? 1 : 0, 10, frame.dt);
      bar.holder.scale.y = Math.max(0.001, rise);
      bar.bar.scale.set(1 + bar.bump * 0.08, 1, 1 + bar.bump * 0.08);
    });

    const checking = range(frame.local, 0.24, 0.6);
    clipboard.update(checking * 4, frame.time, frame.reduced ? 0 : frame.pointer.x, frame.reduced ? 0 : frame.pointer.y, frame.dt);

    const s = range(frame.local, 0.64, 0.86);
    const tri = 1 - Math.abs(2 * s - 1);
    seal.position.y = lerp(4.4, 0.32, smooth(tri));
    seal.rotation.y = frame.reduced ? 0 : frame.time * 0.0004;
    const shouldApprove = s > 0.5;
    if (shouldApprove !== approved) {
      approved = shouldApprove;
      const old = cardMaterial.map;
      cardMaterial.map = cardTexture(approved);
      cardMaterial.needsUpdate = true;
      old?.dispose();
    }
  };

  const camera = (): CameraPose => ({
    position: new THREE.Vector3(originX - 5.4, 12, 30),
    look: new THREE.Vector3(originX - 6.4, 1.1, 0),
  });

  const infoFor = (rating: number): HoverInfo => {
    const bar = bars.find((b) => b.rating === rating);
    const count = bar?.count ?? 0;
    return {
      title: `${rating} out of 5`,
      lines: [`${count} of ${total} sample reviews`, 'Sample data'],
      anchor: group.localToWorld(new THREE.Vector3(-5.2 + (5 - rating) * 1.55, (bar?.height ?? 0.2) + 0.9, 1)),
    };
  };

  return {
    group,
    interactives,
    update,
    camera,
    hover: (object) => {
      hoveredRating = (object?.userData.rating as number | undefined) ?? null;
      return hoveredRating ? infoFor(hoveredRating) : null;
    },
    click: (object) => {
      const bar = bars.find((b) => b.rating === object.userData.rating);
      if (bar) bar.bump = 2;
    },
    pinned: () => null,
  };
}
