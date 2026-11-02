import React, { useEffect, useState, useCallback, useRef } from 'react';
import { AppShell } from '../../components/AppShell';
import { apiClient } from '../../api/client';
import { PaginatedResponse } from '../../api/types';
import { getAdminNavItems } from './adminNav';
import { RegistrationReviewModal, RegistrationDetail } from './RegistrationReviewModal';
import { LoaderCircle } from 'lucide-react';

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
  const [reviewDetail, setReviewDetail] = useState<RegistrationDetail | null>(null);
  const [reviewDetailError, setReviewDetailError] = useState<string | null>(null);
  const [reviewLoadingId, setReviewLoadingId] = useState<string | null>(null);
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

  const openReview = async (row: GarageRegAdminItem) => {
    if (reviewLoadingId) return;
    setReviewLoadingId(row.garage_id);
    setActionError(null);
    setReviewDetail(null);
    setReviewDetailError(null);
    try {
      const detail = await apiClient<RegistrationDetail>(`/admin/garage-registrations/${row.garage_id}`, { skipGlobalLoader: true });
      setReviewDetail(detail);
    } catch (err: unknown) {
      setReviewDetailError(err instanceof Error ? err.message : 'Could not load the full submission.');
    } finally {
      setSelectedReg(row);
      setReviewLoadingId(null);
    }
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

  return (
    <AppShell title="Garage Registration Submissions" scopeName="Admin Moderation" navItems={getAdminNavItems({ registrations: statusFilter === 'PENDING' ? totalItems : undefined })}>
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
      <div ref={tableTopRef} className="dt-toolbar" style={{ scrollMarginTop: '20px' }}>
        <div className="dt-tabs">
          {(['PENDING', 'APPROVED', 'REJECTED', ''] as const).map((st) => {
            const isActive = statusFilter === st;
            return (
              <button
                key={st}
                onClick={() => handleTabChange(st)}
                className={`dt-tab${isActive ? ' is-active' : ''}`}
              >
                {st === '' ? 'All statuses' : st.charAt(0) + st.slice(1).toLowerCase()}
                {isActive && totalItems > 0 && <span className="dt-tab-count tabular-nums">{totalItems}</span>}
              </button>
            );
          })}
        </div>

        {totalItems > 0 && (
          <div className="dt-total">
            {totalItems} total {totalItems === 1 ? 'submission' : 'submissions'}
          </div>
        )}
      </div>

      {!isLoading && items.length === 0 ? (
        <div className="dt-empty">
          No garage registrations found matching {statusFilter ? `"${statusFilter}"` : 'any filter'}.
        </div>
      ) : (
        <div>
          {/* Table Container */}
          <div>
            <div className="dt-frame">
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
                    backgroundColor: 'color-mix(in srgb, var(--bg) 55%, transparent)',
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
                className="dt"
                style={{
                  opacity: isLoading ? 0.35 : 1,
                  transition: 'opacity 0.15s ease',
                  pointerEvents: isLoading ? 'none' : 'auto',
                }}
              >
                <thead>
                  <tr>
                    <th>Workshop</th>
                    <th>Owner</th>
                    <th>Address</th>
                    <th>Version</th>
                    <th>Submitted</th>
                    <th>Status</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((row) => {
                    const displayName = row.name || row.garage_name || 'Unnamed Workshop';
                    return (
                      <tr
                        key={row.garage_id || row.id}
                        className={selectedReg?.garage_id === row.garage_id ? 'is-selected' : undefined}
                      >
                        <td className="dt-primary">{displayName}</td>
                        <td>
                          <div>{row.owner_name}</div>
                          <span className="dt-sub">{row.owner_email}</span>
                        </td>
                        <td className="dt-muted">{row.address}</td>
                        <td className="tabular-nums">v{row.registration_version}</td>
                        <td className="tabular-nums dt-muted">
                          {row.submitted_at ? new Date(row.submitted_at).toLocaleDateString() : '—'}
                        </td>
                        <td>
                          <span
                            className={`dt-chip ${
                              row.approval_status === 'APPROVED'
                                ? 'is-ok'
                                : row.approval_status === 'PENDING'
                                  ? 'is-warn'
                                  : 'is-bad'
                            }`}
                          >
                            {row.approval_status.charAt(0) + row.approval_status.slice(1).toLowerCase()}
                          </span>
                        </td>
                        <td>
                          <button
                            className="dt-action"
                            disabled={reviewLoadingId !== null}
                            onClick={() => void openReview(row)}
                          >
                            {reviewLoadingId === row.garage_id && <LoaderCircle size={14} className="dt-spin" aria-hidden="true" />}
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
              <div className={`dt-pager${isLoading ? ' is-loading' : ''}`}>
                <div className="dt-pager-info">
                  Showing {(page - 1) * limit + 1}–{Math.min(page * limit, totalItems)} of {totalItems}
                </div>

                <div className="dt-pager-pages">
                  <button
                    className="dt-page-btn"
                    onClick={() => goToPage(page - 1)}
                    disabled={page <= 1}
                    aria-label="Previous page"
                  >
                    &lsaquo;
                  </button>

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

                    return pagesToShow.map((p) => (
                      <button
                        key={p}
                        onClick={() => goToPage(p)}
                        className={`dt-page-btn tabular-nums${p === page ? ' is-active' : ''}`}
                      >
                        {p}
                      </button>
                    ));
                  })()}

                  <button
                    className="dt-page-btn"
                    onClick={() => goToPage(page + 1)}
                    disabled={page >= totalPages}
                    aria-label="Next page"
                  >
                    &rsaquo;
                  </button>
                </div>
              </div>
            )}
          </div>

        </div>
      )}
      {selectedReg && (
        <RegistrationReviewModal
          registration={selectedReg}
          detail={reviewDetail}
          detailError={reviewDetailError}
          rejectionReason={rejectionReason}
          onReasonChange={setRejectionReason}
          submitting={submittingAction}
          error={actionError}
          onDecision={handleDecision}
          onClose={() => {
            setSelectedReg(null);
            setReviewDetail(null);
            setReviewDetailError(null);
            setActionError(null);
            setRejectionReason('');
          }}
        />
      )}
    </AppShell>
  );
};
