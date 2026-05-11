import React from 'react';
import { MoreVertical, Search, Shield, TrendingUp, UserPlus, Users } from 'lucide-react';
import Layout from '../../components/Layout';
import { useData } from '../../context/DataContext';

export default function AdminDashboard() {
  const { doctors, stats } = useData();

  const metrics = [
    { label: 'Total Patients', value: stats.totalPatients.value, icon: Users },
    { label: 'Monthly Revenue', value: stats.revenue.value, icon: TrendingUp },
    { label: 'Active Staff', value: doctors.length, icon: UserPlus },
    { label: 'Compliance Score', value: '98%', icon: Shield }
  ];

  return (
    <Layout pageTitle="Administration" pageSubtitle="Clinic performance and personnel management.">
      <div className="page-stack animate-fadeIn">
        <section className="metric-grid">
          {metrics.map((metric) => (
            <div className="card stat-card" key={metric.label}>
              <div className="stat-icon"><metric.icon size={22} /></div>
              <div>
                <div className="stat-value">{metric.value}</div>
                <div className="stat-label">{metric.label}</div>
              </div>
            </div>
          ))}
        </section>

        <section className="content-grid-2">
          <div className="card">
            <div className="section-header">
              <div>
                <h3 className="section-title">Medical Personnel</h3>
                <p className="section-subtitle">Providers and active clinic staff.</p>
              </div>
              <div className="row-actions">
                <div className="search-box" style={{ width: 260 }}>
                  <Search size={16} />
                  <input className="search-box-field" type="text" placeholder="Search staff..." />
                </div>
                <button className="clinic-btn clinic-btn-primary">Add Provider</button>
              </div>
            </div>

            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th>Provider</th>
                    <th>Specialty</th>
                    <th>Patients</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {doctors.map((doctor) => (
                    <tr key={doctor.id}>
                      <td>
                        <div className="row-actions">
                          <div className="avatar-box" style={{ width: 34, height: 34 }}>{doctor.avatar}</div>
                          <strong>{doctor.name}</strong>
                        </div>
                      </td>
                      <td>{doctor.specialty}</td>
                      <td>{doctor.patients}</td>
                      <td><span className="badge badge-success">Active</span></td>
                      <td><button className="icon-button"><MoreVertical size={16} /></button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="page-stack">
            <div className="card">
              <p className="section-kicker">System</p>
              <h3 className="section-title">Compliance</h3>
              <div className="page-stack" style={{ gap: 10, marginTop: 14 }}>
                <div className="section-subtitle">AI Diagnostic Accuracy: <strong>94.2%</strong></div>
                <div className="section-subtitle">Data Encryption: <strong>Active</strong></div>
                <div className="section-subtitle">Backup Status: <strong style={{ color: 'var(--clr-primary-dark)' }}>Verified</strong></div>
              </div>
              <button className="clinic-btn clinic-btn-outline" style={{ width: '100%', marginTop: 16 }}>Run Full Audit</button>
            </div>

            <div className="card">
              <h3 className="section-title">Announcements</h3>
              <p className="section-subtitle">
                The digital tooth mapping system has been updated to FDI v2.1. Clinicians should review protocols by Friday.
              </p>
            </div>
          </div>
        </section>
      </div>
    </Layout>
  );
}
