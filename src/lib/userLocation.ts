import type { LatLng } from '../components/map/routing';

const STORAGE_KEY = 'fym:origin';

export function getStoredOrigin(): LatLng | null {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<LatLng>;
    return typeof parsed.lat === 'number' && typeof parsed.lng === 'number'
      ? { lat: parsed.lat, lng: parsed.lng }
      : null;
  } catch {
    return null;
  }
}

export function storeOrigin(origin: LatLng): void {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(origin));
  } catch {
    return;
  }
}

export function requestBrowserOrigin(): Promise<LatLng> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Your browser does not support location.'));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const origin = { lat: position.coords.latitude, lng: position.coords.longitude };
        storeOrigin(origin);
        resolve(origin);
      },
      (error) => reject(new Error(`Location permission was not granted (${error.message}).`)),
      { timeout: 8000 }
    );
  });
}
