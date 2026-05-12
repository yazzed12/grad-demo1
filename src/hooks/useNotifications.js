import { useEffect, useMemo, useState, useCallback, useRef } from 'react';
import { createNotificationsStream, getNotifications, markNotificationRead } from '../services/notificationsApi';

export function useNotifications() {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const intervalRef = useRef(null);

  const load = useCallback(async () => {
    const data = await getNotifications();
    setNotifications(Array.isArray(data) ? data : []);
    setLoading(false);
  }, []);

  useEffect(() => {
    let mounted = true;
    const stream = createNotificationsStream();
    stream.connect();

    async function initialLoad() {
      setLoading(true);
      const data = await getNotifications();
      if (mounted) {
        setNotifications(Array.isArray(data) ? data : []);
        setLoading(false);
      }
    }

    initialLoad();

    // Poll every 30 seconds for new notifications
    intervalRef.current = setInterval(() => {
      if (mounted) load();
    }, 30000);

    return () => {
      mounted = false;
      stream.disconnect();
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [load]);

  const unreadCount = useMemo(
    () => notifications.filter((item) => !item.read).length,
    [notifications]
  );

  async function markAsRead(id) {
    await markNotificationRead(id);
    setNotifications((prev) =>
      prev.map((item) => (String(item.id) === String(id) ? { ...item, read: true } : item))
    );
  }

  function markAllAsRead() {
    setNotifications((prev) => prev.map((item) => ({ ...item, read: true })));
    // Fire API calls in background for each unread
    notifications
      .filter((item) => !item.read)
      .forEach((item) => markNotificationRead(item.id));
  }

  function addNotification(notification) {
    setNotifications((prev) => [
      {
        id: `local-${Date.now()}`,
        read: false,
        created_at: new Date().toISOString(),
        ...notification,
      },
      ...prev,
    ]);
  }

  return { notifications, unreadCount, loading, markAsRead, markAllAsRead, addNotification, refresh: load };
}
