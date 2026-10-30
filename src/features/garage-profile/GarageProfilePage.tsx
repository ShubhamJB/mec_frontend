import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { PublicLayout } from '../../components/PublicLayout';
import { AvailabilityBadge } from '../../components/AvailabilityBadge';
import { GarageMap } from '../../components/map/GarageMap';
import { isValidCoordinate } from '../../components/map/mapConfig';
import { getStoredOrigin, requestBrowserOrigin } from '../../lib/userLocation';
import { apiClient } from '../../api/client';
import { useAuth } from '../../auth/AuthContext';
import { GarageDetail, ReviewsResponse } from '../../api/types';

const DAYS_OF_WEEK = [
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
  'Sunday',
];

export const GarageProfilePage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [garage, setGarage] = useState<GarageDetail | null>(null);
  const [reviewsData, setReviewsData] = useState<ReviewsResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // New review form state
  const [origin, setOrigin] = useState(getStoredOrigin());
  const [locating, setLocating] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);

  const handleLocateMe = async () => {
    setLocating(true);
    setLocationError(null);
    try {
      setOrigin(await requestBrowserOrigin());
    } catch (err: unknown) {
      setLocationError(err instanceof Error ? err.message : 'Could not get your location.');
    } finally {
      setLocating(false);
    }
  };

  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [submittingReview, setSubmittingReview] = useState(false);
  const [reviewError, setReviewError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;

    // Fire profile-view once per mount, fire-and-forget (do not block)
    apiClient(`/garages/${id}/analytics/profile-view`, { method: 'POST' }).catch(() => {});

    Promise.all([
      apiClient<GarageDetail>(`/garages/${id}`),
      apiClient<ReviewsResponse>(`/garages/${id}/reviews`).catch(() => null),
    ])
      .then(([gData, rData]) => {
        setGarage(gData);
        setReviewsData(rData);
      })
      .catch((err) => {
        setErrorMsg(err.message || 'Garage could not be found or is not publicly available.');
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, [id]);

  const handleReviewSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id) return;
    setSubmittingReview(true);
    setReviewError(null);

    try {
      await apiClient(`/garages/${id}/reviews`, {
        method: 'POST',
        body: JSON.stringify({
          rating: Number(rating),
          comment: comment.trim() || null,
        }),
      });

      // Reload reviews
      const updatedReviews = await apiClient<ReviewsResponse>(`/garages/${id}/reviews`);
      setReviewsData(updatedReviews);
      setComment('');
    } catch (err: unknown) {
      if (err instanceof Error) {
        setReviewError(err.message);
      } else {
        setReviewError('Failed to publish review');
      }
    } finally {
      setSubmittingReview(false);
    }
  };

  if (isLoading) {
    return (
      <PublicLayout>
        <div style={{ padding: '64px', textAlign: 'center', color: 'var(--muted)' }}>
          Loading garage profile...
        </div>
      </PublicLayout>
    );
  }

  if (errorMsg || !garage) {
    return (
      <PublicLayout>
        <div style={{ maxWidth: '600px', margin: '64px auto', padding: '32px', backgroundColor: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)' }}>
          <h2 style={{ marginBottom: '12px' }}>Notice</h2>
          <p style={{ color: 'var(--muted)', marginBottom: '24px' }}>{errorMsg}</p>
          <button onClick={() => navigate('/garages')} style={{ textDecoration: 'underline' }}>
            Back to discovery
          </button>
        </div>
      </PublicLayout>
    );
  }

  return (
    <PublicLayout>
      <div style={{ maxWidth: '1080px', margin: '0 auto', padding: '40px 24px 80px' }}>
        {/* Top Info Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '24px', marginBottom: '32px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
              <h1 style={{ fontSize: '32px', fontWeight: 600 }}>{garage.name}</h1>
              <AvailabilityBadge availability={garage.availability} showDetails={true} />
            </div>
            <p style={{ color: 'var(--muted)', fontSize: 'var(--step-caption)', marginBottom: '8px' }}>
              {garage.address || 'Address registered on file'}
            </p>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', fontSize: 'var(--step-caption)' }}>
              {garage.average_rating ? (
                <span>
                  <strong>{garage.average_rating.toFixed(1)}</strong> ★ ({garage.review_count} {garage.review_count === 1 ? 'review' : 'reviews'})
                </span>
              ) : (
                <span style={{ color: 'var(--muted)' }}>No customer reviews yet</span>
              )}
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '8px' }}>
            <a
              href={`tel:${garage.phone}`}
              onClick={() => {
                apiClient(`/garages/${garage.id}/analytics/call-click`, { method: 'POST' }).catch(() => {});
              }}
              style={{
                backgroundColor: 'var(--ink)',
                color: '#fff',
                padding: '12px 28px',
                borderRadius: 'var(--radius-sm)',
                fontWeight: 600,
                fontSize: '15px',
              }}
            >
              Call {garage.phone}
            </a>
            <span style={{ fontSize: '11px', color: 'var(--muted)' }}>
              Direct call • Verified garage phone
            </span>
          </div>
        </div>

        {/* Gallery / Cover */}
        {garage.photos && garage.photos.length > 0 && (
          <div style={{ display: 'flex', gap: '12px', overflowX: 'auto', marginBottom: '40px', paddingBottom: '8px' }}>
            {garage.photos.map((photo) => (
              <img
                key={photo.id}
                src={photo.url}
                alt={photo.caption || garage.name}
                style={{
                  height: '240px',
                  width: '320px',
                  objectFit: 'cover',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border)',
                }}
              />
            ))}
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: '48px', alignItems: 'flex-start' }}>
          {/* Main Content Column */}
          <div>
            {/* Description */}
            <section style={{ marginBottom: '40px' }}>
              <h2 style={{ fontSize: '20px', marginBottom: '12px' }}>About this Workshop</h2>
              <p style={{ whiteSpace: 'pre-wrap', color: 'var(--ink-secondary)', lineHeight: 1.6 }}>
                {garage.description || 'No additional shop description provided.'}
              </p>
            </section>

            {/* Catalogs: Services & Vehicles */}
            <section style={{ marginBottom: '48px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
              <div>
                <h3 style={{ fontSize: '16px', marginBottom: '12px' }}>Supported Services</h3>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                  {garage.services && garage.services.length > 0 ? (
                    garage.services.map((s) => (
                      <span
                        key={s.id}
                        style={{
                          padding: '4px 10px',
                          backgroundColor: 'var(--surface-raised)',
                          border: '1px solid var(--border)',
                          borderRadius: 'var(--radius-sm)',
                          fontSize: 'var(--step-small)',
                        }}
                      >
                        {s.name}
                      </span>
                    ))
                  ) : (
                    <span style={{ color: 'var(--muted)', fontSize: 'var(--step-small)' }}>None specified</span>
                  )}
                </div>
              </div>

              <div>
                <h3 style={{ fontSize: '16px', marginBottom: '12px' }}>Vehicle Types Serviced</h3>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                  {garage.vehicle_types && garage.vehicle_types.length > 0 ? (
                    garage.vehicle_types.map((v) => (
                      <span
                        key={v.id}
                        style={{
                          padding: '4px 10px',
                          backgroundColor: 'var(--surface-raised)',
                          border: '1px solid var(--border)',
                          borderRadius: 'var(--radius-sm)',
                          fontSize: 'var(--step-small)',
                        }}
                      >
                        {v.name}
                      </span>
                    ))
                  ) : (
                    <span style={{ color: 'var(--muted)', fontSize: 'var(--step-small)' }}>None specified</span>
                  )}
                </div>
              </div>
            </section>

            {isValidCoordinate(garage.latitude, garage.longitude) && (
              <section style={{ marginBottom: '48px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '12px' }}>
                  <h2 style={{ fontSize: '20px' }}>Location</h2>
                  <a
                    href={`https://www.google.com/maps/dir/?api=1&destination=${garage.latitude},${garage.longitude}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ fontSize: 'var(--step-small)', color: 'var(--accent)', textDecoration: 'underline' }}
                  >
                    Get directions
                  </a>
                </div>
                <GarageMap
                  garages={[garage]}
                  origin={origin}
                  autoRouteToId={garage.id}
                  height={320}
                  linkToProfile={false}
                  ariaLabel={`Map showing ${garage.name}`}
                />
                {!origin && (
                  <div style={{ marginTop: '10px', display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                    <button
                      type="button"
                      onClick={handleLocateMe}
                      disabled={locating}
                      style={{
                        padding: '8px 14px',
                        fontSize: 'var(--step-small)',
                        fontWeight: 500,
                        color: 'var(--accent-ink)',
                        backgroundColor: 'var(--ink)',
                        borderRadius: 'var(--radius-sm)',
                        cursor: locating ? 'wait' : 'pointer',
                      }}
                    >
                      {locating ? 'Finding your location…' : 'Show route from my location'}
                    </button>
                    {locationError && (
                      <span style={{ fontSize: 'var(--step-small)', color: 'var(--status-danger-ink)' }}>
                        {locationError}
                      </span>
                    )}
                  </div>
                )}
              </section>
            )}

            {/* Customer Reviews Section */}
            <section style={{ borderTop: '1px solid var(--rule)', paddingTop: '32px' }}>
              <h2 style={{ fontSize: '20px', marginBottom: '20px' }}>Customer Reviews</h2>

              {/* Review Submission for Logged-In Customers */}
              {user && user.role === 'CUSTOMER' && (
                <form
                  onSubmit={handleReviewSubmit}
                  style={{
                    backgroundColor: 'var(--surface)',
                    border: '1px solid var(--border)',
                    borderRadius: 'var(--radius-md)',
                    padding: '20px',
                    marginBottom: '32px',
                  }}
                >
                  <h3 style={{ fontSize: '16px', marginBottom: '12px' }}>Write a Review</h3>

                  <div style={{ marginBottom: '16px' }}>
                    <label style={{ display: 'block', fontSize: 'var(--step-small)', marginBottom: '4px' }}>
                      Rating (1 to 5 stars)
                    </label>
                    <select
                      value={rating}
                      onChange={(e) => setRating(parseInt(e.target.value, 10))}
                      style={{
                        padding: '6px 12px',
                        border: '1px solid var(--border)',
                        borderRadius: 'var(--radius-sm)',
                        backgroundColor: 'var(--surface-raised)',
                      }}
                    >
                      <option value={5}>5 - Excellent</option>
                      <option value={4}>4 - Good</option>
                      <option value={3}>3 - Average</option>
                      <option value={2}>2 - Poor</option>
                      <option value={1}>1 - Terrible</option>
                    </select>
                  </div>

                  <div style={{ marginBottom: '16px' }}>
                    <label style={{ display: 'block', fontSize: 'var(--step-small)', marginBottom: '4px' }}>
                      Comment (optional, max 2000 characters)
                    </label>
                    <textarea
                      value={comment}
                      onChange={(e) => setComment(e.target.value)}
                      rows={3}
                      maxLength={2000}
                      placeholder="Share details of your vehicle service experience..."
                      style={{
                        width: '100%',
                        padding: '8px 12px',
                        border: '1px solid var(--border)',
                        borderRadius: 'var(--radius-sm)',
                        backgroundColor: 'var(--surface-raised)',
                      }}
                    />
                  </div>

                  {reviewError && (
                    <p style={{ color: 'var(--status-danger-ink)', fontSize: 'var(--step-small)', marginBottom: '12px' }}>
                      {reviewError}
                    </p>
                  )}

                  <button
                    type="submit"
                    disabled={submittingReview}
                    style={{
                      padding: '8px 16px',
                      backgroundColor: 'var(--ink)',
                      color: '#fff',
                      borderRadius: 'var(--radius-sm)',
                      fontWeight: 500,
                    }}
                  >
                    {submittingReview ? 'Submitting...' : 'Post Review'}
                  </button>
                </form>
              )}

              {/* Review list */}
              {reviewsData && reviewsData.items && reviewsData.items.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  {reviewsData.items.map((rev) => (
                    <div
                      key={rev.id}
                      style={{
                        borderBottom: '1px solid var(--rule)',
                        paddingBottom: '16px',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                        <span style={{ fontWeight: 600, fontSize: 'var(--step-caption)' }}>
                          {rev.customer?.display_name || 'Customer'}
                        </span>
                        <span style={{ color: 'var(--accent)', fontWeight: 600 }}>
                          {'★'.repeat(rev.rating)}
                        </span>
                      </div>
                      {rev.comment && (
                        <p style={{ color: 'var(--ink-secondary)', fontSize: 'var(--step-caption)', marginBottom: '6px' }}>
                          {rev.comment}
                        </p>
                      )}
                      <span className="tabular-nums" style={{ fontSize: '11px', color: 'var(--muted)' }}>
                        {new Date(rev.created_at).toLocaleDateString()}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p style={{ color: 'var(--muted)', fontSize: 'var(--step-caption)' }}>
                  There are no reviews for this workshop yet.
                </p>
              )}
            </section>
          </div>

          {/* Right Rail: 7-Day Operating Hours */}
          <aside
            style={{
              backgroundColor: 'var(--surface)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-md)',
              padding: '24px',
            }}
          >
            <h3 style={{ fontSize: '16px', marginBottom: '8px' }}>Operating Hours</h3>
            <p style={{ fontSize: '11px', color: 'var(--muted)', marginBottom: '16px' }}>
              Times shown in garage timezone ({garage.timezone})
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {DAYS_OF_WEEK.map((dayName, idx) => {
                const dayNum = idx + 1;
                const schedule = garage.operating_hours?.find((h) => h.day_of_week === dayNum);
                return (
                  <div
                    key={dayNum}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      fontSize: 'var(--step-small)',
                      borderBottom: '1px solid var(--rule)',
                      paddingBottom: '4px',
                    }}
                  >
                    <span>{dayName}</span>
                    <span className="tabular-nums" style={{ color: schedule?.is_closed ? 'var(--muted)' : 'var(--ink)' }}>
                      {schedule && !schedule.is_closed && schedule.opening_time && schedule.closing_time
                        ? `${schedule.opening_time} - ${schedule.closing_time}`
                        : 'Closed'}
                    </span>
                  </div>
                );
              })}
            </div>
          </aside>
        </div>
      </div>
    </PublicLayout>
  );
};
