import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { AppShell } from '../../components/AppShell';
import { LocationPicker } from '../../components/map/LocationPicker';
import { LoaderCircle, LocateFixed, Check, MapPin } from 'lucide-react';
import { FilterChip } from '../../components/FilterChip';
import { useToast } from '../../components/ToastProvider';
import './owner-registration.css';
import { ownerNavItems } from './ownerNav';
import { apiClient } from '../../api/client';
import { ServiceItem, VehicleTypeItem, PaginatedResponse } from '../../api/types';

interface OperatingHourState {
  day_of_week: number;
  day_name: string;
  is_closed: boolean;
  opening_time: string;
  closing_time: string;
}

const DEFAULT_HOURS: OperatingHourState[] = [
  { day_of_week: 1, day_name: 'Monday', is_closed: false, opening_time: '08:00', closing_time: '18:00' },
  { day_of_week: 2, day_name: 'Tuesday', is_closed: false, opening_time: '08:00', closing_time: '18:00' },
  { day_of_week: 3, day_name: 'Wednesday', is_closed: false, opening_time: '08:00', closing_time: '18:00' },
  { day_of_week: 4, day_name: 'Thursday', is_closed: false, opening_time: '08:00', closing_time: '18:00' },
  { day_of_week: 5, day_name: 'Friday', is_closed: false, opening_time: '08:00', closing_time: '18:00' },
  { day_of_week: 6, day_name: 'Saturday', is_closed: false, opening_time: '09:00', closing_time: '16:00' },
  { day_of_week: 7, day_name: 'Sunday', is_closed: true, opening_time: '09:00', closing_time: '16:00' },
];

interface RegistrationStatus {
  garage_id: string;
  approval_status: 'PENDING' | 'APPROVED' | 'REJECTED';
  registration_version: number;
  submitted_at: string;
  latest_decision?: {
    status: string;
    rejection_reason?: string | null;
    reviewed_at: string;
  } | null;
}

export const OwnerRegistrationPage: React.FC = () => {
  // Registration Status state
  const [existingStatus, setExistingStatus] = useState<RegistrationStatus | null>(null);
  const [checkingStatus, setCheckingStatus] = useState(true);

  // Form Fields
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3>(1);
  const formContainerRef = React.useRef<HTMLDivElement>(null);

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [phone, setPhone] = useState('+1');
  const [address, setAddress] = useState('');
  const [latitude, setLatitude] = useState('');
  const [longitude, setLongitude] = useState('');
  const [manualCoordinates, setManualCoordinates] = useState(false);
  const [locating, setLocating] = useState(false);
  const { showToast } = useToast();
  const [addressLookup, setAddressLookup] = useState(false);
  const [addressFilled, setAddressFilled] = useState(false);
  const addressRef = useRef('');
  const lastAutoAddressRef = useRef<string | null>(null);

  // Catalogs
  const [availableServices, setAvailableServices] = useState<ServiceItem[]>([]);
  const [selectedServiceIds, setSelectedServiceIds] = useState<string[]>([]);
  const [customServicesInput, setCustomServicesInput] = useState('');

  const [availableVehicleTypes, setAvailableVehicleTypes] = useState<VehicleTypeItem[]>([]);
  const [selectedVehicleTypeIds, setSelectedVehicleTypeIds] = useState<string[]>([]);
  const [customVehicleTypesInput, setCustomVehicleTypesInput] = useState('');

  // Hours
  const [hours, setHours] = useState<OperatingHourState[]>(DEFAULT_HOURS);

  // Submission UI state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // 1. Check existing registration
  const checkStatus = async () => {
    setCheckingStatus(true);
    try {
      const res = await apiClient<RegistrationStatus>('/owner/garage-registration');
      setExistingStatus(res);
    } catch {
      // 404 means no registration created yet
      setExistingStatus(null);
    } finally {
      setCheckingStatus(false);
    }
  };

  // 2. Load catalog options
  useEffect(() => {
    checkStatus();

    apiClient<PaginatedResponse<ServiceItem>>('/services?limit=100')
      .then((res) => setAvailableServices(res.items || []))
      .catch(() => {});

    apiClient<PaginatedResponse<VehicleTypeItem>>('/vehicle-types?limit=100')
      .then((res) => setAvailableVehicleTypes(res.items || []))
      .catch(() => {});
  }, []);

  useEffect(() => {
    addressRef.current = address;
  }, [address]);

  const fillAddressFromCoordinates = async (lat: number, lng: number) => {
    setAddressLookup(true);
    try {
      const query = new URLSearchParams({ latitude: String(lat), longitude: String(lng) });
      const place = await apiClient<{ location_label: string | null }>(`/roadside/location-label?${query}`, { skipGlobalLoader: true });
      const label = place.location_label?.trim();
      const current = addressRef.current.trim();
      if (label && (current === '' || current === lastAutoAddressRef.current)) {
        lastAutoAddressRef.current = label;
        setAddress(label);
        setAddressFilled(true);
        window.setTimeout(() => setAddressFilled(false), 1600);
      }
    } catch {
      /* address stays editable; lookup is best-effort */
    } finally {
      setAddressLookup(false);
    }
  };

  const handleUseCurrentLocation = () => {
    if (!navigator.geolocation) {
      showToast('Location is not available in this browser. Enter coordinates manually.', 'error');
      setManualCoordinates(true);
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLatitude(pos.coords.latitude.toFixed(6));
        setLongitude(pos.coords.longitude.toFixed(6));
        setManualCoordinates(false);
        setLocating(false);
        void fillAddressFromCoordinates(pos.coords.latitude, pos.coords.longitude);
      },
      () => {
        setLocating(false);
        showToast('Could not access your location. You can enter coordinates manually.', 'error');
        setManualCoordinates(true);
      },
      { enableHighAccuracy: true, timeout: 12000 }
    );
  };

  const toggleService = (id: string) => {
    setSelectedServiceIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const toggleVehicleType = (id: string) => {
    setSelectedVehicleTypeIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const updateDayHour = (index: number, field: keyof OperatingHourState, value: any) => {
    setHours((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], [field]: value };
      return copy;
    });
  };

  const applyStandardHours = () => {
    setHours([
      { day_of_week: 1, day_name: 'Monday', is_closed: false, opening_time: '08:00', closing_time: '18:00' },
      { day_of_week: 2, day_name: 'Tuesday', is_closed: false, opening_time: '08:00', closing_time: '18:00' },
      { day_of_week: 3, day_name: 'Wednesday', is_closed: false, opening_time: '08:00', closing_time: '18:00' },
      { day_of_week: 4, day_name: 'Thursday', is_closed: false, opening_time: '08:00', closing_time: '18:00' },
      { day_of_week: 5, day_name: 'Friday', is_closed: false, opening_time: '08:00', closing_time: '18:00' },
      { day_of_week: 6, day_name: 'Saturday', is_closed: false, opening_time: '09:00', closing_time: '16:00' },
      { day_of_week: 7, day_name: 'Sunday', is_closed: true, opening_time: '09:00', closing_time: '16:00' },
    ]);
  };

  const copyMondayToWeekdays = () => {
    const mon = hours[0];
    setHours((prev) =>
      prev.map((h, i) =>
        i >= 1 && i < 5
          ? { ...h, is_closed: mon.is_closed, opening_time: mon.opening_time, closing_time: mon.closing_time }
          : h
      )
    );
  };

  const scrollToFormTop = () => {
    if (formContainerRef.current) {
      formContainerRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } else {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleNextStep1 = (e?: React.MouseEvent) => {
    if (e) e.preventDefault();
    setFormError(null);
    if (!name.trim()) {
      setFormError('Please enter a workshop / garage name.');
      return;
    }
    if (!phone.trim()) {
      setFormError('Please enter a workshop phone number in international format.');
      return;
    }
    if (!address.trim()) {
      setFormError('Please enter a commercial street address.');
      return;
    }
    if (!latitude.trim() || !longitude.trim()) {
      setFormError('Set your workshop location: use your current location, tap the map, or enter coordinates manually.');
      return;
    }
    const lat = parseFloat(latitude);
    const lng = parseFloat(longitude);
    if (isNaN(lat) || lat < -90 || lat > 90) {
      setFormError('Please enter a valid latitude (-90 to 90).');
      return;
    }
    if (isNaN(lng) || lng < -180 || lng > 180) {
      setFormError('Please enter a valid longitude (-180 to 180).');
      return;
    }
    setCurrentStep(2);
    scrollToFormTop();
  };

  const handleNextStep2 = (e?: React.MouseEvent) => {
    if (e) e.preventDefault();
    setFormError(null);
    const customServices = customServicesInput
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    const customVehicles = customVehicleTypesInput
      .split(',')
      .map((v) => v.trim())
      .filter(Boolean);

    if (selectedServiceIds.length === 0 && customServices.length === 0) {
      setFormError('Please select or specify at least one service offered before proceeding.');
      return;
    }
    if (selectedVehicleTypeIds.length === 0 && customVehicles.length === 0) {
      setFormError('Please select or specify at least one vehicle type handled before proceeding.');
      return;
    }
    setCurrentStep(3);
    scrollToFormTop();
  };

  const handlePrevStep = (targetStep: 1 | 2) => {
    setFormError(null);
    setCurrentStep(targetStep);
    scrollToFormTop();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setIsSubmitting(true);

    // Basic validation
    const customServices = customServicesInput
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);

    const customVehicles = customVehicleTypesInput
      .split(',')
      .map((v) => v.trim())
      .filter(Boolean);

    if (selectedServiceIds.length === 0 && customServices.length === 0) {
      setFormError('Please select or specify at least one service offered.');
      setIsSubmitting(false);
      return;
    }

    if (selectedVehicleTypeIds.length === 0 && customVehicles.length === 0) {
      setFormError('Please select or specify at least one vehicle type handled.');
      setIsSubmitting(false);
      return;
    }

    const payload = {
      name: name.trim(),
      description: description.trim() || null,
      phone: phone.trim(),
      address: address.trim(),
      latitude: parseFloat(latitude),
      longitude: parseFloat(longitude),
      service_ids: selectedServiceIds,
      custom_services: customServices,
      vehicle_type_ids: selectedVehicleTypeIds,
      custom_vehicle_types: customVehicles,
      operating_hours: hours.map((h) => ({
        day_of_week: h.day_of_week,
        is_closed: h.is_closed,
        opening_time: h.is_closed ? null : h.opening_time,
        closing_time: h.is_closed ? null : h.closing_time,
      })),
    };

    try {
      const endpoint = '/owner/garage-registration';
      const method = existingStatus?.approval_status === 'REJECTED' ? 'PUT' : 'POST';

      const res = await apiClient<RegistrationStatus>(endpoint, {
        method,
        body: JSON.stringify(payload),
      });

      setExistingStatus(res);
      setSuccessMsg(
        'Garage registration submitted successfully! Your submission is now in the administrative review queue.'
      );
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err: unknown) {
      if (err instanceof Error) {
        setFormError(err.message);
      } else {
        setFormError('Failed to submit garage registration. Please check all fields.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  if (checkingStatus) {
    return (
      <AppShell title="Garage Registration" scopeName="Workshop" navItems={ownerNavItems}>
        <div style={{ minHeight: '60vh' }} />
      </AppShell>
    );
  }

  return (
    <AppShell title="Garage Registration" scopeName="Workshop" navItems={ownerNavItems}>
      {/* Existing Status Cards if already submitted */}
      {existingStatus && (
        <div style={{ maxWidth: '1000px', margin: '0 auto 24px auto', width: '100%' }}>
          {existingStatus.approval_status === 'APPROVED' && (
            <div
              style={{
                padding: '24px',
                backgroundColor: 'var(--status-open-bg)',
                color: 'var(--status-open-ink)',
                borderRadius: 'var(--radius-sheet)',
                border: '1px solid color-mix(in srgb, var(--status-open-ink) 20%, transparent)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: '16px',
              }}
            >
              <div>
                <h3 style={{ fontSize: '20px', fontWeight: 500, marginBottom: '4px' }}>
                  Workshop approved and published
                </h3>
                <p style={{ fontSize: 'var(--step-small)', opacity: 0.9 }}>
                  Your workshop registration is verified and publicly discoverable to drivers.
                </p>
              </div>
              <Link
                to="/owner"
                style={{
                  padding: '10px 20px',
                  backgroundColor: 'var(--status-open-ink)',
                  color: 'var(--on-dark)',
                  borderRadius: 'var(--radius-sm)',
                  fontWeight: 600,
                  fontSize: 'var(--step-small)',
                }}
              >
                Go to Workshop Dashboard &rarr;
              </Link>
            </div>
          )}

          {existingStatus.approval_status === 'PENDING' && (
            <div
              style={{
                padding: '28px',
                backgroundColor: 'var(--surface-raised)',
                borderRadius: 'var(--radius-sheet)',
                border: '1px solid var(--border)',
                boxShadow: '0 4px 16px var(--shadow-color)',
              }}
            >
              <div
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '4px 10px',
                  borderRadius: '12px',
                  backgroundColor: 'var(--status-unavail-bg)',
                  color: 'var(--status-unavail-ink)',
                  fontSize: '11px',
                  fontWeight: 600,
                  textTransform: 'uppercase',
                  marginBottom: '12px',
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
                Under Administrative Review
              </div>

              <h2 style={{ fontSize: '20px', fontWeight: 500, marginBottom: '8px' }}>
                Registration Awaiting Verification
              </h2>
              <p style={{ color: 'var(--muted)', fontSize: 'var(--step-caption)', lineHeight: 1.5, marginBottom: '20px' }}>
                Your garage details have been submitted and are in the moderation queue. Platform administrators verify
                commercial addresses and active services before publishing.
              </p>

              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(3, 1fr)',
                  gap: '16px',
                  padding: '16px',
                  backgroundColor: 'var(--card)',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--border)',
                  fontSize: 'var(--step-small)',
                }}
              >
                <div>
                  <span style={{ color: 'var(--muted)', display: 'block', fontSize: '11px' }}>Current Version</span>
                  <span className="tabular-nums" style={{ fontWeight: 600 }}>v{existingStatus.registration_version}</span>
                </div>
                <div>
                  <span style={{ color: 'var(--muted)', display: 'block', fontSize: '11px' }}>Submitted Date</span>
                  <span className="tabular-nums" style={{ fontWeight: 500 }}>
                    {new Date(existingStatus.submitted_at).toLocaleDateString()}
                  </span>
                </div>
                <div>
                  <span style={{ color: 'var(--muted)', display: 'block', fontSize: '11px' }}>Status</span>
                  <span style={{ fontWeight: 600, color: 'var(--status-unavail-ink)' }}>PENDING</span>
                </div>
              </div>
            </div>
          )}

          {existingStatus.approval_status === 'REJECTED' && (
            <div
              style={{
                padding: '24px',
                backgroundColor: 'var(--status-danger-bg)',
                color: 'var(--status-danger-ink)',
                borderRadius: 'var(--radius-sheet)',
                border: '1px solid color-mix(in srgb, var(--status-danger-ink) 20%, transparent)',
                marginBottom: '28px',
              }}
            >
              <h3 style={{ fontSize: '20px', fontWeight: 500, marginBottom: '6px' }}>
                Registration Rejected — Revisions Required
              </h3>
              <p style={{ fontSize: 'var(--step-small)', marginBottom: '12px' }}>
                <strong>Moderator Reason:</strong>{' '}
                {existingStatus.latest_decision?.rejection_reason || 'Information could not be verified.'}
              </p>
              <p style={{ fontSize: 'var(--step-small)', opacity: 0.9 }}>
                Please review the reason above, update your workshop information in the form below, and resubmit for review.
              </p>
            </div>
          )}
        </div>
      )}

      {/* Show Registration Form if not approved */}
      {(!existingStatus || existingStatus.approval_status !== 'APPROVED') && (
        <div style={{ maxWidth: '1000px', margin: '0 auto', width: '100%' }} ref={formContainerRef}>
          {/* Multi-Step Wizard Indicator */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '20px',
              backgroundColor: 'var(--card)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-sheet)',
              padding: '16px 24px',
              gap: '16px',
              overflowX: 'auto',
            }}
          >
            {[
              { step: 1 as const, title: 'Workshop Details', subtitle: 'Name, address & GPS location' },
              { step: 2 as const, title: 'Services & Vehicles', subtitle: 'Capabilities & fleet types' },
              { step: 3 as const, title: 'Operating Hours', subtitle: '7-day weekly schedule' },
            ].map((s, idx, arr) => {
              const isCompleted = currentStep > s.step;
              const isActive = currentStep === s.step;
              const isAccessible = s.step <= currentStep;

              return (
                <React.Fragment key={s.step}>
                  <div
                    onClick={() => {
                      if (isAccessible && s.step !== currentStep) {
                        handlePrevStep(s.step as 1 | 2);
                      }
                    }}
                    role={isAccessible && !isActive ? 'button' : undefined}
                    tabIndex={isAccessible && !isActive ? 0 : undefined}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                      cursor: isAccessible && !isActive ? 'pointer' : 'default',
                      opacity: !isAccessible ? 0.45 : 1,
                      flex: '1 1 auto',
                    }}
                  >
                    <div
                      style={{
                        width: '34px',
                        height: '34px',
                        borderRadius: '50%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '13px',
                        fontWeight: 600,
                        flexShrink: 0,
                        backgroundColor: isActive
                          ? 'var(--ink)'
                          : isCompleted
                          ? 'var(--accent)'
                          : 'var(--surface)',
                        color: isActive || isCompleted ? 'var(--on-dark)' : 'var(--muted)',
                        transition: 'all 0.2s ease',
                      }}
                    >
                      {s.step}
                    </div>
                    <div>
                      <div
                        style={{
                          fontSize: '14px',
                          fontWeight: isActive ? 600 : 500,
                          color: isActive ? 'var(--ink)' : isCompleted ? 'var(--ink)' : 'var(--muted)',
                          lineHeight: 1.2,
                        }}
                      >
                        {s.title}
                      </div>
                      <div
                        style={{
                          fontSize: '12px',
                          color: 'var(--muted)',
                          lineHeight: 1.2,
                          marginTop: '3px',
                        }}
                      >
                        {s.subtitle}
                      </div>
                    </div>
                  </div>

                  {idx < arr.length - 1 && (
                    <div
                      style={{
                        height: '2px',
                        flex: '0 0 36px',
                        backgroundColor: currentStep > idx + 1 ? 'var(--accent)' : 'var(--rule)',
                        borderRadius: '1px',
                      }}
                    />
                  )}
                </React.Fragment>
              );
            })}
          </div>

          {successMsg && (
            <div
              style={{
                padding: '14px 18px',
                backgroundColor: 'var(--status-open-bg)',
                color: 'var(--status-open-ink)',
                borderRadius: 'var(--radius-sm)',
                marginBottom: '20px',
                fontSize: 'var(--step-small)',
                fontWeight: 500,
              }}
            >
              {successMsg}
            </div>
          )}

          {formError && (
            <div
              style={{
                padding: '14px 18px',
                backgroundColor: 'var(--status-danger-bg)',
                color: 'var(--status-danger-ink)',
                borderRadius: 'var(--radius-sm)',
                marginBottom: '20px',
                fontSize: 'var(--step-small)',
              }}
            >
              {formError}
            </div>
          )}

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {/* Step 1: Workshop Profile */}
            {currentStep === 1 && (
              <section className="reg-card">
                <header className="reg-card__head">
                  <div>
                    <h2>1. Workshop details</h2>
                    <p>Basic business information displayed on your public profile and driver discovery cards.</p>
                  </div>
                  <span className="reg-card__step">Step 1 of 3</span>
                </header>

                <div className="reg-location-card">
                  <div className="reg-location-card__copy">
                    <span className="reg-location-card__icon"><MapPin size={20} strokeWidth={1.7} /></span>
                    <div>
                      <strong>Workshop location *</strong>
                      <p>We&apos;ll pin your workshop and fill in your address automatically.</p>
                    </div>
                  </div>
                  <div className="reg-location">
                    <button type="button" className="c-btn reg-location__button" onClick={handleUseCurrentLocation} disabled={locating}>
                      {locating ? <LoaderCircle size={18} className="reg-spin" aria-hidden="true" /> : <LocateFixed size={18} aria-hidden="true" />}
                      {locating ? 'Finding your location…' : latitude && longitude ? 'Update from my current location' : 'Use my current location'}
                    </button>
                    {latitude && longitude && (
                      <span className="reg-location__chip tabular-nums">
                        <Check size={14} strokeWidth={2.4} /> {latitude}, {longitude}
                      </span>
                    )}
                  </div>

                  <button
                    type="button"
                    className="reg-location__toggle"
                    aria-expanded={manualCoordinates}
                    onClick={() => setManualCoordinates((open) => !open)}
                  >
                    {manualCoordinates ? 'Hide manual coordinate entry' : 'Enter latitude and longitude manually'}
                  </button>

                  {manualCoordinates && (
                    <div className="reg-coords">
                      <label>
                        Latitude
                        <input type="number" step="any" value={latitude} onChange={(e) => setLatitude(e.target.value)} onBlur={() => { const la = parseFloat(latitude); const lo = parseFloat(longitude); if (Number.isFinite(la) && Number.isFinite(lo)) void fillAddressFromCoordinates(la, lo); }} placeholder="27.7172" />
                      </label>
                      <label>
                        Longitude
                        <input type="number" step="any" value={longitude} onChange={(e) => setLongitude(e.target.value)} onBlur={() => { const la = parseFloat(latitude); const lo = parseFloat(longitude); if (Number.isFinite(la) && Number.isFinite(lo)) void fillAddressFromCoordinates(la, lo); }} placeholder="85.3240" />
                      </label>
                    </div>
                  )}

                  <div className="reg-map">
                    <LocationPicker
                      latitude={Number.isFinite(parseFloat(latitude)) ? parseFloat(latitude) : null}
                      longitude={Number.isFinite(parseFloat(longitude)) ? parseFloat(longitude) : null}
                      onChange={(lat, lng) => {
                        setLatitude(lat.toFixed(6));
                        setLongitude(lng.toFixed(6));
                        void fillAddressFromCoordinates(lat, lng);
                      }}
                      height={280}
                    />
                    <p className="reg-location__hint">Tap the map to place or fine-tune your workshop pin.</p>
                  </div>
                </div>

                <div className="reg-grid">
                  <div className="reg-field">
                    <label htmlFor="reg-name">Workshop / garage name *</label>
                    <input
                      id="reg-name"
                      className="reg-input"
                      type="text"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="e.g. Apex Performance Tuning & Repairs"
                    />
                  </div>

                  <div className="reg-field">
                    <label htmlFor="reg-phone">
                      Phone number * <span>E.164, e.g. +9779812345678</span>
                    </label>
                    <input
                      id="reg-phone"
                      className="reg-input"
                      type="text"
                      required
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="+9779812345678"
                    />
                  </div>

                  <div className="reg-field reg-field--wide">
                    <label htmlFor="reg-address">
                      Commercial street address *
                      {addressLookup && <span className="reg-lookup"><LoaderCircle size={13} className="reg-spin" aria-hidden="true" /> Looking up your address…</span>}
                      {!addressLookup && addressFilled && <span className="reg-lookup is-done"><Check size={13} strokeWidth={2.6} /> Filled from your location</span>}
                    </label>
                    <input
                      id="reg-address"
                      className={`reg-input${addressFilled ? ' is-filled' : ''}`}
                      type="text"
                      required
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                      placeholder="Fills automatically from your location, or type it here"
                    />
                  </div>

                  <div className="reg-field reg-field--wide">
                    <label htmlFor="reg-description">About your workshop (optional)</label>
                    <textarea
                      id="reg-description"
                      className="reg-input reg-input--area"
                      rows={3}
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="Share certifications, experience, specialty equipment, or warranty policies..."
                    />
                  </div>
                </div>

                <footer className="reg-actions reg-actions--end">
                  <button type="button" className="c-btn" onClick={handleNextStep1}>
                    Next: Services &amp; vehicles &rarr;
                  </button>
                </footer>
              </section>
            )}

            {/* Step 2: Services & Vehicle Types */}
            {currentStep === 2 && (
              <section className="reg-card">
                <header className="reg-card__head">
                  <div>
                    <h2>2. Services &amp; capabilities</h2>
                    <p>Drivers filter discovery by services offered and supported vehicle categories.</p>
                  </div>
                  <span className="reg-card__step">Step 2 of 3</span>
                </header>

                <div className="reg-pick">
                  <div className="reg-pick__head">
                    <h3>Services you offer *</h3>
                    <span className="tabular-nums">{selectedServiceIds.length} selected</span>
                  </div>
                  <p className="reg-pick__helper">For example oil change, brake repair or tyre replacement. Select all that apply.</p>
                  <div role="group" aria-label="Services you offer" className="filter-chips">
                    {availableServices.map((service) => (
                      <FilterChip
                        key={service.id}
                        label={service.name}
                        checked={selectedServiceIds.includes(service.id)}
                        onChange={() => toggleService(service.id)}
                      />
                    ))}
                  </div>
                  <div className="reg-add">
                    <label htmlFor="reg-custom-services">Missing one?</label>
                    <input
                      id="reg-custom-services"
                      className="reg-input"
                      type="text"
                      value={customServicesInput}
                      onChange={(e) => setCustomServicesInput(e.target.value)}
                      placeholder="Add your own services, separated by commas"
                    />
                  </div>
                </div>

                <div className="reg-pick">
                  <div className="reg-pick__head">
                    <h3>Vehicles you work on *</h3>
                    <span className="tabular-nums">{selectedVehicleTypeIds.length} selected</span>
                  </div>
                  <p className="reg-pick__helper">Which kinds of vehicles can you repair?</p>
                  <div role="group" aria-label="Vehicles you work on" className="filter-chips">
                    {availableVehicleTypes.map((vehicleType) => (
                      <FilterChip
                        key={vehicleType.id}
                        label={vehicleType.name}
                        checked={selectedVehicleTypeIds.includes(vehicleType.id)}
                        onChange={() => toggleVehicleType(vehicleType.id)}
                      />
                    ))}
                  </div>
                  <div className="reg-add">
                    <label htmlFor="reg-custom-vehicles">Missing one?</label>
                    <input
                      id="reg-custom-vehicles"
                      className="reg-input"
                      type="text"
                      value={customVehicleTypesInput}
                      onChange={(e) => setCustomVehicleTypesInput(e.target.value)}
                      placeholder="Add your own vehicle types, separated by commas"
                    />
                  </div>
                </div>

                <footer className="reg-actions">
                  <button type="button" className="c-btn c-btn--ghost" onClick={() => handlePrevStep(1)}>
                    &larr; Back: Workshop details
                  </button>
                  <button type="button" className="c-btn" onClick={handleNextStep2}>
                    Next: Operating hours &rarr;
                  </button>
                </footer>
              </section>
            )}

            {/* Step 3: Operating Hours */}
            {currentStep === 3 && (
              <section
                style={{
                  backgroundColor: 'var(--card)',
                  border: '1px solid var(--border)',
                  borderRadius: 'var(--radius-sheet)',
                  padding: '28px 32px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '20px',
                }}
              >
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                    <h2 style={{ fontSize: '20px', fontWeight: 500, marginBottom: '4px' }}>3. Operating Hours (7 Days)</h2>
                    <span style={{ fontSize: '12px', color: 'var(--muted)', fontWeight: 500 }}>Step 3 of 3</span>
                  </div>
                  <p style={{ color: 'var(--muted)', fontSize: 'var(--step-caption)' }}>
                    Accurate weekly operating hours power real-time "Open Now" badges for active drivers.
                  </p>
                </div>

                {/* Preset Quick Actions Toolbar */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    flexWrap: 'wrap',
                    padding: '10px 16px',
                    backgroundColor: 'var(--surface-raised)',
                    borderRadius: 'var(--radius-sm)',
                    border: '1px solid var(--rule)',
                  }}
                >
                  <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--ink)' }}>
                    Quick Presets:
                  </span>
                  <button
                    type="button"
                    onClick={applyStandardHours}
                    style={{
                      padding: '6px 12px',
                      fontSize: '12px',
                      fontWeight: 500,
                      backgroundColor: 'var(--card)',
                      border: '1px solid var(--border)',
                      borderRadius: 'var(--radius-sm)',
                      cursor: 'pointer',
                      color: 'var(--ink)',
                    }}
                  >
                    Standard (Mon–Fri 8:00–18:00, Sat 9:00–16:00, Sun Closed)
                  </button>
                  <button
                    type="button"
                    onClick={copyMondayToWeekdays}
                    style={{
                      padding: '6px 12px',
                      fontSize: '12px',
                      fontWeight: 500,
                      backgroundColor: 'var(--card)',
                      border: '1px solid var(--border)',
                      borderRadius: 'var(--radius-sm)',
                      cursor: 'pointer',
                      color: 'var(--ink)',
                    }}
                  >
                    Copy Monday hours to all weekdays
                  </button>
                </div>

                {/* Spacious, Clean Operating Hours Schedule */}
                <div
                  style={{
                    border: '1px solid var(--rule)',
                    borderRadius: 'var(--radius-sm)',
                    overflow: 'hidden',
                  }}
                >
                  {/* Table Header */}
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '150px 130px 1fr',
                      alignItems: 'center',
                      padding: '10px 18px',
                      backgroundColor: 'var(--surface)',
                      borderBottom: '1px solid var(--rule)',
                      fontSize: '12px',
                      fontWeight: 600,
                      color: 'var(--muted)',
                      textTransform: 'uppercase',
                      letterSpacing: '0.04em',
                    }}
                  >
                    <span>Day of Week</span>
                    <span>Status</span>
                    <span>Working Hours</span>
                  </div>

                  {/* 7 Day Rows */}
                  {hours.map((day, idx) => (
                    <div
                      key={day.day_of_week}
                      style={{
                        display: 'grid',
                        gridTemplateColumns: '150px 130px 1fr',
                        alignItems: 'center',
                        padding: '12px 18px',
                        borderBottom: idx < hours.length - 1 ? '1px solid var(--rule)' : 'none',
                        backgroundColor: day.is_closed ? 'var(--surface-raised)' : 'var(--card)',
                        transition: 'background-color 0.15s ease',
                      }}
                    >
                      {/* Day Label */}
                      <span style={{ fontWeight: 600, fontSize: '14px', color: 'var(--ink)' }}>
                        {day.day_name}
                      </span>

                      {/* Open / Closed Toggle Pill */}
                      <div>
                        <button
                          type="button"
                          onClick={() => updateDayHour(idx, 'is_closed', !day.is_closed)}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '6px',
                            padding: '5px 12px',
                            borderRadius: '16px',
                            fontSize: '12px',
                            fontWeight: 600,
                            cursor: 'pointer',
                            border: day.is_closed ? '1px solid var(--border)' : '1px solid color-mix(in srgb, var(--status-open-ink) 25%, transparent)',
                            backgroundColor: day.is_closed ? 'var(--surface)' : 'var(--status-open-bg)',
                            color: day.is_closed ? 'var(--muted)' : 'var(--status-open-ink)',
                            transition: 'all 0.15s ease',
                          }}
                        >
                          <span
                            style={{
                              width: '6px',
                              height: '6px',
                              borderRadius: '50%',
                              backgroundColor: day.is_closed ? 'var(--muted)' : 'var(--status-open-ink)',
                            }}
                          />
                          {day.is_closed ? 'Closed' : 'Open'}
                        </button>
                      </div>

                      {/* Working Hours or Closed Banner */}
                      {!day.is_closed ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <span style={{ fontSize: '13px', color: 'var(--muted)' }}>Opens</span>
                          <input
                            type="time"
                            required
                            value={day.opening_time}
                            onChange={(e) => updateDayHour(idx, 'opening_time', e.target.value)}
                            style={{
                              padding: '8px 12px',
                              border: '1px solid var(--border)',
                              borderRadius: 'var(--radius-sm)',
                              fontSize: '14px',
                              backgroundColor: 'var(--card)',
                              color: 'var(--ink)',
                            }}
                          />
                          <span style={{ fontSize: '13px', color: 'var(--muted)' }}>closes</span>
                          <input
                            type="time"
                            required
                            value={day.closing_time}
                            onChange={(e) => updateDayHour(idx, 'closing_time', e.target.value)}
                            style={{
                              padding: '8px 12px',
                              border: '1px solid var(--border)',
                              borderRadius: 'var(--radius-sm)',
                              fontSize: '14px',
                              backgroundColor: 'var(--card)',
                              color: 'var(--ink)',
                            }}
                          />
                        </div>
                      ) : (
                        <span style={{ fontSize: '13px', color: 'var(--muted)', fontStyle: 'italic' }}>
                          Workshop closed all day
                        </span>
                      )}
                    </div>
                  ))}
                </div>

                {/* Step 3 Actions */}
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    paddingTop: '16px',
                    borderTop: '1px solid var(--rule)',
                  }}
                >
                  <button
                    type="button"
                    onClick={() => handlePrevStep(2)}
                    style={{
                      padding: '10px 20px',
                      backgroundColor: 'var(--surface)',
                      color: 'var(--ink)',
                      borderRadius: 'var(--radius-sm)',
                      fontWeight: 500,
                      fontSize: '14px',
                      cursor: 'pointer',
                      border: '1px solid var(--border)',
                    }}
                  >
                    &larr; Back: Services &amp; Vehicles
                  </button>

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    style={{
                      padding: '12px 32px',
                      backgroundColor: 'var(--accent)',
                      color: 'var(--on-dark)',
                      borderRadius: 'var(--radius-sm)',
                      fontWeight: 600,
                      fontSize: '15px',
                      cursor: isSubmitting ? 'not-allowed' : 'pointer',
                      opacity: isSubmitting ? 0.7 : 1,
                      boxShadow: '0 4px 12px var(--shadow-color)',
                    }}
                  >
                    {isSubmitting
                      ? 'Submitting Registration...'
                      : existingStatus?.approval_status === 'REJECTED'
                      ? 'Resubmit Registration for Review'
                      : 'Submit Registration for Moderation'}
                  </button>
                </div>
              </section>
            )}
          </form>
        </div>
      )}
    </AppShell>
  );
};
