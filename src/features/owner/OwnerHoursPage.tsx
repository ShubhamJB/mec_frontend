import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AppShell } from '../../components/AppShell';
import { ApiError, apiClient } from '../../api/client';
import { OperatingHoursItem } from '../../api/types';
import { ownerNavItems } from './ownerNav';

const DAYS = [
  { id: 1, name: 'Monday' },
  { id: 2, name: 'Tuesday' },
  { id: 3, name: 'Wednesday' },
  { id: 4, name: 'Thursday' },
  { id: 5, name: 'Friday' },
  { id: 6, name: 'Saturday' },
  { id: 7, name: 'Sunday' },
];

const trimSeconds = (time: string | null | undefined) => (time ? time.slice(0, 5) : null);

const normalizeDay = (day: OperatingHoursItem | undefined): OperatingHoursItem | undefined =>
  day ? { ...day, opening_time: trimSeconds(day.opening_time), closing_time: trimSeconds(day.closing_time) } : undefined;

const defaultWeek = (): OperatingHoursItem[] =>
  DAYS.map((d) => ({
    day_of_week: d.id,
    is_closed: d.id === 7,
    opening_time: d.id === 7 ? null : '08:00',
    closing_time: d.id === 7 ? null : '18:00',
  }));

const formatClock = (time: string | null) => {
  if (!time) return '';
  const [hour, minute] = time.split(':').map(Number);
  const suffix = hour >= 12 ? 'PM' : 'AM';
  return `${hour % 12 || 12}:${String(minute).padStart(2, '0')} ${suffix}`;
};

const outlineButton: React.CSSProperties = {
  padding: '6px 12px',
  fontSize: 'var(--step-small)',
  border: '1px solid var(--border)',
  borderRadius: 'var(--radius-sm)',
  backgroundColor: 'var(--card)',
  cursor: 'pointer',
};

const timeInput = (disabled: boolean): React.CSSProperties => ({
  padding: '6px 8px',
  border: '1px solid var(--border)',
  borderRadius: 'var(--radius-sm)',
  backgroundColor: disabled ? 'transparent' : 'var(--card)',
});

export const OwnerHoursPage: React.FC = () => {
  const navigate = useNavigate();
  const [hours, setHours] = useState<OperatingHoursItem[]>([]);
  const [savedHours, setSavedHours] = useState<OperatingHoursItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadFailed, setLoadFailed] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [notice, setNotice] = useState<{ kind: 'ok' | 'error'; text: string } | null>(null);

  useEffect(() => {
    apiClient<OperatingHoursItem[]>('/owner/garage/operating-hours')
      .then((res) => {
        if (res.length === 0) {
          const fresh = defaultWeek();
          setHours(fresh);
          setSavedHours(fresh);
          setIsEditing(true);
          return;
        }
        const fullWeek = DAYS.map(
          (d) =>
            normalizeDay(res.find((h) => h.day_of_week === d.id)) || {
              day_of_week: d.id,
              is_closed: true,
              opening_time: null,
              closing_time: null,
            }
        );
        setHours(fullWeek);
        setSavedHours(fullWeek);
      })
      .catch((err: unknown) => {
        if (err instanceof ApiError && err.status === 404) {
          navigate('/owner/registration', { replace: true });
          return;
        }
        setLoadFailed(true);
        setNotice({ kind: 'error', text: err instanceof Error ? err.message : 'Could not load your saved schedule.' });
      })
      .finally(() => setIsLoading(false));
  }, [navigate]);

  const handleDayChange = (dayNum: number, field: keyof OperatingHoursItem, val: unknown) => {
    setHours((prev) =>
      prev.map((h) => {
        if (h.day_of_week !== dayNum) return h;
        const updated = { ...h, [field]: val };
        if (field === 'is_closed' && val === true) {
          updated.opening_time = null;
          updated.closing_time = null;
        } else if (field === 'is_closed' && val === false && !updated.opening_time) {
          updated.opening_time = '08:00';
          updated.closing_time = '18:00';
        }
        return updated;
      })
    );
  };

  const copyMondayToAllDays = () => {
    setNotice(null);
    setHours((prev) => {
      const monday = prev.find((h) => h.day_of_week === 1);
      if (!monday) return prev;
      return prev.map((h) => ({
        ...h,
        is_closed: monday.is_closed,
        opening_time: monday.opening_time,
        closing_time: monday.closing_time,
      }));
    });
  };

  const closeWeekend = () => {
    setNotice(null);
    setHours((prev) =>
      prev.map((h) => (h.day_of_week >= 6 ? { ...h, is_closed: true, opening_time: null, closing_time: null } : h))
    );
  };

  const startEditing = () => {
    setNotice(null);
    setIsEditing(true);
  };

  const cancelEditing = () => {
    setHours(savedHours);
    setNotice(null);
    setIsEditing(false);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setNotice(null);

    for (const h of hours) {
      if (!h.is_closed) {
        if (!h.opening_time || !h.closing_time || h.opening_time >= h.closing_time) {
          setNotice({
            kind: 'error',
            text: `Opening time must be earlier than closing time on ${DAYS.find((d) => d.id === h.day_of_week)?.name}.`,
          });
          setIsSaving(false);
          return;
        }
      }
    }

    try {
      await apiClient('/owner/garage/operating-hours', {
        method: 'PUT',
        body: JSON.stringify({ hours }),
      });
      setSavedHours(hours);
      setIsEditing(false);
      setNotice({ kind: 'ok', text: 'Your weekly schedule was saved.' });
    } catch (err: unknown) {
      setNotice({ kind: 'error', text: err instanceof Error ? err.message : 'Failed to save your schedule.' });
    } finally {
      setIsSaving(false);
    }
  };

  const headerAction =
    isLoading || loadFailed ? null : isEditing ? (
      <button type="button" onClick={cancelEditing} disabled={isSaving} style={outlineButton}>
        Cancel
      </button>
    ) : (
      <button
        type="button"
        onClick={startEditing}
        style={{ ...outlineButton, backgroundColor: 'var(--ink)', color: 'var(--on-dark)', borderColor: 'var(--ink)', fontWeight: 500 }}
      >
        Edit schedule
      </button>
    );

  return (
    <AppShell title="Weekly Schedule" navItems={ownerNavItems} actions={headerAction}>
      <div style={{ maxWidth: '640px', margin: '0 auto' }}>
        <p style={{ color: 'var(--muted)', fontSize: 'var(--step-caption)', marginBottom: '24px' }}>
          {isEditing
            ? "Set your opening and closing time for each day. Times use your garage's local timezone."
            : 'This is the schedule customers see on your listing. Click Edit schedule to change it.'}
        </p>

        {notice && (
          <div
            role={notice.kind === 'error' ? 'alert' : 'status'}
            style={{
              padding: '12px',
              backgroundColor: notice.kind === 'ok' ? 'var(--status-open-bg)' : 'var(--status-danger-bg)',
              color: notice.kind === 'ok' ? 'var(--status-open-ink)' : 'var(--status-danger-ink)',
              fontSize: 'var(--step-small)',
              borderRadius: 'var(--radius-sm)',
              marginBottom: '20px',
            }}
          >
            {notice.text}
          </div>
        )}

        {isEditing && (
          <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
            <span style={{ fontSize: 'var(--step-small)', color: 'var(--muted)' }}>Quick setup:</span>
            <button type="button" onClick={copyMondayToAllDays} style={outlineButton}>
              Use Monday&apos;s hours every day
            </button>
            <button type="button" onClick={closeWeekend} style={outlineButton}>
              Close Saturday &amp; Sunday
            </button>
          </div>
        )}

        {isLoading ? (
          <div style={{ color: 'var(--muted)' }}>Loading your saved schedule...</div>
        ) : loadFailed ? null : (
          <form onSubmit={handleSave}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '24px' }}>
              {DAYS.map((d) => {
                const item = hours.find((h) => h.day_of_week === d.id);
                if (!item) return null;
                return (
                  <div
                    key={d.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '12px 16px',
                      border: '1px solid var(--border)',
                      borderRadius: 'var(--radius-sm)',
                      backgroundColor: item.is_closed ? 'var(--rule)' : 'var(--card)',
                    }}
                  >
                    <div style={{ width: '120px', fontWeight: 500, fontSize: 'var(--step-caption)' }}>{d.name}</div>

                    {isEditing ? (
                      <>
                        <label
                          style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: 'var(--step-small)', cursor: 'pointer' }}
                        >
                          <input
                            type="checkbox"
                            checked={item.is_closed}
                            onChange={(e) => handleDayChange(d.id, 'is_closed', e.target.checked)}
                          />
                          <span>Closed</span>
                        </label>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <input
                            type="time"
                            aria-label={`${d.name} opening time`}
                            disabled={item.is_closed}
                            value={item.opening_time || ''}
                            onChange={(e) => handleDayChange(d.id, 'opening_time', e.target.value)}
                            style={timeInput(item.is_closed)}
                          />
                          <span style={{ color: 'var(--muted)', fontSize: 'var(--step-small)' }}>to</span>
                          <input
                            type="time"
                            aria-label={`${d.name} closing time`}
                            disabled={item.is_closed}
                            value={item.closing_time || ''}
                            onChange={(e) => handleDayChange(d.id, 'closing_time', e.target.value)}
                            style={timeInput(item.is_closed)}
                          />
                        </div>
                      </>
                    ) : (
                      <div
                        className="tabular-nums"
                        style={{
                          fontSize: 'var(--step-caption)',
                          color: item.is_closed ? 'var(--muted)' : 'var(--ink)',
                        }}
                      >
                        {item.is_closed ? 'Closed' : `${formatClock(item.opening_time)} – ${formatClock(item.closing_time)}`}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {isEditing && (
              <button
                type="submit"
                disabled={isSaving}
                style={{
                  padding: '10px 20px',
                  backgroundColor: 'var(--ink)',
                  color: 'var(--on-dark)',
                  borderRadius: 'var(--radius-sm)',
                  fontWeight: 500,
                  fontSize: 'var(--step-caption)',
                }}
              >
                {isSaving ? 'Saving...' : 'Save schedule'}
              </button>
            )}

            <p style={{ marginTop: '16px', fontSize: 'var(--step-small)', color: 'var(--muted)' }}>
              Closing for a day or an emergency? Use{' '}
              <Link to="/owner" style={{ textDecoration: 'underline' }}>
                Close for now
              </Link>{' '}
              on the dashboard instead of changing this schedule.
            </p>
          </form>
        )}
      </div>
    </AppShell>
  );
};
