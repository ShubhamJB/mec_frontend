import React, { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { PublicLayout } from '../../components/PublicLayout';
import { AvailabilityBadge } from '../../components/AvailabilityBadge';
import { GarageMap } from '../../components/map/GarageMap';
import { getStoredOrigin, storeOrigin } from '../../lib/userLocation';
import { apiClient } from '../../api/client';
import { GarageCardItem, ServiceItem, VehicleTypeItem, PaginatedResponse } from '../../api/types';

export const DiscoveryPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const listTopRef = useRef<HTMLDivElement>(null);
  const isPageNavigatingRef = useRef(false);

  const [garages, setGarages] = useState<GarageCardItem[]>([]);
  const [services, setServices] = useState<ServiceItem[]>([]);
  const [vehicleTypes, setVehicleTypes] = useState<VehicleTypeItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [totalItems, setTotalItems] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  // Filters from query params
  const search = searchParams.get('search') || '';
  const page = parseInt(searchParams.get('page') || '1', 10);
  const openNow = searchParams.get('open_now') === 'true';
  const sortBy = searchParams.get('sort_by') || 'highest_rated';
  const selectedServices = searchParams.getAll('service_ids');
  const selectedVehicleTypes = searchParams.getAll('vehicle_type_ids');
  const lat = searchParams.get('latitude');
  const lng = searchParams.get('longitude');

  const [showMap, setShowMap] = useState(true);
  const [searchInput, setSearchInput] = useState(search);
  const origin = useMemo(() => {
    if (!lat || !lng) return null;
    const parsedLat = parseFloat(lat);
    const parsedLng = parseFloat(lng);
    return Number.isFinite(parsedLat) && Number.isFinite(parsedLng) ? { lat: parsedLat, lng: parsedLng } : null;
  }, [lat, lng]);

  useEffect(() => {
    if (origin) storeOrigin(origin);
  }, [origin]);

  const mapOrigin = origin ?? getStoredOrigin();

  // Load catalogs once
  useEffect(() => {
    Promise.all([
      apiClient<PaginatedResponse<ServiceItem>>('/services?limit=100', { skipGlobalLoader: true }).catch(() => ({ items: [] })),
      apiClient<PaginatedResponse<VehicleTypeItem>>('/vehicle-types?limit=100', { skipGlobalLoader: true }).catch(() => ({ items: [] })),
    ]).then(([sRes, vRes]) => {
      setServices(sRes.items || []);
      setVehicleTypes(vRes.items || []);
    });
  }, []);

  const queryString = searchParams.toString();

  const fetchGarages = useCallback(async () => {
    setIsLoading(true);
    try {
      const query = new URLSearchParams(queryString);
      if (!query.has('page')) query.set('page', '1');
      if (!query.has('limit')) query.set('limit', '10');
      if (!query.has('sort_by')) query.set('sort_by', 'highest_rated');

      const res = await apiClient<PaginatedResponse<GarageCardItem>>(`/garages?${query.toString()}`, {
        skipGlobalLoader: true,
      });
      setGarages(res.items || []);
      setTotalItems(res.total_items || 0);
      setTotalPages(res.total_pages || 1);
      setFetchError(null);
    } catch (err: unknown) {
      setGarages([]);
      setFetchError(err instanceof Error ? err.message : 'Unable to connect to the backend server.');
    } finally {
      setIsLoading(false);
    }
  }, [queryString]);

  useEffect(() => {
    fetchGarages();
  }, [fetchGarages]);

  const scrollToTopOfList = () => {
    if (listTopRef.current) {
      const headerOffset = 84;
      const elementPosition = listTopRef.current.getBoundingClientRect().top;
      const offsetPosition = elementPosition + window.pageYOffset - headerOffset;
      window.scrollTo({
        top: Math.max(0, offsetPosition),
        behavior: 'smooth',
      });
    } else {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  // Re-scroll when new page items finish loading and mount to DOM
  useEffect(() => {
    if (isPageNavigatingRef.current && !isLoading) {
      isPageNavigatingRef.current = false;
      // Slight frame tick so the newly rendered garage cards have laid out
      requestAnimationFrame(() => {
        scrollToTopOfList();
      });
    }
  }, [isLoading, garages]);

  const updateParam = (key: string, value: string | null) => {
    const next = new URLSearchParams(searchParams);
    if (value === null || value === '') {
      next.delete(key);
    } else {
      next.set(key, value);
    }
    if (key !== 'page') {
      next.set('page', '1');
    }
    setSearchParams(next);
  };

  useEffect(() => {
    setSearchInput(search);
  }, [search]);

  const submitSearch = (event: React.FormEvent) => {
    event.preventDefault();
    updateParam('search', searchInput.trim() || null);
  };

  const clearSearch = () => {
    setSearchInput('');
    updateParam('search', null);
  };

  const goToPage = (targetPage: number) => {
    if (targetPage < 1 || targetPage > totalPages || targetPage === page) return;
    isPageNavigatingRef.current = true;
    scrollToTopOfList();
    updateParam('page', targetPage.toString());
  };

  const toggleMultiParam = (key: string, value: string) => {
    const next = new URLSearchParams(searchParams);
    const existing = next.getAll(key);
    next.delete(key);
    if (existing.includes(value)) {
      existing.filter((v) => v !== value).forEach((v) => next.append(key, v));
    } else {
      [...existing, value].forEach((v) => next.append(key, v));
    }
    next.set('page', '1');
    setSearchParams(next);
  };

  return (
    <PublicLayout>
      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '32px 24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '24px' }}>
          <div>
            <h1 style={{ fontSize: '24px', fontWeight: 600 }}>Explore Garages</h1>
            <p style={{ color: 'var(--muted)', fontSize: 'var(--step-caption)' }}>
              {totalItems} active {totalItems === 1 ? 'workshop' : 'workshops'} found
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button
              type="button"
              onClick={() => setShowMap((v) => !v)}
              aria-pressed={showMap}
              style={{
                padding: '7px 12px',
                marginRight: '8px',
                fontSize: 'var(--step-small)',
                fontWeight: 500,
                color: 'var(--ink)',
                backgroundColor: 'var(--surface)',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius-sm)',
                cursor: 'pointer',
              }}
            >
              {showMap ? 'Hide map' : 'Show map'}
            </button>
            <span style={{ fontSize: 'var(--step-small)', color: 'var(--muted)', fontWeight: 500 }}>
              Sort:
            </span>
            <div style={{ position: 'relative', display: 'inline-block' }}>
              <select
                value={sortBy}
                onChange={(e) => updateParam('sort_by', e.target.value)}
                style={{
                  appearance: 'none',
                  WebkitAppearance: 'none',
                  padding: '7px 32px 7px 12px',
                  fontSize: 'var(--step-small)',
                  fontWeight: 500,
                  color: 'var(--ink)',
                  backgroundColor: 'var(--surface)',
                  border: '1px solid var(--border)',
                  borderRadius: 'var(--radius-sm)',
                  cursor: 'pointer',
                  outline: 'none',
                  transition: 'border-color 0.15s ease',
                }}
              >
                <option value="highest_rated">Highest Rated</option>
                <option value="most_reviewed">Most Reviewed</option>
                {lat && lng && <option value="nearest">Nearest First</option>}
              </select>
              <svg
                width="12"
                height="12"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                style={{
                  position: 'absolute',
                  right: '10px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  pointerEvents: 'none',
                  color: 'var(--muted)',
                }}
              >
                <polyline points="6 9 12 15 18 9" />
              </svg>
            </div>
          </div>
        </div>

        <form onSubmit={submitSearch} role="search" style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
          <div style={{ position: 'relative', flex: 1 }}>
            <svg
              width="16"
              height="16"
              viewBox="0 0 16 16"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinecap="round"
              aria-hidden="true"
              style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--muted)' }}
            >
              <circle cx="7" cy="7" r="4.5" />
              <path d="M10.5 10.5L14 14" />
            </svg>
            <input
              type="search"
              aria-label="Search workshops by name or area"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Search by workshop name or area, e.g. Patan or Lalitpur"
              style={{
                width: '100%',
                padding: '11px 12px 11px 36px',
                fontSize: 'var(--step-body)',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius-sm)',
                backgroundColor: 'var(--card)',
              }}
            />
          </div>
          <button
            type="submit"
            style={{
              padding: '0 22px',
              fontSize: 'var(--step-caption)',
              fontWeight: 600,
              color: 'var(--on-dark)',
              backgroundColor: 'var(--ink)',
              borderRadius: 'var(--radius-sm)',
            }}
          >
            Search
          </button>
        </form>
        <div style={{ minHeight: '24px', marginBottom: '16px', fontSize: 'var(--step-small)', color: 'var(--muted)' }}>
          {search && (
            <span>
              Showing results for <strong style={{ color: 'var(--ink)' }}>&ldquo;{search}&rdquo;</strong>.{' '}
              <button type="button" onClick={clearSearch} style={{ fontSize: 'inherit', color: 'var(--accent)', textDecoration: 'underline' }}>
                Clear search
              </button>
            </span>
          )}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '260px 1fr', gap: '32px' }}>
          {/* Filters Sidebar */}
          <aside style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            {/* Open Now filter */}
            <div>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: 'var(--step-caption)' }}>
                <input
                  type="checkbox"
                  checked={openNow}
                  onChange={(e) => updateParam('open_now', e.target.checked ? 'true' : null)}
                />
                <span>Open Now</span>
              </label>
            </div>

            {/* Vehicle Types Filter (ANY) */}
            {vehicleTypes.length > 0 && (
              <div>
                <label style={{ display: 'block', fontSize: 'var(--step-caption)', fontWeight: 500, marginBottom: '8px' }}>
                  Vehicle Types
                </label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {vehicleTypes.map((v) => (
                    <label key={v.id} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: 'var(--step-small)', cursor: 'pointer' }}>
                      <input
                        type="checkbox"
                        checked={selectedVehicleTypes.includes(v.id)}
                        onChange={() => toggleMultiParam('vehicle_type_ids', v.id)}
                      />
                      <span>{v.name}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}

            {/* Services Filter (ANY) */}
            {services.length > 0 && (
              <div>
                <label style={{ display: 'block', fontSize: 'var(--step-caption)', fontWeight: 500, marginBottom: '8px' }}>
                  Services Offered
                </label>
                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '4px',
                    maxHeight: '260px',
                    overflowY: 'auto',
                    paddingRight: '8px',
                    paddingBottom: '2px',
                    scrollbarWidth: 'thin',
                  }}
                >
                  {services.map((s) => (
                    <label
                      key={s.id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        fontSize: 'var(--step-small)',
                        cursor: 'pointer',
                        minHeight: '28px',
                        flexShrink: 0,
                        padding: '2px 0',
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={selectedServices.includes(s.id)}
                        onChange={() => toggleMultiParam('service_ids', s.id)}
                      />
                      <span style={{ lineHeight: 1.3 }}>{s.name}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}
          </aside>

          {/* Garage List Column - Position relative with localized loading overlay that ignores/excludes the side filter */}
          <main
            ref={listTopRef}
            style={{
              scrollMarginTop: '24px',
              position: 'relative',
              minHeight: '380px',
            }}
          >
            {/* Localized Results Dimming & Spinner Overlay */}
            {isLoading && (
              <div
                role="status"
                aria-live="polite"
                aria-label="Finding workshops"
                style={{
                  position: 'absolute',
                  inset: 0,
                  zIndex: 20,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '12px',
                  backgroundColor: 'color-mix(in srgb, var(--bg) 60%, transparent)',
                  backdropFilter: 'blur(2px)',
                  WebkitBackdropFilter: 'blur(2px)',
                  borderRadius: 'var(--radius-md)',
                  minHeight: '280px',
                }}
              >
                <svg
                  width="44"
                  height="44"
                  viewBox="0 0 48 48"
                  fill="none"
                  style={{
                    animation: 'fym-spin 0.85s linear infinite',
                    transformOrigin: 'center',
                  }}
                >
                  <circle
                    cx="24"
                    cy="24"
                    r="20"
                    stroke="var(--border)"
                    strokeWidth="3.5"
                    opacity="0.6"
                  />
                  <path
                    d="M24 4 A 20 20 0 0 1 44 24"
                    stroke="var(--accent)"
                    strokeWidth="3.5"
                    strokeLinecap="round"
                  />
                </svg>
                <span
                  style={{
                    fontSize: '13px',
                    fontWeight: 500,
                    color: 'var(--ink)',
                    letterSpacing: '0.01em',
                  }}
                >
                  Finding workshops...
                </span>
              </div>
            )}

            {fetchError ? (
              <div
                style={{
                  padding: '32px',
                  backgroundColor: 'var(--status-danger-bg)',
                  color: 'var(--status-danger-ink)',
                  border: '1px solid var(--border)',
                  borderRadius: 'var(--radius-md)',
                }}
              >
                <h3 style={{ fontSize: '18px', marginBottom: '8px' }}>Failed to load garages</h3>
                <p style={{ fontSize: 'var(--step-caption)', marginBottom: '16px' }}>{fetchError}</p>
                <button
                  onClick={() => fetchGarages()}
                  style={{
                    padding: '8px 16px',
                    backgroundColor: 'var(--ink)',
                    color: 'var(--on-dark)',
                    borderRadius: 'var(--radius-sm)',
                    fontSize: 'var(--step-caption)',
                    fontWeight: 500,
                  }}
                >
                  Retry
                </button>
              </div>
            ) : !isLoading && garages.length === 0 ? (
              <div
                style={{
                  padding: '48px',
                  textAlign: 'center',
                  backgroundColor: 'var(--surface)',
                  border: '1px solid var(--border)',
                  borderRadius: 'var(--radius-md)',
                }}
              >
                <h3 style={{ fontSize: '18px', marginBottom: '8px' }}>No garages match your criteria</h3>
                <p style={{ color: 'var(--muted)', fontSize: 'var(--step-caption)' }}>
                  Try a different name or area, or relax your service and vehicle filters.
                </p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {showMap && (
                  <div>
                    <GarageMap
                      garages={garages}
                      origin={mapOrigin}
                      height={340}
                      ariaLabel="Map of the workshops listed on this page"
                    />
                    <p style={{ marginTop: '8px', fontSize: 'var(--step-small)', color: 'var(--muted)' }}>
                      Showing the {garages.length} {garages.length === 1 ? 'workshop' : 'workshops'} from this page on the map.
                    </p>
                  </div>
                )}
                {garages.map((garage) => (
                  <div
                    key={garage.id}
                    onClick={() => navigate(`/garages/${garage.id}`)}
                    style={{
                      backgroundColor: 'var(--surface)',
                      border: '1px solid var(--border)',
                      borderRadius: 'var(--radius-md)',
                      padding: '24px',
                      cursor: 'pointer',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'flex-start',
                      gap: '24px',
                    }}
                  >
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '6px' }}>
                        <h2 style={{ fontSize: '20px', fontWeight: 600 }}>{garage.name}</h2>
                        <AvailabilityBadge availability={garage.availability} showDetails />
                      </div>

                      <p style={{ color: 'var(--muted)', fontSize: 'var(--step-small)', marginBottom: '12px' }}>
                        {garage.address || 'Address registered on file'}
                        {garage.distance_km !== undefined && garage.distance_km !== null && (
                          <span className="tabular-nums" style={{ marginLeft: '8px', fontWeight: 500 }}>
                            • {garage.distance_km.toFixed(1)} km away
                          </span>
                        )}
                      </p>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '16px', fontSize: 'var(--step-caption)' }}>
                        <div>
                          {garage.average_rating ? (
                            <span>
                              <strong>{garage.average_rating.toFixed(1)}</strong> out of 5 ({garage.review_count} {garage.review_count === 1 ? 'review' : 'reviews'})
                            </span>
                          ) : (
                            <span style={{ color: 'var(--muted)' }}>No reviews yet</span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '12px' }}>
                      <a
                        href={`tel:${garage.phone}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          apiClient(`/garages/${garage.id}/analytics/call-click`, { method: 'POST' }).catch(() => {});
                        }}
                        style={{
                          padding: '8px 16px',
                          backgroundColor: 'var(--ink)',
                          color: 'var(--on-dark)',
                          borderRadius: 'var(--radius-sm)',
                          fontSize: 'var(--step-caption)',
                          fontWeight: 500,
                          textAlign: 'center',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        Call Workshop
                      </a>
                      <span style={{ fontSize: 'var(--step-small)', color: 'var(--muted)' }} className="tabular-nums">
                        {garage.phone}
                      </span>
                    </div>
                  </div>
                ))}

                {/* Pagination (Windowed [1, 2, 3] with disabled < and >) */}
                {totalPages > 1 && (
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '6px',
                      marginTop: '32px',
                    }}
                  >
                    {/* Previous button */}
                    <button
                      onClick={() => goToPage(page - 1)}
                      disabled={page <= 1}
                      aria-label="Previous page"
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        minWidth: '36px',
                        height: '36px',
                        padding: '0 8px',
                        borderRadius: 'var(--radius-sm)',
                        backgroundColor: 'var(--surface)',
                        color: page <= 1 ? 'var(--rule)' : 'var(--ink)',
                        border: '1px solid var(--border)',
                        cursor: page <= 1 ? 'not-allowed' : 'pointer',
                        opacity: page <= 1 ? 0.5 : 1,
                        fontSize: '14px',
                        fontWeight: 600,
                      }}
                    >
                      &lt;
                    </button>

                    {/* Windowed numbers (e.g. 1, 2, 3 or centered around active page) */}
                    {(() => {
                      const windowSize = 3;
                      let start = Math.max(1, page - 1);
                      let end = start + windowSize - 1;

                      if (end > totalPages) {
                        end = totalPages;
                        start = Math.max(1, end - windowSize + 1);
                      }

                      const pagesToShow: number[] = [];
                      for (let p = start; p <= end; p++) {
                        pagesToShow.push(p);
                      }

                      return pagesToShow.map((p) => {
                        const isActive = p === page;
                        return (
                          <button
                            key={p}
                            onClick={() => goToPage(p)}
                            className="tabular-nums"
                            style={{
                              minWidth: '36px',
                              height: '36px',
                              borderRadius: 'var(--radius-sm)',
                              backgroundColor: isActive ? 'var(--ink)' : 'var(--surface)',
                              color: isActive ? 'var(--on-dark)' : 'var(--ink)',
                              border: '1px solid var(--border)',
                              fontWeight: isActive ? 600 : 500,
                              fontSize: 'var(--step-small)',
                              cursor: 'pointer',
                            }}
                          >
                            {p}
                          </button>
                        );
                      });
                    })()}

                    {/* Next button */}
                    <button
                      onClick={() => goToPage(page + 1)}
                      disabled={page >= totalPages}
                      aria-label="Next page"
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        minWidth: '36px',
                        height: '36px',
                        padding: '0 8px',
                        borderRadius: 'var(--radius-sm)',
                        backgroundColor: 'var(--surface)',
                        color: page >= totalPages ? 'var(--rule)' : 'var(--ink)',
                        border: '1px solid var(--border)',
                        cursor: page >= totalPages ? 'not-allowed' : 'pointer',
                        opacity: page >= totalPages ? 0.5 : 1,
                        fontSize: '14px',
                        fontWeight: 600,
                      }}
                    >
                      &gt;
                    </button>
                  </div>
                )}
              </div>
            )}
          </main>
        </div>
      </div>
    </PublicLayout>
  );
};
