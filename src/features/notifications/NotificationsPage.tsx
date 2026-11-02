import React, { useCallback, useEffect, useState } from 'react';
import { AlertTriangle, Bell, Check, Phone, RefreshCw } from 'lucide-react';
import { useAuth } from '../../auth/AuthContext';
import { ApiError, apiClient } from '../../api/client';
import { NotificationItem, PaginatedResponse, RoadsideRequestItem } from '../../api/types';
import { PublicLayout } from '../../components/PublicLayout';
import { useToast } from '../../components/ToastProvider';
import './notifications.css';

const isUrgent = (notification: NotificationItem) => notification.title.startsWith('URGENT:');
const formatDate = (value: string) => new Intl.DateTimeFormat(undefined, {
  month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit',
}).format(new Date(value));

export const NotificationsPage: React.FC = () => {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [ownerRequests, setOwnerRequests] = useState<RoadsideRequestItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [filterUnread, setFilterUnread] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);

  const fetchNotifications = useCallback(async (quiet = false) => {
    if (!quiet) setIsLoading(true);
    try {
      const q = filterUnread ? '?is_read=false' : '';
      const requests = user?.role === 'GARAGE_OWNER'
        ? apiClient<RoadsideRequestItem[]>('/owner/roadside/requests', { skipGlobalLoader: true }).catch(() => [])
        : Promise.resolve([] as RoadsideRequestItem[]);
      const [listRes, countRes, requestRes] = await Promise.all([
        apiClient<PaginatedResponse<NotificationItem>>(`/notifications${q}`, { skipGlobalLoader: true }),
        apiClient<{ unread_count: number }>('/notifications/unread-count', { skipGlobalLoader: true }).catch(() => ({ unread_count: 0 })),
        requests,
      ]);
      setNotifications(listRes.items || []);
      setUnreadCount(countRes.unread_count || 0);
      setOwnerRequests(requestRes);
    } catch (error) {
      if (!quiet) showToast(error instanceof ApiError ? error.message : 'Could not load notifications.', 'error');
      setNotifications([]);
    } finally {
      setIsLoading(false);
    }
  }, [filterUnread, showToast, user?.role]);

  useEffect(() => {
    void fetchNotifications();
    const interval = window.setInterval(() => void fetchNotifications(true), 30000);
    return () => window.clearInterval(interval);
  }, [fetchNotifications]);

  const markAsRead = async (id: string) => {
    try {
      await apiClient(`/notifications/${id}/read`, { method: 'PATCH', skipGlobalLoader: true });
      setNotifications((prev) => prev.map((n) => n.id === id ? { ...n, is_read: true } : n));
      setUnreadCount((count) => Math.max(0, count - 1));
    } catch (error) {
      showToast(error instanceof ApiError ? error.message : 'Could not update notification.', 'error');
    }
  };

  const markAllAsRead = async () => {
    try {
      await apiClient('/notifications/read-all', { method: 'PATCH', skipGlobalLoader: true });
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
      setUnreadCount(0);
    } catch (error) {
      showToast(error instanceof ApiError ? error.message : 'Could not update notifications.', 'error');
    }
  };

  const callRider = async (request: RoadsideRequestItem) => {
    if (!request.contact_phone) return;
    setBusyId(request.id);
    try {
      const updated = await apiClient<RoadsideRequestItem>(`/owner/roadside/requests/${request.id}/calling`, { method: 'POST', skipGlobalLoader: true });
      setOwnerRequests((items) => items.map((item) => item.id === updated.id ? updated : item));
      const linkedNotification = notifications.find((item) => item.related_entity_id === request.id && isUrgent(item) && !item.is_read);
      if (linkedNotification) await markAsRead(linkedNotification.id);
      showToast('The rider has been notified that you are calling now.', 'success');
      window.location.href = `tel:${request.contact_phone}`;
    } catch (error) {
      showToast(error instanceof ApiError ? error.message : 'Could not start the call.', 'error');
    } finally {
      setBusyId(null);
    }
  };

  return (
    <PublicLayout>
      <main className="notifications-page">
        <header className="notifications-header">
          <div>
            <span className="notifications-kicker"><Bell size={14}/> INBOX</span>
            <h1>Notifications</h1>
            <p>{unreadCount} unread {unreadCount === 1 ? 'alert' : 'alerts'} · Updates for your account and roadside requests.</p>
          </div>
          <div className="notifications-toolbar">
            <button className={`notifications-filter ${filterUnread ? 'is-active' : ''}`} type="button" onClick={() => setFilterUnread((value) => !value)}>{filterUnread ? 'Unread only' : 'All notifications'}</button>
            {unreadCount > 0 && <button className="notifications-mark-all" type="button" onClick={() => void markAllAsRead()}><Check size={14}/> Mark all read</button>}
            <button className="notifications-refresh" type="button" onClick={() => void fetchNotifications()} disabled={isLoading}><RefreshCw size={14} className={isLoading ? 'is-spinning' : ''}/> Refresh</button>
          </div>
        </header>

        <section className="notifications-table-card" aria-label="Notifications list">
          {isLoading ? <div className="notifications-loading" role="status"><span className="notifications-spinner"/>Loading notifications…</div> : notifications.length === 0 ? <div className="notifications-empty"><Bell size={20}/><strong>You’re all caught up</strong><p>New notifications will appear here.</p></div> : <div className="notifications-table-scroll"><table className="notifications-table"><thead><tr><th>Severity</th><th>Notification</th><th>Received</th><th>Status</th><th>Action</th></tr></thead><tbody>{notifications.map((notification) => {
            const urgent = isUrgent(notification);
            const request = urgent && user?.role === 'GARAGE_OWNER'
              ? ownerRequests.find((item) => item.id === notification.related_entity_id)
              : undefined;
            const canCall = !!request?.contact_phone && request.status === 'ACCEPTED' && request.customer_contact_confirmed === false && !request.owner_calling_at;
            const canFollowUp = !!request?.contact_phone && request.status === 'COMPLETED' && ['PARTIAL', 'UNRESOLVED'].includes(request.customer_feedback_resolution || '');
            return <tr key={notification.id} className={`${urgent ? 'is-urgent' : ''} ${notification.is_read ? 'is-read' : 'is-unread'}`}>
              <td><span className={`notifications-severity ${urgent ? 'is-high' : 'is-normal'}`}>{urgent && <AlertTriangle size={12}/>} {urgent ? 'High' : 'Normal'}</span></td>
              <td className="notifications-message"><strong>{notification.title.replace(/^URGENT:\s*/, '')}</strong><span>{notification.message}</span></td>
              <td className="notifications-date">{formatDate(notification.created_at)}</td>
              <td><span className={`notifications-status ${notification.is_read ? 'is-read' : 'is-new'}`}>{notification.is_read ? 'Read' : 'New'}</span></td>
              <td><div className="notifications-row-actions">{canCall && <button className="notifications-call" type="button" disabled={busyId === request!.id} onClick={() => void callRider(request!)}><Phone size={13}/>{busyId === request!.id ? 'Calling…' : 'Call'}</button>}{canFollowUp && <a className="notifications-call" href={`tel:${request!.contact_phone}`}><Phone size={13}/>Call rider</a>}{!notification.is_read && <button className="notifications-read" type="button" onClick={() => void markAsRead(notification.id)}>Mark read</button>}{request?.status === 'ACCEPTED' && request.owner_calling_at && request.customer_contact_confirmed == null && <span className="notifications-called">Calling rider</span>}</div></td>
            </tr>;
          })}</tbody></table></div>}
        </section>
      </main>
    </PublicLayout>
  );
};
