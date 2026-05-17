import { useState } from 'react';
import { useData } from '../../context/DataContext';
import { Calendar, X } from 'lucide-react';
import { ConditionSelect } from '../AppointmentModals';

export default function AddModal({ onClose }) {
  const { addAppointment, doctors, patients } = useData();
  const [formData, setFormData] = useState({
    patient: patients[0]?.name || '', doctor: doctors[0]?.name || '',
    date: new Date().toISOString().split('T')[0], time: '09:00',
    type: 'Consultation', room: '', notes: '',
    condition: 'Routine Checkup'
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [statusMsg, setStatusMsg] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setStatusMsg(null);
    
    const selectedPatient = patients.find(p => p.name === formData.patient);
    if (!selectedPatient) {
      setStatusMsg({ type: 'error', text: 'Please select a valid patient.' });
      setIsSubmitting(false);
      return;
    }

    const payload = {
      patient_id: selectedPatient.id,
      date: formData.date,
      time: formData.time,
      type: formData.type,
      condition: formData.condition
    };

    const newAppt = await addAppointment(payload);
    
    if (newAppt) {
      setStatusMsg({ type: 'success', text: 'Appointment created successfully!' });
      setTimeout(() => {
        onClose();
      }, 1000);
    } else {
      setStatusMsg({ type: 'error', text: 'Failed to create appointment.' });
      setIsSubmitting(false);
    }
  };
  return (
    <div className="modal-overlay" onClick={onClose} style={{ position:'fixed',inset:0,zIndex:99999,display:'flex',alignItems:'center',justifyContent:'center',padding:20,backgroundColor:'rgba(0,0,0,0.4)',backdropFilter:'blur(2px)' }}>
      <form className="card animate-fadeIn" onClick={e=>e.stopPropagation()} style={{ maxWidth:480,width:'100%',borderRadius:16,padding:0,overflow:'hidden' }} onSubmit={handleSubmit}>
        <div style={{ padding:20,borderBottom:'1px solid var(--clr-border)',display:'flex',alignItems:'center',justifyContent:'space-between' }}>
          <div style={{ display:'flex',alignItems:'center',gap:12 }}>
            <div style={{ background:'var(--clr-primary-light)',padding:10,borderRadius:10,color:'var(--clr-primary)' }}><Calendar size={18}/></div>
            <div><h2 style={{ margin:0,fontSize:'1.1rem',fontWeight:700 }}>New Appointment</h2><p style={{ margin:0,fontSize:'0.78rem',color:'var(--clr-subtext)' }}>Schedule a visit</p></div>
          </div>
          <button type="button" onClick={onClose} style={{ background:'none',border:'none',cursor:'pointer',color:'var(--clr-subtext)' }}><X size={16}/></button>
        </div>
        <div style={{ display:'flex',flexDirection:'column',gap:14,padding:20 }}>
          <div className="form-group"><label className="form-label">Patient</label>
            <select className="form-select" required style={{ width:'100%' }} value={formData.patient} onChange={e=>setFormData({...formData,patient:e.target.value})}>
              {patients.map(p=><option key={p.id} value={p.name}>{p.name}</option>)}
            </select>
          </div>
          <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr',gap:12 }}>
            <div className="form-group"><label className="form-label">Doctor</label>
              <select className="form-select" style={{ width:'100%' }} value={formData.doctor} onChange={e=>setFormData({...formData,doctor:e.target.value})}>
                {doctors.map(d=><option key={d.id}>{d.name}</option>)}
              </select>
            </div>
            <div className="form-group"><label className="form-label">Type</label>
              <select className="form-select" style={{ width:'100%' }} value={formData.type} onChange={e=>setFormData({...formData,type:e.target.value})}>
                {['Consultation','Follow-up','Check-up','Urgent','Therapy','Surgery Prep'].map(t=><option key={t}>{t}</option>)}
              </select>
            </div>
          </div>
          <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr',gap:12 }}>
            <div className="form-group"><label className="form-label">Date</label>
              <input className="form-input" type="date" style={{ width:'100%' }} value={formData.date} onChange={e=>setFormData({...formData,date:e.target.value})}/>
            </div>
            <div className="form-group"><label className="form-label">Time</label>
              <input className="form-input" type="time" style={{ width:'100%' }} value={formData.time} onChange={e=>setFormData({...formData,time:e.target.value})}/>
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Visit Reason / Dental Condition</label>
            <ConditionSelect value={formData.condition} onChange={val => setFormData({...formData, condition: val})} />
          </div>
          <div className="form-group"><label className="form-label">Notes</label>
            <textarea className="form-input" placeholder="Notes..." rows={2} value={formData.notes} onChange={e=>setFormData({...formData,notes:e.target.value})} style={{ resize:'vertical' }}/>
          </div>
        </div>
        <div style={{ padding:'14px 20px',borderTop:'1px solid var(--clr-border)',display:'flex',gap:12,justifyContent:'space-between',alignItems:'center' }}>
          <div>
            {statusMsg && (
              <span style={{ fontSize:'0.82rem', fontWeight:600, color: statusMsg.type === 'error' ? '#ef4444' : '#10b981' }}>
                {statusMsg.text}
              </span>
            )}
          </div>
          <div style={{ display:'flex',gap:12 }}>
            <button type="button" className="btn btn-secondary" onClick={onClose} disabled={isSubmitting}>Cancel</button>
            <button type="submit" className="btn btn-primary" style={{ display:'flex',alignItems:'center',gap:6 }} disabled={isSubmitting}>
              <Calendar size={14}/> {isSubmitting ? 'Confirming...' : 'Confirm'}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
