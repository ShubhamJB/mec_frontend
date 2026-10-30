import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppShell } from '../../components/AppShell';
import { ownerNavItems } from './ownerNav';
import { ApiError, apiClient } from '../../api/client';
import { OperatingHoursItem } from '../../api/types';

const DAYS = [
  { id: 1, name: 'Monday' },
  { id: 2, name: 'Tuesday' },
  { id: 3, name: 'Wednesday' },
  { id: 4, name: 'Thursday' },
  { id: 5, name: 'Friday' },
  { id: 6, name: 'Saturday' },
  { id: 7, name: 'Sunday' },
];

export const OwnerHoursPage: React.FC = () => {
  const navigate = useNavigate();
  const [hours, setHours] = useState<OperatingHoursItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    apiClient<OperatingHoursItem[]>('/owner/garage/operating-hours')
      .then((res) => {
        // Ensure 7 days
        const fullWeek = DAYS.map((d) => {
          const match = res.find((h) => h.day_of_week === d.id);
          return (
            match || {
              day_of_week: d.id,
              is_closed: false,
              opening_time: '08:00',
              closing_time: '18:00',
            }
          );
        });
        setHours(fullWeek);
      })
      .catch((err: unknown) => {
        if (err instanceof ApiError && err.status === 404) {
          navigate('/owner/registration', { replace: true });
          return;
        }
        // default fallback week
        setHours(
          DAYS.map((d) => ({
            day_of_week: d.id,
            is_closed: d.id === 7, // Sunday closed
            opening_time: d.id === 7 ? null : '08:00',
            closing_time: d.id === 7 ? null : '18:00',
          }))
        );
      })
      .finally(() => setIsLoading(false));
  }, []);

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

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setNotice(null);

    // Validation: if open, opening < closing
    for (const h of hours) {
      if (!h.is_closed) {
        if (!h.opening_time || !h.closing_time || h.opening_time >= h.closing_time) {
          setNotice(`Opening time must be earlier than closing time on ${DAYS.find((d) => d.id === h.day_of_week)?.name}.`);
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
      setNotice('Operating hours schedule saved successfully.');
    } catch (err: unknown) {
      setNotice(err instanceof Error ? err.message : 'Failed to save hours');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <AppShell title="Operating Hours & Availability" navItems={ownerNavItems}>
      <div style={{ maxWidth: '640px', margin: '0 auto' }}>
        <p style={{ color: 'var(--muted)', fontSize: 'var(--step-caption)', marginBottom: '24px' }}>
          Define the regular weekly schedule for your workshop. Operating hours are evaluated in your garage's local timezone.
        </p>

        {notice && (
          <div
            style={{
              padding: '12px',
              backgroundColor: notice.includes('success') ? 'var(--status-open-bg)' : 'var(--status-danger-bg)',
              color: notice.includes('success') ? 'var(--status-open-ink)' : 'var(--status-danger-ink)',
              fontSize: 'var(--step-small)',
              borderRadius: 'var(--radius-sm)',
              marginBottom: '20px',
            }}
          >
            {notice}
          </div>
        )}

        {isLoading ? (
          <div style={{ color: 'var(--muted)' }}>Loading schedule...</div>
        ) : (
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
                      backgroundColor: item.is_closed ? 'var(--rule)' : '#fff',
                    }}
                  >
                    <div style={{ width: '120px', fontWeight: 500, fontSize: 'var(--step-caption)' }}>
                      {d.name}
                    </div>

                    <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: 'var(--step-small)', cursor: 'pointer' }}>
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
                        disabled={item.is_closed}
                        value={item.opening_time || ''}
                        onChange={(e) => handleDayChange(d.id, 'opening_time', e.target.value)}
                        style={{
                          padding: '6px 8px',
                          border: '1px solid var(--border)',
                          borderRadius: 'var(--radius-sm)',
                          backgroundColor: item.is_closed ? 'transparent' : '#fff',
                        }}
                      />
                      <span style={{ color: 'var(--muted)', fontSize: 'var(--step-small)' }}>to</span>
                      <input
                        type="time"
                        disabled={item.is_closed}
                        value={item.closing_time || ''}
                        onChange={(e) => handleDayChange(d.id, 'closing_time', e.target.value)}
                        style={{
                          padding: '6px 8px',
                          border: '1px solid var(--border)',
                          borderRadius: 'var(--radius-sm)',
                          backgroundColor: item.is_closed ? 'transparent' : '#fff',
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>

            <button
              type="submit"
              disabled={isSaving}
              style={{
                padding: '10px 20px',
                backgroundColor: 'var(--ink)',
                color: '#fff',
                borderRadius: 'var(--radius-sm)',
                fontWeight: 500,
                fontSize: 'var(--step-caption)',
              }}
            >
              {isSaving ? 'Saving...' : 'Save Schedule'}
            </button>
          </form>
        )}
      </div>
    </AppShell>
  );
};
