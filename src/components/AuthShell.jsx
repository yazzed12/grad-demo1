import React from 'react';
import { Activity } from 'lucide-react';

export default function AuthShell({ children }) {
  return (
    <main className="auth-shell">
      <section className="auth-panel">
        <div className="auth-brand auth-brand-centered">
          <span className="auth-logo">
            <Activity size={28} />
          </span>
          <span>Smart Clinic</span>
        </div>
        {children}
      </section>
    </main>
  );
}
