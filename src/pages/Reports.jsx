import React, { useState, useMemo } from 'react';
import { MACHINES } from '../config/machines';
import { Filter, Download, TrendingUp, Fuel, Users, CreditCard, DollarSign, Sun, Moon } from 'lucide-react';

const machineList = Object.values(MACHINES);

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

export default function Reports({ fills }) {
  const today = new Date().toISOString().split('T')[0];
  const [fromDate, setFromDate] = useState(today);
  const [toDate, setToDate] = useState(today);
  const [selectedEmployee, setSelectedEmployee] = useState('all');
  const [selectedShift, setSelectedShift] = useState('all');

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
      if (p === 'Cash + GPay') {
        e.cash += f.split_cash || 0;
        e.gpay += f.split_gpay || 0;
      } else if (p === 'GPay + Cash Discount') {
        e.gpay += f.split_gpay || 0;
        e.cash -= f.split_cash || 0;
      } else if (p === 'Cash') e.cash += f.final || 0;
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
      if (p === 'Cash + GPay') {
        e.cash += f.split_cash || 0;
        e.gpay += f.split_gpay || 0;
      } else if (p === 'GPay + Cash Discount') {
        e.gpay += f.split_gpay || 0;
        e.cash -= f.split_cash || 0;
      } else if (p === 'Cash') e.cash += f.final || 0;
      else if (p === 'GPay') e.gpay += f.final || 0;
      else e.credit += f.final || 0;
    });
    return map;
  }, [filtered]);

  // Shift grouping: group by shift day (9AM-9AM) then by shift type
  const shiftDays = useMemo(() => {
    const days = {};
    filtered.forEach(f => {
      const day = getShiftDay(f.ts);
      const shift = getShiftType(f.ts);
      if (!days[day]) days[day] = { morning: { count: 0, litres: 0, amount: 0, cash: 0, gpay: 0, credit: 0 }, night: { count: 0, litres: 0, amount: 0, cash: 0, gpay: 0, credit: 0 } };
      const s = days[day][shift];
      s.count += 1;
      s.litres += f.litres || 0;
      s.amount += f.final || 0;
      const p = f.payment || '';
      if (p === 'Cash + GPay') {
        s.cash += f.split_cash || 0;
        s.gpay += f.split_gpay || 0;
      } else if (p === 'GPay + Cash Discount') {
        s.gpay += f.split_gpay || 0;
        s.cash -= f.split_cash || 0;
      } else if (p === 'Cash') s.cash += f.final || 0;
      else if (p === 'GPay') s.gpay += f.final || 0;
      else s.credit += f.final || 0;
    });
    return Object.entries(days).sort((a, b) => b[0].localeCompare(a[0]));
  }, [filtered]);

  // Shift totals across all days
  const shiftTotals = useMemo(() => {
    const t = { morning: { count: 0, litres: 0, amount: 0, cash: 0, gpay: 0, credit: 0 }, night: { count: 0, litres: 0, amount: 0, cash: 0, gpay: 0, credit: 0 } };
    filtered.forEach(f => {
      const shift = getShiftType(f.ts);
      const s = t[shift];
      s.count += 1;
      s.litres += f.litres || 0;
      s.amount += f.final || 0;
      const p = f.payment || '';
      if (p === 'Cash + GPay') {
        s.cash += f.split_cash || 0;
        s.gpay += f.split_gpay || 0;
      } else if (p === 'GPay + Cash Discount') {
        s.gpay += f.split_gpay || 0;
        s.cash -= f.split_cash || 0;
      } else if (p === 'Cash') s.cash += f.final || 0;
      else if (p === 'GPay') s.gpay += f.final || 0;
      else s.credit += f.final || 0;
    });
    return t;
  }, [filtered]);

  const summary = useMemo(() => {
    let litres = 0, amount = 0, count = 0;
    filtered.forEach(f => {
      litres += f.litres || 0;
      amount += f.final || 0;
      count += 1;
    });
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

  return (
    <div style={{ maxWidth: '960px', margin: '0 auto' }}>
      <h1 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
        <TrendingUp size={20} /> Reports
      </h1>

      {/* Filters */}
      <div className="card card-pad" style={{ marginBottom: '16px' }}>
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <div className="fg" style={{ minWidth: '140px', flex: 1 }}>
            <label style={labelStyle}>From</label>
            <input type="date" value={fromDate} onChange={e => setFromDate(e.target.value)} style={inputStyle} />
          </div>
          <div className="fg" style={{ minWidth: '140px', flex: 1 }}>
            <label style={labelStyle}>To</label>
            <input type="date" value={toDate} onChange={e => setToDate(e.target.value)} style={inputStyle} />
          </div>
          <div className="fg" style={{ minWidth: '130px', flex: 1 }}>
            <label style={labelStyle}>Employee</label>
            <select value={selectedEmployee} onChange={e => setSelectedEmployee(e.target.value)} style={inputStyle}>
              <option value="all">All</option>
              {employees.map(e => <option key={e} value={e}>{e}</option>)}
            </select>
          </div>
          <div className="fg" style={{ minWidth: '130px', flex: 1 }}>
            <label style={labelStyle}>Shift</label>
            <select value={selectedShift} onChange={e => setSelectedShift(e.target.value)} style={inputStyle}>
              <option value="all">All shifts</option>
              <option value="morning">Morning (9AM–9PM)</option>
              <option value="night">Night (9PM–9AM)</option>
            </select>
          </div>
          <button onClick={() => { setFromDate(today); setToDate(today); setSelectedEmployee('all'); setSelectedShift('all'); }} style={resetBtnStyle}>
            <Filter size={14} /> Reset
          </button>
        </div>
      </div>

      {/* Summary */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '10px', marginBottom: '16px' }}>
        <div className="card card-pad" style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '11px', color: 'var(--text-3)', marginBottom: '4px' }}><Fuel size={12} style={{ marginRight: 4 }} />Fills</div>
          <div style={{ fontSize: '22px', fontWeight: '600' }}>{summary.count}</div>
        </div>
        <div className="card card-pad" style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '11px', color: 'var(--text-3)', marginBottom: '4px' }}><Fuel size={12} style={{ marginRight: 4 }} />Litres</div>
          <div style={{ fontSize: '22px', fontWeight: '600' }}>{fmt(summary.litres)}</div>
        </div>
        <div className="card card-pad" style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '11px', color: 'var(--text-3)', marginBottom: '4px' }}><DollarSign size={12} style={{ marginRight: 4 }} />Revenue</div>
          <div style={{ fontSize: '22px', fontWeight: '600' }}>{formatINR(summary.amount)}</div>
        </div>
        <div className="card card-pad" style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '11px', color: 'var(--text-3)', marginBottom: '4px' }}><Users size={12} style={{ marginRight: 4 }} />Employees</div>
          <div style={{ fontSize: '22px', fontWeight: '600' }}>{Object.keys(byEmployee).length}</div>
        </div>
      </div>

      {/* Shift Summary */}
      <div className="card card-pad" style={{ marginBottom: '16px' }}>
        <h2 style={{ fontSize: '14px', fontWeight: '600', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
          <Sun size={16} /> Sales by Shift (9AM–9AM day)
        </h2>
        {filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '20px', color: 'var(--text-3)', fontSize: '13px' }}>No transactions</div>
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
                {[['morning', '☀️ Morning (9AM–9PM)'], ['night', '🌙 Night (9PM–9AM)']].map(([key, label]) => {
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
                  <td style={{ ...tdStyle, fontWeight: '600' }}>📊 Day Total</td>
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

      {/* Shift Day Detail */}
      {shiftDays.length > 0 && (
        <div className="card card-pad" style={{ marginBottom: '16px' }}>
          <h2 style={{ fontSize: '14px', fontWeight: '600', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Sun size={16} /> Shift Day Detail
          </h2>
          <div style={{ overflowX: 'auto' }}>
            <table style={tableStyle}>
              <thead>
                <tr>
                  <th style={thStyle}>Day (9AM–9AM)</th>
                  <th style={thStyle}>Shift</th>
                  <th style={{ ...thStyle, textAlign: 'right' }}>Fills</th>
                  <th style={{ ...thStyle, textAlign: 'right' }}>Litres</th>
                  <th style={{ ...thStyle, textAlign: 'right' }}>Revenue</th>
                  <th style={{ ...thStyle, textAlign: 'right' }}>Cash</th>
                  <th style={{ ...thStyle, textAlign: 'right' }}>GPay</th>
                </tr>
              </thead>
              <tbody>
                {shiftDays.map(([day, data]) => {
                  const morning = data.morning;
                  const night = data.night;
                  const shifts = [['morning', '☀️ Morning', morning], ['night', '🌙 Night', night]].filter(([,,s]) => s.count > 0);
                  const dayTotal = {
                    count: morning.count + night.count,
                    litres: morning.litres + night.litres,
                    amount: morning.amount + night.amount,
                    cash: morning.cash + night.cash,
                    gpay: morning.gpay + night.gpay,
                  };
                  return (
                    <React.Fragment key={day}>
                      {shifts.map(([key, label, s], idx) => (
                        <tr key={day + key}>
                          {idx === 0 && (
                            <td rowSpan={shifts.length + 1} style={{ ...tdStyle, fontWeight: '600', verticalAlign: 'top', whiteSpace: 'nowrap' }}>
                              {fmtDay(day)}
                            </td>
                          )}
                          <td style={tdStyle}>{label}</td>
                          <td style={{ ...tdStyle, textAlign: 'right' }}>{s.count}</td>
                          <td style={{ ...tdStyle, textAlign: 'right', fontFamily: 'var(--mono)' }}>{fmt(s.litres)}</td>
                          <td style={{ ...tdStyle, textAlign: 'right', fontFamily: 'var(--mono)' }}>{formatINR(s.amount)}</td>
                          <td style={{ ...tdStyle, textAlign: 'right', fontFamily: 'var(--mono)' }}>{formatINR(s.cash)}</td>
                          <td style={{ ...tdStyle, textAlign: 'right', fontFamily: 'var(--mono)' }}>{formatINR(s.gpay)}</td>
                        </tr>
                      ))}
                      <tr style={{ background: 'var(--bg)' }}>
                        <td style={{ ...tdStyle }}></td>
                        <td style={{ ...tdStyle, fontWeight: '600', textAlign: 'right', color: 'var(--text-2)' }}>Day total</td>
                        <td style={{ ...tdStyle, textAlign: 'right', fontWeight: '600' }}>{dayTotal.count}</td>
                        <td style={{ ...tdStyle, textAlign: 'right', fontWeight: '600', fontFamily: 'var(--mono)' }}>{fmt(dayTotal.litres)}</td>
                        <td style={{ ...tdStyle, textAlign: 'right', fontWeight: '600', fontFamily: 'var(--mono)' }}>{formatINR(dayTotal.amount)}</td>
                        <td style={{ ...tdStyle, textAlign: 'right', fontWeight: '600', fontFamily: 'var(--mono)' }}>{formatINR(dayTotal.cash)}</td>
                        <td style={{ ...tdStyle, textAlign: 'right', fontWeight: '600', fontFamily: 'var(--mono)' }}>{formatINR(dayTotal.gpay)}</td>
                      </tr>
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Sales by Employee & Machine */}
      <div className="card card-pad" style={{ marginBottom: '16px' }}>
        <h2 style={{ fontSize: '14px', fontWeight: '600', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
          <Fuel size={16} /> Sales by Employee & Machine
        </h2>
        {Object.keys(byEmployee).length === 0 ? (
          <div style={{ textAlign: 'center', padding: '30px', color: 'var(--text-3)', fontSize: '13px' }}>No transactions in this period</div>
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
                </tr>
              </thead>
              <tbody>
                {Object.entries(byEmployee).map(([emp, machines]) => {
                  const empTotal = employeeTotals[emp];
                  const machineEntries = sortByMachine(Object.entries(machines));
                  return (
                    <React.Fragment key={emp}>
                      {machineEntries.map(([mid, data], idx) => {
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
                          </tr>
                        );
                      })}
                      <tr style={{ background: 'var(--bg)' }}>
                        <td colSpan={2} style={{ ...tdStyle, fontWeight: '600', textAlign: 'right', color: 'var(--text-2)' }}>Total</td>
                        <td style={{ ...tdStyle, textAlign: 'right', fontWeight: '600' }}>{empTotal?.count || 0}</td>
                        <td style={{ ...tdStyle, textAlign: 'right', fontWeight: '600', fontFamily: 'var(--mono)' }}>{fmt(empTotal?.litres || 0)}</td>
                        <td style={{ ...tdStyle, textAlign: 'right', fontWeight: '600', fontFamily: 'var(--mono)' }}>{formatINR(empTotal?.amount || 0)}</td>
                      </tr>
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Employee Performance + Payment Collection */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '16px', marginBottom: '16px' }}>
        <div className="card card-pad">
          <h2 style={{ fontSize: '14px', fontWeight: '600', marginBottom: '12px' }}><Users size={16} style={{ marginRight: 6 }} />Employee Performance</h2>
          {Object.keys(employeeTotals).length === 0 ? (
            <div style={{ textAlign: 'center', padding: '20px', color: 'var(--text-3)', fontSize: '13px' }}>No data</div>
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
          <h2 style={{ fontSize: '14px', fontWeight: '600', marginBottom: '12px' }}><CreditCard size={16} style={{ marginRight: 6 }} />Payment Collection</h2>
          {Object.keys(employeeTotals).length === 0 ? (
            <div style={{ textAlign: 'center', padding: '20px', color: 'var(--text-3)', fontSize: '13px' }}>No data</div>
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

      {/* CSV Export */}
      {filtered.length > 0 && (
        <div style={{ textAlign: 'center', marginTop: '8px', marginBottom: '24px' }}>
          <button onClick={() => {
            const rows = [['Date','Shift Day','Shift Type','Employee','Machine','Vehicle','Litres','Amount','Discount','Final','Payment','Split Cash','Split GPay']];
            filtered.forEach(f => {
              rows.push([
                new Date(f.ts).toLocaleDateString('en-IN'),
                fmtDay(getShiftDay(f.ts)),
                getShiftType(f.ts) === 'morning' ? 'Morning' : 'Night',
                f.employee, f.machine, f.vehicle, fmt(f.litres), f.actual, f.discount||0, f.final, f.payment, f.split_cash||0, f.split_gpay||0
              ]);
            });
            const csv = rows.map(r => r.join(',')).join('\n');
            const blob = new Blob([csv], { type: 'text/csv' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url; a.download = `report_${fromDate}_${toDate}.csv`;
            a.click(); URL.revokeObjectURL(url);
          }} style={{
            display: 'inline-flex', alignItems: 'center', gap: '6px',
            padding: '8px 16px', border: '1px solid var(--border-mid)',
            borderRadius: 'var(--radius)', background: 'var(--surface)',
            color: 'var(--text-2)', cursor: 'pointer', fontSize: '12px', fontWeight: '500',
          }}>
            <Download size={14} /> Export CSV
          </button>
        </div>
      )}
    </div>
  );
}

const labelStyle = { fontSize: '11px', fontWeight: '500', color: 'var(--text-2)', marginBottom: '4px', display: 'block' };
const inputStyle = { width: '100%', padding: '8px 10px', border: '1px solid var(--border-mid)', borderRadius: 'var(--radius)', fontSize: '13px', color: 'var(--text)', background: 'var(--surface)', outline: 'none' };
const resetBtnStyle = { display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '8px 12px', border: '1px solid var(--border-mid)', borderRadius: 'var(--radius)', background: 'var(--surface)', color: 'var(--text-2)', cursor: 'pointer', fontSize: '12px', fontWeight: '500', alignSelf: 'flex-end' };
const tableStyle = { width: '100%', borderCollapse: 'collapse', fontSize: '13px' };
const thStyle = { textAlign: 'left', padding: '8px 10px', borderBottom: '1px solid var(--border)', fontSize: '11px', fontWeight: '600', color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.04em', whiteSpace: 'nowrap' };
const tdStyle = { padding: '8px 10px', borderBottom: '1px solid var(--border)' };
