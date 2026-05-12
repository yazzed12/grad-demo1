/**
 * Report API Service — Handles AI report generation, humanization, and CRUD
 */
const API_BASE = 'http://localhost:8000/api';

function getHeaders() {
  const token = localStorage.getItem('clinic_token');
  return { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' };
}

/** Generate AI clinical report from consultation data */
export async function generateAIReport(data) {
  try {
    const res = await fetch(`${API_BASE}/ai/generate-report`, {
      method: 'POST', headers: getHeaders(), body: JSON.stringify(data)
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch (err) {
    console.error('AI Report API Error:', err);
    throw err;
  }
}

/** Humanize a medical report into patient-friendly language */
export async function humanizeReport(report, patientName) {
  try {
    const res = await fetch(`${API_BASE}/ai/humanize-report`, {
      method: 'POST', headers: getHeaders(),
      body: JSON.stringify({ report, patient_name: patientName })
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch (err) {
    console.error('Humanize API Error:', err);
    throw err;
  }
}

/** Save finalized report to database */
export async function saveReport(reportData) {
  try {
    const res = await fetch(`${API_BASE}/reports`, {
      method: 'POST', headers: getHeaders(), body: JSON.stringify(reportData)
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch (err) {
    console.error('Save Report Error:', err);
    throw err;
  }
}

/** Get all reports for a patient */
export async function getPatientReports(patientId) {
  try {
    const res = await fetch(`${API_BASE}/reports/patient/${patientId}`, { headers: getHeaders() });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch (err) {
    console.error('Get Reports Error:', err);
    return [];
  }
}

/** Update an existing report */
export async function updateReport(reportId, updates) {
  try {
    const res = await fetch(`${API_BASE}/reports/${reportId}`, {
      method: 'PUT', headers: getHeaders(), body: JSON.stringify(updates)
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch (err) {
    console.error('Update Report Error:', err);
    throw err;
  }
}
