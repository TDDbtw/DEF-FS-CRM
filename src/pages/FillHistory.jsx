import React, { useState } from 'react';
import { Download, Calendar, ArrowUpDown, X } from 'lucide-react';
import { MACHINES } from '../config/machines';

export default function FillHistory({ fills }) {
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const sortedFills = [...fills].sort((a, b) => new Date(b.ts) - new Date(a.ts));

  const filteredFills = sortedFills.filter(f => {
    const d = new Date(f.ts);
    if (dateFrom && d < new Date(dateFrom)) return false;
    if (dateTo) {
      const end = new Date(dateTo);
      end.setHours(23, 59, 59, 999);
      if (d > end) return false;
    }
    return true;
  });

  const clearDates = () => {
    setDateFrom('');
    setDateTo('');
  };

  const exportCSV = () => {
    if (filteredFills.length === 0) return;
    
    const headers = [
      'Timestamp',
      'Employee',
      'Machine',
      'Vehicle',
      'Driver',
      'Driver Phone',
      'Company',
      'Company Phone',
      'Odometer',
      'State',
      'Litres',
      'Actual',
      'Discount',
      'Final Collect',
      'Payment',
      'Shift',
      'Totalizer Readings',
      'Remarks'
    ];

    const rows = filteredFills.map(f => {
      const tots = Object.entries(f.totalizers || {})
        .map(([k, v]) => `${k.toUpperCase()}:${v}`)
        .join(' | ');

      return [
        new Date(f.ts).toLocaleString('en-IN'),
        f.employee,
        MACHINES[f.machine]?.name || f.machine.toUpperCase(),
        f.vehicle,
        f.driver,
        f.driver_ph || '',
        f.company || '',
        f.co_ph || '',
        f.odo || '',
        f.state,
        f.litres,
        f.actual,
        f.discount,
        f.final,
        f.payment,
        f.shift,
        tots,
        f.notes || ''
      ];
    });

    const csvContent = [
      headers.map(h => `"${h}"`).join(','),
      ...rows.map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    const from = dateFrom || 'start';
    const to = dateTo || 'end';
    link.setAttribute('href', url);
    link.setAttribute('download', `fills_${from}_to_${to}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-title">Fill History</div>
          <div className="page-sub">Chronological list of all fuel entries</div>
        </div>
        <button 
          className="btn btn-outline" 
          onClick={exportCSV}
          disabled={filteredFills.length === 0}
          style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
        >
          <Download size={15} />
          Export CSV
        </button>
      </div>

      <div className="card" style={{ marginBottom: '12px', padding: '12px 16px' }}>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
          <Calendar size={15} style={{ color: 'var(--text-3)' }} />
          <label style={{ fontSize: '12px', color: 'var(--text-3)' }}>From:</label>
          <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} style={{ fontSize: '12px', padding: '4px 8px', border: '1px solid var(--border-mid)', borderRadius: 'var(--radius)', background: 'var(--surface)', color: 'var(--text)' }} />
          <label style={{ fontSize: '12px', color: 'var(--text-3)' }}>To:</label>
          <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} style={{ fontSize: '12px', padding: '4px 8px', border: '1px solid var(--border-mid)', borderRadius: 'var(--radius)', background: 'var(--surface)', color: 'var(--text)' }} />
          {(dateFrom || dateTo) && (
            <button className="btn btn-outline btn-sm" onClick={clearDates} style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px', padding: '4px 8px' }}>
              <X size={12} /> Clear
            </button>
          )}
          <span style={{ fontSize: '12px', color: 'var(--text-3)', marginLeft: 'auto' }}>
            {filteredFills.length} of {sortedFills.length} entries
          </span>
        </div>
      </div>

      <div className="card">
        <div className="table-wrap">
          {filteredFills.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '30px', color: 'var(--text-3)' }}>
              {sortedFills.length === 0 ? 'No fill transactions recorded yet.' : 'No records found for the selected date range.'}
            </div>
          ) : (
            <table id="history-table">
              <thead>
                <tr>
                  <th>Date & Time</th>
                  <th>Employee</th>
                  <th>Machine</th>
                  <th>Driver</th>
                  <th>Vehicle</th>
                  <th>Company</th>
                  <th>Litres</th>
                  <th>Amount</th>
                  <th>Discount</th>
                  <th>Final Collect</th>
                  <th>Payment</th>
                  <th>Remarks</th>
                </tr>
              </thead>
              <tbody id="history-body">
                {filteredFills.map((f) => (
                  <tr key={f.id}>
                    <td style={{ fontSize: '11px', color: 'var(--text-2)', whiteSpace: 'nowrap' }}>
                      {new Date(f.ts).toLocaleString('en-IN', {
                        day: 'numeric',
                        month: 'short',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </td>
                    <td>{f.employee}</td>
                    <td>
                      <span className={
                        f.machine === 'hp' ? 'pill-hp' : f.machine === 'cb' ? 'pill-cb' : 'pill-warn'
                      }>
                        {MACHINES[f.machine]?.name || f.machine.toUpperCase()}
                      </span>
                    </td>
                    <td>{f.driver}</td>
                    <td className="mono" style={{ fontSize: '11px', fontWeight: '600' }}>{f.vehicle}</td>
                    <td style={{ color: 'var(--text-2)' }}>{f.company || '—'}</td>
                    <td className="mono">{f.litres}L</td>
                    <td className="mono">₹{(f.actual || 0).toLocaleString('en-IN')}</td>
                    <td className="mono" style={{ color: 'var(--text-3)' }}>−₹{f.discount || 0}</td>
                    <td className="mono" style={{ fontWeight: '600' }}>₹{(f.final || 0).toLocaleString('en-IN')}</td>
                    <td style={{ fontSize: '12px' }}>{f.payment}</td>
                    <td style={{ fontSize: '11px', color: 'var(--text-3)', whiteSpace: 'normal', wordBreak: 'break-word', minWidth: '120px' }}>
                      {f.notes || '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
