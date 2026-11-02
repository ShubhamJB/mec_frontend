import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppShell } from '../../components/AppShell';
import { ApiError, apiClient } from '../../api/client';
import { PaginatedResponse, ServiceItem, VehicleTypeItem } from '../../api/types';
import { FilterChip } from '../../components/FilterChip';
import { ownerNavItems } from './ownerNav';
import './owner-services.css';

interface CatalogEntry {
  id: string;
  name: string;
}

interface OwnerGarageCatalogs {
  services: CatalogEntry[];
  vehicle_types: CatalogEntry[];
}

interface ChipGroupProps {
  title: string;
  helper: string;
  entries: CatalogEntry[];
  selected: Set<string>;
  onToggle: (id: string) => void;
  customLabel: string;
  customPlaceholder: string;
  editable: boolean;
  onAddCustom: (name: string) => Promise<string | null>;
}

const sameSet = (a: Set<string>, b: Set<string>) => a.size === b.size && [...a].every((id) => b.has(id));

const ChipGroup: React.FC<ChipGroupProps> = ({
  title,
  helper,
  entries,
  selected,
  onToggle,
  customLabel,
  customPlaceholder,
  editable,
  onAddCustom,
}) => {
  const [customName, setCustomName] = useState('');
  const [adding, setAdding] = useState(false);
  const [customError, setCustomError] = useState<string | null>(null);

  const handleAdd = async (event: React.FormEvent) => {
    event.preventDefault();
    const name = customName.trim();
    if (name.length < 2) {
      setCustomError('Please enter at least 2 characters.');
      return;
    }
    setAdding(true);
    setCustomError(null);
    const error = await onAddCustom(name);
    setAdding(false);
    if (error) {
      setCustomError(error);
    } else {
      setCustomName('');
    }
  };

  const visibleEntries = editable ? entries : entries.filter((entry) => selected.has(entry.id));

  return (
    <section className="svc-group">
      <div className="svc-group__head">
        <h2>{title}</h2>
        <span className="svc-group__count tabular-nums">{selected.size} selected</span>
      </div>
      <p className="svc-group__helper">{helper}</p>

      <div role="group" aria-label={title} className="filter-chips svc-group__chips">
        {!editable && selected.size === 0 && <span className="svc-group__empty">None selected yet.</span>}
        {visibleEntries.map((entry) => (
          <FilterChip
            key={entry.id}
            label={entry.name}
            checked={selected.has(entry.id)}
            readOnly={!editable}
            onChange={() => onToggle(entry.id)}
          />
        ))}
      </div>

      {editable && (
        <form onSubmit={handleAdd} className="svc-add">
          <label htmlFor={`custom-${title}`}>{customLabel}</label>
          <input
            id={`custom-${title}`}
            className="c-input"
            type="text"
            maxLength={100}
            value={customName}
            onChange={(e) => setCustomName(e.target.value)}
            placeholder={customPlaceholder}
          />
          <button type="submit" className="c-btn c-btn--ghost" disabled={adding}>
            {adding ? 'Adding…' : 'Add'}
          </button>
        </form>
      )}
      {editable && customError && <div className="svc-add__error">{customError}</div>}
    </section>
  );
};

export const OwnerServicesPage: React.FC = () => {
  const navigate = useNavigate();

  const [services, setServices] = useState<CatalogEntry[]>([]);
  const [vehicleTypes, setVehicleTypes] = useState<CatalogEntry[]>([]);
  const [selectedServices, setSelectedServices] = useState<Set<string>>(new Set());
  const [selectedVehicles, setSelectedVehicles] = useState<Set<string>>(new Set());
  const [savedServices, setSavedServices] = useState<Set<string>>(new Set());
  const [savedVehicles, setSavedVehicles] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [notice, setNotice] = useState<{ kind: 'ok' | 'error'; text: string } | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        const [catalogServices, catalogVehicles, garage] = await Promise.all([
          apiClient<PaginatedResponse<ServiceItem>>('/services?limit=100'),
          apiClient<PaginatedResponse<VehicleTypeItem>>('/vehicle-types?limit=100'),
          apiClient<OwnerGarageCatalogs>('/owner/garage'),
        ]);

        const merge = (catalog: CatalogEntry[], owned: CatalogEntry[]) => {
          const byId = new Map(catalog.map((entry) => [entry.id, { id: entry.id, name: entry.name }]));
          owned.forEach((entry) => byId.set(entry.id, { id: entry.id, name: entry.name }));
          return [...byId.values()].sort((a, b) => a.name.localeCompare(b.name));
        };

        setServices(merge(catalogServices.items || [], garage.services || []));
        setVehicleTypes(merge(catalogVehicles.items || [], garage.vehicle_types || []));
        const ownedServices = new Set((garage.services || []).map((s) => s.id));
        const ownedVehicles = new Set((garage.vehicle_types || []).map((v) => v.id));
        setSelectedServices(new Set(ownedServices));
        setSelectedVehicles(new Set(ownedVehicles));
        setSavedServices(ownedServices);
        setSavedVehicles(ownedVehicles);
      } catch (err: unknown) {
        if (err instanceof ApiError && err.status === 404) {
          navigate('/owner/registration', { replace: true });
          return;
        }
        setNotice({ kind: 'error', text: err instanceof Error ? err.message : 'Could not load your services.' });
      } finally {
        setIsLoading(false);
      }
    };
    load();
  }, [navigate]);

  const isDirty = useMemo(
    () => !sameSet(selectedServices, savedServices) || !sameSet(selectedVehicles, savedVehicles),
    [selectedServices, savedServices, selectedVehicles, savedVehicles]
  );

  const toggle = (setter: React.Dispatch<React.SetStateAction<Set<string>>>) => (id: string) => {
    setNotice(null);
    setter((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const addCustom =
    (
      endpoint: string,
      entries: CatalogEntry[],
      setEntries: React.Dispatch<React.SetStateAction<CatalogEntry[]>>,
      setSelected: React.Dispatch<React.SetStateAction<Set<string>>>
    ) =>
    async (name: string): Promise<string | null> => {
      try {
        const created = await apiClient<CatalogEntry>(endpoint, {
          method: 'POST',
          body: JSON.stringify({ name }),
        });
        setEntries((prev) => [...prev, { id: created.id, name: created.name }].sort((a, b) => a.name.localeCompare(b.name)));
        setSelected((prev) => new Set(prev).add(created.id));
        return null;
      } catch (err: unknown) {
        if (err instanceof ApiError && err.status === 409) {
          const existing = entries.find((entry) => entry.name.toLowerCase() === name.toLowerCase());
          if (existing) {
            setSelected((prev) => new Set(prev).add(existing.id));
            return `“${existing.name}” already exists, so we selected it for you.`;
          }
        }
        return err instanceof Error ? err.message : 'Could not add this entry.';
      }
    };

  const cancelEditing = () => {
    setSelectedServices(new Set(savedServices));
    setSelectedVehicles(new Set(savedVehicles));
    setNotice(null);
    setIsEditing(false);
  };

  const handleSave = async () => {
    if (selectedServices.size === 0 || selectedVehicles.size === 0) {
      setNotice({ kind: 'error', text: 'Choose at least one service and one vehicle type.' });
      return;
    }
    setIsSaving(true);
    setNotice(null);
    try {
      await apiClient('/owner/garage/services', {
        method: 'POST',
        body: JSON.stringify({ service_ids: [...selectedServices] }),
      });
      setSavedServices(new Set(selectedServices));
      await apiClient('/owner/garage/vehicle-types', {
        method: 'POST',
        body: JSON.stringify({ vehicle_type_ids: [...selectedVehicles] }),
      });
      setSavedVehicles(new Set(selectedVehicles));
      setIsEditing(false);
      setNotice({ kind: 'ok', text: 'Saved. Customers will see these on your listing.' });
    } catch (err: unknown) {
      setNotice({ kind: 'error', text: err instanceof Error ? err.message : 'Could not save your changes.' });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <AppShell
      title="Services & Vehicles"
      navItems={ownerNavItems}
      actions={
        isLoading ? null : isEditing ? (
          <button type="button" className="c-btn c-btn--ghost" onClick={cancelEditing} disabled={isSaving}>
            Cancel
          </button>
        ) : (
          <button
            type="button"
            className="c-btn"
            onClick={() => {
              setNotice(null);
              setIsEditing(true);
            }}
          >
            Edit
          </button>
        )
      }
    >
      <div className="svc-page">
        <p className="svc-intro">
          {isEditing
            ? 'Tap to choose what your workshop offers. Customers can filter garages by these, so pick everything that applies.'
            : 'This is what customers see on your listing. Click Edit to change it.'}
        </p>

        {notice && (
          <div
            role={notice.kind === 'error' ? 'alert' : 'status'}
            className={`svc-notice${notice.kind === 'ok' ? ' is-ok' : ' is-error'}`}
          >
            {notice.text}
          </div>
        )}

        {isLoading ? (
          <div className="svc-intro">Loading…</div>
        ) : (
          <>
            <ChipGroup
              title="Services you offer"
              helper="For example oil change, brake repair or tyre replacement."
              entries={services}
              selected={selectedServices}
              onToggle={toggle(setSelectedServices)}
              customLabel="Missing one?"
              customPlaceholder="Add your own service"
              editable={isEditing}
              onAddCustom={addCustom('/services/custom', services, setServices, setSelectedServices)}
            />

            <ChipGroup
              title="Vehicles you work on"
              helper="Which kinds of vehicles can you repair?"
              entries={vehicleTypes}
              selected={selectedVehicles}
              onToggle={toggle(setSelectedVehicles)}
              customLabel="Missing one?"
              customPlaceholder="Add your own vehicle type"
              editable={isEditing}
              onAddCustom={addCustom('/vehicle-types/custom', vehicleTypes, setVehicleTypes, setSelectedVehicles)}
            />

            {isEditing && (
              <div className="svc-save">
                <button type="button" className="c-btn" onClick={handleSave} disabled={isSaving || !isDirty}>
                  {isSaving ? 'Saving…' : 'Save changes'}
                </button>
                {isDirty && !isSaving && <span>You have unsaved changes.</span>}
              </div>
            )}
          </>
        )}
      </div>
    </AppShell>
  );
};
