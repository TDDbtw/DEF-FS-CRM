import React, { useState } from 'react';
import { Download, Calendar, ArrowUpDown, X } from 'lucide-react';
import { MACHINES } from '../config/machines';

const getShiftType = (ts) => {
  const h = new Date(ts).getHours();
  return h >= 9 && h < 21 ? 'morning' : 'night';
};

const getShiftDay = (ts) => {
  const d = new Date(ts);
  if (d.getHours() < 9) d.setDate(d.getDate() - 1);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

export default function FillHistory({ fills }) {
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [selectedMachine, setSelectedMachine] = useState('all');
  const [selectedEmployee, setSelectedEmployee] = useState('all');
  const [selectedType, setSelectedType] = useState('all');
  const [selectedShift, setSelectedShift] = useState('all');

  const employees = [...new Set(fills.map(f => f.employee))].sort();

  const sortedFills = [...fills].sort((a, b) => new Date(b.ts) - new Date(a.ts));

  const filteredFills = sortedFills.filter(f => {
    const d = new Date(f.ts);
    const shiftType = getShiftType(f.ts);
    const shiftDay = getShiftDay(f.ts);

    if (selectedShift === 'night') {
      if (shiftType !== 'night') return false;
      const sd = new Date(shiftDay);
      if (dateFrom && sd < new Date(dateFrom)) return false;
      if (dateTo) {
        const end = new Date(dateTo);
        end.setHours(23, 59, 59, 999);
        if (sd > end) return false;
      }
    } else {
      if (selectedShift === 'morning' && shiftType !== 'morning') return false;
      if (dateFrom && d < new Date(dateFrom)) return false;
      if (dateTo) {
        const end = new Date(dateTo);
        end.setHours(23, 59, 59, 999);
        if (d > end) return false;
      }
    }

    if (selectedMachine !== 'all' && f.machine !== selectedMachine) return false;
    if (selectedEmployee !== 'all' && f.employee !== selectedEmployee) return false;
    if (selectedType !== 'all' && (f.entry_type || 'sale') !== selectedType) return false;
    return true;
  });

  const clearFilters = () => {
    setDateFrom('');
    setDateTo('');
    setSelectedMachine('all');
    setSelectedEmployee('all');
    setSelectedType('all');
    setSelectedShift('all');
  };

  const exportCSV = () => {
    if (filteredFills.length === 0) return;

    try {
      const headers = [
        'Type',
        'Driver',
        'Truck No',
        'Machine',
        'Customer',
        'Mob',
        'Odometer',
        'Date',
        'Litres',
        '       ' ,
        'Amount',
        'Final Collect',
        '       ',
        'Payment',
        '       ',
        'Employee',
        'Bill',
        'Discount',
        'Split Cash',
        'Split GPay',
        'Shift',
        'State',
        'Company Phone',
        'Totalizer Readings',
        'Remarks'
      ];

      const rows = filteredFills.map(f => {
        const tots = Object.entries(f.totalizers || {})
          .map(([k, v]) => `${k.toUpperCase()}:${v}`)
          .join(' | ');

        return [
          f.entry_type || 'sale',
          f.driver,
          f.vehicle,
          MACHINES[f.machine]?.name || f.machine.toUpperCase(),
          f.company || '',
          f.driver_ph || '',
          f.odo || '',
          new Date(f.ts).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }).replace(' ', '-'),
          f.litres,
          ' ',
          f.actual,
          f.final,
          ' ',
          f.payment,
          ' ',
          f.employee =='Basil'?"MB":"BH",
          f.bill_type ? ((f.bill_type || 'gst') === 'gst' ? 'GST bill' : 'non GST') : '',
          f.discount,
          f.split_cash || '',
          f.split_gpay || '',
          f.shift,
          f.state,
          f.co_ph || '',
          tots,
          f.notes || ''
        ];
      });

      const csvContent = '\uFEFF' + [
        headers.map(h => `"${h}"`).join(','),
        ...rows.map(r => r.map(v => `"${String(v ?? '').replace(/"/g, '""')}"`).join(','))
      ].join('\n');

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      const from = dateFrom || 'start';
      const to = dateTo || 'end';
      const mach = selectedMachine !== 'all' ? `_${selectedMachine}` : '';
      const emp = selectedEmployee !== 'all' ? `_${selectedEmployee.replace(/\s+/g, '_')}` : '';
      link.href = url;
      link.download = `fills${mach}${emp}_${from}_to_${to}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('CSV export failed:', err);
    }
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
          <label style={{ fontSize: '12px', color: 'var(--text-3)' }}>Machine:</label>
          <select value={selectedMachine} onChange={e => setSelectedMachine(e.target.value)} style={{ fontSize: '12px', padding: '4px 8px', border: '1px solid var(--border-mid)', borderRadius: 'var(--radius)', background: 'var(--surface)', color: 'var(--text)' }}>
            <option value="all">All</option>
            {Object.values(MACHINES).map(m => (
              <option key={m.id} value={m.id}>{m.name}</option>
            ))}
          </select>
          <label style={{ fontSize: '12px', color: 'var(--text-3)' }}>Employee:</label>
          <select value={selectedEmployee} onChange={e => setSelectedEmployee(e.target.value)} style={{ fontSize: '12px', padding: '4px 8px', border: '1px solid var(--border-mid)', borderRadius: 'var(--radius)', background: 'var(--surface)', color: 'var(--text)' }}>
            <option value="all">All</option>
            {employees.map(emp => (
              <option key={emp} value={emp}>{emp}</option>
            ))}
          </select>
          <label style={{ fontSize: '12px', color: 'var(--text-3)' }}>Type:</label>
          <select value={selectedType} onChange={e => setSelectedType(e.target.value)} style={{ fontSize: '12px', padding: '4px 8px', border: '1px solid var(--border-mid)', borderRadius: 'var(--radius)', background: 'var(--surface)', color: 'var(--text)' }}>
            <option value="all">All</option>
            <option value="sale">Sale</option>
            <option value="test">Test Dispense</option>
            <option value="spillage">Spillage</option>
          </select>
          <label style={{ fontSize: '12px', color: 'var(--text-3)' }}>Shift:</label>
          <select value={selectedShift} onChange={e => setSelectedShift(e.target.value)} style={{ fontSize: '12px', padding: '4px 8px', border: '1px solid var(--border-mid)', borderRadius: 'var(--radius)', background: 'var(--surface)', color: 'var(--text)' }}>
            <option value="all">All</option>
            <option value="morning">Morning (9AM–9PM)</option>
            <option value="night">Night (9PM–9AM)</option>
          </select>
          {(dateFrom || dateTo || selectedMachine !== 'all' || selectedEmployee !== 'all' || selectedType !== 'all' || selectedShift !== 'all') && (
            <button className="btn btn-outline btn-sm" onClick={clearFilters} style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px', padding: '4px 8px' }}>
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
                  <th>Type</th>
                  <th>Employee</th>
                  <th>Bill</th>
                  <th>Machine</th>
                  <th>Driver</th>
                  <th>Truck No</th>
                  <th>Customer</th>
                  <th>Mob</th>
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
                    <td>
                      <span style={{
                        fontSize: '10px', fontWeight: '600', padding: '2px 6px', borderRadius: '10px',
                        background: (f.entry_type || 'sale') === 'sale' ? 'var(--ok-soft)' : (f.entry_type || 'sale') === 'test' ? 'var(--hp-soft)' : 'var(--warn-soft)',
                        color: (f.entry_type || 'sale') === 'sale' ? 'var(--ok)' : (f.entry_type || 'sale') === 'test' ? 'var(--hp)' : 'var(--warn)',
                        whiteSpace: 'nowrap'
                      }}>
                        {(f.entry_type || 'sale') === 'sale' ? 'Sale' : (f.entry_type || 'sale') === 'test' ? 'Test' : 'Spill'}
                      </span>
                    </td>
                    <td>{f.employee}</td>
                    <td style={{ fontSize: '11px', fontWeight: '500', color: (f.bill_type || 'gst') === 'gst' ? 'var(--ok)' : 'var(--text-3)' }}>
                      {f.bill_type ? ((f.bill_type || 'gst') === 'gst' ? 'GST bill' : 'non GST') : '—'}
                    </td>
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
                    <td style={{ fontSize: '11px', fontFamily: 'var(--mono)', color: 'var(--text-2)' }}>{f.driver_ph || '—'}</td>
                    <td className="mono">{f.litres}L</td>
                    <td className="mono">₹{(f.actual || 0).toLocaleString('en-IN')}</td>
                    <td className="mono" style={{ color: 'var(--text-3)' }}>−₹{f.discount || 0}</td>
                    <td className="mono" style={{ fontWeight: '600' }}>₹{(f.final || 0).toLocaleString('en-IN')}</td>
                    <td style={{ fontSize: '12px' }}>
                      {f.payment === 'Cash + GPay'
                        ? `Cash ₹${(f.split_cash || 0).toLocaleString('en-IN')} + GPay ₹${(f.split_gpay || 0).toLocaleString('en-IN')}`
                        : f.payment === 'GPay + Cash Discount'
                        ? `GPay ₹${(f.split_gpay || 0).toLocaleString('en-IN')} (cash −₹${(f.split_cash || 0).toLocaleString('en-IN')})`
                        : f.payment}
                    </td>
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
