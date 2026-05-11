import React, { useEffect, useMemo, useState } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import {
  Activity,
  AlertCircle,
  ArrowLeft,
  Brain,
  CheckCircle2,
  ClipboardList,
  Cloud,
  ShieldCheck,
  Sparkles,
  Stethoscope,
  WifiOff,
  X
} from 'lucide-react';
import Layout from '../../components/Layout';
import Dental3DModel from '../../components/Dental3DModel';
import { getToothById } from '../../data/toothData';
import { CLINICAL_STATUSES } from '../../data/clinicalOptions';
import { DENTAL_SYMPTOMS } from '../../data/medicalKnowledge';
import { useDentalSystem } from '../../hooks/useDentalSystem';
import { useData } from '../../context/DataContext';
import { generateClinicalReport } from '../../logic/clinicalDiagnosisEngine';

export default function ConsultationFlow() {
  const { id: urlPatientId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { patients, completeAppointmentByPatient } = useData();

  const [viewMode, setViewMode] = useState('both');
  const [symptoms, setSymptoms] = useState([]);
  const [aiResult, setAiResult] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isConsultationActive, setIsConsultationActive] = useState(true);
  const [medicalHistory, setMedicalHistory] = useState('');
  const [toast, setToast] = useState(null);

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  const handleFinishSession = () => {
    const willComplete = isConsultationActive;
    setIsConsultationActive(!isConsultationActive);
    
    if (willComplete && completeAppointmentByPatient && patient) {
      // PRODUCTION FIX: Use ID instead of Name
      completeAppointmentByPatient(patient.id);
      showToast("Clinical session finished. Syncing with backend...");
    }
  };

  useEffect(() => {
    if (!urlPatientId) navigate('/doctor/patients');
  }, [urlPatientId, navigate]);

  const patientFromState = location.state?.patient;
  const patientFromContext = patients.find(p => p.id.toString() === urlPatientId);
  const patient = patientFromState || patientFromContext;

  // Fallback for missing patient initials
  const initials = patient?.initials || (patient?.name ? patient.name.split(' ').map(n => n[0]).join('') : 'P');
  const fullName = patient?.fullName || patient?.name || 'Unknown Patient';

  const {
    toothData,
    selectedToothId,
    selectedToothData,
    selectTooth,
    updateToothStatus,
    updateToothNotes,
    updateToothRecord,
    loading,
    persistenceMode
  } = useDentalSystem(urlPatientId);

  useEffect(() => {
    setAiResult(null);
    setSymptoms([]);
  }, [selectedToothId]);

  const stats = useMemo(() => {
    const counts = { healthy: 0, problem: 0, treated: 0, missing: 0 };
    Object.values(toothData).forEach((tooth) => {
      if (counts[tooth.status] !== undefined) counts[tooth.status] += 1;
    });
    return counts;
  }, [toothData]);

  const selectedTooth = selectedToothId ? getToothById(selectedToothId) : null;

  const toggleSymptom = (symptomId) => {
    setSymptoms((current) => current.includes(symptomId) ? current.filter(id => id !== symptomId) : [...current, symptomId]);
  };

  const runAnalysis = async () => {
    if (!selectedToothId || !isConsultationActive) return;
    setIsAnalyzing(true);
    try {
      const response = await fetch('http://localhost:8000/api/ai/diagnosis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          symptoms: symptoms.join(', '),
          history: medicalHistory || 'No specific history provided.',
          tooth_data: { id: selectedToothId, ...selectedToothData }
        })
      });
      if (!response.ok) throw new Error('AI Service Error');
      const data = await response.json();
      setAiResult({
        findings: `Tooth #${selectedToothId}: ${data.diagnosis}`,
        diagnosis: data.diagnosis,
        conditions: data.conditions,
        treatment: data.treatment_plan.join(', '),
        urgency: 'Medium', // Default or derived
        snomed: 'Pending'
      });
    } catch (err) {
      console.error('AI Diagnosis error:', err);
      // Fallback to local engine if backend fails
      setAiResult(generateClinicalReport(symptoms, selectedToothId, patient));
    } finally {
      setIsAnalyzing(false);
    }
  };

  const applyAISuggestion = () => {
    if (!aiResult || !selectedToothId || !isConsultationActive) return;
    const aiNote = `[AI Report] ${aiResult.diagnosis}. Treatment: ${aiResult.treatment}.`;
    updateToothRecord(selectedToothId, {
      notes: `${selectedToothData.notes ? `${selectedToothData.notes}\n` : ''}${aiNote}`
    });
    setAiResult(null);
    showToast("Background task: Processing clinical report...");
  };

  // PRODUCTION GUARD: Prevent rendering if data is loading or missing
  if (loading) {
    return (
      <Layout pageTitle="Clinical Consultation" pageSubtitle="Loading...">
        <div className="clinic-card consultation-loading" style={{ textAlign: 'center', padding: '100px 20px', color: 'var(--clr-text-muted)' }}>
          <div className="spinner" style={{ marginBottom: '20px' }}></div>
          <p style={{ fontSize: '1.1rem', fontWeight: 500 }}>Initializing Clinical Workspace...</p>
          <p style={{ fontSize: '0.9rem', opacity: 0.7 }}>Retrieving patient records and 3D dental mapping.</p>
        </div>
      </Layout>
    );
  }

  // PRODUCTION ERROR STATE: Fallback UI for network or data failures
  if (!patient || persistenceMode === 'error') {
    return (
      <Layout pageTitle="Clinical Consultation" pageSubtitle="System Error">
        <div className="clinic-card consultation-error" style={{ textAlign: 'center', padding: '80px 20px', maxWidth: '600px', margin: '40px auto' }}>
          <div style={{ background: 'rgba(239, 68, 68, 0.1)', width: '80px', height: '80px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px' }}>
            <AlertCircle size={40} style={{ color: 'var(--clr-danger)' }} />
          </div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '12px' }}>Consultation Unavailable</h2>
          <p style={{ color: 'var(--clr-text-muted)', marginBottom: '32px', lineHeight: 1.6 }}>
            {persistenceMode === 'error' 
              ? "We encountered a critical error connecting to the clinical database. Please check your connection or contact system administration."
              : "The requested patient record could not be found in the current session. Please verify the patient ID and try again."}
          </p>
          <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
            <button className="clinic-btn clinic-btn-outline" onClick={() => navigate('/doctor/patients')}>
              Back to Patients
            </button>
            <button className="clinic-btn clinic-btn-primary" onClick={() => window.location.reload()}>
              Retry Connection
            </button>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout pageTitle="Clinical Consultation" pageSubtitle="Simple guided workflow for fast documentation.">
      <div className="consultation-page animate-fadeIn">
        <section className="card" style={{ padding: '24px', marginBottom: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Header Row */}
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <button className="clinic-btn clinic-btn-outline" onClick={() => navigate('/doctor/patients')} style={{ padding: '8px', height: 'auto' }}>
                <ArrowLeft size={18} />
              </button>
              <div className="consultation-avatar" style={{ width: 48, height: 48, fontSize: '1.2rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {initials}
              </div>
              <div>
                <h2 style={{ margin: 0, fontSize: '1.5rem', color: 'var(--clr-text-primary)', display: 'flex', alignItems: 'center', gap: '12px' }}>
                  {fullName}
                  <span className={`sync-pill ${persistenceMode === 'api' ? 'online' : 'offline'}`} style={{ fontSize: '0.75rem', padding: '4px 8px' }}>
                    {persistenceMode === 'api' ? <Cloud size={12} /> : <WifiOff size={12} />}
                    {persistenceMode === 'api' ? 'Cloud Sync' : 'Demo Mode'}
                  </span>
                </h2>
                <p style={{ margin: 0, color: 'var(--clr-text-muted)', fontSize: '0.9rem', marginTop: '4px' }}>
                  Patient ID: <strong style={{ color: 'var(--clr-text-primary)' }}>{patient.id}</strong>
                </p>
              </div>
            </div>
            
            <button
              className={`clinic-btn ${isConsultationActive ? 'clinic-btn-primary' : 'clinic-btn-outline'}`}
              onClick={handleFinishSession}
            >
              {isConsultationActive ? <ShieldCheck size={16} /> : <CheckCircle2 size={16} />}
              {isConsultationActive ? 'Finish Session' : 'Completed'}
            </button>
          </div>

          {/* Info Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '16px', backgroundColor: 'var(--clr-surface-50, #f8fafc)', padding: '16px', borderRadius: '12px', border: '1px solid var(--clr-border)' }}>
            <div>
              <span style={{ fontSize: '0.75rem', color: 'var(--clr-text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Phone</span>
              <p style={{ margin: '4px 0 0', fontWeight: 600, color: 'var(--clr-text-primary)' }}>{patient.phone || 'N/A'}</p>
            </div>
            <div>
              <span style={{ fontSize: '0.75rem', color: 'var(--clr-text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Age &amp; Gender</span>
              <p style={{ margin: '4px 0 0', fontWeight: 600, color: 'var(--clr-text-primary)' }}>{patient.age ? `${patient.age}y` : 'N/A'}, {patient.gender || 'N/A'}</p>
            </div>
            <div>
              <span style={{ fontSize: '0.75rem', color: 'var(--clr-text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Blood Type</span>
              <p style={{ margin: '4px 0 0', fontWeight: 600, color: 'var(--clr-danger)' }}>{patient.bloodType || 'Unknown'}</p>
            </div>
            <div>
              <span style={{ fontSize: '0.75rem', color: 'var(--clr-text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Status</span>
              <p style={{ margin: '4px 0 0', fontWeight: 600, color: 'var(--clr-success)' }}>Active</p>
            </div>
          </div>

          {/* Notes and Alerts */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {patient.medicalAlerts?.length > 0 && (
              <div className="consultation-alert warning" style={{ margin: 0 }}>
                <AlertCircle size={16} />
                <strong>Alerts:</strong>
                <span>{Array.isArray(patient.medicalAlerts) ? patient.medicalAlerts.join(', ') : patient.medicalAlerts}</span>
              </div>
            )}
            {patient.notes && (
              <div className="consultation-alert" style={{ margin: 0, backgroundColor: 'rgba(16, 185, 129, 0.1)', border: '1px solid var(--clr-primary)', color: 'var(--clr-primary)' }}>
                <ClipboardList size={16} />
                <strong>Medical Notes:</strong>
                <span>{patient.notes}</span>
              </div>
            )}
          </div>
        </section>

        {/* Toast Notification */}
        {toast && (
          <div style={{
            position: 'fixed', bottom: '24px', left: '50%', transform: 'translateX(-50%)',
            background: '#1e293b', color: 'white', padding: '12px 24px', borderRadius: '30px',
            boxShadow: '0 10px 25px rgba(0,0,0,0.2)', zIndex: 2000, display: 'flex', alignItems: 'center', gap: '10px'
          }} className="animate-slideUp">
            <Loader2 size={16} className="animate-spin" />
            <span style={{ fontSize: '0.9rem', fontWeight: 500 }}>{toast}</span>
          </div>
        )}

        <section className="consultation-workspace">
          <div className="consultation-chart-card clinic-card">
            <div className="consultation-card-head">
              <div>
                <p className="section-kicker">Step 1</p>
                <h3>Select a tooth</h3>
              </div>
              <div className="consultation-segmented">
                {['both', 'upper', 'lower'].map((mode) => (
                  <button
                    key={mode}
                    className={viewMode === mode ? 'is-selected' : ''}
                    onClick={() => setViewMode(mode)}
                  >
                    {mode}
                  </button>
                ))}
              </div>
            </div>

            <div className="consultation-model-wrap">
              <Dental3DModel
                toothData={toothData}
                selectedToothId={selectedToothId}
                onToothSelect={selectTooth}
                viewMode={viewMode}
                showNumbers
              />
              {!isConsultationActive && (
                <div className="consultation-locked">Session completed</div>
              )}
            </div>

            <div className="consultation-stats">
              {CLINICAL_STATUSES.map((status) => (
                <span key={status.id}>
                  <i className="color-dot" style={{ background: status.color }} />
                  {status.label}: <strong>{stats[status.id] || 0}</strong>
                </span>
              ))}
            </div>
          </div>

          <aside className="consultation-side-card clinic-card">
            {selectedToothId ? (
              <>
                <div className="consultation-card-head">
                  <div>
                    <p className="section-kicker">Step 2</p>
                    <h3>Record finding</h3>
                    <span className="consultation-tooth-name">#{selectedToothId} {selectedTooth?.name}</span>
                  </div>
                  <button className="icon-button" onClick={() => selectTooth(null)} aria-label="Clear selected tooth">
                    <X size={18} />
                  </button>
                </div>

                <div className="consultation-status-grid">
                  {CLINICAL_STATUSES.map((status) => (
                    <button
                      key={status.id}
                      className={`choice-button ${selectedToothData.status === status.id ? 'is-selected' : ''}`}
                      onClick={() => updateToothStatus(selectedToothId, status.id)}
                      disabled={!isConsultationActive}
                    >
                      <i className="color-dot" style={{ background: status.color }} />
                      {status.label}
                    </button>
                  ))}
                </div>

                <div className="consultation-section">
                  <div className="consultation-mini-head">
                    <p className="section-kicker">Step 3</p>
                    <h4>Symptoms &amp; Findings</h4>
                  </div>
                  <div className="consultation-chip-grid">
                    {DENTAL_SYMPTOMS.map((symptom) => (
                      <button
                        key={symptom.id}
                        className={`choice-button ${symptoms.includes(symptom.id) ? 'is-selected' : ''}`}
                        onClick={() => toggleSymptom(symptom.id)}
                        disabled={!isConsultationActive}
                        style={{ padding: '8px 12px', fontSize: '0.85rem' }}
                      >
                        {symptom.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="consultation-section">
                  <label className="form-label" htmlFor="tooth-notes">Manual Clinical Notes (Optional)</label>
                  <textarea
                    id="tooth-notes"
                    className="consultation-textarea"
                    placeholder="Write additional findings or observations..."
                    value={selectedToothData.notes || ''}
                    onChange={(e) => updateToothNotes(selectedToothId, e.target.value)}
                    disabled={!isConsultationActive}
                  />
                </div>

                <div className="consultation-section">
                  <label className="form-label" htmlFor="med-history">Patient Medical History (for AI context)</label>
                  <textarea
                    id="med-history"
                    className="consultation-textarea"
                    style={{ minHeight: '60px' }}
                    placeholder="E.g. Diabetic, allergic to penicillin, previous RCT..."
                    value={medicalHistory}
                    onChange={(e) => setMedicalHistory(e.target.value)}
                    disabled={!isConsultationActive}
                  />
                </div>

                <div className="consultation-ai-box" style={{ padding: '20px', backgroundColor: 'var(--clr-surface-50, #f8fafc)', border: '1px solid var(--clr-primary)', borderRadius: '12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--clr-primary)' }}>
                      <Brain size={20} />
                      <strong style={{ fontSize: '1rem' }}>AI Clinical Reporter</strong>
                    </div>
                    <button className="clinic-btn clinic-btn-primary" onClick={runAnalysis} disabled={isAnalyzing || !isConsultationActive || symptoms.length === 0}>
                      {isAnalyzing ? <><Sparkles size={16} /> Analyzing...</> : <><Sparkles size={16} /> Generate Report</>}
                    </button>
                  </div>
                  
                  {symptoms.length === 0 && !aiResult && (
                    <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--clr-text-muted)' }}>Select clinical symptoms above to generate a structured AI diagnosis report.</p>
                  )}

                  {aiResult && (
                    <div className="ai-report-card" style={{ backgroundColor: '#fff', padding: '16px', borderRadius: '8px', border: '1px solid var(--clr-border)', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      <div>
                        <strong style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--clr-text-muted)' }}>Clinical Findings</strong>
                        <p style={{ margin: '4px 0 0', fontSize: '0.9rem', color: 'var(--clr-text-primary)' }}>{aiResult.findings}</p>
                      </div>
                      <div>
                        <strong style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--clr-text-muted)' }}>Diagnosis &amp; Codes</strong>
                        <p style={{ margin: '4px 0 0', fontSize: '0.9rem', color: 'var(--clr-text-primary)' }}>
                          <strong>{aiResult.diagnosis}</strong> <span style={{ color: 'var(--clr-text-muted)', fontSize: '0.8rem' }}>(SNOMED: {aiResult.snomed})</span>
                        </p>
                      </div>
                      <div style={{ display: 'flex', gap: '16px' }}>
                        <div style={{ flex: 1 }}>
                          <strong style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--clr-text-muted)' }}>Treatment Plan</strong>
                          <p style={{ margin: '4px 0 0', fontSize: '0.9rem', color: 'var(--clr-text-primary)' }}>{aiResult.treatment}</p>
                        </div>
                        <div>
                          <strong style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--clr-text-muted)' }}>Urgency</strong>
                          <p style={{ margin: '4px 0 0', fontSize: '0.9rem', color: aiResult.urgency.includes('High') ? 'var(--clr-danger)' : 'var(--clr-warning)' }}>{aiResult.urgency}</p>
                        </div>
                      </div>
                      
                      <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '8px' }}>
                        <button className="clinic-btn clinic-btn-outline btn-sm" onClick={applyAISuggestion} disabled={!isConsultationActive}>
                          Save to Clinical Notes
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
                <p>The finding panel will show status, symptoms, notes, and AI assistance.</p>
              </div>
            )}
          </aside>
        </section>

      </div>
    </Layout>
  );
}
