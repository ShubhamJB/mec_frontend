import type * as T from 'three';
import { hexPrism } from '../models';
import type { CameraPose, FrameState, HoverInfo, Stage, StageContext } from '../types';
import { damp, labelTexture, metal, range, smooth } from '../util';

const L1 = 27;
const TURN_R = 3;
const ARC = (Math.PI * TURN_R) / 2;
const L2 = 5;
const TOTAL = L1 + ARC + L2;
const WAIT_AT = L1 - 1.6;

function carAt(distance: number) {
  if (distance <= L1) return { x: -24 + distance, z: 2, heading: 0 };
  if (distance <= L1 + ARC) {
    const a = (distance - L1) / TURN_R;
    const phi = Math.PI / 2 - a;
    return { x: 3 + TURN_R * Math.cos(phi), z: -1 + TURN_R * Math.sin(phi), heading: a };
  }
  const e = distance - L1 - ARC;
  return { x: 6, z: -1 - e, heading: Math.PI / 2 };
}

export function createGarageStage(ctx: StageContext): Stage {
  const { THREE, palette, originX } = ctx;
  const group = new THREE.Group();
  group.position.x = originX;
  const interactives: T.Object3D[] = [];

  const groundColor = new THREE.Color(palette.surface).lerp(new THREE.Color(palette.ink), 0.07);
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(220, 90), metal(THREE, `#${groundColor.getHexString()}`, 0, 1));
  ground.rotation.x = -Math.PI / 2;
  ground.position.set(-20, -0.02, -8);
  group.add(ground);

  const asphalt = new THREE.Color(palette.ink).lerp(new THREE.Color(palette.surface), 0.62);
  const road = new THREE.Mesh(new THREE.PlaneGeometry(80, 6), new THREE.MeshStandardMaterial({ color: asphalt, roughness: 0.95 }));
  road.rotation.x = -Math.PI / 2;
  road.position.set(-30, 0, 2);
  group.add(road);
  const apron = new THREE.Mesh(new THREE.PlaneGeometry(6, 2.4), new THREE.MeshStandardMaterial({ color: asphalt, roughness: 0.95 }));
  apron.rotation.x = -Math.PI / 2;
  apron.position.set(6, 0.005, -1.6);
  group.add(apron);
  const dash = new THREE.MeshBasicMaterial({ color: new THREE.Color(palette.card) });
  for (let x = -66; x < 2; x += 3) {
    const mark = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.02, 0.14), dash);
    mark.position.set(x, 0.02, 2);
    group.add(mark);
  }

  const lampMaterial = metal(THREE, palette.ink, 0.6, 0.4);
  const lampLight = new THREE.MeshBasicMaterial({ color: new THREE.Color(palette.card) });
  for (let x = -50; x <= -16; x += 9) {
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.09, 3.4, 12), lampMaterial);
    pole.position.set(x, 1.7, -1.6);
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.24, 16, 16), lampLight);
    head.position.set(x, 3.5, -1.6);
    group.add(pole, head);
  }

  const wallColor = new THREE.Color(palette.card).lerp(new THREE.Color(palette.accent), 0.14);
  const wallMaterial = metal(THREE, `#${wallColor.getHexString()}`, 0.05, 0.9);
  const roofMaterial = metal(THREE, palette.ink, 0.3, 0.6);
  const darkMaterial = metal(THREE, palette.surface, 0, 1);
  const box = (w: number, h: number, d: number, x: number, y: number, z: number, material: T.Material) => {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material);
    mesh.position.set(x, y, z);
    group.add(mesh);
    return mesh;
  };
  const H = 5;
  box(3.5, H, 0.4, 1.75, H / 2, -2, wallMaterial);
  box(3.5, H, 0.4, 10.25, H / 2, -2, wallMaterial);
  box(5, 1.4, 0.4, 6, 3.6 + 0.7, -2, wallMaterial);
  box(0.4, H, 10, 0, H / 2, -7, wallMaterial);
  box(0.4, H, 10, 12, H / 2, -7, wallMaterial);
  box(12.4, H, 0.4, 6, H / 2, -12, wallMaterial);
  box(12.8, 0.35, 10.8, 6, H + 0.17, -7, roofMaterial);
  box(11.6, 0.05, 9.6, 6, 0.02, -7, darkMaterial);

  const doorMaterial = metal(THREE, palette.muted, 0.4, 0.5);
  const door = new THREE.Mesh(new THREE.BoxGeometry(5, 1, 0.14), doorMaterial);
  door.position.set(6, 1.8, -2);
  group.add(door);
  door.userData.kind = 'door';
  interactives.push(door);

  const logo = new THREE.Mesh(hexPrism(THREE, 0.55, 0.12, null, 0.02), metal(THREE, palette.accent, 0.5, 0.35));
  logo.position.set(2.0, 3.4, -1.72);
  group.add(logo);

  let closed = false;
  const signTexture = (isClosed: boolean) =>
    labelTexture(
      THREE,
      (c, width) => {
        const height = c.canvas.height;
        c.fillStyle = isClosed ? palette.muted : palette.accent;
        c.fillRect(0, 0, width, height);
        c.fillStyle = '#ffffff';
        c.font = `800 ${height * 0.58}px sans-serif`;
        c.textAlign = 'center';
        c.textBaseline = 'middle';
        c.fillText(isClosed ? 'CLOSED' : 'OPEN', width / 2, height / 2 + height * 0.04);
      },
      1024,
      272,
    );
  const signMaterial = new THREE.MeshBasicMaterial({ map: signTexture(false) });
  const sign = new THREE.Mesh(new THREE.BoxGeometry(3.4, 0.9, 0.15), [wallMaterial, wallMaterial, wallMaterial, wallMaterial, signMaterial, wallMaterial]);
  sign.position.set(6, 4.3, -1.72);
  sign.userData.kind = 'sign';
  group.add(sign);
  interactives.push(sign);

  const post = metal(THREE, palette.ink, 0.6, 0.4);
  box(0.3, 3.2, 0.5, 4.3, 1.6, -6, post);
  box(0.3, 3.2, 0.5, 7.7, 1.6, -6, post);
  const runnerLeft = box(0.5, 0.15, 3.8, 5.2, 0.1, -6, post);
  const runnerRight = box(0.5, 0.15, 3.8, 6.8, 0.1, -6, post);

  const car = new THREE.Group();
  const carBodyMaterial = new THREE.MeshStandardMaterial({ color: new THREE.Color(palette.accent), metalness: 0.65, roughness: 0.3, envMapIntensity: 1.1 });
  const glassMaterial = new THREE.MeshStandardMaterial({ color: new THREE.Color(palette.ink), metalness: 0.9, roughness: 0.15, envMapIntensity: 1.3 });
  const bodyShape = new THREE.Shape();
  bodyShape.moveTo(-2.1, 0.4);
  bodyShape.lineTo(-2.1, 0.98);
  bodyShape.lineTo(-1.55, 1.1);
  bodyShape.lineTo(-0.95, 1.62);
  bodyShape.lineTo(0.55, 1.62);
  bodyShape.lineTo(1.3, 1.1);
  bodyShape.lineTo(2.1, 0.92);
  bodyShape.lineTo(2.1, 0.4);
  bodyShape.closePath();
  const bodyGeometry = new THREE.ExtrudeGeometry(bodyShape, { depth: 1.7, bevelEnabled: true, bevelThickness: 0.08, bevelSize: 0.08, bevelSegments: 3 });
  bodyGeometry.translate(0, 0, -0.85);
  car.add(new THREE.Mesh(bodyGeometry, carBodyMaterial));
  const glassShape = new THREE.Shape();
  glassShape.moveTo(-0.85, 1.14);
  glassShape.lineTo(-0.58, 1.56);
  glassShape.lineTo(0.5, 1.56);
  glassShape.lineTo(1.02, 1.14);
  glassShape.closePath();
  const glassGeometry = new THREE.ExtrudeGeometry(glassShape, { depth: 1.74, bevelEnabled: false });
  glassGeometry.translate(0, 0, -0.87);
  car.add(new THREE.Mesh(glassGeometry, glassMaterial));

  const lightMaterial = new THREE.MeshBasicMaterial({ color: new THREE.Color('#fffbe6') });
  const tailMaterial = new THREE.MeshBasicMaterial({ color: new THREE.Color(palette.danger) });
  for (const z of [-0.55, 0.55]) {
    const head = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.2, 0.36), lightMaterial);
    head.position.set(2.18, 0.75, z);
    const tail = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.2, 0.36), tailMaterial);
    tail.position.set(-2.18, 0.8, z);
    car.add(head, tail);
  }

  const wheelTire = metal(THREE, '#111111', 0.1, 0.9);
  const wheelHub = metal(THREE, palette.card, 0.8, 0.3);
  const wheels: T.Group[] = [];
  for (const wx of [-1.3, 1.3]) {
    for (const wz of [-0.9, 0.9]) {
      const wheel = new THREE.Group();
      const tire = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.4, 0.3, 28), wheelTire);
      tire.rotation.x = Math.PI / 2;
      const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 0.34, 6), wheelHub);
      hub.rotation.x = Math.PI / 2;
      wheel.add(tire, hub);
      wheel.position.set(wx, 0.4, wz);
      car.add(wheel);
      wheels.push(wheel);
    }
  }
  const shadow = new THREE.Mesh(new THREE.CircleGeometry(1, 32), new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.22 }));
  shadow.rotation.x = -Math.PI / 2;
  shadow.scale.set(2.5, 1.2, 1);
  shadow.position.y = 0.03;
  group.add(shadow);
  group.add(car);

  const state = { distance: 0, door: 0, lift: 0, carX: -24, carZ: 2, heading: 0 };

  const setStatus = (value: boolean) => {
    closed = value;
    const old = signMaterial.map;
    signMaterial.map = signTexture(closed);
    signMaterial.needsUpdate = true;
    old?.dispose();
    ctx.onStatusChange?.(closed);
  };

  const update = (frame: FrameState) => {
    const wanted = TOTAL * smooth(range(frame.local, 0.05, 0.82));
    const limit = closed ? Math.min(wanted, WAIT_AT) : wanted;
    state.distance = damp(state.distance, limit, 5, frame.dt);
    const pose = carAt(state.distance);
    state.carX = pose.x;
    state.carZ = pose.z;
    state.heading = pose.heading;

    const nearDoor = state.distance > L1 - 9;
    state.door = damp(state.door, !closed && nearDoor ? 1 : 0, 3, frame.dt);
    door.scale.y = Math.max(0.04, 3.6 * (1 - state.door * 0.93));
    door.position.y = 3.6 - door.scale.y / 2;

    state.lift = damp(state.lift, smooth(range(state.distance, TOTAL - 1.2, TOTAL)) * smooth(range(frame.local, 0.78, 0.95)), 4, frame.dt);
    const rise = state.lift * 1.1;
    runnerLeft.position.y = 0.1 + rise;
    runnerRight.position.y = 0.1 + rise;

    car.position.set(pose.x, rise + 0.16, pose.z);
    car.rotation.y = pose.heading;
    shadow.position.set(pose.x, 0.03, pose.z);
    shadow.rotation.z = pose.heading;
    shadow.visible = rise < 0.2;
    wheels.forEach((wheel) => {
      wheel.rotation.z = -state.distance / 0.4;
    });
  };

  const camera = (): CameraPose => {
    const e = smooth(range(state.distance, L1 - 4, TOTAL));
    const driving = new THREE.Vector3(originX + Math.min(Math.max(state.carX - 12, -30), 1), 4, 17);
    const inside = new THREE.Vector3(originX + 1, 6.2, 17);
    const lookDriving = new THREE.Vector3(originX + state.carX - 5.5, 1.3, 1);
    const lookInside = new THREE.Vector3(originX - 0.6, 2.3, -5);
    return { position: driving.lerp(inside, e), look: lookDriving.lerp(lookInside, e) };
  };

  const doorInfo = (): HoverInfo => ({
    title: closed ? 'Closed for now' : 'Open now',
    lines: [closed ? 'The garage is temporarily unavailable. Customers see the message you set.' : 'Click to close the garage for now.', closed ? 'Click to reopen.' : 'Owners do this from their dashboard.'],
    anchor: group.localToWorld(new THREE.Vector3(6, 5.2, -1.7)),
  });

  return {
    group,
    interactives,
    update,
    camera,
    hover: (object) => (object ? doorInfo() : null),
    click: () => setStatus(!closed),
    pinned: () => null,
  };
}
