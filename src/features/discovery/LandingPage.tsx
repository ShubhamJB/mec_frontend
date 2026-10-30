import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PublicLayout } from '../../components/PublicLayout';
import { AvailabilityBadge } from '../../components/AvailabilityBadge';
import { GarageMap } from '../../components/map/GarageMap';
import { storeOrigin } from '../../lib/userLocation';
import { apiClient } from '../../api/client';
import { GarageCardItem } from '../../api/types';

export const LandingPage: React.FC = () => {
  const navigate = useNavigate();
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [nearbyGarages, setNearbyGarages] = useState<GarageCardItem[]>([]);
  const [loadingLocation, setLoadingLocation] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [manualAddress, setManualAddress] = useState('');

  const requestBrowserLocation = () => {
    if (!navigator.geolocation) {
      setLocationError('Geolocation is not supported by your browser.');
      return;
    }

    setLoadingLocation(true);
    setLocationError(null);

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const coords = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setUserLocation(coords);
        storeOrigin(coords);
        try {
          const res = await apiClient<GarageCardItem[]>(
            `/garages/nearby?latitude=${coords.lat}&longitude=${coords.lng}`
          );
          setNearbyGarages(res);
        } catch {
          // ignore or set error
        } finally {
          setLoadingLocation(false);
        }
      },
      (err) => {
        setLoadingLocation(false);
        setLocationError(`Location permission denied (${err.message}). Enter location manually.`);
      },
      { timeout: 8000 }
    );
  };

  const handleManualSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualAddress.trim()) return;
    navigate(`/garages?search=${encodeURIComponent(manualAddress.trim())}`);
  };

  return (
    <PublicLayout>
      <div style={{ maxWidth: '980px', margin: '0 auto', padding: '64px 24px 80px' }}>
        {/* Quiet-instrument style hero */}
        <section style={{ maxWidth: '560px', marginBottom: '64px' }}>
          <h1
            style={{
              fontSize: 'var(--step-title)',
              marginBottom: '16px',
              fontWeight: 500,
              letterSpacing: '-0.02em',
            }}
          >
            Find a trusted mechanic nearby, right when you need one.
          </h1>
          <p
            style={{
              fontSize: 'var(--step-lead)',
              color: 'var(--muted)',
              marginBottom: '32px',
              lineHeight: 1.45,
            }}
          >
            Discover verified bike and car garages around your location. Check real-time operating
            availability, compare verified driver reviews, and call directly.
          </p>

          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', marginBottom: '24px' }}>
            <button
              onClick={requestBrowserLocation}
              disabled={loadingLocation}
              style={{
                backgroundColor: 'var(--ink)',
                color: '#fff',
                padding: '12px 20px',
                borderRadius: 'var(--radius-sm)',
                fontWeight: 500,
                fontSize: 'var(--step-caption)',
              }}
            >
              {loadingLocation ? 'Detecting your location...' : 'Find Garages Near Me'}
            </button>
            <button
              onClick={() => navigate('/garages')}
              style={{
                border: '1px solid var(--border)',
                padding: '12px 20px',
                borderRadius: 'var(--radius-sm)',
                fontSize: 'var(--step-caption)',
                color: 'var(--ink)',
                backgroundColor: 'var(--surface)',
              }}
            >
              Browse All Garages
            </button>
          </div>

          {locationError && (
            <div
              style={{
                padding: '12px',
                backgroundColor: 'var(--status-unavail-bg)',
                color: 'var(--status-unavail-ink)',
                fontSize: 'var(--step-small)',
                borderRadius: 'var(--radius-sm)',
                marginBottom: '16px',
              }}
            >
              {locationError}
            </div>
          )}

          {/* Manual location fallback */}
          <form onSubmit={handleManualSearch} style={{ display: 'flex', gap: '8px', maxWidth: '440px' }}>
            <input
              type="text"
              placeholder="Or search by workshop name or city..."
              value={manualAddress}
              onChange={(e) => setManualAddress(e.target.value)}
              style={{
                flex: 1,
                padding: '10px 14px',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius-sm)',
                backgroundColor: 'var(--surface)',
              }}
            />
            <button
              type="submit"
              style={{
                padding: '10px 16px',
                backgroundColor: 'var(--surface-raised)',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius-sm)',
                fontWeight: 500,
              }}
            >
              Search
            </button>
          </form>
        </section>

        {/* Nearby Quick Preview if location was detected */}
        {userLocation && nearbyGarages.length > 0 && (
          <section style={{ marginBottom: '64px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '16px' }}>
              <h2 style={{ fontSize: '20px' }}>Nearest Available Workshops</h2>
              <button
                onClick={() =>
                  navigate(`/garages?latitude=${userLocation.lat}&longitude=${userLocation.lng}`)
                }
                style={{ fontSize: 'var(--step-small)', color: 'var(--accent)', textDecoration: 'underline' }}
              >
                View full list
              </button>
            </div>

            <div style={{ marginBottom: '20px' }}>
              <GarageMap
                garages={nearbyGarages}
                origin={userLocation}
                height={340}
                ariaLabel="Map of the nearest workshops"
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
              {nearbyGarages.map((garage) => (
                <div
                  key={garage.id}
                  onClick={() => navigate(`/garages/${garage.id}`)}
                  style={{
                    backgroundColor: 'var(--surface)',
                    border: '1px solid var(--border)',
                    borderRadius: 'var(--radius-md)',
                    padding: '20px',
                    cursor: 'pointer',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                  }}
                >
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                      <h3 style={{ fontSize: '18px' }}>{garage.name}</h3>
                      <AvailabilityBadge availability={garage.availability} />
                    </div>
                    {garage.distance_km !== undefined && garage.distance_km !== null && (
                      <p className="tabular-nums" style={{ fontSize: 'var(--step-small)', color: 'var(--muted)', marginBottom: '8px' }}>
                        {garage.distance_km.toFixed(1)} km away
                      </p>
                    )}
                    <p style={{ fontSize: 'var(--step-small)', color: 'var(--ink-secondary)', marginBottom: '16px' }}>
                      {garage.address || 'Address on file'}
                    </p>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--rule)', paddingTop: '12px' }}>
                    <div style={{ fontSize: 'var(--step-small)' }}>
                      {garage.average_rating ? (
                        <span>
                          <strong>{garage.average_rating.toFixed(1)}</strong> ({garage.review_count} reviews)
                        </span>
                      ) : (
                        <span style={{ color: 'var(--muted)' }}>No reviews yet</span>
                      )}
                    </div>
                    <a
                      href={`tel:${garage.phone}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        apiClient(`/garages/${garage.id}/analytics/call-click`, { method: 'POST' }).catch(() => {});
                      }}
                      style={{
                        padding: '6px 12px',
                        backgroundColor: 'var(--surface-raised)',
                        border: '1px solid var(--border)',
                        borderRadius: 'var(--radius-sm)',
                        fontSize: 'var(--step-small)',
                        fontWeight: 500,
                      }}
                    >
                      Call
                    </a>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Quiet feature claims from direction blueprint */}
        <section
          style={{
            borderTop: '1px solid var(--rule)',
            paddingTop: '48px',
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
            gap: '32px',
          }}
        >
          <div>
            <h3 style={{ fontSize: '16px', marginBottom: '8px' }}>Real-time Open & Temporary Status</h3>
            <p style={{ fontSize: 'var(--step-caption)', color: 'var(--muted)', lineHeight: 1.5 }}>
              Operating schedules run against the garage's exact local timezone. When a mechanic is away on breakdown service, their temporary status updates immediately.
            </p>
          </div>
          <div>
            <h3 style={{ fontSize: '16px', marginBottom: '8px' }}>Authentic Customer Reviews</h3>
            <p style={{ fontSize: 'var(--step-caption)', color: 'var(--muted)', lineHeight: 1.5 }}>
              Reviews can only be submitted by registered customers with transparent score breakdowns. Garages cannot manipulate ratings or hide valid feedback.
            </p>
          </div>
          <div>
            <h3 style={{ fontSize: '16px', marginBottom: '8px' }}>Direct Garage Phone Access</h3>
            <p style={{ fontSize: 'var(--step-caption)', color: 'var(--muted)', lineHeight: 1.5 }}>
              No middleman dispatchers or hidden booking surcharges. Connect directly with the shop owner or technician over the phone.
            </p>
          </div>
        </section>
      </div>
    </PublicLayout>
  );
};
