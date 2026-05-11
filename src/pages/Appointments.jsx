import { useState } from 'react';
import Layout from '../components/Layout';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import {
  Search, Plus, Calendar, Clock, MapPin, User,
  X, ChevronLeft, ChevronRight, Filter
} from 'lucide-react';

const STATUS_CLASS = {
  Confirmed: 'badge badge-success',
  Pending:   'badge badge-warning',
  Cancelled: 'badge badge-danger',
  Completed: 'badge badge-primary',
};

const TYPE_CLASS = {
  'Follow-up':    'badge badge-primary',
  'Consultation': 'badge badge-cyan',
  'Urgent':       'badge badge-danger',
  'Check-up':     'badge badge-success',
  'Therapy':      'badge badge-purple',
  'ECG Test':     'badge badge-primary',
  'MRI Review':   'badge badge-cyan',
  'Surgery Prep': 'badge badge-warning',
};

/* ── Add Appointment Modal ─────────────────────────────────── */
function AddModal({ onClose }) {
  const { addAppointment, doctors, patients } = useData();
  const [formData, setFormData] = useState({
    patient: patients[0]?.name || '',
    doctor: doctors[0]?.name || '',
    date: '2026-04-23',
    time: '09:00',
    type: 'Consultation',
    room: '',
    notes: ''
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    addAppointment({
      ...formData,
      status: 'Pending'
    });
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 99999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px', backgroundColor: 'rgba(0, 0, 0, 0.4)', backdropFilter: 'blur(2px)' }}>
      <form className="modal animate-fadeIn" onClick={e => e.stopPropagation()} style={{ maxWidth: 480, width: '100%', borderRadius: '16px', padding: 0, overflow: 'hidden', boxShadow: '0 20px 40px rgba(0,0,0,0.1)' }} onSubmit={handleSubmit}>
        
        {/* Modal Header */}
        <div className="modal-header" style={{ padding: '20px', backgroundColor: '#fff', borderBottom: '1px solid var(--clr-border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ background: 'var(--clr-primary-light, rgba(16, 185, 129, 0.1))', padding: '10px', borderRadius: '10px', color: 'var(--clr-primary)' }}>
              <Calendar size={18} />
            </div>
            <div>
              <h2 className="modal-title" style={{ margin: 0, fontSize: '1.15rem', fontWeight: 700, color: 'var(--clr-text-primary)' }}>New Appointment</h2>
              <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--clr-text-muted)', marginTop: '2px' }}>Schedule a visit for a patient</p>
            </div>
          </div>
          <button type="button" onClick={onClose} style={{ background: 'var(--clr-surface-2)', border: 'none', cursor: 'pointer', color: 'var(--clr-text-muted)', width: '32px', height: '32px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s' }} onMouseEnter={e => e.currentTarget.style.background = 'var(--clr-border)'} onMouseLeave={e => e.currentTarget.style.background = 'var(--clr-surface-2)'}>
            <X size={16} />
          </button>
        </div>

        {/* Modal Body */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16, padding: '20px', backgroundColor: '#fff' }}>
          <div className="form-group">
            <label className="form-label" style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--clr-text-secondary)', marginBottom: '6px', display: 'block' }}>Patient Name</label>
            <div style={{ position: 'relative' }}>
              <User size={16} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--clr-text-muted)', pointerEvents: 'none' }} />
              <select 
                className="form-select" 
                required 
                style={{ paddingLeft: 40, width: '100%', borderRadius: '8px', border: '1px solid var(--clr-border)' }}
                value={formData.patient}
                onChange={e => setFormData({...formData, patient: e.target.value})}
              >
                {patients.map(p => <option key={p.id} value={p.name}>{p.name}</option>)}
              </select>
            </div>
          </div>

          <div className="grid-2" style={{ gap: 12 }}>
            <div className="form-group">
              <label className="form-label" style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--clr-text-secondary)', marginBottom: '6px', display: 'block' }}>Doctor</label>
              <select 
                className="form-select"
                style={{ width: '100%', borderRadius: '8px', border: '1px solid var(--clr-border)' }}
                value={formData.doctor}
                onChange={e => setFormData({...formData, doctor: e.target.value})}
              >
                {doctors.map(d => <option key={d.id}>{d.name}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label" style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--clr-text-secondary)', marginBottom: '6px', display: 'block' }}>Appointment Type</label>
              <select 
                className="form-select"
                style={{ width: '100%', borderRadius: '8px', border: '1px solid var(--clr-border)' }}
                value={formData.type}
                onChange={e => setFormData({...formData, type: e.target.value})}
              >
                <option>Consultation</option>
                <option>Follow-up</option>
                <option>Check-up</option>
                <option>Urgent</option>
                <option>Therapy</option>
                <option>Surgery Prep</option>
              </select>
            </div>
          </div>

          <div className="grid-2" style={{ gap: 12 }}>
            <div className="form-group">
              <label className="form-label" style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--clr-text-secondary)', marginBottom: '6px', display: 'block' }}>Date</label>
              <input 
                className="form-input" type="date" 
                style={{ width: '100%', borderRadius: '8px', border: '1px solid var(--clr-border)' }}
                value={formData.date}
                onChange={e => setFormData({...formData, date: e.target.value})}
              />
            </div>
            <div className="form-group">
              <label className="form-label" style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--clr-text-secondary)', marginBottom: '6px', display: 'block' }}>Time & Room</label>
              <div style={{ display: 'flex', gap: 8 }}>
                <input 
                  className="form-input" type="time" 
                  style={{ width: '60%', borderRadius: '8px', border: '1px solid var(--clr-border)' }}
                  value={formData.time}
                  onChange={e => setFormData({...formData, time: e.target.value})}
                />
                <input 
                  className="form-input" placeholder="Room" 
                  style={{ width: '40%', borderRadius: '8px', border: '1px solid var(--clr-border)' }}
                  value={formData.room}
                  onChange={e => setFormData({...formData, room: e.target.value})}
                />
              </div>
            </div>
          </div>

          <div className="form-group">
            <label className="form-label" style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--clr-text-secondary)', marginBottom: '6px', display: 'block' }}>Notes</label>
            <textarea 
              className="form-textarea" placeholder="Add any special notes or requirements..." style={{ minHeight: 70, width: '100%', borderRadius: '8px', border: '1px solid var(--clr-border)', padding: '12px', resize: 'vertical' }} 
              value={formData.notes}
              onChange={e => setFormData({...formData, notes: e.target.value})}
            />
          </div>
        </div>

        {/* Modal Footer */}
        <div style={{ padding: '16px 20px', backgroundColor: 'var(--clr-surface-50, #f8fafc)', borderTop: '1px solid var(--clr-border)', display: 'flex', gap: 12, justifyContent: 'flex-end', alignItems: 'center' }}>
          <button type="button" className="btn btn-ghost" onClick={onClose} style={{ padding: '10px 16px', borderRadius: '8px', fontWeight: 600, color: 'var(--clr-text-secondary)' }}>Cancel</button>
          <button type="submit" className="btn btn-primary" style={{ padding: '10px 20px', borderRadius: '8px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px', boxShadow: '0 4px 12px var(--clr-primary-light)' }}>
            <Calendar size={16} /> Confirm
          </button>
        </div>
      </form>
    </div>
  );
}

/* ── Mini Calendar ─────────────────────────────────────────── */
function MiniCalendar({ selectedDate, onSelect }) {
  const [month, setMonth] = useState(new Date(2026, 3, 1)); // April 2026

  const year  = month.getFullYear();
  const mon   = month.getMonth();
  const first = new Date(year, mon, 1).getDay();
  const days  = new Date(year, mon + 1, 0).getDate();

  const { appointments } = useData();
  const dateStr = (d) =>
    `${year}-${String(mon + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;

  const apptDays = new Set(appointments.map(a => a.date));

  const monthNames = ['January','February','March','April','May','June',
    'July','August','September','October','November','December'];

  return (
    <div className="card" style={{ padding: 'var(--sp-md)' }}>
      {/* Month Nav */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <button className="icon-btn" style={{ width: 28, height: 28 }}
          onClick={() => setMonth(new Date(year, mon - 1, 1))}>
          <ChevronLeft size={14} />
        </button>
        <span style={{ fontSize: '0.85rem', fontWeight: 700 }}>
          {monthNames[mon]} {year}
        </span>
        <button className="icon-btn" style={{ width: 28, height: 28 }}
          onClick={() => setMonth(new Date(year, mon + 1, 1))}>
          <ChevronRight size={14} />
        </button>
      </div>

      {/* Day Headers */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 2, marginBottom: 4 }}>
        {['S','M','T','W','T','F','S'].map((d, i) => (
          <div key={i} style={{ textAlign: 'center', fontSize: '0.65rem', color: 'var(--clr-text-muted)', fontWeight: 700, padding: '2px 0' }}>
            {d}
          </div>
        ))}
      </div>

      {/* Days Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 2 }}>
        {Array.from({ length: first }).map((_, i) => <div key={`e${i}`} />)}
        {Array.from({ length: days }, (_, i) => i + 1).map(d => {
          const ds = dateStr(d);
          const isSelected = ds === selectedDate;
          const hasAppt    = apptDays.has(ds);
          return (
            <button key={d}
              onClick={() => onSelect(ds)}
              style={{
                aspectRatio: '1', borderRadius: 'var(--r-sm)',
                border: 'none', cursor: 'pointer',
                fontSize: '0.75rem', fontWeight: hasAppt ? 700 : 400,
                position: 'relative',
                background: isSelected ? 'var(--grad-primary)' : 'transparent',
                color: isSelected ? '#fff' : hasAppt ? 'var(--clr-primary)' : 'var(--clr-text-secondary)',
                transition: 'all var(--tr-fast)',
              }}
              onMouseEnter={e => { if (!isSelected) e.currentTarget.style.background = 'var(--clr-surface-2)'; }}
              onMouseLeave={e => { if (!isSelected) e.currentTarget.style.background = 'transparent'; }}
            >
              {d}
              {hasAppt && !isSelected && (
                <span style={{
                  position: 'absolute', bottom: 2, left: '50%', transform: 'translateX(-50%)',
                  width: 4, height: 4, borderRadius: '50%', background: 'var(--clr-primary)',
                }} />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* ── Appointments Page ─────────────────────────────────────── */
export default function Appointments() {
  const { user } = useAuth();
  const { appointments } = useData();
  const [search, setSearch]   = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [selectedDate, setSelectedDate] = useState('2026-04-23');
  const [showAdd, setShowAdd] = useState(false);

  const filtered = appointments.filter(a => {
    const matchSearch = (a.patient?.toLowerCase() || '').includes(search.toLowerCase()) ||
      (a.doctor?.toLowerCase() || '').includes(search.toLowerCase()) ||
      (a.type?.toLowerCase() || '').includes(search.toLowerCase());
    const matchStatus = statusFilter === 'All' || a.status === statusFilter;
    const matchDate   = !selectedDate || a.date === selectedDate;
    return matchSearch && matchStatus && matchDate;
  });

  const counts = {
    Confirmed: appointments.filter(a => a.status === 'Confirmed').length,
    Pending:   appointments.filter(a => a.status === 'Pending').length,
    Cancelled: appointments.filter(a => a.status === 'Cancelled').length,
  };

  return (
    <Layout pageTitle="Appointments" pageSubtitle={`${appointments.length} scheduled appointments`}>

      {/* ── Summary Strip ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '24px' }}>
        {[
          { label: 'Total Appointments', value: appointments.length, color: 'var(--clr-primary)' },
          { label: 'Confirmed',          value: counts.Confirmed,    color: 'var(--clr-success)' },
          { label: 'Pending',            value: counts.Pending,      color: 'var(--clr-warning)' },
          { label: 'Cancelled',          value: counts.Cancelled,    color: 'var(--clr-danger)' },
        ].map(({ label, value, color }) => (
          <div key={label} className="card animate-fadeIn" style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <div style={{ fontSize: '0.75rem', color: 'var(--clr-text-muted)', fontWeight: 600, textTransform: 'uppercase', marginBottom: '4px', letterSpacing: '0.05em' }}>{label}</div>
              <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--clr-text-primary)' }}>{value}</div>
            </div>
            <div style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: color, boxShadow: `0 0 8px ${color}40` }} />
          </div>
        ))}
      </div>

      {/* ── Main Grid ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '260px 1fr', gap: '24px', alignItems: 'start' }}>

        {/* Sidebar: Calendar */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <MiniCalendar selectedDate={selectedDate} onSelect={d => setSelectedDate(prev => prev === d ? '' : d)} />

          {/* Legend */}
          <div className="card" style={{ padding: '16px' }}>
            <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--clr-text-muted)', marginBottom: 12, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              Status Legend
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {[
                { label: 'Confirmed', cls: 'badge badge-success' },
                { label: 'Pending',   cls: 'badge badge-warning' },
                { label: 'Cancelled', cls: 'badge badge-danger' },
              ].map(({ label, cls }) => (
                <div key={label} style={{ display: 'flex', alignItems: 'center' }}>
                  <span className={cls} style={{ width: '100%', textAlign: 'center', padding: '6px 0' }}>{label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Main: Table Area */}
        <div className="card animate-fadeIn" style={{ padding: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          
          {/* Top Controls: Search & Filters */}
          <div style={{ padding: '20px', borderBottom: '1px solid var(--clr-border)', display: 'flex', flexWrap: 'wrap', gap: '16px', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#fff' }}>
            
            {/* Search */}
            <div style={{ position: 'relative', flex: '1 1 250px', maxWidth: '320px' }}>
              <Search size={16} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--clr-text-muted)' }} />
              <input className="form-input" style={{ paddingLeft: '40px', width: '100%', margin: 0, borderRadius: '8px', border: '1px solid var(--clr-border)' }}
                placeholder="Search appointments..." value={search} onChange={e => setSearch(e.target.value)} />
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
              {/* Tab Filters */}
              <div style={{ display: 'flex', background: 'var(--clr-surface-2)', padding: '4px', borderRadius: '8px' }}>
                {['All', 'Confirmed', 'Pending', 'Cancelled', 'Completed'].map(s => (
                  <button key={s}
                    style={{
                      padding: '6px 14px',
                      border: 'none',
                      borderRadius: '6px',
                      fontSize: '0.8rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                      background: statusFilter === s ? '#fff' : 'transparent',
                      color: statusFilter === s ? 'var(--clr-text-primary)' : 'var(--clr-text-muted)',
                      boxShadow: statusFilter === s ? '0 1px 2px rgba(0,0,0,0.05)' : 'none',
                      transition: 'all 0.2s ease'
                    }}
                    onClick={() => setStatusFilter(s)}>
                    {s}
                  </button>
                ))}
              </div>

              {/* Add Button */}
              {['doctor', 'receptionist'].includes(user?.role?.toLowerCase()) && (
                <button className="btn btn-primary" onClick={() => setShowAdd(true)} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 16px', borderRadius: '8px' }}>
                  <Plus size={16} /> New Appointment
                </button>
              )}
            </div>
          </div>

          {/* Active Date Indicator */}
          {selectedDate && (
            <div style={{ padding: '10px 20px', background: 'var(--clr-surface-50, #f8fafc)', borderBottom: '1px solid var(--clr-border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ fontSize: '0.85rem', color: 'var(--clr-primary)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Calendar size={14} /> 
                Showing appointments for: {selectedDate}
              </div>
              <button className="btn btn-sm btn-ghost" onClick={() => setSelectedDate('')} style={{ fontSize: '0.75rem', padding: '4px 8px', color: 'var(--clr-text-muted)' }}>
                <X size={14} /> Clear Filter
              </button>
            </div>
          )}

          {/* Table Content */}
          <div className="table-wrapper" style={{ borderRadius: 0, border: 'none', margin: 0, overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid var(--clr-border)', backgroundColor: '#fff' }}>
                  <th style={{ padding: '16px 20px', fontSize: '0.75rem', color: 'var(--clr-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>ID</th>
                  <th style={{ padding: '16px 20px', fontSize: '0.75rem', color: 'var(--clr-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>Patient</th>
                  <th style={{ padding: '16px 20px', fontSize: '0.75rem', color: 'var(--clr-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>Doctor</th>
                  <th style={{ padding: '16px 20px', fontSize: '0.75rem', color: 'var(--clr-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>Type</th>
                  <th style={{ padding: '16px 20px', fontSize: '0.75rem', color: 'var(--clr-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>Date &amp; Time</th>
                  <th style={{ padding: '16px 20px', fontSize: '0.75rem', color: 'var(--clr-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>Room</th>
                  <th style={{ padding: '16px 20px', fontSize: '0.75rem', color: 'var(--clr-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(a => (
                  <tr key={a.id} 
                      style={{ borderBottom: '1px solid var(--clr-border)', transition: 'background-color 0.15s ease' }}
                      onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--clr-surface-50, #f8fafc)'}
                      onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}>
                    <td style={{ padding: '16px 20px', color: 'var(--clr-text-muted)', fontFamily: 'var(--font-mono)', fontSize: '0.85rem' }}>#{a.id.toString().padStart(3,'0')}</td>
                    <td style={{ padding: '16px 20px', fontWeight: 600, color: 'var(--clr-text-primary)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'var(--clr-surface-2)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--clr-text-muted)' }}>
                          <User size={16} />
                        </div>
                        {a.patient}
                      </div>
                    </td>
                    <td style={{ padding: '16px 20px', color: 'var(--clr-text-secondary)', fontSize: '0.9rem', fontWeight: 500 }}>{a.doctor}</td>
                    <td style={{ padding: '16px 20px' }}>
                      <span className={TYPE_CLASS[a.type] || 'badge badge-primary'} style={{ fontWeight: 600 }}>{a.type}</span>
                    </td>
                    <td style={{ padding: '16px 20px' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem', color: 'var(--clr-text-primary)', fontWeight: 500 }}>
                          <Calendar size={13} style={{ color: 'var(--clr-text-muted)' }} /> {a.date}
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', color: 'var(--clr-text-muted)' }}>
                          <Clock size={13} /> {a.time}
                        </div>
                      </div>
                    </td>
                    <td style={{ padding: '16px 20px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem', color: 'var(--clr-text-secondary)' }}>
                        <MapPin size={13} style={{ color: 'var(--clr-text-muted)' }} /> {a.room}
                      </div>
                    </td>
                    <td style={{ padding: '16px 20px' }}>
                      <span className={STATUS_CLASS[a.status]} style={{ padding: '4px 10px', fontSize: '0.75rem', fontWeight: 600 }}>{a.status}</span>
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={7} style={{ textAlign: 'center', padding: '64px 20px', color: 'var(--clr-text-muted)' }}>
                      <Calendar size={40} style={{ margin: '0 auto 16px', opacity: 0.2, display: 'block' }} />
                      <p style={{ fontSize: '1rem', fontWeight: 500, margin: 0 }}>No appointments found</p>
                      <p style={{ fontSize: '0.85rem', marginTop: '4px' }}>Try adjusting your filters or search term</p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {showAdd && <AddModal onClose={() => setShowAdd(false)} />}
    </Layout>
  );
}
