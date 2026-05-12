import React, { useEffect, useMemo, useState } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { AlertCircle, ArrowLeft, Brain, CheckCircle2, ClipboardList, Cloud, Edit3, FileText, Heart, Loader2, Save, ShieldCheck, Sparkles, Stethoscope, WifiOff, X, RefreshCw, User, Phone } from 'lucide-react';
import Layout from '../../components/Layout';
import Dental3DModel from '../../components/Dental3DModel';
import { getToothById } from '../../data/toothData';
import { CLINICAL_STATUSES } from '../../data/clinicalOptions';
import { DENTAL_SYMPTOMS } from '../../data/medicalKnowledge';
import { useDentalSystem } from '../../hooks/useDentalSystem';
import { useData } from '../../context/DataContext';
import { generateAIReport, humanizeReport, saveReport } from '../../services/reportApi';

export default function ConsultationFlow() {
  const { id: urlPatientId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { patients, completeAppointmentByPatient } = useData();

  const [viewMode, setViewMode] = useState('both');
  const [symptoms, setSymptoms] = useState([]);
  const [customSymptom, setCustomSymptom] = useState('');
  const [isConsultationActive, setIsConsultationActive] = useState(true);
  const [medicalHistory, setMedicalHistory] = useState('');
  const [toast, setToast] = useState(null);

  // AI Report state
  const [aiReport, setAiReport] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [reportStep, setReportStep] = useState('input'); // input | ai_review | editing | saved | humanizing | humanized
  const [finalReport, setFinalReport] = useState('');
  const [humanizedReport, setHumanizedReport] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // Patient editing
  const [editingPatient, setEditingPatient] = useState(false);
  const [patientEdits, setPatientEdits] = useState({});

  const showToast = (msg, type = 'info') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  useEffect(() => { if (!urlPatientId) navigate('/doctor/patients'); }, [urlPatientId, navigate]);

  const patientFromState = location.state?.patient;
  const patientFromContext = patients.find(p => p.id.toString() === urlPatientId);
  const patient = patientFromState || patientFromContext;
  const initials = patient?.name ? patient.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) : 'P';
  const fullName = patient?.fullName || patient?.name || 'Unknown Patient';

  const { toothData, selectedToothId, selectedToothData, selectTooth, updateToothStatus, updateToothNotes, updateToothRecord, loading, persistenceMode } = useDentalSystem(urlPatientId);

  useEffect(() => { setSymptoms([]); setAiReport(''); setReportStep('input'); setFinalReport(''); setHumanizedReport(''); }, [selectedToothId]);

  const stats = useMemo(() => {
    const c = { healthy: 0, problem: 0, treated: 0, missing: 0 };
    Object.values(toothData).forEach(t => { if (c[t.status] !== undefined) c[t.status]++; });
    return c;
  }, [toothData]);

  const selectedTooth = selectedToothId ? getToothById(selectedToothId) : null;
  const toggleSymptom = (id) => setSymptoms(c => c.includes(id) ? c.filter(s => s !== id) : [...c, id]);
  const addCustomSymptom = () => {
    if (customSymptom.trim() && !symptoms.includes(customSymptom.trim())) {
      setSymptoms(p => [...p, customSymptom.trim()]);
      setCustomSymptom('');
    }
  };

  const canGenerate = selectedToothId && selectedToothData?.status && symptoms.length > 0;

  // ── AI Report Generation ──
  const handleGenerateReport = async () => {
    if (!canGenerate) return;
    setIsGenerating(true);
    try {
      const symptomLabels = symptoms.map(s => {
        const found = DENTAL_SYMPTOMS.find(d => d.id === s);
        return found ? found.label : s;
      });
      const data = {
        patient: { name: fullName, age: patient?.age, gender: patient?.gender, condition: patient?.condition },
        selectedTooth: selectedToothId,
        toothStatus: selectedToothData.status,
        symptoms: symptomLabels,
        patientCondition: patient?.condition || '',
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
      const symptomLabels = symptoms.map(s => { const f = DENTAL_SYMPTOMS.find(d => d.id === s); return f ? f.label : s; });
      await saveReport({
        patient_id: parseInt(urlPatientId),
        tooth_id: selectedToothId,
        tooth_status: selectedToothData?.status,
        symptoms: symptomLabels,
        doctor_notes: medicalHistory,
        ai_draft_report: aiReport,
        final_medical_report: finalReport,
        status: 'approved',
      });
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
    try {
      showToast('Humanized report saved to patient file', 'success');
    } catch { showToast('Failed to save humanized report', 'error'); }
  };

  const handleFinishSession = () => {
    const willComplete = isConsultationActive;
    setIsConsultationActive(!isConsultationActive);
    if (willComplete && completeAppointmentByPatient && patient) {
      completeAppointmentByPatient(patient.id);
      showToast("Session finished. Syncing...", 'success');
    }
  };

  // ── Guards ──
  if (loading) return (
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
                <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--clr-subtext)' }}>ID: {patient.id} • {patient.gender || 'N/A'} • {patient.age ? `${patient.age}y` : 'N/A'}</p>
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
                {[
                  { key: 'phone', label: 'Phone', val: patient.phone },
                  { key: 'age', label: 'Age', val: patient.age, type: 'number' },
                  { key: 'gender', label: 'Gender', val: patient.gender },
                  { key: 'condition', label: 'Condition', val: patient.condition },
                ].map(f => (
                  <div key={f.key} className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label" style={{ fontSize: '0.7rem' }}>{f.label}</label>
                    <input className="form-input" type={f.type || 'text'} defaultValue={f.val || ''} onChange={e => setPatientEdits(p => ({ ...p, [f.key]: e.target.value }))} style={{ padding: '6px 10px', fontSize: '0.82rem' }} />
                  </div>
                ))}
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 8 }}>
                <button className="btn btn-primary btn-sm" onClick={() => { showToast('Patient info updated', 'success'); setEditingPatient(false); }} style={{ fontSize: '0.75rem' }}>
                  <Save size={12} /> Save
                </button>
              </div>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 12, marginTop: 14, padding: 14, background: 'var(--clr-bg)', borderRadius: 10, border: '1px solid var(--clr-border)' }}>
              {[
                { label: 'Phone', val: patient.phone || 'N/A' },
                { label: 'Age & Gender', val: `${patient.age || 'N/A'}y, ${patient.gender || 'N/A'}` },
                { label: 'Blood Type', val: patient.bloodType || 'Unknown', color: 'var(--clr-danger)' },
                { label: 'Status', val: 'Active', color: 'var(--clr-success)' },
              ].map(f => (
                <div key={f.label}>
                  <span style={{ fontSize: '0.68rem', color: 'var(--clr-subtext)', textTransform: 'uppercase', fontWeight: 700 }}>{f.label}</span>
                  <p style={{ margin: '2px 0 0', fontWeight: 700, fontSize: '0.88rem', color: f.color || 'var(--clr-text)' }}>{f.val}</p>
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
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {DENTAL_SYMPTOMS.map(s => (
                      <button key={s.id} className={`choice-button ${symptoms.includes(s.id) ? 'is-selected' : ''}`}
                        onClick={() => toggleSymptom(s.id)} disabled={!isConsultationActive}
                        style={{ padding: '6px 10px', fontSize: '0.78rem', borderRadius: 20 }}>
                        {s.label}
                      </button>
                    ))}
                  </div>
                  {/* Custom symptom */}
                  <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
                    <input className="form-input" placeholder="Custom symptom..." value={customSymptom}
                      onChange={e => setCustomSymptom(e.target.value)} onKeyDown={e => e.key === 'Enter' && addCustomSymptom()}
                      disabled={!isConsultationActive} style={{ flex: 1, padding: '6px 10px', fontSize: '0.8rem', margin: 0 }} />
                    <button className="btn btn-sm btn-secondary" onClick={addCustomSymptom} disabled={!customSymptom.trim()}>Add</button>
                  </div>
                  {/* Selected symptoms display */}
                  {symptoms.filter(s => !DENTAL_SYMPTOMS.find(d => d.id === s)).length > 0 && (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 6 }}>
                      {symptoms.filter(s => !DENTAL_SYMPTOMS.find(d => d.id === s)).map(s => (
                        <span key={s} className="badge badge-primary" style={{ fontSize: '0.7rem', cursor: 'pointer' }} onClick={() => toggleSymptom(s)}>
                          {s} ✕
                        </span>
                      ))}
                    </div>
                  )}
                </div>

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

                  {/* AI Review */}
                  {reportStep === 'ai_review' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                      <div style={{ background: '#fff', border: '1px solid var(--clr-border)', borderRadius: 8, padding: 12, maxHeight: 200, overflow: 'auto', fontSize: '0.82rem', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>
                        {aiReport}
                      </div>
                      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                        <button className="btn btn-primary btn-sm" onClick={handleApproveAI}><CheckCircle2 size={12} /> Approve</button>
                        <button className="btn btn-secondary btn-sm" onClick={handleEditManually}><Edit3 size={12} /> Edit</button>
                        <button className="btn btn-secondary btn-sm" onClick={handleGenerateReport} disabled={isGenerating}>
                          <RefreshCw size={12} /> Regenerate
                        </button>
                        <button className="btn btn-secondary btn-sm" onClick={handleRejectAI} style={{ color: 'var(--clr-danger)' }}>
                          <X size={12} /> Reject
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Manual Editing */}
                  {reportStep === 'editing' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                      <textarea className="form-input" value={finalReport} onChange={e => setFinalReport(e.target.value)}
                        style={{ minHeight: 160, fontSize: '0.82rem', lineHeight: 1.6, resize: 'vertical' }}
                        placeholder="Write or edit the final clinical report..." />
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button className="btn btn-primary btn-sm" onClick={handleSaveReport} disabled={isSaving}>
                          {isSaving ? <><Loader2 size={12} className="animate-spin" /> Saving...</> : <><Save size={12} /> Save Report</>}
                        </button>
                        <button className="btn btn-secondary btn-sm" onClick={() => setReportStep('input')}>Cancel</button>
                      </div>
                    </div>
                  )}

                  {/* Saved → Humanize */}
                  {reportStep === 'saved' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                      <div style={{ padding: '10px 14px', background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.2)', borderRadius: 8, display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.82rem', fontWeight: 700, color: 'var(--clr-primary-dark)' }}>
                        <CheckCircle2 size={14} /> Medical report saved successfully
                      </div>
                      <button className="btn btn-primary btn-sm" onClick={handleHumanize} style={{ display: 'flex', alignItems: 'center', gap: 6, width: '100%', justifyContent: 'center' }}>
                        <Heart size={13} /> Humanize Report (Patient-Friendly)
                      </button>
                    </div>
                  )}

                  {/* Humanizing */}
                  {reportStep === 'humanizing' && (
                    <div style={{ textAlign: 'center', padding: 20 }}>
                      <Loader2 size={24} className="animate-spin" style={{ color: 'var(--clr-primary)', marginBottom: 8 }} />
                      <p style={{ fontSize: '0.84rem', fontWeight: 600, color: 'var(--clr-subtext)' }}>Creating patient-friendly version...</p>
                    </div>
                  )}

                  {/* Humanized Review */}
                  {reportStep === 'humanized' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                      <div style={{ fontSize: '0.72rem', fontWeight: 800, color: 'var(--clr-subtext)', textTransform: 'uppercase' }}>Patient-Friendly Report</div>
                      <div style={{ background: '#fff', border: '1px solid var(--clr-border)', borderRadius: 8, padding: 12, maxHeight: 200, overflow: 'auto', fontSize: '0.82rem', lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>
                        {humanizedReport}
                      </div>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button className="btn btn-primary btn-sm" onClick={handleApproveHumanized}>
                          <CheckCircle2 size={12} /> Approve & Save
                        </button>
                        <button className="btn btn-secondary btn-sm" onClick={handleHumanize}>
                          <RefreshCw size={12} /> Regenerate
                        </button>
                      </div>
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
