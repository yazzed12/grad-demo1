import { useEffect, useMemo, useState } from 'react';
import { createNotificationsStream, getNotifications, markNotificationRead } from '../services/notificationsApi';

export function useNotifications() {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    const stream = createNotificationsStream();
    stream.connect();

    async function load() {
      setLoading(true);
      const data = await getNotifications();
      if (mounted) {
        setNotifications(Array.isArray(data) ? data : []);
        setLoading(false);
      }
    }

    load();

    return () => {
      mounted = false;
      stream.disconnect();
    };
  }, []);

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

  return { notifications, unreadCount, loading, markAsRead };
}
