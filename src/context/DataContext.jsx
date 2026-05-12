import React, { createContext, useContext, useState, useEffect } from 'react';

const DataContext = createContext();
const API_BASE = 'http://localhost:8000/api';

export function DataProvider({ children }) {
  const [patients, setPatients] = useState([]);
  const [appointments, setAppointments] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [records, setRecords] = useState([]);
  const [stats, setStats] = useState({
    totalPatients: { value: 0, change: 0, label: 'Total Patients' },
    todayAppts: { value: 0, change: 0, label: "Today's Appointments" },
    activeDoctors: { value: 0, change: 0, label: 'Active Doctors' },
    bedOccupancy: { value: '0%', change: 0, label: 'Bed Occupancy' },
    revenue: { value: '$0', change: 0, label: 'Monthly Revenue' },
  });

  const fetchBackendData = async () => {
    try {
      const token = localStorage.getItem('clinic_token');
      const headers = {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      };

      const [pRes, aRes, dRes, rRes, sRes] = await Promise.all([
        fetch(`${API_BASE}/patients`, { headers }),
        fetch(`${API_BASE}/appointments`, { headers }),
        fetch(`${API_BASE}/doctors`, { headers }),
        fetch(`${API_BASE}/records`, { headers }),
        fetch(`${API_BASE}/dashboard`, { headers })
      ]);

      if (pRes.ok) setPatients(await pRes.json());
      if (aRes.ok) setAppointments(await aRes.json());
      if (dRes.ok) setDoctors(await dRes.json());
      if (rRes.ok) setRecords(await rRes.json());
      if (sRes.ok) {
        const statsData = await sRes.json();
        setStats({
          totalPatients: { value: statsData.totalPatients, change: 0, label: 'Total Patients' },
          todayAppts: { value: statsData.todayAppointments, change: 0, label: "Today's Appointments" },
          activeDoctors: { value: doctors.length || 0, change: 0, label: 'Active Doctors' },
          bedOccupancy: { value: '76%', change: 0, label: 'Bed Occupancy' },
          revenue: { value: '$84.2K', change: 0, label: 'Monthly Revenue' },
        });
      }
    } catch (err) {
      console.error('Error fetching data from backend:', err);
    }
  };

  useEffect(() => {
    fetchBackendData();
  }, []);

  const addPatient = async (patient) => {
    try {
      const token = localStorage.getItem('clinic_token');
      const response = await fetch(`${API_BASE}/patients`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(patient)
      });
      if (response.ok) {
        const newPatient = await response.json();
        setPatients(prev => [...prev, newPatient]);
        return newPatient;
      }
    } catch (err) {
      console.error(err);
    }
    return null;
  };

  const deletePatient = async (id) => {
    try {
      const token = localStorage.getItem('clinic_token');
      const response = await fetch(`${API_BASE}/patients/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (response.ok) {
        setPatients(prev => prev.filter(p => p.id !== id));
      }
    } catch (err) {
      console.error(err);
    }
  };

  const addAppointment = async (appt) => {
    try {
      const token = localStorage.getItem('clinic_token');
      const response = await fetch(`${API_BASE}/appointments`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(appt)
      });
      if (response.ok) {
        const newAppt = await response.json();
        setAppointments(prev => [...prev, newAppt]);
        return newAppt;
      }
    } catch (err) {
      console.error(err);
    }
    return null;
  };

  const updateAppointmentStatus = async (id, status) => {
    try {
      const token = localStorage.getItem('clinic_token');
      const response = await fetch(`${API_BASE}/appointments/${id}/status`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ status })
      });
      if (response.ok) {
        setAppointments(prev => prev.map(a => a.id === id ? { ...a, status } : a));
      }
    } catch (err) {
      console.error(err);
    }
  };

  const deleteAppointment = async (id) => {
    try {
      const token = localStorage.getItem('clinic_token');
      const response = await fetch(`${API_BASE}/appointments/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (response.ok) {
        setAppointments(prev => prev.filter(a => a.id !== id));
      }
    } catch (err) {
      console.error(err);
    }
  };

  const updateAppointment = async (id, updates) => {
    // Optimistic UI
    setAppointments(prev => prev.map(a => a.id === id ? { ...a, ...updates } : a));
    try {
      const token = localStorage.getItem('clinic_token');
      const response = await fetch(`${API_BASE}/appointments/${id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(updates)
      });
      if (response.ok) {
        const updated = await response.json();
        setAppointments(prev => prev.map(a => a.id === id ? { ...a, ...updated } : a));
        return updated;
      }
    } catch (err) {
      console.error('Error updating appointment:', err);
    }
    return null;
  };

  const completeAppointmentByPatient = async (patientId) => {
    // 1. Update Local State (Optimistic UI)
    setAppointments(prev => prev.map(a => 
      a.patient_id === parseInt(patientId) && a.status !== 'Completed' 
        ? { ...a, status: 'Completed' } 
        : a
    ));

    // 2. Sync with Backend
    try {
      const token = localStorage.getItem('clinic_token');
      const response = await fetch(`${API_BASE}/appointments/finish-by-patient/${patientId}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (!response.ok) console.warn("Backend sync for appointment completion failed.");
    } catch (err) {
      console.error("API Error finishing appointment:", err);
    }
  };

  const value = {
    patients,
    appointments,
    doctors,
    records,
    stats,
    addPatient,
    deletePatient,
    addAppointment,
    updateAppointment,
    updateAppointmentStatus,
    deleteAppointment,
    completeAppointmentByPatient,
    refreshData: fetchBackendData
  };

  return (
    <DataContext.Provider value={value}>
      {children}
    </DataContext.Provider>
  );
}

export const useData = () => {
  const context = useContext(DataContext);
  if (!context) throw new Error('useData must be used within DataProvider');
  return context;
};
