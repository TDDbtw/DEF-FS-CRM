import { useState, useMemo } from 'react';
import { MACHINES } from '../config/machines';
import { Filter, Download, TrendingUp, Fuel, Users, CreditCard, DollarSign, Sun, ArrowUp, ChevronLeft, ChevronRight } from 'lucide-react';
import { SHIFT_START, SHIFT_END } from '../config/constants';

const machineList = Object.values(MACHINES);

const getShiftType = (ts) => {
  const h = new Date(ts).getHours();
  return h >= SHIFT_START && h < SHIFT_END ? 'morning' : 'night';
};

const getShiftDay = (ts) => {
  const d = new Date(ts);
  if (d.getHours() < SHIFT_START) d.setDate(d.getDate() - 1);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

const fmtDate = (d) => d.toISOString().split('T')[0];
const todayStr = fmtDate(new Date());

const presets = [
  { label: 'Today', range: () => ({ from: todayStr, to: todayStr }) },
  { label: 'This Week', range: () => { const d = new Date(); d.setDate(d.getDate() - d.getDay()); return { from: fmtDate(d), to: todayStr }; }},
  { label: 'This Month', range: () => { const d = new Date(); d.setDate(1); return { from: fmtDate(d), to: todayStr }; }},
  { label: 'Last Month', range: () => { const d = new Date(); d.setMonth(d.getMonth() - 1); d.setDate(1); const e = new Date(); e.setDate(0); return { from: fmtDate(d), to: fmtDate(e) }; }},
  { label: 'Last 3 Months', range: () => { const d = new Date(); d.setMonth(d.getMonth() - 3); d.setDate(1); return { from: fmtDate(d), to: todayStr }; }},
];

export default function Reports({ fills }) {
  const [fromDate, setFromDate] = useState(todayStr);
  const [toDate, setToDate] = useState(todayStr);
  const [selectedEmployee, setSelectedEmployee] = useState('all');
  const [selectedShift, setSelectedShift] = useState('all');
  const [shiftPage, setShiftPage] = useState(0);
  const perPage = 6;

  const filtered = useMemo(() => {
    const from = fromDate ? new Date(fromDate) : null;
    const to = toDate ? new Date(toDate + 'T23:59:59') : null;
    return fills.filter(f => {
      const d = new Date(f.ts);
      const shiftType = getShiftType(f.ts);
      const shiftDay = getShiftDay(f.ts);
      if (selectedShift !== 'all') {
        if (shiftType !== selectedShift) return false;
        if (selectedShift === 'night') {
          const sd = new Date(shiftDay);
          if (from && sd < from) return false;
          if (to && sd > to) return false;
        } else {
          if (from && d < from) return false;
          if (to && d > to) return false;
        }
      } else {
        if (from && d < from) return false;
        if (to && d > to) return false;
      }
      if (selectedEmployee !== 'all' && f.employee !== selectedEmployee) return false;
      if (f.entry_type && f.entry_type !== 'sale') return false;
      return true;
    });
  }, [fills, fromDate, toDate, selectedEmployee, selectedShift]);

  const employees = useMemo(() => {
    const set = new Set();
    fills.forEach(f => set.add(f.employee));
    return [...set].sort();
  }, [fills]);

  const byEmployee = useMemo(() => {
    const map = {};
    filtered.forEach(f => {
      if (!map[f.employee]) map[f.employee] = {};
      if (!map[f.employee][f.machine]) map[f.employee][f.machine] = { litres: 0, amount: 0, count: 0, cash: 0, gpay: 0, credit: 0 };
      const e = map[f.employee][f.machine];
      e.litres += f.litres || 0;
      e.amount += f.final || 0;
      e.count += 1;
      const p = f.payment || '';
      if (p === 'Cash + GPay') { e.cash += f.split_cash || 0; e.gpay += f.split_gpay || 0; }
      else if (p === 'GPay + Cash Discount') { e.gpay += f.split_gpay || 0; e.cash -= f.split_cash || 0; }
      else if (p === 'Cash') e.cash += f.final || 0;
      else if (p === 'GPay') e.gpay += f.final || 0;
      else e.credit += f.final || 0;
    });
    return map;
  }, [filtered]);

  const employeeTotals = useMemo(() => {
    const map = {};
    filtered.forEach(f => {
      if (!map[f.employee]) map[f.employee] = { litres: 0, amount: 0, count: 0, cash: 0, gpay: 0, credit: 0 };
      const e = map[f.employee];
      e.litres += f.litres || 0;
      e.amount += f.final || 0;
      e.count += 1;
      const p = f.payment || '';
      if (p === 'Cash + GPay') { e.cash += f.split_cash || 0; e.gpay += f.split_gpay || 0; }
      else if (p === 'GPay + Cash Discount') { e.gpay += f.split_gpay || 0; e.cash -= f.split_cash || 0; }
      else if (p === 'Cash') e.cash += f.final || 0;
      else if (p === 'GPay') e.gpay += f.final || 0;
      else e.credit += f.final || 0;
    });
    return map;
  }, [filtered]);

  const shiftDays = useMemo(() => {
    const days = {};
    filtered.forEach(f => {
      const day = getShiftDay(f.ts);
      const shift = getShiftType(f.ts);
      if (!days[day]) days[day] = { morning: { count: 0, litres: 0, amount: 0, cash: 0, gpay: 0, credit: 0 }, night: { count: 0, litres: 0, amount: 0, cash: 0, gpay: 0, credit: 0 } };
      const s = days[day][shift];
      s.count += 1; s.litres += f.litres || 0; s.amount += f.final || 0;
      const p = f.payment || '';
      if (p === 'Cash + GPay') { s.cash += f.split_cash || 0; s.gpay += f.split_gpay || 0; }
      else if (p === 'GPay + Cash Discount') { s.gpay += f.split_gpay || 0; s.cash -= f.split_cash || 0; }
      else if (p === 'Cash') s.cash += f.final || 0;
      else if (p === 'GPay') s.gpay += f.final || 0;
      else s.credit += f.final || 0;
    });
    return Object.entries(days).sort((a, b) => b[0].localeCompare(a[0]));
  }, [filtered]);

  const paginatedShiftDays = shiftDays.slice(shiftPage * perPage, (shiftPage + 1) * perPage);
  const totalShiftPages = Math.ceil(shiftDays.length / perPage);

  const shiftTotals = useMemo(() => {
    const t = { morning: { count: 0, litres: 0, amount: 0, cash: 0, gpay: 0, credit: 0 }, night: { count: 0, litres: 0, amount: 0, cash: 0, gpay: 0, credit: 0 } };
    filtered.forEach(f => {
      const shift = getShiftType(f.ts);
      const s = t[shift];
      s.count += 1; s.litres += f.litres || 0; s.amount += f.final || 0;
      const p = f.payment || '';
      if (p === 'Cash + GPay') { s.cash += f.split_cash || 0; s.gpay += f.split_gpay || 0; }
      else if (p === 'GPay + Cash Discount') { s.gpay += f.split_gpay || 0; s.cash -= f.split_cash || 0; }
      else if (p === 'Cash') s.cash += f.final || 0;
      else if (p === 'GPay') s.gpay += f.final || 0;
      else s.credit += f.final || 0;
    });
    return t;
  }, [filtered]);

  const summary = useMemo(() => {
    let litres = 0, amount = 0, count = 0;
    filtered.forEach(f => { litres += f.litres || 0; amount += f.final || 0; count += 1; });
    return { litres, amount, count };
  }, [filtered]);

  const formatINR = (v) => '₹' + Math.round(v).toLocaleString('en-IN');
  const fmt = (v) => Math.round(v * 100) / 100;
  const machineOrder = machineList.map(m => m.id);
  const sortByMachine = (entries) => entries.sort((a, b) => machineOrder.indexOf(a[0]) - machineOrder.indexOf(b[0]));

  const fmtDay = (d) => {
    const dt = new Date(d + 'T09:00:00');
    return dt.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  const handlePreset = (fn) => { const { from, to } = fn(); setFromDate(from); setToDate(to); setShiftPage(0); };
  const resetAll = () => { setFromDate(todayStr); setToDate(todayStr); setSelectedEmployee('all'); setSelectedShift('all'); setShiftPage(0); };
  const scrollToTop = () => window.scrollTo({ top: 0, behavior: 'smooth' });

  return (
    <div style={{ maxWidth: '960px', margin: '0 auto', paddingBottom: '60px' }}>
      <h1 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
        <TrendingUp size={20} /> Reports
      </h1>

      {/* ── Filters ── */}
      <div className="card card-pad" style={{ marginBottom: '16px', position: 'sticky', top: '0', zIndex: 10, borderBottom: '1px solid var(--border)' }}>
        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '10px' }}>
          {presets.map(p => (
            <button key={p.label} onClick={() => handlePreset(p.range)} className="btn btn-sm btn-outline">{p.label}</button>
          ))}
          <button onClick={resetAll} className="btn btn-sm btn-outline"><Filter size={12} /> Reset</button>
        </div>
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <div className="fg" style={{ minWidth: '130px', flex: 1 }}>
            <label style={labelStyle}>From</label>
            <input type="date" value={fromDate} onChange={e => { setFromDate(e.target.value); setShiftPage(0); }} style={inputStyle} />
          </div>
          <div className="fg" style={{ minWidth: '130px', flex: 1 }}>
            <label style={labelStyle}>To</label>
            <input type="date" value={toDate} onChange={e => { setToDate(e.target.value); setShiftPage(0); }} style={inputStyle} />
          </div>
          <div className="fg" style={{ minWidth: '120px', flex: 1 }}>
            <label style={labelStyle}>Employee</label>
            <select value={selectedEmployee} onChange={e => { setSelectedEmployee(e.target.value); setShiftPage(0); }} style={inputStyle}>
              <option value="all">All</option>
              {employees.map(e => <option key={e} value={e}>{e}</option>)}
            </select>
          </div>
          <div className="fg" style={{ minWidth: '120px', flex: 1 }}>
            <label style={labelStyle}>Shift</label>
            <select value={selectedShift} onChange={e => { setSelectedShift(e.target.value); setShiftPage(0); }} style={inputStyle}>
              <option value="all">All shifts</option>
              <option value="morning">Morning (9AM–9PM)</option>
              <option value="night">Night (9PM–9AM)</option>
            </select>
          </div>
        </div>
      </div>

      {/* ── Summary Cards ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '10px', marginBottom: '16px' }}>
        {[
          { icon: <Fuel size={14} />, label: 'Fills', val: summary.count },
          { icon: <Fuel size={14} />, label: 'Litres', val: fmt(summary.litres) },
          { icon: <DollarSign size={14} />, label: 'Revenue', val: formatINR(summary.amount) },
          { icon: <Users size={14} />, label: 'Employees', val: Object.keys(byEmployee).length },
        ].map((c, i) => (
          <div key={i} className="card" style={{ padding: '14px', textAlign: 'center' }}>
            <div style={{ fontSize: '11px', color: 'var(--text-3)', marginBottom: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>{c.icon}{c.label}</div>
            <div style={{ fontSize: '20px', fontWeight: '600' }}>{c.val}</div>
          </div>
        ))}
      </div>

      {/* ── Shift Summary ── */}
      <div className="card card-pad" style={{ marginBottom: '16px' }}>
        <h2 style={sectionTitle}><Sun size={16} /> Sales by Shift</h2>
        {filtered.length === 0 ? (
          <div className="card-pad" style={{ textAlign: 'center', color: 'var(--text-3)' }}>No transactions</div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={tableStyle}>
              <thead>
                <tr>
                  <th style={thStyle}>Shift</th>
                  <th style={{ ...thStyle, textAlign: 'right' }}>Fills</th>
                  <th style={{ ...thStyle, textAlign: 'right' }}>Litres</th>
                  <th style={{ ...thStyle, textAlign: 'right' }}>Revenue</th>
                  <th style={{ ...thStyle, textAlign: 'right' }}>Cash</th>
                  <th style={{ ...thStyle, textAlign: 'right' }}>GPay</th>
                  <th style={{ ...thStyle, textAlign: 'right' }}>Credit</th>
                </tr>
              </thead>
              <tbody>
                {[['morning', 'Morning (9AM–9PM)'], ['night', 'Night (9PM–9AM)']].map(([key, label]) => {
                  const s = shiftTotals[key];
                  if (s.count === 0) return null;
                  return (
                    <tr key={key}>
                      <td style={{ ...tdStyle, fontWeight: '500' }}>{label}</td>
                      <td style={{ ...tdStyle, textAlign: 'right' }}>{s.count}</td>
                      <td style={{ ...tdStyle, textAlign: 'right', fontFamily: 'var(--mono)' }}>{fmt(s.litres)}</td>
                      <td style={{ ...tdStyle, textAlign: 'right', fontFamily: 'var(--mono)' }}>{formatINR(s.amount)}</td>
                      <td style={{ ...tdStyle, textAlign: 'right', fontFamily: 'var(--mono)' }}>{formatINR(s.cash)}</td>
                      <td style={{ ...tdStyle, textAlign: 'right', fontFamily: 'var(--mono)' }}>{formatINR(s.gpay)}</td>
                      <td style={{ ...tdStyle, textAlign: 'right', fontFamily: 'var(--mono)' }}>{formatINR(s.credit)}</td>
                    </tr>
                  );
                })}
                <tr style={{ background: 'var(--bg)' }}>
                  <td style={{ ...tdStyle, fontWeight: '600' }}>Day Total</td>
                  <td style={{ ...tdStyle, textAlign: 'right', fontWeight: '600' }}>{summary.count}</td>
                  <td style={{ ...tdStyle, textAlign: 'right', fontWeight: '600', fontFamily: 'var(--mono)' }}>{fmt(summary.litres)}</td>
                  <td style={{ ...tdStyle, textAlign: 'right', fontWeight: '600', fontFamily: 'var(--mono)' }}>{formatINR(summary.amount)}</td>
                  <td style={{ ...tdStyle, textAlign: 'right', fontWeight: '600', fontFamily: 'var(--mono)' }}>{formatINR(shiftTotals.morning.cash + shiftTotals.night.cash)}</td>
                  <td style={{ ...tdStyle, textAlign: 'right', fontWeight: '600', fontFamily: 'var(--mono)' }}>{formatINR(shiftTotals.morning.gpay + shiftTotals.night.gpay)}</td>
                  <td style={{ ...tdStyle, textAlign: 'right', fontWeight: '600', fontFamily: 'var(--mono)' }}>{formatINR(shiftTotals.morning.credit + shiftTotals.night.credit)}</td>
                </tr>
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Shift Day Detail with Pagination ── */}
      {shiftDays.length > 0 && (
        <div className="card card-pad" style={{ marginBottom: '16px' }}>
          <h2 style={sectionTitle}><Sun size={16} /> Shift Day Detail</h2>
          <div style={{ overflowX: 'auto' }}>
            <table style={tableStyle}>
              <thead>
                <tr>
                  <th style={thStyle}>Day</th>
                  <th style={thStyle}>Shift</th>
                  <th style={{ ...thStyle, textAlign: 'right' }}>Fills</th>
                  <th style={{ ...thStyle, textAlign: 'right' }}>Litres</th>
                  <th style={{ ...thStyle, textAlign: 'right' }}>Revenue</th>
                  <th style={{ ...thStyle, textAlign: 'right' }}>Cash</th>
                  <th style={{ ...thStyle, textAlign: 'right' }}>GPay</th>
                </tr>
              </thead>
              <tbody>
                {paginatedShiftDays.map(([day, data]) => {
                  const shifts = [['morning', 'Morning', data.morning], ['night', 'Night', data.night]].filter(([,,s]) => s.count > 0);
                  const dayTotal = {
                    count: data.morning.count + data.night.count,
                    litres: data.morning.litres + data.night.litres,
                    amount: data.morning.amount + data.night.amount,
                    cash: data.morning.cash + data.night.cash,
                    gpay: data.morning.gpay + data.night.gpay,
                  };
                  return shifts.map(([key, label, s], idx) => (
                    <tr key={day + key}>
                      {idx === 0 && (
                        <td rowSpan={shifts.length} style={{ ...tdStyle, fontWeight: '600', verticalAlign: 'top', whiteSpace: 'nowrap' }}>
                          {fmtDay(day)}
                        </td>
                      )}
                      <td style={{ ...tdStyle, color: key === 'night' ? 'var(--text-2)' : 'inherit' }}>{label}</td>
                      <td style={{ ...tdStyle, textAlign: 'right' }}>{s.count}</td>
                      <td style={{ ...tdStyle, textAlign: 'right', fontFamily: 'var(--mono)' }}>{fmt(s.litres)}</td>
                      <td style={{ ...tdStyle, textAlign: 'right', fontFamily: 'var(--mono)' }}>{formatINR(s.amount)}</td>
                      <td style={{ ...tdStyle, textAlign: 'right', fontFamily: 'var(--mono)' }}>{formatINR(s.cash)}</td>
                      <td style={{ ...tdStyle, textAlign: 'right', fontFamily: 'var(--mono)' }}>{formatINR(s.gpay)}</td>
                    </tr>
                  )).concat(
                    <tr key={day + '_tot'} style={{ background: 'var(--bg)' }}>
                      <td style={{ ...tdStyle }}></td>
                      <td style={{ ...tdStyle, fontWeight: '600', textAlign: 'right', color: 'var(--text-2)' }}>Day total</td>
                      <td style={{ ...tdStyle, textAlign: 'right', fontWeight: '600' }}>{dayTotal.count}</td>
                      <td style={{ ...tdStyle, textAlign: 'right', fontWeight: '600', fontFamily: 'var(--mono)' }}>{fmt(dayTotal.litres)}</td>
                      <td style={{ ...tdStyle, textAlign: 'right', fontWeight: '600', fontFamily: 'var(--mono)' }}>{formatINR(dayTotal.amount)}</td>
                      <td style={{ ...tdStyle, textAlign: 'right', fontWeight: '600', fontFamily: 'var(--mono)' }}>{formatINR(dayTotal.cash)}</td>
                      <td style={{ ...tdStyle, textAlign: 'right', fontWeight: '600', fontFamily: 'var(--mono)' }}>{formatINR(dayTotal.gpay)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {/* Pagination */}
          {totalShiftPages > 1 && (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '12px', marginTop: '12px' }}>
              <button disabled={shiftPage === 0} onClick={() => setShiftPage(p => Math.max(0, p - 1))}
                className="btn btn-sm btn-outline" style={{ opacity: shiftPage === 0 ? 0.4 : 1 }}>
                <ChevronLeft size={14} /> Prev
              </button>
              <span style={{ fontSize: '12px', color: 'var(--text-2)' }}>Page {shiftPage + 1} of {totalShiftPages}</span>
              <button disabled={shiftPage >= totalShiftPages - 1} onClick={() => setShiftPage(p => Math.min(totalShiftPages - 1, p + 1))}
                className="btn btn-sm btn-outline" style={{ opacity: shiftPage >= totalShiftPages - 1 ? 0.4 : 1 }}>
                Next <ChevronRight size={14} />
              </button>
            </div>
          )}
        </div>
      )}

      {/* ── Sales by Employee & Machine ── */}
      <div className="card card-pad" style={{ marginBottom: '16px' }}>
        <h2 style={sectionTitle}><Fuel size={16} /> Sales by Employee & Machine</h2>
        {Object.keys(byEmployee).length === 0 ? (
          <div className="card-pad" style={{ textAlign: 'center', color: 'var(--text-3)' }}>No transactions in this period</div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={tableStyle}>
              <thead>
                <tr>
                  <th style={thStyle}>Employee</th>
                  <th style={thStyle}>Machine</th>
                  <th style={{ ...thStyle, textAlign: 'right' }}>Fills</th>
                  <th style={{ ...thStyle, textAlign: 'right' }}>Litres</th>
                  <th style={{ ...thStyle, textAlign: 'right' }}>Revenue</th>
                  <th style={{ ...thStyle, textAlign: 'right' }}>Cash</th>
                  <th style={{ ...thStyle, textAlign: 'right' }}>GPay</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(byEmployee).map(([emp, machines]) => {
                  const empTotal = employeeTotals[emp];
                  const machineEntries = sortByMachine(Object.entries(machines));
                  return machineEntries.map(([mid, data], idx) => {
                    const mac = machineList.find(m => m.id === mid);
                    return (
                      <tr key={emp + mid}>
                        {idx === 0 && (
                          <td rowSpan={machineEntries.length} style={{ ...tdStyle, fontWeight: '600', verticalAlign: 'top' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <div style={{ width: '22px', height: '22px', borderRadius: '50%', background: 'var(--green-soft)', color: 'var(--green)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', fontWeight: '600' }}>
                                {emp.substring(0, 2)}
                              </div>
                              {emp}
                            </div>
                          </td>
                        )}
                        <td style={tdStyle}><span style={{ color: mac?.themeColor || 'inherit', fontWeight: '500' }}>{mac?.name || mid}</span></td>
                        <td style={{ ...tdStyle, textAlign: 'right' }}>{data.count}</td>
                        <td style={{ ...tdStyle, textAlign: 'right', fontFamily: 'var(--mono)' }}>{fmt(data.litres)}</td>
                        <td style={{ ...tdStyle, textAlign: 'right', fontFamily: 'var(--mono)' }}>{formatINR(data.amount)}</td>
                        <td style={{ ...tdStyle, textAlign: 'right', fontFamily: 'var(--mono)' }}>{formatINR(data.cash)}</td>
                        <td style={{ ...tdStyle, textAlign: 'right', fontFamily: 'var(--mono)' }}>{formatINR(data.gpay)}</td>
                      </tr>
                    );
                  }).concat(
                    <tr key={emp + '_tot'} style={{ background: 'var(--bg)' }}>
                      <td colSpan={2} style={{ ...tdStyle, fontWeight: '600', textAlign: 'right', color: 'var(--text-2)' }}>Total</td>
                      <td style={{ ...tdStyle, textAlign: 'right', fontWeight: '600' }}>{empTotal?.count || 0}</td>
                      <td style={{ ...tdStyle, textAlign: 'right', fontWeight: '600', fontFamily: 'var(--mono)' }}>{fmt(empTotal?.litres || 0)}</td>
                      <td style={{ ...tdStyle, textAlign: 'right', fontWeight: '600', fontFamily: 'var(--mono)' }}>{formatINR(empTotal?.amount || 0)}</td>
                      <td style={{ ...tdStyle, textAlign: 'right', fontWeight: '600', fontFamily: 'var(--mono)' }}>{formatINR(empTotal?.cash || 0)}</td>
                      <td style={{ ...tdStyle, textAlign: 'right', fontWeight: '600', fontFamily: 'var(--mono)' }}>{formatINR(empTotal?.gpay || 0)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Employee Performance + Payment Collection ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '16px', marginBottom: '16px' }}>
        <div className="card card-pad">
          <h2 style={sectionTitle}><Users size={16} /> Employee Performance</h2>
          {Object.keys(employeeTotals).length === 0 ? (
            <div className="card-pad" style={{ textAlign: 'center', color: 'var(--text-3)' }}>No data</div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={tableStyle}>
                <thead>
                  <tr>
                    <th style={thStyle}>Employee</th>
                    <th style={{ ...thStyle, textAlign: 'right' }}>Fills</th>
                    <th style={{ ...thStyle, textAlign: 'right' }}>Litres</th>
                    <th style={{ ...thStyle, textAlign: 'right' }}>Revenue</th>
                    <th style={{ ...thStyle, textAlign: 'right' }}>Avg/Fill</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(employeeTotals).map(([emp, d]) => (
                    <tr key={emp}>
                      <td style={{ ...tdStyle, fontWeight: '500' }}>{emp}</td>
                      <td style={{ ...tdStyle, textAlign: 'right' }}>{d.count}</td>
                      <td style={{ ...tdStyle, textAlign: 'right', fontFamily: 'var(--mono)' }}>{fmt(d.litres)}</td>
                      <td style={{ ...tdStyle, textAlign: 'right', fontFamily: 'var(--mono)' }}>{formatINR(d.amount)}</td>
                      <td style={{ ...tdStyle, textAlign: 'right', fontFamily: 'var(--mono)' }}>{d.count > 0 ? formatINR(d.amount / d.count) : '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="card card-pad">
          <h2 style={sectionTitle}><CreditCard size={16} /> Payment Collection</h2>
          {Object.keys(employeeTotals).length === 0 ? (
            <div className="card-pad" style={{ textAlign: 'center', color: 'var(--text-3)' }}>No data</div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={tableStyle}>
                <thead>
                  <tr>
                    <th style={thStyle}>Employee</th>
                    <th style={{ ...thStyle, textAlign: 'right' }}>Cash</th>
                    <th style={{ ...thStyle, textAlign: 'right' }}>GPay</th>
                    <th style={{ ...thStyle, textAlign: 'right' }}>Credit</th>
                    <th style={{ ...thStyle, textAlign: 'right' }}>Total</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(employeeTotals).map(([emp, d]) => (
                    <tr key={emp}>
                      <td style={{ ...tdStyle, fontWeight: '500' }}>{emp}</td>
                      <td style={{ ...tdStyle, textAlign: 'right', fontFamily: 'var(--mono)' }}>{formatINR(d.cash)}</td>
                      <td style={{ ...tdStyle, textAlign: 'right', fontFamily: 'var(--mono)' }}>{formatINR(d.gpay)}</td>
                      <td style={{ ...tdStyle, textAlign: 'right', fontFamily: 'var(--mono)' }}>{formatINR(d.credit)}</td>
                      <td style={{ ...tdStyle, textAlign: 'right', fontFamily: 'var(--mono)', fontWeight: '600' }}>{formatINR(d.amount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* ── CSV Export & Bottom Nav ── */}
      {filtered.length > 0 && (
        <div style={{ display: 'flex', justifyContent: 'center', gap: '12px', marginTop: '8px', marginBottom: '24px' }}>
          <button onClick={() => {
            const rows = [['Date','Shift Day','Shift Type','Employee','Bill','Machine','Vehicle','Litres','Amount','Discount','Final','Payment','Split Cash','Split GPay']];
            filtered.forEach(f => {
              rows.push([
                new Date(f.ts).toLocaleDateString('en-IN'),
                fmtDay(getShiftDay(f.ts)),
                getShiftType(f.ts) === 'morning' ? 'Morning' : 'Night',
                f.employee, f.bill_type ? ((f.bill_type || 'gst') === 'gst' ? 'GST bill' : 'non GST') : '', f.machine, f.vehicle, fmt(f.litres), f.actual, f.discount||0, f.final, f.payment, f.split_cash||0, f.split_gpay||0
              ]);
            });
            const csv = rows.map(r => r.join(',')).join('\n');
            const blob = new Blob([csv], { type: 'text/csv' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url; a.download = `report_${fromDate}_${toDate}.csv`;
            a.click(); URL.revokeObjectURL(url);
          }} className="btn btn-outline">
            <Download size={14} /> Export CSV
          </button>
          <button onClick={scrollToTop} className="btn btn-outline">
            <ArrowUp size={14} /> Back to top
          </button>
        </div>
      )}

      {/* ── Floating scroll-to-top ── */}
      <button onClick={scrollToTop} style={{
        position: 'fixed', bottom: '20px', right: '20px', zIndex: 20,
        width: '40px', height: '40px', borderRadius: '50%',
        background: 'var(--green)', color: '#fff', border: 'none',
        cursor: 'pointer', boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        opacity: '0.85', transition: 'opacity 0.15s',
      }}
      onMouseEnter={e => e.target.style.opacity = '1'}
      onMouseLeave={e => e.target.style.opacity = '0.85'}>
        <ArrowUp size={18} />
      </button>
    </div>
  );
}

const labelStyle = { fontSize: '11px', fontWeight: '500', color: 'var(--text-2)', marginBottom: '4px', display: 'block' };
const inputStyle = { width: '100%', padding: '8px 10px', border: '1px solid var(--border-mid)', borderRadius: 'var(--radius)', fontSize: '13px', color: 'var(--text)', background: 'var(--surface)', outline: 'none' };
const tableStyle = { width: '100%', borderCollapse: 'collapse', fontSize: '13px' };
const thStyle = { textAlign: 'left', padding: '8px 10px', borderBottom: '1px solid var(--border)', fontSize: '11px', fontWeight: '600', color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.04em', whiteSpace: 'nowrap' };
const tdStyle = { padding: '8px 10px', borderBottom: '1px solid var(--border)' };
const sectionTitle = { fontSize: '14px', fontWeight: '600', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '6px' };
