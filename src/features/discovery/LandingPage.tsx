import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PublicLayout } from '../../components/PublicLayout';
import { AvailabilityBadge } from '../../components/AvailabilityBadge';
import { GarageMap } from '../../components/map/GarageMap';
import { storeOrigin } from '../../lib/userLocation';
import { apiClient } from '../../api/client';
import { GarageCardItem } from '../../api/types';
import { StarRating } from '../../components/StarRating';
import { ArrowRight, Clock, MapPin, Phone, Search, Siren, Star } from 'lucide-react';
import '../../components/buttons.css';
import './discovery.css';
import './landing.css';

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
      <div className="lp-page">
        <section className="lp-hero">
          <div className="lp-hero__copy">
            <span className="lp-eyebrow">Verified garages, near you</span>
            <h1 className="lp-title">
              Find a trusted mechanic nearby, <em>right when you need one.</em>
            </h1>
            <p className="lp-lead">
              Discover verified bike and car garages around your location. Check real-time availability, compare
              driver reviews, and call directly.
            </p>

            <div className="lp-actions">
              <button type="button" className="btn btn--primary btn--lg" onClick={requestBrowserLocation} disabled={loadingLocation}>
                <MapPin size={18} strokeWidth={1.8} />
                {loadingLocation ? 'Detecting your location...' : 'Find garages near me'}
              </button>
              <button type="button" className="btn btn--ghost btn--lg" onClick={() => navigate('/garages')}>
                Browse all garages
              </button>
            </div>
            <button type="button" className="btn btn--soft lp-roadside" onClick={() => navigate('/roadside')}>
              <Siren size={17} strokeWidth={1.8} />
              Stranded? Get roadside help
              <ArrowRight size={16} strokeWidth={1.8} />
            </button>

            {locationError && <div className="lp-alert">{locationError}</div>}

            <form onSubmit={handleManualSearch} role="search" className="search-capsule lp-search">
              <Search size={18} strokeWidth={1.8} className="search-capsule__icon" aria-hidden="true" />
              <input
                type="text"
                aria-label="Search by workshop name or city"
                placeholder="Or search by workshop name or city..."
                value={manualAddress}
                onChange={(e) => setManualAddress(e.target.value)}
              />
              <button type="submit" className="search-capsule__submit">
                Search
              </button>
            </form>
          </div>

          <div className="lp-hero__art" aria-hidden="true">
            <div className="lp-art-card lp-art-card--main">
              <span className="lp-art-status">Open now</span>
              <strong>Your nearest garage</strong>
              <span className="lp-art-muted">Closes at 18:00 &middot; 1.2 km away</span>
              <div className="lp-art-row">
                <span className="lp-art-stars"><Star size={14} fill="currentColor" strokeWidth={0} /> 4.8</span>
                <span className="lp-art-call"><Phone size={14} strokeWidth={2} /> Call</span>
              </div>
            </div>
            <div className="lp-art-card lp-art-card--float">
              <Clock size={18} strokeWidth={1.7} />
              <span>Real-time hours</span>
            </div>
          </div>
        </section>

        {userLocation && nearbyGarages.length > 0 && (
          <section className="lp-section">
            <div className="lp-section__head">
              <h2>Nearest available <em>workshops</em></h2>
              <button
                type="button"
                className="btn btn--ghost btn--sm"
                onClick={() => navigate(`/garages?latitude=${userLocation.lat}&longitude=${userLocation.lng}`)}
              >
                View full list <ArrowRight size={15} strokeWidth={1.8} />
              </button>
            </div>

            <div className="lp-map">
              <GarageMap garages={nearbyGarages} origin={userLocation} height={340} ariaLabel="Map of the nearest workshops" />
            </div>

            <div className="lp-cards">
              {nearbyGarages.map((garage) => (
                <div key={garage.id} className="lp-garage" onClick={() => navigate(`/garages/${garage.id}`)}>
                  <div>
                    <div className="lp-garage__head">
                      <h3>{garage.name}</h3>
                      <AvailabilityBadge availability={garage.availability} showDetails />
                    </div>
                    {garage.distance_km !== undefined && garage.distance_km !== null && (
                      <p className="lp-garage__distance tabular-nums">{garage.distance_km.toFixed(1)} km away</p>
                    )}
                    <p className="lp-garage__address">{garage.address || 'Address on file'}</p>
                  </div>
                  <div className="lp-garage__foot">
                    <div>
                      {garage.average_rating !== null && garage.average_rating !== undefined ? (
                        <span className="discovery-rating-summary">
                          <StarRating rating={garage.average_rating} size="small" />
                          <span>{garage.review_count} {garage.review_count === 1 ? 'review' : 'reviews'}</span>
                        </span>
                      ) : (
                        <span className="lp-muted">No reviews yet</span>
                      )}
                    </div>
                    <a
                      href={`tel:${garage.phone}`}
                      className="btn btn--primary btn--sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        apiClient(`/garages/${garage.id}/analytics/call-click`, { method: 'POST' }).catch(() => {});
                      }}
                    >
                      <Phone size={14} strokeWidth={2} /> Call
                    </a>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        <section className="lp-features">
          <article>
            <span className="lp-feature-icon"><Clock size={20} strokeWidth={1.7} /></span>
            <h3>Real-time open &amp; temporary status</h3>
            <p>Operating schedules run against the garage&apos;s exact local timezone. When a mechanic is away on breakdown service, their temporary status updates immediately.</p>
          </article>
          <article>
            <span className="lp-feature-icon"><Star size={20} strokeWidth={1.7} /></span>
            <h3>Authentic customer reviews</h3>
            <p>Reviews can only be submitted by registered customers with transparent score breakdowns. Garages cannot manipulate ratings or hide valid feedback.</p>
          </article>
          <article>
            <span className="lp-feature-icon"><Phone size={20} strokeWidth={1.7} /></span>
            <h3>Direct garage phone access</h3>
            <p>No middleman dispatchers or hidden booking surcharges. Connect directly with the shop owner or technician over the phone.</p>
          </article>
        </section>
      </div>
    </PublicLayout>
  );
};
