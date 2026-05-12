import { useState } from 'react';
import Layout from '../components/Layout';
import { useTheme } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';
import {
  User, Bell, Shield, Palette, Database,
  Globe, Moon, Sun, Check, ChevronRight, Save,
  Activity, Clock, Mail, Phone, Building
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

  const [notifs, setNotifs] = useState({
    appointmentReminders: true,
    criticalAlerts: true,
    labResults: true,
    doctorUpdates: false,
    systemAlerts: true,
    emailReports: false,
  });

  const [privacy, setPrivacy] = useState({
    twoFactor: true,
    auditLog: true,
    sessionTimeout: true,
    ipWhitelist: false,
  });

  const [accentColor, setAccentColor] = useState('#3b82f6');
  const [saved, setSaved]   = useState(false);

  const accentOptions = ['#3b82f6','#8b5cf6','#10b981','#f59e0b','#ef4444','#06b6d4','#ec4899'];

  const notifKeys = [
    { key: 'appointmentReminders', label: t('appointmentReminders'), desc: t('appointmentRemindersDesc') },
    { key: 'criticalAlerts', label: t('criticalAlerts'), desc: t('criticalAlertsDesc') },
    { key: 'labResults', label: t('labResults'), desc: t('labResultsDesc') },
    { key: 'doctorUpdates', label: t('doctorUpdates'), desc: t('doctorUpdatesDesc') },
    { key: 'systemAlerts', label: t('systemAlerts'), desc: t('systemAlertsDesc') },
    { key: 'emailReports', label: t('emailReports'), desc: t('emailReportsDesc') },
  ];

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  return (
    <Layout pageTitle={t('settingsTitle')} pageSubtitle={t('settingsSubtitle')}>

      <div style={{ maxWidth: 760 }}>

        {/* ── Clinic Profile ── */}
        <SettingsSection icon={Building} title={t('clinicProfile')} subtitle={t('clinicProfileSub')} accent="#3b82f6">
          <div className="grid-2" style={{ gap: 14, marginBottom: 14 }}>
            <div className="form-group">
              <label className="form-label">Clinic Name</label>
              <input className="form-input" defaultValue="MediCore Smart Clinic" />
            </div>
            <div className="form-group">
              <label className="form-label">Registration ID</label>
              <input className="form-input" defaultValue="MC-2026-00142" />
            </div>
            <div className="form-group">
              <label className="form-label">Email</label>
              <input className="form-input" type="email" defaultValue="admin@medicore.clinic" />
            </div>
            <div className="form-group">
              <label className="form-label">Phone</label>
              <input className="form-input" type="tel" defaultValue="+1 555-9000" />
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Address</label>
            <input className="form-input" defaultValue="1200 Health Blvd, Suite 400, New York, NY 10001" />
          </div>
        </SettingsSection>

        {/* ── Appearance ── */}
        <SettingsSection icon={Palette} title={t('appearance')} subtitle={t('appearanceSub')} accent="#8b5cf6">
          <SettingRow label={t('themeMode')} description={t('themeModeDesc')}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontSize: '0.78rem', color: 'var(--clr-subtext)', fontWeight: 700 }}>
                {theme === 'dark' ? <Moon size={14} /> : <Sun size={14} />}
              </span>
              <Toggle
                checked={theme === 'dark'}
                onChange={() => toggleTheme()}
                color="#8b5cf6"
              />
              <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--clr-text)', minWidth: 36 }}>
                {theme === 'dark' ? t('dark') : t('light')}
              </span>
            </div>
          </SettingRow>

          <SettingRow label={t('accentColor')} description={t('accentColorDesc')}>
            <div style={{ display: 'flex', gap: 8 }}>
              {accentOptions.map(c => (
                <ColorSwatch key={c} color={c} selected={accentColor === c} onClick={() => setAccentColor(c)} />
              ))}
            </div>
          </SettingRow>

          <SettingRow label={t('language')} description={t('languageDesc')} border={false}>
            <select
              className="form-select"
              style={{ width: 150 }}
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
            >
              <option value="en">English (US)</option>
              <option value="ar">العربية</option>
            </select>
          </SettingRow>
        </SettingsSection>

        {/* ── Notifications ── */}
        <SettingsSection icon={Bell} title={t('notificationSettings')} subtitle={t('notificationSettingsSub')} accent="#f59e0b">
          {notifKeys.map((item, i) => (
            <SettingRow
              key={item.key}
              label={item.label}
              description={item.desc}
              border={i < notifKeys.length - 1}
            >
              <Toggle checked={notifs[item.key]} onChange={v => setNotifs(p => ({ ...p, [item.key]: v }))} color="#f59e0b" />
            </SettingRow>
          ))}
        </SettingsSection>

        {/* ── Security & Privacy ── */}
        <SettingsSection icon={Shield} title={t('securityPrivacy')} subtitle={t('securityPrivacySub')} accent="#ef4444">
          {Object.entries(privacy).map(([key, val], i, arr) => (
            <SettingRow
              key={key}
              label={key.replace(/([A-Z])/g, ' $1').replace(/^./, c => c.toUpperCase())}
              description={
                key === 'twoFactor'       ? 'Require 2FA for all admin accounts' :
                key === 'auditLog'        ? 'Log all user actions for compliance' :
                key === 'sessionTimeout'  ? 'Auto-logout after 30 minutes of inactivity' :
                                           'Restrict access to whitelisted IP addresses'
              }
              border={i < arr.length - 1}
            >
              <Toggle checked={val} onChange={v => setPrivacy(p => ({ ...p, [key]: v }))} color="#ef4444" />
            </SettingRow>
          ))}
        </SettingsSection>

        {/* ── System ── */}
        <SettingsSection icon={Database} title={t('system')} subtitle={t('systemSub')} accent="#14b8a6">
          <SettingRow label="Auto Backup" description="Daily backup of all patient records at 2:00 AM">
            <Toggle checked={true} onChange={() => {}} color="#14b8a6" />
          </SettingRow>
          <SettingRow label="Backup Frequency" description="How often data is backed up">
            <select className="form-select" style={{ width: 140 }}>
              <option>Daily</option>
              <option>Weekly</option>
              <option>Monthly</option>
            </select>
          </SettingRow>
          <SettingRow label="Data Retention" description="How long patient records are stored" border={false}>
            <select className="form-select" style={{ width: 140 }}>
              <option>7 years</option>
              <option>10 years</option>
              <option>Indefinitely</option>
            </select>
          </SettingRow>
        </SettingsSection>

        {/* ── Save Button ── */}
        <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', marginTop: 'var(--sp-lg)', paddingBottom: 'var(--sp-3xl)' }}>
          <button className="btn btn-secondary">{t('reset')}</button>
          <button
            id="save-settings-btn"
            className="btn btn-primary"
            onClick={handleSave}
            style={{ minWidth: 160, transition: 'all 0.3s ease' }}
          >
            {saved
              ? <><Check size={15} /> {t('saved')}</>
              : <><Save size={15} /> {t('save')}</>
            }
          </button>
        </div>
      </div>
    </Layout>
  );
}
