import { useState } from 'react';
import { Download, Calendar, X, ChevronLeft, ChevronRight, Filter } from 'lucide-react';
import { MACHINES } from '../config/machines';
import { SHIFT_START, SHIFT_END, SHIFT_GRACE, EMPLOYEE_INITIALS } from '../config/constants';

const getShiftType = (ts) => {
  const d = new Date(ts);
  const totalMin = d.getHours() * 60 + d.getMinutes();
  const startMin = SHIFT_START * 60;
  const endMin = SHIFT_END * 60;
  return totalMin >= startMin + SHIFT_GRACE && totalMin < endMin + SHIFT_GRACE ? 'morning' : 'night';
};

const getShiftDay = (ts, shiftType) => {
  const d = new Date(ts);
  const offsetMinutes = (SHIFT_START * 60) + SHIFT_GRACE + (shiftType === 'night' ? 60 : 0);
  const shiftD = new Date(d.getTime() - offsetMinutes * 60000);
  const y = shiftD.getFullYear();
  const m = String(shiftD.getMonth() + 1).padStart(2, '0');
  const day = String(shiftD.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

const getFillShift = (f) => {
  const s = f.shift;
  if (s === 'morning' || s === 'night') return s;
  return getShiftType(f.ts);
};

const fmtDate = (d) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};
const todayStr = fmtDate(new Date());

const fmtDay = (d) => {
  const dt = new Date(d + 'T09:00:00');
  return dt.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
};

const presets = [
  { label: 'Today',       range: () => ({ from: todayStr, to: todayStr }) },
  { label: 'Yesterday',  range: () => { const d = new Date(); d.setDate(d.getDate() - 1); const s = fmtDate(d); return { from: s, to: s }; }},
  { label: 'This Week',  range: () => { const d = new Date(); d.setDate(d.getDate() - d.getDay()); return { from: fmtDate(d), to: todayStr }; }},
  { label: 'This Month', range: () => { const d = new Date(); d.setDate(1); return { from: fmtDate(d), to: todayStr }; }},
  { label: 'Last Month', range: () => { const d = new Date(); d.setMonth(d.getMonth()-1); d.setDate(1); const e = new Date(); e.setDate(0); return { from: fmtDate(d), to: fmtDate(e) }; }},
];

function Chip({ label, onRemove }) {
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: '5px',
      background: 'var(--bg)', border: '1px solid var(--border-mid)',
      borderRadius: '20px', padding: '3px 10px 3px 10px',
      fontSize: '11px', fontWeight: '500', color: 'var(--text-2)',
    }}>
      {label}
      <button onClick={onRemove} style={{
        display: 'flex', alignItems: 'center', background: 'none',
        border: 'none', cursor: 'pointer', padding: '0',
        color: 'var(--text-3)', lineHeight: 1,
      }}>
        <X size={11} />
      </button>
    </span>
  );
}

export default function FillHistory({ fills, triggerToast }) {
  const [dateFrom, setDateFrom] = useState(todayStr);
  const [dateTo, setDateTo] = useState(todayStr);
  const [selectedMachine, setSelectedMachine] = useState('all');
  const [selectedEmployee, setSelectedEmployee] = useState('all');
  const [selectedType, setSelectedType] = useState('all');
  const [selectedShift, setSelectedShift] = useState('all');
  const [showCustom, setShowCustom] = useState(false);

  const employees = [...new Set(fills.map(f => f.employee))].sort();

  const sortedFills = [...fills].sort((a, b) => new Date(b.ts) - new Date(a.ts));

  const filteredFills = sortedFills.filter(f => {
    // Shift-aware boundaries: a "day" runs from 9 AM to next-day 9 AM.
    const from = dateFrom ? new Date(dateFrom + 'T09:00:00') : null;
    const toBase = dateTo ? new Date(dateTo + 'T09:00:00') : null;
    if (toBase) toBase.setDate(toBase.getDate() + 1);
    const to = toBase;

    const shiftType = getFillShift(f);
    const sd = getShiftDay(f.ts, shiftType);
    const shiftDayDate = new Date(sd + 'T09:00:00'); // shift day starts at 9 AM

    if (from && shiftDayDate < from) return false;
    if (to && shiftDayDate >= to) return false;
    if (selectedShift !== 'all' && shiftType !== selectedShift) return false;
    if (selectedMachine !== 'all' && f.machine !== selectedMachine) return false;
    if (selectedEmployee !== 'all' && f.employee !== selectedEmployee) return false;
    if (selectedType !== 'all' && (f.entry_type || 'sale') !== selectedType) return false;
    
    // DEBUG LOG
    console.log(`Fill: ${f.ts} | Local: ${new Date(f.ts).toLocaleString('en-IN')} | ShiftDay: ${sd} | shiftDayDate: ${shiftDayDate.toLocaleString('en-IN')} | from: ${from ? from.toLocaleString('en-IN') : 'null'}`);
    
    return true;
  });

  const navigateDay = (dir) => {
    const f = new Date(dateFrom);
    const t = new Date(dateTo);
    f.setDate(f.getDate() + dir);
    t.setDate(t.getDate() + dir);
    if (t > new Date()) return;
    setDateFrom(fmtDate(f));
    setDateTo(fmtDate(t));
  };

  const handlePreset = (fn) => { const { from, to } = fn(); setDateFrom(from); setDateTo(to); };

  const clearFilters = () => {
    setDateFrom(todayStr);
    setDateTo(todayStr);
    setSelectedMachine('all');
    setSelectedEmployee('all');
    setSelectedType('all');
    setSelectedShift('all');
    setShowCustom(false);
  };

  const isDefaultRange = dateFrom === todayStr && dateTo === todayStr;
  const hasFilters = !isDefaultRange || selectedMachine !== 'all' || selectedEmployee !== 'all' || selectedType !== 'all' || selectedShift !== 'all';

  const exportCSV = () => {
    if (filteredFills.length === 0) return;

    try {
      const headers = [
        'Type', 'Driver', 'Truck No', 'Machine', 'Customer', 'Mob', 'Odometer',
        'Date', 'Litres', 'RATE', 'Amount', 'Final Collect', '       ',
        'Payment', '       ', 'Employee', 'Bill', 'Discount', 'Split Cash',
        'Split GPay', 'Shift', 'State', 'Company Phone', 'Totalizer Readings', 'Remarks'
      ];

      const rows = filteredFills.map(f => {
        const tots = Object.entries(f.totalizers || {})
          .map(([k, v]) => `${k.toUpperCase()}:${v}`)
          .join(' | ');
        return [
          f.entry_type || 'sale', f.driver, f.vehicle,
          MACHINES[f.machine]?.name || f.machine.toUpperCase(),
          f.company || '', f.driver_ph || '', f.odo || '',
          new Date(f.ts).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }).replace(' ', '-'),
          f.litres,
          f.litres && f.actual ? Math.round(f.actual / f.litres) : '',
          f.actual, f.final, ' ',
          f.payment == 'Cash + GPay' ? 'C+GPAY' : f.payment,
          f.payment == 'Cash + GPay' ? `${f.split_cash} + ${f.split_gpay}` : '',
          EMPLOYEE_INITIALS[f.employee?.toLowerCase()] || f.employee,
          f.bill_type ? ((f.bill_type || 'gst') === 'gst' ? 'GST bill' : 'non GST') : '',
          f.discount, f.split_cash || '', f.split_gpay || '',
          f.shift, f.state, f.co_ph || '', tots, f.notes || ''
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
      triggerToast('CSV export failed. Please try again.', 'warn');
    }
  };

  return (
    <div>
      {/* Page header */}
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

      {/* Filter card */}
      <div className="card" style={{ marginBottom: '12px', padding: '14px 16px' }}>

        {/* Row 1: presets + arrows */}
        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', alignItems: 'center', marginBottom: '10px' }}>
          {presets.map(p => (
            <button
              key={p.label}
              onClick={() => handlePreset(p.range)}
              className="btn btn-sm btn-outline"
              style={dateFrom === dateTo && fmtDate(new Date(p.range().from + 'T12:00:00')) === dateFrom ? { background: 'var(--green-soft)', color: 'var(--green)', borderColor: 'var(--green)' } : {}}
            >
              {p.label}
            </button>
          ))}
          <button
            onClick={() => setShowCustom(v => !v)}
            className={`btn btn-sm ${showCustom ? 'btn-primary' : 'btn-outline'}`}
            title="Custom date range"
          >
            <Filter size={12} /> Custom
          </button>

          <span style={{ flex: 1 }} />

          {/* Date label */}
          <span style={{ fontSize: '12px', color: 'var(--text-2)', fontWeight: '500' }}>
            {dateFrom === dateTo ? fmtDay(dateFrom) : `${fmtDay(dateFrom)} – ${fmtDay(dateTo)}`}
          </span>

          {/* Arrows */}
          <button onClick={() => navigateDay(-1)} className="btn btn-sm btn-outline" title="Previous day">
            <ChevronLeft size={14} />
          </button>
          <button
            onClick={() => navigateDay(1)}
            className="btn btn-sm btn-outline"
            title="Next day"
            disabled={new Date(dateTo) >= new Date(todayStr)}
          >
            <ChevronRight size={14} />
          </button>
        </div>

        {/* Custom date pickers (hidden by default) */}
        {showCustom && (
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'flex-end', marginBottom: '10px', paddingBottom: '10px', borderBottom: '1px solid var(--border)' }}>
            <div className="fg" style={{ minWidth: '130px' }}>
              <label style={lbl}><Calendar size={10} style={{ display: 'inline', marginRight: 3 }} />From</label>
              <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} style={inp} />
            </div>
            <div className="fg" style={{ minWidth: '130px' }}>
              <label style={lbl}>To</label>
              <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} style={inp} />
            </div>
          </div>
        )}

        {/* Row 2: dropdowns */}
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <div style={divider} />

          {/* Dropdowns */}
          <div className="fg" style={{ minWidth: '110px' }}>
            <label style={lbl}>Machine</label>
            <select value={selectedMachine} onChange={e => setSelectedMachine(e.target.value)} style={inp}>
              <option value="all">All</option>
              {Object.values(MACHINES).map(m => (
                <option key={m.id} value={m.id}>{m.name}</option>
              ))}
            </select>
          </div>

          <div className="fg" style={{ minWidth: '110px' }}>
            <label style={lbl}>Employee</label>
            <select value={selectedEmployee} onChange={e => setSelectedEmployee(e.target.value)} style={inp}>
              <option value="all">All</option>
              {employees.map(emp => (
                <option key={emp} value={emp}>{emp}</option>
              ))}
            </select>
          </div>

          <div className="fg" style={{ minWidth: '100px' }}>
            <label style={lbl}>Type</label>
            <select value={selectedType} onChange={e => setSelectedType(e.target.value)} style={inp}>
              <option value="all">All</option>
              <option value="sale">Sale</option>
              <option value="test">Test Dispense</option>
              <option value="spillage">Spillage</option>
            </select>
          </div>

          <div className="fg" style={{ minWidth: '135px' }}>
            <label style={lbl}>Shift</label>
            <select value={selectedShift} onChange={e => setSelectedShift(e.target.value)} style={inp}>
              <option value="all">All shifts</option>
              <option value="morning">☀️ Morning (9AM–9PM)</option>
              <option value="night">🌙 Night (9PM–9AM)</option>
            </select>
          </div>

          <div style={divider} />

          {/* Count + clear */}
          <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', gap: '5px' }}>
            <div style={{ fontSize: '11px', color: 'var(--text-3)', whiteSpace: 'nowrap' }}>
              <span style={{ fontWeight: '600', color: 'var(--text)', fontSize: '14px' }}>
                {filteredFills.length}
              </span>
              {' / '}{sortedFills.length} entries
            </div>
            {hasFilters && (
              <button
                className="btn btn-outline btn-sm"
                onClick={clearFilters}
                style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px', padding: '4px 10px', whiteSpace: 'nowrap' }}
              >
                <X size={11} /> Reset
              </button>
            )}
          </div>
          <div style={divider} />
        </div>

        {/* Active filter chips */}
        {hasFilters && (
          <div style={{
            display: 'flex', gap: '6px', flexWrap: 'wrap',
            marginTop: '10px', paddingTop: '10px',
            borderTop: '1px solid var(--border)',
          }}>
            {!isDefaultRange && <Chip label={dateFrom === dateTo ? fmtDay(dateFrom) : `${fmtDay(dateFrom)} – ${fmtDay(dateTo)}`} onRemove={() => { setDateFrom(todayStr); setDateTo(todayStr); }} />}
            {selectedMachine !== 'all' && (
              <Chip
                label={`Machine: ${MACHINES[selectedMachine]?.name || selectedMachine}`}
                onRemove={() => setSelectedMachine('all')}
              />
            )}
            {selectedEmployee !== 'all' && (
              <Chip label={`Employee: ${selectedEmployee}`} onRemove={() => setSelectedEmployee('all')} />
            )}
            {selectedType !== 'all' && (
              <Chip label={`Type: ${selectedType}`} onRemove={() => setSelectedType('all')} />
            )}
            {selectedShift !== 'all' && (
              <Chip
                label={selectedShift === 'morning' ? '☀️ Morning shift' : '🌙 Night shift'}
                onRemove={() => setSelectedShift('all')}
              />
            )}
          </div>
        )}
      </div>

      {/* Table */}
      <div className="card">
        <div className="table-wrap">
          {filteredFills.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '30px', color: 'var(--text-3)' }}>
              {sortedFills.length === 0
                ? 'No fill transactions recorded yet.'
                : 'No records match the selected filters.'}
            </div>
          ) : (
            <table id="history-table">
              <thead>
                <tr>
                  <th>Date &amp; Time</th>
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
                        day: 'numeric', month: 'short',
                        hour: '2-digit', minute: '2-digit',
                      })}
                    </td>
                    <td>
                      <span style={{
                        fontSize: '10px', fontWeight: '600', padding: '2px 6px', borderRadius: '10px', whiteSpace: 'nowrap',
                        background: (f.entry_type || 'sale') === 'sale' ? 'var(--ok-soft)' : (f.entry_type || 'sale') === 'test' ? 'var(--hp-soft)' : 'var(--warn-soft)',
                        color:      (f.entry_type || 'sale') === 'sale' ? 'var(--ok)'      : (f.entry_type || 'sale') === 'test' ? 'var(--hp)'      : 'var(--warn)',
                      }}>
                        {(f.entry_type || 'sale') === 'sale' ? 'Sale' : (f.entry_type || 'sale') === 'test' ? 'Test' : 'Spill'}
                      </span>
                    </td>
                    <td>{f.employee}</td>
                    <td style={{ fontSize: '11px', fontWeight: '500', color: (f.bill_type || 'gst') === 'gst' ? 'var(--ok)' : 'var(--text-3)' }}>
                      {f.bill_type ? ((f.bill_type || 'gst') === 'gst' ? 'GST bill' : 'non GST') : '—'}
                    </td>
                    <td>
                      <span className={f.machine === 'hp' ? 'pill-hp' : f.machine === 'cb' ? 'pill-cb' : 'pill-warn'}>
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

const lbl = { fontSize: '11px', fontWeight: '500', color: 'var(--text-2)', marginBottom: '4px', display: 'block' };
const inp = { width: '100%', padding: '7px 10px', border: '1px solid var(--border-mid)', borderRadius: 'var(--radius)', fontSize: '12px', color: 'var(--text)', background: 'var(--surface)', outline: 'none' };
const divider = { width: '1px', background: 'var(--border)', alignSelf: 'stretch', margin: '0 2px' };
