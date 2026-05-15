import React from 'react';
import { 
  Search, Shield, TrendingUp, UserPlus, Users, 
  Stethoscope, UserCircle, Settings, Plus, ArrowRight
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import Layout from '../../components/Layout';
import { useData } from '../../context/DataContext';

export default function AdminDashboard() {
  const { doctors, receptionists, stats } = useData();
  const navigate = useNavigate();

  const metrics = [
    { label: 'Total Patients', value: stats.totalPatients.value, icon: Users, color: 'var(--clr-primary)' },
    { label: 'Active Doctors', value: doctors.length, icon: Stethoscope, color: '#8b5cf6' },
    { label: 'Receptionists', value: receptionists.length, icon: UserCircle, color: '#10b981' },
    { label: 'System Health', value: '98%', icon: Shield, color: '#f59e0b' }
  ];

  return (
    <Layout pageTitle="Admin Overview" pageSubtitle="Comprehensive management of clinic staff and system performance.">
      <div className="page-stack animate-fadeIn">
        
        {/* Top Section: Metrics */}
        <section className="metric-grid">
          {metrics.map((metric) => (
            <div className="card stat-card" key={metric.label}>
              <div className="stat-icon" style={{ backgroundColor: `${metric.color}15`, color: metric.color, width: 42, height: 42, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <metric.icon size={22} />
              </div>
              <div>
                <div className="stat-value" style={{ fontSize: '1.5rem', fontWeight: 800 }}>{metric.value}</div>
                <div className="stat-label" style={{ fontSize: '0.8rem', color: 'var(--clr-text-muted)', fontWeight: 600 }}>{metric.label}</div>
              </div>
            </div>
          ))}
        </section>

        {/* Quick Actions */}
        <section className="card" style={{ marginBottom: 'var(--sp-xl)' }}>
          <h3 className="section-title" style={{ marginBottom: 16 }}>Quick Actions</h3>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            <button className="btn btn-primary" onClick={() => navigate('/admin/doctors')}>
              <Plus size={16} /> Add Doctor
            </button>
            <button className="btn btn-secondary" onClick={() => navigate('/admin/receptionists')}>
              <Plus size={16} /> Add Receptionist
            </button>
            <button className="btn btn-ghost" onClick={() => navigate('/admin/settings')}>
              <Settings size={16} /> Clinic Settings
            </button>
          </div>
        </section>

        {/* Middle Section: Staff Summaries */}
        <section className="content-grid-2">
          {/* Doctors Summary */}
          <div className="card">
            <div className="section-header">
              <div>
                <h3 className="section-title">Doctors</h3>
                <p className="section-subtitle">{doctors.length} active medical providers</p>
              </div>
              <button className="icon-btn" onClick={() => navigate('/admin/doctors')}><ArrowRight size={18} /></button>
            </div>
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th>Doctor</th>
                    <th>Specialization</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {doctors.slice(0, 5).map((doc) => (
                    <tr key={doc.id}>
                      <td>
                        <div style={{ fontWeight: 600 }}>{doc.name}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--clr-text-muted)' }}>{doc.email}</div>
                      </td>
                      <td><span className="badge badge-secondary">{doc.specialization || 'General'}</span></td>
                      <td><span className="badge badge-success">Active</span></td>
                    </tr>
                  ))}
                  {doctors.length === 0 && <tr><td colSpan="3" style={{ textAlign: 'center', padding: 20 }}>No doctors registered yet.</td></tr>}
                </tbody>
              </table>
            </div>
          </div>

          {/* Receptionists Summary */}
          <div className="card">
            <div className="section-header">
              <div>
                <h3 className="section-title">Receptionists</h3>
                <p className="section-subtitle">{receptionists.length} front-desk personnel</p>
              </div>
              <button className="icon-btn" onClick={() => navigate('/admin/receptionists')}><ArrowRight size={18} /></button>
            </div>
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th>Receptionist</th>
                    <th>Email</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {receptionists.slice(0, 5).map((rec) => (
                    <tr key={rec.id}>
                      <td>
                        <div style={{ fontWeight: 600 }}>{rec.name}</div>
                      </td>
                      <td>{rec.email}</td>
                      <td><span className="badge badge-success">Active</span></td>
                    </tr>
                  ))}
                  {receptionists.length === 0 && <tr><td colSpan="3" style={{ textAlign: 'center', padding: 20 }}>No receptionists registered yet.</td></tr>}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {/* Bottom Section: System Activity / Info */}
        <section className="content-grid-2">
           <div className="card">
              <h3 className="section-title">System Compliance</h3>
              <div className="page-stack" style={{ gap: 12, marginTop: 16 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem' }}>
                   <span style={{ color: 'var(--clr-text-muted)' }}>AI Diagnostic Accuracy</span>
                   <span style={{ fontWeight: 700 }}>94.2%</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem' }}>
                   <span style={{ color: 'var(--clr-text-muted)' }}>HIPAA Compliance</span>
                   <span style={{ color: '#10b981', fontWeight: 700 }}>Verified</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem' }}>
                   <span style={{ color: 'var(--clr-text-muted)' }}>Data Backups</span>
                   <span style={{ fontWeight: 700 }}>Daily @ 02:00</span>
                </div>
              </div>
           </div>

           <div className="card">
              <h3 className="section-title">Announcements</h3>
              <div className="page-stack" style={{ gap: 12, marginTop: 16 }}>
                <div style={{ padding: 12, borderRadius: 8, background: 'var(--clr-surface-2)', border: '1px solid var(--clr-border)' }}>
                   <div style={{ fontWeight: 600, fontSize: '0.875rem', marginBottom: 4 }}>System Update v2.4</div>
                   <div style={{ fontSize: '0.75rem', color: 'var(--clr-text-muted)' }}>Tooth mapping algorithm improved for 3D scans.</div>
                </div>
                <div style={{ padding: 12, borderRadius: 8, background: 'var(--clr-surface-2)', border: '1px solid var(--clr-border)' }}>
                   <div style={{ fontWeight: 600, fontSize: '0.875rem', marginBottom: 4 }}>Staff Meeting</div>
                   <div style={{ fontSize: '0.75rem', color: 'var(--clr-text-muted)' }}>Upcoming meeting on Friday at 4:00 PM.</div>
                </div>
              </div>
           </div>
        </section>

      </div>
    </Layout>
  );
}
