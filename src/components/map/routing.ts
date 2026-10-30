export interface LatLng {
  lat: number;
  lng: number;
}

export interface RouteOption {
  distanceMeters: number;
  durationSeconds: number;
  path: Array<[number, number]>;
}

interface OsrmRoute {
  distance: number;
  duration: number;
  geometry: { coordinates: Array<[number, number]> };
}

interface OsrmResponse {
  code: string;
  routes?: OsrmRoute[];
}

const ROUTING_URL = 'https://router.project-osrm.org/route/v1/driving';

export async function fetchRoutes(from: LatLng, to: LatLng, signal?: AbortSignal): Promise<RouteOption[]> {
  const url = `${ROUTING_URL}/${from.lng},${from.lat};${to.lng},${to.lat}?overview=full&geometries=geojson&alternatives=true`;
  const response = await fetch(url, { signal });
  if (!response.ok) {
    throw new Error(`The routing service answered with an error (${response.status}).`);
  }
  const data = (await response.json()) as OsrmResponse;
  if (data.code !== 'Ok' || !data.routes || data.routes.length === 0) {
    throw new Error('No drivable route was found between these two points.');
  }
  return data.routes
    .map((route) => ({
      distanceMeters: route.distance,
      durationSeconds: route.duration,
      path: route.geometry.coordinates.map(([lng, lat]): [number, number] => [lat, lng]),
    }))
    .sort((a, b) => a.distanceMeters - b.distanceMeters);
}

export function straightLineMeters(a: LatLng, b: LatLng): number {
  const earthRadiusMeters = 6371008.8;
  const toRadians = (degrees: number) => (degrees * Math.PI) / 180;
  const dLat = toRadians(b.lat - a.lat);
  const dLng = toRadians(b.lng - a.lng);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRadians(a.lat)) * Math.cos(toRadians(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * earthRadiusMeters * Math.asin(Math.sqrt(h));
}

export function formatDistance(meters: number): string {
  if (meters < 1000) return `${Math.round(meters / 10) * 10} m`;
  return `${(meters / 1000).toFixed(1)} km`;
}

export function formatDuration(seconds: number): string {
  const minutes = Math.max(1, Math.round(seconds / 60));
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest === 0 ? `${hours} h` : `${hours} h ${rest} min`;
}

export function routeLabel(routes: RouteOption[], index: number): string {
  if (index === 0) return 'Shortest';
  const fastest = routes.reduce((best, route, i) => (route.durationSeconds < routes[best].durationSeconds ? i : best), 0);
  return index === fastest ? 'Fastest' : 'Alternative';
}
