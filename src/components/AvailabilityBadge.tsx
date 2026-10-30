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
      {showDetails && availability.message && isTempUnavailable && (
        <span style={{ fontSize: 'var(--step-small)', color: 'var(--muted)' }}>
          {availability.message}
        </span>
      )}
    </div>
  );
};
