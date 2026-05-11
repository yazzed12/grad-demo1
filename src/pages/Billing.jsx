import Layout from '../components/Layout';
import { DollarSign, TrendingUp, CheckCircle, Clock, AlertCircle, Search, Download } from 'lucide-react';

const invoices = [
  { id: 'INV-001', patient: 'Eleanor Voss',   service: 'Cardiology Consultation', date: '2026-04-18', amount: 320,  paid: 320,  status: 'Paid'      },
  { id: 'INV-002', patient: 'Marcus Cole',    service: 'MRI Scan + Neurology',    date: '2026-04-15', amount: 1850, paid: 0,    status: 'Unpaid'    },
  { id: 'INV-003', patient: 'Oliver Grant',   service: 'Orthopedic Surgery Prep', date: '2026-04-20', amount: 4200, paid: 2100, status: 'Partial'   },
  { id: 'INV-004', patient: 'Priya Sharma',   service: 'Pediatric Check-up',      date: '2026-04-12', amount: 180,  paid: 180,  status: 'Paid'      },
  { id: 'INV-005', patient: 'Leo Kowalski',   service: 'Psychiatry Session ×4',   date: '2026-04-16', amount: 640,  paid: 640,  status: 'Paid'      },
  { id: 'INV-006', patient: 'Nina Johansson', service: 'ECG + Cardio Follow-up',  date: '2026-04-19', amount: 450,  paid: 0,    status: 'Unpaid'    },
  { id: 'INV-007', patient: 'David Huang',    service: 'Neurology Review + MRI',  date: '2026-04-14', amount: 2100, paid: 2100, status: 'Paid'      },
  { id: 'INV-008', patient: 'Kwame Asante',   service: 'Emergency Ortho Surgery', date: '2026-04-21', amount: 8500, paid: 0,    status: 'Overdue'   },
  { id: 'INV-009', patient: 'Sofia Reyes',    service: 'Dermatology + Biopsy',    date: '2026-04-10', amount: 520,  paid: 520,  status: 'Paid'      },
  { id: 'INV-010', patient: 'Taraji Barnes',  service: 'Skin Consultation',       date: '2026-04-09', amount: 200,  paid: 200,  status: 'Paid'      },
];

const STATUS_STYLE = {
  Paid:    { cls: 'badge badge-success', icon: <CheckCircle size={10} /> },
  Unpaid:  { cls: 'badge badge-warning', icon: <Clock size={10} /> },
  Partial: { cls: 'badge badge-cyan',    icon: <Clock size={10} /> },
  Overdue: { cls: 'badge badge-danger',  icon: <AlertCircle size={10} /> },
};

export default function Billing() {
  const totalRevenue  = invoices.reduce((s, i) => s + i.paid, 0);
  const totalPending  = invoices.reduce((s, i) => s + (i.amount - i.paid), 0);
  const paidCount     = invoices.filter(i => i.status === 'Paid').length;
  const overdueCount  = invoices.filter(i => i.status === 'Overdue').length;

  return (
    <Layout pageTitle="Billing" pageSubtitle="Invoice and payment management">
      {/* Summary Cards */}
      <div className="grid-4 stagger animate-fadeIn" style={{ marginBottom: 'var(--sp-xl)' }}>
        {[
          { label: 'Total Revenue', value: `$${totalRevenue.toLocaleString()}`,  color: '#10b981', icon: DollarSign },
          { label: 'Pending',       value: `$${totalPending.toLocaleString()}`,   color: '#f59e0b', icon: Clock      },
          { label: 'Paid Invoices', value: paidCount,                             color: '#3b82f6', icon: CheckCircle},
          { label: 'Overdue',       value: overdueCount,                          color: '#ef4444', icon: AlertCircle},
        ].map(({ label, value, color, icon: Icon }) => (
          <div key={label} className="card" style={{ padding: '16px 20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
              <div style={{ width: 38, height: 38, borderRadius: 'var(--r-md)', background: `${color}22`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Icon size={18} color={color} />
              </div>
            </div>
            <div style={{ fontSize: '1.5rem', fontWeight: 800, color }}>{value}</div>
            <div style={{ fontSize: '0.72rem', color: 'var(--clr-text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</div>
          </div>
        ))}
      </div>

      {/* Controls */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 'var(--sp-lg)', flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: 200 }}>
          <Search size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--clr-text-muted)' }} />
          <input className="form-input" style={{ paddingLeft: 36, borderRadius: 'var(--r-full)' }} placeholder="Search invoices…" />
        </div>
        <button className="btn btn-secondary btn-sm"><Download size={13} /> Export CSV</button>
        <button className="btn btn-primary btn-sm"><DollarSign size={13} /> New Invoice</button>
      </div>

      {/* Table */}
      <div className="card animate-fadeIn" style={{ padding: 0, overflow: 'hidden' }}>
        <div className="table-wrapper" style={{ borderRadius: 0, border: 'none' }}>
          <table>
            <thead><tr>
              <th>Invoice</th><th>Patient</th><th>Service</th>
              <th>Date</th><th>Amount</th><th>Paid</th><th>Balance</th><th>Status</th>
            </tr></thead>
            <tbody>
              {invoices.map(inv => {
                const s = STATUS_STYLE[inv.status];
                const balance = inv.amount - inv.paid;
                return (
                  <tr key={inv.id}>
                    <td style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem', color: 'var(--clr-primary)', fontWeight: 700 }}>{inv.id}</td>
                    <td style={{ fontWeight: 600, color: 'var(--clr-text-primary)' }}>{inv.patient}</td>
                    <td style={{ maxWidth: 200 }}>{inv.service}</td>
                    <td style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem' }}>{inv.date}</td>
                    <td style={{ fontWeight: 700, color: 'var(--clr-text-primary)' }}>${inv.amount.toLocaleString()}</td>
                    <td style={{ color: 'var(--clr-success)', fontWeight: 600 }}>${inv.paid.toLocaleString()}</td>
                    <td style={{ color: balance > 0 ? 'var(--clr-danger)' : 'var(--clr-text-muted)', fontWeight: balance > 0 ? 700 : 400 }}>
                      {balance > 0 ? `$${balance.toLocaleString()}` : '—'}
                    </td>
                    <td>
                      <span className={s.cls} style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                        {s.icon} {inv.status}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Footer total */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--sp-xl)', padding: '14px 20px', borderTop: '1px solid var(--clr-border)', background: 'var(--clr-surface-2)' }}>
          <span style={{ fontSize: '0.8rem', color: 'var(--clr-text-muted)' }}>
            Total billed: <strong style={{ color: 'var(--clr-text-primary)' }}>${invoices.reduce((s,i) => s + i.amount, 0).toLocaleString()}</strong>
          </span>
          <span style={{ fontSize: '0.8rem', color: 'var(--clr-text-muted)' }}>
            Collected: <strong style={{ color: 'var(--clr-success)' }}>${totalRevenue.toLocaleString()}</strong>
          </span>
          <span style={{ fontSize: '0.8rem', color: 'var(--clr-text-muted)' }}>
            Outstanding: <strong style={{ color: 'var(--clr-danger)' }}>${totalPending.toLocaleString()}</strong>
          </span>
        </div>
      </div>
    </Layout>
  );
}
