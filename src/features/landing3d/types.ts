import type * as T from 'three';

export type ThreeLib = typeof T;

export interface Palette {
  bg: string;
  surface: string;
  card: string;
  ink: string;
  muted: string;
  accent: string;
  accentInk: string;
  field: string;
  fieldInk: string;
  open: string;
  paused: string;
  danger: string;
}

export interface CameraPose {
  position: T.Vector3;
  look: T.Vector3;
}

export interface HoverInfo {
  title: string;
  lines: string[];
  anchor: T.Vector3;
}

export interface SharedState {
  ctaHover: boolean;
}

export interface FrameState {
  time: number;
  dt: number;
  local: number;
  pointer: { x: number; y: number };
  reduced: boolean;
  shared: SharedState;
}

export interface StageContext {
  THREE: ThreeLib;
  palette: Palette;
  originX: number;
  onStatusChange?: (closed: boolean) => void;
}

export interface Stage {
  group: T.Group;
  interactives: T.Object3D[];
  update(frame: FrameState): void;
  camera(local: number): CameraPose;
  hover(object: T.Object3D | null): HoverInfo | null;
  click(object: T.Object3D): void;
  pinned(): HoverInfo | null;
}
