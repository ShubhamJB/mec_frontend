import type * as T from 'three';
import { hexPrism } from '../models';
import type { Palette, ThreeLib } from '../types';
import { damp, labelTexture, lerp, metal, range, smooth } from '../util';

const ROWS = ['Phone number works', 'Address is on the map', 'Services are listed', 'Weekly schedule is set'];
const PAPER_W = 2.8;
const PAPER_H = 3.5;
const rowY = (index: number) => 0.8 - index * 0.74;

export interface Clipboard {
  group: T.Group;
  update(checks: number, time: number, pointerX: number, pointerY: number, dt: number): void;
}

export function createClipboard(THREE: ThreeLib, palette: Palette): Clipboard {
  const group = new THREE.Group();
  const board = new THREE.Group();
  group.add(board);

  const backing = new THREE.Mesh(new THREE.BoxGeometry(3.3, 4.2, 0.18), metal(THREE, palette.ink, 0.45, 0.4));
  board.add(backing);

  const paperTexture = labelTexture(
    THREE,
    (c, width) => {
      const height = c.canvas.height;
      c.fillStyle = '#ffffff';
      c.fillRect(0, 0, width, height);
      c.fillStyle = '#111111';
      c.font = `700 ${height * 0.058}px sans-serif`;
      c.textAlign = 'left';
      c.fillText('Listing check', width * 0.08, height * 0.1);
      c.fillStyle = '#666666';
      c.font = `500 ${height * 0.034}px sans-serif`;
      c.fillText('Boudha Car Care', width * 0.08, height * 0.145);
      ROWS.forEach((label, index) => {
        const y = (0.5 - rowY(index) / PAPER_H) * height;
        c.fillStyle = '#222222';
        c.font = `500 ${height * 0.042}px sans-serif`;
        c.textAlign = 'left';
        c.fillText(label, width * 0.3, y + height * 0.012);
        c.strokeStyle = '#dddddd';
        c.lineWidth = 3;
        c.beginPath();
        c.moveTo(width * 0.08, y + height * 0.07);
        c.lineTo(width * 0.92, y + height * 0.07);
        c.stroke();
      });
    },
    512,
    640,
  );
  const paper = new THREE.Mesh(new THREE.PlaneGeometry(PAPER_W, PAPER_H), new THREE.MeshBasicMaterial({ map: paperTexture }));
  paper.position.z = 0.1;
  board.add(paper);

  const clip = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.34, 0.16), metal(THREE, palette.muted, 0.8, 0.3));
  clip.position.set(0, 2.05, 0.12);
  board.add(clip);
  const clipHex = new THREE.Mesh(hexPrism(THREE, 0.13, 0.06, null, 0.01), metal(THREE, palette.accent, 0.7, 0.3));
  clipHex.position.set(0, 2.05, 0.23);
  board.add(clipHex);

  const ringMaterial = metal(THREE, palette.ink, 0.5, 0.4);
  const tickMaterial = new THREE.MeshStandardMaterial({ color: new THREE.Color(palette.open), metalness: 0.2, roughness: 0.4, emissive: new THREE.Color(palette.open), emissiveIntensity: 0.25 });
  const ticks = ROWS.map((_, index) => {
    const ring = new THREE.Mesh(hexPrism(THREE, 0.24, 0.05, 0.17, 0.01), ringMaterial);
    ring.position.set(-0.98, rowY(index), 0.14);
    board.add(ring);

    const tick = new THREE.Group();
    const short = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.26, 0.08), tickMaterial);
    short.position.set(-0.07, -0.05, 0);
    short.rotation.z = 0.78;
    const long = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.5, 0.08), tickMaterial);
    long.position.set(0.1, 0.03, 0);
    long.rotation.z = -0.72;
    tick.add(short, long);
    tick.position.set(-0.98, rowY(index), 0.2);
    tick.scale.setScalar(0.001);
    board.add(tick);
    return tick;
  });

  const pen = new THREE.Group();
  const penBody = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.9, 12), new THREE.MeshStandardMaterial({ color: new THREE.Color(palette.danger), roughness: 0.4 }));
  const penTip = new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.14, 12), metal(THREE, palette.ink, 0.5, 0.4));
  penTip.position.y = -0.52;
  penTip.rotation.x = Math.PI;
  pen.add(penBody, penTip);
  pen.rotation.z = 0.7;
  pen.position.z = 0.4;
  board.add(pen);

  let penY = rowY(0);
  let penX = -0.6;

  const update = (checks: number, time: number, pointerX: number, pointerY: number, dt: number) => {
    ticks.forEach((tick, index) => {
      const pop = smooth(range(checks, index + 0.2, index + 0.85));
      tick.scale.setScalar(Math.max(0.001, pop * 1.35));
    });
    const current = Math.min(ROWS.length - 1, Math.floor(checks));
    const done = checks >= ROWS.length;
    penY = damp(penY, done ? 2.7 : rowY(current) - 0.05, 9, dt);
    penX = damp(penX, done ? 1.8 : -0.62 + Math.sin(time * 0.014) * 0.07, 9, dt);
    pen.position.set(penX + 0.35, penY + 0.3, 0.45);

    group.rotation.y = -0.32 + pointerX * 0.25;
    group.rotation.x = -0.06 + pointerY * 0.12;
    board.position.y = lerp(0, 0.14, 0.5 + 0.5 * Math.sin(time * 0.0015));
  };

  return { group, update };
}
