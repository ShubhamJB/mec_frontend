import React, { useEffect, useMemo } from 'react';
import L from 'leaflet';
import { MapContainer, Marker, TileLayer, useMap, useMapEvents } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import './map.css';
import { DEFAULT_CENTER, DEFAULT_ZOOM, TILE_ATTRIBUTION, TILE_URL, isValidCoordinate } from './mapConfig';

interface LocationPickerProps {
  latitude: number | null;
  longitude: number | null;
  onChange: (latitude: number, longitude: number) => void;
  height?: number;
}

const pickerIcon = L.divIcon({
  className: 'fym-pin-wrap',
  html: '<span class="fym-pin fym-pin--picker"></span>',
  iconSize: [22, 22],
  iconAnchor: [11, 11],
});

const ClickToPlace: React.FC<{ onChange: LocationPickerProps['onChange'] }> = ({ onChange }) => {
  useMapEvents({
    click(event) {
      onChange(event.latlng.lat, event.latlng.lng);
    },
  });
  return null;
};

const KeepPinInView: React.FC<{ position: [number, number] | null }> = ({ position }) => {
  const map = useMap();

  useEffect(() => {
    if (position && !map.getBounds().contains(position)) {
      map.setView(position, Math.max(map.getZoom(), 15));
    }
  }, [position?.[0], position?.[1], map]);

  return null;
};

export const LocationPicker: React.FC<LocationPickerProps> = ({
  latitude,
  longitude,
  onChange,
  height = 300,
}) => {
  const position = useMemo<[number, number] | null>(
    () => (isValidCoordinate(latitude, longitude) ? [latitude as number, longitude as number] : null),
    [latitude, longitude]
  );

  return (
    <div>
      <div className="fym-map" role="region" aria-label="Pick the workshop location on the map" style={{ height }}>
        <MapContainer
          center={position ?? DEFAULT_CENTER}
          zoom={position ? 15 : DEFAULT_ZOOM}
          scrollWheelZoom={false}
          style={{ height: '100%', width: '100%' }}
        >
          <TileLayer url={TILE_URL} attribution={TILE_ATTRIBUTION} maxZoom={19} />
          <ClickToPlace onChange={onChange} />
          <KeepPinInView position={position} />
          {position && (
            <Marker
              position={position}
              icon={pickerIcon}
              draggable
              eventHandlers={{
                dragend(event) {
                  const { lat, lng } = (event.target as L.Marker).getLatLng();
                  onChange(lat, lng);
                },
              }}
            />
          )}
        </MapContainer>
      </div>
      <p className="fym-map-hint" style={{ borderRadius: '0 0 var(--radius-md) var(--radius-md)' }}>
        Click the map or drag the pin to set the exact entrance of your workshop.
      </p>
    </div>
  );
};
