import React, { FormEvent, useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ApiError, apiClient } from '../../api/client';
import { GarageStaffItem } from '../../api/types';
import { AppShell } from '../../components/AppShell';
import { useToast } from '../../components/ToastProvider';
import { ownerNavItems } from './ownerNav';
import './owner-staff.css';
import './owner-type.css';

type Draft = { full_name: string; phone: string; role_title: string };
const emptyDraft: Draft = { full_name: '', phone: '', role_title: '' };
const modalExitDuration = () => (
  window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 1 : 530
);

export const OwnerStaffPage: React.FC = () => {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [staff, setStaff] = useState<GarageStaffItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMounted, setModalMounted] = useState(false);
  const [draft, setDraft] = useState<Draft>(emptyDraft);
  const [saving, setSaving] = useState(false);
  const closeTimer = useRef<number | null>(null);

  const loadStaff = useCallback(async () => {
    setLoading(true);
    try {
      const rows = await apiClient<GarageStaffItem[]>('/owner/staff', { skipGlobalLoader: true });
      setStaff(rows);
    } catch (err) {
      if (err instanceof ApiError && err.status === 404) {
        navigate('/owner/registration', { replace: true });
        return;
      }
      showToast(err instanceof ApiError ? err.message : 'Could not load garage staff.', 'error');
    } finally {
      setLoading(false);
    }
  }, [navigate, showToast]);

  useEffect(() => {
    void loadStaff();
  }, [loadStaff]);

  useEffect(() => () => {
    if (closeTimer.current !== null) window.clearTimeout(closeTimer.current);
  }, []);

  const closeModal = () => {
    if (saving) return;
    setModalOpen(false);
    if (closeTimer.current !== null) window.clearTimeout(closeTimer.current);
    closeTimer.current = window.setTimeout(() => {
      setModalMounted(false);
      setEditingId(null);
      setDraft(emptyDraft);
    }, modalExitDuration());
  };

  const openAddModal = () => {
    setEditingId(null);
    setDraft(emptyDraft);
    if (closeTimer.current !== null) window.clearTimeout(closeTimer.current);
    setModalMounted(true);
    window.requestAnimationFrame(() => setModalOpen(true));
  };

  const openEditModal = (member: GarageStaffItem) => {
    setEditingId(member.id);
    setDraft({
      full_name: member.full_name,
      phone: member.phone,
      role_title: member.role_title || '',
    });
    if (closeTimer.current !== null) window.clearTimeout(closeTimer.current);
    setModalMounted(true);
    window.requestAnimationFrame(() => setModalOpen(true));
  };

  const saveStaff = async (event: FormEvent) => {
    event.preventDefault();
    setSaving(true);
    try {
      const payload = {
        full_name: draft.full_name.trim(),
        phone: draft.phone.trim(),
        role_title: draft.role_title.trim() || null,
      };
      if (editingId) {
        await apiClient<GarageStaffItem>(`/owner/staff/${editingId}`, {
          method: 'PATCH',
          body: JSON.stringify(payload),
          skipGlobalLoader: true,
        });
        showToast('Staff details updated.', 'success');
      } else {
        await apiClient<GarageStaffItem>('/owner/staff', {
          method: 'POST',
          body: JSON.stringify(payload),
          skipGlobalLoader: true,
        });
        showToast('Staff member added.', 'success');
      }
      setModalOpen(false);
      if (closeTimer.current !== null) window.clearTimeout(closeTimer.current);
      closeTimer.current = window.setTimeout(() => {
        setModalMounted(false);
        setEditingId(null);
        setDraft(emptyDraft);
      }, modalExitDuration());
      await loadStaff();
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : 'Could not save staff details.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const setActive = async (member: GarageStaffItem, isActive: boolean) => {
    setLoading(true);
    try {
      if (isActive) {
        await apiClient<GarageStaffItem>(`/owner/staff/${member.id}`, {
          method: 'PATCH',
          body: JSON.stringify({ is_active: true }),
          skipGlobalLoader: true,
        });
      } else {
        await apiClient<GarageStaffItem>(`/owner/staff/${member.id}`, {
          method: 'DELETE',
          skipGlobalLoader: true,
        });
      }
      showToast(isActive ? `${member.full_name} is active again.` : `${member.full_name} was deactivated.`, isActive ? 'success' : 'warning');
      await loadStaff();
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : 'Could not update staff status.', 'error');
      setLoading(false);
    }
  };

  const activeCount = staff.filter((member) => member.is_active).length;

  return (
    <AppShell title="Garage staff" navItems={ownerNavItems}>
      <div className="owner-staff-page">
        <header className="owner-staff-header">
          <div>
            <h1>Garage staff</h1>
            <p>Manage the people who work at your garage. This list is private to your owner account.</p>
          </div>
          <button className="owner-staff-primary" type="button" onClick={openAddModal}>
            <span aria-hidden="true">＋</span> Add staff
          </button>
        </header>

        <div className="owner-staff-summary" aria-live="polite">
          <strong>{activeCount} active</strong><span>·</span>{staff.length} total
        </div>

        <section aria-labelledby="staff-list-title" className="owner-staff-section">
          <div className="owner-staff-section-heading">
            <h2 id="staff-list-title">Team list</h2>
            <span>Private to garage owner</span>
          </div>
          {!loading && staff.length === 0 ? (
            <div className="owner-staff-empty">
              <strong>You’re operating solo for now.</strong>
              <p>Add a staff member whenever someone joins your garage team.</p>
              <button className="owner-staff-primary" type="button" onClick={openAddModal}>Add your first staff member</button>
            </div>
          ) : (
            <div className="owner-staff-table-frame">
              {loading && (
                <div className="owner-staff-table-loading" role="status" aria-live="polite">
                  <svg width="38" height="38" viewBox="0 0 48 48" fill="none" aria-hidden="true">
                    <circle cx="24" cy="24" r="20" stroke="var(--border)" strokeWidth="3.5" opacity="0.6" />
                    <path d="M24 4 A 20 20 0 0 1 44 24" stroke="var(--accent)" strokeWidth="3.5" strokeLinecap="round" />
                  </svg>
                  <span>{staff.length ? 'Updating staff…' : 'Loading staff…'}</span>
                </div>
              )}
              <div className={`owner-staff-table-wrap${loading ? ' is-loading' : ''}`}>
              <table className="owner-staff-table">
                <thead>
                  <tr>
                    <th scope="col">Name</th>
                    <th scope="col">Phone</th>
                    <th scope="col">Role</th>
                    <th scope="col">Status</th>
                    <th scope="col">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {staff.map((member) => (
                    <tr key={member.id} className={!member.is_active ? 'is-inactive' : undefined}>
                      <td className="owner-staff-name">{member.full_name}</td>
                      <td className="tabular-nums">{member.phone}</td>
                      <td>{member.role_title || '—'}</td>
                      <td>
                        <span className={`owner-staff-status ${member.is_active ? 'is-active' : 'is-inactive'}`}>
                          {member.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td>
                        <div className="owner-staff-actions">
                          <button className="owner-staff-action-button is-edit" type="button" onClick={() => openEditModal(member)}>Edit</button>
                          <button className={`owner-staff-action-button ${member.is_active ? 'is-deactivate' : 'is-reactivate'}`} type="button" onClick={() => void setActive(member, !member.is_active)}>
                            {member.is_active ? 'Deactivate' : 'Reactivate'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              </div>
            </div>
          )}
        </section>
      </div>

      {modalMounted && (
        <div className={`owner-staff-backdrop ${modalOpen ? 'is-open' : 'is-closing'}`} onMouseDown={(event) => { if (event.target === event.currentTarget) closeModal(); }}>
          <section
            aria-labelledby="owner-staff-modal-title"
            aria-modal="true"
            className={`owner-staff-modal ${modalOpen ? 'is-open' : 'is-closing'}`}
            onKeyDown={(event) => { if (event.key === 'Escape') closeModal(); }}
            role="dialog"
          >
            <header className="owner-staff-modal-header">
              <div>
                <h2 id="owner-staff-modal-title">{editingId ? 'Edit staff member' : 'Add staff member'}</h2>
                <p>Enter their contact details and role at your garage.</p>
              </div>
              <button type="button" className="owner-staff-close" aria-label="Close dialog" onClick={closeModal}>×</button>
            </header>
            <form onSubmit={saveStaff} className="owner-staff-form">
              <label>
                Full name
                <input required minLength={2} maxLength={100} autoComplete="name" value={draft.full_name} onChange={(event) => setDraft({ ...draft, full_name: event.target.value })} />
              </label>
              <label>
                Phone number
                <input required type="tel" maxLength={16} autoComplete="tel" placeholder="+9779812345678" value={draft.phone} onChange={(event) => setDraft({ ...draft, phone: event.target.value })} aria-describedby="staff-phone-help" />
                <span id="staff-phone-help">Include the country code, for example +9779812345678.</span>
              </label>
              <label>
                Role or title <span className="owner-staff-optional">Optional</span>
                <input maxLength={50} placeholder="Mechanic" value={draft.role_title} onChange={(event) => setDraft({ ...draft, role_title: event.target.value })} />
              </label>
              <footer className="owner-staff-modal-actions">
                <button type="button" className="owner-staff-secondary" onClick={closeModal} disabled={saving}>Cancel</button>
                <button type="submit" className="owner-staff-primary" disabled={saving}>{saving ? 'Saving…' : editingId ? 'Save changes' : 'Add staff'}</button>
              </footer>
            </form>
          </section>
        </div>
      )}
    </AppShell>
  );
};
