import React, { useEffect, useState } from 'react';
import { Check, Clock, MapPin, Phone, X } from 'lucide-react';
import './admin-modal.css';

export interface ReviewTarget {
  garage_id: string;
  name?: string;
  garage_name?: string;
  owner_name: string;
  owner_email: string;
  address: string;
  phone?: string;
  approval_status: 'PENDING' | 'APPROVED' | 'REJECTED';
  registration_version: number;
  submitted_at: string;
}

export interface RegistrationDetail {
  description: string | null;
  phone: string;
  address: string;
  latitude: number;
  longitude: number;
  timezone: string;
  services: Array<{ id: string; name: string }>;
  vehicle_types: Array<{ id: string; name: string }>;
  operating_hours: Array<{ day_of_week: number; opening_time: string | null; closing_time: string | null; is_closed: boolean }>;
  photos: Array<{ id: string; url: string; caption?: string | null }>;
}

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

interface Props {
  registration: ReviewTarget;
  detail: RegistrationDetail | null;
  detailError: string | null;
  rejectionReason: string;
  onReasonChange: (reason: string) => void;
  submitting: boolean;
  error: string | null;
  onDecision: (decision: 'APPROVE' | 'REJECT') => void;
  onClose: () => void;
}

const statusTone = { APPROVED: 'is-ok', PENDING: 'is-warn', REJECTED: 'is-bad' } as const;

export const RegistrationReviewModal: React.FC<Props> = ({
  registration,
  detail,
  detailError,
  rejectionReason,
  onReasonChange,
  submitting,
  error,
  onDecision,
  onClose,
}) => {
  const [closing, setClosing] = useState(false);

  const requestClose = () => {
    setClosing(true);
    window.setTimeout(onClose, 220);
  };

  useEffect(() => {
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') requestClose();
    };
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = previous;
      window.removeEventListener('keydown', onKey);
    };
  }, []);

  const name = registration.name || registration.garage_name || 'Unnamed workshop';
  const isPending = registration.approval_status === 'PENDING';
  const phone = detail?.phone || registration.phone;
  const address = detail?.address || registration.address;
  const hoursFor = (day: number) => detail?.operating_hours.find((h) => h.day_of_week === day);

  return (
    <div className={`rv-backdrop${closing ? ' is-closing' : ''}`} onMouseDown={(event) => { if (event.target === event.currentTarget) requestClose(); }}>
      <section className={`rv-modal${closing ? ' is-closing' : ''}`} role="dialog" aria-modal="true" aria-labelledby="rv-title">
        <header className="rv-head">
          <div>
            <span className="rv-kicker">{isPending ? 'Review submission' : 'Registration detail'}</span>
            <h2 id="rv-title">{name}</h2>
            <div className="rv-meta">
              <span className={`dt-chip ${statusTone[registration.approval_status]}`}>
                {registration.approval_status.charAt(0) + registration.approval_status.slice(1).toLowerCase()}
              </span>
              <span className="tabular-nums">Version v{registration.registration_version}</span>
              <span className="tabular-nums">Submitted {new Date(registration.submitted_at).toLocaleDateString()}</span>
            </div>
          </div>
          <button type="button" className="rv-close" aria-label="Close" onClick={requestClose}><X size={18} /></button>
        </header>

        <div className="rv-body">
          <div className="rv-grid">
            <div className="rv-card">
              <h3>Owner</h3>
              <p className="rv-strong">{registration.owner_name}</p>
              <p className="rv-muted">{registration.owner_email}</p>
            </div>
            <div className="rv-card">
              <h3>Contact</h3>
              <p className="rv-line"><Phone size={15} strokeWidth={1.7} /> {phone || '—'}</p>
              <p className="rv-line"><MapPin size={15} strokeWidth={1.7} /> {address}</p>
              {detail && (
                <a
                  className="rv-link"
                  href={`https://www.google.com/maps?q=${detail.latitude},${detail.longitude}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  View on map ({detail.latitude.toFixed(4)}, {detail.longitude.toFixed(4)}) &rarr;
                </a>
              )}
            </div>
          </div>

          {detailError && <p className="rv-error">{detailError}</p>}

          {detail && (
            <>
              {detail.description && (
                <section className="rv-section">
                  <h3>About the workshop</h3>
                  <p className="rv-text">{detail.description}</p>
                </section>
              )}

              <section className="rv-section rv-two">
                <div>
                  <h3>Services</h3>
                  <div className="rv-chips">
                    {detail.services.length ? detail.services.map((s) => <span key={s.id} className="rv-chip">{s.name}</span>) : <span className="rv-muted">None listed</span>}
                  </div>
                </div>
                <div>
                  <h3>Vehicles</h3>
                  <div className="rv-chips">
                    {detail.vehicle_types.length ? detail.vehicle_types.map((v) => <span key={v.id} className="rv-chip">{v.name}</span>) : <span className="rv-muted">None listed</span>}
                  </div>
                </div>
              </section>

              <section className="rv-section">
                <h3><Clock size={15} strokeWidth={1.8} /> Opening hours <span className="rv-muted">({detail.timezone})</span></h3>
                <ul className="rv-hours">
                  {DAYS.map((day, index) => {
                    const entry = hoursFor(index + 1);
                    const open = !!entry && !entry.is_closed && !!entry.opening_time && !!entry.closing_time;
                    return (
                      <li key={day}>
                        <span>{day}</span>
                        <span className={`tabular-nums${open ? '' : ' rv-muted'}`}>
                          {open ? `${entry!.opening_time!.slice(0, 5)} – ${entry!.closing_time!.slice(0, 5)}` : 'Closed'}
                        </span>
                      </li>
                    );
                  })}
                </ul>
              </section>

              {detail.photos.length > 0 && (
                <section className="rv-section">
                  <h3>Photos</h3>
                  <div className="rv-photos">
                    {detail.photos.map((photo) => <img key={photo.id} src={photo.url} alt={photo.caption || name} loading="lazy" />)}
                  </div>
                </section>
              )}
            </>
          )}
        </div>

        <footer className="rv-foot">
          {isPending ? (
            <>
              <div className="rv-reason">
                <label htmlFor="rv-reason">Rejection reason <span>(required only if rejecting)</span></label>
                <textarea
                  id="rv-reason"
                  rows={2}
                  value={rejectionReason}
                  onChange={(e) => onReasonChange(e.target.value)}
                  placeholder="e.g. Invalid commercial address or unsupported service"
                />
              </div>
              {error && <p className="rv-error">{error}</p>}
              <div className="rv-actions">
                <button type="button" className="c-btn c-btn--ghost" onClick={requestClose} disabled={submitting}>Cancel</button>
                <button type="button" className="c-btn rv-reject" onClick={() => onDecision('REJECT')} disabled={submitting}>
                  <X size={16} strokeWidth={2.2} /> {submitting ? 'Processing…' : 'Reject'}
                </button>
                <button type="button" className="c-btn" onClick={() => onDecision('APPROVE')} disabled={submitting}>
                  <Check size={16} strokeWidth={2.4} /> {submitting ? 'Processing…' : 'Approve'}
                </button>
              </div>
            </>
          ) : (
            <>
              <div className={`rv-note ${registration.approval_status === 'APPROVED' ? 'is-ok' : 'is-bad'}`}>
                {registration.approval_status === 'APPROVED'
                  ? 'This workshop registration has been approved and is publicly discoverable.'
                  : 'This registration submission was rejected.'}
              </div>
              <div className="rv-actions">
                <button type="button" className="c-btn c-btn--ghost" onClick={requestClose}>Close</button>
              </div>
            </>
          )}
        </footer>
      </section>
    </div>
  );
};
