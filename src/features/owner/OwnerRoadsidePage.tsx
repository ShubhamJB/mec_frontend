import React, { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertTriangle, ArrowUpRight, Bell, Check, Clock3, MapPin, Phone, RefreshCw, ShieldCheck, Siren, X } from 'lucide-react';
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

interface NotificationPreview {
  id: string;
  title: string;
  message: string;
  related_entity_id: string | null;
  is_read: boolean;
  created_at: string;
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
  const [savedCapability, setSavedCapability] = useState<CapabilityDraft>(blankCapability);
  const [requests, setRequests] = useState<RoadsideRequestItem[]>([]);
  const [garage, setGarage] = useState<OwnerGarageBasics | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [declineTarget, setDeclineTarget] = useState<RoadsideRequestItem | null>(null);
  const [declineReason, setDeclineReason] = useState('');
  const [filter, setFilter] = useState<'OPEN' | 'ALL'>('OPEN');
  const [settingsModalOpen, setSettingsModalOpen] = useState(false);
  const [settingsModalMounted, setSettingsModalMounted] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [urgentNotificationIds, setUrgentNotificationIds] = useState<Record<string, string>>({});
  const [notificationItems, setNotificationItems] = useState<NotificationPreview[]>([]);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const notificationsRef = useRef<HTMLDivElement>(null);
  const settingsCloseTimer = useRef<number | null>(null);

  const load = useCallback(async (quiet = false) => {
    if (!quiet) setLoading(true);
    try {
      const [capabilityResult, requestResult, garageResult] = await Promise.all([
        apiClient<RoadsideCapability>('/owner/roadside/capability', { skipGlobalLoader: true }),
        apiClient<RoadsideRequestItem[]>('/owner/roadside/requests', { skipGlobalLoader: true }),
        apiClient<OwnerGarageBasics>('/owner/garage', { skipGlobalLoader: true }),
      ]);
      const saved = {
        enabled: capabilityResult.enabled,
        is_available: capabilityResult.is_available,
        service_radius_km: capabilityResult.service_radius_km,
        availability_note: capabilityResult.availability_note || '',
        callback_phone: capabilityResult.callback_phone || '',
        response_minutes: capabilityResult.response_minutes,
      };
      setCapability(saved);
      setSavedCapability(saved);
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

  const loadUrgentNotifications = useCallback(async () => {
    try {
      const [count, notifications] = await Promise.all([
        apiClient<{ unread_count: number }>('/notifications/unread-count', { skipGlobalLoader: true }),
        apiClient<{ items: NotificationPreview[] }>('/notifications?limit=20', { skipGlobalLoader: true }),
      ]);
      setUnreadCount(count.unread_count);
      setNotificationItems(notifications.items);
      const urgentIds = Object.fromEntries(notifications.items.filter((item) => !item.is_read && item.title.startsWith('URGENT: Rider has not received a call') && item.related_entity_id).map((item) => [item.related_entity_id!, item.id]));
      setUrgentNotificationIds(urgentIds);
    } catch { /* Notifications should not block the request queue. */ }
  }, []);

  useEffect(() => {
    void loadUrgentNotifications();
    const timer = window.setInterval(() => { void load(true); void loadUrgentNotifications(); }, 10000);
    return () => window.clearInterval(timer);
  }, [load, loadUrgentNotifications]);

  useEffect(() => {
    if (!notificationsOpen) return;
    const closeOnOutside = (event: PointerEvent) => {
      if (notificationsRef.current && !notificationsRef.current.contains(event.target as Node)) setNotificationsOpen(false);
    };
    const closeOnEscape = (event: KeyboardEvent) => { if (event.key === 'Escape') setNotificationsOpen(false); };
    document.addEventListener('pointerdown', closeOnOutside);
    document.addEventListener('keydown', closeOnEscape);
    return () => {
      document.removeEventListener('pointerdown', closeOnOutside);
      document.removeEventListener('keydown', closeOnEscape);
    };
  }, [notificationsOpen]);

  useEffect(() => () => {
    if (settingsCloseTimer.current !== null) window.clearTimeout(settingsCloseTimer.current);
  }, []);

  const closeSettingsModal = () => {
    if (saving) return;
    setSettingsModalOpen(false);
    if (settingsCloseTimer.current !== null) window.clearTimeout(settingsCloseTimer.current);
    settingsCloseTimer.current = window.setTimeout(() => setSettingsModalMounted(false), 530);
  };

  const openSettingsModal = () => {
    setCapability(savedCapability);
    if (settingsCloseTimer.current !== null) window.clearTimeout(settingsCloseTimer.current);
    setSettingsModalMounted(true);
    window.requestAnimationFrame(() => setSettingsModalOpen(true));
  };

  const visibleRequests = useMemo(() => {
    const sorted = [...requests].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    return filter === 'ALL' ? sorted : sorted.filter((request) => ['PENDING', 'ACCEPTED', 'CONTACTED', 'CONFIRMED', 'IN_PROGRESS'].includes(request.status));
  }, [filter, requests]);

  const openCount = requests.filter((request) => ['PENDING', 'ACCEPTED', 'CONTACTED', 'CONFIRMED', 'IN_PROGRESS'].includes(request.status)).length;
  const urgentRequests = requests.filter((request) => request.status === 'ACCEPTED' && request.customer_contact_confirmed === false);

  const requestStatusLabel = (request: RoadsideRequestItem) => {
    if (request.status !== 'ACCEPTED') return statusLabels[request.status];
    if (request.call_followup_failed) return 'Failed to address';
    if (request.customer_contact_confirmed === true) return 'Rider confirmed call';
    if (request.customer_contact_confirmed === false) return 'Rider still waiting';
    if (request.owner_calling_at) return 'Call started · checking again';
    return statusLabels[request.status];
  };

  const requestStatusClass = (request: RoadsideRequestItem) => {
    if (request.status === 'ACCEPTED' && request.call_followup_failed) return 'is-call-failed';
    if (request.status === 'ACCEPTED' && request.customer_contact_confirmed === true) return 'is-call-confirmed';
    if (request.status === 'ACCEPTED' && request.customer_contact_confirmed === false) return 'is-call-needed';
    return statusClass(request.status);
  };

  const markNotificationRead = async (notification: NotificationPreview) => {
    if (notification.is_read) return;
    try {
      await apiClient(`/notifications/${notification.id}/read`, { method: 'PATCH', skipGlobalLoader: true });
      setNotificationItems((items) => items.map((item) => item.id === notification.id ? { ...item, is_read: true } : item));
      setUnreadCount((count) => Math.max(0, count - 1));
    } catch (error) { showToast(error instanceof ApiError ? error.message : 'Could not update notification.', 'error'); }
  };

  const markCalling = async (request: RoadsideRequestItem) => {
    setBusyId(request.id);
    try {
      const updated = await apiClient<RoadsideRequestItem>(`/owner/roadside/requests/${request.id}/calling`, { method: 'POST', skipGlobalLoader: true });
      setRequests((items) => items.map((item) => item.id === request.id ? updated : item));
      const notificationId = urgentNotificationIds[request.id];
      if (notificationId) await apiClient(`/notifications/${notificationId}/read`, { method: 'PATCH', skipGlobalLoader: true });
      showToast('The rider has been notified that you are calling now.', 'success');
      await loadUrgentNotifications();
      return true;
    } catch (error) { showToast(error instanceof ApiError ? error.message : 'Could not update the rider.', 'error'); return false; }
    finally { setBusyId(null); }
  };

  const callRider = async (request: RoadsideRequestItem) => {
    if (!request.contact_phone) return;
    const updated = await markCalling(request);
    if (updated) window.location.href = `tel:${request.contact_phone}`;
  };

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
      setSavedCapability({ ...result, availability_note: result.availability_note || '', callback_phone: result.callback_phone || '' });
      showToast(result.enabled ? (result.is_available ? 'Roadside requests are now enabled.' : 'Roadside profile saved; requests are paused.') : 'Roadside assistance is turned off.', 'success');
      setSettingsModalOpen(false);
      if (settingsCloseTimer.current !== null) window.clearTimeout(settingsCloseTimer.current);
      settingsCloseTimer.current = window.setTimeout(() => setSettingsModalMounted(false), 530);
    } catch (error) {
      showToast(error instanceof ApiError ? error.message : 'Could not save roadside settings.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const runAction = async (request: RoadsideRequestItem, action: 'accept' | 'decline' | 'progress', status?: RoadsideRequestStatus, reason?: string): Promise<boolean> => {
    setBusyId(request.id);
    try {
      let updatedRequest: RoadsideRequestItem | null = null;
      if (action === 'accept') {
        updatedRequest = await apiClient<RoadsideRequestItem>(`/owner/roadside/requests/${request.id}/accept`, { method: 'POST', skipGlobalLoader: true });
      } else if (action === 'decline') {
        updatedRequest = await apiClient<RoadsideRequestItem>(`/owner/roadside/requests/${request.id}/decline`, {
          method: 'POST', body: JSON.stringify({ reason: reason?.trim() || 'Unable to take this request' }), skipGlobalLoader: true,
        });
      } else if (status) {
        updatedRequest = await apiClient<RoadsideRequestItem>(`/owner/roadside/requests/${request.id}`, {
          method: 'PATCH', body: JSON.stringify({ status }), skipGlobalLoader: true,
        });
      }
      if (updatedRequest) setRequests((current) => current.map((item) => item.id === request.id ? updatedRequest! : item));
      showToast(action === 'accept' ? 'Request accepted. Customer contact details are now available.' : action === 'decline' ? 'Request declined.' : `Request updated to ${statusLabels[status!]}.`, 'success');
      await load(true);
      return true;
    } catch (error) {
      showToast(error instanceof ApiError ? error.message : 'Could not update this request.', 'error');
      await load(true);
      return false;
    } finally {
      setBusyId(null);
    }
  };

  const confirmDecline = async () => {
    if (!declineTarget) return;
    const success = await runAction(declineTarget, 'decline', undefined, declineReason);
    if (success) {
      setDeclineTarget(null);
      setDeclineReason('');
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
          <div className="owner-roadside-header-actions"><div className="owner-roadside-notification-anchor" ref={notificationsRef}><button className={`owner-roadside-bell ${urgentRequests.length ? 'is-urgent' : ''}`} type="button" aria-haspopup="dialog" aria-expanded={notificationsOpen} aria-label={`Notifications, ${unreadCount} unread`} onClick={() => setNotificationsOpen((open) => !open)}><Bell size={17}/><span>Notifications</span>{unreadCount > 0 && <b>{unreadCount}</b>}</button>{notificationsOpen&&<section className="owner-roadside-notification-popover" aria-label="Notifications" aria-modal="false" role="dialog"><header><div><strong>Notifications</strong><span>{unreadCount} unread</span></div><button type="button" aria-label="Close notifications" onClick={()=>setNotificationsOpen(false)}><X size={16}/></button></header><div className="owner-roadside-notification-list">{notificationItems.length===0?<p className="owner-roadside-notification-empty">You’re all caught up.</p>:<table className="owner-roadside-notification-table"><thead><tr><th>Severity</th><th>Notification</th><th>Received</th><th>Action</th></tr></thead><tbody>{notificationItems.map((notification)=>{const urgent=notification.title.startsWith('URGENT: Rider has not received a call');const request=urgent?requests.find((item)=>item.id===notification.related_entity_id):undefined;return <tr className={`${urgent?'is-high':''} ${notification.is_read?'is-read':''}`} key={notification.id}><td><span className={`owner-roadside-severity ${urgent?'is-high':''}`}>{urgent?<><AlertTriangle size={12}/> HIGH</>:'NORMAL'}</span></td><td className="owner-roadside-notification-copy"><strong>{notification.title.replace('URGENT: ','')}</strong><span>{notification.message}</span></td><td className="owner-roadside-notification-date">{formatDate(notification.created_at)}</td><td><div className="owner-roadside-notification-actions">{request?.contact_phone&&!request.owner_calling_at?<button type="button" className="owner-roadside-notification-call" disabled={busyId===request.id} onClick={()=>void callRider(request)}><Phone size={14}/>{busyId===request.id?'Calling…':'Call'}</button>:request?.owner_calling_at?<span className="owner-roadside-notification-called">Calling rider</span>:null}{!notification.is_read&&<button className="owner-roadside-notification-read" type="button" onClick={()=>void markNotificationRead(notification)}>Mark read</button>}</div></td></tr>})}</tbody></table>}</div><a className="owner-roadside-notification-all" href="/notifications" onClick={()=>setNotificationsOpen(false)}>View all notifications <ArrowUpRight size={14}/></a></section>}</div><button className="owner-roadside-refresh" type="button" onClick={() => void load(true)} disabled={loading}>
            <RefreshCw size={15} className={loading ? 'is-spinning' : ''} /> Refresh queue
          </button></div>
        </header>

        <section className="owner-roadside-overview" aria-label="Saved roadside settings" aria-live="polite">
          <div className="owner-roadside-overview-main">
            <span className="owner-roadside-overview-label">Roadside listing</span>
            <span className={`owner-roadside-live ${savedCapability.enabled && savedCapability.is_available ? 'is-on' : ''}`}>
              <i /> {savedCapability.enabled && savedCapability.is_available ? 'Available now' : savedCapability.enabled ? 'Paused' : 'Not listed'}
            </span>
            <span className="owner-roadside-summary-detail">{savedCapability.service_radius_km} km response area · {savedCapability.response_minutes} min callback target{savedCapability.callback_phone ? ` · ${savedCapability.callback_phone}` : ''}</span>
            {savedCapability.availability_note && <span className="owner-roadside-summary-note">“{savedCapability.availability_note}”</span>}
          </div>
          <div className="owner-roadside-summary-action">
            <p>These saved settings control whether riders can find your garage and what response to expect.</p>
            <button className="owner-roadside-edit-settings" type="button" onClick={openSettingsModal}><ShieldCheck size={15}/> Edit response settings</button>
          </div>
        </section>

        <div className="owner-roadside-open-summary"><span>Requests needing attention</span><strong>{openCount}</strong></div>

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
                      const canCallRider = request.status === 'ACCEPTED' && !!request.contact_phone && request.customer_contact_confirmed !== true && (!request.owner_calling_at || request.customer_contact_confirmed === false);
                      const nextLabel = request.status === 'ACCEPTED' ? 'Mark contacted' : request.status === 'CONTACTED' ? 'Confirm details' : request.status === 'CONFIRMED' ? 'Start help' : 'Complete';
                      return (
                        <tr key={request.id}>
                          <td><strong className="owner-roadside-code">{request.request_code}</strong><span className="owner-roadside-row-sub">{remainingTime(request.expires_at)}</span></td>
                          <td className="owner-roadside-problem"><strong>{request.problem_description}</strong><span>{garage?.vehicle_types.find((item) => item.id === request.vehicle_type_id)?.name || 'Vehicle'} · {garage?.services.find((item) => item.id === request.service_id)?.name || 'Service'}</span></td>
                          <td>
                            <span className="owner-roadside-location"><MapPin size={13} /> {request.location_label || 'Nearby area'} ({request.exact_latitude !== null && request.exact_latitude !== undefined ? `${request.exact_latitude.toFixed(5)}, ${request.exact_longitude?.toFixed(5)}` : `${request.coarse_latitude.toFixed(3)}, ${request.coarse_longitude.toFixed(3)}`})</span>
                            {request.address && <span className="owner-roadside-row-sub">{request.address}</span>}
                            {request.contact_phone && <a href={`tel:${request.contact_phone}`} className="owner-roadside-phone"><Phone size={12} /> {request.contact_phone}</a>}
                          </td>
                          <td className="owner-roadside-date">{formatDate(request.created_at)}</td>
                          <td><span className={`owner-roadside-status ${requestStatusClass(request)}`}>{requestStatusLabel(request)}</span></td>
                          <td><div className="owner-roadside-row-actions">
                            {canAccept ? <><button type="button" className="owner-roadside-action is-primary" disabled={busyId === request.id} onClick={() => void runAction(request, 'accept')}><Check size={13} /> Accept</button><button type="button" className="owner-roadside-action" disabled={busyId === request.id} onClick={() => { setDeclineTarget(request); setDeclineReason(''); }}><X size={13} /> Decline</button></> : canCallRider ? <button type="button" className="owner-roadside-action is-primary" disabled={busyId === request.id} onClick={() => void callRider(request)}><Phone size={13}/>{busyId === request.id ? 'Calling…' : 'Call rider'}</button> : request.owner_calling_at ? <span className="owner-roadside-muted">Calling rider</span> : canProgress ? <button type="button" className="owner-roadside-action is-primary" disabled={busyId === request.id} onClick={() => void updateProgress(request)}>{nextLabel}<ArrowUpRight size={13} /></button> : <span className="owner-roadside-muted">No action</span>}
                          </div></td>
                        </tr>
                      );
                    })}</tbody>
                  </table>
                </div>
              )}
            </div>
          </section>

        </div>

      </main>

      {settingsModalMounted && (
        <div className={`owner-roadside-backdrop ${settingsModalOpen ? 'is-open' : 'is-closing'}`} onMouseDown={(event) => { if (event.target === event.currentTarget) closeSettingsModal(); }}>
          <section aria-labelledby="roadside-settings-title" aria-modal="true" className={`owner-roadside-modal ${settingsModalOpen ? 'is-open' : 'is-closing'}`} onKeyDown={(event) => { if (event.key === 'Escape') closeSettingsModal(); }} role="dialog">
            <header className="owner-roadside-modal-header"><div><h2 id="roadside-settings-title">Edit response settings</h2><p>Choose when and where your garage can respond. These settings are separate from your shop hours.</p></div><button type="button" className="owner-roadside-modal-close" aria-label="Close dialog" onClick={closeSettingsModal}>×</button></header>
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
          </section>
        </div>
      )}

      {declineTarget && (
        <div className="owner-roadside-backdrop is-open" onMouseDown={(event) => { if (event.target === event.currentTarget && busyId !== declineTarget.id) setDeclineTarget(null); }}>
          <section aria-labelledby="roadside-decline-title" aria-modal="true" className="owner-roadside-modal is-open owner-roadside-decline-modal" onKeyDown={(event) => { if (event.key === 'Escape' && busyId !== declineTarget.id) setDeclineTarget(null); }} role="alertdialog">
            <header className="owner-roadside-modal-header"><div className="owner-roadside-warning-mark"><AlertTriangle size={18}/></div><div><h2 id="roadside-decline-title">Decline this request?</h2><p>The rider will be told that your garage can’t take the request and will need to contact another garage.</p></div><button type="button" className="owner-roadside-modal-close" aria-label="Close dialog" disabled={busyId === declineTarget.id} onClick={() => setDeclineTarget(null)}>×</button></header>
            <div className="owner-roadside-decline-context"><strong>{declineTarget.request_code}</strong><span>{declineTarget.problem_description}</span></div>
            <label className="owner-roadside-field owner-roadside-decline-reason">Reason for rider <span>Optional</span><textarea rows={3} maxLength={100} value={declineReason} onChange={(event) => setDeclineReason(event.target.value)} placeholder="For example, outside service area or no mechanic available" /></label>
            <footer className="owner-roadside-decline-actions"><button type="button" className="owner-roadside-action" disabled={busyId === declineTarget.id} onClick={() => setDeclineTarget(null)}>Keep request</button><button type="button" className="owner-roadside-action is-danger" disabled={busyId === declineTarget.id} onClick={() => void confirmDecline()}>{busyId === declineTarget.id ? 'Declining…' : 'Decline request'}</button></footer>
          </section>
        </div>
      )}
    </AppShell>
  );
};
