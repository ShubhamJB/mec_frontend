import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import L from 'leaflet';
import { MapContainer, Marker, Polyline, Popup, TileLayer, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import './map.css';
import { DEFAULT_CENTER, DEFAULT_ZOOM, TILE_ATTRIBUTION, TILE_URL, isValidCoordinate } from './mapConfig';
import {
  RouteOption,
  fetchRoutes,
  formatDistance,
  formatDuration,
  routeLabel,
  straightLineMeters,
} from './routing';

export interface MapGarage {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  average_rating?: number | null;
  review_count?: number;
  address?: string;
}

interface GarageMapProps {
  garages: MapGarage[];
  origin?: { lat: number; lng: number } | null;
  height?: number;
  linkToProfile?: boolean;
  autoRouteToId?: string;
  ariaLabel?: string;
}

type RouteState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'ready'; routes: RouteOption[] };

const ROUTE_COLOR = '#5c6b54';
const ALTERNATIVE_COLOR = '#8b867f';

const garageIcon = L.divIcon({
  className: 'fym-pin-wrap',
  html: '<span class="fym-pin"></span>',
  iconSize: [18, 18],
  iconAnchor: [9, 9],
  popupAnchor: [0, -12],
});

const originIcon = L.divIcon({
  className: 'fym-pin-wrap',
  html: '<span class="fym-origin"></span>',
  iconSize: [14, 14],
  iconAnchor: [7, 7],
});

const FitToPoints: React.FC<{ points: Array<[number, number]>; paused: boolean }> = ({ points, paused }) => {
  const map = useMap();
  const key = points.map((p) => p.join(',')).join('|');

  useEffect(() => {
    if (paused || points.length === 0) return;
    if (points.length === 1) {
      map.setView(points[0], 15);
      return;
    }
    map.fitBounds(L.latLngBounds(points), { padding: [36, 36], maxZoom: 16 });
  }, [key, paused, map]);

  return null;
};

const FitToRoute: React.FC<{ path: Array<[number, number]> | null }> = ({ path }) => {
  const map = useMap();

  useEffect(() => {
    if (path && path.length > 1) {
      map.fitBounds(L.latLngBounds(path), { padding: [40, 40], maxZoom: 17 });
    }
  }, [path, map]);

  return null;
};

export const GarageMap: React.FC<GarageMapProps> = ({
  garages,
  origin = null,
  height = 360,
  linkToProfile = true,
  autoRouteToId,
  ariaLabel = 'Map of workshops',
}) => {
  const [routeTargetId, setRouteTargetId] = useState<string | null>(null);
  const [routeState, setRouteState] = useState<RouteState>({ status: 'idle' });
  const [selectedRoute, setSelectedRoute] = useState(0);

  const visible = useMemo(
    () => garages.filter((g) => isValidCoordinate(g.latitude, g.longitude)),
    [garages]
  );

  const validOrigin = origin && isValidCoordinate(origin.lat, origin.lng) ? origin : null;
  const originKey = validOrigin ? `${validOrigin.lat},${validOrigin.lng}` : '';

  const points = useMemo<Array<[number, number]>>(() => {
    const list: Array<[number, number]> = visible.map((g) => [g.latitude, g.longitude]);
    if (validOrigin) list.push([validOrigin.lat, validOrigin.lng]);
    return list;
  }, [visible, originKey]);

  const target = useMemo(() => visible.find((g) => g.id === routeTargetId) ?? null, [visible, routeTargetId]);

  useEffect(() => {
    if (autoRouteToId && validOrigin) setRouteTargetId(autoRouteToId);
  }, [autoRouteToId, originKey]);

  useEffect(() => {
    if (!target || !validOrigin) {
      setRouteState({ status: 'idle' });
      return;
    }
    const controller = new AbortController();
    setRouteState({ status: 'loading' });
    setSelectedRoute(0);
    fetchRoutes(validOrigin, { lat: target.latitude, lng: target.longitude }, controller.signal)
      .then((routes) => setRouteState({ status: 'ready', routes }))
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;
        setRouteState({
          status: 'error',
          message: error instanceof Error ? error.message : 'The route could not be loaded.',
        });
      });
    return () => controller.abort();
  }, [target?.id, originKey]);

  const activePath =
    routeState.status === 'ready' ? routeState.routes[selectedRoute]?.path ?? null : null;

  const clearRoute = () => {
    setRouteTargetId(null);
    setRouteState({ status: 'idle' });
  };

  return (
    <div>
      <div className="fym-map" role="region" aria-label={ariaLabel} style={{ height }}>
        <MapContainer
          center={points[0] ?? DEFAULT_CENTER}
          zoom={DEFAULT_ZOOM}
          scrollWheelZoom={false}
          style={{ height: '100%', width: '100%' }}
        >
          <TileLayer url={TILE_URL} attribution={TILE_ATTRIBUTION} maxZoom={19} />
          <FitToPoints points={points} paused={routeState.status === 'ready'} />
          <FitToRoute path={activePath} />

          {routeState.status === 'ready' &&
            routeState.routes.map((route, index) =>
              index === selectedRoute ? null : (
                <Polyline
                  key={`alt-${index}`}
                  positions={route.path}
                  pathOptions={{ color: ALTERNATIVE_COLOR, weight: 5, opacity: 0.8 }}
                  eventHandlers={{ click: () => setSelectedRoute(index) }}
                />
              )
            )}
          {routeState.status === 'ready' && routeState.routes[selectedRoute] && (
            <Polyline
              positions={routeState.routes[selectedRoute].path}
              pathOptions={{ color: ROUTE_COLOR, weight: 6, opacity: 0.95 }}
            />
          )}

          {validOrigin && (
            <Marker position={[validOrigin.lat, validOrigin.lng]} icon={originIcon} interactive={false} />
          )}

          {visible.map((g) => (
            <Marker key={g.id} position={[g.latitude, g.longitude]} icon={garageIcon} title={g.name}>
              <Popup>
                {linkToProfile ? (
                  <Link to={`/garages/${g.id}`} className="fym-popup-title">
                    {g.name}
                  </Link>
                ) : (
                  <strong className="fym-popup-title" style={{ textDecoration: 'none' }}>
                    {g.name}
                  </strong>
                )}
                <div className="fym-popup-meta">
                  {g.average_rating
                    ? `${g.average_rating.toFixed(1)} ★ (${g.review_count ?? 0})`
                    : 'No reviews yet'}
                </div>
                {g.address && <div className="fym-popup-meta">{g.address}</div>}
                {validOrigin && (
                  <button type="button" className="fym-popup-action" onClick={() => setRouteTargetId(g.id)}>
                    Show route from my location
                  </button>
                )}
              </Popup>
            </Marker>
          ))}
        </MapContainer>
      </div>

      {validOrigin && (
        <div className="fym-route-panel" aria-live="polite">
          {routeState.status === 'idle' && (
            <span className="fym-popup-meta">
              Click a workshop pin and choose “Show route from my location” to see the way there.
            </span>
          )}
          {routeState.status === 'loading' && <span className="fym-popup-meta">Finding the best route…</span>}
          {routeState.status === 'error' && target && (
            <div>
              <div style={{ color: 'var(--status-danger-ink)', marginBottom: '4px' }}>{routeState.message}</div>
              <div className="fym-popup-meta">
                Straight-line distance to {target.name}:{' '}
                {formatDistance(
                  straightLineMeters(validOrigin, { lat: target.latitude, lng: target.longitude })
                )}{' '}
                (not a road route).
              </div>
            </div>
          )}
          {routeState.status === 'ready' && target && (
            <div>
              <div className="fym-route-heading">
                <strong>Route to {target.name}</strong>
                <button type="button" className="fym-link-button" onClick={clearRoute}>
                  Clear route
                </button>
              </div>
              <div className="fym-route-options" role="radiogroup" aria-label="Route options">
                {routeState.routes.map((route, index) => (
                  <button
                    key={index}
                    type="button"
                    role="radio"
                    aria-checked={index === selectedRoute}
                    className={`fym-route-option${index === selectedRoute ? ' fym-route-option--active' : ''}`}
                    onClick={() => setSelectedRoute(index)}
                  >
                    <span className="fym-route-option-label">{routeLabel(routeState.routes, index)}</span>
                    <span className="tabular-nums">
                      {formatDistance(route.distanceMeters)} · {formatDuration(route.durationSeconds)}
                    </span>
                  </button>
                ))}
              </div>
              <div className="fym-popup-meta" style={{ marginTop: '6px' }}>
                Driving routes along roads. Times are estimates without live traffic.
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
