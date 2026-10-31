import type * as T from 'three';
import { readToken } from '../../components/map/mapConfig';
import type { Palette, ThreeLib } from './types';

export const clamp01 = (value: number) => Math.min(1, Math.max(0, value));
export const smooth = (value: number) => {
  const x = clamp01(value);
  return x * x * (3 - 2 * x);
};
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
export const range = (value: number, from: number, to: number) => clamp01((value - from) / (to - from));
export const damp = (current: number, target: number, rate: number, dt: number) => current + (target - current) * (1 - Math.exp(-rate * dt));

export function readPalette(): Palette {
  return {
    bg: readToken('--bg', '#f5f5f7'),
    surface: readToken('--surface', '#ececee'),
    card: readToken('--card', '#ffffff'),
    ink: readToken('--ink', '#1d1d1f'),
    muted: readToken('--muted', '#67676c'),
    accent: readToken('--accent', '#0066cc'),
    accentInk: readToken('--accent-ink', '#ffffff'),
    field: readToken('--field', '#0066cc'),
    fieldInk: readToken('--field-ink', '#ffffff'),
    open: readToken('--status-open-ink', '#0f5130'),
    paused: readToken('--status-unavail-ink', '#7a4300'),
    danger: readToken('--status-danger-ink', '#9a1c28'),
  };
}

export function seeded(seed: number) {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function disposeTree(root: T.Object3D) {
  root.traverse((object) => {
    const mesh = object as T.Mesh;
    if (mesh.geometry) mesh.geometry.dispose();
    const material = mesh.material as T.Material | T.Material[] | undefined;
    if (!material) return;
    (Array.isArray(material) ? material : [material]).forEach((m) => {
      (m as T.MeshStandardMaterial).map?.dispose();
      m.dispose();
    });
  });
}

export function labelTexture(THREE: ThreeLib, draw: (ctx: CanvasRenderingContext2D, size: number) => void, size = 256, height = size) {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = height;
  const context = canvas.getContext('2d');
  if (context) draw(context, size);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  return texture;
}

export function metal(THREE: ThreeLib, color: string, metalness = 0.15, roughness = 0.75) {
  return new THREE.MeshStandardMaterial({ color: new THREE.Color(color), metalness, roughness });
}
