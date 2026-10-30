import React, { useEffect, useState } from 'react';
import { PublicLayout } from '../../components/PublicLayout';
import { apiClient } from '../../api/client';
import { NotificationItem, PaginatedResponse } from '../../api/types';

export const NotificationsPage: React.FC = () => {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [filterUnread, setFilterUnread] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const fetchNotifications = async () => {
    setIsLoading(true);
    try {
      const q = filterUnread ? '?is_read=false' : '';
      const [listRes, countRes] = await Promise.all([
        apiClient<PaginatedResponse<NotificationItem>>(`/notifications${q}`),
        apiClient<{ unread_count: number }>('/notifications/unread-count').catch(() => ({ unread_count: 0 })),
      ]);
      setNotifications(listRes.items || []);
      setUnreadCount(countRes.unread_count || 0);
    } catch {
      setNotifications([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 60000);
    return () => clearInterval(interval);
  }, [filterUnread]);

  const markAsRead = async (id: string) => {
    try {
      await apiClient(`/notifications/${id}/read`, { method: 'PATCH' });
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))
      );
      setUnreadCount((c) => Math.max(0, c - 1));
    } catch {
      // ignore
    }
  };

  const markAllAsRead = async () => {
    try {
      await apiClient('/notifications/read-all', { method: 'PATCH' });
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
      setUnreadCount(0);
    } catch {
      // ignore
    }
  };

  return (
    <PublicLayout>
      <div style={{ maxWidth: '720px', margin: '40px auto', padding: '0 24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <div>
            <h1 style={{ fontSize: '24px', fontWeight: 600 }}>Notifications</h1>
            <p style={{ color: 'var(--muted)', fontSize: 'var(--step-caption)' }}>
              {unreadCount} unread {unreadCount === 1 ? 'alert' : 'alerts'}
            </p>
          </div>

          <div style={{ display: 'flex', gap: '12px' }}>
            <button
              onClick={() => setFilterUnread(!filterUnread)}
              style={{
                fontSize: 'var(--step-small)',
                padding: '6px 12px',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius-sm)',
                backgroundColor: filterUnread ? 'var(--rule)' : 'var(--surface)',
              }}
            >
              {filterUnread ? 'Showing Unread' : 'Show Unread Only'}
            </button>
            {unreadCount > 0 && (
              <button
                onClick={markAllAsRead}
                style={{
                  fontSize: 'var(--step-small)',
                  padding: '6px 12px',
                  border: '1px solid var(--border)',
                  borderRadius: 'var(--radius-sm)',
                  backgroundColor: 'var(--surface-raised)',
                }}
              >
                Mark all as read
              </button>
            )}
          </div>
        </div>

        {isLoading ? (
          <div style={{ color: 'var(--muted)', textAlign: 'center', padding: '40px' }}>Loading alerts...</div>
        ) : notifications.length === 0 ? (
          <div style={{ padding: '40px', textAlign: 'center', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', backgroundColor: 'var(--surface)' }}>
            <p style={{ color: 'var(--muted)' }}>You have no notifications at this time.</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {notifications.map((n) => (
              <div
                key={n.id}
                onClick={() => !n.is_read && markAsRead(n.id)}
                style={{
                  padding: '16px 20px',
                  border: '1px solid var(--border)',
                  borderRadius: 'var(--radius-sm)',
                  backgroundColor: n.is_read ? 'var(--surface)' : '#fff',
                  cursor: n.is_read ? 'default' : 'pointer',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'flex-start',
                }}
              >
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                    {!n.is_read && (
                      <span
                        style={{
                          width: '6px',
                          height: '6px',
                          borderRadius: '50%',
                          backgroundColor: 'var(--accent)',
                        }}
                      />
                    )}
                    <h3 style={{ fontSize: '15px', fontWeight: n.is_read ? 500 : 600 }}>{n.title}</h3>
                  </div>
                  <p style={{ fontSize: 'var(--step-small)', color: 'var(--ink-secondary)', marginBottom: '8px' }}>
                    {n.message}
                  </p>
                  <span className="tabular-nums" style={{ fontSize: '11px', color: 'var(--muted)' }}>
                    {new Date(n.created_at).toLocaleString()}
                  </span>
                </div>

                {!n.is_read && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      markAsRead(n.id);
                    }}
                    style={{
                      fontSize: '11px',
                      color: 'var(--accent)',
                      textDecoration: 'underline',
                    }}
                  >
                    Mark read
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </PublicLayout>
  );
};
