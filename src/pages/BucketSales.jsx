import { useState, useEffect, useCallback, useRef } from 'react';
import { Package, Search } from 'lucide-react';
import { dbAPI } from '../config/supabase';
import { BUCKETS, inr } from '../config/buckets';
import { getShiftDay, getTodayShiftDay } from '../config/shiftDay';

const todayShift = getTodayShiftDay();

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

  const handleDelete = async (sale) => {
    if (!confirm(`Remove this sale of ${sale.qty} × ${sale.product_name}?`)) return;
    const { error } = await dbAPI.deleteBucketSale(sale.id);
    if (error) {
      triggerToast('Could not remove that sale', 'warn');
      return;
    }
    triggerToast('Sale removed');
    loadSales();
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
      </div>

      {loadError && (
        <div className="alert-strip alert-warn" style={{ marginBottom: '14px', display: 'block' }}>{loadError}</div>
      )}

      {tableMissing && (
        <div className="alert-strip alert-warn" style={{ marginBottom: '14px', display: 'block' }}>
          The price list is ready. Sales cannot be stored until supabase/bucket_sales.sql is run in the Supabase SQL editor.
        </div>
      )}

      <div className="grid-responsive" style={{ display: 'grid', gridTemplateColumns: '1.25fr 0.9fr', gap: '14px', alignItems: 'start' }}>
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
      </div>

      <div className="card" style={{ marginTop: '14px', overflow: 'hidden' }}>
        <div className="card-pad" style={{ paddingBottom: '8px' }}>
          <div className="section-label">Bucket sales</div>
        </div>
        <div className="table-wrap">
          {loading ? (
            <div style={{ textAlign: 'center', padding: '24px', color: 'var(--text-3)' }}>Loading sales…</div>
          ) : sales.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '24px', color: 'var(--text-3)' }}>No bucket sales yet.</div>
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
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {sales.map((sale) => (
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
                    <td>
                      <button type="button" className="btn btn-outline btn-sm" onClick={() => handleDelete(sale)}>
                        Remove
                      </button>
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
