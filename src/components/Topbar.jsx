import React, { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useNotifications } from '../hooks/useNotifications';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';
import { useData } from '../context/DataContext';
import {
  Search, Bell, Sun, Moon, Globe, LogOut,
  User, Calendar, Stethoscope, FileText,
  CheckCheck, X, Users
} from 'lucide-react';

export default function Topbar({ pageTitle, pageSubtitle }) {
  const { user, logout } = useAuth();
  const { notifications, unreadCount, loading, markAsRead, markAllAsRead } = useNotifications();
  const { theme, toggleTheme } = useTheme();
  const { language, setLanguage, t, formatTime } = useLanguage();
  const { patients, appointments, doctors, records } = useData();
  const navigate = useNavigate();

  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [isLangOpen, setIsLangOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchFocused, setIsSearchFocused] = useState(false);

  const notificationsRef = useRef(null);
  const profileRef = useRef(null);
  const langRef = useRef(null);
  const searchRef = useRef(null);
  const searchInputRef = useRef(null);

  // Close dropdowns on outside click
  useEffect(() => {
    const onClickOutside = (event) => {
      if (notificationsRef.current && !notificationsRef.current.contains(event.target)) {
        setIsNotificationsOpen(false);
      }
      if (profileRef.current && !profileRef.current.contains(event.target)) {
        setIsProfileOpen(false);
      }
      if (langRef.current && !langRef.current.contains(event.target)) {
        setIsLangOpen(false);
      }
      if (searchRef.current && !searchRef.current.contains(event.target)) {
        setIsSearchFocused(false);
      }
    };
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, []);

  // Keyboard shortcut Cmd/Ctrl+K to focus search
  useEffect(() => {
    const onKeyDown = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
      if (e.key === 'Escape') {
        setIsSearchFocused(false);
        searchInputRef.current?.blur();
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, []);

  // Search logic
  const searchResults = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q || q.length < 2) return [];

    const results = [];
    const limit = 5;

    // Search patients
    const matchedPatients = patients
      .filter(p => p.name?.toLowerCase().includes(q) || p.phone?.includes(q) || p.condition?.toLowerCase().includes(q))
      .slice(0, limit);
    matchedPatients.forEach(p => {
      results.push({
        id: `patient-${p.id}`,
        type: 'patient',
        icon: Users,
        title: p.name,
        detail: p.condition || p.phone || '',
        action: () => navigate(user?.role === 'doctor' ? '/doctor/patients' : `/${user?.role || 'doctor'}/patients`),
      });
    });

    // Search appointments
    const matchedAppts = appointments
      .filter(a => a.patient?.toLowerCase().includes(q) || a.type?.toLowerCase().includes(q) || a.date?.includes(q))
      .slice(0, limit);
    matchedAppts.forEach(a => {
      results.push({
        id: `appt-${a.id}`,
        type: 'appointment',
        icon: Calendar,
        title: `${a.patient || 'Unknown'} — ${a.type || 'Appointment'}`,
        detail: `${a.date} at ${a.time} • ${a.status}`,
        action: () => navigate(user?.role === 'doctor' ? '/doctor/appointments' : `/${user?.role || 'doctor'}/appointments`),
      });
    });

    // Search doctors
    const matchedDocs = doctors
      .filter(d => d.name?.toLowerCase().includes(q) || d.username?.toLowerCase().includes(q))
      .slice(0, limit);
    matchedDocs.forEach(d => {
      results.push({
        id: `doctor-${d.id}`,
        type: 'doctor',
        icon: Stethoscope,
        title: d.name,
        detail: d.role || 'Doctor',
        action: () => navigate('/admin/doctors'),
      });
    });

    // Search records
    const matchedRecords = records
      .filter(r => r.patient?.toLowerCase().includes(q) || r.type?.toLowerCase().includes(q) || r.tooth?.toString().includes(q))
      .slice(0, limit);
    matchedRecords.forEach(r => {
      results.push({
        id: `record-${r.id}`,
        type: 'record',
        icon: FileText,
        title: `${r.patient || 'Unknown'} — Tooth #${r.tooth}`,
        detail: r.type || 'Record',
        action: () => navigate('/patient/records'),
      });
    });

    return results;
  }, [searchQuery, patients, appointments, doctors, records, navigate, user]);

  const handleSearchResultClick = useCallback((result) => {
    result.action();
    setSearchQuery('');
    setIsSearchFocused(false);
  }, []);

  const getRoleName = (role) => {
    const roleMap = { doctor: 'roleDoctor', admin: 'roleAdmin', receptionist: 'roleReceptionist', patient: 'rolePatient' };
    return t(roleMap[role] || 'roleDoctor');
  };

  const getNotifIcon = (type) => {
    if (type === 'success') return <CheckCheck size={14} />;
    if (type === 'warning') return <Bell size={14} />;
    return <Bell size={14} />;
  };

  const getNotifColor = (type) => {
    if (type === 'success') return 'var(--clr-primary)';
    if (type === 'warning') return 'var(--clr-warning)';
    return 'var(--clr-primary)';
  };

  const userName = user?.name || 'User';
  const userRole = user?.role ? getRoleName(user.role) : 'Guest';
  const userEmail = user?.email || '';
  const userInitials = userName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);

  const typeLabel = (type) => t(type);

  return (
    <div className="topbar">
      <div className="topbar-title">
        <h1>{pageTitle || t('dashboard')}</h1>
        {pageSubtitle && <p>{pageSubtitle}</p>}
      </div>

      {/* Search Bar */}
      <div className="topbar-search-wrap" ref={searchRef}>
        <Search size={16} />
        <input
          ref={searchInputRef}
          type="text"
          className="topbar-search"
          placeholder={t('searchPlaceholder')}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onFocus={() => setIsSearchFocused(true)}
        />
        {searchQuery && (
          <button className="search-clear-btn" onClick={() => setSearchQuery('')} title="Clear">
            <X size={14} />
          </button>
        )}
        <kbd className="search-kbd">⌘K</kbd>

        {/* Search Results Dropdown */}
        {isSearchFocused && searchQuery.length >= 2 && (
          <div className="search-results-dropdown">
            {searchResults.length === 0 ? (
              <div className="search-empty">
                <Search size={20} style={{ opacity: 0.3 }} />
                <div className="search-empty-title">{t('searchNoResults')}</div>
                <div className="search-empty-hint">{t('searchHint')}</div>
              </div>
            ) : (
              <>
                {searchResults.map((result) => (
                  <button
                    key={result.id}
                    className="search-result-item"
                    onClick={() => handleSearchResultClick(result)}
                  >
                    <div className="search-result-icon">
                      <result.icon size={15} />
                    </div>
                    <div className="search-result-info">
                      <div className="search-result-title">{result.title}</div>
                      <div className="search-result-detail">{result.detail}</div>
                    </div>
                    <span className="search-result-type">{typeLabel(result.type)}</span>
                  </button>
                ))}
              </>
            )}
          </div>
        )}
      </div>

      <div className="topbar-actions">
        {/* Language Toggle */}
        <div className="dropdown-wrap" ref={langRef}>
          <button
            className="icon-btn"
            onClick={() => setIsLangOpen(prev => !prev)}
            title={t('language')}
          >
            <Globe size={18} />
          </button>
          {isLangOpen && (
            <div className="dropdown-menu lang-menu">
              <div className="dropdown-header">{t('language')}</div>
              <button
                className={`dropdown-item ${language === 'en' ? 'is-active' : ''}`}
                onClick={() => { setLanguage('en'); setIsLangOpen(false); }}
              >
                <span>🇺🇸</span> English
              </button>
              <button
                className={`dropdown-item ${language === 'ar' ? 'is-active' : ''}`}
                onClick={() => { setLanguage('ar'); setIsLangOpen(false); }}
              >
                <span>🇸🇦</span> العربية
              </button>
            </div>
          )}
        </div>

        {/* Dark Mode Toggle */}
        <button className="icon-btn" onClick={toggleTheme} title={theme === 'dark' ? t('lightMode') : t('darkMode')}>
          {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
        </button>

        {/* Notifications */}
        <div className="dropdown-wrap" ref={notificationsRef}>
          <button className="icon-btn" onClick={() => setIsNotificationsOpen((prev) => !prev)} title={t('notifications')}>
            <Bell size={18} />
            {unreadCount > 0 && <span className="notif-badge">{unreadCount > 9 ? '9+' : unreadCount}</span>}
          </button>
          {isNotificationsOpen && (
            <div className="dropdown-menu notifications-menu">
              <div className="dropdown-header notifications-header">
                <span>{t('notifications')}</span>
                {unreadCount > 0 && (
                  <button className="mark-all-btn" onClick={markAllAsRead}>{t('markAllRead')}</button>
                )}
              </div>
              {loading && <div className="dropdown-empty">...</div>}
              {!loading && notifications.length === 0 && <div className="dropdown-empty">{t('noNotifications')}</div>}
              {!loading && notifications.map((item) => (
                <button key={item.id} className={`notification-item ${item.read ? '' : 'is-unread'}`} onClick={() => markAsRead(item.id)}>
                  <div className="notification-row">
                    <div className="notification-icon-wrap" style={{ color: getNotifColor(item.type) }}>
                      {getNotifIcon(item.type)}
                    </div>
                    <div className="notification-content">
                      <div className="notification-title">{item.title}</div>
                      <div className="notification-body">{item.body}</div>
                      <div className="notification-time">{formatTime(item.created_at)}</div>
                    </div>
                    {!item.read && <div className="notification-unread-dot" />}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="topbar-divider" />

        {/* Profile */}
        <div className="dropdown-wrap" ref={profileRef}>
          <button className="topbar-user profile-trigger" onClick={() => setIsProfileOpen((prev) => !prev)} title={t('profile')}>
            <div className="topbar-user-meta">
              <div className="topbar-user-name">{userName}</div>
              <div className="topbar-user-role">{userRole}</div>
            </div>
            <div className="avatar-wrap">
              <div className="avatar">{userInitials}</div>
              <span className="status-dot online" />
            </div>
          </button>
          {isProfileOpen && (
            <div className="dropdown-menu profile-menu">
              <div className="profile-panel">
                <div className="profile-panel-header">
                  <div className="profile-avatar-lg">{userInitials}</div>
                  <div>
                    <div className="profile-panel-name">{userName}</div>
                    <div className="profile-panel-role-badge">{userRole}</div>
                  </div>
                </div>
                {userEmail && <div className="profile-panel-email">{userEmail}</div>}
              </div>
              <button className="dropdown-item danger" onClick={logout}>
                <LogOut size={16} />
                {t('signOut')}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
