import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import AuthShell from '../../components/AuthShell';
import { Activity, ArrowRight, Building, Eye, Lock, Mail, Stethoscope, Users } from 'lucide-react';

export default function Login() {
  const [selectedRole, setSelectedRole] = useState('doctor');
  const { login } = useAuth();
  const navigate = useNavigate();

  const roles = [
    { id: 'doctor', label: 'Doctor', icon: Stethoscope },
    { id: 'admin', label: 'Admin', icon: Building },
    { id: 'receptionist', label: 'Reception', icon: Users }
  ];

  const handleLogin = async (e) => {
    e.preventDefault();
    const email = e.target['login-email'].value;
    const password = e.target['login-password'].value;
    
    // For demo/dev purposes, map the selected role to the correct demo user
    let username = email;
    if (email === 'demo@clinic.com') {
      if (selectedRole === 'admin') username = 'admin';
      else if (selectedRole === 'doctor') username = 'doctor1';
      else if (selectedRole === 'receptionist') username = 'receptionist1';
    }

    const success = await login(selectedRole, username, password);
    
    if (success) {
      if (selectedRole === 'admin') navigate('/admin');
      else if (selectedRole === 'doctor') navigate('/doctor');
      else if (selectedRole === 'receptionist') navigate('/receptionist');
    }
  };

  return (
    <AuthShell
      kicker="Clinical access"
      title="One calm entry point for the whole clinic."
      description="Role-aware access for doctors, reception, and admins with the clinical workspace ready the moment you sign in."
    >
      <div className="auth-card auth-card-compact">
        <div className="auth-card-header">
          <div>
            <p className="auth-kicker">Welcome back</p>
            <h2>Sign in</h2>
          </div>
        </div>

        <form onSubmit={handleLogin} className="auth-form">
          <div className="form-group">
            <label className="form-label">Workspace</label>
            <div className="auth-segmented">
              {roles.map((role) => (
                <button
                  type="button"
                  key={role.id}
                  className={selectedRole === role.id ? 'is-selected' : ''}
                  onClick={() => setSelectedRole(role.id)}
                  aria-pressed={selectedRole === role.id}
                >
                  <role.icon size={17} />
                  <span>{role.label}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="login-email">Email address</label>
            <div className="input-with-icon">
              <Mail size={18} />
              <input id="login-email" type="email" required className="form-input" placeholder="demo@clinic.com" defaultValue="demo@clinic.com" />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="login-password">Password</label>
            <div className="input-with-icon input-with-action">
              <Lock size={18} />
              <input id="login-password" type="password" required className="form-input" placeholder="Enter your password" defaultValue="password123" />
              <Eye size={18} />
            </div>
          </div>

          <div className="auth-row">
            <label className="auth-check">
              <input type="checkbox" defaultChecked />
              <span>Keep me signed in</span>
            </label>
            <Link to="/forgot-password">Forgot password?</Link>
          </div>

          <button type="submit" className="btn btn-primary auth-submit">
            Open dashboard <ArrowRight size={18} />
          </button>

          <p className="auth-switch">
            New to Smart Dental Clinic? <Link to="/register">Create an account</Link>
          </p>
        </form>
      </div>
    </AuthShell>
  );
}
