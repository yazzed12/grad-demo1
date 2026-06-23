import { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import { useTheme } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';
import { useClinic } from '../context/ClinicContext';
import {
  User, Bell, Shield, Palette, Database,
  Globe, Moon, Sun, Check, ChevronRight, Save,
  Activity, Clock, Mail, Phone, Building, Stethoscope
} from 'lucide-react';

/* ── Toggle Switch ──────────────────────────────────────────── */
function Toggle({ checked, onChange, color = 'var(--clr-primary)' }) {
  return (
    <div
      onClick={() => onChange(!checked)}
      style={{
        width: 44, height: 24, borderRadius: 12,
        background: checked ? color : 'var(--clr-surface-3, #e5e7eb)',
        cursor: 'pointer', position: 'relative',
        transition: 'background 0.25s ease',
        border: '1px solid var(--clr-border)',
        flexShrink: 0,
      }}
    >
      <div style={{
        position: 'absolute', top: 3,
        left: checked ? 22 : 3,
        width: 16, height: 16, borderRadius: '50%',
        background: '#fff',
        transition: 'left 0.25s ease',
        boxShadow: '0 1px 4px rgba(0,0,0,0.3)',
      }} />
    </div>
  );
}

/* ── Section Card ───────────────────────────────────────────── */
function SettingsSection({ icon: Icon, title, subtitle, children, accent = '#3b82f6' }) {
  return (
    <div className="card" style={{ marginBottom: 'var(--sp-lg)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 'var(--sp-lg)', paddingBottom: 'var(--sp-md)', borderBottom: '1px solid var(--clr-border)' }}>
        <div style={{ width: 38, height: 38, borderRadius: 'var(--r-md)', background: `${accent}22`, display: 'flex', alignItems: 'center', justifyContent: 'center', border: `1px solid ${accent}33` }}>
          <Icon size={18} color={accent} />
        </div>
        <div>
          <div style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--clr-text)' }}>{title}</div>
          {subtitle && <div style={{ fontSize: '0.75rem', color: 'var(--clr-text-muted)' }}>{subtitle}</div>}
        </div>
      </div>
      {children}
    </div>
  );
}

/* ── Row ────────────────────────────────────────────────────── */
function SettingRow({ label, description, children, border = true }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16,
      padding: '12px 0',
      borderBottom: border ? '1px solid var(--clr-border)' : 'none',
    }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--clr-text)' }}>{label}</div>
        {description && <div style={{ fontSize: '0.75rem', color: 'var(--clr-text-muted)', marginTop: 2 }}>{description}</div>}
      </div>
      <div style={{ flexShrink: 0 }}>{children}</div>
    </div>
  );
}

/* ── Color Swatch ───────────────────────────────────────────── */
function ColorSwatch({ color, selected, onClick }) {
  return (
    <div onClick={onClick} style={{
      width: 30, height: 30, borderRadius: '50%', background: color,
      cursor: 'pointer', position: 'relative',
      border: selected ? '3px solid #fff' : '3px solid transparent',
      boxShadow: selected ? `0 0 0 2px ${color}` : 'none',
      transition: 'all 0.2s ease',
    }}>
      {selected && (
        <Check size={12} color="#fff" style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)' }} />
      )}
    </div>
  );
}

/* ── Settings Page ──────────────────────────────────────────── */
export default function Settings() {
  const { theme, toggleTheme } = useTheme();
  const { language, setLanguage, t } = useLanguage();
  const { user } = useAuth();
  const { clinicSettings: globalClinicSettings, updateClinicSettings, refreshClinicSettings } = useClinic();

  const [activeTab, setActiveTab] = useState('profile');

  // --- Profile State ---
  const [profileData, setProfileData] = useState({
    full_name: '', email: '', phone: '', specialization: '', password: ''
  });
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileSaved, setProfileSaved] = useState(false);

  // --- Clinic State ---
  const [clinicData, setClinicData] = useState({
    name: '', email: '', phone: '', address: '', working_hours: '', appointment_duration: 30, services: '[]', notification_settings: '{}'
  });
  const [clinicSaving, setClinicSaving] = useState(false);
  const [clinicSaved, setClinicSaved] = useState(false);

  // Notifications parsing
  const [notifs, setNotifs] = useState({
    appointmentReminders: true, criticalAlerts: true, emailReports: false
  });

  const [accentColor, setAccentColor] = useState('#3b82f6');
  const accentOptions = ['#3b82f6','#8b5cf6','#10b981','#f59e0b','#ef4444','#06b6d4','#ec4899'];

  const notifKeys = [
    { key: 'appointmentReminders', label: t('appointmentReminders') || 'Appointment Reminders', desc: t('appointmentRemindersDesc') || 'Send reminders to patients' },
    { key: 'criticalAlerts', label: t('criticalAlerts') || 'Critical Alerts', desc: t('criticalAlertsDesc') || 'System and critical alerts' },
    { key: 'emailReports', label: t('emailReports') || 'Email Reports', desc: t('emailReportsDesc') || 'Send reports via email' },
  ];

  // Fetch Profile Data
  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const token = localStorage.getItem('clinic_token');
        const res = await fetch('http://localhost:8000/api/settings/profile', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
          const data = await res.json();
          setProfileData({
            full_name: data.full_name || '',
            email: data.email || '',
            phone: data.phone || '',
            specialization: data.specialization || '',
            password: ''
          });
        }
      } catch (err) { console.error(err); }
    };
    fetchProfile();
  }, []);

  // Sync Clinic Data from context
  useEffect(() => {
    if (globalClinicSettings) {
      setClinicData({
        name: globalClinicSettings.name || '',
        email: globalClinicSettings.email || '',
        phone: globalClinicSettings.phone || '',
        address: globalClinicSettings.address || '',
        working_hours: globalClinicSettings.working_hours || '',
        appointment_duration: globalClinicSettings.appointment_duration || 30,
        services: globalClinicSettings.services || '[]',
        notification_settings: globalClinicSettings.notification_settings || '{}'
      });
      try {
        if (globalClinicSettings.notification_settings) {
          setNotifs(JSON.parse(globalClinicSettings.notification_settings));
        }
      } catch (e) { }
    }
  }, [globalClinicSettings]);

  const handleProfileSave = async () => {
    setProfileSaving(true);
    try {
      const token = localStorage.getItem('clinic_token');
      const res = await fetch('http://localhost:8000/api/settings/profile', {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(profileData)
      });
      if (res.ok) {
        setProfileSaved(true);
        setTimeout(() => setProfileSaved(false), 2500);
        // Force reload to update user context globally
        setTimeout(() => window.location.reload(), 1000);
      } else {
        const errorData = await res.json().catch(() => ({}));
        alert(errorData.detail || "Failed to save profile");
      }
    } catch (err) {
      alert("Error saving profile");
    } finally {
      setProfileSaving(false);
    }
  };

  const handleClinicSave = async () => {
    setClinicSaving(true);
    try {
      const payload = { ...clinicData, notification_settings: JSON.stringify(notifs) };
      const res = await updateClinicSettings(payload);
      if (res.success) {
        setClinicSaved(true);
        setTimeout(() => setClinicSaved(false), 2500);
        refreshClinicSettings();
      } else {
        alert("Failed to save clinic settings: " + res.error);
      }
    } catch (err) {
      alert("Error saving clinic settings");
    } finally {
      setClinicSaving(false);
    }
  };

  const canManageClinic = user?.role === 'admin' || user?.role === 'doctor';

  return (
    <Layout pageTitle={t('settingsTitle') || 'Settings'} pageSubtitle={t('settingsSubtitle') || 'Manage your account and clinic preferences'}>
      
      <div style={{ maxWidth: 760 }}>
        {/* Tabs */}
        <div style={{ display: 'flex', gap: 20, marginBottom: 24, borderBottom: '1px solid var(--clr-border)' }}>
          <div 
            onClick={() => setActiveTab('profile')}
            style={{
              padding: '12px 16px', cursor: 'pointer', fontWeight: 600,
              color: activeTab === 'profile' ? 'var(--clr-primary)' : 'var(--clr-text-muted)',
              borderBottom: activeTab === 'profile' ? '2px solid var(--clr-primary)' : '2px solid transparent',
              transition: 'all 0.2s ease'
            }}
          >
            Profile Settings
          </div>
          {canManageClinic && (
            <div 
              onClick={() => setActiveTab('clinic')}
              style={{
                padding: '12px 16px', cursor: 'pointer', fontWeight: 600,
                color: activeTab === 'clinic' ? 'var(--clr-primary)' : 'var(--clr-text-muted)',
                borderBottom: activeTab === 'clinic' ? '2px solid var(--clr-primary)' : '2px solid transparent',
                transition: 'all 0.2s ease'
              }}
            >
              Clinic Settings
            </div>
          )}
        </div>

        {/* ── PROFILE SETTINGS TAB ── */}
        {activeTab === 'profile' && (
          <div className="animate-fade-in">
            <SettingsSection icon={User} title="Personal Information" subtitle="Update your personal details and role-specific data" accent="#3b82f6">
              <div className="grid-2" style={{ gap: 14, marginBottom: 14 }}>
                <div className="form-group">
                  <label className="form-label">Full Name</label>
                  <input className="form-input" value={profileData.full_name} onChange={e => setProfileData({...profileData, full_name: e.target.value})} />
                </div>
                <div className="form-group">
                  <label className="form-label">Email</label>
                  <input className="form-input" type="email" value={profileData.email} onChange={e => setProfileData({...profileData, email: e.target.value})} />
                </div>
                <div className="form-group">
                  <label className="form-label">Phone Number</label>
                  <input className="form-input" type="tel" value={profileData.phone} onChange={e => setProfileData({...profileData, phone: e.target.value})} />
                </div>
                {user?.role === 'doctor' && (
                  <div className="form-group">
                    <label className="form-label">Specialization</label>
                    <input className="form-input" value={profileData.specialization} onChange={e => setProfileData({...profileData, specialization: e.target.value})} />
                  </div>
                )}
              </div>
            </SettingsSection>

            <SettingsSection icon={Shield} title="Security" subtitle="Manage your password" accent="#ef4444">
              <div className="form-group">
                <label className="form-label">New Password (leave blank to keep current)</label>
                <input className="form-input" type="password" placeholder="••••••••" value={profileData.password} onChange={e => setProfileData({...profileData, password: e.target.value})} />
              </div>
            </SettingsSection>

            {/* Appearance (Theme / Language) can be part of Profile visually as they are user-preferences typically */}
            <SettingsSection icon={Palette} title={t('appearance') || 'Appearance'} subtitle={t('appearanceSub') || 'Customize your view'} accent="#8b5cf6">
              <SettingRow label={t('themeMode') || 'Theme Mode'} description={t('themeModeDesc') || 'Switch between light and dark'}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ fontSize: '0.78rem', color: 'var(--clr-subtext)', fontWeight: 700 }}>
                    {theme === 'dark' ? <Moon size={14} /> : <Sun size={14} />}
                  </span>
                  <Toggle checked={theme === 'dark'} onChange={() => toggleTheme()} color="#8b5cf6" />
                </div>
              </SettingRow>

              <SettingRow label={t('language') || 'Language'} description={t('languageDesc') || 'Change app language'} border={false}>
                <select className="form-select" style={{ width: 150 }} value={language} onChange={(e) => setLanguage(e.target.value)}>
                  <option value="en">English (US)</option>
                  <option value="ar">العربية</option>
                </select>
              </SettingRow>
            </SettingsSection>

            <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', marginTop: 'var(--sp-lg)', paddingBottom: 'var(--sp-3xl)' }}>
              <button className="btn btn-primary" onClick={handleProfileSave} disabled={profileSaving} style={{ minWidth: 160 }}>
                {profileSaving ? 'Saving...' : profileSaved ? <><Check size={15} /> Saved</> : <><Save size={15} /> Save Profile</>}
              </button>
            </div>
          </div>
        )}

        {/* ── CLINIC SETTINGS TAB ── */}
        {activeTab === 'clinic' && canManageClinic && (
          <div className="animate-fade-in">
            <SettingsSection icon={Building} title="Clinic Information" subtitle="Global clinic details shared across the system" accent="#10b981">
              <div className="grid-2" style={{ gap: 14, marginBottom: 14 }}>
                <div className="form-group">
                  <label className="form-label">Clinic Name</label>
                  <input className="form-input" value={clinicData.name} onChange={e => setClinicData({...clinicData, name: e.target.value})} />
                </div>
                <div className="form-group">
                  <label className="form-label">Phone</label>
                  <input className="form-input" type="tel" value={clinicData.phone} onChange={e => setClinicData({...clinicData, phone: e.target.value})} />
                </div>
                <div className="form-group" style={{ gridColumn: 'span 2' }}>
                  <label className="form-label">Email</label>
                  <input className="form-input" type="email" value={clinicData.email} onChange={e => setClinicData({...clinicData, email: e.target.value})} />
                </div>
                <div className="form-group" style={{ gridColumn: 'span 2' }}>
                  <label className="form-label">Address</label>
                  <input className="form-input" value={clinicData.address} onChange={e => setClinicData({...clinicData, address: e.target.value})} />
                </div>
              </div>
            </SettingsSection>

            <SettingsSection icon={Clock} title="Workflow & Services" subtitle="Configure daily operations" accent="#f59e0b">
              <div className="grid-2" style={{ gap: 14, marginBottom: 14 }}>
                <div className="form-group">
                  <label className="form-label">Working Hours</label>
                  <input className="form-input" placeholder="e.g., 09:00 - 17:00" value={clinicData.working_hours} onChange={e => setClinicData({...clinicData, working_hours: e.target.value})} />
                </div>
                <div className="form-group">
                  <label className="form-label">Appointment Duration (mins)</label>
                  <input className="form-input" type="number" value={clinicData.appointment_duration} onChange={e => setClinicData({...clinicData, appointment_duration: parseInt(e.target.value) || 30})} />
                </div>
              </div>
            </SettingsSection>

            <SettingsSection icon={Bell} title="Clinic Notifications" subtitle="Global notification settings" accent="#3b82f6">
              {notifKeys.map((item, i) => (
                <SettingRow key={item.key} label={item.label} description={item.desc} border={i < notifKeys.length - 1}>
                  <Toggle checked={notifs[item.key]} onChange={v => setNotifs(p => ({ ...p, [item.key]: v }))} color="#3b82f6" />
                </SettingRow>
              ))}
            </SettingsSection>

            <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', marginTop: 'var(--sp-lg)', paddingBottom: 'var(--sp-3xl)' }}>
              <button className="btn btn-primary" onClick={handleClinicSave} disabled={clinicSaving} style={{ minWidth: 160 }}>
                {clinicSaving ? 'Saving...' : clinicSaved ? <><Check size={15} /> Saved</> : <><Save size={15} /> Save Clinic Settings</>}
              </button>
            </div>
          </div>
        )}

      </div>
    </Layout>
  );
}
