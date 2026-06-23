import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import AuthShell from '../../components/AuthShell';
import { ArrowLeft, ArrowRight, CheckCircle2, Mail, ShieldCheck, Lock, Eye, EyeOff, AlertCircle } from 'lucide-react';

export default function ForgotPassword() {
  const [step, setStep] = useState(1); // 1: Email, 2: Code & New Password, 3: Success
  const [clinicEmail, setClinicEmail] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [loadingState, setLoadingState] = useState(false);
  
  const navigate = useNavigate();

  const handleRequestCode = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    
    const emailClean = clinicEmail.trim().lower();
    if (!emailClean) {
      setErrorMsg('Clinic email is required.');
      return;
    }
    
    if (!emailClean.includes('@')) {
      setErrorMsg('Please enter a valid clinic email address.');
      return;
    }
    
    setLoadingState(true);
    try {
      const response = await fetch('http://localhost:8000/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clinic_email: emailClean })
      });
      
      // Even if response is not ok, we handle gracefully. But the API should succeed with 200.
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.detail || 'Failed to request recovery code');
      }
      
      const data = await response.json();
      console.log('Recovery response:', data);
      
      // Successfully transitioned to step 2
      setStep(2);
    } catch (err) {
      setErrorMsg(err.message || 'Failed to request recovery code. Please try again.');
    } finally {
      setLoadingState(false);
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    setErrorMsg('');

    if (verificationCode.length !== 6) {
      setErrorMsg('Verification code must be exactly 6 digits.');
      return;
    }

    if (newPassword.length < 6) {
      setErrorMsg('Password must be at least 6 characters long.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setErrorMsg('Passwords do not match.');
      return;
    }

    setLoadingState(true);
    try {
      const payload = {
        token: verificationCode.trim(),
        new_password: newPassword,
        clinic_email: clinicEmail.trim().lower()
      };

      const response = await fetch('http://localhost:8000/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.detail || 'Password reset failed');
      }

      setStep(3);
    } catch (err) {
      setErrorMsg(err.message || 'Verification failed');
    } finally {
      setLoadingState(false);
    }
  };

  // Validators for Step 2
  const isCodeValid = verificationCode.length === 6;
  const isPasswordValid = newPassword.length >= 6;
  const isPasswordMatch = newPassword === confirmPassword;
  const isStep2FormValid = isCodeValid && isPasswordValid && isPasswordMatch;

  return (
    <AuthShell
      kicker="Account recovery"
      title="Reset access without interrupting the care day."
      description="Send a secure recovery link to the email connected to your clinic profile and return with the same role permissions."
    >
      <div className="auth-card auth-card-compact">
        {step !== 3 && (
          <Link to="/login" className="auth-back-link">
            <ArrowLeft size={16} /> Back to login
          </Link>
        )}

        <div className="auth-card-header">
          <div>
            <p className="auth-kicker">
              {step === 1 && 'Recover account'}
              {step === 2 && 'Security check'}
              {step === 3 && 'Success'}
            </p>
            <h2>
              {step === 1 && 'Forgot password?'}
              {step === 2 && 'Enter reset details'}
              {step === 3 && 'Password updated'}
            </h2>
          </div>
          <span className="auth-form-icon">
            {step === 1 && <ShieldCheck size={24} />}
            {step === 2 && <Lock size={24} />}
            {step === 3 && <CheckCircle2 size={24} />}
          </span>
        </div>

        {errorMsg && (
          <div className="auth-alert" style={{
            display: 'flex', alignItems: 'center', gap: 10,
            background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.2)',
            borderRadius: 'var(--r-md)', padding: 12, marginBottom: 16,
            color: '#ef4444', fontSize: '0.85rem', fontWeight: 500
          }}>
            <AlertCircle size={18} style={{ flexShrink: 0 }} />
            <span>{errorMsg}</span>
          </div>
        )}

        {step === 1 && (
          <form onSubmit={handleRequestCode} className="auth-form">
            <div className="form-group">
              <label className="form-label" htmlFor="forgot-email">Clinic Email Address</label>
              <div className="input-with-icon">
                <Mail size={18} />
                <input
                  id="forgot-email"
                  type="email"
                  required
                  className="form-input"
                  placeholder="username@doctor.com"
                  value={clinicEmail}
                  onChange={(e) => setClinicEmail(e.target.value)}
                />
              </div>
            </div>

            <button type="submit" className="btn btn-primary auth-submit" disabled={loadingState || !clinicEmail}>
              {loadingState ? 'Sending code...' : <><ShieldCheck size={18} /> Send verification code <ArrowRight size={18} style={{ marginLeft: 6 }} /></>}
            </button>

            <p className="auth-helper">
              If the account exists, we will dispatch a 6-digit recovery code to its associated personal email.
            </p>
          </form>
        )}

        {step === 2 && (
          <form onSubmit={handleResetPassword} className="auth-form">
            <p style={{ fontSize: '0.85rem', color: 'var(--clr-text-muted, #6b7280)', marginBottom: 14 }}>
              Enter the 6-digit code sent to your personal recovery email and choose a new password.
            </p>
            
            <div className="form-group">
              <label className="form-label" htmlFor="reset-code">Verification Code</label>
              <input
                id="reset-code"
                type="text"
                required
                maxLength={6}
                className="form-input"
                style={{ textAlign: 'center', letterSpacing: '0.4rem', fontSize: '1.25rem', fontWeight: 700 }}
                placeholder="000000"
                value={verificationCode}
                onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, ''))}
              />
            </div>

            <div className="form-group" style={{ marginTop: 10 }}>
              <label className="form-label" htmlFor="reset-password">New Password</label>
              <div className="input-with-icon" style={{ position: 'relative' }}>
                <Lock size={18} />
                <input
                  id="reset-password"
                  type={showPassword ? "text" : "password"}
                  required
                  className={`form-input ${newPassword && !isPasswordValid ? 'is-invalid' : ''}`}
                  style={{ paddingRight: 40 }}
                  placeholder="Min 6 characters"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--clr-text-muted, #6b7280)', display: 'flex', alignItems: 'center', padding: 0, zIndex: 10 }}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              {newPassword && !isPasswordValid && (
                <span style={{ fontSize: '0.72rem', color: '#ef4444', marginTop: 4, display: 'block' }}>
                  Must be at least 6 characters.
                </span>
              )}
            </div>

            <div className="form-group" style={{ marginTop: 10 }}>
              <label className="form-label" htmlFor="reset-confirm">Confirm Password</label>
              <div className="input-with-icon" style={{ position: 'relative' }}>
                <Lock size={18} />
                <input
                  id="reset-confirm"
                  type={showConfirmPassword ? "text" : "password"}
                  required
                  className={`form-input ${confirmPassword && !isPasswordMatch ? 'is-invalid' : ''}`}
                  style={{ paddingRight: 40 }}
                  placeholder="Repeat new password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--clr-text-muted, #6b7280)', display: 'flex', alignItems: 'center', padding: 0, zIndex: 10 }}
                >
                  {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              {confirmPassword && !isPasswordMatch && (
                <span style={{ fontSize: '0.72rem', color: '#ef4444', marginTop: 4, display: 'block' }}>
                  Passwords do not match.
                </span>
              )}
            </div>

            <button type="submit" className="btn btn-primary auth-submit" style={{ marginTop: 14 }} disabled={loadingState || !isStep2FormValid}>
              {loadingState ? 'Resetting password...' : <><CheckCircle2 size={18} /> Update Password</>}
            </button>
            
            <button
              type="button"
              className="btn"
              style={{ width: '100%', marginTop: 8, background: 'none', border: '1px solid var(--clr-border, #e5e7eb)', color: 'var(--clr-text, #1f2937)' }}
              disabled={loadingState}
              onClick={() => {
                setStep(1);
                setVerificationCode('');
                setNewPassword('');
                setConfirmPassword('');
                setErrorMsg('');
              }}
            >
              Cancel & Start Over
            </button>
          </form>
        )}

        {step === 3 && (
          <div className="auth-success" style={{ textAlign: 'center', padding: '10px 0' }}>
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 16 }}>
              <span className="auth-success-icon" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 60, height: 60, borderRadius: '50%', background: 'rgba(34, 197, 94, 0.1)', color: '#22c55e' }}>
                <CheckCircle2 size={36} />
              </span>
            </div>
            <p style={{ marginBottom: 20, fontSize: '0.95rem' }}>
              Your password has been successfully updated. You can now use your clinic email and new password to log in.
            </p>
            <button className="btn btn-primary auth-submit" style={{ width: '100%' }} onClick={() => navigate('/login')}>
              Return to login <ArrowRight size={18} style={{ marginLeft: 6 }} />
            </button>
          </div>
        )}
      </div>
    </AuthShell>
  );
}
