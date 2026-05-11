import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import AuthShell from '../../components/AuthShell';
import { ArrowLeft, ArrowRight, CheckCircle2, Mail, ShieldCheck } from 'lucide-react';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [isSubmitted, setIsSubmitted] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = (e) => {
    e.preventDefault();
    setIsSubmitted(true);
  };

  return (
    <AuthShell
      kicker="Account recovery"
      title="Reset access without interrupting the care day."
      description="Send a secure recovery link to the email connected to your clinic profile and return with the same role permissions."
    >
      <div className="auth-card auth-card-compact">
        <Link to="/login" className="auth-back-link">
          <ArrowLeft size={16} /> Back to login
        </Link>

        <div className="auth-card-header">
          <div>
            <p className="auth-kicker">{isSubmitted ? 'Link sent' : 'Recover account'}</p>
            <h2>{isSubmitted ? 'Check your inbox' : 'Forgot password?'}</h2>
          </div>
          <span className="auth-form-icon">
            {isSubmitted ? <CheckCircle2 size={24} /> : <ShieldCheck size={24} />}
          </span>
        </div>

        {!isSubmitted ? (
          <form onSubmit={handleSubmit} className="auth-form">
            <div className="form-group">
              <label className="form-label" htmlFor="forgot-email">Email address</label>
              <div className="input-with-icon">
                <Mail size={18} />
                <input
                  id="forgot-email"
                  type="email"
                  required
                  className="form-input"
                  placeholder="you@clinic.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
            </div>

            <button type="submit" className="btn btn-primary auth-submit">
              Send recovery link <ArrowRight size={18} />
            </button>

            <p className="auth-helper">
              We will send reset instructions only if the email matches an active account.
            </p>
          </form>
        ) : (
          <div className="auth-success">
            <span className="auth-success-icon">
              <CheckCircle2 size={30} />
            </span>
            <p>
              If <strong>{email}</strong> matches a clinic account, a recovery link has
              been sent.
            </p>
            <button className="btn btn-primary auth-submit" onClick={() => navigate('/login')}>
              Return to login <ArrowRight size={18} />
            </button>
          </div>
        )}
      </div>
    </AuthShell>
  );
}
