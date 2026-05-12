const BASE_URL = 'http://localhost:8000';

function getAuthHeaders() {
  const token = localStorage.getItem('clinic_token');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

const fallbackNotifications = [
  {
    id: 'notif-1',
    title: 'New Appointment Booked',
    body: 'Patient Ahmad Hassan has been scheduled for 2:30 PM today.',
    type: 'info',
    read: false,
    created_at: new Date(Date.now() - 5 * 60000).toISOString(),
  },
  {
    id: 'notif-2',
    title: 'Consultation Completed',
    body: 'Dr. Sarah Mitchell finished consultation with Layla Khalil.',
    type: 'success',
    read: false,
    created_at: new Date(Date.now() - 25 * 60000).toISOString(),
  },
  {
    id: 'notif-3',
    title: 'AI Report Generated',
    body: 'Practice insights report for this week is now available.',
    type: 'info',
    read: false,
    created_at: new Date(Date.now() - 2 * 3600000).toISOString(),
  },
  {
    id: 'notif-4',
    title: 'Appointment Status Changed',
    body: 'Omar Youssef appointment status changed to Confirmed.',
    type: 'info',
    read: true,
    created_at: new Date(Date.now() - 4 * 3600000).toISOString(),
  },
  {
    id: 'notif-5',
    title: 'System Ready',
    body: 'Backend-driven clinical system is now active and operational.',
    type: 'success',
    read: true,
    created_at: new Date(Date.now() - 24 * 3600000).toISOString(),
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
