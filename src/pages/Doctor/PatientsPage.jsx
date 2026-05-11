import React from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertCircle, Calendar, ChevronRight, Clock, Filter, Plus, Search } from 'lucide-react';
import Layout from '../../components/Layout';
import { useData } from '../../context/DataContext';

export default function PatientsPage() {
  const navigate = useNavigate();
  const { patients } = useData();

  return (
    <Layout pageTitle="Patients" pageSubtitle="Clinical directory and consultation queue.">
      <div className="page-stack animate-fadeIn">
        <section className="section-header">
          <div className="search-box">
            <Search size={18} />
            <input className="search-box-field" type="text" placeholder="Search by name, ID, or phone..." />
          </div>
          <div className="row-actions">
            <button className="clinic-btn clinic-btn-outline"><Filter size={16} /> Filters</button>
            <button className="clinic-btn clinic-btn-primary"><Plus size={16} /> New Patient</button>
          </div>
        </section>

        <section className="responsive-card-grid">
          {patients.map((patient) => (
            <article key={patient.id} className="card page-stack" style={{ gap: 14 }}>
              <div className="section-header" style={{ marginBottom: 0 }}>
                <div className="row-actions">
                  <div className="avatar-box">{patient.avatar || patient.name.charAt(0)}</div>
                  <div>
                    <h3 className="section-title">{patient.name}</h3>
                    <p className="section-subtitle">P-{patient.id.toString().padStart(4, '0')} - {patient.gender}</p>
                  </div>
                </div>
                <span className={`badge ${patient.status === 'Active' ? 'badge-success' : 'badge-warning'}`}>
                  {patient.status}
                </span>
              </div>

              <div className="page-stack" style={{ gap: 8 }}>
                <div className="row-actions muted"><Clock size={14} /> Age: <strong>{patient.age}y</strong></div>
                <div className="row-actions muted"><Calendar size={14} /> Last Visit: <strong>{patient.lastVisit}</strong></div>
              </div>

              <div>
                <p className="section-kicker">Condition</p>
                <p className="section-subtitle">{patient.condition}</p>
              </div>

              <button
                onClick={() => navigate(`/doctor/consultation/${patient.id}`, { state: { patient } })}
                className="clinic-btn clinic-btn-primary"
                style={{ width: '100%' }}
              >
                Start Consultation <ChevronRight size={16} />
              </button>
            </article>
          ))}
        </section>
      </div>
    </Layout>
  );
}
