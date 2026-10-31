import type * as T from 'three';
import { buildBolt, buildNut } from '../models';
import type { CameraPose, FrameState, Stage, StageContext } from '../types';
import { BOLT_STEEL, NUT_BLACK_OXIDE } from '../fixedColors';
import { damp, range, smooth } from '../util';

const NUT_START_Z = -0.95;
const NUT_TRAVEL = 3.6;
const BOLT_LIFT = 1.1;
const TURNS = 4;

export function createNutBoltStage(ctx: StageContext): Stage {
  const { THREE, originX } = ctx;
  const group = new THREE.Group();
  group.position.x = originX;

  const boltMaterial = new THREE.MeshStandardMaterial({
    color: new THREE.Color(BOLT_STEEL),
    metalness: 0.85,
    roughness: 0.28,
    envMapIntensity: 1.2,
  });
  const nutMaterial = new THREE.MeshStandardMaterial({
    color: new THREE.Color(NUT_BLACK_OXIDE),
    metalness: 0.85,
    roughness: 0.28,
    envMapIntensity: 1.2,
  });
  const bolt = buildBolt(THREE, boltMaterial);
  const nut = buildNut(THREE, nutMaterial);
  const assembly = new THREE.Group();
  assembly.add(bolt, nut);
  const pivot = new THREE.Group();
  pivot.add(assembly);
  group.add(pivot);

  const pose = (apart: number) => {
    const nutZ = NUT_START_Z - NUT_TRAVEL * apart;
    const boltZ = BOLT_LIFT * apart;
    nut.position.z = nutZ;
    nut.rotation.z = -TURNS * Math.PI * 2 * apart;
    bolt.position.z = boltZ;
    bolt.rotation.z = TURNS * Math.PI * 0.5 * apart;
    assembly.position.z = -(nutZ + boltZ - 0.4) / 2;
  };

  const heroApart = (local: number) => smooth(range(local, 0.1, 0.82));

  const update = (frame: FrameState) => {
    const apart = heroApart(frame.local);
    pose(apart);

    const idle = frame.reduced ? 0 : Math.sin(frame.time * 0.0006) * 0.12;
    const look = frame.reduced ? 0 : frame.pointer.x * 0.45;
    const lean = frame.reduced ? 0 : frame.pointer.y * 0.3;
    const yaw = -Math.PI / 2 + 0.38 + apart * 0.5 + idle + look;
    const pitch = 0.3 + lean + apart * 0.1;
    pivot.rotation.y = damp(pivot.rotation.y, yaw, 6, frame.dt);
    pivot.rotation.x = damp(pivot.rotation.x, pitch, 6, frame.dt);
    pivot.rotation.z = damp(pivot.rotation.z, -0.2, 6, frame.dt);
  };

  const camera = (local: number): CameraPose => {
    const apart = heroApart(local);
    return {
      position: new THREE.Vector3(originX, 0.5, 10 + 3.6 * apart),
      look: new THREE.Vector3(originX - 2.4, -0.1, 0),
    };
  };

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
