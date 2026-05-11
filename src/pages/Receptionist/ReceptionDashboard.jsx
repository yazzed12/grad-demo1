import React from 'react';
import { Calendar, CheckCircle, Clock, Plus, Search, UserPlus } from 'lucide-react';
import Layout from '../../components/Layout';
import { useData } from '../../context/DataContext';

export default function ReceptionDashboard() {
  const { appointments } = useData();
  const todayAppts = appointments.filter((appointment) => appointment.date === '2026-04-23');

  return (
    <Layout pageTitle="Reception Desk" pageSubtitle="Appointment schedule and front desk actions.">
      <div className="page-stack animate-fadeIn">
        <section className="section-header">
          <div className="search-box">
            <Search size={16} />
            <input className="search-box-field" type="text" placeholder="Quick find patient..." />
          </div>
          <button className="clinic-btn clinic-btn-primary"><Plus size={18} /> Book Appointment</button>
        </section>

        <section className="metric-grid-3">
          <div className="card stat-card">
            <div className="stat-icon"><Clock size={22} /></div>
            <div><div className="stat-value">12</div><div className="stat-label">Pending Approvals</div></div>
          </div>
          <div className="card stat-card">
            <div className="stat-icon"><UserPlus size={22} /></div>
            <div><div className="stat-value">45</div><div className="stat-label">Daily Check-ins</div></div>
          </div>
          <div className="card">
            <p className="section-kicker">AI Optimizer</p>
            <p className="section-subtitle">Dr. Sarah has a gap at 11:30 AM.</p>
            <button className="clinic-btn clinic-btn-primary btn-sm" style={{ marginTop: 10 }}>Fill Slot</button>
          </div>
        </section>

        <section className="card">
          <div className="section-header">
            <div>
              <h3 className="section-title"><Calendar size={18} color="var(--clr-primary-dark)" /> Today's Schedule</h3>
              <p className="section-subtitle">Confirmed and waiting appointments.</p>
            </div>
          </div>
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Time</th>
                  <th>Patient</th>
                  <th>Specialist</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {todayAppts.slice(0, 5).map((appointment) => (
                  <tr key={appointment.id}>
                    <td><strong>{appointment.time}</strong></td>
                    <td>{appointment.patient}</td>
                    <td className="muted">{appointment.doctor}</td>
                    <td>
                      {appointment.status === 'Confirmed' ? (
                        <span className="badge badge-success"><CheckCircle size={12} /> {appointment.status}</span>
                      ) : (
                        <span className="badge badge-warning"><Clock size={12} /> {appointment.status}</span>
                      )}
                    </td>
                    <td>
                      <div className="row-actions">
                        <button className="clinic-btn clinic-btn-primary btn-sm">Arrived</button>
                        <button className="clinic-btn clinic-btn-outline btn-sm">Edit</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </Layout>
  );
}
