import { useState, useMemo } from 'react';
import { X, User, Calendar, Clock, FileText, Edit3, Save, Phone, Droplets, Activity, Stethoscope, ChevronRight, AlertCircle, CheckCircle, Eye } from 'lucide-react';

/* ── Patient View Modal (tabbed) ───────────────────────────── */
export function PatientViewModal({ patient, appointments, records, onClose, onViewConsultation, onCreateAppointment }) {
  const [tab, setTab] = useState('overview');

  const patientAppts = useMemo(() =>
    (appointments || []).filter(a => a.patient_id === patient.id || a.patient === patient.name)
      .sort((a, b) => (b.date || '').localeCompare(a.date || '')),
    [appointments, patient]);

  const patientRecords = useMemo(() =>
    (records || []).filter(r => r.patient_id === patient.id),
    [records, patient]);

  const completedAppts = patientAppts.filter(a => a.status === 'Completed');

  const initials = patient.name ? patient.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) : 'P';

  const tabs = [
    { id: 'overview', label: 'Overview' },
    { id: 'consultations', label: `Consultations (${completedAppts.length})` },
    { id: 'reports', label: `Reports (${patientRecords.length})` },
    { id: 'appointments', label: `Appointments (${patientAppts.length})` },
  ];

  return (
    <div className="modal-overlay" onClick={onClose} style={{ position:'fixed',inset:0,zIndex:99999,display:'flex',alignItems:'center',justifyContent:'center',padding:20,backgroundColor:'rgba(0,0,0,0.45)',backdropFilter:'blur(3px)' }}>
      <div className="card animate-fadeIn" onClick={e=>e.stopPropagation()} style={{ maxWidth:640,width:'100%',maxHeight:'85vh',padding:0,overflow:'hidden',borderRadius:16,display:'flex',flexDirection:'column' }}>
        {/* Header */}
        <div style={{ padding:'20px 24px',borderBottom:'1px solid var(--clr-border)',display:'flex',alignItems:'center',justifyContent:'space-between',flexShrink:0 }}>
          <div style={{ display:'flex',alignItems:'center',gap:14 }}>
            <div className="avatar" style={{ width:48,height:48,fontSize:'1rem' }}>{initials}</div>
            <div>
              <h2 style={{ margin:0,fontSize:'1.1rem',fontWeight:800,color:'var(--clr-text)' }}>{patient.name}</h2>
              <p style={{ margin:0,fontSize:'0.78rem',color:'var(--clr-subtext)' }}>P-{String(patient.id).padStart(4,'0')} • {patient.gender || 'Unknown'} • {patient.age ? `${patient.age}y` : 'Age N/A'}</p>
            </div>
          </div>
          <div style={{ display:'flex',alignItems:'center',gap:8 }}>
            <span className={`badge ${patient.status === 'Active' ? 'badge-success' : 'badge-warning'}`}>{patient.status || 'Active'}</span>
            <button onClick={onClose} style={{ background:'none',border:'none',cursor:'pointer',color:'var(--clr-subtext)' }}><X size={18}/></button>
          </div>
        </div>

        {/* Tabs */}
        <div style={{ display:'flex',borderBottom:'1px solid var(--clr-border)',padding:'0 24px',flexShrink:0 }}>
          {tabs.map(t => (
            <button key={t.id} onClick={()=>setTab(t.id)} style={{
              padding:'10px 16px',border:'none',borderBottom: tab===t.id ? '2px solid var(--clr-primary)' : '2px solid transparent',
              background:'transparent',color: tab===t.id ? 'var(--clr-primary)' : 'var(--clr-subtext)',
              fontSize:'0.78rem',fontWeight:700,cursor:'pointer',transition:'all 0.15s',
            }}>{t.label}</button>
          ))}
        </div>

        {/* Tab Content */}
        <div style={{ flex:1,overflow:'auto',padding:'20px 24px' }}>

          {/* Overview Tab */}
          {tab === 'overview' && (
            <div style={{ display:'flex',flexDirection:'column',gap:14 }}>
              <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr',gap:10 }}>
                {[
                  { icon: Phone, label:'Phone', value: patient.phone || 'N/A' },
                  { icon: Droplets, label:'Blood Type', value: patient.bloodType || 'Unknown' },
                  { icon: Calendar, label:'Last Visit', value: patient.lastVisit || 'Never' },
                  { icon: Activity, label:'Condition', value: patient.condition || 'N/A' },
                ].map(item => (
                  <div key={item.label} style={{ padding:12,background:'var(--clr-bg)',borderRadius:8,border:'1px solid var(--clr-border)' }}>
                    <div style={{ display:'flex',alignItems:'center',gap:6,fontSize:'0.68rem',color:'var(--clr-subtext)',fontWeight:700,textTransform:'uppercase',marginBottom:4 }}>
                      <item.icon size={12}/> {item.label}
                    </div>
                    <div style={{ fontSize:'0.88rem',fontWeight:700,color:'var(--clr-text)' }}>{item.value}</div>
                  </div>
                ))}
              </div>
              {/* Quick stats */}
              <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:10 }}>
                <div style={{ padding:12,background:'var(--clr-bg)',borderRadius:8,textAlign:'center',border:'1px solid var(--clr-border)' }}>
                  <div style={{ fontSize:'1.3rem',fontWeight:900,color:'var(--clr-primary)' }}>{patientAppts.length}</div>
                  <div style={{ fontSize:'0.7rem',color:'var(--clr-subtext)',fontWeight:700 }}>Appointments</div>
                </div>
                <div style={{ padding:12,background:'var(--clr-bg)',borderRadius:8,textAlign:'center',border:'1px solid var(--clr-border)' }}>
                  <div style={{ fontSize:'1.3rem',fontWeight:900,color:'var(--clr-primary)' }}>{completedAppts.length}</div>
                  <div style={{ fontSize:'0.7rem',color:'var(--clr-subtext)',fontWeight:700 }}>Consultations</div>
                </div>
                <div style={{ padding:12,background:'var(--clr-bg)',borderRadius:8,textAlign:'center',border:'1px solid var(--clr-border)' }}>
                  <div style={{ fontSize:'1.3rem',fontWeight:900,color:'var(--clr-primary)' }}>{patientRecords.length}</div>
                  <div style={{ fontSize:'0.7rem',color:'var(--clr-subtext)',fontWeight:700 }}>Reports</div>
                </div>
              </div>
              {/* Actions */}
              <div style={{ display:'flex',gap:10,marginTop:6 }}>
                <button className="btn btn-primary btn-sm" onClick={()=>onViewConsultation(patient)} style={{ flex:1,display:'flex',alignItems:'center',justifyContent:'center',gap:6 }}>
                  <Stethoscope size={14}/> View Consultation
                </button>
                <button className="btn btn-secondary btn-sm" onClick={()=>{onClose();onCreateAppointment&&onCreateAppointment(patient);}} style={{ flex:1,display:'flex',alignItems:'center',justifyContent:'center',gap:6 }}>
                  <Calendar size={14}/> Book Appointment
                </button>
              </div>
            </div>
          )}

          {/* Consultations Tab */}
          {tab === 'consultations' && (
            <div style={{ display:'flex',flexDirection:'column',gap:10 }}>
              {completedAppts.length === 0 ? (
                <EmptyState icon={Stethoscope} text="No completed consultations yet"/>
              ) : completedAppts.map(a => (
                <div key={a.id} style={{ padding:14,background:'var(--clr-bg)',borderRadius:10,border:'1px solid var(--clr-border)',display:'flex',alignItems:'center',justifyContent:'space-between' }}>
                  <div>
                    <div style={{ fontWeight:700,fontSize:'0.88rem',color:'var(--clr-text)' }}>{a.type || 'Consultation'}</div>
                    <div style={{ display:'flex',alignItems:'center',gap:10,marginTop:4,fontSize:'0.76rem',color:'var(--clr-subtext)' }}>
                      <span style={{ display:'flex',alignItems:'center',gap:4 }}><Calendar size={11}/> {a.date}</span>
                      <span style={{ display:'flex',alignItems:'center',gap:4 }}><Clock size={11}/> {a.time}</span>
                    </div>
                  </div>
                  <div style={{ display:'flex',alignItems:'center',gap:8 }}>
                    <span className="badge badge-success" style={{ fontSize:'0.68rem' }}>Completed</span>
                    <button className="btn btn-sm" onClick={()=>onViewConsultation(patient)} style={{ padding:'5px 10px',fontSize:'0.72rem',display:'flex',alignItems:'center',gap:4,background:'transparent',border:'1px solid var(--clr-border)',color:'var(--clr-text)' }}>
                      <Eye size={12}/> View
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Reports Tab */}
          {tab === 'reports' && (
            <div style={{ display:'flex',flexDirection:'column',gap:10 }}>
              {patientRecords.length === 0 ? (
                <EmptyState icon={FileText} text="No clinical reports found"/>
              ) : patientRecords.map(r => (
                <div key={r.id} style={{ padding:14,background:'var(--clr-bg)',borderRadius:10,border:'1px solid var(--clr-border)',display:'flex',alignItems:'center',justifyContent:'space-between' }}>
                  <div>
                    <div style={{ fontWeight:700,fontSize:'0.88rem',color:'var(--clr-text)' }}>
                      {r.type || r.diagnosis || 'Clinical Report'}
                      {r.tooth && <span style={{ fontSize:'0.75rem',color:'var(--clr-subtext)',marginLeft:8 }}>Tooth #{r.tooth}</span>}
                    </div>
                    <div style={{ display:'flex',alignItems:'center',gap:10,marginTop:4,fontSize:'0.76rem',color:'var(--clr-subtext)' }}>
                      <span style={{ display:'flex',alignItems:'center',gap:4 }}><Calendar size={11}/> {r.date || 'N/A'}</span>
                      <span style={{ display:'flex',alignItems:'center',gap:4 }}><User size={11}/> {r.doctor || 'N/A'}</span>
                    </div>
                  </div>
                  <div style={{ display:'flex',alignItems:'center',gap:6 }}>
                    <span className={`badge ${r.status==='Final'?'badge-success':'badge-warning'}`} style={{ fontSize:'0.68rem' }}>{r.status || 'Draft'}</span>
                    <button className="btn btn-sm" style={{ padding:'5px 10px',fontSize:'0.72rem',display:'flex',alignItems:'center',gap:4,background:'transparent',border:'1px solid var(--clr-border)',color:'var(--clr-text)' }}>
                      <Eye size={12}/> View
                    </button>
                    <button className="btn btn-sm" style={{ padding:'5px 10px',fontSize:'0.72rem',display:'flex',alignItems:'center',gap:4,background:'transparent',border:'1px solid var(--clr-border)',color:'var(--clr-primary)' }}>
                      <Edit3 size={12}/> Edit
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Appointments Tab */}
          {tab === 'appointments' && (
            <div style={{ display:'flex',flexDirection:'column',gap:10 }}>
              {patientAppts.length === 0 ? (
                <EmptyState icon={Calendar} text="No appointments found"/>
              ) : patientAppts.map(a => (
                <div key={a.id} style={{ padding:14,background:'var(--clr-bg)',borderRadius:10,border:'1px solid var(--clr-border)',display:'flex',alignItems:'center',justifyContent:'space-between' }}>
                  <div>
                    <div style={{ fontWeight:700,fontSize:'0.88rem',color:'var(--clr-text)' }}>{a.type || 'Appointment'}</div>
                    <div style={{ display:'flex',alignItems:'center',gap:10,marginTop:4,fontSize:'0.76rem',color:'var(--clr-subtext)' }}>
                      <span style={{ display:'flex',alignItems:'center',gap:4 }}><Calendar size={11}/> {a.date}</span>
                      <span style={{ display:'flex',alignItems:'center',gap:4 }}><Clock size={11}/> {a.time}</span>
                    </div>
                  </div>
                  <span className={`badge ${a.status==='Completed'?'badge-success':a.status==='Cancelled'?'badge-danger':'badge-warning'}`} style={{ fontSize:'0.68rem' }}>{a.status}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function EmptyState({ icon: Icon, text }) {
  return (
    <div style={{ padding:'40px 20px',textAlign:'center' }}>
      <Icon size={28} style={{ color:'var(--clr-text-light)',marginBottom:8 }}/>
      <div style={{ fontSize:'0.86rem',color:'var(--clr-subtext)',fontWeight:600 }}>{text}</div>
    </div>
  );
}

/* ── New Patient Modal ─────────────────────────────────────── */
export function NewPatientModal({ onClose, onSave }) {
  const [form, setForm] = useState({ name:'', phone:'', age:'', gender:'Male', condition:'Routine Checkup', status:'Active', notes:'' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const set = (k,v) => setForm(p=>({...p,[k]:v}));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) { setError('Patient name is required.'); return; }
    setSaving(true); setError('');
    try {
      const result = await onSave({
        name: form.name.trim(),
        phone: form.phone.trim() || null,
        age: form.age ? parseInt(form.age) : null,
        gender: form.gender,
        condition: form.condition,
        status: form.status,
      });
      if (result) onClose(result);
      else setError('Failed to save patient.');
    } catch { setError('An error occurred.'); }
    finally { setSaving(false); }
  };

  return (
    <div className="modal-overlay" onClick={()=>onClose(null)} style={{ position:'fixed',inset:0,zIndex:99999,display:'flex',alignItems:'center',justifyContent:'center',padding:20,backgroundColor:'rgba(0,0,0,0.45)',backdropFilter:'blur(3px)' }}>
      <form className="card animate-fadeIn" onClick={e=>e.stopPropagation()} onSubmit={handleSubmit} style={{ maxWidth:480,width:'100%',padding:0,overflow:'hidden',borderRadius:16 }}>
        <div style={{ padding:'20px 24px',borderBottom:'1px solid var(--clr-border)',display:'flex',alignItems:'center',justifyContent:'space-between' }}>
          <div style={{ display:'flex',alignItems:'center',gap:10 }}>
            <div style={{ width:36,height:36,borderRadius:8,background:'var(--clr-primary-light)',display:'grid',placeItems:'center' }}>
              <User size={16} color="var(--clr-primary-dark)"/>
            </div>
            <h2 style={{ margin:0,fontSize:'1.05rem',fontWeight:800 }}>New Patient</h2>
          </div>
          <button type="button" onClick={()=>onClose(null)} style={{ background:'none',border:'none',cursor:'pointer',color:'var(--clr-subtext)' }}><X size={18}/></button>
        </div>
        <div style={{ padding:'20px 24px',display:'flex',flexDirection:'column',gap:14 }}>
          {error && (
            <div style={{ padding:'8px 12px',borderRadius:8,fontSize:'0.8rem',fontWeight:600,background:'rgba(239,68,68,0.08)',color:'#dc2626',border:'1px solid rgba(239,68,68,0.15)',display:'flex',alignItems:'center',gap:6 }}>
              <AlertCircle size={14}/> {error}
            </div>
          )}
          <div className="form-group"><label className="form-label">Full Name *</label>
            <input className="form-input" required placeholder="e.g. Ahmed Al-Rashid" value={form.name} onChange={e=>set('name',e.target.value)}/>
          </div>
          <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr',gap:12 }}>
            <div className="form-group"><label className="form-label">Phone</label>
              <input className="form-input" placeholder="+966..." value={form.phone} onChange={e=>set('phone',e.target.value)}/>
            </div>
            <div className="form-group"><label className="form-label">Age</label>
              <input className="form-input" type="number" min="0" max="150" placeholder="30" value={form.age} onChange={e=>set('age',e.target.value)}/>
            </div>
          </div>
          <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr',gap:12 }}>
            <div className="form-group"><label className="form-label">Gender</label>
              <select className="form-select" value={form.gender} onChange={e=>set('gender',e.target.value)} style={{ width:'100%' }}>
                <option>Male</option><option>Female</option><option>Other</option>
              </select>
            </div>
            <div className="form-group"><label className="form-label">Status</label>
              <select className="form-select" value={form.status} onChange={e=>set('status',e.target.value)} style={{ width:'100%' }}>
                <option>Active</option><option>Inactive</option><option>Critical</option>
              </select>
            </div>
          </div>
          <div className="form-group"><label className="form-label">Condition</label>
            <input className="form-input" placeholder="e.g. Routine Checkup, Dental Pain..." value={form.condition} onChange={e=>set('condition',e.target.value)}/>
          </div>
        </div>
        <div style={{ padding:'14px 24px',borderTop:'1px solid var(--clr-border)',display:'flex',gap:10,justifyContent:'flex-end' }}>
          <button type="button" className="btn btn-secondary" onClick={()=>onClose(null)}>Cancel</button>
          <button type="submit" className="btn btn-primary" disabled={saving} style={{ display:'flex',alignItems:'center',gap:6 }}>
            <Save size={14}/> {saving ? 'Saving…' : 'Add Patient'}
          </button>
        </div>
      </form>
    </div>
  );
}

/* ── Filter Panel ──────────────────────────────────────────── */
export function FilterPanel({ filters, onChange, onReset }) {
  const set = (k,v) => onChange({ ...filters, [k]: v });

  return (
    <div className="card animate-fadeIn" style={{ padding:16,display:'flex',flexDirection:'column',gap:12 }}>
      <div style={{ display:'flex',alignItems:'center',justifyContent:'space-between' }}>
        <span style={{ fontSize:'0.78rem',fontWeight:800,color:'var(--clr-text)',textTransform:'uppercase' }}>Filters</span>
        <button onClick={onReset} style={{ background:'none',border:'none',cursor:'pointer',color:'var(--clr-primary)',fontSize:'0.72rem',fontWeight:700 }}>Reset</button>
      </div>
      <div className="form-group"><label className="form-label" style={{ fontSize:'0.72rem' }}>Status</label>
        <select className="form-select" value={filters.status} onChange={e=>set('status',e.target.value)} style={{ width:'100%',fontSize:'0.82rem' }}>
          <option value="">All</option><option>Active</option><option>Inactive</option><option>Critical</option>
        </select>
      </div>
      <div className="form-group"><label className="form-label" style={{ fontSize:'0.72rem' }}>Gender</label>
        <select className="form-select" value={filters.gender} onChange={e=>set('gender',e.target.value)} style={{ width:'100%',fontSize:'0.82rem' }}>
          <option value="">All</option><option>Male</option><option>Female</option>
        </select>
      </div>
      <div className="form-group"><label className="form-label" style={{ fontSize:'0.72rem' }}>Has Records</label>
        <select className="form-select" value={filters.hasRecords} onChange={e=>set('hasRecords',e.target.value)} style={{ width:'100%',fontSize:'0.82rem' }}>
          <option value="">All</option><option value="yes">With Reports</option><option value="no">No Reports</option>
        </select>
      </div>
    </div>
  );
}
