import React from 'react';
import { MACHINES } from '../config/machines';
import { Fuel, TrendingUp, AlertTriangle, IndianRupee } from 'lucide-react';

export default function Dashboard({ customers, fills }) {
  // Compute date boundary for today
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayStartMs = today.getTime();

  // Helper: customer status count
  const getAlertsCount = () => {
    return customers.filter(c => {
      const custFills = fills
        .filter(f => f.vehicle.toUpperCase() === c.vehicle.toUpperCase())
        .sort((a, b) => new Date(b.ts) - new Date(a.ts));
        
      if (custFills.length === 0) return false;
      const lastFill = custFills[0];
      const diffMs = Date.now() - new Date(lastFill.ts).getTime();
      const days = Math.floor(diffMs / 86400000);
      return days > 21; // either at-risk or churned
    }).length;
  };

  // Filter transactions for today
  const todayFills = fills.filter(f => new Date(f.ts).getTime() >= todayStartMs);
  
  // Calculate today's stats
  const totalFillsCount = todayFills.length;
  const totalLitres = todayFills.reduce((sum, f) => sum + (f.litres || 0), 0);
  const totalRevenue = todayFills.reduce((sum, f) => sum + (f.final || 0), 0);
  const alertsCount = getAlertsCount();

  // Dynamic progress percentages for machines
  const totalFillsForMachines = totalFillsCount || 1;
  
  // Dynamic payment calculations
  const cashAmt = todayFills.filter(f => f.payment === 'Cash').reduce((sum, f) => sum + (f.final || 0), 0);
  const gpayAmt = todayFills.filter(f => f.payment === 'GPay / UPI').reduce((sum, f) => sum + (f.final || 0), 0);
  const creditAmt = todayFills.filter(f => f.payment === 'Credit').reduce((sum, f) => sum + (f.final || 0), 0);
  const totalPaymentAmt = cashAmt + gpayAmt + creditAmt || 1;

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-title">Dashboard</div>
          <div className="page-sub">Dispenser operations and business metrics for today</div>
        </div>
      </div>

      {/* Stats Cards Row */}
      <div className="stats-row" id="dash-stats">
        <div className="stat-card">
          <div className="stat-label">Today's Fills</div>
          <div className="stat-val">{totalFillsCount}</div>
          <div className="stat-sub">{fills.length} total entries</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Litres Dispensed</div>
          <div className="stat-val">{totalLitres.toFixed(1)}L</div>
          <div className="stat-sub">Volume today</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Revenue Today</div>
          <div className="stat-val" style={{ display: 'flex', alignItems: 'center' }}>
            ₹{totalRevenue.toLocaleString('en-IN')}
          </div>
          <div className="stat-sub">After auto discounts</div>
        </div>
        <div className={`stat-card ${alertsCount > 0 ? 'warn' : ''}`}>
          <div className="stat-label">Customer Alerts</div>
          <div className="stat-val">{alertsCount}</div>
          <div className="stat-sub">Dormant customers</div>
        </div>
      </div>

      {/* Progress Breakdown Row */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '20px' }} className="grid-responsive">
        
        {/* Fills by Machine */}
        <div className="card card-pad">
          <div className="section-label" style={{ marginBottom: '16px' }}>Today's Fills by Machine</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {Object.values(MACHINES).map((m) => {
              const machineFills = todayFills.filter(f => f.machine === m.id);
              const count = machineFills.length;
              const pct = Math.round((count / totalFillsForMachines) * 100);
              const litresSum = machineFills.reduce((sum, f) => sum + (f.litres || 0), 0);
              const revSum = machineFills.reduce((sum, f) => sum + (f.final || 0), 0);

              return (
                <div key={m.id}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '5px' }}>
                    <span style={{ color: m.themeColor, fontWeight: '600' }}>{m.name}</span>
                    <span className="mono" style={{ fontSize: '12px' }}>
                      {count} fill{count !== 1 ? 's' : ''} · {litresSum.toFixed(1)}L · ₹{revSum.toLocaleString('en-IN')}
                    </span>
                  </div>
                  <div style={{ height: '7px', background: 'var(--bg)', borderRadius: '4px', overflow: 'hidden' }}>
                    <div 
                      style={{ 
                        height: '100%', 
                        background: m.themeColor, 
                        width: `${totalFillsCount > 0 ? pct : 0}%`,
                        transition: 'width 0.4s ease-out'
                      }} 
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Payments Breakdown */}
        <div className="card card-pad">
          <div className="section-label" style={{ marginBottom: '16px' }}>Payment Method Breakdown</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {[
              { label: 'Cash', color: '#1a6e3c', amount: cashAmt },
              { label: 'GPay / UPI', color: '#0c5aa6', amount: gpayAmt },
              { label: 'Credit', color: '#d97706', amount: creditAmt }
            ].map((p) => {
              const pct = Math.round((p.amount / totalPaymentAmt) * 100);
              return (
                <div key={p.label}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '5px' }}>
                    <span style={{ color: p.color, fontWeight: '600' }}>{p.label}</span>
                    <span className="mono" style={{ fontSize: '12px' }}>₹{p.amount.toLocaleString('en-IN')}</span>
                  </div>
                  <div style={{ height: '7px', background: 'var(--bg)', borderRadius: '4px', overflow: 'hidden' }}>
                    <div 
                      style={{ 
                        height: '100%', 
                        background: p.color, 
                        width: `${totalRevenue > 0 ? pct : 0}%`,
                        transition: 'width 0.4s ease-out'
                      }} 
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Today's Transactions Table */}
      <div className="card card-pad">
        <div className="section-label">Today's Shift Entries</div>
        <div className="table-wrap">
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th style={{ padding: '8px 12px', textAlign: 'left' }}>Time</th>
                <th style={{ padding: '8px 12px', textAlign: 'left' }}>Employee</th>
                <th style={{ padding: '8px 12px', textAlign: 'left' }}>Vehicle</th>
                <th style={{ padding: '8px 12px', textAlign: 'left' }}>Machine</th>
                <th style={{ padding: '8px 12px', textAlign: 'left' }}>Litres</th>
                <th style={{ padding: '8px 12px', textAlign: 'left' }}>Collect</th>
                <th style={{ padding: '8px 12px', textAlign: 'left' }}>Payment</th>
              </tr>
            </thead>
            <tbody>
              {todayFills.length === 0 ? (
                <tr>
                  <td colSpan="7" style={{ textAlign: 'center', color: 'var(--text-3)', padding: '20px' }}>
                    No transactions recorded today.
                  </td>
                </tr>
              ) : (
                [...todayFills]
                  .sort((a, b) => new Date(b.ts) - new Date(a.ts))
                  .map((f) => (
                    <tr key={f.id} style={{ borderBottom: '1px solid var(--border)' }}>
                      <td style={{ padding: '10px 12px', fontSize: '12px' }}>
                        {new Date(f.ts).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                      </td>
                      <td style={{ padding: '10px 12px' }}>{f.employee}</td>
                      <td className="mono" style={{ padding: '10px 12px', fontSize: '12px', fontWeight: '600' }}>
                        {f.vehicle}
                      </td>
                      <td style={{ padding: '10px 12px' }}>
                        <span className={
                          f.machine === 'hp' ? 'pill-hp' : f.machine === 'cb' ? 'pill-cb' : 'pill-warn'
                        }>
                          {MACHINES[f.machine]?.name || f.machine.toUpperCase()}
                        </span>
                      </td>
                      <td className="mono" style={{ padding: '10px 12px' }}>{f.litres}L</td>
                      <td className="mono" style={{ padding: '10px 12px', fontWeight: '600' }}>
                        ₹{(f.final || 0).toLocaleString('en-IN')}
                      </td>
                      <td style={{ padding: '10px 12px' }}>{f.payment}</td>
                    </tr>
                  ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
