import { useState } from 'react';
import Layout from '../components/Layout';
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
        background: checked ? color : 'var(--clr-surface-3)',
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
          <div style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--clr-text-primary)' }}>{title}</div>
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
        <div style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--clr-text-primary)' }}>{label}</div>
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

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  return (
    <Layout pageTitle="Settings" pageSubtitle="Manage clinic configuration and preferences">

      <div style={{ maxWidth: 760 }}>

        {/* ── Clinic Profile ── */}
        <SettingsSection icon={Building} title="Clinic Profile" subtitle="General information about your clinic" accent="#3b82f6">
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

        {/* ── Notifications ── */}
        <SettingsSection icon={Bell} title="Notifications" subtitle="Control which alerts you receive" accent="#f59e0b">
          {Object.entries(notifs).map(([key, val], i, arr) => (
            <SettingRow
              key={key}
              label={key.replace(/([A-Z])/g, ' $1').replace(/^./, c => c.toUpperCase())}
              description={
                key === 'appointmentReminders' ? 'Notify 30 min before each appointment' :
                key === 'criticalAlerts'        ? 'Immediate alerts for critical patients' :
                key === 'labResults'            ? 'Notify when lab results are ready' :
                key === 'doctorUpdates'         ? 'Schedule and status changes from doctors' :
                key === 'systemAlerts'          ? 'System health and maintenance notices' :
                                                  'Weekly summary reports via email'
              }
              border={i < arr.length - 1}
            >
              <Toggle checked={val} onChange={v => setNotifs(p => ({ ...p, [key]: v }))} color="#f59e0b" />
            </SettingRow>
          ))}
        </SettingsSection>

        {/* ── Security & Privacy ── */}
        <SettingsSection icon={Shield} title="Security & Privacy" subtitle="Authentication and access controls" accent="#ef4444">
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

        {/* ── Appearance ── */}
        <SettingsSection icon={Palette} title="Appearance" subtitle="Theme and display preferences" accent="#8b5cf6">
          <SettingRow label="Accent Color" description="Choose the primary brand color for the interface">
            <div style={{ display: 'flex', gap: 8 }}>
              {accentOptions.map(c => (
                <ColorSwatch key={c} color={c} selected={accentColor === c} onClick={() => setAccentColor(c)} />
              ))}
            </div>
          </SettingRow>

          <SettingRow label="Language" description="Interface display language" border={false}>
            <select className="form-select" style={{ width: 150 }}>
              <option>English (US)</option>
              <option>Arabic</option>
              <option>French</option>
              <option>Spanish</option>
            </select>
          </SettingRow>
        </SettingsSection>

        {/* ── System ── */}
        <SettingsSection icon={Database} title="System" subtitle="Data and backup settings" accent="#14b8a6">
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
          <button className="btn btn-secondary">Reset to Defaults</button>
          <button
            id="save-settings-btn"
            className="btn btn-primary"
            onClick={handleSave}
            style={{ minWidth: 160, transition: 'all 0.3s ease' }}
          >
            {saved
              ? <><Check size={15} /> Changes Saved!</>
              : <><Save size={15} /> Save Settings</>
            }
          </button>
        </div>
      </div>
    </Layout>
  );
}
