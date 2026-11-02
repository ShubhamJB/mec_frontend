import React, { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { PublicLayout } from '../../components/PublicLayout';
import { AvailabilityBadge } from '../../components/AvailabilityBadge';
import { GarageMap } from '../../components/map/GarageMap';
import { getStoredOrigin, storeOrigin } from '../../lib/userLocation';
import { apiClient } from '../../api/client';
import { GarageCardItem, ServiceItem, VehicleTypeItem, PaginatedResponse } from '../../api/types';
import { StarRating } from '../../components/StarRating';
import './discovery.css';
import { FilterChip } from '../../components/FilterChip';
import { MultiSelect, SingleSelect } from '../../components/Dropdown';
import { LayoutGrid, List, Map as MapIcon, Search, X } from 'lucide-react';

const GarageThumb: React.FC<{ garage: GarageCardItem; size: number }> = ({ garage, size }) => (
  <span className="garage-thumb" style={{ width: size, height: size, borderRadius: size > 60 ? 20 : 12 }} aria-hidden="true">
    {garage.cover_photo_url ? <img src={garage.cover_photo_url} alt="" loading="lazy" /> : <span>{garage.name.charAt(0).toUpperCase()}</span>}
  </span>
);

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
  const [viewMode, setViewMode] = useState<'cards' | 'table'>(() => {
    try {
      return localStorage.getItem('garage_view_mode') === 'table' ? 'table' : 'cards';
    } catch {
      return 'cards';
    }
  });
  const [isNarrow, setIsNarrow] = useState(() => window.matchMedia('(max-width: 820px)').matches);
  useEffect(() => {
    const query = window.matchMedia('(max-width: 820px)');
    const onChange = (event: MediaQueryListEvent) => setIsNarrow(event.matches);
    query.addEventListener('change', onChange);
    return () => query.removeEventListener('change', onChange);
  }, []);
  const activeView = isNarrow ? 'cards' : viewMode;
  const changeView = (mode: 'cards' | 'table') => {
    setViewMode(mode);
    try {
      localStorage.setItem('garage_view_mode', mode);
    } catch {
      /* ignore storage failures */
    }
  };
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

  const renderCall = (garage: GarageCardItem, label = 'Call workshop') => (
                      <a
                        href={`tel:${garage.phone}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          apiClient(`/garages/${garage.id}/analytics/call-click`, { method: 'POST' }).catch(() => {});
                        }}
                        className="discovery-garage-call"
                      >
                        {label}
                      </a>
                    );

  const activeFilterCount = (openNow ? 1 : 0) + selectedServices.length + selectedVehicleTypes.length;

  const clearFilters = () => {
    const next = new URLSearchParams(searchParams);
    next.delete('open_now');
    next.delete('service_ids');
    next.delete('vehicle_type_ids');
    next.set('page', '1');
    setSearchParams(next);
  };

  return (
    <PublicLayout>
      <div className="explore-page">
        <div className="explore-head">
          <div>
            <h1 className="explore-title">Explore <em>garages</em></h1>
            <p className="explore-count">
              <span className="tabular-nums">{totalItems}</span> verified {totalItems === 1 ? 'workshop' : 'workshops'} near you
            </p>
          </div>

          <div className="explore-controls">
            {!isNarrow && (
              <div className="view-toggle" role="group" aria-label="Listing view">
                <button type="button" className={activeView === 'cards' ? 'is-active' : ''} aria-pressed={activeView === 'cards'} onClick={() => changeView('cards')}>
                  <LayoutGrid size={15} /> Cards
                </button>
                <button type="button" className={activeView === 'table' ? 'is-active' : ''} aria-pressed={activeView === 'table'} onClick={() => changeView('table')}>
                  <List size={15} /> Table
                </button>
              </div>
            )}
            <button type="button" className="map-toggle" onClick={() => setShowMap((v) => !v)} aria-pressed={showMap}>
              <MapIcon size={15} /> {showMap ? 'Hide map' : 'Show map'}
            </button>
            <span className="explore-sort-label">Sort by</span>
            <SingleSelect
              label="Sort garages"
              align="right"
              value={sortBy}
              onChange={(value) => updateParam('sort_by', value)}
              options={[
                { value: 'highest_rated', label: 'Highest rated' },
                { value: 'most_reviewed', label: 'Most reviewed' },
                ...(lat && lng ? [{ value: 'nearest', label: 'Nearest first' }] : []),
              ]}
            />
          </div>
        </div>

        <div className="explore-toolbar">
          <form onSubmit={submitSearch} role="search" className="search-capsule explore-toolbar__search">
            <Search size={18} strokeWidth={1.8} className="search-capsule__icon" aria-hidden="true" />
            <input
              type="text"
              aria-label="Search workshops by name or area"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Search by workshop name or area, e.g. Patan"
            />
            {searchInput && (
              <button type="button" className="search-capsule__clear" aria-label="Clear search text" onClick={clearSearch}>
                <X size={16} strokeWidth={2} />
              </button>
            )}
            <button type="submit" className="search-capsule__submit">
              Search
            </button>
          </form>

          <div className="explore-toolbar__filters">
            <FilterChip
              label="Open now"
              checked={openNow}
              onChange={(checked) => updateParam('open_now', checked ? 'true' : null)}
            />
            {vehicleTypes.length > 0 && (
              <MultiSelect
                variant="compact"
                label="Vehicle types"
                options={vehicleTypes.map((v) => ({ value: v.id, label: v.name }))}
                values={selectedVehicleTypes}
                onToggle={(id) => toggleMultiParam('vehicle_type_ids', id)}
              />
            )}
            {services.length > 0 && (
              <MultiSelect
                variant="compact"
                label="Services"
                options={services.map((s) => ({ value: s.id, label: s.name }))}
                values={selectedServices}
                onToggle={(id) => toggleMultiParam('service_ids', id)}
              />
            )}
          </div>
        </div>

        {(activeFilterCount > 0 || search) && (
          <div className="explore-active">
            {search && (
              <span className="dd-tag">
                &ldquo;{search}&rdquo;
                <button type="button" aria-label="Clear search" onClick={clearSearch}><X size={12} strokeWidth={3} /></button>
              </span>
            )}
            {vehicleTypes.filter((v) => selectedVehicleTypes.includes(v.id)).map((v) => (
              <span key={v.id} className="dd-tag">
                {v.name}
                <button type="button" aria-label={`Remove ${v.name}`} onClick={() => toggleMultiParam('vehicle_type_ids', v.id)}><X size={12} strokeWidth={3} /></button>
              </span>
            ))}
            {services.filter((s) => selectedServices.includes(s.id)).map((s) => (
              <span key={s.id} className="dd-tag">
                {s.name}
                <button type="button" aria-label={`Remove ${s.name}`} onClick={() => toggleMultiParam('service_ids', s.id)}><X size={12} strokeWidth={3} /></button>
              </span>
            ))}
            {activeFilterCount > 0 && (
              <button type="button" className="filter-panel__clear" onClick={clearFilters}>
                Clear all filters
              </button>
            )}
          </div>
        )}

        <div>

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
                    backgroundColor: 'var(--accent)',
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
              <div className="discovery-results-list">
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
{activeView === 'table' ? (
                  <div className="dt-scope">
                    <div className="dt-frame">
                      <div className="discovery-table-scroll">
                        <table className="dt discovery-table">
                          <thead>
                            <tr>
                              <th>Garage</th>
                              <th>Status</th>
                              <th>Rating</th>
                              <th>Distance</th>
                              <th>Services</th>
                              <th>Contact</th>
                            </tr>
                          </thead>
                          <tbody>
                            {garages.map((garage) => (
                              <tr key={garage.id} className="discovery-table-row" onClick={() => navigate(`/garages/${garage.id}`)}>
                                <td>
                                  <div className="discovery-table-garage">
                                    <GarageThumb garage={garage} size={44} />
                                    <div>
                                      <span className="dt-primary">{garage.name}</span>
                                      <span className="dt-sub">{garage.address || 'Address registered on file'}</span>
                                    </div>
                                  </div>
                                </td>
                                <td><AvailabilityBadge availability={garage.availability} /></td>
                                <td>
                                  {garage.average_rating !== null && garage.average_rating !== undefined ? (
                                    <span className="discovery-rating-summary"><StarRating rating={garage.average_rating} size="small" /><span>({garage.review_count})</span></span>
                                  ) : (
                                    <span className="dt-muted">No reviews</span>
                                  )}
                                </td>
                                <td className="tabular-nums dt-muted">
                                  {garage.distance_km !== undefined && garage.distance_km !== null ? `${garage.distance_km.toFixed(1)} km` : '—'}
                                </td>
                                <td className="dt-muted">
                                  {garage.services && garage.services.length > 0
                                    ? `${garage.services.slice(0, 2).map((service) => service.name).join(', ')}${garage.services.length > 2 ? ` +${garage.services.length - 2}` : ''}`
                                    : '—'}
                                </td>
                                <td>
                                  <div className="discovery-table-contact">
                                    {renderCall(garage, 'Call')}
                                    <span className="dt-sub tabular-nums">{garage.phone}</span>
                                  </div>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                ) : (
                  garages.map((garage) => (
                    <div
                      key={garage.id}
                      onClick={() => navigate(`/garages/${garage.id}`)}
                      className="discovery-garage-card"
                    >
                      <GarageThumb garage={garage} size={96} />
                      <div className="discovery-garage-main">
                        <h2>{garage.name}</h2>
                        <div className="discovery-garage-availability"><AvailabilityBadge availability={garage.availability} showDetails /></div>

                        <p className="discovery-garage-address">
                          {garage.address || 'Address registered on file'}
                          {garage.distance_km !== undefined && garage.distance_km !== null && (
                            <span className="tabular-nums discovery-garage-distance">
                              • {garage.distance_km.toFixed(1)} km away
                            </span>
                          )}
                        </p>

                        <div className="discovery-garage-rating">
                          {garage.average_rating !== null && garage.average_rating !== undefined ? (
                            <span className="discovery-rating-summary"><StarRating rating={garage.average_rating} size="small" /><span>{garage.review_count} {garage.review_count === 1 ? 'review' : 'reviews'}</span></span>
                          ) : (
                            <span style={{ color: 'var(--muted)' }}>No reviews yet</span>
                          )}
                        </div>
                      </div>

                      <div className="discovery-garage-actions">
                        {renderCall(garage)}
                        <span className="tabular-nums discovery-garage-phone">{garage.phone}</span>
                      </div>
                    </div>
                  ))
                )}

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
                              backgroundColor: isActive ? 'var(--accent)' : 'var(--surface)',
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
