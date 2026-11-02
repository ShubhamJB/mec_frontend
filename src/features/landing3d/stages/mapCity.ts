import type * as T from 'three';
import { ORIGIN, SAMPLE_GARAGES, STATUS_LABEL, haversineKm } from '../content';
import type { SampleGarage } from '../content';
import { hexPrism, standingHex } from '../models';
import type { CameraPose, FrameState, HoverInfo, Stage, StageContext } from '../types';
import { damp, labelTexture, lerp, metal, range, seeded, smooth } from '../util';

const SCALE_M = 400;
const RADIUS = 16;
const HALF_H = (RADIUS * Math.sqrt(3)) / 2;
const starsFor = (rating: number) => '★'.repeat(Math.max(1, Math.min(5, Math.round(rating))));

const toLocal = (lat: number, lng: number) => ({
  x: ((lng - ORIGIN.lng) * 111320 * Math.cos((ORIGIN.lat * Math.PI) / 180)) / SCALE_M,
  z: (-(lat - ORIGIN.lat) * 110574) / SCALE_M,
});

const insideHex = (x: number, z: number, margin: number) =>
  Math.abs(z) <= HALF_H - margin && Math.abs(x) <= RADIUS - Math.abs(z) / Math.sqrt(3) - margin;

const riverZ = (x: number) => 3 * Math.sin(x * 0.25) + 9;

interface PinState {
  garage: SampleGarage;
  group: T.Group;
  body: T.Mesh;
  height: number;
  lift: number;
  x: number;
  z: number;
}

export function createMapStage(ctx: StageContext): Stage {
  const { THREE, palette, originX } = ctx;
  const group = new THREE.Group();
  group.position.x = originX;

  const asphalt = new THREE.Color(palette.ink).lerp(new THREE.Color(palette.surface), 0.62);
  const plateColor = new THREE.Color(palette.surface).lerp(new THREE.Color(palette.ink), 0.2);
  const waterColor = new THREE.Color(palette.accent).lerp(new THREE.Color(palette.card), 0.6);

  const plate = new THREE.Mesh(hexPrism(THREE, RADIUS, 0.7, null, 0.12), metal(THREE, `#${plateColor.getHexString()}`, 0.05, 0.9));
  plate.rotation.x = -Math.PI / 2;
  plate.position.y = -0.35;
  group.add(plate);

  const roadMaterial = new THREE.MeshStandardMaterial({ color: asphalt, roughness: 0.95, metalness: 0 });
  for (let k = -12; k <= 12; k += 4) {
    const half = RADIUS - Math.abs(k) / Math.sqrt(3) - 0.4;
    const road = new THREE.Mesh(new THREE.BoxGeometry(half * 2, 0.05, 0.55), roadMaterial);
    road.position.set(0, 0.03, k);
    group.add(road);
  }
  for (let k = -16; k <= 16; k += 4) {
    const half = Math.min(HALF_H, (RADIUS - Math.abs(k)) * Math.sqrt(3)) - 0.4;
    if (half <= 1) continue;
    const road = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.05, half * 2), roadMaterial);
    road.position.set(k, 0.03, 0);
    group.add(road);
  }

  const waterMaterial = new THREE.MeshStandardMaterial({ color: waterColor, roughness: 0.4, metalness: 0.1 });
  for (let x = -14; x < 14; x += 1) {
    const z0 = riverZ(x);
    const z1 = riverZ(x + 1);
    if (!insideHex(x + 0.5, (z0 + z1) / 2, 0.6)) continue;
    const length = Math.hypot(1, z1 - z0) + 0.05;
    const segment = new THREE.Mesh(new THREE.BoxGeometry(length, 0.04, 1.5), waterMaterial);
    segment.position.set(x + 0.5, 0.045, (z0 + z1) / 2);
    segment.rotation.y = -Math.atan2(z1 - z0, 1);
    group.add(segment);
  }

  const pinsLocal = SAMPLE_GARAGES.map((garage) => ({ garage, ...toLocal(garage.latitude, garage.longitude) }));

  const random = seeded(7);
  const cells: Array<{ x: number; z: number; w: number; d: number; h: number }> = [];
  for (let cx = -14; cx <= 14; cx += 4) {
    for (let cz = -14; cz <= 14; cz += 4) {
      for (const ox of [-1, 1]) {
        for (const oz of [-1, 1]) {
          const x = cx + ox;
          const z = cz + oz;
          if (!insideHex(x, z, 1.4)) continue;
          if (Math.abs(z - riverZ(x)) < 2.3) continue;
          if (pinsLocal.some((p) => Math.hypot(p.x - x, p.z - z) < 1.9)) continue;
          if (random() < 0.12) continue;
          const centrality = 1 - Math.min(1, Math.hypot(x, z) / 17);
          cells.push({ x, z, w: 1.3 + random() * 0.4, d: 1.3 + random() * 0.4, h: 0.5 + random() * 1.6 + centrality * random() * 2.6 });
        }
      }
    }
  }
  const buildings = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshStandardMaterial({ roughness: 0.85, metalness: 0 }), cells.length);
  const matrix = new THREE.Matrix4();
  const tint = new THREE.Color();
  const low = new THREE.Color(palette.card);
  const high = new THREE.Color(palette.bg);
  cells.forEach((cell, index) => {
    matrix.compose(new THREE.Vector3(cell.x, cell.h / 2, cell.z), new THREE.Quaternion(), new THREE.Vector3(cell.w, cell.h, cell.d));
    buildings.setMatrixAt(index, matrix);
    tint.copy(low).lerp(high, random() * 0.8);
    buildings.setColorAt(index, tint);
  });
  group.add(buildings);

  const statusColor = (garage: SampleGarage) =>
    garage.status === 'OPEN' ? palette.accent : garage.status === 'PAUSED' ? palette.paused : palette.muted;

  const pins: PinState[] = pinsLocal.map(({ garage, x, z }) => {
    const pinGroup = new THREE.Group();
    pinGroup.position.set(x, 0, z);
    const height = 1.1 + (garage.rating - 3.8) * 1.6;
    const body = new THREE.Mesh(standingHex(THREE, 0.62, height), new THREE.MeshStandardMaterial({ color: new THREE.Color(statusColor(garage)), metalness: 0.7, roughness: 0.3, envMapIntensity: 1.1 }));
    body.userData.garageId = garage.id;
    pinGroup.add(body);
    const topTexture = labelTexture(THREE, (c, size) => {
      c.clearRect(0, 0, size, size);
      c.fillStyle = '#ffffff';
      c.font = `700 ${size * 0.22}px sans-serif`;
      c.textAlign = 'center';
      c.textBaseline = 'middle';
      c.fillText(starsFor(garage.rating), size / 2, size / 2);
    });
    const label = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ map: topTexture, transparent: true }));
    label.rotation.x = -Math.PI / 2;
    label.position.y = height + 0.16;
    pinGroup.add(label);
    pinGroup.scale.y = 0.001;
    group.add(pinGroup);
    return { garage, group: pinGroup, body, height, lift: 0, x, z };
  });

  const youGroup = new THREE.Group();
  const youCore = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.34, 0.5, 32), metal(THREE, palette.ink, 0.5, 0.4));
  youCore.position.y = 0.25;
  const youPulse = new THREE.Mesh(new THREE.RingGeometry(0.5, 0.7, 40), new THREE.MeshBasicMaterial({ color: new THREE.Color(palette.ink), transparent: true, opacity: 0.4, side: THREE.DoubleSide }));
  youPulse.rotation.x = -Math.PI / 2;
  youPulse.position.y = 0.08;
  youGroup.add(youCore, youPulse);
  group.add(youGroup);

  const routeMaterial = new THREE.MeshStandardMaterial({ color: new THREE.Color(palette.accent), emissive: new THREE.Color(palette.accent), emissiveIntensity: 0.55, roughness: 0.4 });
  let routeMesh: T.Mesh | null = null;
  let routeCurve: T.CatmullRomCurve3 | null = null;
  let routeTotal = 0;
  let routeGrow = 0;
  let selectedId: string | null = null;
  let autoPicked = false;
  const traveler = new THREE.Mesh(standingHex(THREE, 0.28, 0.18, 0.03), metal(THREE, palette.card, 0.2, 0.4));
  traveler.visible = false;
  group.add(traveler);

  const infoFor = (pin: PinState): HoverInfo => {
    const g = pin.garage;
    const km = haversineKm(ORIGIN.lat, ORIGIN.lng, g.latitude, g.longitude);
    return {
      title: g.name,
      lines: [g.area, `${starsFor(g.rating)} · ${g.reviews} reviews`, `${STATUS_LABEL[g.status]} · ${g.note}`, `${km.toFixed(1)} km from you, in a straight line`],
      anchor: pin.group.localToWorld(new THREE.Vector3(0, pin.height + 0.9, 0)),
    };
  };

  const select = (pin: PinState) => {
    selectedId = pin.garage.id;
    const gx = Math.round(pin.x / 4) * 4;
    const gz = Math.round(pin.z / 4) * 4;
    const raw = [
      { x: 0, z: 0 },
      { x: gx, z: 0 },
      { x: gx, z: gz },
      { x: pin.x, z: pin.z },
    ];
    const points = raw.filter((p, i) => i === 0 || Math.hypot(p.x - raw[i - 1].x, p.z - raw[i - 1].z) > 0.01).map((p) => new THREE.Vector3(p.x, 0.3, p.z));
    if (points.length < 2) return;
    routeCurve = new THREE.CatmullRomCurve3(points, false, 'centripetal');
    if (routeMesh) {
      group.remove(routeMesh);
      routeMesh.geometry.dispose();
    }
    const geometry = new THREE.TubeGeometry(routeCurve, 120, 0.15, 8, false);
    routeTotal = geometry.index ? geometry.index.count : 0;
    routeMesh = new THREE.Mesh(geometry, routeMaterial);
    group.add(routeMesh);
    routeGrow = 0;
  };

  const interactives = pins.map((p) => p.body);
  let hoveredId: string | null = null;

  const update = (frame: FrameState) => {
    pins.forEach((pin, index) => {
      const rise = smooth(range(frame.local, 0.04 + index * 0.045, 0.26 + index * 0.045));
      pin.group.scale.y = Math.max(0.001, rise);
      const wanted = pin.garage.id === hoveredId ? 0.5 : pin.garage.id === selectedId ? 0.28 : 0;
      pin.lift = damp(pin.lift, wanted, 10, frame.dt);
      pin.group.position.y = pin.lift;
      const s = 1 + (pin.garage.id === hoveredId ? 0.1 : 0);
      pin.group.scale.x = s;
      pin.group.scale.z = s;
    });

    if (!autoPicked && frame.local > 0.62 && !selectedId) {
      autoPicked = true;
      const nearest = pins.find((p) => p.garage.id === 'patan');
      if (nearest) select(nearest);
    }

    if (routeMesh && routeCurve) {
      routeGrow = Math.min(1, routeGrow + frame.dt * 0.7);
      const perSegment = 8 * 6;
      const count = Math.max(perSegment, Math.floor(routeGrow * (routeTotal / perSegment)) * perSegment);
      routeMesh.geometry.setDrawRange(0, count);
      if (routeGrow >= 1) {
        traveler.visible = true;
        const t = (frame.time * 0.00012) % 1;
        const point = routeCurve.getPointAt(t);
        traveler.position.set(point.x, 0.5, point.z);
        traveler.rotation.y = frame.time * 0.004;
      }
    }

    const pulse = (frame.time * 0.0008) % 1;
    youPulse.scale.setScalar(1 + pulse * 1.6);
    (youPulse.material as T.MeshBasicMaterial).opacity = 0.45 * (1 - pulse);
  };

  const camera = (local: number): CameraPose => {
    const e = smooth(range(local, 0.0, 0.7));
    return {
      position: new THREE.Vector3(originX + lerp(0, -3, e), lerp(66, 38, e), lerp(12, 46, e)),
      look: new THREE.Vector3(originX - 11, 0, lerp(0, -1.5, e)),
    };
  };

  return {
    group,
    interactives,
    update,
    camera,
    hover: (object) => {
      hoveredId = (object?.userData.garageId as string | undefined) ?? null;
      const pin = pins.find((p) => p.garage.id === hoveredId);
      return pin ? infoFor(pin) : null;
    },
    click: (object) => {
      const pin = pins.find((p) => p.garage.id === object.userData.garageId);
      if (pin) select(pin);
    },
    pinned: () => {
      const pin = pins.find((p) => p.garage.id === selectedId);
      return pin ? infoFor(pin) : null;
    },
  };
}
