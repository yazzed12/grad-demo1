import React, { useEffect, useRef, useState } from 'react';
import { useNotifications } from '../hooks/useNotifications';
import { useAuth } from '../context/AuthContext';
import { Search, Bell } from 'lucide-react';

export default function Topbar({ pageTitle, pageSubtitle }) {
  const { user, logout } = useAuth();
  const { notifications, unreadCount, loading, markAsRead } = useNotifications();
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const notificationsRef = useRef(null);
  const profileRef = useRef(null);

  useEffect(() => {
    const onClickOutside = (event) => {
      if (notificationsRef.current && !notificationsRef.current.contains(event.target)) {
        setIsNotificationsOpen(false);
      }
      if (profileRef.current && !profileRef.current.contains(event.target)) {
        setIsProfileOpen(false);
      }
    };
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, []);

  const userName = user?.name || 'User';
  const userRole = user?.role ? user.role.charAt(0).toUpperCase() + user.role.slice(1) : 'Guest';
  const userEmail = user?.email || 'N/A';
  const userInitials = userName.charAt(0).toUpperCase();

  return (
    <div className="topbar">
      <div className="topbar-title">
        <h1>{pageTitle || 'Dashboard'}</h1>
        {pageSubtitle && <p>{pageSubtitle}</p>}
      </div>

      <div className="topbar-search-wrap">
        <Search size={16} />
        <input type="text" className="topbar-search" placeholder="Search patients, appointments..." />
      </div>

      <div className="topbar-actions">
        <div className="dropdown-wrap" ref={notificationsRef}>
          <button className="icon-btn" onClick={() => setIsNotificationsOpen((prev) => !prev)} title="Notifications">
            <Bell size={18} />
            {unreadCount > 0 && <span className="notif-badge">{unreadCount > 9 ? '9+' : unreadCount}</span>}
          </button>
          {isNotificationsOpen && (
            <div className="dropdown-menu notifications-menu">
              <div className="dropdown-header">Notifications</div>
              {loading && <div className="dropdown-empty">...</div>}
              {!loading && notifications.length === 0 && <div className="dropdown-empty">No notifications</div>}
              {!loading && notifications.map((item) => (
                <button key={item.id} className={`notification-item ${item.read ? '' : 'is-unread'}`} onClick={() => markAsRead(item.id)}>
                  <div className="notification-title">{item.title}</div>
                  <div className="notification-body">{item.body}</div>
                  {!item.read && <span className="notification-action">Mark as read</span>}
                </button>
              ))}
            </div>
          )}
        </div>

        <div style={{ width: '1px', height: '24px', background: 'var(--clr-border)' }}></div>

        <div className="dropdown-wrap" ref={profileRef}>
          <button className="topbar-user profile-trigger" onClick={() => setIsProfileOpen((prev) => !prev)} title="Profile">
            <div className="topbar-user-meta">
              <div className="topbar-user-name">{userName}</div>
              <div className="topbar-user-role">{userRole}</div>
            </div>
            <div className="avatar-wrap">
              <div className="avatar">{userInitials}</div>
              <span className="status-dot online"></span>
            </div>
          </button>
          {isProfileOpen && (
            <div className="dropdown-menu profile-menu">
              <div className="profile-panel">
                <div className="profile-separator">-------------------</div>
                <div className="profile-heading">User Profile</div>
                <div className="profile-separator">-------------------</div>
                <div className="profile-panel-name">Name: {userName}</div>
                <div className="profile-panel-role">Role: {userRole}</div>
                <div className="profile-panel-email">Email: {userEmail}</div>
                <button className="profile-edit-btn" disabled>[Edit Profile] (disabled)</button>
                <div className="profile-separator">-------------------</div>
              </div>
              <button className="dropdown-item danger" onClick={logout}>Logout</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
