import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { DataProvider } from './context/DataContext';
import './index.css';

// Layouts
import Layout from './components/Layout';

// Pages
import Login from './pages/Auth/Login';
import Register from './pages/Auth/Register';
import ForgotPassword from './pages/Auth/ForgotPassword';
import ResetPassword from './pages/Auth/ResetPassword';
import AdminDashboard from './pages/Admin/AdminDashboard';
import DoctorDashboard from './pages/Doctor/DoctorDashboard';
import ConsultationFlow from './pages/Doctor/ConsultationFlow';
import ReceptionDashboard from './pages/Receptionist/ReceptionDashboard';
import PatientDashboard from './pages/Patient/PatientDashboard';
import Patients from './pages/Doctor/PatientsPage';
import Appointments from './pages/Appointments';
import Doctors from './pages/Doctors';
import Records from './pages/Records';
import Billing from './pages/Billing';

const ProtectedRoute = ({ children, allowedRoles }) => {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  if (allowedRoles && !allowedRoles.includes(user.role)) return <Navigate to="/" replace />;
  
  return children;
};

const RootRedirect = () => {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  if (user.role === 'admin') return <Navigate to="/admin" replace />;
  if (user.role === 'doctor') return <Navigate to="/doctor" replace />;
  if (user.role === 'receptionist') return <Navigate to="/receptionist" replace />;
  if (user.role === 'patient') return <Navigate to="/patient" replace />;
  return <Navigate to="/login" replace />;
};

export default function App() {
  return (
    <DataProvider>
      <AuthProvider>
        <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          
          <Route path="/" element={<RootRedirect />} />

          {/* Admin Routes */}
          <Route path="/admin" element={
            <ProtectedRoute allowedRoles={['admin']}>
              <AdminDashboard />
            </ProtectedRoute>
          } />

          {/* Doctor Routes */}
          <Route path="/doctor" element={
            <ProtectedRoute allowedRoles={['doctor']}>
              <DoctorDashboard />
            </ProtectedRoute>
          } />
          <Route path="/doctor/consultation/:id" element={
            <ProtectedRoute allowedRoles={['doctor']}>
              <ConsultationFlow />
            </ProtectedRoute>
          } />

          {/* Receptionist Routes */}
          <Route path="/receptionist" element={
            <ProtectedRoute allowedRoles={['receptionist']}>
              <ReceptionDashboard />
            </ProtectedRoute>
          } />

          {/* Shared / Specific Sub-pages */}
          <Route path="/admin/doctors" element={<ProtectedRoute allowedRoles={['admin']}><Doctors /></ProtectedRoute>} />
          <Route path="/doctor/patients" element={<ProtectedRoute allowedRoles={['doctor']}><Patients /></ProtectedRoute>} />
          <Route path="/doctor/appointments" element={<ProtectedRoute allowedRoles={['doctor']}><Appointments /></ProtectedRoute>} />
          <Route path="/receptionist/patients" element={<ProtectedRoute allowedRoles={['receptionist']}><Patients /></ProtectedRoute>} />
          <Route path="/receptionist/calendar" element={<ProtectedRoute allowedRoles={['receptionist']}><Appointments /></ProtectedRoute>} />
          <Route path="/patient/records" element={<ProtectedRoute allowedRoles={['patient']}><Records /></ProtectedRoute>} />
          <Route path="/patient/appointments" element={<ProtectedRoute allowedRoles={['patient']}><Appointments /></ProtectedRoute>} />

          {/* Patient Routes */}
          <Route path="/patient" element={
            <ProtectedRoute allowedRoles={['patient']}>
              <PatientDashboard />
            </ProtectedRoute>
          } />

          {/* Catch-all */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
    </DataProvider>
  );
}
