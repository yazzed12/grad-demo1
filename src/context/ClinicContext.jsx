import React, { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from './AuthContext';

const ClinicContext = createContext();

export function ClinicProvider({ children }) {
  const { user } = useAuth();
  const [clinicSettings, setClinicSettings] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchClinicSettings = async () => {
    try {
      const token = localStorage.getItem('clinic_token');
      if (!token) {
        setLoading(false);
        return;
      }
      
      const response = await fetch('http://localhost:8000/api/settings/clinic', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (!response.ok) {
        // Receptionist might get 403, which is fine, just leave it null
        if (response.status === 403) {
           setClinicSettings(null);
        }
        throw new Error('Could not fetch clinic settings');
      }
      
      const data = await response.json();
      setClinicSettings(data);
    } catch (err) {
      console.error("Clinic settings error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Only try to fetch if user is admin or doctor
    if (user && (user.role === 'admin' || user.role === 'doctor')) {
      fetchClinicSettings();
    } else {
      setLoading(false);
    }
  }, [user]);

  const updateClinicSettings = async (newData) => {
    try {
      const token = localStorage.getItem('clinic_token');
      const response = await fetch('http://localhost:8000/api/settings/clinic', {
        method: 'PUT',
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(newData)
      });

      if (!response.ok) throw new Error('Failed to update clinic settings');
      
      const data = await response.json();
      setClinicSettings(data);
      return { success: true };
    } catch (err) {
      console.error("Update clinic settings error:", err);
      return { success: false, error: err.message };
    }
  };

  return (
    <ClinicContext.Provider value={{ clinicSettings, updateClinicSettings, loading, refreshClinicSettings: fetchClinicSettings }}>
      {children}
    </ClinicContext.Provider>
  );
}

export const useClinic = () => useContext(ClinicContext);
