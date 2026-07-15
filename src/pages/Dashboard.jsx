import { useState, useMemo, useEffect } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { MACHINES } from '../config/machines';
import { ACTIVE_DAYS } from '../config/constants';
import { getShiftDay, getTodayShiftDay, getFillShift } from '../config/shiftDay';

export default function Dashboard({ customers, fills }) {
  // Business day boundary (9 AM cutoff), not plain calendar midnight.
  const todayShiftDay = getTodayShiftDay();

  // Helper: customer status count
  const getAlertsCount = () => {
    return customers.filter(c => {
      const custFills = fills
        .filter(f => (f.vehicle || '').toUpperCase() === (c.vehicle || '').toUpperCase())
        .sort((a, b) => new Date(b.ts) - new Date(a.ts));
        
      if (custFills.length === 0) return false;
      const lastFill = custFills[0];
      const diffMs = Date.now() - new Date(lastFill.ts).getTime();
      const days = Math.floor(diffMs / 86400000);
      return days > ACTIVE_DAYS;
    }).length;
  };

  const today = new Date();
  const [chartMonth, setChartMonth] = useState(() => new Date(today.getFullYear(), today.getMonth(), 1));
  const [chartMode, setChartMode] = useState('revenue');
  const [chartDayMode, setChartDayMode] = useState('calendar');
  const [chartMachine, setChartMachine] = useState('all');
  const [chartShift, setChartShift] = useState('all');
  const [page, setPage] = useState(0);
  const pageSize = 10;

  // Filter transactions for today's business day
  const todayFills = useMemo(() => fills.filter(f => getShiftDay(f.ts) === todayShiftDay), [fills, todayShiftDay]);
  const sortedTodayFills = useMemo(
    () => [...todayFills].sort((a, b) => new Date(b.ts) - new Date(a.ts)),
    [todayFills]
  );
  const totalPages = Math.max(1, Math.ceil(sortedTodayFills.length / pageSize));
  const pagedFills = sortedTodayFills.slice(page * pageSize, (page + 1) * pageSize);
  useEffect(() => { setPage(0); }, [todayFills]);

  // Calculate today's stats
  const totalFillsCount = todayFills.length;
  const totalLitres = todayFills.reduce((sum, f) => sum + (f.litres || 0), 0);
  const totalRevenue = todayFills.reduce((sum, f) => sum + (f.final || 0), 0);
  const alertsCount = getAlertsCount();

  // Dynamic progress percentages for machines
  const totalFillsForMachines = totalFillsCount || 1;
  
  // Dynamic payment calculations
  const cashAmt = todayFills.filter(f => f.payment === 'Cash').reduce((sum, f) => sum + (f.final || 0), 0);
  const gpayAmt = todayFills.filter(f => f.payment === 'GPay').reduce((sum, f) => sum + (f.final || 0), 0);
  const creditAmt = todayFills.filter(f => f.payment === 'Credit').reduce((sum, f) => sum + (f.final || 0), 0);
  const totalPaymentAmt = cashAmt + gpayAmt + creditAmt || 1;

  const monthData = useMemo(() => {
    const year = chartMonth.getFullYear();
    const month = chartMonth.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const daily = [];
    let maxVal = 0;
    for (let d = 1; d <= daysInMonth; d++) {
      const shiftDate = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      const dayFills = fills.filter(f => {
        if (chartMachine !== 'all' && f.machine !== chartMachine) return false;
        if (chartDayMode === 'company') {
          if (getShiftDay(f.ts) !== shiftDate) return false;
          if (chartShift !== 'all' && getFillShift(f) !== chartShift) return false;
          return true;
        }
        const ft = new Date(f.ts);
        return ft.getFullYear() === year && ft.getMonth() === month && ft.getDate() === d;
      });
      const val = chartMode === 'revenue'
        ? dayFills.reduce((s, f) => s + (f.final || 0), 0)
        : dayFills.reduce((s, f) => s + (f.litres || 0), 0);
      daily.push({ day: d, value: val });
      if (val > maxVal) maxVal = val;
    }
    return { daily, maxVal };
  }, [fills, chartMonth, chartMode, chartDayMode, chartMachine, chartShift]);

  const fmtMonth = (d) =>
    d.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });

  const prevMonth = () => setChartMonth(new Date(chartMonth.getFullYear(), chartMonth.getMonth() - 1, 1));
  const nextMonth = () => {
    const next = new Date(chartMonth.getFullYear(), chartMonth.getMonth() + 1, 1);
    if (next <= new Date()) setChartMonth(next);
  };

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
          <div className="stat-val">₹{totalRevenue.toLocaleString('en-IN')}</div>
          <div className="stat-sub">After auto discounts</div>
        </div>
        <div className={`stat-card ${alertsCount > 0 ? 'warn' : ''}`}>
          <div className="stat-label">Customer Alerts</div>
          <div className="stat-val">{alertsCount}</div>
          <div className="stat-sub">Dormant customers</div>
        </div>
      </div>

      {/* ── Monthly Sales Chart ── */}
      <div className="card card-pad" style={{ marginBottom: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
          <button onClick={prevMonth} className="btn btn-sm btn-outline"><ChevronLeft size={14} /></button>
          <span style={{ fontWeight: '600', fontSize: '14px', flex: 1 }}>{fmtMonth(chartMonth)}</span>
          <button onClick={nextMonth} className="btn btn-sm btn-outline" disabled={chartMonth.getMonth() >= today.getMonth() && chartMonth.getFullYear() >= today.getFullYear()}>
            <ChevronRight size={14} />
          </button>
          <div
            onClick={() => {
              const next = chartDayMode === 'calendar' ? 'company' : 'calendar';
              setChartDayMode(next);
              if (next === 'calendar') setChartShift('all');
            }}
            style={{
              position: 'relative',
              display: 'flex',
              alignItems: 'center',
              padding: '2px',
              borderRadius: '20px',
              background: 'var(--bg)',
              cursor: 'pointer',
              fontSize: '10px',
              fontWeight: '600',
              letterSpacing: '0.3px',
              textTransform: 'uppercase',
              userSelect: 'none',
              width: '108px',
              height: '26px',
              flexShrink: 0,
            }}
          >
            <div
              style={{
                position: 'absolute',
                top: '2px',
                left: chartDayMode === 'calendar' ? '2px' : 'calc(50% + 1px)',
                width: 'calc(50% - 2px)',
                height: 'calc(100% - 4px)',
                background: 'var(--surface)',
                borderRadius: '20px',
                boxShadow: '0 1px 4px rgba(0,0,0,0.1)',
                transition: 'left 0.25s ease',
                zIndex: 0,
              }}
            />
            <span
              style={{
                flex: 1,
                textAlign: 'center',
                position: 'relative',
                zIndex: 1,
                color: chartDayMode === 'calendar' ? 'var(--text-1)' : 'var(--text-3)',
                transition: 'color 0.2s',
              }}
            >Day</span>
            <span
              style={{
                flex: 1,
                textAlign: 'center',
                position: 'relative',
                zIndex: 1,
                color: chartDayMode === 'company' ? 'var(--text-1)' : 'var(--text-3)',
                transition: 'color 0.2s',
              }}
            >Shift</span>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '14px', alignItems: 'center' }}>
          <div
            onClick={() => setChartMode(chartMode === 'revenue' ? 'litres' : 'revenue')}
            style={{
              position: 'relative',
              display: 'flex',
              alignItems: 'center',
              padding: '2px',
              borderRadius: '20px',
              background: 'var(--bg)',
              cursor: 'pointer',
              fontSize: '10px',
              fontWeight: '600',
              letterSpacing: '0.3px',
              textTransform: 'uppercase',
              userSelect: 'none',
              width: '100px',
              height: '26px',
              flexShrink: 0,
            }}
          >
            <div
              style={{
                position: 'absolute',
                top: '2px',
                left: chartMode === 'revenue' ? '2px' : 'calc(50% + 1px)',
                width: 'calc(50% - 2px)',
                height: 'calc(100% - 4px)',
                background: 'var(--surface)',
                borderRadius: '20px',
                boxShadow: '0 1px 4px rgba(0,0,0,0.1)',
                transition: 'left 0.25s ease',
                zIndex: 0,
              }}
            />
            <span style={{ flex: 1, textAlign: 'center', position: 'relative', zIndex: 1, color: chartMode === 'revenue' ? 'var(--text-1)' : 'var(--text-3)', transition: 'color 0.2s' }}>₹ Rev</span>
            <span style={{ flex: 1, textAlign: 'center', position: 'relative', zIndex: 1, color: chartMode === 'litres' ? 'var(--text-1)' : 'var(--text-3)', transition: 'color 0.2s' }}>L Vol</span>
          </div>
          <div
            style={{
              position: 'relative',
              display: 'flex',
              alignItems: 'center',
              padding: '2px',
              borderRadius: '20px',
              background: 'var(--bg)',
              fontSize: '10px',
              fontWeight: '600',
              letterSpacing: '0.3px',
              textTransform: 'uppercase',
              userSelect: 'none',
              height: '26px',
              gap: '2px',
            }}
          >
            {[{ id: 'all', label: 'All' }, { id: 'hp', label: 'HP' }, { id: 'cb', label: 'C Blue' }, { id: 'gulf', label: 'Gulf' }].map(m => {
              const isActive = chartMachine === m.id;
              const activeColor = m.id === 'hp' ? 'var(--hp)' : m.id === 'cb' ? 'var(--cb)' : m.id === 'gulf' ? 'var(--gulf)' : 'var(--text)';
              return (
                <div
                  key={m.id}
                  onClick={() => setChartMachine(m.id)}
                  style={{
                    position: 'relative',
                    padding: '3px 12px',
                    borderRadius: '20px',
                    cursor: 'pointer',
                    color: isActive ? '#fff' : 'var(--text-3)',
                    background: isActive ? activeColor : 'transparent',
                    transition: 'all 0.2s',
                  }}
                >{m.label}</div>
              );
            })}
          </div>
          {chartDayMode === 'company' && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                padding: '2px',
                borderRadius: '20px',
                background: 'var(--bg)',
                fontSize: '10px',
                fontWeight: '600',
                letterSpacing: '0.3px',
                textTransform: 'uppercase',
                userSelect: 'none',
                height: '26px',
                gap: '2px',
              }}
            >
              {[{ id: 'all', label: 'Both' }, { id: 'morning', label: 'Day' }, { id: 'night', label: 'Night' }].map(m => (
                <div
                  key={m.id}
                  onClick={() => setChartShift(m.id)}
                  style={{
                    padding: '3px 12px',
                    borderRadius: '20px',
                    cursor: 'pointer',
                    color: chartShift === m.id ? '#fff' : 'var(--text-3)',
                    background: chartShift === m.id ? 'var(--cb)' : 'transparent',
                    transition: 'all 0.2s',
                  }}
                >{m.label}</div>
              ))}
            </div>
          )}
        </div>
        <div style={{ overflowX: 'auto', paddingBottom: '4px' }}>
          <div style={{ display: 'flex', gap: '3px', minWidth: Math.max(monthData.daily.length * 28, 300) }}>
            {monthData.daily.map(({ day, value }) => {
              const pct = monthData.maxVal > 0 ? (value / monthData.maxVal) * 100 : 0;
              const dayOfWeek = new Date(chartMonth.getFullYear(), chartMonth.getMonth(), day).getDay();
              const fmtVal = chartMode === 'revenue'
                ? (value >= 100000 ? '₹' + (value / 100000).toFixed(1) + 'L' : value >= 1000 ? '₹' + (value / 1000).toFixed(1) + 'k' : '₹' + Math.round(value))
                : value.toFixed(1) + 'L';
              const barColor = chartMachine !== 'all'
                ? (chartMachine === 'hp' ? 'var(--hp)' : chartMachine === 'cb' ? 'var(--cb)' : 'var(--gulf)')
                : (dayOfWeek === 0 || dayOfWeek === 6 ? 'var(--cb)' : 'var(--green)');
              return (
                <div key={day} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '3px', minWidth: '24px' }}>
                  <div style={{ fontSize: '9px', color: 'var(--text-3)', whiteSpace: 'nowrap' }}>
                    {value > 0 ? fmtVal : ''}
                  </div>
                  <div style={{ width: '100%', height: '80px', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', gap: '2px' }}>
                    <div
                      title={`${day} ${fmtMonth(chartMonth)}: ${chartMode === 'revenue' ? '₹' + Math.round(value).toLocaleString('en-IN') : value.toFixed(1) + 'L'}`}
                      style={{
                        height: `${pct}%`,
                        background: barColor,
                        borderRadius: '3px 3px 0 0',
                        minHeight: value > 0 ? '3px' : '0',
                        transition: 'height 0.3s ease',
                      }}
                    />
                  </div>
                  <div style={{ fontSize: '9px', color: 'var(--text-3)', fontWeight: dayOfWeek === 0 || dayOfWeek === 6 ? '600' : '400' }}>{day}</div>
                </div>
              );
            })}
          </div>
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
              { label: 'GPay', color: '#0c5aa6', amount: gpayAmt },
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
              {pagedFills.length === 0 ? (
                <tr>
                  <td colSpan="7" style={{ textAlign: 'center', color: 'var(--text-3)', padding: '20px' }}>
                    No transactions recorded today.
                  </td>
                </tr>
              ) : (
                pagedFills.map((f) => (
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
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 0 0' }}>
          <span style={{ fontSize: '11px', color: 'var(--text-3)', fontWeight: '500' }}>
            {sortedTodayFills.length === 0
              ? 'No entries'
              : `${page * pageSize + 1}–${Math.min((page + 1) * pageSize, sortedTodayFills.length)} of ${sortedTodayFills.length}`
            }
          </span>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '2px',
              padding: '2px',
              borderRadius: '20px',
              background: 'var(--bg)',
              height: '26px',
            }}
          >
            <div
              onClick={page > 0 ? () => setPage(p => p - 1) : undefined}
              style={{
                padding: '3px 8px',
                borderRadius: '20px',
                cursor: page > 0 ? 'pointer' : 'default',
                fontSize: '10px',
                fontWeight: '600',
                letterSpacing: '0.3px',
                textTransform: 'uppercase',
                color: page > 0 ? 'var(--text-2)' : 'var(--text-4)',
                transition: 'color 0.2s',
                userSelect: 'none',
              }}
            >Prev</div>
            {Array.from({ length: totalPages }, (_, i) => (
              <div
                key={i}
                onClick={() => setPage(i)}
                style={{
                  padding: '3px 10px',
                  borderRadius: '20px',
                  cursor: 'pointer',
                  fontSize: '10px',
                  fontWeight: '700',
                  color: i === page ? '#fff' : 'var(--text-3)',
                  background: i === page ? 'var(--cb)' : 'transparent',
                  transition: 'all 0.2s',
                }}
              >{i + 1}</div>
            ))}
            <div
              onClick={page < totalPages - 1 ? () => setPage(p => p + 1) : undefined}
              style={{
                padding: '3px 8px',
                borderRadius: '20px',
                cursor: page < totalPages - 1 ? 'pointer' : 'default',
                fontSize: '10px',
                fontWeight: '600',
                letterSpacing: '0.3px',
                textTransform: 'uppercase',
                color: page < totalPages - 1 ? 'var(--text-2)' : 'var(--text-4)',
                transition: 'color 0.2s',
                userSelect: 'none',
              }}
            >Next</div>
          </div>
        </div>
      </div>
  );
}

