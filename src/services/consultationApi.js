/**
 * Consultation API Service
 * Handles communication with the real clinical backend.
 */

const BASE_URL = 'http://localhost:8000/api';

/**
 * Enterprise Helper: Get Auth Header
 */
const getAuthHeaders = () => {
  const token = localStorage.getItem('clinic_token');
  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  };
};

/**
 * Fetches consultation data for a specific patient.
 * @param {string} patientId 
 */
export const fetchConsultation = async (patientId) => {
  try {
    const response = await fetch(`${BASE_URL}/consultations/${patientId}`, {
      headers: getAuthHeaders()
    });
    if (!response.ok) {
      if (response.status === 404) return null;
      if (response.status === 401) throw new Error("Unauthorized: Please login again.");
      throw new Error(`Server returned ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    console.error(`[API] fetchConsultation failed:`, error);
    throw error;
  }
};

/**
 * Initializes or saves a full consultation record.
 * @param {string} patientId 
 * @param {Object} toothData 
 * @param {number} version - ENTERPRISE: Optimistic locking version
 */
export const saveConsultationToApi = async (patientId, toothData, version = 1) => {
  try {
    const response = await fetch(`${BASE_URL}/consultations/${patientId}`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ toothData, version })
    });
    if (response.status === 409) throw new Error("CONFLICT: Another doctor has updated this record. Please refresh.");
    if (!response.ok) throw new Error(`Save failed with ${response.status}`);
    return await response.json();
  } catch (error) {
    console.error(`[API] saveConsultationToApi failed:`, error);
    throw error;
  }
};

/**
 * Updates a single tooth record via API.
 * @param {string} patientId 
 * @param {string} toothId 
 * @param {Object} updates 
 * @param {number} version - ENTERPRISE: Optimistic locking version
 */
export const updateToothOnApi = async (patientId, toothId, updates, version = 1) => {
  try {
    const response = await fetch(`${BASE_URL}/consultations/${patientId}/tooth/${toothId}`, {
      method: 'PATCH',
      headers: getAuthHeaders(),
      body: JSON.stringify({ updates, version })
    });
    if (response.status === 409) throw new Error("CONFLICT: Tooth record was modified. Please refresh.");
    if (!response.ok) throw new Error(`Update failed with ${response.status}`);
    return await response.json();
  } catch (error) {
    console.error(`[API] updateToothOnApi failed:`, error);
    throw error;
  }
};
