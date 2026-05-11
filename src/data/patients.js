/**
 * Clinical Patients Database (Mock)
 * High-fidelity data for clinical simulations.
 */

export const PATIENTS = [
  {
    id: 'P-2025-00123',
    fullName: 'Ahmed Hassan',
    initials: 'AH',
    gender: 'Male',
    age: 29,
    phone: '+20 123 456 7890',
    email: 'ahmed.hassan@example.com',
    visitReason: 'Severe tooth pain in upper left quadrant, localized to #14',
    lastVisit: '25 Apr 2026',
    medicalAlerts: ['High Blood Pressure', 'G6PD Deficiency'],
    medicalHistory: ['Hypertension controlled by medication'],
    dentalHistory: ['Root Canal Treatment on #24 (2023)', 'Orthodontic treatment (2018-2020)'],
    allergies: ['Penicillin', 'Sulfa drugs'],
    currentStatus: 'Awaiting Consultation',
    assignedDentist: 'Dr. Sarah Jenkins',
    bloodType: 'O+',
    notes: 'Patient reports anxiety during dental procedures. Requires extra numbing.'
  },
  {
    id: 'P-2025-00456',
    fullName: 'Sara Mohamed',
    initials: 'SM',
    gender: 'Female',
    age: 34,
    phone: '+20 111 222 3333',
    email: 'sara.m@example.com',
    visitReason: 'Gingival bleeding during brushing, persistent bad breath',
    lastVisit: '10 Mar 2026',
    medicalAlerts: ['Pregnant (2nd Trimester)'],
    medicalHistory: ['No systemic diseases'],
    dentalHistory: ['Composite fillings on #16, #46'],
    allergies: ['Latex (Mild)'],
    currentStatus: 'In Progress',
    assignedDentist: 'Dr. Ahmed Refaat',
    bloodType: 'A-',
    notes: 'Currently in 2nd trimester of pregnancy. Avoid x-rays if possible.'
  },
  {
    id: 'P-2025-00789',
    fullName: 'John Doe',
    initials: 'JD',
    gender: 'Male',
    age: 42,
    phone: '+20 555 666 7777',
    email: 'john.doe@example.com',
    visitReason: 'Routine check-up and cleaning',
    lastVisit: '15 Jan 2024',
    medicalAlerts: ['Type 2 Diabetes'],
    medicalHistory: ['Metformin therapy'],
    dentalHistory: ['Healthy dentition, occasional scaling'],
    allergies: ['None'],
    currentStatus: 'Awaiting Consultation',
    assignedDentist: 'Dr. Sarah Jenkins',
    bloodType: 'B+',
    notes: 'Diabetic patient. Ensure morning appointments and check blood sugar history.'
  }
];

export const getPatientById = (id) => PATIENTS.find(p => p.id === id);
