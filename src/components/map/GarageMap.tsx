import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import L from 'leaflet';
import { MapContainer, Marker, Polyline, Popup, TileLayer, useMap, useMapEvents } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import './map.css';
import { DEFAULT_CENTER, DEFAULT_ZOOM, getTileSource, isValidCoordinate, readToken } from './mapConfig';
import { createHexIcon, originIcon } from './mapIcons';
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

const FIT_ICON =
  '<svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M2 6V2h4M10 2h4v4M14 10v4h-4M6 14H2v-4"/></svg>';

const FitControl: React.FC<{ points: Array<[number, number]> }> = ({ points }) => {
  const map = useMap();
  const pointsRef = React.useRef(points);
  pointsRef.current = points;

  useEffect(() => {
    const control = new L.Control({ position: 'topleft' });
    control.onAdd = () => {
      const container = L.DomUtil.create('div', 'leaflet-bar fym-fit');
      const button = L.DomUtil.create('a', '', container);
      button.href = '#';
      button.title = 'Show all workshops';
      button.setAttribute('role', 'button');
      button.setAttribute('aria-label', 'Show all workshops');
      button.innerHTML = FIT_ICON;
      L.DomEvent.disableClickPropagation(container);
      L.DomEvent.on(button, 'click', (event) => {
        L.DomEvent.preventDefault(event);
        const current = pointsRef.current;
        if (current.length === 1) map.setView(current[0], 15);
        else if (current.length > 1) map.fitBounds(L.latLngBounds(current), { padding: [36, 36], maxZoom: 16 });
      });
      return container;
    };
    control.addTo(map);
    return () => {
      control.remove();
    };
  }, [map]);

  return null;
};

const ScrollZoomOnClick: React.FC = () => {
  const map = useMap();
  useMapEvents({
    click: () => map.scrollWheelZoom.enable(),
    mouseout: () => map.scrollWheelZoom.disable(),
  });
  return null;
};

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
  const tiles = useMemo(() => getTileSource(), []);
  const colors = useMemo(
    () => ({
      route: readToken('--map-route', '#1f2de6'),
      casing: readToken('--map-route-casing', '#ffffff'),
      alternative: readToken('--map-alt-route', '#8a93a3'),
    }),
    []
  );

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
          <TileLayer
            url={tiles.url}
            attribution={tiles.attribution}
            maxZoom={tiles.maxZoom}
            subdomains={tiles.subdomains}
          />
          <FitToPoints points={points} paused={routeState.status === 'ready'} />
          <FitControl points={points} />
          <ScrollZoomOnClick />
          <FitToRoute path={activePath} />

          {routeState.status === 'ready' &&
            routeState.routes.map((route, index) =>
              index === selectedRoute ? null : (
                <React.Fragment key={`alt-${index}`}>
                  <Polyline
                    positions={route.path}
                    interactive={false}
                    pathOptions={{ color: colors.casing, weight: 9, opacity: 0.85, lineCap: 'round', lineJoin: 'round' }}
                  />
                  <Polyline
                    positions={route.path}
                    pathOptions={{ color: colors.alternative, weight: 5, opacity: 0.95, lineCap: 'round', lineJoin: 'round' }}
                    eventHandlers={{ click: () => setSelectedRoute(index) }}
                  />
                </React.Fragment>
              )
            )}
          {routeState.status === 'ready' && routeState.routes[selectedRoute] && (
            <>
              <Polyline
                positions={routeState.routes[selectedRoute].path}
                interactive={false}
                pathOptions={{ color: colors.casing, weight: 11, opacity: 1, lineCap: 'round', lineJoin: 'round' }}
              />
              <Polyline
                positions={routeState.routes[selectedRoute].path}
                pathOptions={{ color: colors.route, weight: 6, opacity: 1, lineCap: 'round', lineJoin: 'round' }}
              />
            </>
          )}

          {validOrigin && (
            <Marker position={[validOrigin.lat, validOrigin.lng]} icon={originIcon} interactive={false} />
          )}

          {visible.map((g) => (
            <Marker key={g.id} position={[g.latitude, g.longitude]} icon={createHexIcon({
                label: g.average_rating ? g.average_rating.toFixed(1) : undefined,
                variant: g.id === routeTargetId ? 'selected' : 'default',
              })}
              title={g.name}
            >
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
                    ? `${g.average_rating.toFixed(1)} out of 5 (${g.review_count ?? 0})`
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
