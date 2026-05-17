import React, { useEffect, useMemo, useState } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { AlertCircle, ArrowLeft, Brain, CheckCircle2, ClipboardList, Cloud, Edit3, FileText, Heart, Loader2, Save, ShieldCheck, Sparkles, Stethoscope, WifiOff, X, RefreshCw, User, Phone, Droplets, ChevronDown, Search, PlusCircle } from 'lucide-react';
import Layout from '../../components/Layout';
import Dental3DModel from '../../components/Dental3DModel';
import { getToothById } from '../../data/toothData';
import { CLINICAL_STATUSES } from '../../data/clinicalOptions';
import { DENTAL_SYMPTOMS } from '../../data/medicalKnowledge';
import { useDentalSystem } from '../../hooks/useDentalSystem';
import { useData } from '../../context/DataContext';
import { generateAIReport, humanizeReport, saveReport, updateReport } from '../../services/reportApi';

// ── Dropdown Component ──────────────────────────────────────────────────────
function SymptomDropdown({ options, selected, onToggle, disabled, onAddCustom }) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');

  const filtered = options.filter(opt => 
    opt.name.toLowerCase().includes(search.toLowerCase()) && 
    !selected.includes(opt.name)
  );

  return (
    <div className="custom-dropdown" style={{ position: 'relative', width: '100%' }}>
      <div 
        className={`form-input ${disabled ? 'disabled' : ''}`}
        onClick={() => !disabled && setIsOpen(!isOpen)}
        style={{ 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'space-between',
          cursor: disabled ? 'not-allowed' : 'pointer',
          minHeight: '44px',
          padding: '0 12px'
        }}
      >
        <span style={{ color: search || selected.length > 0 ? 'var(--clr-text)' : 'var(--clr-subtext)', fontSize: '0.85rem' }}>
          {selected.length > 0 ? `${selected.length} Selected` : 'Select symptoms...'}
        </span>
        <ChevronDown size={16} style={{ transition: 'transform 0.2s', transform: isOpen ? 'rotate(180deg)' : '' }} />
      </div>

      {isOpen && (
        <div style={{ 
          position: 'absolute', 
          top: '100%', 
          left: 0, 
          right: 0, 
          background: 'white', 
          border: '1px solid var(--clr-border)', 
          borderRadius: 12, 
          boxShadow: '0 10px 25px rgba(0,0,0,0.1)', 
          zIndex: 100,
          marginTop: 6,
          padding: 8
        }}>
          <div style={{ position: 'relative', marginBottom: 8 }}>
            <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--clr-subtext)' }} />
            <input 
              autoFocus
              className="form-input" 
              placeholder="Search or add custom..." 
              value={search}
              onChange={e => setSearch(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter' && search.trim()) {
                  onAddCustom(search.trim());
                  setSearch('');
                  setIsOpen(false);
                }
              }}
              style={{ paddingLeft: 32, fontSize: '0.8rem', height: 36, margin: 0 }}
            />
          </div>
          <div style={{ maxHeight: 200, overflow: 'auto' }}>
            {filtered.length > 0 ? filtered.map(opt => (
              <div 
                key={opt.id} 
                onClick={() => { onToggle(opt.name); setSearch(''); setIsOpen(false); }}
                style={{ 
                  padding: '8px 12px', 
                  fontSize: '0.82rem', 
                  cursor: 'pointer', 
                  borderRadius: 8,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10
                }}
                className="dropdown-item-hover"
              >
                {opt.name}
              </div>
            )) : search.trim() ? (
              <div 
                onClick={() => { onAddCustom(search.trim()); setSearch(''); setIsOpen(false); }}
                style={{ padding: '8px 12px', fontSize: '0.82rem', cursor: 'pointer', borderRadius: 8, color: 'var(--clr-primary)', fontWeight: 700 }}
              >
                + Add "{search}"
              </div>
            ) : (
              <div style={{ padding: '8px 12px', fontSize: '0.82rem', color: 'var(--clr-subtext)', textAlign: 'center' }}>
                No symptoms found
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default function ConsultationFlow() {
  const { id: urlPatientId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { patients, completeAppointmentByPatient, updatePatient, fetchPatientById } = useData();

  const [viewMode, setViewMode] = useState('both');
  const [symptoms, setSymptoms] = useState([]);
  const [customSymptom, setCustomSymptom] = useState('');
  const [isConsultationActive, setIsConsultationActive] = useState(true);
  const [medicalHistory, setMedicalHistory] = useState('');
  const [toast, setToast] = useState(null);

  // Symptoms & Findings
  const [availableSymptoms, setAvailableSymptoms] = useState([]);
  const [isSymptomsLoading, setIsSymptomsLoading] = useState(true);
  const [showCustomModal, setShowCustomModal] = useState(false);
  const [pendingCustomSymptom, setPendingCustomSymptom] = useState('');

  // AI Report state
  const [aiReport, setAiReport] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [reportStep, setReportStep] = useState('input'); // input | ai_review | editing | saved | humanizing | humanized
  const [finalReport, setFinalReport] = useState('');
  const [humanizedReport, setHumanizedReport] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [currentReportId, setCurrentReportId] = useState(null);

  // Patient state
  const [patient, setPatient] = useState(null);
  const [isPageLoading, setIsPageLoading] = useState(true);
  const [editingPatient, setEditingPatient] = useState(false);
  const [patientEdits, setPatientEdits] = useState({});
  const [isSavingPatient, setIsSavingPatient] = useState(false);

  const showToast = (msg, type = 'info') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  useEffect(() => {
    let isMounted = true;
    const loadPatient = async () => {
      if (!urlPatientId) {
        navigate('/doctor/patients');
        return;
      }

      // Check if we already have the full data for this ID
      const isFull = (p) => p && p.id && (p.gender || p.phone || p.bloodType || p.blood_type);
      if (patient && patient.id.toString() === urlPatientId && isFull(patient)) {
        return;
      }

      // 1. Check if we have the patient in state or context
      let candidate = location.state?.patient;
      if (!isFull(candidate)) {
        const fromContext = patients.find(p => p.id.toString() === urlPatientId);
        if (isFull(fromContext)) {
          candidate = fromContext;
        }
      }

      // 2. If we have a FULL patient, use it
      if (isFull(candidate)) {
        if (isMounted) {
          setPatient(candidate);
          setIsPageLoading(false);
        }
      } else {
        // 3. Otherwise (missing or partial), fetch from backend
        const fromBackend = await fetchPatientById(urlPatientId);
        if (isMounted && fromBackend) {
          setPatient(fromBackend);
          setIsPageLoading(false);
        } else if (isMounted) {
          setIsPageLoading(false);
        }
      }
    };

    loadPatient();
    return () => { isMounted = false; };
  }, [urlPatientId, patients, fetchPatientById, location.state, navigate, patient]);

  useEffect(() => {
    if (patient) {
      setPatientEdits({ 
        phone: patient.phone, 
        age: patient.age, 
        gender: patient.gender, 
        bloodType: patient.bloodType || patient.blood_type 
      });
    }
  }, [patient]);

  const { toothData, selectedToothId, selectedToothData, selectTooth, updateToothStatus, updateToothNotes, updateToothRecord, loading, persistenceMode } = useDentalSystem(urlPatientId);

  useEffect(() => {
    const fetchSymptoms = async () => {
      try {
        const token = localStorage.getItem('clinic_token');
        const res = await fetch('http://localhost:8000/api/clinical/symptoms', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
          const data = await res.json();
          setAvailableSymptoms(data);
        }
      } catch (err) {
        console.error('Failed to fetch symptoms:', err);
      } finally {
        setIsSymptomsLoading(false);
      }
    };
    fetchSymptoms();
  }, []);

  useEffect(() => { 
    setSymptoms([]); 
    setAiReport(''); 
    setReportStep('input'); 
    setFinalReport(''); 
    setHumanizedReport(''); 
    setCurrentReportId(null);
  }, [selectedToothId]);

  const stats = useMemo(() => {
    const c = { healthy: 0, problem: 0, treated: 0, missing: 0 };
    Object.values(toothData).forEach(t => { if (c[t.status] !== undefined) c[t.status]++; });
    return c;
  }, [toothData]);

  const selectedTooth = selectedToothId ? getToothById(selectedToothId) : null;
  const toggleSymptom = (name) => setSymptoms(c => c.includes(name) ? c.filter(s => s !== name) : [...c, name]);
  
  const handleAddCustomRequest = (name) => {
    if (!name.trim()) return;
    if (symptoms.includes(name.trim())) return;
    setPendingCustomSymptom(name.trim());
    setShowCustomModal(true);
  };

  const handleCustomSymptomAction = async (saveGlobally) => {
    const name = pendingCustomSymptom;
    if (saveGlobally) {
      try {
        const token = localStorage.getItem('clinic_token');
        const res = await fetch('http://localhost:8000/api/clinical/symptoms', {
          method: 'POST',
          headers: { 
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ name })
        });
        if (res.ok) {
          const newSym = await res.json();
          setAvailableSymptoms(prev => [...prev, newSym].sort((a, b) => a.name.localeCompare(b.name)));
          showToast(`Symptom "${name}" saved for future use`, 'success');
        }
      } catch (err) {
        console.error('Failed to save global symptom:', err);
        showToast('Failed to save symptom globally', 'error');
      }
    }
    
    setSymptoms(prev => [...prev, name]);
    setShowCustomModal(false);
    setPendingCustomSymptom('');
  };

  const fullName = patient?.name || 'Unknown Patient';
  const initials = patient?.name ? patient.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) : 'P';
  const canGenerate = selectedToothId && selectedToothData?.status && symptoms.length > 0;

  // ── AI Report Generation ──
  const handleGenerateReport = async () => {
    if (!canGenerate) return;
    setIsGenerating(true);
    try {
      const data = {
        patient: { name: fullName, age: patient?.age, gender: patient?.gender, condition: 'Dental Consultation' },
        selectedTooth: selectedToothId,
        toothStatus: selectedToothData.status,
        symptoms: symptoms,
        patientCondition: 'Dental Consultation',
        doctorNotes: medicalHistory,
        jawTeethStatus: toothData,
      };
      const result = await generateAIReport(data);
      setAiReport(result.report);
      setReportStep('ai_review');
      showToast('AI report generated successfully', 'success');
    } catch (err) {
      showToast('AI generation failed. Check Ollama connection.', 'error');
    } finally { setIsGenerating(false); }
  };

  const handleApproveAI = () => { setFinalReport(aiReport); setReportStep('editing'); };
  const handleRejectAI = () => { setAiReport(''); setReportStep('input'); };
  const handleEditManually = () => { setFinalReport(aiReport || ''); setReportStep('editing'); };

  // ── Save Final Report ──
  const handleSaveReport = async () => {
    if (!finalReport.trim()) { showToast('Report cannot be empty', 'error'); return; }
    setIsSaving(true);
    try {
      const result = await saveReport({
        patient_id: parseInt(urlPatientId),
        tooth_id: selectedToothId,
        tooth_status: selectedToothData?.status,
        symptoms: symptoms,
        doctor_notes: medicalHistory,
        ai_draft_report: aiReport,
        final_medical_report: finalReport,
        status: 'approved',
      });
      setCurrentReportId(result.id);
      setReportStep('saved');
      showToast('Report saved to patient history', 'success');
    } catch (err) { showToast('Failed to save report', 'error'); }
    finally { setIsSaving(false); }
  };

  // ── Humanize Report ──
  const handleHumanize = async () => {
    setReportStep('humanizing');
    try {
      const result = await humanizeReport(finalReport, fullName);
      setHumanizedReport(result.humanized_report);
      setReportStep('humanized');
      showToast('Patient-friendly report generated', 'success');
    } catch (err) {
      showToast('Humanization failed. Check Ollama.', 'error');
      setReportStep('saved');
    }
  };

  const handleApproveHumanized = async () => {
    if (!currentReportId) {
      showToast('Please save the medical report first', 'warning');
      return;
    }
    try {
      await updateReport(currentReportId, { humanized_report: humanizedReport });
      showToast('Humanized report saved to patient history', 'success');
    } catch (err) { 
      console.error(err);
      showToast('Failed to save humanized report', 'error'); 
    }
  };

  const handleFinishSession = () => {
    const willComplete = isConsultationActive;
    setIsConsultationActive(!isConsultationActive);
    if (willComplete && completeAppointmentByPatient && patient) {
      completeAppointmentByPatient(patient.id);
      showToast("Session finished. Syncing...", 'success');
    }
  };

  const handleSavePatient = async () => {
    setIsSavingPatient(true);
    const mappedEdits = { ...patientEdits };
    if (mappedEdits.bloodType) {
      mappedEdits.blood_type = mappedEdits.bloodType;
      delete mappedEdits.bloodType;
    }
    const updated = await updatePatient(patient.id, mappedEdits);
    setIsSavingPatient(false);
    if (updated) {
      setPatient(updated);
      showToast('Patient info updated', 'success');
      setEditingPatient(false);
    } else {
      showToast('Failed to update patient info', 'error');
    }
  };

  // ── Guards ──
  if (isPageLoading || loading) return (
    <Layout pageTitle="Clinical Consultation" pageSubtitle="Loading...">
      <div className="card" style={{ textAlign: 'center', padding: '80px 20px' }}>
        <Loader2 size={32} className="animate-spin" style={{ margin: '0 auto 16px', color: 'var(--clr-primary)' }} />
        <p style={{ fontSize: '1rem', fontWeight: 600 }}>Initializing Clinical Workspace...</p>
      </div>
    </Layout>
  );

  if (!patient || persistenceMode === 'error') return (
    <Layout pageTitle="Clinical Consultation" pageSubtitle="Error">
      <div className="card" style={{ textAlign: 'center', padding: '60px 20px', maxWidth: 500, margin: '40px auto' }}>
        <AlertCircle size={40} style={{ color: 'var(--clr-danger)', marginBottom: 16 }} />
        <h2 style={{ marginBottom: 8 }}>Consultation Unavailable</h2>
        <p style={{ color: 'var(--clr-subtext)', marginBottom: 24 }}>Patient record not found or connection error.</p>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
          <button className="btn btn-secondary" onClick={() => navigate('/doctor/patients')}>Back</button>
          <button className="btn btn-primary" onClick={() => window.location.reload()}>Retry</button>
        </div>
      </div>
    </Layout>
  );

  return (
    <Layout pageTitle="Clinical Consultation" pageSubtitle="Guided clinical workflow">
      <div className="consultation-page animate-fadeIn">

        {/* ── Patient Header ── */}
        <section className="card" style={{ padding: 20, marginBottom: 20 }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <button className="btn btn-secondary btn-sm" onClick={() => navigate('/doctor/patients')} style={{ padding: 8 }}><ArrowLeft size={16} /></button>
              <div className="avatar" style={{ width: 44, height: 44, fontSize: '1rem' }}>{initials}</div>
              <div>
                <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: 10 }}>
                  {fullName}
                  <span className={`badge ${persistenceMode === 'api' ? 'badge-success' : 'badge-warning'}`} style={{ fontSize: '0.65rem' }}>
                    {persistenceMode === 'api' ? '☁ Cloud' : '⚡ Local'}
                  </span>
                </h2>
                <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--clr-subtext)' }}>
                  ID: {patient.id} • {patient.gender || 'N/A'} • {patient.age ? `${patient.age}y` : 'N/A'}
                </p>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn btn-secondary btn-sm" onClick={() => setEditingPatient(!editingPatient)} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <Edit3 size={13} /> {editingPatient ? 'Close' : 'Edit Info'}
              </button>
              <button className={`btn btn-sm ${isConsultationActive ? 'btn-primary' : 'btn-secondary'}`} onClick={handleFinishSession}>
                {isConsultationActive ? <><ShieldCheck size={14} /> Finish</> : <><CheckCircle2 size={14} /> Done</>}
              </button>
            </div>
          </div>

          {/* Patient Info Grid / Edit */}
          {editingPatient ? (
            <div style={{ marginTop: 14, padding: 14, background: 'var(--clr-bg)', borderRadius: 10, border: '1px solid var(--clr-border)' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 10 }}>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label" style={{ fontSize: '0.7rem' }}>Phone</label>
                  <input className="form-input" type="text" value={patientEdits.phone || ''} onChange={e => setPatientEdits(p => ({ ...p, phone: e.target.value }))} style={{ padding: '6px 10px', fontSize: '0.82rem' }} />
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label" style={{ fontSize: '0.7rem' }}>Age</label>
                  <input className="form-input" type="number" min="0" max="150" value={patientEdits.age || ''} onChange={e => setPatientEdits(p => ({ ...p, age: e.target.value }))} style={{ padding: '6px 10px', fontSize: '0.82rem' }} />
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label" style={{ fontSize: '0.7rem' }}>Gender</label>
                  <select className="form-select" value={patientEdits.gender || 'Unknown'} onChange={e => setPatientEdits(p => ({ ...p, gender: e.target.value }))} style={{ padding: '6px 10px', fontSize: '0.82rem', width: '100%' }}>
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                    <option value="Unknown">Unknown</option>
                  </select>
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label" style={{ fontSize: '0.7rem' }}>Blood Type</label>
                  <select className="form-select" value={patientEdits.bloodType || 'Unknown'} onChange={e => setPatientEdits(p => ({ ...p, bloodType: e.target.value }))} style={{ padding: '6px 10px', fontSize: '0.82rem', width: '100%' }}>
                    {['Unknown', 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map(bt => (
                      <option key={bt} value={bt}>{bt}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 14 }}>
                <button className="btn btn-primary btn-sm" onClick={handleSavePatient} disabled={isSavingPatient} style={{ fontSize: '0.75rem', gap: 6 }}>
                  {isSavingPatient ? <Loader2 size={12} className="animate-spin" /> : <Save size={12} />} Save Changes
                </button>
              </div>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 12, marginTop: 14, padding: 14, background: 'var(--clr-bg)', borderRadius: 10, border: '1px solid var(--clr-border)' }}>
              {[
                { label: 'Phone', val: patient.phone || '—', icon: Phone },
                { label: 'Age & Gender', val: (patient.age || patient.gender) ? `${patient.age ? patient.age+'y' : ''}${patient.age && patient.gender ? ', ' : ''}${patient.gender || ''}` : '—', icon: User },
                { label: 'Blood Type', val: patient.bloodType || patient.blood_type || '—', color: (patient.bloodType || patient.blood_type) && (patient.bloodType || patient.blood_type) !== 'Unknown' ? 'var(--clr-danger)' : 'inherit', icon: Droplets },
                { label: 'Status', val: patient.status || 'Active', color: 'var(--clr-success)', icon: CheckCircle2 },
              ].map(f => (
                <div key={f.label} style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                  <div style={{ width: 32, height: 32, borderRadius: 8, background: 'white', border: '1px solid var(--clr-border)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--clr-primary)' }}>
                    <f.icon size={16} />
                  </div>
                  <div>
                    <span style={{ fontSize: '0.65rem', color: 'var(--clr-subtext)', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.05em' }}>{f.label}</span>
                    <p style={{ margin: '0', fontWeight: 700, fontSize: '0.85rem', color: f.color || 'var(--clr-text)' }}>{f.val}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Toast */}
        {toast && (
          <div style={{ position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)', background: toast.type === 'error' ? '#dc2626' : '#1e293b', color: '#fff', padding: '10px 22px', borderRadius: 20, boxShadow: '0 8px 20px rgba(0,0,0,0.2)', zIndex: 2000, display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.88rem', fontWeight: 600 }} className="animate-slideUp">
            {toast.type === 'success' ? <CheckCircle2 size={15} /> : toast.type === 'error' ? <AlertCircle size={15} /> : <Loader2 size={15} />}
            {toast.msg}
          </div>
        )}

        {/* ── Workspace ── */}
        <section className="consultation-workspace">
          {/* 3D Model */}
          <div className="consultation-chart-card clinic-card">
            <div className="consultation-card-head">
              <div><p className="section-kicker">Step 1</p><h3>Select a tooth</h3></div>
              <div className="consultation-segmented">
                {['both', 'upper', 'lower'].map(m => (
                  <button key={m} className={viewMode === m ? 'is-selected' : ''} onClick={() => setViewMode(m)}>{m}</button>
                ))}
              </div>
            </div>
            <div className="consultation-model-wrap">
              <Dental3DModel toothData={toothData} selectedToothId={selectedToothId} onToothSelect={selectTooth} viewMode={viewMode} showNumbers />
              {!isConsultationActive && <div className="consultation-locked">Session completed</div>}
            </div>
            {/* Legend */}
            <div style={{ display: 'flex', gap: 14, padding: '10px 16px', flexWrap: 'wrap' }}>
              {CLINICAL_STATUSES.map(s => (
                <span key={s.id} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: '0.72rem', fontWeight: 700, color: 'var(--clr-subtext)' }}>
                  <span style={{ width: 10, height: 10, borderRadius: 3, background: s.color, border: '1px solid rgba(0,0,0,0.1)' }} />
                  {s.label}: <strong style={{ color: 'var(--clr-text)' }}>{stats[s.id] || 0}</strong>
                </span>
              ))}
            </div>

            {/* ── Central AI Report Area ── */}
            {reportStep !== 'input' && (
              <div style={{ padding: '24px', margin: '20px', background: '#ffffff', border: '1px solid var(--clr-border)', borderRadius: 12, boxShadow: '0 8px 30px rgba(0,0,0,0.06)' }} className="animate-fadeIn">
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--clr-primary)', fontWeight: 800, fontSize: '1.2rem', marginBottom: 20 }}>
                  <Brain size={22} /> AI Clinical Reporter Output
                </div>

                {/* AI Review */}
                {reportStep === 'ai_review' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                    <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 8, padding: 20, maxHeight: 400, overflow: 'auto', fontSize: '0.9rem', lineHeight: 1.7, color: '#334155', whiteSpace: 'pre-wrap' }}>
                      {aiReport}
                    </div>
                    <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                      <button className="btn btn-primary" onClick={handleApproveAI}><CheckCircle2 size={15} /> Approve Report</button>
                      <button className="btn btn-secondary" onClick={handleEditManually}><Edit3 size={15} /> Edit Manually</button>
                      <button className="btn btn-secondary" onClick={handleGenerateReport} disabled={isGenerating}>
                        <RefreshCw size={15} /> Regenerate
                      </button>
                      <button className="btn btn-secondary" onClick={handleRejectAI} style={{ color: 'var(--clr-danger)' }}>
                        <X size={15} /> Discard
                      </button>
                    </div>
                  </div>
                )}

                {/* Manual Editing */}
                {reportStep === 'editing' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                    <textarea className="form-input" value={finalReport} onChange={e => setFinalReport(e.target.value)}
                      style={{ minHeight: 250, fontSize: '0.9rem', lineHeight: 1.7, resize: 'vertical', background: '#fff', border: '1px solid var(--clr-border)', padding: 16 }}
                      placeholder="Write or edit the final clinical report..." />
                    <div style={{ display: 'flex', gap: 10 }}>
                      <button className="btn btn-primary" onClick={handleSaveReport} disabled={isSaving}>
                        {isSaving ? <><Loader2 size={15} className="animate-spin" /> Saving...</> : <><Save size={15} /> Save Final Report</>}
                      </button>
                      <button className="btn btn-secondary" onClick={() => setReportStep('input')}>Cancel</button>
                    </div>
                  </div>
                )}

                {/* Saved → Humanize */}
                {reportStep === 'saved' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                    <div style={{ padding: '16px 20px', background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.2)', borderRadius: 8, display: 'flex', alignItems: 'center', gap: 10, fontSize: '0.95rem', fontWeight: 700, color: 'var(--clr-primary-dark)' }}>
                      <CheckCircle2 size={18} /> Medical report saved securely to patient history
                    </div>
                    <button className="btn btn-primary" onClick={handleHumanize} style={{ display: 'flex', alignItems: 'center', gap: 8, alignSelf: 'flex-start' }}>
                      <Heart size={16} /> Generate Patient-Friendly Version
                    </button>
                  </div>
                )}

                {/* Humanizing */}
                {reportStep === 'humanizing' && (
                  <div style={{ textAlign: 'center', padding: 40 }}>
                    <Loader2 size={32} className="animate-spin" style={{ color: 'var(--clr-primary)', marginBottom: 16 }} />
                    <p style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--clr-subtext)' }}>Creating simplified patient-friendly version using Mistral AI...</p>
                  </div>
                )}

                {/* Humanized Review */}
                {reportStep === 'humanized' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                    <div style={{ fontSize: '0.85rem', fontWeight: 800, color: 'var(--clr-subtext)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Patient-Friendly Report</div>
                    <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 8, padding: 20, maxHeight: 400, overflow: 'auto', fontSize: '0.9rem', lineHeight: 1.8, color: '#334155', whiteSpace: 'pre-wrap' }}>
                      {humanizedReport}
                    </div>
                    <div style={{ display: 'flex', gap: 10 }}>
                      <button className="btn btn-primary" onClick={handleApproveHumanized}>
                        <CheckCircle2 size={15} /> Approve & Save
                      </button>
                      <button className="btn btn-secondary" onClick={handleHumanize}>
                        <RefreshCw size={15} /> Regenerate Simplified Version
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* ── Clinical Panel ── */}
          <aside className="consultation-side-card clinic-card">
            {selectedToothId ? (
              <>
                {/* Step 2: Status */}
                <div className="consultation-card-head">
                  <div>
                    <p className="section-kicker">Step 2</p>
                    <h3>Record finding</h3>
                    <span className="consultation-tooth-name">#{selectedToothId} {selectedTooth?.name}</span>
                  </div>
                  <button className="icon-button" onClick={() => selectTooth(null)}><X size={16} /></button>
                </div>
                <div className="consultation-status-grid">
                  {CLINICAL_STATUSES.map(s => (
                    <button key={s.id} className={`choice-button ${selectedToothData?.status === s.id ? 'is-selected' : ''}`}
                      onClick={() => updateToothStatus(selectedToothId, s.id)} disabled={!isConsultationActive}>
                      <i className="color-dot" style={{ background: s.color }} />{s.label}
                    </button>
                  ))}
                </div>

                {/* Step 3: Symptoms */}
                <div className="consultation-section">
                  <div className="consultation-mini-head">
                    <p className="section-kicker">Step 3</p>
                    <h4>Symptoms & Findings</h4>
                  </div>
                  
                  {isSymptomsLoading ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: 10, background: '#f8fafc', borderRadius: 8 }}>
                      <Loader2 size={16} className="animate-spin" color="var(--clr-primary)" />
                      <span style={{ fontSize: '0.8rem', color: 'var(--clr-subtext)' }}>Loading clinical symptoms...</span>
                    </div>
                  ) : (
                    <SymptomDropdown 
                      options={availableSymptoms} 
                      selected={symptoms} 
                      onToggle={toggleSymptom}
                      onAddCustom={handleAddCustomRequest}
                      disabled={!isConsultationActive}
                    />
                  )}

                  {/* Selected Chips */}
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 12 }}>
                    {symptoms.map(s => (
                      <div key={s} 
                        style={{ 
                          background: 'white', 
                          border: '1px solid var(--clr-primary)', 
                          color: 'var(--clr-primary)', 
                          padding: '6px 12px', 
                          borderRadius: 20, 
                          fontSize: '0.75rem', 
                          fontWeight: 700,
                          display: 'flex',
                          alignItems: 'center',
                          gap: 6,
                          boxShadow: '0 2px 5px rgba(0,0,0,0.02)'
                        }}
                      >
                        {s}
                        <X 
                          size={12} 
                          style={{ cursor: 'pointer', opacity: 0.7 }} 
                          onClick={() => isConsultationActive && toggleSymptom(s)} 
                        />
                      </div>
                    ))}
                    {symptoms.length === 0 && !isSymptomsLoading && (
                      <div style={{ fontSize: '0.75rem', color: 'var(--clr-subtext)', fontStyle: 'italic', padding: '4px 0' }}>
                        No symptoms selected yet.
                      </div>
                    )}
                  </div>
                </div>

                {/* Custom Symptom Confirmation Modal */}
                {showCustomModal && (
                  <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
                    <div className="card animate-fadeIn" style={{ maxWidth: 400, padding: 24, borderRadius: 20 }}>
                      <div style={{ width: 48, height: 48, borderRadius: 14, background: 'rgba(var(--clr-primary-rgb), 0.1)', color: 'var(--clr-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
                        <PlusCircle size={24} />
                      </div>
                      <h3 style={{ marginBottom: 12 }}>Add Custom Symptom</h3>
                      <p style={{ color: 'var(--clr-subtext)', fontSize: '0.9rem', lineHeight: 1.6, marginBottom: 24 }}>
                        Do you want to save <strong>"{pendingCustomSymptom}"</strong> to the global symptoms list for future consultations?
                      </p>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                        <button className="btn btn-primary" style={{ width: '100%', height: 48 }} onClick={() => handleCustomSymptomAction(true)}>
                          Yes, save for future
                        </button>
                        <button className="btn btn-secondary" style={{ width: '100%', height: 48 }} onClick={() => handleCustomSymptomAction(false)}>
                          No, use only this session
                        </button>
                        <button className="btn btn-ghost" style={{ width: '100%' }} onClick={() => { setShowCustomModal(false); setPendingCustomSymptom(''); }}>
                          Cancel
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Doctor Notes */}
                <div className="consultation-section">
                  <label className="form-label">Clinical Notes</label>
                  <textarea className="consultation-textarea" placeholder="Additional findings..."
                    value={selectedToothData?.notes || ''} onChange={e => updateToothNotes(selectedToothId, e.target.value)}
                    disabled={!isConsultationActive} style={{ minHeight: 50 }} />
                </div>

                {/* ── Step 4: AI Report ── */}
                <div style={{ padding: 16, background: 'var(--clr-bg)', border: '1px solid var(--clr-primary)', borderRadius: 10 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--clr-primary)', fontWeight: 800, fontSize: '0.9rem' }}>
                      <Brain size={18} /> AI Clinical Reporter
                    </div>
                    {reportStep === 'input' && (
                      <button className="btn btn-primary btn-sm" onClick={handleGenerateReport} disabled={!canGenerate || isGenerating}
                        style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                        {isGenerating ? <><Loader2 size={13} className="animate-spin" /> Generating...</> : <><Sparkles size={13} /> Generate</>}
                      </button>
                    )}
                  </div>

                  {/* Input hint */}
                  {reportStep === 'input' && !isGenerating && (
                    <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--clr-subtext)' }}>
                      {canGenerate ? 'Ready to generate AI clinical report.' : 'Select tooth status and at least one symptom to generate.'}
                    </p>
                  )}

                  {reportStep !== 'input' && (
                    <div style={{ padding: '12px 14px', background: 'rgba(16,185,129,0.08)', borderRadius: 8, color: 'var(--clr-primary-dark)', fontSize: '0.8rem', fontWeight: 600, display: 'flex', gap: 8, alignItems: 'center' }}>
                      <CheckCircle2 size={14} /> Report generated. Please review in the central workspace.
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div className="consultation-empty-state">
                <Stethoscope size={42} />
                <h3>Select a tooth to begin</h3>
                <p>Click on any tooth in the 3D model to start recording findings.</p>
              </div>
            )}
          </aside>
        </section>
      </div>
    </Layout>
  );
}
