import React from 'react';
import { GarageAvailability } from '../api/types';

export const AvailabilityBadge: React.FC<{
  availability: GarageAvailability;
  showDetails?: boolean;
}> = ({ availability, showDetails = false }) => {
  const isAvailable = availability.status === 'OPEN';
  const isTempUnavailable = availability.status === 'TEMPORARILY_UNAVAILABLE';

  let bg = 'var(--status-closed-bg)';
  let ink = 'var(--status-closed-ink)';
  let text = 'Closed';

  if (isAvailable) {
    bg = 'var(--status-open-bg)';
    ink = 'var(--status-open-ink)';
    text = 'Open Now';
  } else if (isTempUnavailable) {
    bg = 'var(--status-unavail-bg)';
    ink = 'var(--status-unavail-ink)';
    text = 'Temporarily Unavailable';
  }

  let detail: string | null = isTempUnavailable ? availability.message || null : null;
  if (!detail && showDetails && availability.next_status_change) {
    try {
      const nextChange = new Date(availability.next_status_change);
      const nextTime = new Intl.DateTimeFormat(undefined, {
        hour: 'numeric',
        minute: '2-digit',
        timeZone: availability.timezone,
      }).format(nextChange);

      if (availability.status === 'OPEN') {
        detail = `Closes at ${nextTime}`;
      } else if (availability.status === 'CLOSED') {
        const dateFormatter = new Intl.DateTimeFormat('en-CA', {
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
          timeZone: availability.timezone,
        });
        const isOpeningToday = dateFormatter.format(new Date(availability.local_time))
          === dateFormatter.format(nextChange);
        const weekday = new Intl.DateTimeFormat(undefined, {
          weekday: 'short',
          timeZone: availability.timezone,
        }).format(nextChange);
        detail = isOpeningToday ? `Opens at ${nextTime}` : `Opens ${weekday} at ${nextTime}`;
      }
    } catch {
      detail = null;
    }
  }

  return (
    <div style={{ display: 'inline-flex', flexDirection: 'column', gap: '4px' }}>
      <span
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '6px',
          padding: '2px 8px',
          fontSize: 'var(--step-small)',
          fontWeight: 500,
          backgroundColor: bg,
          color: ink,
          borderRadius: 'var(--radius-sm)',
          width: 'fit-content',
        }}
      >
        <span
          style={{
            width: '6px',
            height: '6px',
            borderRadius: '50%',
            backgroundColor: ink,
          }}
        />
        {text}
      </span>
      {detail && (
        <span style={{ fontSize: 'var(--step-small)', color: 'var(--muted)' }}>
          {detail}
        </span>
      )}
    </div>
  );
};
