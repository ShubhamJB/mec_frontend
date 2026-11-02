import React, { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { AlertCircle, ArrowLeft, ArrowRight, Check, CheckCheck, Clock3, Send, UserCheck, Wrench, LocateFixed, LoaderCircle, MapPin, RefreshCw, ShieldCheck, Siren, Star, X } from 'lucide-react';
import { ApiError, apiClient } from '../../api/client';
import { GuestRoadsideRequestStatus, PaginatedResponse, RoadsideRequestItem, RoadsideRequestStatus, ServiceItem, VehicleTypeItem } from '../../api/types';
import { PublicLayout } from '../../components/PublicLayout';
import { StarRating } from '../../components/StarRating';
import { useToast } from '../../components/ToastProvider';
import { SingleSelect } from '../../components/Dropdown';
import { useAuth } from '../../auth/AuthContext';
import './customer-roadside.css';

interface EligibleGarage { id: string; name: string; latitude: number; longitude: number; distance_km: number; average_rating: number | null; review_count: number; callback_expectation_minutes: number; availability_note: string | null }
interface EligibleResponse { items: EligibleGarage[]; search_radius_km: number }
interface LocationLabelResponse { location_label: string | null }
const activeStatuses: RoadsideRequestStatus[] = ['PENDING','ACCEPTED','CONTACTED','CONFIRMED','IN_PROGRESS'];
const statusText: Record<RoadsideRequestStatus,string> = { PENDING:'Waiting for garage', ACCEPTED:'Garage accepted', CONTACTED:'Garage calling you', CONFIRMED:'Help confirmed', IN_PROGRESS:'Help is underway', COMPLETED:'Completed', DECLINED:'Declined', EXPIRED:'Expired', CANCELLED:'Cancelled', UNABLE_TO_SERVE:'Unable to serve' };
const phonePattern = /^\+[1-9]\d{7,14}$/;
const timelineSteps: Array<{ status: RoadsideRequestStatus; label: string; detail: string; icon: React.ElementType }> = [
  { status: 'PENDING', label: 'Request sent', detail: 'Your request reached the garage.', icon: Send },
  { status: 'ACCEPTED', label: 'Garage accepted', detail: 'The garage will call to confirm the problem.', icon: UserCheck },
  { status: 'CONFIRMED', label: 'Help confirmed', detail: 'Details and next steps are agreed.', icon: ShieldCheck },
  { status: 'IN_PROGRESS', label: 'Help underway', detail: 'The mechanic is assisting you.', icon: Wrench },
  { status: 'COMPLETED', label: 'Garage marked complete', detail: 'The garage finished the job.', icon: CheckCheck },
];
const progressIndex = (status: RoadsideRequestStatus) => {
  if (status === 'CONTACTED') return 1;
  return timelineSteps.findIndex((step) => step.status === status);
};
const nextStepText = (status: RoadsideRequestStatus, ownerCallingAt?: string | null, callFailed?: boolean) => {
  if (callFailed) return 'The garage has not followed up. Call the garage directly or choose another available garage.';
  if (status === 'PENDING') return 'The garage is reviewing your request. Keep your phone nearby in case they accept and call.';
  if (status === 'ACCEPTED') return ownerCallingAt ? 'The garage is calling now. Keep your phone nearby; we’ll check whether you reached each other.' : 'The garage accepted and should call you to confirm the problem before travelling.';
  if (status === 'CONTACTED') return 'You’ve been contacted. Confirm the problem and agree on the next step with the mechanic.';
  if (status === 'CONFIRMED') return 'The garage confirmed the request. Wait for the mechanic to begin assistance.';
  if (status === 'IN_PROGRESS') return 'The garage marked assistance as underway.';
  if (status === 'COMPLETED') return 'The garage marked this request complete. Customer confirmation and feedback will be available in a later update.';
  if (status === 'DECLINED') return 'This garage cannot take the request. Choose another available garage or widen your search.';
  if (status === 'EXPIRED') return 'This request expired before the garage responded. Choose another garage to try again.';
  if (status === 'CANCELLED') return 'This request was cancelled.';
  return 'The garage cannot complete this request. Choose another available garage or contact them directly.';
};
const callCheckIsDue = (status: RoadsideRequestStatus, acceptedAt: string | null | undefined, ownerCallingAt: string | null | undefined, confirmed: boolean | null | undefined, now: number) => (
  status === 'ACCEPTED' && confirmed == null && !!(ownerCallingAt || acceptedAt) && now - new Date(ownerCallingAt || acceptedAt!).getTime() >= 20_000
);

type RoadsideResolution = 'RESOLVED' | 'PARTIAL' | 'UNRESOLVED';
const CompletionFeedbackForm: React.FC<{
  busy: boolean;
  autoOpen?: boolean;
  onSubmit: (resolution: RoadsideResolution, rating: number | null, comment: string) => void;
}> = ({ busy, autoOpen = false, onSubmit }) => {
  const [resolution, setResolution] = useState<RoadsideResolution | ''>('');
  const [rating, setRating] = useState<number | null>(null);
  const [comment, setComment] = useState('');
  const [modalMounted, setModalMounted] = useState(autoOpen);
  const [modalOpen, setModalOpen] = useState(false);
  const closeTimer = useRef<number | null>(null);
  const starLabels = ['', 'Poor', 'Fair', 'Good', 'Very good', 'Excellent'];

  useEffect(() => {
    if (!autoOpen) return;
    setModalMounted(true);
    window.requestAnimationFrame(() => setModalOpen(true));
  }, [autoOpen]);
  useEffect(() => () => { if (closeTimer.current !== null) window.clearTimeout(closeTimer.current); }, []);

  const openModal = () => {
    if (closeTimer.current !== null) window.clearTimeout(closeTimer.current);
    setModalMounted(true);
    window.requestAnimationFrame(() => setModalOpen(true));
  };
  const closeModal = () => {
    if (busy) return;
    setModalOpen(false);
    if (closeTimer.current !== null) window.clearTimeout(closeTimer.current);
    closeTimer.current = window.setTimeout(() => setModalMounted(false), window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 1 : 360);
  };

  return <>
    {!modalMounted && <button type="button" className="cr-feedback-reopen" onClick={openModal}><span><strong>Close the loop</strong><small>Tell us how the roadside service went.</small></span><span className="cr-feedback-reopen-action">Share feedback <ArrowRight size={15}/></span></button>}
    {modalMounted && <div className={`cr-feedback-backdrop ${modalOpen ? 'is-open' : 'is-closing'}`} onMouseDown={(event) => { if (event.target === event.currentTarget) closeModal(); }}>
      <section className={`cr-feedback-modal ${modalOpen ? 'is-open' : 'is-closing'}`} role="dialog" aria-modal="true" aria-labelledby="cr-feedback-title" onKeyDown={(event) => { if (event.key === 'Escape') closeModal(); }}>
        <header className="cr-feedback-modal-header"><div><span className="cr-kicker">CLOSE THE LOOP</span><h2 id="cr-feedback-title">Was the issue resolved?</h2><p>The garage marked this request complete. Your answer helps us follow up if you still need help.</p></div><button className="cr-feedback-close" type="button" aria-label="Close feedback" onClick={closeModal}><X size={18}/></button></header>
        <form className="cr-feedback-form" onSubmit={(event) => { event.preventDefault(); if (resolution) onSubmit(resolution, rating, comment.trim()); }}>
          <fieldset className="cr-feedback-resolution"><legend>Your result <span>Choose one</span></legend><div className="cr-feedback-options" role="group" aria-label="Was the issue resolved?">
            {([
              { value: 'RESOLVED' as const, title: 'Yes, it’s fixed', detail: 'I’m back on the road' },
              { value: 'PARTIAL' as const, title: 'Partly resolved', detail: 'I still need some help' },
              { value: 'UNRESOLVED' as const, title: 'No, it remains', detail: 'Please follow up with me' },
            ]).map((option) => <button key={option.value} className={`cr-feedback-option ${resolution === option.value ? 'is-selected' : ''}`} type="button" aria-pressed={resolution === option.value} onClick={() => setResolution(option.value)}><span className="cr-feedback-option-mark">{resolution === option.value && <Check size={13}/>}</span><span><strong>{option.title}</strong><small>{option.detail}</small></span></button>)}
          </div></fieldset>
          <div className="cr-feedback-rating-block"><div className="cr-feedback-label-row"><span>Rate the service <small>Optional</small></span>{rating && <button type="button" className="cr-feedback-skip-rating" onClick={() => setRating(null)}>Clear rating</button>}</div><div className="cr-feedback-star-row"><div className="cr-feedback-stars" role="group" aria-label="Rate the service from one to five stars">{[1,2,3,4,5].map((value) => <button key={value} type="button" className={rating !== null && value <= rating ? 'is-selected' : ''} aria-label={`${value} ${value === 1 ? 'star' : 'stars'}`} aria-pressed={rating === value} onClick={() => setRating(value)}><Star size={27} fill={rating !== null && value <= rating ? 'currentColor' : 'none'} strokeWidth={1.7}/></button>)}</div><span className={`cr-feedback-rating-caption ${rating ? 'has-rating' : ''}`}>{rating ? starLabels[rating] : 'Select a rating'}</span></div></div>
          <label className="cr-label cr-feedback-comment">Anything to add? <span>Optional</span><textarea rows={3} maxLength={1000} value={comment} onChange={(event) => setComment(event.target.value)} placeholder="Share a short note for the garage…"/></label>
          <footer className="cr-feedback-actions"><button type="button" className="cr-feedback-cancel" disabled={busy} onClick={closeModal}>Not now</button><button className="cr-primary" type="submit" disabled={busy || !resolution}>{busy ? 'Sending feedback…' : 'Send feedback'}<ArrowRight size={16}/></button></footer>
        </form>
      </section>
    </div>}
  </>;
};

const formatStepTime = (value?: string | null) => {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return `${date.toLocaleDateString(undefined, { day: 'numeric', month: 'short' })}, ${date.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', hour12: false })}`;
};

const RequestProgress: React.FC<{ status: RoadsideRequestStatus; acceptedAt?: string | null; updatedAt?: string | null }> = ({ status, acceptedAt, updatedAt }) => {
  const current = progressIndex(status);
  const terminal = ['DECLINED', 'EXPIRED', 'CANCELLED', 'UNABLE_TO_SERVE'].includes(status);
  const completed = status === 'COMPLETED';
  const pillLabel = terminal ? statusText[status] : completed ? 'Completed' : 'In progress';
  return <div className={`cr-progress ${terminal ? 'is-terminal' : ''}`}>
    <div className="cr-progress-head">
      <span className="cr-progress-tag">Timeline</span>
      <span className="cr-progress-dash" aria-hidden="true" />
      <span className={`cr-progress-pill ${terminal ? 'is-bad' : completed ? 'is-done' : ''}`}>{terminal ? <X size={13} strokeWidth={2.4} /> : <Check size={13} strokeWidth={2.6} />}{pillLabel}</span>
    </div>
    <ol aria-label="Request progress">
      {timelineSteps.map((step, index) => {
        const Icon = step.icon;
        const isDone = !terminal && (index < current || completed);
        const isCurrent = !terminal && !completed && index === current;
        const time = index === 1 ? formatStepTime(acceptedAt) : isCurrent ? formatStepTime(updatedAt) : null;
        return <li key={step.status} className={`${isDone ? 'is-done' : ''} ${isCurrent ? 'is-current' : ''}`} aria-current={isCurrent ? 'step' : undefined}>
          <span className="cr-progress-mark" aria-hidden="true">{isDone ? <Check size={16} strokeWidth={2.4} /> : <Icon size={16} strokeWidth={1.7} />}</span>
          <div className="cr-progress-copy"><strong>{step.label}</strong><span>{step.detail}</span></div>
          {time && <time className="tabular-nums">{time}</time>}
        </li>;
      })}
    </ol>
  </div>;
};

export const CustomerRoadsidePage: React.FC = () => {
  const { showToast, dismissToastByKey } = useToast();
  const { user } = useAuth();
  const [services,setServices] = useState<ServiceItem[]>([]); const [vehicles,setVehicles] = useState<VehicleTypeItem[]>([]);
  const [requests,setRequests] = useState<RoadsideRequestItem[]>([]); const [garages,setGarages] = useState<EligibleGarage[]>([]);
  const [latitude,setLatitude] = useState(''); const [longitude,setLongitude] = useState(''); const [address,setAddress] = useState('');
  const [locationLabel,setLocationLabel] = useState(''); const [manualCoordinates,setManualCoordinates] = useState(false);
  const [serviceId,setServiceId] = useState(''); const [vehicleId,setVehicleId] = useState(''); const [radius,setRadius] = useState(25);
  const [selectedGarage,setSelectedGarage] = useState(''); const [problem,setProblem] = useState(''); const [phone,setPhone] = useState(''); const [consent,setConsent] = useState(false);
  const [searching,setSearching] = useState(false); const [sending,setSending] = useState(false); const [loading,setLoading] = useState(true); const [locating,setLocating] = useState(false); const [tab,setTab] = useState<'request'|'requests'>('request');
  const [createdRequestCode,setCreatedRequestCode] = useState<string | null>(null);
  const [resumeRequestId,setResumeRequestId] = useState(() => new URLSearchParams(window.location.search).get('request') || '');
  const [resumePhone,setResumePhone] = useState('');
  const [resuming,setResuming] = useState(false);
  const [hasSearched,setHasSearched] = useState(false);
  const [guestTracking,setGuestTracking] = useState<{ id: string; phone: string } | null>(null);
  const [guestGarageId,setGuestGarageId] = useState<string | null>(null);
  const [requestedGarageIds,setRequestedGarageIds] = useState<string[]>([]);
  const [declinedGarageIds,setDeclinedGarageIds] = useState<string[]>([]);
  const [guestStatus,setGuestStatus] = useState<GuestRoadsideRequestStatus | null>(null);
  const [,setContactCheckBusyId] = useState<string | null>(null);
  const [feedbackBusyId,setFeedbackBusyId] = useState<string | null>(null);
  const [feedbackExploreOpen,setFeedbackExploreOpen] = useState(false);
  const [clockNow,setClockNow] = useState(Date.now());
  const [requestModalMounted,setRequestModalMounted] = useState(false);
  const [requestModalOpen,setRequestModalOpen] = useState(false);
  const requestModalTimer = useRef<number | null>(null);

  const loadRequests = useCallback(async () => { try { setRequests(await apiClient<RoadsideRequestItem[]>('/roadside/requests',{skipGlobalLoader:true})); } catch(e) { if (!(e instanceof ApiError && e.status===404)) showToast(e instanceof ApiError?e.message:'Could not load your requests.','error'); } finally { setLoading(false); } },[showToast]);
  useEffect(()=>{ Promise.all([apiClient<PaginatedResponse<ServiceItem>>('/services?limit=100',{skipGlobalLoader:true}),apiClient<PaginatedResponse<VehicleTypeItem>>('/vehicle-types?limit=100',{skipGlobalLoader:true})]).then(([s,v])=>{setServices(s.items||[]);setVehicles(v.items||[]);}).catch(()=>showToast('Could not load vehicle and service options.','error')); if (user?.role === 'CUSTOMER') void loadRequests(); else setLoading(false); },[loadRequests,showToast,user]);
  useEffect(() => { const timer = window.setInterval(() => setClockNow(Date.now()), 1000); return () => window.clearInterval(timer); }, []);
  useEffect(() => () => { if (requestModalTimer.current !== null) window.clearTimeout(requestModalTimer.current); }, []);
  useEffect(() => {
    if (!guestTracking) return;
    let cancelled = false;
    const refreshStatus = async () => {
      try {
        const query = new URLSearchParams({ contact_phone: guestTracking.phone });
        const status = await apiClient<GuestRoadsideRequestStatus>(`/roadside/requests/${guestTracking.id}/guest-status?${query}`, { skipGlobalLoader: true });
        if (!cancelled) setGuestStatus(status);
      } catch { /* Keep the last status visible if the connection is temporarily unavailable. */ }
    };
    void refreshStatus();
    const interval = window.setInterval(() => void refreshStatus(), 8000);
    return () => { cancelled = true; window.clearInterval(interval); };
  }, [guestTracking]);
  useEffect(() => {
    if (user?.role !== 'CUSTOMER' || tab !== 'requests') return;
    const interval = window.setInterval(() => void loadRequests(), 10000);
    return () => window.clearInterval(interval);
  }, [loadRequests, tab, user?.role]);
  useEffect(() => {
    if (guestStatus?.status !== 'DECLINED' || !guestGarageId) return;
    setDeclinedGarageIds((ids) => ids.includes(guestGarageId) ? ids : [...ids, guestGarageId]);
    setRequestedGarageIds((ids) => ids.filter((id) => id !== guestGarageId));
    setGuestGarageId(null);
    setSelectedGarage('');
  }, [guestStatus?.status, guestGarageId]);
  const useLocation = () => { if (!navigator.geolocation) return showToast('Location is not available in this browser.','error'); setLocating(true); setLocationLabel(''); navigator.geolocation.getCurrentPosition(async (p)=>{const lat=String(p.coords.latitude);const lng=String(p.coords.longitude);setLatitude(lat);setLongitude(lng);setManualCoordinates(false);try{const q=new URLSearchParams({latitude:lat,longitude:lng});const place=await apiClient<LocationLabelResponse>(`/roadside/location-label?${q}`,{skipGlobalLoader:true});setLocationLabel(place.location_label||'Current location');}catch{setLocationLabel('Current location');}finally{setLocating(false);}},()=>{setLocating(false);showToast('Could not access your location. You can enter coordinates manually.','error');},{enableHighAccuracy:true,timeout:12000}); };
  const searchGarages = async (searchRadius:number) => { if(!latitude||!longitude){showToast('Use your current location or enter coordinates manually first.','error');return;}setSearching(true); setGarages([]);setSelectedGarage('');setCreatedRequestCode(null);setHasSearched(false); try { const q=new URLSearchParams({latitude,longitude,vehicle_type_id:vehicleId,service_id:serviceId,search_radius_km:String(searchRadius)}); const result=await apiClient<EligibleResponse>(`/roadside/eligible-garages?${q}`,{skipGlobalLoader:true});setGarages(result.items.slice(0,10));setHasSearched(true); if (!result.items.length) showToast('No garage nearby is accepting this vehicle and service combination. Try a wider search area.','info'); } catch(e) { showToast(e instanceof ApiError?e.message:'Could not find available garages.','error'); } finally {setSearching(false);} };
  const findGarages = (e:FormEvent) => { e.preventDefault(); void searchGarages(radius); };
  const resumeGuestRequest = async (event: FormEvent) => {
    event.preventDefault();
    const normalizedPhone = resumePhone.trim();
    if (!phonePattern.test(normalizedPhone)) return showToast('Enter the same phone number used for this request, including country code.','error');
    setResuming(true);
    try {
      const query = new URLSearchParams({ contact_phone: normalizedPhone });
      const status = await apiClient<GuestRoadsideRequestStatus>(`/roadside/requests/${resumeRequestId}/guest-status?${query}`, { skipGlobalLoader: true });
      setGuestTracking({ id: resumeRequestId, phone: normalizedPhone });
      setGuestStatus(status);
      setCreatedRequestCode(status.request_code);
      showToast('Your roadside request is restored.','success');
    } catch (error) {
      showToast(error instanceof ApiError && error.status === 404 ? 'We could not find a request matching that link and phone number.' : error instanceof ApiError ? error.message : 'Could not restore this request.','error');
    } finally { setResuming(false); }
  };
  const submitRequest=async(e:FormEvent)=>{e.preventDefault(); if(!selectedGarage)return; if(!phonePattern.test(phone.trim()))return showToast('Enter a phone number in international format, such as +9779812345678.','error'); setSending(true); try { const garageId=selectedGarage; const result=await apiClient<RoadsideRequestItem>('/roadside/requests',{method:'POST',body:JSON.stringify({garage_id:garageId,vehicle_type_id:vehicleId,service_id:serviceId,problem_description:problem.trim(),latitude:Number(latitude),longitude:Number(longitude),address:address.trim()||locationLabel.trim()||null,contact_phone:phone.trim(),consent_to_share_after_acceptance:consent}),skipGlobalLoader:true}); setCreatedRequestCode(result.request_code); setRequestedGarageIds((ids)=>ids.includes(garageId)?ids:[...ids,garageId]); if(user?.role==='CUSTOMER') setRequests((items)=>[result,...items.filter((item)=>item.id!==result.id)]); else { setGuestGarageId(garageId); setGuestTracking({id:result.id,phone:phone.trim()}); setGuestStatus(null); setResumeRequestId(result.id); window.history.replaceState({}, '', `${window.location.pathname}?request=${encodeURIComponent(result.id)}`); } showToast('Request sent. Bookmark this page to check its status later.','success');setTab(user?.role==='CUSTOMER'?'requests':'request');closeRequestModal();setProblem('');setConsent(false);if(user?.role==='CUSTOMER') await loadRequests(); } catch(e) {showToast(e instanceof ApiError?e.message:'Could not send your request.','error');} finally {setSending(false);} };
  const cancelRequest=async(id:string)=>{try{await apiClient(`/roadside/requests/${id}/cancel`,{method:'POST',skipGlobalLoader:true});showToast('Request cancelled.','warning');await loadRequests();}catch(e){showToast(e instanceof ApiError?e.message:'Could not cancel request.','error');}};
  const answerCallCheck=async(id:string,garageCalled:boolean,contactPhone?:string)=>{setContactCheckBusyId(id);try{const query=contactPhone?`?${new URLSearchParams({contact_phone:contactPhone})}`:'';const result=await apiClient<GuestRoadsideRequestStatus>(`/roadside/requests/${id}/contact-check${query}`,{method:'POST',body:JSON.stringify({garage_called:garageCalled}),skipGlobalLoader:true});if(contactPhone)setGuestStatus(result);else await loadRequests();showToast(garageCalled?'Thanks for confirming the garage called.':'We have alerted the garage that you are still waiting.',garageCalled?'success':'info');}catch(e){showToast(e instanceof ApiError?e.message:'Could not submit your response.','error');}finally{setContactCheckBusyId(null);}};
  const callingNoticeRef = useRef<Set<string>>(new Set());
  const callCheckShownRef = useRef<Set<string>>(new Set());
  const followupFailedRef = useRef<Set<string>>(new Set());
  useEffect(() => {
    type TrackedRequest = { id: string; status: RoadsideRequestStatus; accepted_at?: string | null; owner_calling_at?: string | null; customer_contact_confirmed?: boolean | null; call_followup_failed?: boolean; phone?: string };
    const tracked: TrackedRequest[] = guestTracking && guestStatus
      ? [{ ...guestStatus, id: guestTracking.id, phone: guestTracking.phone }]
      : requests.map((request) => ({ ...request, phone: undefined }));
    tracked.forEach((item) => {
      const callCheckKey = `call-check-${item.id}`;
      const waitingForCall = item.status === 'ACCEPTED' && item.customer_contact_confirmed == null;
      const marker = `${item.id}:${item.owner_calling_at ?? item.accepted_at ?? ''}`;

      if (waitingForCall && item.owner_calling_at && !callingNoticeRef.current.has(marker)) {
        callingNoticeRef.current.add(marker);
        showToast('Please keep your phone nearby. We’ll check with you again in 20 seconds.', 'info', 7000, { title: 'The garage is calling you now', key: `calling-${marker}` });
      }

      const due = callCheckIsDue(item.status, item.accepted_at, item.owner_calling_at, item.customer_contact_confirmed, clockNow);
      if (due && !callCheckShownRef.current.has(marker)) {
        callCheckShownRef.current.add(marker);
        showToast('It has been 20 seconds since the latest call update. Let us know so we can follow up.', 'warning', 0, {
          title: 'Did the garage call you?',
          key: callCheckKey,
          actions: [
            { label: 'Yes, they called', primary: true, onClick: () => void answerCallCheck(item.id, true, item.phone) },
            { label: 'Not yet', onClick: () => void answerCallCheck(item.id, false, item.phone) },
          ],
        });
      }
      if (!due) dismissToastByKey(callCheckKey);

      if (item.status === 'ACCEPTED' && item.customer_contact_confirmed === false && item.call_followup_failed && !followupFailedRef.current.has(item.id)) {
        followupFailedRef.current.add(item.id);
        showToast('The garage has not called you within 3 minutes. You can call the garage directly or choose another available garage.', 'error', 12000, { title: 'The garage has not called', key: `failed-${item.id}` });
      }
    });
  }, [guestStatus, guestTracking, requests, clockNow]);
  const submitFeedback=async(id:string,resolution:RoadsideResolution,rating:number|null,comment:string,contactPhone?:string)=>{setFeedbackBusyId(id);try{const query=contactPhone?`?${new URLSearchParams({contact_phone:contactPhone})}`:'';await apiClient(`/roadside/requests/${id}/feedback${query}`,{method:'POST',body:JSON.stringify({resolution,rating,comment:comment||null}),skipGlobalLoader:true});if(contactPhone){setGuestStatus((current)=>current?{...current,customer_feedback_resolution:resolution,customer_feedback_rating:rating,customer_feedback_comment:comment||null,customer_feedback_at:new Date().toISOString()}:current);}else await loadRequests();showToast(resolution==='UNRESOLVED'?'Thanks. We’ve asked the garage to follow up.':'Thanks for sharing how the roadside service went.','success');setFeedbackExploreOpen(true);}catch(error){showToast(error instanceof ApiError?error.message:'Could not submit feedback.','error');}finally{setFeedbackBusyId(null);}};
  const activeCount=requests.filter(r=>activeStatuses.includes(r.status)).length;
  const declinedFromHistory = useMemo(() => requests.filter((request) => request.status === 'DECLINED').map((request) => request.garage_id), [requests]);
  const excludedGarageIds = useMemo(() => new Set([...declinedGarageIds, ...declinedFromHistory]), [declinedGarageIds, declinedFromHistory]);
  const lockedGarageIds = useMemo(() => new Set([...requestedGarageIds, ...requests.filter((request) => activeStatuses.includes(request.status)).map((request) => request.garage_id), ...(guestGarageId ? [guestGarageId] : [])]), [guestGarageId, requestedGarageIds, requests]);
  const visibleGarages = useMemo(() => garages.filter((garage) => !excludedGarageIds.has(garage.id)).slice(0, 3), [garages, excludedGarageIds]);
  const nextRadius = [5, 10, 25, 50, 100].find((value) => value > radius);
  const feedbackPromptRequestId = requests.find((request) => request.status === 'COMPLETED' && !request.customer_feedback_resolution)?.id;
  const closeRequestModal = () => {
    if (sending) return;
    setRequestModalOpen(false);
    if (requestModalTimer.current !== null) window.clearTimeout(requestModalTimer.current);
    requestModalTimer.current = window.setTimeout(() => {
      setRequestModalMounted(false);
      setSelectedGarage('');
    }, window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 1 : 530);
  };
  const openRequestModal = (garageId: string) => {
    if (requestModalTimer.current !== null) window.clearTimeout(requestModalTimer.current);
    setSelectedGarage(garageId);
    setRequestModalMounted(true);
    window.requestAnimationFrame(() => setRequestModalOpen(true));
  };

  return <PublicLayout><main className="customer-roadside">
    <Link className="cr-back" to="/garages"><ArrowLeft size={15}/> Back to garages</Link>
    <header className="cr-header"><div><span className="cr-kicker"><Siren size={14}/> RIDER SUPPORT</span><h1>Get help where you are.</h1><p>Share your location, choose a nearby garage, and send one clear request. You can track the response without creating an account.</p></div><div className="cr-response-note"><ShieldCheck size={18}/><span>Your exact location and phone are shared with the garage only after it accepts.</span></div></header>
    <nav className="cr-tabs" aria-label="Roadside pages"><button className={tab==='request'?'active':''} onClick={()=>setTab('request')}>Find roadside help</button>{user?.role==='CUSTOMER'&&<button className={tab==='requests'?'active':''} onClick={()=>setTab('requests')}>My requests <span>{activeCount}</span></button>}</nav>
    {tab==='request' ? resumeRequestId && !guestTracking ? <section className="cr-history cr-resume" aria-labelledby="cr-resume-title">
      <div className="cr-resume-heading"><div><span className="cr-kicker"><ShieldCheck size={14}/> PRIVATE REQUEST</span><h2 id="cr-resume-title">Continue your roadside request</h2><p>Your request is still here. Verify the phone number you used so we can show its latest status.</p></div><div className="cr-resume-reference"><span>REQUEST REFERENCE</span><strong>{resumeRequestId.slice(0, 8)}…</strong></div></div>
      <div className="cr-resume-content"><div className="cr-resume-context"><ShieldCheck size={17}/><p>Only someone with the original phone number can reopen this request. Your number is checked for verification and isn’t saved in this browser.</p></div>
      <form className="cr-resume-form" onSubmit={resumeGuestRequest}><label className="cr-label">Phone number used for this request<input autoComplete="tel" inputMode="tel" required type="tel" value={resumePhone} onChange={(event) => setResumePhone(event.target.value)} placeholder="+9779812345678"/><small>Include your country code.</small></label><button className="cr-primary" type="submit" disabled={resuming}><span>{resuming ? 'Checking request…' : 'View request status'}</span><ArrowRight size={16}/></button></form></div>
    </section> : <div className="cr-workspace"><form className={`cr-form ${locating ? 'is-locating' : ''}`} onSubmit={findGarages} aria-busy={locating}>
      <div className="cr-step-title"><div><h2>Pin down your location</h2><p>We use this to find garages that can reach you.</p></div></div>
      <button type="button" className="cr-location-button" onClick={useLocation} disabled={locating}>{locating?<LoaderCircle className="cr-location-spinner" size={16} aria-hidden="true"/>:<LocateFixed size={16}/>}<span>{locating?'Finding your location…':'Use my current location'}</span></button>
      {(latitude&&longitude)&&<label className="cr-label cr-detected-location-field">Your current location<input value={locationLabel} onChange={e=>setLocationLabel(e.target.value)} placeholder="Location found" aria-live="polite"/><small>This area label helps identify where you’re stranded.</small></label>}
      <button type="button" className="cr-manual-location-toggle" aria-expanded={manualCoordinates} onClick={()=>setManualCoordinates((open)=>!open)}>{manualCoordinates?'Hide manual coordinate entry':'Enter latitude and longitude manually'}</button>
      {manualCoordinates&&<div className="cr-coordinates"><label>Latitude<input inputMode="decimal" value={latitude} onChange={e=>{setLatitude(e.target.value);setLocationLabel('');}} placeholder="27.7172"/></label><label>Longitude<input inputMode="decimal" value={longitude} onChange={e=>{setLongitude(e.target.value);setLocationLabel('');}} placeholder="85.3240"/></label></div>}
      <label className="cr-label">Nearest landmark <span>Optional</span><input value={address} onChange={e=>setAddress(e.target.value)} placeholder="e.g. Ring Road, near Kalanki"/></label>
      <div className="cr-coordinates"><div className="cr-select-field"><span>Vehicle type</span><SingleSelect variant="field" required label="Vehicle type" placeholder="Choose vehicle" value={vehicleId} onChange={value=>{setVehicleId(value);setHasSearched(false);setGarages([]);setSelectedGarage('');}} options={vehicles.map(v=>({value:v.id,label:v.name}))} /></div><div className="cr-select-field"><span>Help needed</span><SingleSelect variant="field" required label="Help needed" placeholder="Choose service" value={serviceId} onChange={value=>{setServiceId(value);setHasSearched(false);setGarages([]);setSelectedGarage('');}} options={services.map(s=>({value:s.id,label:s.name}))} /></div></div>
      <div className="cr-label cr-radius-field"><span>Search radius</span><SingleSelect variant="field" label="Search radius" value={String(radius)} onChange={value=>setRadius(Number(value))} options={[5,10,25,50,100].map(x=>({value:String(x),label:`Within ${x} km`}))} /></div>
      <button type="submit" className="cr-primary" disabled={searching||!vehicleId||!serviceId||!latitude||!longitude}>{searching?'Finding available garages…':'Find available garages'}<ArrowRight size={16}/></button>
    </form><section className="cr-results">{createdRequestCode&&<div className={`cr-ticket ${guestStatus?.status==='DECLINED'||guestStatus?.call_followup_failed?'is-attention':''}`}>
      <header className="cr-ticket-header"><div><span className="cr-kicker">ROADSIDE REQUEST</span><h2>{guestStatus?.garage_name || garages.find((garage) => garage.id === guestGarageId)?.name || 'Request sent'}</h2></div><span className={`cr-status ${guestStatus?.status && activeStatuses.includes(guestStatus.status) ? 'live' : ''} ${guestStatus?.call_followup_failed ? 'is-call-failed' : ''}`}><i/>{guestStatus?.call_followup_failed ? 'Needs attention' : guestStatus ? statusText[guestStatus.status] : 'Waiting for garage'}</span></header>
      <div className="cr-ticket-reference"><span>Reference</span><strong>{createdRequestCode}</strong><small>Bookmark this page to return later. You’ll need the same phone number to view updates.</small></div>
      {guestStatus && <RequestProgress status={guestStatus.status} acceptedAt={guestStatus.accepted_at} updatedAt={guestStatus.updated_at} />}
      <div className="cr-ticket-next"><strong>What happens next</strong><p>{guestStatus ? nextStepText(guestStatus.status, guestStatus.owner_calling_at, guestStatus.call_followup_failed) : 'The garage will review your request and call if it accepts. Keep this page open for updates.'}</p>{guestStatus?.status === 'DECLINED' && guestStatus.decline_reason && <small>Garage note: {guestStatus.decline_reason}</small>}</div>
      {guestStatus?.quote_amount && <div className="cr-ticket-quote"><span>Garage estimate</span><strong>{guestStatus.quote_currency} {guestStatus.quote_amount}</strong>{guestStatus.eta_minutes && <small>Expected arrival: about {guestStatus.eta_minutes} minutes</small>}</div>}
      {guestStatus?.status === 'COMPLETED' && (guestStatus.customer_feedback_resolution ? <div className={`cr-feedback-thanks ${guestStatus.customer_feedback_resolution === 'UNRESOLVED' ? 'is-attention' : ''}`}><strong>{guestStatus.customer_feedback_resolution === 'UNRESOLVED' ? 'The garage has been asked to follow up.' : 'Thanks for confirming the outcome.'}</strong><span>{guestStatus.customer_feedback_resolution === 'RESOLVED' ? 'You said the issue is fixed.' : guestStatus.customer_feedback_resolution === 'PARTIAL' ? 'You said you still need some help.' : 'You said the issue remains.'}</span>{guestStatus.customer_feedback_rating && <StarRating rating={guestStatus.customer_feedback_rating} size="small" />}</div> : <CompletionFeedbackForm autoOpen busy={feedbackBusyId === guestTracking?.id} onSubmit={(resolution, rating, comment) => { if (guestTracking) void submitFeedback(guestTracking.id, resolution, rating, comment, guestTracking.phone); }} />)}
    </div>}<div className="cr-results-heading"><div><span className="cr-kicker">AVAILABLE NOW</span><h2>Choose a garage</h2><p>Showing 3 nearest matches from up to 10 garages. A declined request makes room for the next match.</p></div><span className="cr-result-count">{visibleGarages.length}{garages.length > 3 ? ' of ' + garages.length : ''} shown</span></div>
      {!visibleGarages.length ? <div className="cr-empty"><MapPin size={20}/><strong>{hasSearched?'No matching garages in this search':'Choose your vehicle and the help you need'}</strong><p>{hasSearched?`No currently available roadside garage within ${radius} km supports both selections. Increase your search distance to see more nearby options.`:'Garages appear only when they are available now and support your selected vehicle and service.'}</p>{hasSearched&&nextRadius&&<button type="button" className="cr-widen-search" disabled={searching} onClick={()=>{setRadius(nextRadius);void searchGarages(nextRadius);}}>{searching?'Searching…':`Search within ${nextRadius} km`}<ArrowRight size={15}/></button>}</div> : <div className="cr-garage-list">{visibleGarages.map(g=>{const isLocked=lockedGarageIds.has(g.id);return <button type="button" key={g.id} disabled={isLocked} aria-disabled={isLocked} className={`cr-garage ${selectedGarage===g.id?'selected':''} ${isLocked?'is-requested':''}`} onClick={()=>openRequestModal(g.id)}><span className="cr-radio">{selectedGarage===g.id&&<Check size={13}/>}</span><span className="cr-garage-info"><strong>{g.name}</strong><span>{isLocked?'Request sent · waiting for the garage':`${g.distance_km.toFixed(1)} km away · usually replies in ${g.callback_expectation_minutes} min`}</span>{g.availability_note&&<small>{g.availability_note}</small>}</span><span className="cr-rating">{g.average_rating===null?'New':<StarRating rating={g.average_rating} size="small"/>}<small>{g.review_count} {g.review_count === 1 ? 'review' : 'reviews'}</small></span></button>})}</div>}
    </section></div> : <section className="cr-history"><div className="cr-results-heading"><div><span className="cr-kicker">REQUEST HISTORY</span><h2>Your roadside requests</h2><p>Refresh to check for an update from a garage.</p></div><button className="cr-refresh" onClick={()=>void loadRequests()}><RefreshCw size={14}/> Refresh</button></div>{loading?<p className="cr-empty">Loading your requests…</p>:requests.length===0?<div className="cr-empty"><AlertCircle size={20}/><strong>No requests yet</strong><p>When you request help, its status and garage response will appear here.</p></div>:<div className="cr-history-list">{requests.map(r=><article className="cr-history-item" key={r.id}><div><span className={`cr-status ${activeStatuses.includes(r.status)?'live':''} ${r.call_followup_failed?'is-call-failed':''}`}><i/>{r.call_followup_failed?'Failed to address':statusText[r.status]}</span><h3>{r.garage_name}</h3><p>{r.problem_description}</p><small><Clock3 size={13}/> {new Date(r.created_at).toLocaleString()} · Ref {r.request_code}</small>{r.quote_amount&&<p className="cr-quote">Quote: {r.quote_currency} {r.quote_amount}{r.eta_minutes?` · ETA ${r.eta_minutes} min`:''}</p>}{r.status==='COMPLETED'&&(r.customer_feedback_resolution?<div className={`cr-feedback-thanks ${r.customer_feedback_resolution==='UNRESOLVED'?'is-attention':''}`}><strong>{r.customer_feedback_resolution==='UNRESOLVED'?'The garage has been asked to follow up.':'Thanks for confirming the outcome.'}</strong><span>{r.customer_feedback_resolution==='RESOLVED'?'You said the issue is fixed.':r.customer_feedback_resolution==='PARTIAL'?'You said you still need some help.':'You said the issue remains.'}</span>{r.customer_feedback_rating&&<StarRating rating={r.customer_feedback_rating} size="small"/>}</div>:<CompletionFeedbackForm autoOpen={r.id===feedbackPromptRequestId} busy={feedbackBusyId===r.id} onSubmit={(resolution,rating,comment)=>void submitFeedback(r.id,resolution,rating,comment)}/>)}</div><div className="cr-history-actions">{r.contact_phone&&<a href={`tel:${r.contact_phone}`} className="cr-call">Call garage</a>}{r.status==='PENDING'&&<button onClick={()=>void cancelRequest(r.id)}>Cancel request</button>}</div></article>)}</div>}</section>}

    {feedbackExploreOpen && <div className="cr-feedback-backdrop is-open cr-explore-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) setFeedbackExploreOpen(false); }}><section className="cr-feedback-modal is-open cr-explore-modal" role="dialog" aria-modal="true" aria-labelledby="cr-explore-title"><header className="cr-feedback-modal-header"><div><span className="cr-kicker">THANK YOU</span><h2 id="cr-explore-title">Thanks for closing the loop.</h2><p>Your feedback helps us make roadside support better. When you’re ready, explore more on Find Your Mechanic.</p></div><button className="cr-feedback-close" type="button" aria-label="Close" onClick={() => setFeedbackExploreOpen(false)}><X size={18}/></button></header><div className="cr-explore-actions"><Link to="/" className="cr-primary" onClick={() => setFeedbackExploreOpen(false)}>Explore more<ArrowRight size={16}/></Link><button type="button" className="cr-feedback-cancel" onClick={() => setFeedbackExploreOpen(false)}>Stay here</button></div></section></div>}

    {requestModalMounted && <div className={`cr-modal-backdrop ${requestModalOpen ? 'is-open' : 'is-closing'}`} onMouseDown={(event) => { if (event.target === event.currentTarget) closeRequestModal(); }}>
      <section aria-labelledby="cr-request-modal-title" aria-modal="true" className={`cr-request-modal ${requestModalOpen ? 'is-open' : 'is-closing'}`} onKeyDown={(event) => { if (event.key === 'Escape') closeRequestModal(); }} role="dialog">
        <header className="cr-modal-header"><div><span className="cr-kicker">ROADSIDE REQUEST</span><h2 id="cr-request-modal-title">Tell us what happened</h2><p>The garage will call to confirm the issue, estimate and next step.</p></div><button type="button" className="cr-modal-close" aria-label="Close request form" onClick={closeRequestModal}>×</button></header>
        <div className="cr-modal-garage"><span>Requesting help from</span><strong>{garages.find((garage) => garage.id === selectedGarage)?.name || 'Selected garage'}</strong></div>
        <form className="cr-request-form" onSubmit={submitRequest}>
          <label className="cr-label">What happened?<textarea required minLength={10} maxLength={1000} rows={3} value={problem} onChange={e=>setProblem(e.target.value)} placeholder="Describe the issue and anything that may help the mechanic…"/></label>
          <label className="cr-label">Your phone number<input required type="tel" value={phone} onChange={e=>setPhone(e.target.value)} placeholder="+9779812345678"/><small>Use international format so the garage can call you.</small></label>
          <label className="cr-consent"><input type="checkbox" checked={consent} onChange={e=>setConsent(e.target.checked)} required/><span>I agree to share my phone number and precise location with this garage if it accepts my request.</span></label>
          <footer className="cr-modal-actions"><button type="button" className="cr-modal-cancel" disabled={sending} onClick={closeRequestModal}>Cancel</button><button className="cr-primary" disabled={sending||!consent}>{sending?'Sending request…':'Send roadside request'}<ArrowRight size={16}/></button></footer>
        </form>
      </section>
    </div>}
  </main></PublicLayout>;
};
