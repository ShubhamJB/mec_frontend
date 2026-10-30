import React, { useEffect, useState, useCallback, useRef } from 'react';
import { AppShell } from '../../components/AppShell';
import { apiClient } from '../../api/client';
import { PaginatedResponse } from '../../api/types';

interface GarageRegAdminItem {
  id?: string;
  garage_id: string;
  name?: string;
  garage_name?: string;
  phone?: string;
  owner_name: string;
  owner_email: string;
  address: string;
  approval_status: 'PENDING' | 'APPROVED' | 'REJECTED';
  registration_version: number;
  submitted_at: string;
}

export const AdminRegistrationsPage: React.FC = () => {
  const [items, setItems] = useState<GarageRegAdminItem[]>([]);
  const [statusFilter, setStatusFilter] = useState<'PENDING' | 'APPROVED' | 'REJECTED' | ''>('PENDING');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const limit = 10;

  const [isLoading, setIsLoading] = useState(true);
  const [selectedReg, setSelectedReg] = useState<GarageRegAdminItem | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [submittingAction, setSubmittingAction] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [successNotice, setSuccessNotice] = useState<string | null>(null);

  const tableTopRef = useRef<HTMLDivElement>(null);
  const isPageNavigatingRef = useRef(false);

  const scrollToTableTop = () => {
    if (tableTopRef.current) {
      const headerOffset = 80;
      const elementPosition = tableTopRef.current.getBoundingClientRect().top;
      const offsetPosition = elementPosition + window.pageYOffset - headerOffset;
      window.scrollTo({
        top: Math.max(0, offsetPosition),
        behavior: 'smooth',
      });
    } else {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const fetchRegistrations = useCallback(
    async (filterOverride?: string, pageOverride?: number) => {
      setIsLoading(true);
      try {
        const activeFilter = filterOverride !== undefined ? filterOverride : statusFilter;
        const activePage = pageOverride !== undefined ? pageOverride : page;

        const params = new URLSearchParams();
        if (activeFilter) params.set('status', activeFilter);
        params.set('page', activePage.toString());
        params.set('limit', limit.toString());

        const res = await apiClient<PaginatedResponse<GarageRegAdminItem>>(
          `/admin/garage-registrations?${params.toString()}`,
          { skipGlobalLoader: true }
        );

        setItems(res.items || []);
        setTotalPages(res.total_pages || 1);
        setTotalItems(res.total_items || 0);
      } catch {
        setItems([]);
        setTotalPages(1);
        setTotalItems(0);
      } finally {
        setIsLoading(false);
      }
    },
    [statusFilter, page]
  );

  useEffect(() => {
    fetchRegistrations();
  }, [fetchRegistrations]);

  // Scroll to top of table after new page data renders
  useEffect(() => {
    if (isPageNavigatingRef.current && !isLoading) {
      isPageNavigatingRef.current = false;
      requestAnimationFrame(() => {
        scrollToTableTop();
      });
    }
  }, [isLoading, items]);

  const goToPage = (newPage: number) => {
    if (newPage < 1 || newPage > totalPages || newPage === page) return;
    isPageNavigatingRef.current = true;
    scrollToTableTop();
    setPage(newPage);
  };

  const handleTabChange = (st: 'PENDING' | 'APPROVED' | 'REJECTED' | '') => {
    setStatusFilter(st);
    setPage(1);
    setSelectedReg(null);
    setActionError(null);
  };

  const handleDecision = async (decision: 'APPROVE' | 'REJECT') => {
    if (!selectedReg) return;
    if (decision === 'REJECT' && !rejectionReason.trim()) {
      setActionError('A rejection reason is strictly required by the backend API.');
      return;
    }

    setSubmittingAction(true);
    setActionError(null);

    const garageName = selectedReg.name || selectedReg.garage_name || 'Workshop';
    const targetStatus = decision === 'APPROVE' ? 'APPROVED' : 'REJECTED';

    try {
      await apiClient(`/admin/garage-registrations/${selectedReg.garage_id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          decision,
          expected_version: selectedReg.registration_version,
          rejection_reason: decision === 'REJECT' ? rejectionReason.trim() : null,
        }),
      });

      setSuccessNotice(
        decision === 'APPROVE'
          ? `Garage "${garageName}" was successfully approved! Showing under ${targetStatus} tab.`
          : `Garage "${garageName}" was rejected. Showing under ${targetStatus} tab.`
      );
      setSelectedReg(null);
      setRejectionReason('');

      // Switch to target status tab on page 1 so the newly decided entry is immediately visible
      setStatusFilter(targetStatus);
      setPage(1);
    } catch (err: unknown) {
      if (err instanceof Error) {
        setActionError(err.message);
      } else {
        setActionError('Decision failed. If status was 409, the record changed concurrently.');
      }
    } finally {
      setSubmittingAction(false);
    }
  };

  const navItems = [
    { label: 'Overview', path: '/admin' },
    { label: 'Garage Registrations', path: '/admin/registrations' },
    { label: 'Profile Changes', path: '/admin/profile-changes' },
    { label: 'Garages', path: '/admin/garages' },
    { label: 'Users', path: '/admin/users' },
    { label: 'Review Reports', path: '/admin/reports' },
    { label: 'Audit Log', path: '/admin/audit' },
  ];

  return (
    <AppShell title="Garage Registration Submissions" scopeName="Admin Moderation" navItems={navItems}>
      {/* Success Notification Alert */}
      {successNotice && (
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '12px 16px',
            backgroundColor: 'var(--status-open-bg)',
            color: 'var(--status-open-ink)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-sm)',
            marginBottom: '20px',
            fontSize: 'var(--step-small)',
            fontWeight: 500,
          }}
        >
          <span>{successNotice}</span>
          <button
            onClick={() => setSuccessNotice(null)}
            style={{
              cursor: 'pointer',
              color: 'inherit',
              fontWeight: 600,
              fontSize: '14px',
              padding: '0 4px',
            }}
          >
            &times;
          </button>
        </div>
      )}

      {/* State filter tabs */}
      <div
        ref={tableTopRef}
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          borderBottom: '1px solid var(--border)',
          marginBottom: '20px',
          scrollMarginTop: '20px',
        }}
      >
        <div style={{ display: 'flex', gap: '16px' }}>
          {(['PENDING', 'APPROVED', 'REJECTED', ''] as const).map((st) => {
            const isActive = statusFilter === st;
            return (
              <button
                key={st}
                onClick={() => handleTabChange(st)}
                style={{
                  padding: '8px 4px',
                  fontSize: 'var(--step-caption)',
                  fontWeight: isActive ? 600 : 400,
                  color: isActive ? 'var(--ink)' : 'var(--muted)',
                  borderBottom: isActive ? '2px solid var(--ink)' : '2px solid transparent',
                  cursor: 'pointer',
                }}
              >
                {st === '' ? 'All Statuses' : st}
              </button>
            );
          })}
        </div>

        {totalItems > 0 && (
          <div style={{ fontSize: 'var(--step-small)', color: 'var(--muted)', paddingBottom: '8px' }}>
            {totalItems} total {totalItems === 1 ? 'submission' : 'submissions'}
          </div>
        )}
      </div>

      {!isLoading && items.length === 0 ? (
        <div style={{ padding: '32px', textAlign: 'center', color: 'var(--muted)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)' }}>
          No garage registrations found matching {statusFilter ? `"${statusFilter}"` : 'any filter'}.
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: selectedReg ? '1fr 380px' : '1fr', gap: '24px' }}>
          {/* Table Container */}
          <div>
            <div style={{ position: 'relative', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', overflow: 'hidden', minHeight: '160px' }}>
              {/* Localized Table Dimming & Spinner Overlay */}
              {isLoading && (
                <div
                  style={{
                    position: 'absolute',
                    inset: 0,
                    zIndex: 20,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '10px',
                    backgroundColor: 'rgba(238, 236, 234, 0.55)',
                    backdropFilter: 'blur(2px)',
                    WebkitBackdropFilter: 'blur(2px)',
                  }}
                >
                  <svg
                    width="38"
                    height="38"
                    viewBox="0 0 48 48"
                    fill="none"
                    style={{
                      animation: 'fym-spin 0.85s linear infinite',
                      transformOrigin: 'center',
                    }}
                  >
                    <circle
                      cx="24"
                      cy="24"
                      r="20"
                      stroke="var(--border)"
                      strokeWidth="3.5"
                      opacity="0.6"
                    />
                    <path
                      d="M24 4 A 20 20 0 0 1 44 24"
                      stroke="var(--accent)"
                      strokeWidth="3.5"
                      strokeLinecap="round"
                    />
                  </svg>
                  <span style={{ fontSize: '12px', fontWeight: 500, color: 'var(--ink)' }}>
                    Loading submissions...
                  </span>
                </div>
              )}

              <table
                style={{
                  width: '100%',
                  borderCollapse: 'collapse',
                  textAlign: 'left',
                  fontSize: 'var(--step-caption)',
                  opacity: isLoading ? 0.35 : 1,
                  transition: 'opacity 0.15s ease',
                  pointerEvents: isLoading ? 'none' : 'auto',
                }}
              >
                <thead>
                  <tr style={{ backgroundColor: 'var(--rule)', color: 'var(--ink-secondary)', fontSize: '12px' }}>
                    <th style={{ padding: '10px 14px' }}>Workshop</th>
                    <th style={{ padding: '10px 14px' }}>Owner</th>
                    <th style={{ padding: '10px 14px' }}>Address</th>
                    <th style={{ padding: '10px 14px' }}>Version</th>
                    <th style={{ padding: '10px 14px' }}>Submitted</th>
                    <th style={{ padding: '10px 14px' }}>Status</th>
                    <th style={{ padding: '10px 14px' }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((row) => {
                    const displayName = row.name || row.garage_name || 'Unnamed Workshop';
                    return (
                      <tr
                        key={row.garage_id || row.id}
                        style={{
                          borderTop: '1px solid var(--rule)',
                          backgroundColor: selectedReg?.garage_id === row.garage_id ? 'var(--surface-raised)' : 'transparent',
                        }}
                      >
                        <td style={{ padding: '12px 14px', fontWeight: 500 }}>{displayName}</td>
                        <td style={{ padding: '12px 14px' }}>
                          <div>{row.owner_name}</div>
                          <div style={{ fontSize: '11px', color: 'var(--muted)' }}>{row.owner_email}</div>
                        </td>
                        <td style={{ padding: '12px 14px', color: 'var(--ink-secondary)' }}>{row.address}</td>
                        <td style={{ padding: '12px 14px' }} className="tabular-nums">v{row.registration_version}</td>
                        <td style={{ padding: '12px 14px', fontSize: '12px' }} className="tabular-nums">
                          {row.submitted_at ? new Date(row.submitted_at).toLocaleDateString() : '—'}
                        </td>
                        <td style={{ padding: '12px 14px' }}>
                          <span
                            style={{
                              fontSize: '11px',
                              padding: '2px 6px',
                              borderRadius: '4px',
                              fontWeight: 500,
                              backgroundColor:
                                row.approval_status === 'APPROVED'
                                ? 'var(--status-open-bg)'
                                : row.approval_status === 'PENDING'
                                ? 'var(--status-unavail-bg)'
                                : 'var(--status-danger-bg)',
                              color:
                                row.approval_status === 'APPROVED'
                                ? 'var(--status-open-ink)'
                                : row.approval_status === 'PENDING'
                                ? 'var(--status-unavail-ink)'
                                : 'var(--status-danger-ink)',
                            }}
                          >
                            {row.approval_status}
                          </span>
                        </td>
                        <td style={{ padding: '12px 14px' }}>
                          <button
                            onClick={() => {
                              setSelectedReg(row);
                              setActionError(null);
                            }}
                            style={{
                              fontSize: 'var(--step-small)',
                              color: 'var(--accent)',
                              fontWeight: 500,
                              textDecoration: 'underline',
                              cursor: 'pointer',
                            }}
                          >
                            {row.approval_status === 'PENDING' ? 'Review' : 'View'}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  flexWrap: 'wrap',
                  gap: '12px',
                  marginTop: '20px',
                  padding: '4px 0',
                  opacity: isLoading ? 0.6 : 1,
                  pointerEvents: isLoading ? 'none' : 'auto',
                  transition: 'opacity 0.15s ease',
                }}
              >
                <div style={{ fontSize: 'var(--step-small)', color: 'var(--muted)' }}>
                  Showing {(page - 1) * limit + 1}–{Math.min(page * limit, totalItems)} of {totalItems}
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  {/* Previous Button */}
                  <button
                    onClick={() => goToPage(page - 1)}
                    disabled={page <= 1}
                    aria-label="Previous page"
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      minWidth: '34px',
                      height: '34px',
                      padding: '0 8px',
                      borderRadius: 'var(--radius-sm)',
                      backgroundColor: 'var(--surface)',
                      color: page <= 1 ? 'var(--rule)' : 'var(--ink)',
                      border: '1px solid var(--border)',
                      cursor: page <= 1 ? 'not-allowed' : 'pointer',
                      opacity: page <= 1 ? 0.5 : 1,
                      fontSize: '13px',
                      fontWeight: 600,
                    }}
                  >
                    &lt;
                  </button>

                  {/* Windowed Numbers */}
                  {(() => {
                    const windowSize = 3;
                    let start = Math.max(1, page - 1);
                    let end = start + windowSize - 1;

                    if (end > totalPages) {
                      end = totalPages;
                      start = Math.max(1, end - windowSize + 1);
                    }

                    const pagesToShow: number[] = [];
                    for (let p = start; p <= end; p++) {
                      pagesToShow.push(p);
                    }

                    return pagesToShow.map((p) => {
                      const isActive = p === page;
                      return (
                        <button
                          key={p}
                          onClick={() => goToPage(p)}
                          className="tabular-nums"
                          style={{
                            minWidth: '34px',
                            height: '34px',
                            borderRadius: 'var(--radius-sm)',
                            backgroundColor: isActive ? 'var(--ink)' : 'var(--surface)',
                            color: isActive ? '#ffffff' : 'var(--ink)',
                            border: '1px solid var(--border)',
                            fontWeight: isActive ? 600 : 500,
                            fontSize: 'var(--step-small)',
                            cursor: 'pointer',
                          }}
                        >
                          {p}
                        </button>
                      );
                    });
                  })()}

                  {/* Next Button */}
                  <button
                    onClick={() => goToPage(page + 1)}
                    disabled={page >= totalPages}
                    aria-label="Next page"
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      minWidth: '34px',
                      height: '34px',
                      padding: '0 8px',
                      borderRadius: 'var(--radius-sm)',
                      backgroundColor: 'var(--surface)',
                      color: page >= totalPages ? 'var(--rule)' : 'var(--ink)',
                      border: '1px solid var(--border)',
                      cursor: page >= totalPages ? 'not-allowed' : 'pointer',
                      opacity: page >= totalPages ? 0.5 : 1,
                      fontSize: '13px',
                      fontWeight: 600,
                    }}
                  >
                    &gt;
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Review / Details Panel */}
          {selectedReg && (
            <div
              style={{
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius-sm)',
                padding: '20px',
                backgroundColor: 'var(--surface)',
                height: 'fit-content',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px' }}>
                <h3 style={{ fontSize: '16px', fontWeight: 600 }}>
                  {selectedReg.approval_status === 'PENDING' ? 'Decision Panel' : 'Registration Detail'}
                </h3>
                <button onClick={() => setSelectedReg(null)} style={{ fontSize: '12px', color: 'var(--muted)', cursor: 'pointer' }}>
                  Close
                </button>
              </div>

              <div style={{ fontSize: 'var(--step-small)', marginBottom: '16px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <p><strong>Garage:</strong> {selectedReg.name || selectedReg.garage_name || 'Unnamed'}</p>
                <p><strong>Owner:</strong> {selectedReg.owner_name} ({selectedReg.owner_email})</p>
                <p><strong>Address:</strong> {selectedReg.address}</p>
                {selectedReg.phone && <p><strong>Phone:</strong> {selectedReg.phone}</p>}
                <p className="tabular-nums"><strong>Expected Version:</strong> v{selectedReg.registration_version}</p>
                <p>
                  <strong>Status:</strong>{' '}
                  <span
                    style={{
                      fontWeight: 600,
                      color:
                        selectedReg.approval_status === 'APPROVED'
                          ? 'var(--status-open-ink)'
                          : selectedReg.approval_status === 'PENDING'
                          ? 'var(--status-unavail-ink)'
                          : 'var(--status-danger-ink)',
                    }}
                  >
                    {selectedReg.approval_status}
                  </span>
                </p>
              </div>

              {selectedReg.approval_status === 'PENDING' ? (
                <>
                  <div style={{ marginBottom: '16px' }}>
                    <label style={{ display: 'block', fontSize: 'var(--step-small)', marginBottom: '4px' }}>
                      Rejection Reason (required only if rejecting)
                    </label>
                    <textarea
                      value={rejectionReason}
                      onChange={(e) => setRejectionReason(e.target.value)}
                      placeholder="e.g. Invalid commercial address or unsupported service"
                      rows={3}
                      style={{
                        width: '100%',
                        padding: '8px 10px',
                        border: '1px solid var(--border)',
                        borderRadius: 'var(--radius-sm)',
                        backgroundColor: 'var(--surface-raised)',
                      }}
                    />
                  </div>

                  {actionError && (
                    <div style={{ fontSize: '12px', color: 'var(--status-danger-ink)', marginBottom: '12px' }}>
                      {actionError}
                    </div>
                  )}

                  <div style={{ display: 'flex', gap: '10px' }}>
                    <button
                      disabled={submittingAction}
                      onClick={() => handleDecision('APPROVE')}
                      style={{
                        flex: 1,
                        padding: '8px',
                        backgroundColor: 'var(--accent)',
                        color: '#fff',
                        borderRadius: 'var(--radius-sm)',
                        fontWeight: 500,
                        fontSize: 'var(--step-small)',
                        cursor: submittingAction ? 'not-allowed' : 'pointer',
                        opacity: submittingAction ? 0.7 : 1,
                      }}
                    >
                      {submittingAction ? 'Processing...' : 'Approve'}
                    </button>
                    <button
                      disabled={submittingAction}
                      onClick={() => handleDecision('REJECT')}
                      style={{
                        flex: 1,
                        padding: '8px',
                        backgroundColor: 'var(--status-danger-ink)',
                        color: '#fff',
                        borderRadius: 'var(--radius-sm)',
                        fontWeight: 500,
                        fontSize: 'var(--step-small)',
                        cursor: submittingAction ? 'not-allowed' : 'pointer',
                        opacity: submittingAction ? 0.7 : 1,
                      }}
                    >
                      {submittingAction ? 'Processing...' : 'Reject'}
                    </button>
                  </div>
                </>
              ) : selectedReg.approval_status === 'APPROVED' ? (
                <div
                  style={{
                    padding: '12px 14px',
                    backgroundColor: 'var(--status-open-bg)',
                    color: 'var(--status-open-ink)',
                    borderRadius: 'var(--radius-sm)',
                    fontSize: 'var(--step-small)',
                    fontWeight: 500,
                  }}
                >
                  ✓ This workshop registration has been approved and is publicly discoverable.
                </div>
              ) : (
                <div
                  style={{
                    padding: '12px 14px',
                    backgroundColor: 'var(--status-danger-bg)',
                    color: 'var(--status-danger-ink)',
                    borderRadius: 'var(--radius-sm)',
                    fontSize: 'var(--step-small)',
                  }}
                >
                  ✕ This registration submission was rejected.
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </AppShell>
  );
};
