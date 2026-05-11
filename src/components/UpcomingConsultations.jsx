import React, { useState, useEffect } from 'react';
import { ChevronRight, Clock } from 'lucide-react';
import { Link } from 'react-router-dom';

const API_BASE = 'http://localhost:8000';

export default function UpcomingConsultations() {
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentTime, setCurrentTime] = useState(new Date());

  // Update time every second
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Fetch appointments
  useEffect(() => {
    const fetchAppointments = async () => {
      try {
        setLoading(true);
        const res = await fetch(`${API_BASE}/appointments/today`);
        if (!res.ok) throw new Error('Failed to fetch appointments');
        const data = await res.json();
        setAppointments(data);
        setError(null);
      } catch (err) {
        console.error('Fetch error:', err);
        setError('Could not load today\'s appointments. Please try again later.');
      } finally {
        setLoading(false);
      }
    };
    fetchAppointments();
  }, []);

  const formatDate = (date) => {
    return new Intl.DateTimeFormat('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }).format(date);
  };

  const getStatusBadgeStyle = (status) => {
    const s = status?.toLowerCase();
    if (s === 'completed') return { backgroundColor: '#d4edda', color: '#155724', padding: '4px 8px', borderRadius: '4px', fontSize: '0.8rem', fontWeight: 'bold' };
    if (s === 'cancelled') return { backgroundColor: '#f8d7da', color: '#721c24', padding: '4px 8px', borderRadius: '4px', fontSize: '0.8rem', fontWeight: 'bold' };
    // Default to Scheduled (blue) for Pending or Scheduled
    return { backgroundColor: '#cce5ff', color: '#004085', padding: '4px 8px', borderRadius: '4px', fontSize: '0.8rem', fontWeight: 'bold' };
  };

  const getTimeStatus = (apptTimeStr) => {
    const now = new Date();
    const currentMinutes = now.getHours() * 60 + now.getMinutes();
    
    const [hours, minutes] = apptTimeStr.split(':').map(Number);
    const apptMinutes = hours * 60 + minutes;

    if (apptMinutes < currentMinutes - 30) {
      return { label: 'Past', color: '#6c757d' };
    } else if (apptMinutes >= currentMinutes - 30 && apptMinutes <= currentMinutes + 30) {
      return { label: 'Now', color: '#28a745' };
    } else {
      return { label: 'Upcoming', color: '#007bff' };
    }
  };

  return (
    <div className="card" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div className="section-header" style={{ borderBottom: '1px solid #eaeaea', paddingBottom: '16px', marginBottom: '16px' }}>
        <div>
          <h3 className="section-title">Upcoming Consultations</h3>
          <p className="section-subtitle">{formatDate(currentTime)}</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '1.2rem', fontWeight: 'bold', color: 'var(--clr-primary-dark, #2c3e50)' }}>
          <Clock size={20} />
          {currentTime.toLocaleTimeString()}
        </div>
      </div>

      <div className="appointments-list" style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        {loading && (
          <div style={{ padding: '32px', textAlign: 'center', color: '#666' }}>
            Loading appointments...
          </div>
        )}
        
        {error && (
          <div style={{ padding: '16px', background: '#ffebee', color: '#c62828', borderRadius: '8px', textAlign: 'center' }}>
            {error}
          </div>
        )}
        
        {!loading && !error && appointments.length === 0 && (
          <div style={{ padding: '48px 32px', textAlign: 'center', color: '#888', background: '#f9f9f9', borderRadius: '8px' }}>
            No consultations today
          </div>
        )}

        {!loading && !error && appointments.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {appointments.map((appt) => {
              const timeStatus = getTimeStatus(appt.time);
              return (
                <div key={appt.id} style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'space-between', 
                  padding: '16px', 
                  border: '1px solid #eaeaea', 
                  borderRadius: '8px',
                  background: '#ffffff',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.02)'
                }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <strong style={{ fontSize: '1.1rem', color: '#333' }}>{appt.time}</strong>
                      <span style={{ 
                        fontSize: '0.75rem', 
                        padding: '3px 8px', 
                        borderRadius: '12px', 
                        backgroundColor: timeStatus.color, 
                        color: 'white',
                        fontWeight: '600'
                      }}>
                        {timeStatus.label}
                      </span>
                    </div>
                    <div style={{ fontSize: '1.05rem', fontWeight: '600', color: '#111' }}>
                      {appt.patient_name}
                    </div>
                    <div style={{ fontSize: '0.85rem', color: '#666' }}>
                      Type: {appt.type}
                    </div>
                  </div>
                  
                  <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                    <span style={getStatusBadgeStyle(appt.status)}>
                      {appt.status === 'Pending' ? 'Scheduled' : appt.status}
                    </span>
                    <Link
                      to={`/doctor/consultation/${appt.patient_id}`}
                      state={{ patient: { id: appt.patient_id, name: appt.patient_name } }}
                      className="clinic-btn clinic-btn-primary btn-sm"
                      style={{ display: 'flex', alignItems: 'center', gap: '4px' }}
                    >
                      Open <ChevronRight size={16} />
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
