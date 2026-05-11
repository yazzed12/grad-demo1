import React from 'react';
import { NavLink } from 'react-router-dom';
import { Activity, LayoutDashboard, Users, CalendarDays, UserCircle, SlidersHorizontal, Shield } from 'lucide-react';

export default function Sidebar() {
  const workspaceLinks = [
    { path: '/doctor', icon: LayoutDashboard, label: 'Dashboard' },
    { path: '/doctor/appointments', icon: CalendarDays, label: 'Appointments' },
    { path: '/doctor/patients', icon: Users, label: 'Patients' },
  ];

  const accountLinks = [
    { path: '/', icon: UserCircle, label: 'Profile' },
    { path: '/', icon: SlidersHorizontal, label: 'Preferences' },
    { path: '/', icon: Shield, label: 'Security' },
  ];

  return (
    <div className="sidebar">
      <div className="sidebar-logo">
        <div className="sidebar-logo-icon">
          <Activity size={20} color="#fff" />
        </div>
        <div>
          <div className="sidebar-logo-text">Smart Clinic</div>
          <div className="sidebar-logo-sub text-gradient-teal">AI-Powered System</div>
        </div>
      </div>
      
      <div className="sidebar-nav">
        <div className="sidebar-section-label">Workspace</div>
        {workspaceLinks.map((link) => (
          <NavLink 
            key={link.path} 
            to={link.path} 
            end={link.path === '/doctor'}
            className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
          >
            <link.icon size={18} className="nav-icon" />
            <span>{link.label}</span>
          </NavLink>
        ))}

        <div className="sidebar-section-label sidebar-section-spaced">Account</div>
        {accountLinks.map((item) => (
          <div key={item.label} className="nav-item nav-item-static">
            <item.icon size={18} className="nav-icon" />
            <span>{item.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
