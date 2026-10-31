import L from 'leaflet';

const HEX_POINTS = '19,2 36,11.5 36,32.5 19,42 2,32.5 2,11.5';

const cache = new Map<string, L.DivIcon>();

const escapeHtml = (text: string) =>
  text.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c] as string);

interface HexIconOptions {
  label?: string;
  variant?: 'default' | 'selected' | 'picker';
}

export function createHexIcon({ label, variant = 'default' }: HexIconOptions = {}): L.DivIcon {
  const key = `${variant}|${label ?? ''}`;
  const cached = cache.get(key);
  if (cached) return cached;

  const inner = label
    ? `<span class="fym-hex-label">${escapeHtml(label)}</span>`
    : '<span class="fym-hex-dot"></span>';

  const icon = L.divIcon({
    className: 'fym-hex-wrap',
    html: `<span class="fym-hex fym-hex--${variant}"><svg viewBox="0 0 38 44" width="38" height="44" aria-hidden="true"><polygon points="${HEX_POINTS}" /></svg>${inner}</span>`,
    iconSize: [38, 44],
    iconAnchor: [19, 22],
    popupAnchor: [0, -26],
  });
  cache.set(key, icon);
  return icon;
}

export const originIcon = L.divIcon({
  className: 'fym-hex-wrap',
  html: '<span class="fym-origin"><span class="fym-origin-pulse"></span><span class="fym-origin-core"></span></span>',
  iconSize: [22, 22],
  iconAnchor: [11, 11],
});
