import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { PublicLayout } from '../../components/PublicLayout';
import { AvailabilityBadge } from '../../components/AvailabilityBadge';
import { StarRating } from '../../components/StarRating';
import { Clock, MapPin, Navigation, Phone, Share2, Star, Wrench } from 'lucide-react';
import { SingleSelect } from '../../components/Dropdown';
import { useToast } from '../../components/ToastProvider';
import './garage-profile.css';
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
  const { showToast } = useToast();
  const [activePhoto, setActivePhoto] = useState(0);
  const [tab, setTab] = useState<'reviews' | 'location'>('reviews');
  const [reviewSort, setReviewSort] = useState('latest');

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
        <div className="gp-state">Loading garage profile...</div>
      </PublicLayout>
    );
  }

  if (errorMsg || !garage) {
    return (
      <PublicLayout>
        <div className="gp-state gp-state--card">
          <h2>Notice</h2>
          <p>{errorMsg}</p>
          <button className="gp-btn gp-btn--ghost" onClick={() => navigate('/garages')}>
            Back to garages
          </button>
        </div>
      </PublicLayout>
    );
  }

  const photos = garage.photos ?? [];
  const heroPhoto = photos[Math.min(activePhoto, Math.max(photos.length - 1, 0))];
  const hasRating = garage.average_rating !== null && garage.average_rating !== undefined;
  const todayNumber = ((new Date().getDay() + 6) % 7) + 1;
  const todaySchedule = garage.operating_hours?.find((h) => h.day_of_week === todayNumber);
  const todayText =
    todaySchedule && !todaySchedule.is_closed && todaySchedule.opening_time && todaySchedule.closing_time
      ? `${todaySchedule.opening_time.slice(0, 5)} – ${todaySchedule.closing_time.slice(0, 5)}`
      : 'Closed today';

  const distribution = reviewsData?.rating_distribution ?? {};
  const totalReviews = reviewsData?.total_reviews ?? garage.review_count ?? 0;
  const sortedReviews = [...(reviewsData?.items ?? [])].sort((a, b) => {
    if (reviewSort === 'highest') return b.rating - a.rating;
    if (reviewSort === 'lowest') return a.rating - b.rating;
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });

  const handleShare = async () => {
    try {
      if (navigator.share) {
        await navigator.share({ title: garage.name, url: window.location.href });
      } else {
        await navigator.clipboard.writeText(window.location.href);
        showToast('Link copied to clipboard.', 'info');
      }
    } catch {
      /* share dismissed */
    }
  };

  const hasMap = isValidCoordinate(garage.latitude, garage.longitude);
  const directionsUrl = `https://www.google.com/maps/dir/?api=1&destination=${garage.latitude},${garage.longitude}`;

  return (
    <PublicLayout>
      <div className="gp-page">
        <button type="button" className="gp-back" onClick={() => navigate(-1)}>
          &larr; Back to results
        </button>

        <div className="gp-top">
          <div className="gp-gallery">
            {photos.length > 1 && (
              <div className="gp-thumbs" role="tablist" aria-label="Workshop photos">
                {photos.slice(0, 6).map((photo, index) => (
                  <button
                    key={photo.id}
                    type="button"
                    role="tab"
                    aria-selected={index === activePhoto}
                    className={`gp-thumb${index === activePhoto ? ' is-active' : ''}`}
                    onClick={() => setActivePhoto(index)}
                  >
                    <img src={photo.url} alt={photo.caption || `${garage.name} photo ${index + 1}`} />
                  </button>
                ))}
              </div>
            )}
            <div className="gp-hero">
              {heroPhoto ? (
                <img src={heroPhoto.url} alt={heroPhoto.caption || garage.name} />
              ) : (
                <span className="gp-hero__empty">
                  <Wrench size={44} strokeWidth={1.2} />
                  <span>No photos yet</span>
                </span>
              )}
            </div>
          </div>

          <aside className="gp-summary">
            <h1 className="gp-title">{garage.name}</h1>

            <div className="gp-chips">
              <AvailabilityBadge availability={garage.availability} showDetails />
              {(garage.vehicle_types ?? []).slice(0, 2).map((v) => (
                <span key={v.id} className="gp-chip">{v.name}</span>
              ))}
            </div>

            <div className="gp-rating-line">
              {hasRating ? (
                <>
                  <span className="gp-rating-num">{garage.average_rating!.toFixed(1)}</span>
                  <span className="gp-rating-max">/ 5.0</span>
                  <StarRating rating={garage.average_rating!} />
                  <span className="gp-muted">{garage.review_count} {garage.review_count === 1 ? 'review' : 'reviews'}</span>
                </>
              ) : (
                <span className="gp-muted">No customer reviews yet</span>
              )}
            </div>

            <p className="gp-address">
              <MapPin size={16} strokeWidth={1.7} />
              {garage.address || 'Address registered on file'}
            </p>

            <section className="gp-block">
              <h2>About the workshop</h2>
              <p className="gp-about">{garage.description || 'No additional shop description provided.'}</p>
            </section>

            <section className="gp-block">
              <h2>Opening hours</h2>
              <details className="gp-hours">
                <summary>
                  <Clock size={16} strokeWidth={1.7} />
                  <span>
                    <strong>Today</strong> <span className="tabular-nums">{todayText}</span>
                  </span>
                  <span className="gp-hours__more">Full week</span>
                </summary>
                <p className="gp-muted gp-hours__tz">Times shown in garage timezone ({garage.timezone})</p>
                <ul>
                  {DAYS_OF_WEEK.map((dayName, idx) => {
                    const dayNum = idx + 1;
                    const schedule = garage.operating_hours?.find((h) => h.day_of_week === dayNum);
                    const isOpen = !!(schedule && !schedule.is_closed && schedule.opening_time && schedule.closing_time);
                    return (
                      <li key={dayNum} className={dayNum === todayNumber ? 'is-today' : undefined}>
                        <span>{dayName}</span>
                        <span className={`tabular-nums${isOpen ? '' : ' gp-muted'}`}>
                          {isOpen ? `${schedule!.opening_time!.slice(0, 5)} - ${schedule!.closing_time!.slice(0, 5)}` : 'Closed'}
                        </span>
                      </li>
                    );
                  })}
                </ul>
              </details>
            </section>

            <section className="gp-block gp-offers">
              <div>
                <h2>Services</h2>
                <div className="gp-tags">
                  {garage.services && garage.services.length > 0 ? (
                    garage.services.map((s) => <span key={s.id} className="gp-chip">{s.name}</span>)
                  ) : (
                    <span className="gp-muted">None specified</span>
                  )}
                </div>
              </div>
              <div>
                <h2>Vehicles</h2>
                <div className="gp-tags">
                  {garage.vehicle_types && garage.vehicle_types.length > 0 ? (
                    garage.vehicle_types.map((v) => <span key={v.id} className="gp-chip">{v.name}</span>)
                  ) : (
                    <span className="gp-muted">None specified</span>
                  )}
                </div>
              </div>
            </section>

            <div className="gp-actions">
              <a
                href={`tel:${garage.phone}`}
                className="gp-btn gp-btn--primary"
                onClick={() => {
                  apiClient(`/garages/${garage.id}/analytics/call-click`, { method: 'POST' }).catch(() => {});
                }}
              >
                <Phone size={17} strokeWidth={1.8} /> Call {garage.phone}
              </a>
              {hasMap && (
                <a href={directionsUrl} target="_blank" rel="noopener noreferrer" className="gp-btn gp-btn--ghost">
                  <Navigation size={17} strokeWidth={1.8} /> Get directions
                </a>
              )}
              <div className="gp-secondary-actions">
                <span className="gp-muted">Direct call &bull; Verified garage phone</span>
                <button type="button" onClick={handleShare}>
                  <Share2 size={15} strokeWidth={1.8} /> Share
                </button>
              </div>
            </div>
          </aside>
        </div>

        <section className="gp-tabs-section">
          <div className="gp-tabs" role="tablist">
            <button type="button" role="tab" aria-selected={tab === 'reviews'} className={tab === 'reviews' ? 'is-active' : ''} onClick={() => setTab('reviews')}>
              Reviews <span className="gp-tab-count">{totalReviews}</span>
            </button>
            {hasMap && (
              <button type="button" role="tab" aria-selected={tab === 'location'} className={tab === 'location' ? 'is-active' : ''} onClick={() => setTab('location')}>
                Location
              </button>
            )}
          </div>

          {tab === 'reviews' && (
            <div className="gp-reviews">
              <div className="gp-reviews__summary">
                <div className="gp-reviews__score">
                  <Star size={28} fill="currentColor" strokeWidth={0} />
                  <span className="gp-rating-num">{hasRating ? garage.average_rating!.toFixed(1) : '—'}</span>
                  <span className="gp-rating-max">/ 5.0</span>
                </div>
                <p className="gp-muted">{totalReviews} {totalReviews === 1 ? 'review' : 'reviews'}</p>
                <ul className="gp-dist">
                  {[5, 4, 3, 2, 1].map((star) => {
                    const count = Number(distribution[String(star)] ?? 0);
                    const pct = totalReviews > 0 ? (count / totalReviews) * 100 : 0;
                    return (
                      <li key={star}>
                        <span className="tabular-nums">{star}</span>
                        <Star size={13} fill="currentColor" strokeWidth={0} />
                        <span className="gp-dist__bar"><span style={{ width: `${pct}%` }} /></span>
                        <span className="gp-muted tabular-nums">{count}</span>
                      </li>
                    );
                  })}
                </ul>
              </div>

              <div className="gp-reviews__main">
                {user && user.role === 'CUSTOMER' && (
                  <form onSubmit={handleReviewSubmit} className="gp-review-form">
                    <h3>Write a review</h3>
                    <div>
                      <label>Rating (1 to 5 stars)</label>
                      <div className="star-rating-picker" role="radiogroup" aria-label="Choose a rating from 1 to 5 stars">
                        {[1, 2, 3, 4, 5].map((value) => (
                          <button key={value} type="button" role="radio" aria-checked={rating === value} aria-label={`${value} ${value === 1 ? 'star' : 'stars'}`} onClick={() => setRating(value)}>
                            <Star size={21} fill={rating >= value ? 'currentColor' : 'none'} strokeWidth={1.8} />
                          </button>
                        ))}
                        <span className="star-rating-picker-label">{['', 'Poor', 'Fair', 'Good', 'Very good', 'Excellent'][rating]}</span>
                      </div>
                    </div>
                    <div>
                      <label htmlFor="review-comment">Comment (optional, max 2000 characters)</label>
                      <textarea
                        id="review-comment"
                        value={comment}
                        onChange={(e) => setComment(e.target.value)}
                        rows={3}
                        maxLength={2000}
                        placeholder="Share details of your vehicle service experience..."
                      />
                    </div>
                    {reviewError && <p className="gp-error">{reviewError}</p>}
                    <button type="submit" className="gp-btn gp-btn--primary gp-btn--inline" disabled={submittingReview}>
                      {submittingReview ? 'Submitting...' : 'Post review'}
                    </button>
                  </form>
                )}

                <div className="gp-reviews__bar">
                  <span className="gp-muted">Sort by</span>
                  <SingleSelect
                    label="Sort reviews"
                    align="right"
                    value={reviewSort}
                    onChange={setReviewSort}
                    options={[
                      { value: 'latest', label: 'Latest' },
                      { value: 'highest', label: 'Highest rated' },
                      { value: 'lowest', label: 'Lowest rated' },
                    ]}
                  />
                </div>

                {sortedReviews.length > 0 ? (
                  <ul className="gp-review-list">
                    {sortedReviews.map((rev) => {
                      const name = rev.customer?.display_name || 'Customer';
                      return (
                        <li key={rev.id} className="gp-review">
                          <span className="gp-review__avatar" aria-hidden="true">{name.charAt(0).toUpperCase()}</span>
                          <div>
                            <div className="gp-review__head">
                              <strong>{name}</strong>
                              <span className="gp-muted tabular-nums">{new Date(rev.created_at).toLocaleDateString()}</span>
                            </div>
                            <StarRating rating={rev.rating} size="small" />
                            {rev.comment && <p>{rev.comment}</p>}
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                ) : (
                  <p className="gp-muted">There are no reviews for this workshop yet.</p>
                )}
              </div>
            </div>
          )}

          {tab === 'location' && hasMap && (
            <div className="gp-location">
              <GarageMap
                garages={[garage]}
                origin={origin}
                autoRouteToId={garage.id}
                height={380}
                linkToProfile={false}
                ariaLabel={`Map showing ${garage.name}`}
              />
              {!origin && (
                <div className="gp-location__bar">
                  <button type="button" className="gp-btn gp-btn--primary gp-btn--inline" onClick={handleLocateMe} disabled={locating}>
                    {locating ? 'Finding your location…' : 'Show route from my location'}
                  </button>
                  {locationError && <span className="gp-error">{locationError}</span>}
                </div>
              )}
            </div>
          )}
        </section>
      </div>
    </PublicLayout>
  );
};
