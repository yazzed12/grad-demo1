import React, { createContext, useContext, useState, useEffect } from 'react';

const DataContext = createContext();
const API_BASE = 'http://localhost:8000/api';

export function DataProvider({ children }) {
  const [patients, setPatients] = useState([]);
  const [appointments, setAppointments] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [receptionists, setReceptionists] = useState([]);
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

      const [pRes, aRes, dRes, recRes, rRes, sRes] = await Promise.all([
        fetch(`${API_BASE}/patients`, { headers }),
        fetch(`${API_BASE}/appointments`, { headers }),
        fetch(`${API_BASE}/doctors`, { headers }),
        fetch(`${API_BASE}/receptionists`, { headers }),
        fetch(`${API_BASE}/records`, { headers }),
        fetch(`${API_BASE}/dashboard`, { headers })
      ]);

      const [pData, aData, dData, recData, rData, sData] = await Promise.all([
        pRes.ok ? pRes.json() : Promise.resolve([]),
        aRes.ok ? aRes.json() : Promise.resolve([]),
        dRes.ok ? dRes.json() : Promise.resolve([]),
        recRes.ok ? recRes.json() : Promise.resolve([]),
        rRes.ok ? rRes.json() : Promise.resolve([]),
        sRes.ok ? sRes.json() : Promise.resolve({})
      ]);

      if (pRes.ok) setPatients(pData);
      if (aRes.ok) setAppointments(aData);
      if (dRes.ok) setDoctors(dData);
      if (recRes.ok) setReceptionists(recData);
      if (rRes.ok) setRecords(rData);
      if (sRes.ok) {
        setStats({
          totalPatients: { value: sData.totalPatients || 0, change: 0, label: 'Total Patients' },
          todayAppts: { value: sData.todayAppointments || 0, change: 0, label: "Today's Appointments" },
          activeDoctors: { value: dData.length || 0, change: 0, label: 'Active Doctors' },
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
        const data = await response.json();
        setPatients(prev => prev.filter(p => p.id !== id));
        fetchBackendData(); // Refresh stats instantly
        return { success: true, action: data.action, message: data.message };
      } else {
        const err = await response.json();
        return { success: false, error: err.detail || 'Failed to remove patient' };
      }
    } catch (err) {
      console.error(err);
      return { success: false, error: 'Network error occurred' };
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
        fetchBackendData(); // Refreshes dashboard stats
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
        fetchBackendData();
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
        fetchBackendData();
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
        fetchBackendData();
        return updated;
      }
    } catch (err) {
      console.error('Error updating appointment:', err);
    }
    return null;
  };

  const fetchPatientById = async (id) => {
    try {
      const token = localStorage.getItem('clinic_token');
      const response = await fetch(`${API_BASE}/patients/${id}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        return await response.json();
      }
    } catch (err) {
      console.error('Error fetching patient by ID:', err);
    }
    return null;
  };

  const updatePatient = async (id, updates) => {
    setPatients(prev => prev.map(p => p.id === id ? { ...p, ...updates } : p));
    try {
      const token = localStorage.getItem('clinic_token');
      const response = await fetch(`${API_BASE}/patients/${id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(updates)
      });
      if (response.ok) {
        const result = await response.json();
        if (result.status === 'success') {
          setPatients(prev => prev.map(p => p.id === id ? { ...p, ...result.patient } : p));
          fetchBackendData();
          return result.patient;
        }
      }
    } catch (err) {
      console.error('Error updating patient:', err);
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
      else fetchBackendData();
    } catch (err) {
      console.error("API Error finishing appointment:", err);
    }
  };

  const addStaff = async (staffData) => {
    try {
      const token = localStorage.getItem('clinic_token');
      const response = await fetch(`${API_BASE}/staff`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(staffData)
      });
      if (response.ok) {
        fetchBackendData();
        return { success: true };
      } else {
        const err = await response.json();
        return { success: false, error: err.detail || 'Failed to add staff' };
      }
    } catch (err) {
      console.error(err);
      return { success: false, error: 'Network error' };
    }
  };

  const updateStaff = async (id, updates) => {
    try {
      const token = localStorage.getItem('clinic_token');
      const response = await fetch(`${API_BASE}/staff/${id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(updates)
      });
      if (response.ok) {
        fetchBackendData();
        return { success: true };
      } else {
        const err = await response.json();
        return { success: false, error: err.detail || 'Failed to update staff' };
      }
    } catch (err) {
      console.error(err);
      return { success: false, error: 'Network error' };
    }
  };

  const deleteStaff = async (id) => {
    try {
      const token = localStorage.getItem('clinic_token');
      const response = await fetch(`${API_BASE}/staff/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        fetchBackendData();
        return { success: true };
      }
    } catch (err) {
      console.error(err);
    }
    return { success: false };
  };

  const value = {
    patients,
    appointments,
    doctors,
    receptionists,
    records,
    stats,
    addPatient,
    fetchPatientById,
    updatePatient,
    deletePatient,
    addAppointment,
    updateAppointment,
    updateAppointmentStatus,
    deleteAppointment,
    completeAppointmentByPatient,
    addStaff,
    updateStaff,
    deleteStaff,
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
