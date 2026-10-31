import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { AppShell } from '../../components/AppShell';
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
                  fontSize: '24px',
                  fontWeight: 600,
                  fontFamily: 'var(--font-display)',
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
                    backgroundColor: 'var(--ink)',
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
                  fontSize: '24px',
                  fontWeight: 600,
                  fontFamily: 'var(--font-display)',
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
                    backgroundColor: 'var(--ink)',
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
                  fontSize: '26px',
                  fontWeight: 600,
                  fontFamily: 'var(--font-display)',
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
                    backgroundColor: 'var(--ink)',
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

  return (
    <AppShell
      title={`${data.name}`}
      scopeName={`Status: ${data.approval_status}`}
      navItems={ownerNavItems}
    >
      {/* Framed sheet KPI Strip (App Screens taste rule: 1px dividers, plain figures, no sparkline tiles) */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius-sm)',
          backgroundColor: 'var(--card)',
          marginBottom: '32px',
        }}
      >
        <div style={{ padding: '16px 20px', borderRight: '1px solid var(--rule)' }}>
          <span style={{ display: 'block', fontSize: 'var(--step-small)', color: 'var(--muted)', marginBottom: '4px' }}>
            Profile Views
          </span>
          <span className="tabular-nums" style={{ fontSize: '24px', fontWeight: 500 }}>
            {data.total_profile_views}
          </span>
          <span style={{ display: 'block', fontSize: '11px', color: 'var(--muted)', marginTop: '2px' }}>
            Total unique views
          </span>
        </div>

        <div style={{ padding: '16px 20px', borderRight: '1px solid var(--rule)' }}>
          <span style={{ display: 'block', fontSize: 'var(--step-small)', color: 'var(--muted)', marginBottom: '4px' }}>
            Call Button Taps
          </span>
          <span className="tabular-nums" style={{ fontSize: '24px', fontWeight: 500 }}>
            {data.total_call_clicks}
          </span>
          <span style={{ display: 'block', fontSize: '11px', color: 'var(--muted)', marginTop: '2px' }}>
            Direct customer calls
          </span>
        </div>

        <div style={{ padding: '16px 20px', borderRight: '1px solid var(--rule)' }}>
          <span style={{ display: 'block', fontSize: 'var(--step-small)', color: 'var(--muted)', marginBottom: '4px' }}>
            Average Rating
          </span>
          <span className="tabular-nums" style={{ fontSize: '24px', fontWeight: 500 }}>
            {data.average_rating ? data.average_rating.toFixed(1) : '—'}
          </span>
          <span style={{ display: 'block', fontSize: '11px', color: 'var(--muted)', marginTop: '2px' }}>
            Scale of 1.0 to 5.0
          </span>
        </div>

        <div style={{ padding: '16px 20px' }}>
          <span style={{ display: 'block', fontSize: 'var(--step-small)', color: 'var(--muted)', marginBottom: '4px' }}>
            Total Reviews
          </span>
          <span className="tabular-nums" style={{ fontSize: '24px', fontWeight: 500 }}>
            {data.review_count}
          </span>
          <span style={{ display: 'block', fontSize: '11px', color: 'var(--muted)', marginTop: '2px' }}>
            Verified submissions
          </span>
        </div>
      </div>

      <section
        style={{
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius-sm)',
          padding: '24px',
          marginBottom: '32px',
          backgroundColor: isTempUnavailable ? 'var(--status-unavail-bg)' : 'var(--card)',
        }}
      >
        <h2 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '4px' }}>
          {isTempUnavailable
            ? "You're closed for now"
            : data.availability.status === 'OPEN'
              ? "You're open now"
              : "You're closed right now"}
        </h2>
        <p style={{ fontSize: 'var(--step-caption)', color: 'var(--ink-secondary)', maxWidth: '560px', marginBottom: '16px' }}>
          {isTempUnavailable
            ? 'Customers see "Temporarily Unavailable" on your listing. Reopen when you are back and your weekly schedule applies again.'
            : data.availability.status === 'OPEN'
              ? 'Your weekly schedule says you are open. Need to close unexpectedly? Customers will see "Temporarily Unavailable" until you reopen.'
              : 'This follows your weekly schedule. You can still close for now if you want to be marked unavailable even during opening hours.'}
        </p>

        <label style={{ display: 'block', fontSize: 'var(--step-small)', marginBottom: '4px', color: 'var(--ink-secondary)' }}>
          Message for customers (optional)
        </label>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
          <input
            type="text"
            maxLength={300}
            value={unavailMessage}
            onChange={(e) => setUnavailMessage(e.target.value)}
            placeholder="e.g. Back at 3 PM"
            style={{
              flex: '1 1 260px',
              maxWidth: '420px',
              padding: '8px 12px',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-sm)',
              backgroundColor: 'var(--card)',
            }}
          />
          {isTempUnavailable ? (
            <>
              <button
                disabled={toggling}
                onClick={() => handleToggleAvailability(false)}
                style={{
                  padding: '8px 16px',
                  backgroundColor: 'var(--accent)',
                  color: 'var(--on-dark)',
                  borderRadius: 'var(--radius-sm)',
                  fontWeight: 500,
                  fontSize: 'var(--step-caption)',
                }}
              >
                {toggling ? 'Updating...' : 'Reopen now'}
              </button>
              <button
                disabled={toggling || unavailMessage.trim() === (data.availability.message ?? '')}
                onClick={() => handleToggleAvailability(true)}
                style={{
                  padding: '8px 16px',
                  backgroundColor: 'transparent',
                  border: '1px solid var(--border)',
                  borderRadius: 'var(--radius-sm)',
                  fontWeight: 500,
                  fontSize: 'var(--step-caption)',
                }}
              >
                Save message
              </button>
            </>
          ) : (
            <button
              disabled={toggling}
              onClick={() => handleToggleAvailability(true)}
              style={{
                padding: '8px 16px',
                backgroundColor: 'var(--ink)',
                color: 'var(--on-dark)',
                borderRadius: 'var(--radius-sm)',
                fontWeight: 500,
                fontSize: 'var(--step-caption)',
              }}
            >
              {toggling ? 'Updating...' : 'Close for now'}
            </button>
          )}
        </div>
      </section>

      <h2 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '12px' }}>Manage your workshop</h2>
      <section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px' }}>
        {[
          {
            to: '/owner/photos',
            title: 'Workshop photos',
            text: 'Add up to 10 photos of your bays and storefront. The first one is your cover.',
            action: 'Upload photos',
          },
          {
            to: '/owner/services',
            title: 'Services & vehicles',
            text: 'Choose the repairs you offer and the vehicles you work on.',
            action: 'Choose services & vehicles',
          },
          {
            to: '/owner/hours',
            title: 'Weekly schedule',
            text: 'Set your opening and closing times for each day of the week.',
            action: 'Edit weekly schedule',
          },
        ].map((card) => (
          <Link
            key={card.to}
            to={card.to}
            style={{
              padding: '16px',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-sm)',
              display: 'flex',
              flexDirection: 'column',
              gap: '6px',
              backgroundColor: 'var(--card)',
            }}
          >
            <strong style={{ fontSize: '15px' }}>{card.title}</strong>
            <span style={{ fontSize: 'var(--step-small)', color: 'var(--muted)', flex: 1 }}>{card.text}</span>
            <span style={{ fontSize: 'var(--step-caption)', fontWeight: 600, color: 'var(--accent)' }}>
              {card.action} &rarr;
            </span>
          </Link>
        ))}
      </section>
    </AppShell>
  );
};
