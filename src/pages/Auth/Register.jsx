import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import AuthShell from '../../components/AuthShell';
import { ArrowLeft, ArrowRight, Building2, Lock, Mail, Stethoscope, User, UserPlus } from 'lucide-react';

export default function Register() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    role: 'doctor',
    password: '',
    confirmPassword: ''
  });
  const navigate = useNavigate();

  const updateField = (field, value) => {
    setFormData((current) => ({ ...current, [field]: value }));
  };

  const handleRegister = (e) => {
    e.preventDefault();
    navigate('/login');
  };

  return (
    <AuthShell
      kicker="New workspace"
      title="Bring a new clinic profile online in minutes."
      description="Create a secure account with role-based access and a clean first session for every member of the care team."
    >
      <div className="auth-card">
        <Link to="/login" className="auth-back-link">
          <ArrowLeft size={16} /> Back to login
        </Link>

        <div className="auth-card-header">
          <div>
            <p className="auth-kicker">Get started</p>
            <h2>Create account</h2>
          </div>
          <span className="auth-form-icon">
            <UserPlus size={24} />
          </span>
        </div>

        <form onSubmit={handleRegister} className="auth-form">
          <div className="form-group">
            <label className="form-label" htmlFor="register-name">Full name</label>
            <div className="input-with-icon">
              <User size={18} />
              <input
                id="register-name"
                type="text"
                required
                className="form-input"
                placeholder="Dr. Jane Smith"
                value={formData.name}
                onChange={(e) => updateField('name', e.target.value)}
              />
            </div>
          </div>

          <div className="auth-form-grid">
            <div className="form-group">
              <label className="form-label" htmlFor="register-email">Email address</label>
              <div className="input-with-icon">
                <Mail size={18} />
                <input
                  id="register-email"
                  type="email"
                  required
                  className="form-input"
                  placeholder="jane@clinic.com"
                  value={formData.email}
                  onChange={(e) => updateField('email', e.target.value)}
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="register-role">Primary role</label>
              <div className="input-with-icon">
                {formData.role === 'doctor' ? <Stethoscope size={18} /> : <Building2 size={18} />}
                <select
                  id="register-role"
                  className="form-input"
                  value={formData.role}
                  onChange={(e) => updateField('role', e.target.value)}
                >
                  <option value="doctor">Doctor</option>
                  <option value="admin">Admin</option>
                  <option value="receptionist">Receptionist</option>
                  <option value="patient">Patient</option>
                </select>
              </div>
            </div>
          </div>

          <div className="auth-form-grid">
            <div className="form-group">
              <label className="form-label" htmlFor="register-password">Password</label>
              <div className="input-with-icon">
                <Lock size={18} />
                <input
                  id="register-password"
                  type="password"
                  required
                  className="form-input"
                  placeholder="Create password"
                  value={formData.password}
                  onChange={(e) => updateField('password', e.target.value)}
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="register-confirm">Confirm</label>
              <div className="input-with-icon">
                <Lock size={18} />
                <input
                  id="register-confirm"
                  type="password"
                  required
                  className="form-input"
                  placeholder="Repeat password"
                  value={formData.confirmPassword}
                  onChange={(e) => updateField('confirmPassword', e.target.value)}
                />
              </div>
            </div>
          </div>

          <div className="auth-agreement">
            <span />
            <p>Your workspace will use clinic-level access rules after approval.</p>
          </div>

          <button type="submit" className="btn btn-primary auth-submit">
            Create secure account <ArrowRight size={18} />
          </button>

          <p className="auth-switch">
            Already registered? <Link to="/login">Sign in</Link>
          </p>
        </form>
      </div>
    </AuthShell>
  );
}
