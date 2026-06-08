import React, { useState, useMemo } from 'react';
import { MACHINES } from '../config/machines';
import { Calendar, Filter, Download, TrendingUp, Fuel, Users, CreditCard, DollarSign } from 'lucide-react';

const machineList = Object.values(MACHINES);

export default function Reports({ fills }) {
  const today = new Date().toISOString().split('T')[0];
  const [fromDate, setFromDate] = useState(today);
  const [toDate, setToDate] = useState(today);
  const [selectedEmployee, setSelectedEmployee] = useState('all');

  const filtered = useMemo(() => {
    const from = new Date(fromDate);
    const to = new Date(toDate + 'T23:59:59');
    return fills.filter(f => {
      const d = new Date(f.ts);
      return d >= from && d <= to && (selectedEmployee === 'all' || f.employee === selectedEmployee);
    });
  }, [fills, fromDate, toDate, selectedEmployee]);

  const employees = useMemo(() => {
    const set = new Set();
    fills.forEach(f => set.add(f.employee));
    return [...set].sort();
  }, [fills]);

  // Group by employee then machine
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
      if (p === 'Cash') e.cash += f.final || 0;
      else if (p === 'GPay / UPI') e.gpay += f.final || 0;
      else e.credit += f.final || 0;
    });
    return map;
  }, [filtered]);

  // Per-employee totals
  const employeeTotals = useMemo(() => {
    const map = {};
    filtered.forEach(f => {
      if (!map[f.employee]) map[f.employee] = { litres: 0, amount: 0, count: 0, cash: 0, gpay: 0, credit: 0 };
      const e = map[f.employee];
      e.litres += f.litres || 0;
      e.amount += f.final || 0;
      e.count += 1;
      const p = f.payment || '';
      if (p === 'Cash') e.cash += f.final || 0;
      else if (p === 'GPay / UPI') e.gpay += f.final || 0;
      else e.credit += f.final || 0;
    });
    return map;
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

  const sortByMachine = (entries) => {
    return entries.sort((a, b) => machineOrder.indexOf(a[0]) - machineOrder.indexOf(b[0]));
  };

  return (
    <div style={{ maxWidth: '960px', margin: '0 auto' }}>
      <h1 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
        <TrendingUp size={20} /> Reports
      </h1>

      <div className="card card-pad" style={{ marginBottom: '16px' }}>
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <div className="fg" style={{ minWidth: '150px', flex: 1 }}>
            <label style={labelStyle}>From</label>
            <input type="date" value={fromDate} onChange={e => setFromDate(e.target.value)} style={inputStyle} />
          </div>
          <div className="fg" style={{ minWidth: '150px', flex: 1 }}>
            <label style={labelStyle}>To</label>
            <input type="date" value={toDate} onChange={e => setToDate(e.target.value)} style={inputStyle} />
          </div>
          <div className="fg" style={{ minWidth: '150px', flex: 1 }}>
            <label style={labelStyle}>Employee</label>
            <select value={selectedEmployee} onChange={e => setSelectedEmployee(e.target.value)} style={inputStyle}>
              <option value="all">All Employees</option>
              {employees.map(e => <option key={e} value={e}>{e}</option>)}
            </select>
          </div>
          <button onClick={() => { setFromDate(today); setToDate(today); setSelectedEmployee('all'); }} style={resetBtnStyle}>
            <Filter size={14} /> Reset
          </button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '10px', marginBottom: '16px' }}>
        <div className="card card-pad" style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '11px', color: 'var(--text-3)', marginBottom: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
            <Fuel size={12} /> Total Fills
          </div>
          <div style={{ fontSize: '22px', fontWeight: '600' }}>{summary.count}</div>
        </div>
        <div className="card card-pad" style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '11px', color: 'var(--text-3)', marginBottom: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
            <Fuel size={12} /> Total Litres
          </div>
          <div style={{ fontSize: '22px', fontWeight: '600' }}>{fmt(summary.litres)}</div>
        </div>
        <div className="card card-pad" style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '11px', color: 'var(--text-3)', marginBottom: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
            <DollarSign size={12} /> Total Revenue
          </div>
          <div style={{ fontSize: '22px', fontWeight: '600' }}>{formatINR(summary.amount)}</div>
        </div>
        <div className="card card-pad" style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '11px', color: 'var(--text-3)', marginBottom: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
            <Users size={12} /> Employees
          </div>
          <div style={{ fontSize: '22px', fontWeight: '600' }}>{Object.keys(byEmployee).length}</div>
        </div>
      </div>

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
                            <td style={tdStyle}>
                              <span style={{ color: mac?.themeColor || 'inherit', fontWeight: '500' }}>{mac?.name || mid}</span>
                            </td>
                            <td style={{ ...tdStyle, textAlign: 'right' }}>{data.count}</td>
                            <td style={{ ...tdStyle, textAlign: 'right', fontFamily: 'var(--mono)' }}>{fmt(data.litres)}</td>
                            <td style={{ ...tdStyle, textAlign: 'right', fontFamily: 'var(--mono)' }}>{formatINR(data.amount)}</td>
                          </tr>
                        );
                      })}
                      {machineEntries.length > 0 && (
                        <tr style={{ background: 'var(--bg)' }}>
                          <td colSpan={2} style={{ ...tdStyle, fontWeight: '600', textAlign: 'right', color: 'var(--text-2)' }}>Total</td>
                          <td style={{ ...tdStyle, textAlign: 'right', fontWeight: '600' }}>{empTotal?.count || 0}</td>
                          <td style={{ ...tdStyle, textAlign: 'right', fontWeight: '600', fontFamily: 'var(--mono)' }}>{fmt(empTotal?.litres || 0)}</td>
                          <td style={{ ...tdStyle, textAlign: 'right', fontWeight: '600', fontFamily: 'var(--mono)' }}>{formatINR(empTotal?.amount || 0)}</td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '16px', marginBottom: '16px' }}>
        <div className="card card-pad">
          <h2 style={{ fontSize: '14px', fontWeight: '600', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Users size={16} /> Employee Performance
          </h2>
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
          <h2 style={{ fontSize: '14px', fontWeight: '600', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <CreditCard size={16} /> Payment Collection
          </h2>
          {Object.keys(employeeTotals).length === 0 ? (
            <div style={{ textAlign: 'center', padding: '20px', color: 'var(--text-3)', fontSize: '13px' }}>No data</div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={tableStyle}>
                <thead>
                  <tr>
                    <th style={thStyle}>Employee</th>
                    <th style={{ ...thStyle, textAlign: 'right' }}>Cash</th>
                    <th style={{ ...thStyle, textAlign: 'right' }}>GPay/UPI</th>
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

      {filtered.length > 0 && (
        <div style={{ textAlign: 'center', marginTop: '8px', marginBottom: '24px' }}>
          <button onClick={() => {
            const rows = [['Date','Employee','Machine','Vehicle','Litres','Amount','Discount','Final','Payment']];
            filtered.forEach(f => {
              rows.push([new Date(f.ts).toLocaleDateString('en-IN'), f.employee, f.machine, f.vehicle, fmt(f.litres), f.actual, f.discount||0, f.final, f.payment]);
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

const labelStyle = {
  fontSize: '11px', fontWeight: '500', color: 'var(--text-2)', marginBottom: '4px', display: 'block',
};

const inputStyle = {
  width: '100%', padding: '8px 10px', border: '1px solid var(--border-mid)', borderRadius: 'var(--radius)',
  fontSize: '13px', color: 'var(--text)', background: 'var(--surface)', outline: 'none',
};

const resetBtnStyle = {
  display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '8px 12px',
  border: '1px solid var(--border-mid)', borderRadius: 'var(--radius)', background: 'var(--surface)',
  color: 'var(--text-2)', cursor: 'pointer', fontSize: '12px', fontWeight: '500', alignSelf: 'flex-end',
};

const tableStyle = {
  width: '100%', borderCollapse: 'collapse', fontSize: '13px',
};

const thStyle = {
  textAlign: 'left', padding: '8px 10px', borderBottom: '1px solid var(--border)',
  fontSize: '11px', fontWeight: '600', color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.04em',
  whiteSpace: 'nowrap',
};

const tdStyle = {
  padding: '8px 10px', borderBottom: '1px solid var(--border)',
};
