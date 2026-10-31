import type * as T from 'three';
import type { ThreeLib } from './types';

export function hexShape(THREE: ThreeLib, radius: number, holeRadius: number | null) {
  const shape = new THREE.Shape();
  for (let i = 0; i < 6; i += 1) {
    const angle = (Math.PI / 3) * i;
    const x = Math.cos(angle) * radius;
    const y = Math.sin(angle) * radius;
    if (i === 0) shape.moveTo(x, y);
    else shape.lineTo(x, y);
  }
  shape.closePath();
  if (holeRadius !== null) {
    const hole = new THREE.Path();
    hole.absarc(0, 0, holeRadius, 0, Math.PI * 2, true);
    shape.holes.push(hole);
  }
  return shape;
}

export function hexPrism(THREE: ThreeLib, radius: number, depth: number, holeRadius: number | null = null, bevel = 0.08) {
  const geometry = new THREE.ExtrudeGeometry(hexShape(THREE, radius, holeRadius), {
    depth,
    bevelEnabled: bevel > 0,
    bevelThickness: bevel,
    bevelSize: bevel,
    bevelSegments: 4,
    curveSegments: 48,
  });
  geometry.center();
  return geometry;
}

export function standingHex(THREE: ThreeLib, radius: number, height: number, bevel = 0.06) {
  const geometry = hexPrism(THREE, radius, height, null, bevel);
  geometry.rotateX(-Math.PI / 2);
  geometry.translate(0, height / 2 + bevel, 0);
  return geometry;
}

export function buildNut(THREE: ThreeLib, material: T.Material) {
  const group = new THREE.Group();
  group.add(new THREE.Mesh(hexPrism(THREE, 1, 0.85, 0.52, 0.08), material));
  const ring = new THREE.TorusGeometry(0.5, 0.034, 10, 56);
  for (let i = 0; i < 6; i += 1) {
    const thread = new THREE.Mesh(ring, material);
    thread.position.z = -0.37 + i * 0.148;
    group.add(thread);
  }
  return group;
}

export function buildBolt(THREE: ThreeLib, material: T.Material) {
  const group = new THREE.Group();
  const head = new THREE.Mesh(hexPrism(THREE, 1, 0.6, null, 0.08), material);
  head.position.z = 0.9;
  group.add(head);

  const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, 2.6, 56), material);
  shaft.rotation.x = Math.PI / 2;
  shaft.position.z = -0.4;
  group.add(shaft);

  const ring = new THREE.TorusGeometry(0.5, 0.05, 10, 56);
  for (let i = 0; i < 14; i += 1) {
    const thread = new THREE.Mesh(ring, material);
    thread.position.z = -1.55 + i * 0.16;
    group.add(thread);
  }

  const tip = new THREE.Mesh(new THREE.ConeGeometry(0.5, 0.28, 56), material);
  tip.rotation.x = -Math.PI / 2;
  tip.position.z = -1.82;
  group.add(tip);
  return group;
}
