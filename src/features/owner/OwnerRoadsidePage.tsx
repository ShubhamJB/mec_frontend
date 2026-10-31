import React, { FormEvent, useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowUpRight, Check, Clock3, MapPin, Phone, RefreshCw, ShieldCheck, Siren, X } from 'lucide-react';
import { ApiError, apiClient } from '../../api/client';
import { RoadsideCapability, RoadsideRequestItem, RoadsideRequestStatus } from '../../api/types';
import { AppShell } from '../../components/AppShell';
import { useToast } from '../../components/ToastProvider';
import { ownerNavItems } from './ownerNav';
import './owner-roadside.css';

interface OwnerGarageBasics {
  services: Array<{ id: string; name: string }>;
  vehicle_types: Array<{ id: string; name: string }>;
}

interface CapabilityDraft {
  enabled: boolean;
  is_available: boolean;
  service_radius_km: number;
  availability_note: string;
  callback_phone: string;
  response_minutes: number;
}

const blankCapability: CapabilityDraft = {
  enabled: false,
  is_available: false,
  service_radius_km: 10,
  availability_note: '',
  callback_phone: '',
  response_minutes: 15,
};

const statusLabels: Record<RoadsideRequestStatus, string> = {
  PENDING: 'Needs a response', ACCEPTED: 'Accepted', CONTACTED: 'Call the rider',
  CONFIRMED: 'Details confirmed', IN_PROGRESS: 'Help underway', COMPLETED: 'Completed',
  DECLINED: 'Declined', EXPIRED: 'Expired', CANCELLED: 'Cancelled',
  UNABLE_TO_SERVE: 'Unable to serve',
};

const statusClass = (status: RoadsideRequestStatus) => {
  if (status === 'PENDING') return 'is-pending';
  if (['ACCEPTED', 'CONTACTED', 'CONFIRMED', 'IN_PROGRESS'].includes(status)) return 'is-active';
  if (status === 'COMPLETED') return 'is-complete';
  return 'is-closed';
};

const formatDate = (value: string) => new Intl.DateTimeFormat(undefined, {
  month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit',
}).format(new Date(value));

const remainingTime = (value: string) => {
  const minutes = Math.max(0, Math.ceil((new Date(value).getTime() - Date.now()) / 60000));
  return minutes ? `${minutes} min left` : 'Expired';
};

export const OwnerRoadsidePage: React.FC = () => {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [capability, setCapability] = useState<CapabilityDraft>(blankCapability);
  const [requests, setRequests] = useState<RoadsideRequestItem[]>([]);
  const [garage, setGarage] = useState<OwnerGarageBasics | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [filter, setFilter] = useState<'OPEN' | 'ALL'>('OPEN');

  const load = useCallback(async (quiet = false) => {
    if (!quiet) setLoading(true);
    try {
      const [capabilityResult, requestResult, garageResult] = await Promise.all([
        apiClient<RoadsideCapability>('/owner/roadside/capability', { skipGlobalLoader: true }),
        apiClient<RoadsideRequestItem[]>('/owner/roadside/requests', { skipGlobalLoader: true }),
        apiClient<OwnerGarageBasics>('/owner/garage', { skipGlobalLoader: true }),
      ]);
      setCapability({
        enabled: capabilityResult.enabled,
        is_available: capabilityResult.is_available,
        service_radius_km: capabilityResult.service_radius_km,
        availability_note: capabilityResult.availability_note || '',
        callback_phone: capabilityResult.callback_phone || '',
        response_minutes: capabilityResult.response_minutes,
      });
      setRequests(requestResult);
      setGarage(garageResult);
    } catch (error) {
      if (error instanceof ApiError && error.status === 404) {
        navigate('/owner/registration', { replace: true });
        return;
      }
      showToast(error instanceof ApiError ? error.message : 'Could not load roadside assistance.', 'error');
    } finally {
      setLoading(false);
    }
  }, [navigate, showToast]);

  useEffect(() => { void load(); }, [load]);

  const visibleRequests = useMemo(() => {
    const sorted = [...requests].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    return filter === 'ALL' ? sorted : sorted.filter((request) => ['PENDING', 'ACCEPTED', 'CONTACTED', 'CONFIRMED', 'IN_PROGRESS'].includes(request.status));
  }, [filter, requests]);

  const openCount = requests.filter((request) => ['PENDING', 'ACCEPTED', 'CONTACTED', 'CONFIRMED', 'IN_PROGRESS'].includes(request.status)).length;

  const saveCapability = async (event: FormEvent) => {
    event.preventDefault();
    setSaving(true);
    try {
      const result = await apiClient<RoadsideCapability>('/owner/roadside/capability', {
        method: 'PATCH',
        body: JSON.stringify({
          ...capability,
          availability_note: capability.availability_note.trim() || null,
          callback_phone: capability.callback_phone.trim(),
        }),
        skipGlobalLoader: true,
      });
      setCapability({ ...result, availability_note: result.availability_note || '', callback_phone: result.callback_phone || '' });
      showToast(result.enabled ? (result.is_available ? 'Roadside requests are now enabled.' : 'Roadside profile saved; requests are paused.') : 'Roadside assistance is turned off.', 'success');
    } catch (error) {
      showToast(error instanceof ApiError ? error.message : 'Could not save roadside settings.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const runAction = async (request: RoadsideRequestItem, action: 'accept' | 'decline' | 'progress', status?: RoadsideRequestStatus) => {
    setBusyId(request.id);
    try {
      if (action === 'accept') {
        await apiClient(`/owner/roadside/requests/${request.id}/accept`, { method: 'POST', skipGlobalLoader: true });
      } else if (action === 'decline') {
        await apiClient(`/owner/roadside/requests/${request.id}/decline`, {
          method: 'POST', body: JSON.stringify({ reason: 'Unable to take this request' }), skipGlobalLoader: true,
        });
      } else if (status) {
        await apiClient(`/owner/roadside/requests/${request.id}`, {
          method: 'PATCH', body: JSON.stringify({ status }), skipGlobalLoader: true,
        });
      }
      showToast(action === 'accept' ? 'Request accepted. Customer contact details are now available.' : action === 'decline' ? 'Request declined.' : `Request updated to ${statusLabels[status!]}.`, 'success');
      await load(true);
    } catch (error) {
      showToast(error instanceof ApiError ? error.message : 'Could not update this request.', 'error');
      await load(true);
    } finally {
      setBusyId(null);
    }
  };

  const updateProgress = (request: RoadsideRequestItem) => {
    if (request.status === 'ACCEPTED') return runAction(request, 'progress', 'CONTACTED');
    if (request.status === 'CONTACTED') return runAction(request, 'progress', 'CONFIRMED');
    if (request.status === 'CONFIRMED') return runAction(request, 'progress', 'IN_PROGRESS');
    if (request.status === 'IN_PROGRESS') return runAction(request, 'progress', 'COMPLETED');
    return Promise.resolve();
  };

  return (
    <AppShell title="Roadside assistance" navItems={ownerNavItems}>
      <main className="owner-roadside-page">
        <header className="owner-roadside-header">
          <div>
            <div className="owner-roadside-eyebrow"><Siren size={14} /> OWNER RESPONSE DESK</div>
            <h1>Roadside assistance</h1>
            <p>Choose when your garage can respond to riders who are stranded nearby.</p>
          </div>
          <button className="owner-roadside-refresh" type="button" onClick={() => void load(true)} disabled={loading}>
            <RefreshCw size={15} className={loading ? 'is-spinning' : ''} /> Refresh queue
          </button>
        </header>

        <div className="owner-roadside-overview" aria-live="polite">
          <div><span className="owner-roadside-overview-label">Requests needing attention</span><strong>{openCount}</strong></div>
          <span className={`owner-roadside-live ${capability.enabled && capability.is_available ? 'is-on' : ''}`}>
            <i /> {capability.enabled && capability.is_available ? 'Available for requests' : capability.enabled ? 'Requests paused' : 'Not listed for roadside help'}
          </span>
        </div>

        <div className="owner-roadside-layout">
          <section className="owner-roadside-queue" aria-labelledby="roadside-queue-title">
            <div className="owner-roadside-section-heading">
              <div><h2 id="roadside-queue-title">Incoming requests</h2><p>One request is sent to one garage. Call the rider after accepting.</p></div>
              <div className="owner-roadside-filter" role="group" aria-label="Request filter">
                <button type="button" className={filter === 'OPEN' ? 'is-selected' : ''} onClick={() => setFilter('OPEN')}>Open</button>
                <button type="button" className={filter === 'ALL' ? 'is-selected' : ''} onClick={() => setFilter('ALL')}>All</button>
              </div>
            </div>
            <div className="owner-roadside-table-frame">
              {loading && <div className="owner-roadside-table-loading" role="status"><span className="owner-roadside-spinner" />Loading roadside requests…</div>}
              {!loading && visibleRequests.length === 0 ? (
                <div className="owner-roadside-empty">
                  <div className="owner-roadside-empty-mark"><Siren size={19} /></div>
                  <strong>{filter === 'OPEN' ? 'No one is waiting right now.' : 'No roadside requests yet.'}</strong>
                  <p>New requests will appear here when your roadside profile is available.</p>
                </div>
              ) : (
                <div className={`owner-roadside-table-wrap${loading ? ' is-loading' : ''}`}>
                  <table className="owner-roadside-table">
                    <thead><tr><th>Request</th><th>Problem</th><th>Location</th><th>Received</th><th>Status</th><th>Next step</th></tr></thead>
                    <tbody>{visibleRequests.map((request) => {
                      const canAccept = request.status === 'PENDING';
                      const canProgress = ['ACCEPTED', 'CONTACTED', 'CONFIRMED', 'IN_PROGRESS'].includes(request.status);
                      const nextLabel = request.status === 'ACCEPTED' ? 'Mark contacted' : request.status === 'CONTACTED' ? 'Confirm details' : request.status === 'CONFIRMED' ? 'Start help' : 'Complete';
                      return (
                        <tr key={request.id}>
                          <td><strong className="owner-roadside-code">{request.request_code}</strong><span className="owner-roadside-row-sub">{remainingTime(request.expires_at)}</span></td>
                          <td className="owner-roadside-problem"><strong>{request.problem_description}</strong><span>{garage?.vehicle_types.find((item) => item.id === request.vehicle_type_id)?.name || 'Vehicle'} · {garage?.services.find((item) => item.id === request.service_id)?.name || 'Service'}</span></td>
                          <td>
                            <span className="owner-roadside-location"><MapPin size={13} /> {request.exact_latitude !== null && request.exact_latitude !== undefined ? `${request.exact_latitude.toFixed(5)}, ${request.exact_longitude?.toFixed(5)}` : `${request.coarse_latitude.toFixed(3)}, ${request.coarse_longitude.toFixed(3)}`}</span>
                            {request.address && <span className="owner-roadside-row-sub">{request.address}</span>}
                            {request.contact_phone && <a href={`tel:${request.contact_phone}`} className="owner-roadside-phone"><Phone size={12} /> {request.contact_phone}</a>}
                          </td>
                          <td className="owner-roadside-date">{formatDate(request.created_at)}</td>
                          <td><span className={`owner-roadside-status ${statusClass(request.status)}`}>{statusLabels[request.status]}</span></td>
                          <td><div className="owner-roadside-row-actions">
                            {canAccept ? <><button type="button" className="owner-roadside-action is-primary" disabled={busyId === request.id} onClick={() => void runAction(request, 'accept')}><Check size={13} /> Accept</button><button type="button" className="owner-roadside-action" disabled={busyId === request.id} onClick={() => void runAction(request, 'decline')}><X size={13} /> Decline</button></> : canProgress ? <button type="button" className="owner-roadside-action is-primary" disabled={busyId === request.id} onClick={() => void updateProgress(request)}>{nextLabel}<ArrowUpRight size={13} /></button> : <span className="owner-roadside-muted">No action</span>}
                          </div></td>
                        </tr>
                      );
                    })}</tbody>
                  </table>
                </div>
              )}
            </div>
          </section>

          <aside className="owner-roadside-settings" aria-labelledby="roadside-settings-title">
            <div className="owner-roadside-settings-heading"><div className="owner-roadside-settings-mark"><ShieldCheck size={17} /></div><div><h2 id="roadside-settings-title">Your response area</h2><p>Separate from your shop hours</p></div></div>
            <form onSubmit={saveCapability} className="owner-roadside-form">
              <label className="owner-roadside-switch-row"><span><strong>List for roadside requests</strong><small>Customers can find your garage when enabled.</small></span><input type="checkbox" checked={capability.enabled} onChange={(event) => setCapability({ ...capability, enabled: event.target.checked, is_available: event.target.checked && capability.is_available })} /></label>
              <label className="owner-roadside-switch-row"><span><strong>Available now</strong><small>Pause here without changing normal shop hours.</small></span><input type="checkbox" checked={capability.is_available} disabled={!capability.enabled} onChange={(event) => setCapability({ ...capability, is_available: event.target.checked })} /></label>
              <label className="owner-roadside-field">Callback phone<input required type="tel" autoComplete="tel" placeholder="+9779812345678" value={capability.callback_phone} onChange={(event) => setCapability({ ...capability, callback_phone: event.target.value })} /><small>Shown to the rider after you accept.</small></label>
              <div className="owner-roadside-field-row">
                <label className="owner-roadside-field">Service radius<select value={capability.service_radius_km} onChange={(event) => setCapability({ ...capability, service_radius_km: Number(event.target.value) })}>{[5, 10, 15, 20, 25, 50, 100].map((value) => <option key={value} value={value}>{value} km</option>)}</select></label>
                <label className="owner-roadside-field">Callback target<select value={capability.response_minutes} onChange={(event) => setCapability({ ...capability, response_minutes: Number(event.target.value) })}>{[5, 10, 15, 30, 60, 120, 240].map((value) => <option key={value} value={value}>{value} min</option>)}</select></label>
              </div>
              <label className="owner-roadside-field">Availability note <span>Optional</span><textarea rows={2} maxLength={300} placeholder="For example, call before travelling" value={capability.availability_note} onChange={(event) => setCapability({ ...capability, availability_note: event.target.value })} /></label>
              <button className="owner-roadside-save" type="submit" disabled={saving}>{saving ? 'Saving settings…' : 'Save response settings'}</button>
            </form>
            <div className="owner-roadside-privacy"><Clock3 size={14} /><span>Requests expire after 15 minutes. Exact rider details stay hidden until accepted.</span></div>
            {garage && (!garage.services.length || !garage.vehicle_types.length) && <p className="owner-roadside-catalog-note">Add services and vehicle types in <a href="/owner/services">Services &amp; Vehicles</a> so riders can match your garage.</p>}
          </aside>
        </div>
      </main>
    </AppShell>
  );
};
