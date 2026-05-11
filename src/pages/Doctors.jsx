import { useState } from 'react';
import Layout from '../components/Layout';
import { useData } from '../context/DataContext';
import {
  Star, Users, Clock, Award, Phone, Mail,
  Plus, Search, X, Edit, MoreVertical
} from 'lucide-react';

const STATUS_DOT = {
  online:  { color: '#10b981', label: 'On Duty' },
  away:    { color: '#f59e0b', label: 'Away'    },
  offline: { color: '#64748b', label: 'Off Duty' },
};

/* ── Add Doctor Modal ───────────────────────────────────────── */
function AddDoctorModal({ onClose }) {
  const { addDoctor } = useData();
  const [formData, setFormData] = useState({
    name: '', specialty: '', experience: '', schedule: 'Mon–Fri', color: '#3b82f6'
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    addDoctor(formData);
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <form className="modal" onClick={e => e.stopPropagation()} onSubmit={handleSubmit} style={{ maxWidth: 450 }}>
        <div className="modal-header">
          <h2 className="modal-title">Register New Doctor</h2>
          <button type="button" className="modal-close" onClick={onClose}><X size={14} /></button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 16 }}>
          <div className="form-group">
            <label className="form-label">Full Name</label>
            <input 
              className="form-input" placeholder="Dr. Jane Smith" required 
              value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})}
            />
          </div>
          <div className="form-group">
            <label className="form-label">Specialty</label>
            <input 
              className="form-input" placeholder="e.g. Neurologist" required 
              value={formData.specialty} onChange={e => setFormData({...formData, specialty: e.target.value})}
            />
          </div>
          <div className="grid-2" style={{ gap: 12 }}>
            <div className="form-group">
              <label className="form-label">Experience</label>
              <input 
                className="form-input" placeholder="e.g. 10 yrs" required 
                value={formData.experience} onChange={e => setFormData({...formData, experience: e.target.value})}
              />
            </div>
            <div className="form-group">
              <label className="form-label">Accent Color</label>
              <input 
                type="color" className="form-input" style={{ height: 38, padding: 2 }}
                value={formData.color} onChange={e => setFormData({...formData, color: e.target.value})}
              />
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Weekly Schedule</label>
            <input 
              className="form-input" placeholder="e.g. Mon–Fri" required 
              value={formData.schedule} onChange={e => setFormData({...formData, schedule: e.target.value})}
            />
          </div>
        </div>

        <div style={{ display: 'flex', gap: 10 }}>
          <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>Add Staff Member</button>
          <button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button>
        </div>
      </form>
    </div>
  );
}

function DoctorModal({ doc, onClose }) {
  if (!doc) return null;
  const s = STATUS_DOT[doc.status] || STATUS_DOT.online;
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 500 }}>
        <div className="modal-header">
          <h2 className="modal-title">Doctor Profile</h2>
          <button className="modal-close" onClick={onClose}><X size={14} /></button>
        </div>

        {/* Hero */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 18,
          padding: '20px', borderRadius: 'var(--r-lg)',
          background: `linear-gradient(135deg, ${doc.color}18, ${doc.color}08)`,
          border: `1px solid ${doc.color}30`,
          marginBottom: 'var(--sp-lg)',
        }}>
          <div className="avatar-wrap">
            <div className="avatar" style={{
              width: 64, height: 64, fontSize: '1.2rem',
              background: `linear-gradient(135deg, ${doc.color}, ${doc.color}bb)`,
            }}>{doc.avatar}</div>
            <span className="status-dot" style={{ background: s.color, bottom: 2, right: 2, width: 12, height: 12 }} />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--clr-text-primary)' }}>{doc.name}</div>
            <div style={{ fontSize: '0.85rem', color: doc.color, fontWeight: 600 }}>{doc.specialty}</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 4 }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: s.color }} />
              <span style={{ fontSize: '0.75rem', color: 'var(--clr-text-muted)' }}>{s.label}</span>
            </div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4, color: '#fbbf24' }}>
              <Star size={14} fill="#fbbf24" />
              <span style={{ fontWeight: 800, fontSize: '1rem', color: 'var(--clr-text-primary)' }}>{doc.rating}</span>
            </div>
            <div style={{ fontSize: '0.65rem', color: 'var(--clr-text-muted)' }}>Rating</div>
          </div>
        </div>

        {/* Stats Row */}
        <div className="grid-3" style={{ gap: 10, marginBottom: 'var(--sp-lg)' }}>
          {[
            { icon: Users, label: 'Patients',   value: doc.patients },
            { icon: Clock, label: 'Experience', value: doc.experience },
            { icon: Award, label: 'Schedule',   value: doc.schedule },
          ].map(({ icon: Icon, label, value }) => (
            <div key={label} style={{
              padding: '12px', background: 'var(--clr-surface-2)',
              borderRadius: 'var(--r-md)', border: '1px solid var(--clr-border)',
              textAlign: 'center',
            }}>
              <Icon size={18} color={doc.color} style={{ marginBottom: 4 }} />
              <div style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--clr-text-primary)' }}>{value}</div>
              <div style={{ fontSize: '0.65rem', color: 'var(--clr-text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{label}</div>
            </div>
          ))}
        </div>

        <div style={{ display: 'flex', gap: 10 }}>
          <button className="btn btn-primary" style={{ flex: 1 }}><Edit size={14} /> Edit Profile</button>
          <button className="btn btn-ghost" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
}

function DoctorCard({ doc, onClick }) {
  const s = STATUS_DOT[doc.status] || STATUS_DOT.online;
  return (
    <div className="card" style={{ cursor: 'pointer' }} onClick={onClick}>
      <div style={{ height: 3, background: `linear-gradient(90deg, ${doc.color}, ${doc.color}55)`, borderRadius: 2, marginBottom: 'var(--sp-md)', marginTop: -24, marginLeft: -24, marginRight: -24, paddingTop: 24 }} />

      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14, marginBottom: 'var(--sp-md)' }}>
        <div className="avatar-wrap">
          <div className="avatar" style={{
            width: 52, height: 52, fontSize: '1rem', flexShrink: 0,
            background: `linear-gradient(135deg, ${doc.color}, ${doc.color}88)`,
          }}>{doc.avatar}</div>
          <span className="status-dot" style={{ background: s.color, bottom: 1, right: 1, width: 11, height: 11 }} />
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--clr-text-primary)', marginBottom: 2 }}>{doc.name}</div>
          <div style={{ fontSize: '0.78rem', color: doc.color, fontWeight: 600 }}>{doc.specialty}</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 4 }}>
            <Star size={11} fill="#fbbf24" color="#fbbf24" />
            <span style={{ fontSize: '0.75rem', fontWeight: 700 }}>{doc.rating}</span>
            <span style={{ fontSize: '0.72rem', color: 'var(--clr-text-muted)' }}>· {s.label}</span>
          </div>
        </div>
      </div>

      <hr className="divider" style={{ margin: '0 0 var(--sp-md)' }} />

      <div className="grid-3" style={{ gap: 8, textAlign: 'center' }}>
        <div>
          <div style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--clr-text-primary)' }}>{doc.patients}</div>
          <div style={{ fontSize: '0.65rem', color: 'var(--clr-text-muted)', textTransform: 'uppercase' }}>Patients</div>
        </div>
        <div>
          <div style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--clr-text-primary)' }}>{doc.experience}</div>
          <div style={{ fontSize: '0.65rem', color: 'var(--clr-text-muted)', textTransform: 'uppercase' }}>Experience</div>
        </div>
        <div>
          <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--clr-text-primary)' }}>{doc.schedule}</div>
          <div style={{ fontSize: '0.65rem', color: 'var(--clr-text-muted)', textTransform: 'uppercase' }}>Schedule</div>
        </div>
      </div>
    </div>
  );
}

export default function Doctors() {
  const { doctors } = useData();
  const [search, setSearch]   = useState('');
  const [filter, setFilter]   = useState('All');
  const [selected, setSelected] = useState(null);
  const [showAdd, setShowAdd] = useState(false);

  const filtered = doctors.filter(d => {
    const matchSearch = (d.name?.toLowerCase() || '').includes(search.toLowerCase()) ||
      (d.specialty?.toLowerCase() || '').includes(search.toLowerCase());
    const matchFilter = filter === 'All' || d.status === filter;
    return matchSearch && matchFilter;
  });

  return (
    <Layout pageTitle="Doctors" pageSubtitle={`${doctors.length} medical staff`}>
      <div className="grid-4 stagger animate-fadeIn" style={{ marginBottom: 'var(--sp-xl)' }}>
        {[
          { label: 'Total Staff',   value: doctors.length,                                        color: '#3b82f6' },
          { label: 'On Duty',       value: doctors.filter(d => d.status === 'online').length,      color: '#10b981' },
          { label: 'Away',          value: doctors.filter(d => d.status === 'away').length,        color: '#f59e0b' },
          { label: 'Off Duty',      value: doctors.filter(d => d.status === 'offline').length,     color: '#64748b' },
        ].map(({ label, value, color }) => (
          <div key={label} className="card" style={{ padding: '16px 20px', textAlign: 'center' }}>
            <div style={{ fontSize: '1.8rem', fontWeight: 800, color }}>{value}</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--clr-text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>{label}</div>
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 'var(--sp-xl)', flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: 220 }}>
          <Search size={15} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--clr-text-muted)' }} />
          <input className="form-input" style={{ paddingLeft: 38, borderRadius: 'var(--r-full)' }}
            placeholder="Search doctors…" value={search} onChange={e => setSearch(e.target.value)} />
        </div>

        <div style={{ display: 'flex', gap: 6 }}>
          {['All', 'online', 'away', 'offline'].map(s => (
            <button key={s}
              className={`btn btn-sm ${filter === s ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setFilter(s)}
              style={{ textTransform: 'capitalize' }}>
              {s === 'online' ? 'On Duty' : s === 'away' ? 'Away' : s === 'offline' ? 'Off Duty' : s}
            </button>
          ))}
        </div>

        <button className="btn btn-primary" onClick={() => setShowAdd(true)}>
          <Plus size={15} /> Add Doctor
        </button>
      </div>

      <div className="grid-3 stagger animate-fadeIn" style={{ animationDelay: '100ms' }}>
        {filtered.map(doc => (
          <DoctorCard key={doc.id} doc={doc} onClick={() => setSelected(doc)} />
        ))}
        {filtered.length === 0 && (
          <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: 60, color: 'var(--clr-text-muted)' }}>
            No doctors found matching your search.
          </div>
        )}
      </div>

      {selected && <DoctorModal doc={selected} onClose={() => setSelected(null)} />}
      {showAdd && <AddDoctorModal onClose={() => setShowAdd(false)} />}
    </Layout>
  );
}
