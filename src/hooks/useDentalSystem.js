import { useState, useCallback, useEffect, useRef } from 'react';
import { INITIAL_CLINICAL_STATE, FDI_TOOTH_MAP } from '../data/toothData';
import { loadConsultation, saveConsultation } from '../services/consultationStorage';
import { fetchConsultation, updateToothOnApi, saveConsultationToApi } from '../services/consultationApi';

/**
 * Business Logic Layer: Dental System State Management
 * Now supports Real Backend Persistence with LocalStorage Fallback.
 */
export const useDentalSystem = (patientId = 'D-DEFAULT') => {
  const [toothData, setToothData] = useState(INITIAL_CLINICAL_STATE);
  const [selectedToothId, setSelectedToothId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [persistenceMode, setPersistenceMode] = useState('local'); // 'api' | 'local'
  const [version, setVersion] = useState(1); // ENTERPRISE: Optimistic Locking Version

  // INITIALIZATION: Load from API (Priority) or LocalStorage (Fallback)
  useEffect(() => {
    async function initData() {
      setLoading(true);
      setError(null);
      try {
        // 1. Try Real Backend
        const apiData = await fetchConsultation(patientId);
        
        // If we got a response (even if it's empty/new patient), we are in API mode
        setPersistenceMode('api');
        
        if (apiData && apiData.toothData) {
          setToothData({ ...INITIAL_CLINICAL_STATE, ...apiData.toothData });
          setVersion(apiData.version || 1); // Sync version
        } else {
          // If patient doesn't exist on server, try to migrate from local or use initial
          const localData = loadConsultation(patientId);
          if (localData) {
            setToothData({ ...INITIAL_CLINICAL_STATE, ...localData.toothData });
            await saveConsultationToApi(patientId, localData.toothData, 1);
          } else {
            await saveConsultationToApi(patientId, INITIAL_CLINICAL_STATE, 1);
          }
        }
      } catch (err) {
        console.warn("Backend unavailable, using LocalStorage fallback", err);
        // 2. Force LocalStorage fallback on network error
        setPersistenceMode('local');
        const localData = loadConsultation(patientId);
        if (localData) {
          setToothData({ ...INITIAL_CLINICAL_STATE, ...localData.toothData });
        }
      } finally {
        setLoading(false);
      }
    }
    initData();
  }, [patientId]);

  // Select a tooth by its FDI ID
  const selectTooth = useCallback((id) => {
    const sId = id?.toString();
    if (sId && FDI_TOOTH_MAP[sId]) {
      setSelectedToothId(sId);
    } else {
      setSelectedToothId(null);
    }
  }, []);

  const lastSavedData = useRef(JSON.stringify(toothData));

  // ENTERPRISE: Debounced Autosave Effect with VERSIONING
  useEffect(() => {
    if (persistenceMode !== 'api' || loading) return;

    // Avoid syncing if data hasn't changed since last successful save
    if (JSON.stringify(toothData) === lastSavedData.current) {
      return;
    }

    const timer = setTimeout(async () => {
      try {
        console.log("[Enterprise] Syncing clinical state (Version:", version, ")...");
        const result = await saveConsultationToApi(patientId, toothData, version);
        
        if (result && result.version) {
          lastSavedData.current = JSON.stringify(toothData);
          setVersion(result.version); // Sync version with backend
        }
      } catch (err) {
        console.error("Enterprise sync failed:", err);
        if (err.message.includes("CONFLICT")) {
          // Only show error if the data is actually different from what's on server
          setError("VERSION_CONFLICT: Changes were made elsewhere. Please refresh.");
        } else {
          setPersistenceMode('local');
        }
      }
    }, 1000); // Slightly longer debounce for stability

    return () => clearTimeout(timer);
  }, [toothData, patientId, persistenceMode, loading, version]);

  // Update clinical status (Immediate UI Update)
  const updateToothStatus = useCallback((id, status) => {
    if (!id) return;
    
    const newEntry = { 
      type: 'Status Change', 
      date: new Date().toISOString(), 
      note: `Status updated to ${status}` 
    };

    setToothData(prev => ({
      ...prev,
      [id]: {
        ...prev[id],
        status,
        history: [...(prev[id].history || []), newEntry]
      }
    }));
  }, []);

  // Bulk update tooth record (Immediate UI Update)
  const updateToothRecord = useCallback((id, updates) => {
    if (!id) return;

    const newEntry = { 
      type: 'Record Update', 
      date: new Date().toISOString(), 
      note: updates.notes || 'Clinical record updated.' 
    };

    setToothData(prev => ({
      ...prev,
      [id]: { 
        ...prev[id], 
        ...updates,
        history: [...(prev[id].history || []), newEntry]
      }
    }));
  }, []);

  // Manual Note Update (Immediate UI Update)
  const updateToothNotes = useCallback((id, notes) => {
    if (!id) return;
    setToothData(prev => ({ 
      ...prev, 
      [id]: { ...prev[id], notes } 
    }));
  }, []);

  const resetSystem = useCallback(async () => {
    setToothData(INITIAL_CLINICAL_STATE);
    setSelectedToothId(null);
    saveConsultation(patientId, INITIAL_CLINICAL_STATE);
    try {
      if (persistenceMode === 'api') {
        await saveConsultationToApi(patientId, INITIAL_CLINICAL_STATE);
      }
    } catch {
      console.warn("Failed to reset consultation on API.");
    }
  }, [patientId, persistenceMode]);

  return {
    toothData,
    selectedToothId,
    selectedToothData: selectedToothId ? toothData[selectedToothId] : null,
    selectTooth,
    updateToothStatus,
    updateToothNotes,
    updateToothRecord,
    resetSystem,
    loading,
    error,
    persistenceMode
  };
};
