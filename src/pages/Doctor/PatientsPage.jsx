import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Calendar, ChevronRight, Clock, Filter, Phone, Plus, Search, Stethoscope, User, X, Eye } from 'lucide-react';
import Layout from '../../components/Layout';
import { useData } from '../../context/DataContext';
import { PatientViewModal, NewPatientModal, FilterPanel } from '../../components/PatientModals';

const DEFAULT_FILTERS = { status: '', gender: '', hasRecords: '' };

export default function PatientsPage() {
  const navigate = useNavigate();
  const { patients, appointments, records, addPatient } = useData();
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState(DEFAULT_FILTERS);
  const [showFilters, setShowFilters] = useState(false);
  const [showNewPatient, setShowNewPatient] = useState(false);
  const [viewPatient, setViewPatient] = useState(null);
  const [justAdded, setJustAdded] = useState(null);

  // Filtering logic
  const filtered = useMemo(() => {
    return patients.filter(p => {
      const q = search.toLowerCase();
      const matchSearch = !q || [p.name, p.phone, String(p.id), p.condition, p.gender, p.bloodType, p.lastVisit]
        .filter(Boolean).some(f => f.toLowerCase().includes(q));
      const matchStatus = !filters.status || p.status === filters.status;
      const matchGender = !filters.gender || p.gender === filters.gender;
      const matchRecords = !filters.hasRecords ||
        (filters.hasRecords === 'yes' && records.some(r => r.patient_id === p.id)) ||
        (filters.hasRecords === 'no' && !records.some(r => r.patient_id === p.id));
      return matchSearch && matchStatus && matchGender && matchRecords;
    });
  }, [patients, search, filters, records]);

  const activeFilterCount = Object.values(filters).filter(Boolean).length;

  const getPatientStats = (pid) => {
    const pAppts = appointments.filter(a => a.patient_id === pid || a.patient === patients.find(p=>p.id===pid)?.name);
    const pRecords = records.filter(r => r.patient_id === pid);
    return { appts: pAppts.length, records: pRecords.length };
  };

  const handleNewPatientClose = (newPatient) => {
    setShowNewPatient(false);
    if (newPatient) {
      setJustAdded(newPatient);
      setTimeout(() => setJustAdded(null), 5000);
    }
  };

  return (
    <Layout pageTitle="Patients" pageSubtitle="Clinical directory and consultation queue.">
      <div className="page-stack animate-fadeIn">

        {/* Top Controls */}
        <section className="section-header" style={{ display:'flex',alignItems:'center',justifyContent:'space-between',flexWrap:'wrap',gap:12 }}>
          <div style={{ position:'relative',flex:'1 1 260px',maxWidth:360 }}>
            <Search size={16} style={{ position:'absolute',left:14,top:'50%',transform:'translateY(-50%)',color:'var(--clr-text-light)' }}/>
            <input className="form-input" style={{ paddingLeft:38,width:'100%',margin:0 }}
              placeholder="Search name, phone, ID, condition..." value={search} onChange={e=>setSearch(e.target.value)}/>
            {search && <button onClick={()=>setSearch('')} style={{ position:'absolute',right:10,top:'50%',transform:'translateY(-50%)',background:'none',border:'none',cursor:'pointer',color:'var(--clr-text-light)' }}><X size={14}/></button>}
          </div>
          <div className="row-actions" style={{ gap:8 }}>
            <button className={`btn btn-sm ${showFilters || activeFilterCount ? 'btn-primary' : 'btn-secondary'}`}
              onClick={()=>setShowFilters(!showFilters)}
              style={{ display:'flex',alignItems:'center',gap:6 }}>
              <Filter size={14}/> Filters {activeFilterCount > 0 && `(${activeFilterCount})`}
            </button>
            <button className="btn btn-primary btn-sm" onClick={()=>setShowNewPatient(true)}
              style={{ display:'flex',alignItems:'center',gap:6 }}>
              <Plus size={14}/> New Patient
            </button>
          </div>
        </section>

        {/* Just-added toast */}
        {justAdded && (
          <div style={{ padding:'12px 18px',borderRadius:10,background:'var(--clr-primary-light)',border:'1px solid rgba(16,185,129,0.2)',display:'flex',alignItems:'center',justifyContent:'space-between' }}>
            <span style={{ fontSize:'0.84rem',fontWeight:700,color:'var(--clr-primary-dark)' }}>
              ✓ {justAdded.name} added successfully
            </span>
            <button className="btn btn-primary btn-sm" onClick={()=>{setJustAdded(null);navigate('/doctor/appointments');}}
              style={{ fontSize:'0.75rem',padding:'5px 12px' }}>
              <Calendar size={12}/> Book Appointment
            </button>
          </div>
        )}

        {/* Main Layout */}
        <div style={{ display:'grid',gridTemplateColumns: showFilters ? '220px 1fr' : '1fr',gap:16,alignItems:'start' }}>

          {/* Filter Sidebar */}
          {showFilters && <FilterPanel filters={filters} onChange={setFilters} onReset={()=>setFilters(DEFAULT_FILTERS)}/>}

          {/* Patient Grid */}
          <div>
            {/* Count */}
            <div style={{ fontSize:'0.78rem',color:'var(--clr-subtext)',fontWeight:700,marginBottom:12 }}>
              {filtered.length} patient{filtered.length !== 1 ? 's' : ''} found
              {(search || activeFilterCount > 0) && (
                <button onClick={()=>{setSearch('');setFilters(DEFAULT_FILTERS);}} style={{ marginLeft:8,background:'none',border:'none',color:'var(--clr-primary)',cursor:'pointer',fontSize:'0.72rem',fontWeight:700 }}>
                  Clear all
                </button>
              )}
            </div>

            {filtered.length === 0 ? (
              <div className="card" style={{ padding:'48px 24px',textAlign:'center' }}>
                <User size={32} style={{ color:'var(--clr-text-light)',marginBottom:10 }}/>
                <div style={{ fontSize:'0.95rem',fontWeight:800,color:'var(--clr-text)',marginBottom:4 }}>
                  {search || activeFilterCount ? 'No patients match your search' : 'No patients yet'}
                </div>
                <div style={{ fontSize:'0.82rem',color:'var(--clr-subtext)' }}>
                  {search || activeFilterCount ? 'Try adjusting your search or filters.' : 'Add your first patient to get started.'}
                </div>
              </div>
            ) : (
              <section className="responsive-card-grid">
                {filtered.map((patient) => {
                  const stats = getPatientStats(patient.id);
                  const initials = patient.name ? patient.name.split(' ').map(n=>n[0]).join('').toUpperCase().slice(0,2) : 'P';
                  return (
                    <article key={patient.id} className="card page-stack" style={{ gap:12,transition:'box-shadow 0.2s' }}>
                      {/* Header */}
                      <div style={{ display:'flex',alignItems:'center',justifyContent:'space-between' }}>
                        <div style={{ display:'flex',alignItems:'center',gap:10 }}>
                          <div className="avatar" style={{ width:38,height:38,fontSize:'0.78rem' }}>{initials}</div>
                          <div>
                            <h3 style={{ margin:0,fontSize:'0.92rem',fontWeight:800,color:'var(--clr-text)' }}>{patient.name}</h3>
                            <p style={{ margin:0,fontSize:'0.72rem',color:'var(--clr-subtext)' }}>P-{String(patient.id).padStart(4,'0')} • {patient.gender || 'Unknown'}</p>
                          </div>
                        </div>
                        <span className={`badge ${patient.status==='Active'?'badge-success':patient.status==='Critical'?'badge-danger':'badge-warning'}`} style={{ fontSize:'0.65rem' }}>
                          {patient.status || 'Active'}
                        </span>
                      </div>

                      {/* Info */}
                      <div style={{ display:'flex',flexDirection:'column',gap:6 }}>
                        <div style={{ display:'flex',alignItems:'center',gap:8,fontSize:'0.78rem',color:'var(--clr-subtext)' }}>
                          <Clock size={13}/> Age: <strong style={{ color:'var(--clr-text)' }}>{patient.age ? `${patient.age}y` : 'N/A'}</strong>
                        </div>
                        {patient.phone && (
                          <div style={{ display:'flex',alignItems:'center',gap:8,fontSize:'0.78rem',color:'var(--clr-subtext)' }}>
                            <Phone size={13}/> <strong style={{ color:'var(--clr-text)' }}>{patient.phone}</strong>
                          </div>
                        )}
                        <div style={{ display:'flex',alignItems:'center',gap:8,fontSize:'0.78rem',color:'var(--clr-subtext)' }}>
                          <Calendar size={13}/> Last: <strong style={{ color:'var(--clr-text)' }}>{patient.lastVisit || 'Never'}</strong>
                        </div>
                      </div>

                      {/* Condition */}
                      <div>
                        <p style={{ margin:0,fontSize:'0.68rem',color:'var(--clr-subtext)',fontWeight:700,textTransform:'uppercase',letterSpacing:'0.03em' }}>Condition</p>
                        <p style={{ margin:'2px 0 0',fontSize:'0.82rem',color:'var(--clr-text)' }}>{patient.condition || 'N/A'}</p>
                      </div>

                      {/* Stats row */}
                      <div style={{ display:'flex',gap:8 }}>
                        <span style={{ flex:1,textAlign:'center',padding:'6px 0',background:'var(--clr-bg)',borderRadius:6,fontSize:'0.68rem',fontWeight:700,color:'var(--clr-subtext)',border:'1px solid var(--clr-border)' }}>
                          {stats.appts} appt{stats.appts!==1?'s':''}
                        </span>
                        <span style={{ flex:1,textAlign:'center',padding:'6px 0',background:'var(--clr-bg)',borderRadius:6,fontSize:'0.68rem',fontWeight:700,color:'var(--clr-subtext)',border:'1px solid var(--clr-border)' }}>
                          {stats.records} report{stats.records!==1?'s':''}
                        </span>
                      </div>

                      {/* Actions */}
                      <div style={{ display:'flex',gap:8 }}>
                        <button onClick={()=>setViewPatient(patient)}
                          className="btn btn-secondary btn-sm" style={{ flex:1,display:'flex',alignItems:'center',justifyContent:'center',gap:5,fontSize:'0.78rem' }}>
                          <Eye size={13}/> View Patient
                        </button>
                        <button onClick={()=>navigate(`/doctor/consultation/${patient.id}`, { state: { patient } })}
                          className="btn btn-primary btn-sm" style={{ flex:1,display:'flex',alignItems:'center',justifyContent:'center',gap:5,fontSize:'0.78rem' }}>
                          <Stethoscope size={13}/> View Consultation
                        </button>
                      </div>
                    </article>
                  );
                })}
              </section>
            )}
          </div>
        </div>
      </div>

      {/* Modals */}
      {showNewPatient && <NewPatientModal onClose={handleNewPatientClose} onSave={addPatient}/>}
      {viewPatient && (
        <PatientViewModal
          patient={viewPatient}
          appointments={appointments}
          records={records}
          onClose={()=>setViewPatient(null)}
          onViewConsultation={(p)=>{setViewPatient(null);navigate(`/doctor/consultation/${p.id}`, { state: { patient: p } });}}
          onCreateAppointment={()=>navigate('/doctor/appointments')}
        />
      )}
    </Layout>
  );
}
