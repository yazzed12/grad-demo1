import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Activity, Calendar, ChevronRight, Clock, ShieldCheck, Star, Users } from 'lucide-react';
import Layout from '../../components/Layout';
import UpcomingConsultations from '../../components/UpcomingConsultations';
import PracticeInsights from '../../components/PracticeInsights';
import AIChatPanel from '../../components/AIChatPanel';

const API_BASE = 'http://localhost:8000';

export default function DoctorDashboard() {
  const [dashboardStats, setDashboardStats] = useState(null);
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchAll = async () => {
      try {
        setLoading(true);
        const [statsRes, logsRes] = await Promise.all([
          fetch(`${API_BASE}/dashboard`),
          fetch(`${API_BASE}/logs`),
        ]);

        if (!statsRes.ok || !logsRes.ok) {
          throw new Error('One or more API requests failed.');
        }

        const [stats, logsData] = await Promise.all([
          statsRes.json(),
          logsRes.json(),
        ]);

        setDashboardStats(stats);
        setLogs(logsData);
        setError(null);
      } catch (err) {
        console.error('Dashboard fetch error:', err);
        setError('Could not connect to the backend. Make sure the FastAPI server is running on port 8000.');
      } finally {
        setLoading(false);
      }
    };

    fetchAll();
  }, []);

  const metrics = [
    { label: 'Total Patients',      value: dashboardStats?.totalPatients    ?? '—', icon: Users    },
    { label: 'Today Appointments',  value: dashboardStats?.todayAppointments ?? '—', icon: Calendar },
    { label: 'Active Records',      value: dashboardStats?.activeRecords     ?? '—', icon: Activity },
    { label: 'Clinic Rating',       value: dashboardStats?.rating            ?? '—', icon: Star     },
  ];

  return (
    <Layout pageTitle="Clinical Overview" pageSubtitle="Today schedule, patient queue, and clinical activity.">
      <div className="page-stack animate-fadeIn">

        {/* ── Practice Insights (AI Powered) ─────────────────────────── */}
        <section>
          <PracticeInsights />
        </section>

        {/* ── Metric Cards ──────────────────────────────────────────────── */}
        <section className="metric-grid">
          {metrics.map((metric) => (
            <div className="card stat-card" key={metric.label}>
              <div className="stat-icon">
                <metric.icon size={22} />
              </div>
              <div>
                <div className="stat-value">
                  {loading ? (
                    <span style={{ opacity: 0.4, fontSize: '1rem' }}>loading…</span>
                  ) : (
                    metric.value
                  )}
                </div>
                <div className="stat-label">{metric.label}</div>
              </div>
            </div>
          ))}
        </section>

        {/* ── Main Content Grid ─────────────────────────────────────────── */}
        <section className="content-grid-2">

          {/* Upcoming Consultations Component */}
          <UpcomingConsultations />

          {/* Right Column */}
          <div className="page-stack">

            {/* AI Practice Assistant Panel */}
            <section style={{ height: '500px' }}>
              <AIChatPanel />
            </section>

            {/* Practice Insight (Static - we can keep or remove, but user asked for new component) */}
            {/* ... keeping it for design balance or replacing with something else ... */}

            {/* Recent Clinical Logs */}
            <div className="card">
              <h3 className="section-title">Recent Clinical Logs</h3>
              <div className="page-stack" style={{ gap: 12, marginTop: 14 }}>
                {loading ? (
                  <div style={{ opacity: 0.4, fontSize: '0.86rem' }}>Loading logs…</div>
                ) : logs.length === 0 ? (
                  <div style={{ color: 'var(--clr-muted)', fontSize: '0.86rem' }}>No logs available.</div>
                ) : (
                  logs.map((log) => (
                    <div className="row-actions" key={log.id} style={{ alignItems: 'flex-start' }}>
                      <div className="stat-icon" style={{ width: 34, height: 34 }}>
                        <Clock size={16} />
                      </div>
                      <div>
                        <strong style={{ fontSize: '0.86rem' }}>{log.message}</strong>
                        <div className="muted" style={{ fontSize: '0.76rem' }}>{log.created_at}</div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

          </div>
        </section>
      </div>
    </Layout>
  );
}
