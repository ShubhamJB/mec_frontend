import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { AppShell } from '../../components/AppShell';
import { StarRating } from '../../components/StarRating';
import { ownerNavItems } from './ownerNav';
import { apiClient } from '../../api/client';
import { OwnerDashboardSummary } from '../../api/types';

export const OwnerDashboardPage: React.FC = () => {
  const [data, setData] = useState<OwnerDashboardSummary | null>(null);
  const [regStatus, setRegStatus] = useState<{
    approval_status: 'PENDING' | 'APPROVED' | 'REJECTED';
    registration_version: number;
    submitted_at: string;
    latest_decision?: { rejection_reason?: string | null } | null;
  } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [toggling, setToggling] = useState(false);
  const [unavailMessage, setUnavailMessage] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const fetchDashboard = async () => {
    try {
      const res = await apiClient<OwnerDashboardSummary>('/owner/dashboard');
      setData(res);
      if (res?.availability?.message) {
        setUnavailMessage(res.availability.message);
      }
    } catch (err: unknown) {
      if (err instanceof Error) {
        setErrorMsg(err.message);
      }
      try {
        const reg = await apiClient<any>('/owner/garage-registration');
        setRegStatus(reg);
      } catch {
        setRegStatus(null);
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboard();
  }, []);

  const handleToggleAvailability = async (newUnavailable: boolean) => {
    setToggling(true);
    try {
      await apiClient('/owner/garage/availability', {
        method: 'PATCH',
        body: JSON.stringify({
          is_temporarily_unavailable: newUnavailable,
          message: newUnavailable ? unavailMessage.trim() || null : null,
        }),
      });
      if (!newUnavailable) setUnavailMessage('');
      await fetchDashboard();
    } catch (err: unknown) {
      if (err instanceof Error) {
        alert(err.message);
      }
    } finally {
      setToggling(false);
    }
  };

  if (isLoading) {
    return (
      <AppShell title="Workshop Dashboard" navItems={ownerNavItems}>
        <div style={{ minHeight: '60vh' }} />
      </AppShell>
    );
  }

  if (errorMsg || !data) {
    return (
      <AppShell title="Workshop Dashboard" navItems={ownerNavItems}>
        <div
          style={{
            minHeight: '68vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '32px 16px',
          }}
        >
          {regStatus?.approval_status === 'PENDING' ? (
            <div
              style={{
                maxWidth: '560px',
                width: '100%',
                backgroundColor: 'var(--card)',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius-sheet)',
                padding: '40px 36px',
                textAlign: 'center',
                boxShadow: '0 8px 30px var(--shadow-color)',
              }}
            >
              <div
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '4px 12px',
                  borderRadius: '16px',
                  backgroundColor: 'var(--status-unavail-bg)',
                  color: 'var(--status-unavail-ink)',
                  fontSize: '11px',
                  fontWeight: 600,
                  letterSpacing: '0.04em',
                  textTransform: 'uppercase',
                  marginBottom: '16px',
                }}
              >
                <span
                  style={{
                    width: '6px',
                    height: '6px',
                    borderRadius: '50%',
                    backgroundColor: 'var(--status-unavail-ink)',
                  }}
                />
                Moderation Queue
              </div>

              <h2
                style={{
                  fontFamily: 'var(--font-serif)',
                  fontSize: '30px',
                  fontWeight: 400,
                  letterSpacing: '-0.02em',
                  color: 'var(--ink)',
                  marginBottom: '10px',
                }}
              >
                Registration Under Review
              </h2>
              <p
                style={{
                  color: 'var(--muted)',
                  fontSize: 'var(--step-caption)',
                  lineHeight: 1.55,
                  marginBottom: '28px',
                }}
              >
                Your workshop registration has been received and is awaiting decision by platform administrators. Once approved, your workshop metrics, public listing, and call clicks will appear here.
              </p>

              <div style={{ display: 'flex', justifyContent: 'center' }}>
                <Link
                  to="/owner/registration"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    padding: '12px 28px',
                    backgroundColor: 'var(--accent)',
                    color: 'var(--on-dark)',
                    borderRadius: 'var(--radius-sm)',
                    fontWeight: 600,
                    fontSize: 'var(--step-small)',
                    boxShadow: '0 4px 14px var(--shadow-color)',
                  }}
                >
                  View / Edit Pending Submission &rarr;
                </Link>
              </div>
            </div>
          ) : regStatus?.approval_status === 'REJECTED' ? (
            <div
              style={{
                maxWidth: '560px',
                width: '100%',
                backgroundColor: 'var(--card)',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius-sheet)',
                padding: '40px 36px',
                textAlign: 'center',
                boxShadow: '0 8px 30px var(--shadow-color)',
              }}
            >
              <div
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '4px 12px',
                  borderRadius: '16px',
                  backgroundColor: 'var(--status-danger-bg)',
                  color: 'var(--status-danger-ink)',
                  fontSize: '11px',
                  fontWeight: 600,
                  letterSpacing: '0.04em',
                  textTransform: 'uppercase',
                  marginBottom: '16px',
                }}
              >
                Action Required
              </div>

              <h2
                style={{
                  fontFamily: 'var(--font-serif)',
                  fontSize: '30px',
                  fontWeight: 400,
                  letterSpacing: '-0.02em',
                  color: 'var(--ink)',
                  marginBottom: '10px',
                }}
              >
                Registration Needs Revisions
              </h2>
              <p
                style={{
                  color: 'var(--status-danger-ink)',
                  fontSize: 'var(--step-caption)',
                  lineHeight: 1.5,
                  marginBottom: '24px',
                  backgroundColor: 'var(--status-danger-bg)',
                  padding: '12px',
                  borderRadius: 'var(--radius-sm)',
                }}
              >
                <strong>Reason:</strong> {regStatus.latest_decision?.rejection_reason || 'Information could not be verified.'}
              </p>

              <div style={{ display: 'flex', justifyContent: 'center' }}>
                <Link
                  to="/owner/registration"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    padding: '12px 28px',
                    backgroundColor: 'var(--accent)',
                    color: 'var(--on-dark)',
                    borderRadius: 'var(--radius-sm)',
                    fontWeight: 600,
                    fontSize: 'var(--step-small)',
                    boxShadow: '0 4px 14px var(--shadow-color)',
                  }}
                >
                  Review &amp; Resubmit Registration &rarr;
                </Link>
              </div>
            </div>
          ) : (
            <div
              style={{
                maxWidth: '620px',
                width: '100%',
                backgroundColor: 'var(--card)',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius-sheet)',
                padding: '48px 40px',
                textAlign: 'center',
                boxShadow: '0 8px 30px var(--shadow-color)',
              }}
            >
              <div
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '4px 12px',
                  borderRadius: '16px',
                  backgroundColor: 'var(--accent-light)',
                  color: 'var(--accent)',
                  fontSize: '11px',
                  fontWeight: 600,
                  letterSpacing: '0.05em',
                  textTransform: 'uppercase',
                  marginBottom: '18px',
                }}
              >
                <span
                  style={{
                    width: '6px',
                    height: '6px',
                    borderRadius: '50%',
                    backgroundColor: 'var(--accent)',
                  }}
                />
                Workshop Onboarding
              </div>

              <h2
                style={{
                  fontFamily: 'var(--font-serif)',
                  fontSize: '30px',
                  fontWeight: 400,
                  letterSpacing: '-0.02em',
                  color: 'var(--ink)',
                  marginBottom: '12px',
                }}
              >
                Register Your Workshop
              </h2>

              <p
                style={{
                  color: 'var(--muted)',
                  fontSize: 'var(--step-caption)',
                  lineHeight: 1.6,
                  maxWidth: '480px',
                  margin: '0 auto 32px auto',
                }}
              >
                Join the Find Your Mechanic platform to become discoverable to nearby drivers. Set up your commercial location, repair capabilities, and operating hours to start receiving direct customer calls.
              </p>

              {/* 3 Step highlights */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(3, 1fr)',
                  gap: '12px',
                  marginBottom: '36px',
                  textAlign: 'left',
                }}
              >
                <div
                  style={{
                    padding: '14px',
                    backgroundColor: 'var(--surface-raised)',
                    border: '1px solid var(--rule)',
                    borderRadius: 'var(--radius-sm)',
                  }}
                >
                  <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--accent)', marginBottom: '4px' }}>
                    01 &bull; Identity &amp; GPS
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--ink-secondary)', lineHeight: 1.4 }}>
                    Address, contact phone &amp; coordinates for driver maps.
                  </div>
                </div>

                <div
                  style={{
                    padding: '14px',
                    backgroundColor: 'var(--surface-raised)',
                    border: '1px solid var(--rule)',
                    borderRadius: 'var(--radius-sm)',
                  }}
                >
                  <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--accent)', marginBottom: '4px' }}>
                    02 &bull; Capabilities
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--ink-secondary)', lineHeight: 1.4 }}>
                    Select services, diagnostics &amp; vehicle types supported.
                  </div>
                </div>

                <div
                  style={{
                    padding: '14px',
                    backgroundColor: 'var(--surface-raised)',
                    border: '1px solid var(--rule)',
                    borderRadius: 'var(--radius-sm)',
                  }}
                >
                  <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--accent)', marginBottom: '4px' }}>
                    03 &bull; Hours &amp; Review
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--ink-secondary)', lineHeight: 1.4 }}>
                    7-day operating hours and prompt admin verification.
                  </div>
                </div>
              </div>

              {/* Centered Action Button */}
              <div>
                <Link
                  to="/owner/registration"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    padding: '14px 36px',
                    backgroundColor: 'var(--accent)',
                    color: 'var(--on-dark)',
                    borderRadius: 'var(--radius-sm)',
                    fontWeight: 600,
                    fontSize: 'var(--step-body)',
                    boxShadow: '0 4px 16px var(--shadow-color)',
                    transition: 'transform 0.1s ease',
                  }}
                >
                  Start Garage Registration &rarr;
                </Link>
              </div>
            </div>
          )}
        </div>
      </AppShell>
    );
  }

  const isTempUnavailable = data.availability.is_temporarily_unavailable;

  const statusHeadline = isTempUnavailable
    ? "You're closed for now"
    : data.availability.status === 'OPEN'
      ? "You're open now"
      : "You're closed right now";

  const statusText = isTempUnavailable
    ? 'Customers see "Temporarily Unavailable" on your listing. Reopen when you are back and your weekly schedule applies again.'
    : data.availability.status === 'OPEN'
      ? 'Your weekly schedule says you are open. Need to close unexpectedly? Customers will see "Temporarily Unavailable" until you reopen.'
      : 'This follows your weekly schedule. You can still close for now if you want to be marked unavailable even during opening hours.';

  const manageCards = [
    {
      to: '/owner/photos',
      tag: 'Photos',
      title: 'Workshop photos',
      text: 'Add up to 10 photos of your bays and storefront. The first one is your cover.',
      action: 'Upload photos',
    },
    {
      to: '/owner/services',
      tag: 'Services',
      title: 'Services & vehicles',
      text: 'Choose the repairs you offer and the vehicles you work on.',
      action: 'Choose services & vehicles',
    },
    {
      to: '/owner/hours',
      tag: 'Schedule',
      title: 'Weekly schedule',
      text: 'Set your opening and closing times for each day of the week.',
      action: 'Edit weekly schedule',
    },
  ];

  return (
    <AppShell
      title={`${data.name}`}
      scopeName={`Status: ${data.approval_status}`}
      navItems={ownerNavItems}
    >
      <section className="c-section">
        <div className="c-grid c-grid--4">
          <div className="c-card">
            <span className="c-label">Profile views</span>
            <span className="c-num tabular-nums">{data.total_profile_views}</span>
            <span className="c-note">Total unique views</span>
          </div>

          <div className="c-card">
            <span className="c-label">Call button taps</span>
            <span className="c-num tabular-nums">{data.total_call_clicks}</span>
            <span className="c-note">Direct customer calls</span>
          </div>

          <div className="c-card">
            <span className="c-label">Average rating</span>
            {data.average_rating !== null && data.average_rating !== undefined ? (
              <StarRating rating={data.average_rating} size="large" />
            ) : (
              <span className="c-num c-num--sm">No rating yet</span>
            )}
            <span className="c-note">
              Based on {data.review_count} {data.review_count === 1 ? 'review' : 'reviews'}
            </span>
          </div>

          <div className="c-card">
            <span className="c-label">Total reviews</span>
            <span className="c-num tabular-nums">{data.review_count}</span>
            <span className="c-note">Verified submissions</span>
          </div>
        </div>
      </section>

      <section className={`c-section c-panel${isTempUnavailable ? ' c-card--tint' : ''}`}>
        <div>
          <h2>{statusHeadline}</h2>
          <p>{statusText}</p>
        </div>
        <div>
          <label className="c-field-label" htmlFor="unavailable-message">
            Message for customers (optional)
          </label>
          <input
            id="unavailable-message"
            className="c-input"
            type="text"
            maxLength={300}
            value={unavailMessage}
            onChange={(e) => setUnavailMessage(e.target.value)}
            placeholder="e.g. Back at 3 PM"
          />
          <div className="c-actions">
            {isTempUnavailable ? (
              <>
                <button className="c-btn" disabled={toggling} onClick={() => handleToggleAvailability(false)}>
                  {toggling ? 'Updating...' : 'Reopen now'}
                </button>
                <button
                  className="c-btn c-btn--ghost"
                  disabled={toggling || unavailMessage.trim() === (data.availability.message ?? '')}
                  onClick={() => handleToggleAvailability(true)}
                >
                  Save message
                </button>
              </>
            ) : (
              <>
                <button className="c-btn" disabled={toggling} onClick={() => handleToggleAvailability(true)}>
                  {toggling ? 'Updating...' : 'Close for now'}
                </button>
                <Link to="/owner/hours" className="c-btn c-btn--ghost">
                  Edit schedule
                </Link>
              </>
            )}
          </div>
        </div>
      </section>

      <section className="c-section">
        <p className="c-eyebrow">Manage your workshop</p>
        <div className="c-grid c-grid--auto">
          {manageCards.map((card) => (
            <Link key={card.to} to={card.to} className="c-card c-card--white">
              <span className="c-tag">{card.tag}</span>
              <h3>{card.title}</h3>
              <p>{card.text}</p>
              <span className="c-link">{card.action} &rarr;</span>
            </Link>
          ))}
        </div>
      </section>
    </AppShell>
  );
};
