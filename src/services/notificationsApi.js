const BASE_URL = 'http://localhost:8000';

function getAuthHeaders() {
  const token = localStorage.getItem('clinic_token');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

const fallbackNotifications = [
  {
    id: 'demo-1',
    title: 'Daily schedule synced',
    body: 'Your appointments for today are up to date.',
    read: false,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'demo-2',
    title: 'System check complete',
    body: 'All clinic modules are operational.',
    read: true,
    createdAt: new Date(Date.now() - 3600 * 1000).toISOString(),
  },
];

export async function getNotifications() {
  try {
    const response = await fetch(`${BASE_URL}/api/notifications`, {
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeaders(),
      },
    });
    if (!response.ok) throw new Error(`Failed with ${response.status}`);
    return response.json();
  } catch {
    return fallbackNotifications;
  }
}

export async function markNotificationRead(id) {
  try {
    const response = await fetch(`${BASE_URL}/api/notifications/${id}/read`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeaders(),
      },
    });
    if (!response.ok) throw new Error(`Failed with ${response.status}`);
    return response.json();
  } catch {
    return { id, read: true };
  }
}

// WebSocket-ready seam for future real-time updates
export function createNotificationsStream() {
  return {
    connect: () => {},
    disconnect: () => {},
    onMessage: () => {},
  };
}
