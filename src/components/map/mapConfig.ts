interface TileSource {
  url: string;
  attribution: string;
  maxZoom: number;
  subdomains: string;
}

const OSM_CREDIT = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';

const TILE_SOURCES: Record<string, TileSource> = {
  osm: {
    url: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution: OSM_CREDIT,
    maxZoom: 19,
    subdomains: 'abc',
  },
};

export const readToken = (name: string, fallback: string): string => {
  const value = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return value || fallback;
};

export const getTileSource = (): TileSource => TILE_SOURCES[readToken('--map-tiles', 'osm')] ?? TILE_SOURCES.osm;

export const DEFAULT_CENTER: [number, number] = [27.7172, 85.324];

export const DEFAULT_ZOOM = 12;

export const isValidCoordinate = (lat: unknown, lng: unknown): lat is number =>
  typeof lat === 'number' &&
  typeof lng === 'number' &&
  Number.isFinite(lat) &&
  Number.isFinite(lng) &&
  Math.abs(lat) <= 90 &&
  Math.abs(lng) <= 180;
