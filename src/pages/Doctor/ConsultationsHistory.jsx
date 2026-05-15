import React, { useState, useEffect } from 'react';
import Layout from '../../components/Layout';
import { useLanguage } from '../../context/LanguageContext';
import { 
  Search, Calendar, User, ClipboardList, Eye, 
  ArrowRight, FileText, Activity, AlertCircle, X, CheckCircle2, Edit3, Save, Clock, ChevronDown, ChevronUp, Sparkles, Loader2, Heart, ThumbsUp, ThumbsDown
} from 'lucide-react';
import { humanizeReport } from '../../services/reportApi';

export default function ConsultationsHistory() {
  const { t } = useLanguage();
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');
  const [expandedId, setExpandedId] = useState(null);

  const fetchHistory = async () => {
    try {
      const token = localStorage.getItem('clinic_token');
      const res = await fetch('http://localhost:8000/api/doctor/consultations/history', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Failed to fetch history');
      const data = await res.json();
      setHistory(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, []);

  const filtered = history.filter(h => 
    h.patient_name.toLowerCase().includes(search.toLowerCase()) ||
    (h.final_medical_report && h.final_medical_report.toLowerCase().includes(search.toLowerCase())) ||
    (h.tooth_status && h.tooth_status.toLowerCase().includes(search.toLowerCase())) ||
    (h.tooth_id && h.tooth_id.toString().includes(search))
  );

  const handleUpdate = (updatedReport) => {
    setHistory(prev => prev.map(h => h.id === updatedReport.id ? { ...h, ...updatedReport } : h));
  };

  const toggleExpand = (id) => {
    setExpandedId(prev => (prev === id ? null : id));
  };

  return (
    <Layout pageTitle={t('consultationHistory')} pageSubtitle="Review and manage your previous clinical sessions.">
      <div className="page-stack animate-fadeIn">
        
        {/* Header Actions */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <div style={{ position: 'relative', width: '100%', maxWidth: 400 }}>
            <Search size={18} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--clr-text-muted)' }} />
            <input 
              className="form-input" 
              style={{ paddingLeft: 44, borderRadius: 14, height: 48, border: '1px solid var(--clr-border)' }}
              placeholder="Search by patient name, diagnosis, or tooth..." 
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
        </div>

        {loading ? (
          <div style={{ padding: 100, textAlign: 'center' }}>
            <div className="spinner" style={{ margin: '0 auto 20px' }}></div>
            <p style={{ color: 'var(--clr-text-muted)' }}>Loading history...</p>
          </div>
        ) : error ? (
          <div className="card" style={{ padding: 40, textAlign: 'center', border: '1px solid #fee2e2', background: '#fef2f2' }}>
            <AlertCircle size={40} color="#ef4444" style={{ marginBottom: 16 }} />
            <h3 style={{ color: '#991b1b', marginBottom: 8 }}>Error</h3>
            <p style={{ color: '#b91c1c' }}>{error}</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="card" style={{ padding: 60, textAlign: 'center' }}>
            <ClipboardList size={60} style={{ color: 'var(--clr-text-muted)', marginBottom: 20, opacity: 0.2 }} />
            <h3 style={{ marginBottom: 10 }}>No history found</h3>
            <p style={{ color: 'var(--clr-text-muted)' }}>You haven't completed any consultations yet or none match your search.</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {filtered.map(report => (
              <ExpandableConsultationCard 
                key={report.id} 
                report={report} 
                isExpanded={expandedId === report.id}
                onToggle={() => toggleExpand(report.id)}
                onUpdate={handleUpdate}
              />
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
}

function ExpandableConsultationCard({ report, isExpanded, onToggle, onUpdate }) {
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [isHumanizing, setIsHumanizing] = useState(false);
  const [draftHumanizedReport, setDraftHumanizedReport] = useState(null);
  const [editData, setEditData] = useState({
    tooth_status: report.tooth_status || '',
    symptoms: report.symptoms || [],
    doctor_notes: report.doctor_notes || '',
    final_medical_report: report.final_medical_report || '',
    humanized_report: report.humanized_report || '',
    status: report.status || 'finalized'
  });

  const handleHumanize = async (e) => {
    if (e) e.stopPropagation();
    if (!report.final_medical_report) {
      alert("Please provide a medical report first.");
      return;
    }
    setIsHumanizing(true);
    setDraftHumanizedReport(null);
    try {
      const result = await humanizeReport(report.final_medical_report, report.patient_name);
      setDraftHumanizedReport(result.humanized_report);
    } catch (err) {
      alert("Failed to humanize: " + err.message);
    } finally {
      setIsHumanizing(false);
    }
  };

  const approveHumanizedReport = async (approvedText) => {
    setLoading(true);
    try {
      const token = localStorage.getItem('clinic_token');
      await fetch(`http://localhost:8000/api/reports/${report.id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ ...editData, humanized_report: approvedText })
      });
      
      onUpdate({ ...report, humanized_report: approvedText });
      setEditData(prev => ({ ...prev, humanized_report: approvedText }));
      setDraftHumanizedReport(null);
    } catch (err) {
      alert("Failed to save approved report: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!isExpanded) setIsEditing(false);
    else {
      // Sync edit data with report when expanded
      setEditData({
        tooth_status: report.tooth_status || '',
        symptoms: report.symptoms || [],
        doctor_notes: report.doctor_notes || '',
        final_medical_report: report.final_medical_report || '',
        humanized_report: report.humanized_report || '',
        status: report.status || 'finalized'
      });
    }
  }, [isExpanded, report]);

  const handleSave = async (e) => {
    e.stopPropagation();
    setLoading(true);
    try {
      const token = localStorage.getItem('clinic_token');
      const res = await fetch(`http://localhost:8000/api/reports/${report.id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(editData)
      });
      if (!res.ok) throw new Error('Failed to update report');
      onUpdate({ ...report, ...editData });
      setIsEditing(false);
    } catch (err) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  const dateObj = new Date(report.created_at);
  const dateStr = dateObj.toLocaleDateString();
  const timeStr = dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  return (
    <div className={`card transition-all ${isExpanded ? 'shadow-lg is-expanded' : 'hover-scale'}`} 
      style={{ 
        padding: 0, 
        overflow: 'hidden', 
        borderRadius: 20, 
        cursor: 'pointer',
        border: isExpanded ? '2px solid var(--clr-primary)' : '1px solid var(--clr-border)',
        transform: isExpanded ? 'none' : undefined,
        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
      }}
      onClick={onToggle}
    >
      {/* Compact Header */}
      <div style={{ padding: '20px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{ width: 40, height: 40, borderRadius: 10, background: 'rgba(16, 185, 129, 0.1)', color: '#10b981', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <User size={20} />
          </div>
          <div>
            <div style={{ fontWeight: 800, fontSize: '0.95rem', color: 'var(--clr-text)' }}>{report.patient_name}</div>
            <div style={{ fontSize: '0.7rem', color: 'var(--clr-text-muted)', fontWeight: 600 }}>ID: #{report.patient_id}</div>
          </div>
          <div style={{ width: 1, height: 20, background: 'var(--clr-border)', margin: '0 4px' }} />
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.75rem', color: '#64748b', fontWeight: 700 }}>
             <Clock size={14} style={{ color: 'var(--clr-primary)' }} />
             <span>{dateStr} • {timeStr}</span>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ display: 'flex', gap: 6 }}>
            <span className="badge" style={{ background: '#f1f5f9', color: '#64748b', fontSize: '0.65rem', fontWeight: 700, padding: '4px 8px' }}>Tooth #{report.tooth_id}</span>
            <span className="badge" style={{ background: 'rgba(16, 185, 129, 0.1)', color: '#10b981', fontSize: '0.65rem', fontWeight: 700, padding: '4px 8px', textTransform: 'uppercase' }}>{report.status}</span>
          </div>
          <div style={{ width: 32, height: 32, borderRadius: 8, background: isExpanded ? 'rgba(var(--clr-primary-rgb), 0.1)' : '#f8fafc', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {isExpanded ? <ChevronUp size={18} color="var(--clr-primary)" /> : <ChevronDown size={18} color="var(--clr-text-muted)" />}
          </div>
        </div>
      </div>

      {!isExpanded && (
        <div style={{ padding: '0 24px 20px 80px' }}>
          <p style={{ 
            fontSize: '0.8rem', 
            color: 'var(--clr-text-muted)', 
            lineHeight: 1.4, 
            display: '-webkit-box', 
            WebkitLineClamp: 1, 
            WebkitBoxOrient: 'vertical', 
            overflow: 'hidden'
          }}>
            {report.final_medical_report || report.ai_draft_report || 'Clinical session completed.'}
          </p>
        </div>
      )}

      {/* Expanded Content */}
      {isExpanded && (
        <div style={{ padding: '0 24px 32px 24px' }} onClick={e => e.stopPropagation()}>
          <div style={{ height: 1, background: 'var(--clr-border)', marginBottom: 32 }} />
          
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 24, marginBottom: 40 }}>
            <InfoBlock icon={User} label="Patient" value={report.patient_name} sub={`ID: #${report.patient_id}`} color="#3b82f6" />
            <InfoBlock icon={Activity} label="Clinical Target" value={`Tooth #${report.tooth_id}`} sub={isEditing ? 'FDI Number (Locked)' : report.tooth_status} color="#8b5cf6" />
            <InfoBlock icon={CheckCircle2} label="Status" value={isEditing ? 'Editing...' : report.status.toUpperCase()} color="#10b981" />
          </div>

          <div className="page-stack" style={{ gap: 32 }}>
            {isEditing ? (
              <>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
                  <div className="form-group">
                    <label className="form-label">Tooth Status</label>
                    <input className="form-input" value={editData.tooth_status} onChange={e => setEditData({...editData, tooth_status: e.target.value})} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Completion Status</label>
                    <select className="form-input" value={editData.status} onChange={e => setEditData({...editData, status: e.target.value})}>
                      <option value="draft">Draft</option>
                      <option value="finalized">Finalized</option>
                    </select>
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Symptoms & Findings (Comma separated)</label>
                  <input className="form-input" value={editData.symptoms.join(', ')} 
                    onChange={e => setEditData({...editData, symptoms: e.target.value.split(',').map(s => s.trim()).filter(s => s)})} />
                </div>

                <div className="form-group">
                  <label className="form-label">Doctor Personal Notes</label>
                  <textarea className="form-input" style={{ minHeight: 100 }} value={editData.doctor_notes} onChange={e => setEditData({...editData, doctor_notes: e.target.value})} />
                </div>

                <div className="form-group">
                  <label className="form-label">Final Medical Report</label>
                  <textarea className="form-input" style={{ minHeight: 250, fontSize: '0.95rem', lineHeight: 1.6 }} value={editData.final_medical_report} onChange={e => setEditData({...editData, final_medical_report: e.target.value})} />
                </div>

                <div className="form-group">
                  <label className="form-label">Humanized Patient View</label>
                  <textarea className="form-input" style={{ minHeight: 120 }} value={editData.humanized_report} onChange={e => setEditData({...editData, humanized_report: e.target.value})} />
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, marginTop: 16 }}>
                  <button className="btn btn-ghost" onClick={() => setIsEditing(false)}>Cancel Changes</button>
                  <button className="btn btn-primary" onClick={handleSave} disabled={loading} style={{ borderRadius: 12, height: 48, padding: '0 32px', fontWeight: 700 }}>
                    {loading ? 'Saving...' : 'Save & Update'}
                  </button>
                </div>
              </>
            ) : (
              <>
                <Section title="Findings & Symptoms">
                   <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginTop: 4 }}>
                      {report.symptoms?.length > 0 ? report.symptoms.map((s, i) => (
                        <span key={i} className="badge" style={{ background: 'white', border: '1px solid var(--clr-border)', color: 'var(--clr-text)', padding: '6px 12px', fontSize: '0.8rem', fontWeight: 600 }}>{s}</span>
                      )) : <p style={{ color: 'var(--clr-text-muted)', fontSize: '0.9rem' }}>No specific symptoms recorded.</p>}
                   </div>
                </Section>

                {report.doctor_notes && (
                  <Section title="Doctor Personal Notes">
                    <div style={{ padding: 20, borderRadius: 16, background: '#f8fafc', border: '1px solid var(--clr-border)' }}>
                      <p style={{ fontSize: '0.925rem', lineHeight: 1.7, color: 'var(--clr-text)' }}>{report.doctor_notes}</p>
                    </div>
                  </Section>
                )}

                <Section title="Final Saved Clinical Report">
                  <div style={{ padding: 24, borderRadius: 20, background: 'rgba(16, 185, 129, 0.03)', border: '1px solid rgba(16, 185, 129, 0.1)', position: 'relative' }}>
                    <FileText size={24} style={{ position: 'absolute', right: 24, top: 24, opacity: 0.1, color: '#10b981' }} />
                    <p style={{ fontSize: '1rem', lineHeight: 1.8, color: 'var(--clr-text)', whiteSpace: 'pre-wrap', fontWeight: 500 }}>
                      {report.final_medical_report || 'No final report content was saved for this session.'}
                    </p>
                  </div>
                </Section>

                {(report.humanized_report || report.ai_draft_report || !report.humanized_report || draftHumanizedReport) && (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 24 }}>
                    {report.humanized_report ? (
                      <Section title="Humanized Patient View">
                        <div style={{ padding: 24, borderRadius: 20, background: 'rgba(59, 130, 246, 0.04)', border: '1px solid rgba(59, 130, 246, 0.1)', position: 'relative' }}>
                           <Heart size={20} style={{ position: 'absolute', right: 20, top: 20, color: '#3b82f6', opacity: 0.2 }} />
                           <p style={{ 
                             fontSize: '1.05rem', 
                             lineHeight: 1.8, 
                             color: 'var(--clr-text)', 
                             fontStyle: 'italic', 
                             fontFamily: '"Outfit", sans-serif',
                             fontWeight: 500 
                           }}>
                             "{report.humanized_report}"
                           </p>
                        </div>
                      </Section>
                    ) : draftHumanizedReport ? (
                      <Section title="Review AI Humanization">
                        <div className="animate-fadeIn" style={{ padding: 24, borderRadius: 20, background: 'rgba(16, 185, 129, 0.04)', border: '2px dashed var(--clr-primary)' }}>
                           <p style={{ 
                             fontSize: '1.05rem', 
                             lineHeight: 1.8, 
                             color: 'var(--clr-text)', 
                             fontStyle: 'italic', 
                             fontFamily: '"Outfit", sans-serif',
                             fontWeight: 500,
                             marginBottom: 20
                           }}>
                             "{draftHumanizedReport}"
                           </p>
                           <div style={{ display: 'flex', gap: 12, justifyContent: 'center', paddingTop: 16, borderTop: '1px solid rgba(16,185,129,0.1)' }}>
                              <button 
                                className="btn btn-sm btn-primary" 
                                style={{ height: 40, padding: '0 20px', borderRadius: 10, gap: 8 }}
                                onClick={() => approveHumanizedReport(draftHumanizedReport)}
                                disabled={loading}
                              >
                                <ThumbsUp size={16} /> Approve & Save
                              </button>
                              <button 
                                className="btn btn-sm btn-ghost" 
                                style={{ height: 40, padding: '0 20px', borderRadius: 10, gap: 8, color: 'var(--clr-danger)' }}
                                onClick={() => setDraftHumanizedReport(null)}
                                disabled={loading}
                              >
                                <ThumbsDown size={16} /> Discard
                              </button>
                           </div>
                        </div>
                      </Section>
                    ) : (
                      <Section title="Humanized Patient View">
                        <div style={{ 
                          padding: 24, 
                          borderRadius: 20, 
                          background: 'rgba(255, 107, 107, 0.03)', 
                          border: '1px dashed rgba(255, 107, 107, 0.2)',
                          textAlign: 'center'
                        }}>
                          <Heart size={24} style={{ color: '#ff6b6b', opacity: 0.5, marginBottom: 12 }} />
                          <p style={{ fontSize: '0.85rem', color: 'var(--clr-text-muted)', marginBottom: 16 }}>
                            No patient-friendly explanation found for this session.
                          </p>
                          <button 
                            className="btn btn-sm" 
                            style={{ background: 'rgba(255, 107, 107, 0.1)', color: '#ff6b6b', border: 'none', gap: 6 }}
                            onClick={handleHumanize}
                            disabled={isHumanizing || !report.final_medical_report}
                          >
                            {isHumanizing ? <><Loader2 size={14} className="animate-spin" /> Generating...</> : <><Sparkles size={14} /> Generate for Patient</>}
                          </button>
                        </div>
                      </Section>
                    )}
                    {report.ai_draft_report && !report.final_medical_report && (
                      <Section title="Original AI Draft">
                        <div style={{ padding: 20, borderRadius: 16, background: '#f8fafc', border: '1px solid var(--clr-border)' }}>
                           <p style={{ fontSize: '0.9rem', lineHeight: 1.7, color: 'var(--clr-text-muted)' }}>
                             {report.ai_draft_report}
                           </p>
                        </div>
                      </Section>
                    )}
                  </div>
                )}

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, marginTop: 16 }}>
                  <button className="btn btn-secondary" style={{ borderRadius: 12, height: 48, gap: 8 }} onClick={() => setIsEditing(true)}>
                    <Edit3 size={18} /> Edit Consultation
                  </button>
                  <button className="btn btn-ghost" onClick={onToggle}>Collapse Card</button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function InfoBlock({ icon: Icon, label, value, sub, color }) {
  return (
    <div style={{ display: 'flex', gap: 16 }}>
      <div style={{ width: 52, height: 52, borderRadius: 16, background: 'white', border: '1px solid var(--clr-border)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: color || 'var(--clr-primary)', boxShadow: '0 4px 12px rgba(0,0,0,0.03)' }}>
        <Icon size={24} />
      </div>
      <div>
        <div style={{ fontSize: '0.75rem', color: 'var(--clr-text-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>{label}</div>
        <div style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--clr-text)' }}>{value}</div>
        {sub && <div style={{ fontSize: '0.8rem', color: 'var(--clr-text-muted)', fontWeight: 500 }}>{sub}</div>}
      </div>
    </div>
  );
}

function Section({ title, children }) {
  return (
    <div>
      <h3 style={{ fontSize: '0.85rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--clr-text-muted)', display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
        <span style={{ height: 1, flex: 1, background: 'var(--clr-border)' }} />
        {title}
        <span style={{ height: 1, flex: 1, background: 'var(--clr-border)' }} />
      </h3>
      {children}
    </div>
  );
}
