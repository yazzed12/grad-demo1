import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  Activity, LayoutDashboard, Users, CalendarDays,
  Settings, UserCog, Stethoscope
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';

const roleLinks = {
  doctor: [
    { path: '/doctor', icon: LayoutDashboard, labelKey: 'dashboard' },
    { path: '/doctor/appointments', icon: CalendarDays, labelKey: 'appointments' },
    { path: '/doctor/patients', icon: Users, labelKey: 'patients' },
    { path: '/doctor/settings', icon: Settings, labelKey: 'settings' },
  ],
  admin: [
    { path: '/admin', icon: LayoutDashboard, labelKey: 'dashboard' },
    { path: '/admin/doctors', icon: Stethoscope, labelKey: 'doctors' },
    { path: '/admin/settings', icon: Settings, labelKey: 'settings' },
  ],
  receptionist: [
    { path: '/receptionist', icon: LayoutDashboard, labelKey: 'dashboard' },
    { path: '/receptionist/patients', icon: Users, labelKey: 'patients' },
    { path: '/receptionist/calendar', icon: CalendarDays, labelKey: 'calendar' },
    { path: '/receptionist/settings', icon: Settings, labelKey: 'settings' },
  ],
  patient: [
    { path: '/patient', icon: LayoutDashboard, labelKey: 'dashboard' },
    { path: '/patient/appointments', icon: CalendarDays, labelKey: 'appointments' },
    { path: '/patient/records', icon: UserCog, labelKey: 'settings' },
  ],
};

export default function Sidebar() {
  const { user } = useAuth();
  const { t } = useLanguage();

  const role = user?.role || 'doctor';
  const links = roleLinks[role] || roleLinks.doctor;
  const basePath = `/${role}`;

  return (
    <div className="sidebar">
      <div className="sidebar-logo">
        <div className="sidebar-logo-icon">
          <Activity size={20} color="#fff" />
        </div>
        <div>
          <div className="sidebar-logo-text">{t('clinicName')}</div>
          <div className="sidebar-logo-sub text-gradient-teal">{t('clinicSub')}</div>
        </div>
      </div>
      
      <div className="sidebar-nav">
        <div className="sidebar-section-label">{t('workspace')}</div>
        {links.map((link) => (
          <NavLink 
            key={link.path} 
            to={link.path} 
            end={link.path === basePath}
            className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
          >
            <link.icon size={18} className="nav-icon" />
            <span>{t(link.labelKey)}</span>
          </NavLink>
        ))}
      </div>
    </div>
  );
}
