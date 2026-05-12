import React, { useState, useEffect, useMemo } from 'react';
import { ChevronRight, Clock, CheckCircle, Calendar, AlertCircle, Stethoscope, Loader2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useData } from '../context/DataContext';

export default function UpcomingConsultations() {
  const { appointments, completeAppointmentByPatient } = useData();
  const [currentTime, setCurrentTime] = useState(new Date());
  const [finishingIds, setFinishingIds] = useState(new Set());

  // Update time every second
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Filter today's non-completed appointments
  const todayStr = new Date().toISOString().split('T')[0];
  const todayAppointments = useMemo(() => {
    return appointments
      .filter(a => a.date === todayStr && a.status !== 'Completed')
      .sort((a, b) => (a.time || '').localeCompare(b.time || ''));
  }, [appointments, todayStr]);

  const completedToday = useMemo(() => {
    return appointments.filter(a => a.date === todayStr && a.status === 'Completed').length;
  }, [appointments, todayStr]);

  const formatDate = (date) => {
    return new Intl.DateTimeFormat('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }).format(date);
  };

  const getTimeStatus = (apptTimeStr) => {
    if (!apptTimeStr) return { label: 'Scheduled', color: 'var(--clr-primary)' };
    const now = new Date();
    const currentMinutes = now.getHours() * 60 + now.getMinutes();
    const parts = apptTimeStr.split(':');
    const hours = parseInt(parts[0], 10);
    const minutes = parseInt(parts[1], 10);
    if (isNaN(hours) || isNaN(minutes)) return { label: 'Scheduled', color: 'var(--clr-primary)' };
    const apptMinutes = hours * 60 + minutes;

    if (apptMinutes < currentMinutes - 30) {
      return { label: 'Overdue', color: 'var(--clr-warning)' };
    } else if (apptMinutes >= currentMinutes - 15 && apptMinutes <= currentMinutes + 15) {
      return { label: 'Now', color: 'var(--clr-primary)' };
    } else {
      return { label: 'Upcoming', color: 'var(--clr-subtext)' };
    }
  };

  const handleFinish = async (patientId, apptId) => {
    setFinishingIds(prev => new Set([...prev, apptId]));
    try {
      await completeAppointmentByPatient(patientId);
    } catch (err) {
      console.error('Failed to finish appointment:', err);
    } finally {
      setFinishingIds(prev => {
        const next = new Set(prev);
        next.delete(apptId);
        return next;
      });
    }
  };

  return (
    <div className="card" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Header */}
      <div className="section-header" style={{ borderBottom: '1px solid var(--clr-border)', paddingBottom: 16, marginBottom: 16 }}>
        <div>
          <h3 className="section-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Stethoscope size={18} color="var(--clr-primary-dark)" />
            Today's Consultations
          </h3>
          <p className="section-subtitle">{formatDate(currentTime)}</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span className="badge badge-success" style={{ fontSize: '0.72rem' }}>
              <CheckCircle size={12} /> {completedToday} done
            </span>
            <span className="badge badge-warning" style={{ fontSize: '0.72rem' }}>
              <Clock size={12} /> {todayAppointments.length} pending
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '1.1rem', fontWeight: 800, color: 'var(--clr-text)' }}>
            <Clock size={18} color="var(--clr-primary)" />
            {currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </div>
        </div>
      </div>

      {/* Appointments List */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        {todayAppointments.length === 0 ? (
          <div style={{
            padding: '48px 32px',
            textAlign: 'center',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 12,
          }}>
            <div style={{
              width: 56, height: 56, borderRadius: 16,
              background: 'var(--clr-primary-light)',
              display: 'grid', placeItems: 'center'
            }}>
              <Calendar size={24} color="var(--clr-primary-dark)" />
            </div>
            <div>
              <div style={{ fontWeight: 800, fontSize: '0.95rem', color: 'var(--clr-text)' }}>
                {completedToday > 0 ? 'All consultations completed!' : 'No consultations scheduled'}
              </div>
              <div style={{ color: 'var(--clr-subtext)', fontSize: '0.84rem', marginTop: 4 }}>
                {completedToday > 0
                  ? `You've completed ${completedToday} session${completedToday > 1 ? 's' : ''} today.`
                  : 'Your schedule for today is clear.'}
              </div>
            </div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {todayAppointments.map((appt) => {
              const timeStatus = getTimeStatus(appt.time);
              const isFinishing = finishingIds.has(appt.id);
              const patientName = appt.patient || appt.patient_name || 'Unknown';
              const patientInitials = patientName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);

              return (
                <div
                  key={appt.id}
                  className="consultation-row"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '14px 16px',
                    border: '1px solid var(--clr-border)',
                    borderRadius: 10,
                    background: 'var(--clr-card)',
                    transition: 'all 0.2s ease',
                  }}
                >
                  {/* Left: Patient Info */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, flex: 1, minWidth: 0 }}>
                    <div className="avatar" style={{ width: 38, height: 38, fontSize: '0.78rem' }}>
                      {patientInitials}
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontWeight: 800, fontSize: '0.92rem', color: 'var(--clr-text)' }}>
                        {patientName}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 3 }}>
                        <span style={{ fontSize: '0.78rem', color: 'var(--clr-subtext)', fontWeight: 700 }}>
                          {appt.time || '—'}
                        </span>
                        <span style={{
                          fontSize: '0.65rem',
                          fontWeight: 800,
                          padding: '2px 8px',
                          borderRadius: 999,
                          background: timeStatus.label === 'Now' ? 'var(--clr-primary-light)' : timeStatus.label === 'Overdue' ? 'rgba(245, 158, 11, 0.12)' : 'var(--clr-bg)',
                          color: timeStatus.color,
                          textTransform: 'uppercase',
                        }}>
                          {timeStatus.label}
                        </span>
                        {appt.type && (
                          <span style={{ fontSize: '0.75rem', color: 'var(--clr-text-light)' }}>
                            • {appt.type}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Right: Actions */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                    <button
                      className="btn btn-sm"
                      onClick={() => handleFinish(appt.patient_id, appt.id)}
                      disabled={isFinishing}
                      style={{
                        background: 'transparent',
                        border: '1px solid var(--clr-border)',
                        color: isFinishing ? 'var(--clr-text-light)' : 'var(--clr-primary-dark)',
                        fontWeight: 800,
                        gap: 4,
                      }}
                    >
                      {isFinishing ? <Loader2 size={13} className="animate-spin" /> : <CheckCircle size={13} />}
                      {isFinishing ? 'Finishing…' : 'Finish'}
                    </button>
                    <Link
                      to={`/doctor/consultation/${appt.patient_id}`}
                      state={{ patient: { id: appt.patient_id, name: patientName } }}
                      className="btn btn-primary btn-sm"
                      style={{ gap: 4 }}
                    >
                      Open <ChevronRight size={14} />
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
