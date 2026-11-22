import { useState, useEffect, useCallback, useRef } from 'react';
import { Package, Search, Download, Calendar, X, ChevronLeft, ChevronRight, Filter } from 'lucide-react';
import * as XLSX from 'xlsx';
import { dbAPI } from '../config/supabase';
import { BUCKETS, inr } from '../config/buckets';
import { SHIFT_START } from '../config/constants';
import { getShiftDay, getTodayShiftDay, fmtDate } from '../config/shiftDay';

const todayShift = getTodayShiftDay();

const fmtDay = (d) => {
  const dt = new Date(d + `T${String(SHIFT_START).padStart(2, '0')}:00:00`);
  return dt.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
};

const presets = [
  { label: 'Today', range: () => ({ from: todayShift, to: todayShift }) },
  { label: 'Yesterday', range: () => { const d = new Date(); d.setDate(d.getDate() - 1); const s = fmtDate(d); return { from: s, to: s }; } },
  { label: 'This Week', range: () => { const d = new Date(); d.setDate(d.getDate() - d.getDay()); return { from: fmtDate(d), to: todayShift }; } },
  { label: 'This Month', range: () => { const d = new Date(); d.setDate(1); return { from: fmtDate(d), to: todayShift }; } },
  { label: 'Last Month', range: () => { const d = new Date(); d.setMonth(d.getMonth() - 1); d.setDate(1); const e = new Date(); e.setDate(0); return { from: fmtDate(d), to: fmtDate(e) }; } },
];

function Chip({ label, onRemove }) {
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: '5px',
      background: 'var(--bg)', border: '1px solid var(--border-mid)',
      borderRadius: '20px', padding: '3px 10px',
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

export default function BucketSales({ currentUser, customers = [], triggerToast }) {
  const [sales, setSales] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [tableMissing, setTableMissing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [selectedId, setSelectedId] = useState(BUCKETS[0].id);

  const [qty, setQty] = useState('1');
  const [customerName, setCustomerName] = useState('');
  const [phone, setPhone] = useState('');
  const [vehicle, setVehicle] = useState('');
  const [company, setCompany] = useState('');
  const [payment, setPayment] = useState('');
  const [notes, setNotes] = useState('');

  const [acOpen, setAcOpen] = useState(false);
  const [acMatches, setAcMatches] = useState([]);
  const [acIndex, setAcIndex] = useState(0);
  const acRef = useRef(null);

  const [dateFrom, setDateFrom] = useState(todayShift);
  const [dateTo, setDateTo] = useState(todayShift);
  const [selectedItem, setSelectedItem] = useState('all');
  const [selectedEmployee, setSelectedEmployee] = useState('all');
  const [selectedPayment, setSelectedPayment] = useState('all');
  const [showCustom, setShowCustom] = useState(false);
  const [activePreset, setActivePreset] = useState('Today');
  const [includeTimeColumn, setIncludeTimeColumn] = useState(false);
  const [section, setSection] = useState('list');

  const applySales = useCallback((data, error) => {
    if (error) {
      const missing = error.code === 'PGRST205' || /bucket_sales/.test(error.message || '');
      setTableMissing(missing);
      setSales([]);
      setLoadError(missing ? '' : 'Could not load bucket sales');
    } else {
      setTableMissing(false);
      setLoadError('');
      setSales(data || []);
    }
    setLoading(false);
  }, []);

  const loadSales = useCallback(async () => {
    const { data, error } = await dbAPI.fetchBucketSales();
    applySales(data, error);
  }, [applySales]);

  useEffect(() => {
    let cancelled = false;
    dbAPI.fetchBucketSales().then(({ data, error }) => {
      if (!cancelled) applySales(data, error);
    });
    return () => { cancelled = true; };
  }, [applySales]);

  useEffect(() => {
    function handleClickOutside(event) {
      if (acRef.current && !acRef.current.contains(event.target)) setAcOpen(false);
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const soldById = sales.reduce((map, sale) => {
    map[sale.product_id] = (map[sale.product_id] || 0) + (Number(sale.qty) || 0);
    return map;
  }, {});

  const onHand = (bucket) => bucket.openingQty - (soldById[bucket.id] || 0);
  const totalOnHand = BUCKETS.reduce((sum, bucket) => sum + onHand(bucket), 0);
  const selected = BUCKETS.find((bucket) => bucket.id === selectedId) || BUCKETS[0];
  const qtyNum = /^\d+$/.test(qty) ? parseInt(qty, 10) : 0;
  const lineTotal = qtyNum > 0 ? qtyNum * selected.price : 0;

  const todaySales = sales.filter((sale) => getShiftDay(sale.created_at) === todayShift);
  const todayQty = todaySales.reduce((sum, sale) => sum + (Number(sale.qty) || 0), 0);
  const todayAmount = todaySales.reduce((sum, sale) => sum + (Number(sale.total) || 0), 0);

  const employees = [...new Set(sales.map((sale) => sale.employee).filter(Boolean))].sort();
  const payments = [...new Set(['Cash', 'GPay', 'Credit', ...sales.map((sale) => sale.payment).filter(Boolean)])];

  const filteredSales = [...sales]
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
    .filter((sale) => {
      const from = dateFrom ? new Date(dateFrom + `T${String(SHIFT_START).padStart(2, '0')}:00:00`) : null;
      const toBase = dateTo ? new Date(dateTo + `T${String(SHIFT_START).padStart(2, '0')}:00:00`) : null;
      if (toBase) toBase.setDate(toBase.getDate() + 1);
      const shiftDayDate = new Date(getShiftDay(sale.created_at) + `T${String(SHIFT_START).padStart(2, '0')}:00:00`);
      if (from && shiftDayDate < from) return false;
      if (toBase && shiftDayDate >= toBase) return false;
      if (selectedItem !== 'all' && sale.product_id !== selectedItem) return false;
      if (selectedEmployee !== 'all' && sale.employee !== selectedEmployee) return false;
      if (selectedPayment !== 'all' && sale.payment !== selectedPayment) return false;
      return true;
    });

  const isDefaultRange = dateFrom === todayShift && dateTo === todayShift;
  const hasFilters = !isDefaultRange || selectedItem !== 'all' || selectedEmployee !== 'all' || selectedPayment !== 'all';

  const navigateDay = (dir) => {
    const f = new Date(dateFrom);
    const t = new Date(dateTo);
    f.setDate(f.getDate() + dir);
    t.setDate(t.getDate() + dir);
    if (t > new Date()) return;
    setDateFrom(fmtDate(f));
    setDateTo(fmtDate(t));
    setActivePreset('');
  };

  const handlePreset = (fn, label) => {
    const { from, to } = fn();
    setDateFrom(from);
    setDateTo(to);
    setActivePreset(label);
  };

  const clearFilters = () => {
    setDateFrom(todayShift);
    setDateTo(todayShift);
    setSelectedItem('all');
    setSelectedEmployee('all');
    setSelectedPayment('all');
    setShowCustom(false);
    setActivePreset('Today');
  };

  const handleVehicle = (val) => {
    const v = val.toUpperCase();
    setVehicle(v);
    if (v.length < 2) {
      setAcOpen(false);
      setAcMatches([]);
      return;
    }
    const q = v.toLowerCase();
    const matches = customers.filter((c) =>
      (c.vehicle || '').toUpperCase().includes(v) ||
      (c.name || '').toLowerCase().includes(q) ||
      (c.company || '').toLowerCase().includes(q)
    ).slice(0, 8);
    setAcMatches(matches);
    setAcOpen(matches.length > 0);
    setAcIndex(0);
  };

  const applyCustomer = (cust) => {
    setVehicle((cust.vehicle || '').toUpperCase());
    setCustomerName(cust.name || '');
    setPhone(cust.phone || '');
    setCompany(cust.company || '');
    setAcOpen(false);
  };

  const handleAcKeyDown = (e) => {
    if (!acOpen || acMatches.length === 0) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setAcIndex((i) => (i + 1) % acMatches.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setAcIndex((i) => (i - 1 + acMatches.length) % acMatches.length);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      applyCustomer(acMatches[acIndex]);
    } else if (e.key === 'Escape') {
      setAcOpen(false);
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (tableMissing) {
      triggerToast('Bucket sales table is not in the database yet', 'warn');
      return;
    }
    if (!qtyNum) {
      triggerToast('Enter how many buckets', 'warn');
      return;
    }
    const left = onHand(selected);
    if (qtyNum > left) {
      triggerToast(`Only ${left} ${selected.name} left on hand`, 'warn');
      return;
    }
    if (!customerName.trim()) {
      triggerToast('Customer name is required', 'warn');
      return;
    }
    if (!payment) {
      triggerToast('Select a payment method', 'warn');
      return;
    }

    setSaving(true);
    const { error } = await dbAPI.addBucketSale({
      employee: currentUser?.name || 'Unknown',
      product_id: selected.id,
      product_name: selected.name,
      litres: selected.litres,
      qty: qtyNum,
      unit_price: selected.price,
      total: lineTotal,
      customer_name: customerName.trim(),
      phone: phone.trim() || null,
      vehicle: vehicle.trim() || null,
      company: company.trim() || null,
      payment,
      notes: notes.trim() || null,
    });
    setSaving(false);

    if (error) {
      const missing = error.code === 'PGRST205' || /bucket_sales/.test(error.message || '');
      setTableMissing(missing);
      triggerToast(missing ? 'Create the bucket_sales table, then save again' : 'Error saving sale: ' + error.message, 'warn');
      return;
    }

    triggerToast('Bucket sale saved ✓');
    setQty('1');
    setCustomerName('');
    setPhone('');
    setVehicle('');
    setCompany('');
    setPayment('');
    setNotes('');
    loadSales();
  };

  const exportName = () => {
    const item = selectedItem !== 'all' ? `_${selectedItem}` : '';
    const emp = selectedEmployee !== 'all' ? `_${selectedEmployee.replace(/\s+/g, '_')}` : '';
    const pay = selectedPayment !== 'all' ? `_${selectedPayment.replace(/\s+/g, '_')}` : '';
    return `bucket_sales${item}${emp}${pay}_${dateFrom || 'start'}_to_${dateTo || 'end'}`;
  };

  const saleRows = (includeTime) => filteredSales.map((sale) => {
    const dt = new Date(sale.created_at);
    const row = [
      dt.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }).replace(' ', '-'),
      dt.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true }),
      sale.product_name || '',
      sale.litres ?? '',
      sale.qty ?? '',
      sale.unit_price ?? '',
      sale.total ?? '',
      sale.customer_name || '',
      sale.phone || '',
      sale.vehicle || '',
      sale.company || '',
      sale.payment || '',
      sale.employee || '',
      sale.notes || '',
    ];
    if (!includeTime) row.splice(1, 1);
    return row;
  });

  const exportXLSX = () => {
    if (filteredSales.length === 0) return;
    try {
      const headers = ['Date', 'Time', 'Item', 'Litres', 'Qty', 'Rate', 'Total', 'Customer', 'Phone', 'Vehicle', 'Company', 'Payment', 'Employee', 'Notes'];
      const finalHeaders = includeTimeColumn ? headers : headers.filter((h) => h !== 'Time');
      const rows = saleRows(includeTimeColumn);
      const wsData = [finalHeaders, ...rows];
      const ws = XLSX.utils.aoa_to_sheet(wsData);
      ws['!cols'] = finalHeaders.map((h, colIdx) => {
        const lengths = wsData.map((row) => String(row[colIdx] ?? '').length);
        return { wch: Math.min(Math.max(...lengths, h.length) + 2, 40) };
      });
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Bucket sales');
      XLSX.writeFile(wb, `${exportName()}.xlsx`);
    } catch (err) {
      console.error('XLSX export failed:', err);
      triggerToast('XLSX export failed. Please try again.', 'warn');
    }
  };

  const exportCSV = () => {
    if (filteredSales.length === 0) return;
    try {
      const headers = ['Date', 'Time', 'Item', 'Litres', 'Qty', 'Rate', 'Total', 'Customer', 'Phone', 'Vehicle', 'Company', 'Payment', 'Employee', 'Notes'];
      const finalHeaders = includeTimeColumn ? headers : headers.filter((h) => h !== 'Time');
      const rows = saleRows(includeTimeColumn);
      const csv = '\uFEFF' + [finalHeaders.map((h) => `"${h}"`).join(','), ...rows.map((r) => r.map((v) => `"${String(v ?? '').replace(/"/g, '""')}"`).join(','))].join('\n');
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${exportName()}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('CSV export failed:', err);
      triggerToast('CSV export failed. Please try again.', 'warn');
    }
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-title">DEF Buckets</div>
          <div className="page-sub">
            Prefilled buckets. Rates are the Nov 26 list
            {loading ? '' : ` · today ${todayQty} bucket${todayQty === 1 ? '' : 's'}, ${inr(todayAmount)}`}
          </div>
        </div>
        {section === 'history' && <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <label style={{ fontSize: '11px', color: 'var(--text-2)', display: 'flex', alignItems: 'center', gap: '4px', whiteSpace: 'nowrap' }}>
            <input
              type="checkbox"
              checked={includeTimeColumn}
              onChange={(e) => setIncludeTimeColumn(e.target.checked)}
              style={{ width: 'auto' }}
            />
            Include Time
          </label>
          <button
            className="btn btn-outline"
            onClick={exportXLSX}
            disabled={filteredSales.length === 0}
            style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            <Download size={15} />
            Export Excel
          </button>
          <button
            className="btn btn-outline"
            onClick={exportCSV}
            disabled={filteredSales.length === 0}
            style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            <Download size={15} />
            Export CSV
          </button>
        </div>}
      </div>

      <div className="tabs" style={{ marginBottom: '12px' }}>
        <button type="button" className={`tab ${section === 'list' ? 'active' : ''}`} onClick={() => setSection('list')}>Bucket list</button>
        <button type="button" className={`tab ${section === 'history' ? 'active' : ''}`} onClick={() => setSection('history')}>Sale history</button>
      </div>

      {loadError && (
        <div className="alert-strip alert-warn" style={{ marginBottom: '14px', display: 'block' }}>{loadError}</div>
      )}

      {tableMissing && (
        <div className="alert-strip alert-warn" style={{ marginBottom: '14px', display: 'block' }}>
          The price list is ready. Sales cannot be stored until supabase/bucket_sales.sql is run in the Supabase SQL editor.
        </div>
      )}

      {section === 'list' && <div className="grid-responsive" style={{ display: 'grid', gridTemplateColumns: '1.25fr 0.9fr', gap: '14px', alignItems: 'start' }}>
        <div className="card" style={{ overflow: 'hidden' }}>
          <div className="card-pad" style={{ paddingBottom: '8px' }}>
            <div className="section-label">Price list</div>
          </div>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>SN</th>
                  <th>Item</th>
                  <th style={{ textAlign: 'right' }}>Qty</th>
                  <th style={{ textAlign: 'right' }}>Selling rate</th>
                </tr>
              </thead>
              <tbody>
                {BUCKETS.map((bucket) => {
                  const left = onHand(bucket);
                  const active = bucket.id === selected.id;
                  const hi = active ? { background: bucket.soft } : undefined;
                  return (
                    <tr key={bucket.id} onClick={() => setSelectedId(bucket.id)} style={{ cursor: 'pointer' }}>
                      <td className="mono" style={{ ...hi, boxShadow: `inset 3px 0 0 ${bucket.color}` }}>{bucket.sn}</td>
                      <td style={{ ...hi, fontWeight: active ? 600 : 500, color: bucket.color }}>{bucket.name}</td>
                      <td className="mono" style={{ ...hi, textAlign: 'right', color: left <= 0 ? 'var(--danger)' : 'var(--text)' }}>{left}</td>
                      <td className="mono" style={{ ...hi, textAlign: 'right', fontWeight: 600, color: bucket.color }}>{inr(bucket.price)}</td>
                    </tr>
                  );
                })}
                <tr>
                  <td></td>
                  <td style={{ fontWeight: 700 }}>TOTAL</td>
                  <td className="mono" style={{ textAlign: 'right', fontWeight: 700 }}>{totalOnHand}</td>
                  <td className="mono" style={{ textAlign: 'right', color: 'var(--text-3)', fontSize: '12px' }}>Nov 26</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <form onSubmit={handleSave} className="card card-pad" style={{ borderTop: `3px solid ${selected.color}` }}>
          <div className="section-label" style={{ display: 'flex', alignItems: 'center', gap: '6px', color: selected.color }}>
            <Package size={14} /> Sell {selected.name}
          </div>
          <div className="summary-box" style={{ marginBottom: '14px' }}>
            <div className="sum-row">
              <span className="sum-label">On hand</span>
              <span className="sum-val">{onHand(selected)}</span>
            </div>
            <div className="sum-row">
              <span className="sum-label">Selling rate</span>
              <span className="sum-val">{inr(selected.price)}</span>
            </div>
            <div className="sum-row total">
              <span className="sum-label">Collect</span>
              <span className="sum-val" style={{ color: 'var(--green)' }}>{lineTotal > 0 ? inr(lineTotal) : '—'}</span>
            </div>
          </div>

          <div className="form-grid">
            <div className="form-row">
              <div className="fg">
                <label>Qty <span className="req">*</span></label>
                <input
                  type="number"
                  min="1"
                  step="1"
                  value={qty}
                  onChange={(e) => setQty(e.target.value)}
                  placeholder="1"
                />
              </div>
              <div className="fg">
                <label>Payment <span className="req">*</span></label>
                <select value={payment} onChange={(e) => setPayment(e.target.value)}>
                  <option value="">Select payment</option>
                  <option value="Cash">Cash</option>
                  <option value="GPay">GPay</option>
                  <option value="Credit">Credit</option>
                </select>
              </div>
            </div>

            <div className="fg ac-wrap" ref={acRef} style={{ position: 'relative' }}>
              <label>Vehicle <span className="opt">(opt)</span></label>
              <div style={{ position: 'relative' }}>
                <input
                  type="text"
                  value={vehicle}
                  onChange={(e) => handleVehicle(e.target.value)}
                  onKeyDown={handleAcKeyDown}
                  placeholder="TN72AB1234"
                  autoComplete="off"
                  style={{ textTransform: 'uppercase', fontFamily: 'var(--mono)', paddingLeft: '34px' }}
                />
                <Search size={16} style={{ position: 'absolute', left: '11px', top: '10px', color: 'var(--text-3)' }} />
              </div>
              {acOpen && (
                <div className="ac-dropdown open" style={{ width: '100%' }}>
                  {acMatches.map((c, idx) => (
                    <div
                      key={c.id || c.vehicle}
                      className="ac-item"
                      onMouseDown={(e) => { e.preventDefault(); applyCustomer(c); }}
                      style={idx === acIndex ? { background: 'var(--bg)' } : undefined}
                    >
                      <div className="ac-item-name">{c.name}{c.company ? ` · ${c.company}` : ''}</div>
                      <div className="ac-item-meta">{c.vehicle}{c.phone ? ` · ${c.phone}` : ''}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="form-row">
              <div className="fg">
                <label>Customer name <span className="req">*</span></label>
                <input
                  type="text"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder="Buyer name"
                />
              </div>
              <div className="fg">
                <label>Phone <span className="opt">(opt)</span></label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="Mobile"
                  maxLength={15}
                />
              </div>
            </div>

            <div className="fg">
              <label>Company <span className="opt">(opt)</span></label>
              <input
                type="text"
                value={company}
                onChange={(e) => setCompany(e.target.value)}
                placeholder="Transport name"
              />
            </div>

            <div className="fg">
              <label>Notes <span className="opt">(opt)</span></label>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Bill no, delivery, etc."
              />
            </div>

            <button
              type="submit"
              className="btn btn-primary"
              disabled={saving}
              style={{ width: '100%', padding: '11px' }}
            >
              {saving ? 'Saving…' : `Save sale · ${lineTotal > 0 ? inr(lineTotal) : inr(selected.price)}`}
            </button>
          </div>
        </form>
      </div>}

      {section === 'history' && <>
      <div className="card" style={{ marginBottom: '12px', padding: '14px 16px' }}>
        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', alignItems: 'center', marginBottom: '10px' }}>
          {presets.map((p) => (
            <button
              key={p.label}
              onClick={() => handlePreset(p.range, p.label)}
              className="btn btn-sm btn-outline"
              style={activePreset === p.label ? { background: 'var(--green-soft)', color: 'var(--green)', borderColor: 'var(--green)' } : {}}
            >
              {p.label}
            </button>
          ))}
          <button
            onClick={() => setShowCustom((v) => !v)}
            className={`btn btn-sm ${showCustom ? 'btn-primary' : 'btn-outline'}`}
            title="Custom date range"
          >
            <Filter size={12} /> Custom
          </button>
          <span style={{ flex: 1 }} />
          <span style={{ fontSize: '12px', color: 'var(--text-2)', fontWeight: '500' }}>
            {dateFrom === dateTo ? fmtDay(dateFrom) : `${fmtDay(dateFrom)} – ${fmtDay(dateTo)}`}
          </span>
          <button onClick={() => navigateDay(-1)} className="btn btn-sm btn-outline" title="Previous day">
            <ChevronLeft size={14} />
          </button>
          <button
            onClick={() => navigateDay(1)}
            className="btn btn-sm btn-outline"
            title="Next day"
            disabled={new Date(dateTo) >= new Date(todayShift)}
          >
            <ChevronRight size={14} />
          </button>
        </div>

        {showCustom && (
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'flex-end', marginBottom: '10px', paddingBottom: '10px', borderBottom: '1px solid var(--border)' }}>
            <div className="fg" style={{ minWidth: '130px' }}>
              <label style={lbl}><Calendar size={10} style={{ display: 'inline', marginRight: 3 }} />From</label>
              <input type="date" value={dateFrom} onChange={(e) => { setDateFrom(e.target.value); setActivePreset(''); }} style={inp} />
            </div>
            <div className="fg" style={{ minWidth: '130px' }}>
              <label style={lbl}>To</label>
              <input type="date" value={dateTo} onChange={(e) => { setDateTo(e.target.value); setActivePreset(''); }} style={inp} />
            </div>
          </div>
        )}

        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <div className="fg" style={{ minWidth: '160px' }}>
            <label style={lbl}>Item</label>
            <select value={selectedItem} onChange={(e) => setSelectedItem(e.target.value)} style={inp}>
              <option value="all">All</option>
              {BUCKETS.map((bucket) => (
                <option key={bucket.id} value={bucket.id}>{bucket.name}</option>
              ))}
            </select>
          </div>
          <div className="fg" style={{ minWidth: '120px' }}>
            <label style={lbl}>Employee</label>
            <select value={selectedEmployee} onChange={(e) => setSelectedEmployee(e.target.value)} style={inp}>
              <option value="all">All</option>
              {employees.map((emp) => (
                <option key={emp} value={emp}>{emp}</option>
              ))}
            </select>
          </div>
          <div className="fg" style={{ minWidth: '110px' }}>
            <label style={lbl}>Payment</label>
            <select value={selectedPayment} onChange={(e) => setSelectedPayment(e.target.value)} style={inp}>
              <option value="all">All</option>
              {payments.map((pay) => (
                <option key={pay} value={pay}>{pay}</option>
              ))}
            </select>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', gap: '5px' }}>
            <div style={{ fontSize: '11px', color: 'var(--text-3)', whiteSpace: 'nowrap' }}>
              <span style={{ fontWeight: '600', color: 'var(--text)', fontSize: '14px' }}>{filteredSales.length}</span>
              {' / '}{sales.length} sales
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
        </div>

        {hasFilters && (
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginTop: '10px', paddingTop: '10px', borderTop: '1px solid var(--border)' }}>
            {!isDefaultRange && (
              <Chip
                label={dateFrom === dateTo ? fmtDay(dateFrom) : `${fmtDay(dateFrom)} – ${fmtDay(dateTo)}`}
                onRemove={() => { setDateFrom(todayShift); setDateTo(todayShift); setActivePreset('Today'); }}
              />
            )}
            {selectedItem !== 'all' && (
              <Chip
                label={BUCKETS.find((b) => b.id === selectedItem)?.name || selectedItem}
                onRemove={() => setSelectedItem('all')}
              />
            )}
            {selectedEmployee !== 'all' && (
              <Chip label={`Employee: ${selectedEmployee}`} onRemove={() => setSelectedEmployee('all')} />
            )}
            {selectedPayment !== 'all' && (
              <Chip label={selectedPayment} onRemove={() => setSelectedPayment('all')} />
            )}
          </div>
        )}
      </div>

      <div className="card" style={{ overflow: 'hidden' }}>
        <div className="card-pad" style={{ paddingBottom: '8px' }}>
          <div className="section-label">Bucket sales</div>
        </div>
        <div className="table-wrap">
          {loading ? (
            <div style={{ textAlign: 'center', padding: '24px', color: 'var(--text-3)' }}>Loading sales…</div>
          ) : filteredSales.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '24px', color: 'var(--text-3)' }}>
              {sales.length === 0 ? 'No bucket sales yet.' : 'No sales match the selected filters.'}
            </div>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>When</th>
                  <th>Item</th>
                  <th style={{ textAlign: 'right' }}>Qty</th>
                  <th style={{ textAlign: 'right' }}>Rate</th>
                  <th style={{ textAlign: 'right' }}>Total</th>
                  <th>Customer</th>
                  <th>Vehicle</th>
                  <th>Payment</th>
                </tr>
              </thead>
              <tbody>
                {filteredSales.map((sale) => (
                  <tr key={sale.id}>
                    <td style={{ whiteSpace: 'nowrap', fontSize: '12px', color: 'var(--text-2)' }}>
                      {new Date(sale.created_at).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                    </td>
                    <td style={{ color: BUCKETS.find((b) => b.id === sale.product_id)?.color || 'var(--text)', fontWeight: 500 }}>{sale.product_name}</td>
                    <td className="mono" style={{ textAlign: 'right' }}>{sale.qty}</td>
                    <td className="mono" style={{ textAlign: 'right' }}>{inr(sale.unit_price)}</td>
                    <td className="mono" style={{ textAlign: 'right', fontWeight: 600 }}>{inr(sale.total)}</td>
                    <td>{sale.customer_name || '—'}</td>
                    <td className="mono" style={{ fontSize: '12px' }}>{sale.vehicle || '—'}</td>
                    <td>{sale.payment || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
      </>}
    </div>
  );
}

const lbl = { fontSize: '11px', fontWeight: '500', color: 'var(--text-2)', marginBottom: '4px', display: 'block' };
const inp = { width: '100%', padding: '7px 10px', border: '1px solid var(--border-mid)', borderRadius: 'var(--radius)', fontSize: '12px', color: 'var(--text)', background: 'var(--surface)', outline: 'none' };
