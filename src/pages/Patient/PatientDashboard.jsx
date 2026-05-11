import React from 'react';
import { Bell, Bot, Calendar, CheckCircle, FileText, MessageSquare } from 'lucide-react';
import Layout from '../../components/Layout';
import { useData } from '../../context/DataContext';

export default function PatientDashboard() {
  const { appointments: allAppts } = useData();
  const myAppts = allAppts.filter((appointment) => appointment.patient.includes('Eleanor Voss'));
  const nextAppt = myAppts[0];

  const reports = [
    { id: 1, title: 'Dental Clinical Summary', date: '20 April 2026', status: 'Final' },
    { id: 2, title: 'Dental X-Ray Report', date: '15 April 2026', status: 'Completed' }
  ];

  return (
    <Layout pageTitle="Patient Portal" pageSubtitle="Appointments, reports, and clinic communication.">
      <div className="page-stack animate-fadeIn">
        <section className="metric-grid-3">
          <div className="card">
            <p className="section-kicker">Next Visit</p>
            <div className="row-actions" style={{ marginTop: 12 }}>
              <div className="stat-icon"><Calendar size={22} /></div>
              <div>
                <div className="stat-value" style={{ fontSize: '1rem' }}>{nextAppt?.date || 'No schedule'}</div>
                <div className="stat-label">{nextAppt?.time || ''} {nextAppt?.doctor ? `with ${nextAppt.doctor}` : ''}</div>
              </div>
            </div>
            <button className="clinic-btn clinic-btn-outline" style={{ width: '100%', marginTop: 16 }}>Reschedule</button>
          </div>

          <div className="card">
            <div className="row-actions"><Bot size={20} color="var(--clr-primary-dark)" /><h3 className="section-title">AI Health Advisor</h3></div>
            <p className="section-subtitle">Your recent clinical analysis suggests gum health has improved since your last visit.</p>
          </div>

          <div className="card">
            <div className="row-actions"><Bell size={20} color="var(--clr-warning)" /><h3 className="section-title">Alerts</h3></div>
            <p className="section-subtitle">Your X-Ray Analysis is ready for review.</p>
          </div>
        </section>

        <section className="content-grid-2">
          <div className="card">
            <div className="section-header">
              <div>
                <h3 className="section-title"><FileText size={18} color="var(--clr-primary-dark)" /> Medical History</h3>
                <p className="section-subtitle">Your available reports and summaries.</p>
              </div>
            </div>

            <div className="page-stack" style={{ gap: 12 }}>
              {reports.map((report) => (
                <div className="card" key={report.id} style={{ boxShadow: 'none' }}>
                  <div className="section-header" style={{ marginBottom: 0 }}>
                    <div>
                      <h4 className="section-title">{report.title}</h4>
                      <p className="section-subtitle">{report.date}</p>
                    </div>
                    <div className="row-actions">
                      <span className="badge badge-success"><CheckCircle size={12} /> {report.status}</span>
                      <button className="clinic-btn clinic-btn-outline btn-sm">Open PDF</button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="card">
            <div className="row-actions">
              <div className="stat-icon"><Bot size={20} /></div>
              <div>
                <h3 className="section-title">Smart Assistant</h3>
                <p className="section-subtitle">Ask about symptoms or get a summary of your records.</p>
              </div>
            </div>
            <div className="card" style={{ marginTop: 18, boxShadow: 'none', textAlign: 'center' }}>
              <button className="clinic-btn clinic-btn-primary" style={{ width: 56, height: 56, borderRadius: '50%', padding: 0 }}>
                <MessageSquare size={24} />
              </button>
            </div>
          </div>
        </section>
      </div>
    </Layout>
  );
}
