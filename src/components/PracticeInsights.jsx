import React, { useState, useEffect } from 'react';
import { Sparkles, TrendingUp, Users, Calendar, CheckCircle2, Clock, AlertCircle } from 'lucide-react';

const API_BASE = 'http://localhost:8000/api';

export default function PracticeInsights() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchInsights = async () => {
      try {
        setLoading(true);
        const res = await fetch(`${API_BASE}/ai/insights`);
        if (!res.ok) throw new Error('Failed to fetch AI insights');
        const result = await res.json();
        setData(result);
        setError(null);
      } catch (err) {
        console.error('Insights fetch error:', err);
        setError('Could not load AI insights at this time.');
      } finally {
        setLoading(false);
      }
    };

    fetchInsights();
  }, []);

  if (loading) {
    return (
      <div className="card animate-pulse" style={{ minHeight: '200px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <div style={{ height: '24px', background: '#e2e8f0', width: '40%', borderRadius: '4px' }}></div>
        <div style={{ height: '60px', background: '#f1f5f9', width: '100%', borderRadius: '8px' }}></div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
          <div style={{ height: '40px', background: '#f1f5f9', borderRadius: '8px' }}></div>
          <div style={{ height: '40px', background: '#f1f5f9', borderRadius: '8px' }}></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="card" style={{ border: '1px solid #fee2e2', background: '#fef2f2' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#dc2626' }}>
          <AlertCircle size={20} />
          <strong style={{ fontSize: '0.9rem' }}>AI Insights Unavailable</strong>
        </div>
        <p style={{ margin: '8px 0 0', fontSize: '0.85rem', color: '#991b1b' }}>{error}</p>
      </div>
    );
  }

  return (
    <div className="card" style={{ position: 'relative', overflow: 'hidden' }}>
      {/* Background Decorative Sparkle */}
      <Sparkles size={120} style={{ position: 'absolute', top: '-20px', right: '-20px', opacity: 0.03, color: 'var(--clr-primary)' }} />
      
      <div className="section-header" style={{ marginBottom: '16px' }}>
        <div>
          <p className="section-kicker" style={{ color: 'var(--clr-primary)', display: 'flex', alignItems: 'center', gap: '4px' }}>
            <Sparkles size={12} /> AI Generated
          </p>
          <h3 className="section-title">Practice Insights</h3>
        </div>
        <TrendingUp size={22} color="var(--clr-primary)" />
      </div>

      <div style={{ background: 'var(--clr-surface-50, #f8fafc)', padding: '16px', borderRadius: '12px', border: '1px solid var(--clr-border)', marginBottom: '20px' }}>
        <p style={{ margin: 0, fontSize: '1.1rem', fontWeight: 600, color: 'var(--clr-text-primary)', lineHeight: 1.4 }}>
          {data?.summary}
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '12px', marginBottom: '20px' }}>
        <div style={{ padding: '12px', background: '#fff', border: '1px solid #eee', borderRadius: '10px', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Users size={18} color="#6366f1" />
          <div>
            <div style={{ fontSize: '0.75rem', color: '#666', textTransform: 'uppercase', fontWeight: 600 }}>Patients</div>
            <div style={{ fontSize: '1.1rem', fontWeight: 700 }}>{data?.stats?.patients}</div>
          </div>
        </div>
        <div style={{ padding: '12px', background: '#fff', border: '1px solid #eee', borderRadius: '10px', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Calendar size={18} color="#ec4899" />
          <div>
            <div style={{ fontSize: '0.75rem', color: '#666', textTransform: 'uppercase', fontWeight: 600 }}>Today</div>
            <div style={{ fontSize: '1.1rem', fontWeight: 700 }}>{data?.stats?.today_appointments}</div>
          </div>
        </div>
        <div style={{ padding: '12px', background: '#fff', border: '1px solid #eee', borderRadius: '10px', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <CheckCircle2 size={18} color="#10b981" />
          <div>
            <div style={{ fontSize: '0.75rem', color: '#666', textTransform: 'uppercase', fontWeight: 600 }}>Done</div>
            <div style={{ fontSize: '1.1rem', fontWeight: 700 }}>{data?.stats?.completed}</div>
          </div>
        </div>
        <div style={{ padding: '12px', background: '#fff', border: '1px solid #eee', borderRadius: '10px', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Clock size={18} color="#f59e0b" />
          <div>
            <div style={{ fontSize: '0.75rem', color: '#666', textTransform: 'uppercase', fontWeight: 600 }}>Pending</div>
            <div style={{ fontSize: '1.1rem', fontWeight: 700 }}>{data?.stats?.pending}</div>
          </div>
        </div>
      </div>

      <div>
        <h4 style={{ fontSize: '0.9rem', fontWeight: 700, marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '6px' }}>
          <TrendingUp size={16} /> AI Recommendations
        </h4>
        <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {data?.recommendations?.map((rec, i) => (
            <li key={i} style={{ display: 'flex', gap: '10px', fontSize: '0.88rem', color: 'var(--clr-text-secondary)', background: 'rgba(99, 102, 241, 0.05)', padding: '10px', borderRadius: '8px', borderLeft: '3px solid var(--clr-primary)' }}>
              <span style={{ color: 'var(--clr-primary)', fontWeight: 'bold' }}>•</span>
              {rec}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
