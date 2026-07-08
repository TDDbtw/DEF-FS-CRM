import { useState, useEffect, useRef } from 'react';
import { MACHINES } from '../config/machines';
import { dbAPI } from '../config/supabase';
import { Search, RotateCcw } from 'lucide-react';
import { GST_MULTIPLIER, GST_HALF, GST_RATE, STATES } from '../config/constants';

export default function FillEntry({ currentUser, triggerToast, refreshData, customers, fills, overrides }) {
  const [selectedMachine, setSelectedMachine] = useState('hp');
  
  // Form Fields
  const [entryType, setEntryType] = useState('sale');
  const [vehicle, setVehicle] = useState('');
  const [driver, setDriver] = useState('');
  const [driverPh, setDriverPh] = useState('');
  const [company, setCompany] = useState('');
  const [coPh, setCoPh] = useState('');
  const [odo, setOdo] = useState('');
  const [state, setState] = useState('Tamil Nadu');
  const [litres, setLitres] = useState('');
  const [actual, setActual] = useState('');
  const [discount, setDiscount] = useState('');
  const [payment, setPayment] = useState('');
  const [splitCash, setSplitCash] = useState('');
  const [splitGpay, setSplitGpay] = useState('');
  const [notes, setNotes] = useState('');
  const [billType, setBillType] = useState('');

  // Autocomplete state
  const [acOpen, setAcOpen] = useState(false);
  const [acMatches, setAcMatches] = useState([]);
  const [autofilled, setAutofilled] = useState(false);
  const [autofilledFields, setAutofilledFields] = useState({}); // tracking which fields were autofilled
  const acRef = useRef(null);

  // Manual edit trackers
  const [actualManualEdited, setActualManualEdited] = useState(false);
  const [discManualEdited, setDiscManualEdited] = useState(false);

  // Close autocomplete on click outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (acRef.current && !acRef.current.contains(event.target)) {
        setAcOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // ── Pricing Override Helpers ──
  const L = parseFloat(litres) || 0;
  const currentMachine = MACHINES[selectedMachine];

  const findOverride = (field) => {
    if (!overrides) return null;
    const normalizedCompany = (company || '').trim().toLowerCase();
    const normalizedVehicle = (vehicle || '').trim().toUpperCase();
    for (const o of overrides) {
      if (o.field !== field) continue;
      if (o.machine && o.machine !== 'all' && o.machine !== selectedMachine) continue;
      const target = o.target_value.trim();
      if (o.target_type === 'company' && target.toLowerCase() === normalizedCompany) return o;
      if (o.target_type === 'vehicle' && target.toUpperCase() === normalizedVehicle) return o;
    }
    return null;
  };

  const rateOverride = findOverride('rate');
  const discountOverride = findOverride('discount');
  const billTypeOverride = findOverride('bill_type');

  // Auto-apply bill type override
  useEffect(() => {
    if (billTypeOverride) {
      setBillType(billTypeOverride.value === 'gst' ? 'gst' : 'non-gst');
    }
  }, [billTypeOverride]);

  // Reset manual-edit flag when rate override activates (forces discount to 0)
  useEffect(() => {
    if (rateOverride && !discountOverride) {
      setDiscManualEdited(false);
    }
  }, [rateOverride, discountOverride]);

  // Update calculations when litres changes or selectedMachine changes or an override applies
  useEffect(() => {
    if (L > 0) {
      if (!actualManualEdited) {
        const effectiveRate = rateOverride ? rateOverride.value : currentMachine.rate;
        setActual(Math.round(L * effectiveRate).toString());
      }
      if (!discManualEdited) {
        let effectiveDiscPerL;
        if (discountOverride) {
          effectiveDiscPerL = discountOverride.value;
        } else if (rateOverride) {
          effectiveDiscPerL = 0; // reduced rate already includes discount
        } else {
          effectiveDiscPerL = 1;
        }
        setDiscount(effectiveDiscPerL === 0 ? '0' : Math.round(L * effectiveDiscPerL).toString());
      }
    } else {
      if (!discManualEdited) {
        setDiscount('');
      }
    }
  }, [litres, selectedMachine, vehicle, company]);

  // Sync split fields when actual changes for split payment types
  useEffect(() => {
    if (payment === 'GPay + Cash Discount') {
      setSplitGpay(actual || '0');
    } else if (payment === 'Cash + GPay' && (!splitCash && !splitGpay)) {
      const half = Math.round(collectVal / 2 * 100) / 100;
      setSplitCash(half.toString());
      setSplitGpay((collectVal - half).toString());
    }
  }, [payment, actual]);

  // Derive GST breakdown from the actual amount
  const actualVal = parseFloat(actual) || 0;
  const discVal = parseFloat(discount) || 0;
  const collectVal = Math.max(0, actualVal - discVal);

  const handleVehInput = (val) => {
    const v = val.toUpperCase();
    setVehicle(v);

    const prefix = v.slice(0, 2);
    if (prefix === 'KL') setState('Kerala');
    else if (prefix === 'KA') setState('Karnataka');
    else if (prefix === 'TN') setState('Tamil Nadu');
    
    if (v.length < 2) {
      setAcOpen(false);
      setAcMatches([]);
      clearAutofill();
      return;
    }

    const matches = customers.filter(c => 
      (c.vehicle || '').toUpperCase().includes(v) ||
      c.name.toLowerCase().includes(val.toLowerCase()) ||
      (c.company && c.company.toLowerCase().includes(val.toLowerCase()))
    );

    setAcMatches(matches);
    setAcOpen(matches.length > 0);
  };

  const handleAutofill = (cust) => {
    setVehicle(cust.vehicle);
    setDriver(cust.name || '');
    setDriverPh(cust.phone || '');
    setCompany(cust.company || '');
    setCoPh(cust.co_phone || '');
    setState(cust.state || 'Tamil Nadu');

    setAutofilledFields({
      driver: !!cust.name,
      driverPh: !!cust.phone,
      company: !!cust.company,
      coPh: !!cust.co_phone
    });

    setAcOpen(false);
    setAutofilled(true);

    // Look up last transaction for this customer to auto-select their last payment type/machine
    const custFills = fills
      .filter(f => (f.vehicle || '').toUpperCase() === (cust.vehicle || '').toUpperCase())
      .sort((a, b) => new Date(b.ts) - new Date(a.ts));
    
    if (custFills.length > 0) {
      const last = custFills[0];
      if (last.machine && MACHINES[last.machine]) {
        setSelectedMachine(last.machine);
      }
      if (last.payment) {
        setPayment(last.payment);
      }
    }
  };

  const clearAutofill = () => {
    setAutofilled(false);
    setAutofilledFields({});
  };

  const handleActualChange = (val) => {
    if (rateOverride) return; // locked by override
    setActual(val);
    const numActual = parseFloat(val) || 0;
    const expected = L > 0 ? Math.round(L * currentMachine.rate) : 0;
    setActualManualEdited(numActual !== expected);
  };

  const handleDiscChange = (val) => {
    setDiscount(val);
    const numDisc = parseFloat(val) || 0;
    const numL = parseFloat(litres) || 0;
    
    if (numDisc === Math.round(numL)) {
      setDiscManualEdited(false);
    } else {
      setDiscManualEdited(true);
    }
  };

  const resetDiscount = () => {
    const numL = parseFloat(litres) || 0;
    setDiscount(numL > 0 ? Math.round(numL).toString() : '');
    setDiscManualEdited(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (entryType === 'test' || entryType === 'spillage') {
      if (!litres) {
        triggerToast(entryType === 'test' ? 'Enter the litres dispensed' : 'Enter the litres spilled', 'warn');
        return;
      }
    } else {
      if (!vehicle || !driver || !litres || !actual || !payment) {
        triggerToast('Please fill in all required fields (*)', 'warn');
        return;
      }
    }

    if (payment === 'Cash + GPay') {
      const c = parseFloat(splitCash) || 0;
      const g = parseFloat(splitGpay) || 0;
      if (Math.abs(c + g - collectVal) > 0.01) {
        triggerToast('Cash + GPay amounts must equal the collect amount', 'warn');
        return;
      }
    }

    if (payment === 'GPay + Cash Discount') {
      const c = parseFloat(splitCash) || 0;
      if (c > actualVal) {
        triggerToast('Cash discount cannot exceed the actual amount', 'warn');
        return;
      }
    }

    // Safety check: override values must match
    if (billTypeOverride && billType !== billTypeOverride.value) {
      triggerToast(`This ${billTypeOverride.target_type} requires ${billTypeOverride.value === 'gst' ? 'GST' : 'Non-GST'} bill — cannot save`, 'warn');
      return;
    }

    const payload = {
      employee: currentUser?.name || 'Unknown',
      machine: selectedMachine,
      entry_type: entryType,
      vehicle: entryType === 'test' ? null : vehicle.trim(),
      driver: entryType === 'test' ? null : driver.trim(),
      driver_ph: entryType === 'test' ? null : (driverPh.trim() || null),
      company: entryType === 'test' ? null : (company.trim() || null),
      co_ph: entryType === 'test' ? null : (coPh.trim() || null),
      odo: entryType === 'test' ? null : (odo ? parseFloat(odo) : null),
      state: entryType === 'test' ? null : state,
      litres: parseFloat(litres),
      actual: entryType === 'test' ? 0 : actualVal,
      discount: entryType === 'test' ? 0 : discVal,
      final: entryType === 'test' ? 0 : (payment === 'GPay + Cash Discount' ? actualVal : collectVal),
      payment: entryType === 'test' ? null : payment,
      split_cash: entryType === 'test' ? null : (payment === 'Cash + GPay' || payment === 'GPay + Cash Discount' ? (parseFloat(splitCash) || 0) : null),
      split_gpay: entryType === 'test' ? null : (payment === 'Cash + GPay' ? (parseFloat(splitGpay) || 0) : payment === 'GPay + Cash Discount' ? actualVal : null),
      shift: 'Mid-shift fill',
      bill_type: entryType === 'sale' ? (billType || null) : null,
      notes: notes.trim() || null
    };

    const { error } = await dbAPI.addFill(payload);

    if (error) {
      triggerToast('Error saving entry: ' + error.message, 'warn');
    } else {
      const msg = entryType === 'test' ? 'Test dispense logged ✓' : entryType === 'spillage' ? 'Spillage recorded ✓' : 'Fill entry saved successfully ✓';
      triggerToast(msg);
      resetForm();
      refreshData();
    }
  };

  const resetForm = () => {
    setEntryType('sale');
    setVehicle('');
    setDriver('');
    setDriverPh('');
    setCompany('');
    setCoPh('');
    setOdo('');
    setState('Tamil Nadu');
    setLitres('');
    setActual('');
    setDiscount('');
    setPayment('');
    setSplitCash('');
    setSplitGpay('');
    setNotes('');
    setBillType('');
    setDiscManualEdited(false);
    setActualManualEdited(false);
    clearAutofill();
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-title">New Fill Entry</div>
          <div className="page-sub">Shift logged as <strong>{currentUser?.name}</strong></div>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        {/* Entry type selector */}
        <div className="card card-pad" style={{ marginBottom: '14px' }}>
          <div className="section-label">Entry Type</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
            {[
              ['sale', '💰 Sale', 'Customer fuel sale'],
              ['test', '🔧 Test Dispense', 'Calibration check, poured back'],
              ['spillage', '⚠️ Spillage', 'Accidental loss during fill'],
            ].map(([v, label, hint]) => (
              <button
                key={v}
                type="button"
                onClick={() => setEntryType(v)}
                style={{
                  padding: '10px 0', textAlign: 'center', fontSize: '12px', fontWeight: '500',
                  border: `1.5px solid ${entryType === v ? 'var(--green)' : 'var(--border-mid)'}`,
                  borderRadius: 'var(--radius)', cursor: 'pointer',
                  background: entryType === v ? 'var(--green-soft)' : 'var(--surface)',
                  color: entryType === v ? 'var(--green)' : 'var(--text-2)',
                  transition: 'all .15s'
                }}
                title={hint}
              >
                <div>{label}</div>
                <div style={{ fontSize: '10px', marginTop: '2px', fontWeight: '400', opacity: '0.7' }}>{hint}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Vehicle Lookup — hidden for test dispense only */}
        {entryType !== 'test' && (
        <div className="card card-pad" style={{ marginBottom: '14px', position: 'relative' }}>
          <div className="section-label">Vehicle Lookup</div>
          <div className="fg ac-wrap" ref={acRef}>
            <label>Vehicle number <span className="req">*</span></label>
            <div style={{ position: 'relative' }}>
              <input
                type="text"
                value={vehicle}
                onChange={(e) => handleVehInput(e.target.value)}
                placeholder="Type vehicle no. — e.g. TN72AB1234"
                style={{ textTransform: 'uppercase', fontFamily: 'var(--mono)', paddingLeft: '34px' }}
                autoComplete="off"
              />
              <Search size={16} style={{ position: 'absolute', left: '11px', top: '10px', color: 'var(--text-3)' }} />
            </div>

            {acOpen && (
              <div className="ac-dropdown open" style={{ width: '100%' }}>
                {acMatches.map(c => {
                  const lastFill = fills.filter(f => (f.vehicle || '').toUpperCase() === (c.vehicle || '').toUpperCase()).sort((a,b) => new Date(b.ts) - new Date(a.ts))[0];
                  const daysSince = lastFill ? Math.floor((Date.now() - new Date(lastFill.ts).getTime()) / 86400000) : null;
                  const fillCount = fills.filter(f => (f.vehicle || '').toUpperCase() === (c.vehicle || '').toUpperCase()).length;

                  return (
                    <div key={c.id} className="ac-item" onClick={() => handleAutofill(c)}>
                      <div className="ac-item-name">{c.name} {c.company ? `· ${c.company}` : ''}</div>
                      <div className="ac-item-meta">{c.vehicle} {c.phone ? `· ${c.phone}` : ''}</div>
                      <div className="ac-item-badges">
                        {fillCount > 0 && <span className="badge badge-grey">{fillCount} fill{fillCount > 1 ? 's' : ''}</span>}
                        {daysSince !== null && (
                          <span className={`badge ${daysSince <= 14 ? 'badge-ok' : daysSince <= 30 ? 'badge-warn' : 'badge-grey'}`}>
                            {daysSince === 0 ? 'today' : `${daysSince}d ago`}
                          </span>
                        )}
                        <span className={`badge ${c.state === 'Kerala' ? 'badge-cb' : 'badge-grey'}`}>{c.state}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
            <div className="hint">Start typing — known vehicles auto-fill details below</div>
          </div>
          {autofilled && (
            <div style={{ marginTop: '10px' }} className="alert-strip alert-ok">
              ✓ Known customer profile found — details auto-filled.
            </div>
          )}
        </div>
        )}

        {/* Driver + company details — hidden for test dispense */}
        {entryType !== 'test' && (
        <div className="card card-pad" style={{ marginBottom: '14px' }}>
          <div className="section-label">Driver & Company Details</div>
          <div className="form-grid">
            <div className="form-row">
              <div className="fg">
                <label>Driver name <span className="req">*</span></label>
                <input
                  type="text"
                  value={driver}
                  onChange={(e) => setDriver(e.target.value)}
                  placeholder="e.g. Rajan"
                  className={autofilledFields.driver ? 'autofilled' : ''}
                />
              </div>
              <div className="fg">
                <label>Driver contact <span className="opt">(opt)</span></label>
                <input
                  type="tel"
                  value={driverPh}
                  onChange={(e) => setDriverPh(e.target.value)}
                  placeholder="Mobile (10 digits)"
                  maxLength={10}
                  className={autofilledFields.driverPh ? 'autofilled' : ''}
                />
              </div>
            </div>
            <div className="form-row">
              <div className="fg">
                <label>Company / transport <span className="opt">(opt)</span></label>
                <input
                  type="text"
                  value={company}
                  onChange={(e) => setCompany(e.target.value)}
                  placeholder="e.g. MMS Transport"
                  className={autofilledFields.company ? 'autofilled' : ''}
                />
              </div>
              <div className="fg">
                <label>Company contact <span className="opt">(opt)</span></label>
                <input
                  type="tel"
                  value={coPh}
                  onChange={(e) => setCoPh(e.target.value)}
                  placeholder="Mobile (10 digits)"
                  maxLength={10}
                  className={autofilledFields.coPh ? 'autofilled' : ''}
                />
              </div>
            </div>
            <div className="form-row">
              <div className="fg">
                <label>Odometer <span className="opt">(opt)</span></label>
                <input
                  type="number"
                  value={odo}
                  onChange={(e) => setOdo(e.target.value)}
                  placeholder="km"
                />
              </div>
              <div className="fg">
                <label>State</label>
                <select value={state} onChange={(e) => setState(e.target.value)}>
                  {STATES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
            </div>
          </div>
        </div>
        )}

        {/* Transaction entries */}
        <div className="card card-pad" style={{ marginBottom: '14px' }}>
          <div className="section-label">{entryType === 'test' ? 'Test Dispense' : entryType === 'spillage' ? 'Spillage' : 'Transaction Summary'}</div>
          {entryType === 'sale' && (
          <div style={{ marginBottom: '14px' }}>
            <div style={{ fontSize: '11px', fontWeight: '600', color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '8px' }}>Select Machine</div>
            <div className="machine-toggle" style={{ borderColor: MACHINES[selectedMachine].themeColor, display: 'grid', gridTemplateColumns: `repeat(${Object.keys(MACHINES).length}, 1fr)` }}>
              {Object.values(MACHINES).map((m) => {
                const active = selectedMachine === m.id;
                return (
                  <button type="button" key={m.id} className={`mt-opt ${active ? m.color : ''}`} onClick={() => setSelectedMachine(m.id)} style={{ background: active ? m.themeColor : 'var(--surface)', color: active ? '#fff' : 'var(--text-2)' }}>
                    {m.name} &nbsp;·&nbsp; ₹{m.rate}/L
                  </button>
                );
              })}
            </div>
          </div>
          )}
          {entryType === 'sale' && (
          <div style={{ marginBottom: '14px' }}>
            <div style={{ fontSize: '11px', fontWeight: '600', color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              Bill Type
              {billTypeOverride && <span style={{ fontSize: '10px', color: 'var(--cb)', fontWeight: 600 }}>· locked by override</span>}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
              {[['gst', 'GST Bill'], ['non-gst', 'Non-GST Bill']].map(([v, label]) => (
                <button key={v} type="button"
                  onClick={() => !billTypeOverride && setBillType(billType === v ? '' : v)}
                  style={{
                    padding: '8px 0', textAlign: 'center', fontSize: '12px', fontWeight: '500',
                    border: `1.5px solid ${billType === v ? 'var(--green)' : 'var(--border-mid)'}`,
                    borderRadius: 'var(--radius)', cursor: billTypeOverride ? 'not-allowed' : 'pointer',
                    background: billType === v ? 'var(--green-soft)' : 'var(--surface)',
                    color: billType === v ? 'var(--green)' : 'var(--text-2)',
                    opacity: billTypeOverride && !(billType === v) ? 0.5 : 1,
                    transition: 'all .15s'
                  }}>
                  {label}
                </button>
              ))}
            </div>
          </div>
          )}
          <div className="form-grid">
            <div className="form-row">
              <div className="fg">
                <label>{entryType === 'test' ? 'Litres dispensed' : entryType === 'spillage' ? 'Litres spilled' : 'Litres filled'} <span className="req">*</span></label>
                <input
                  type="number"
                  value={litres}
                  onChange={(e) => setLitres(e.target.value)}
                  placeholder="0.00"
                  step="0.01"
                />
              </div>
              {entryType !== 'sale' ? (
                <div className="fg">
                  <label>Machine <span className="req">*</span></label>
                  <select value={selectedMachine} onChange={e => setSelectedMachine(e.target.value)} style={{ width: '100%', padding: '8px 10px', border: '1px solid var(--border-mid)', borderRadius: 'var(--radius)', fontSize: '13px', color: 'var(--text)', background: 'var(--surface)', outline: 'none' }}>
                    {Object.values(MACHINES).map(m => (
                      <option key={m.id} value={m.id}>{m.name}</option>
                    ))}
                  </select>
                </div>
              ) : (
              <div className="fg">
                <label style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  Actual amount ₹ <span className="req">*</span>
                  {rateOverride && <span style={{ fontSize: '10px', color: 'var(--cb)', fontWeight: 600 }}>· ₹{rateOverride.value}/L</span>}
                </label>
                <input
                  type="number"
                  value={actual}
                  onChange={(e) => handleActualChange(e.target.value)}
                  placeholder="₹ 0"
                  disabled={!!rateOverride}
                  style={{ opacity: rateOverride ? 0.6 : 1 }}
                />
              </div>
              )}
            </div>

            {entryType === 'sale' && (
              <div className="fg">
                <label style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  Discount ₹
                  <span 
                    style={{
                      background: discManualEdited ? '#fff3e0' : '#e8f5e9',
                      color: discManualEdited ? '#92400e' : '#2e7d32',
                      padding: '2px 8px',
                      borderRadius: '20px',
                      fontSize: '10px',
                      fontWeight: '500'
                    }}
                  >
                    {discManualEdited ? 'custom' : `₹1/L auto (₹${Math.round(L)})`}
                  </span>
                </label>
                <div style={{ display: 'flex', gap: '6px' }}>
                  <input
                    type="number"
                    value={discount}
                    onChange={(e) => handleDiscChange(e.target.value)}
                    placeholder={rateOverride && !discountOverride ? '₹ 0 (reduced rate)' : '₹ 0'}
                    disabled={!!(rateOverride && !discountOverride)}
                    style={{ flex: 1, opacity: rateOverride && !discountOverride ? 0.5 : 1 }}
                  />
                  <button 
                    type="button" 
                    className="btn btn-outline btn-sm"
                    onClick={resetDiscount}
                    style={{ display: 'flex', alignItems: 'center', gap: '4px' }}
                  >
                    <RotateCcw size={12} />
                    Reset
                  </button>
                </div>
              </div>
            )}

            {entryType === 'sale' && (() => {
              const actualVal = parseFloat(actual) || 0;
              const taxableAmount = actualVal > 0 ? Math.round(actualVal / GST_MULTIPLIER * 100) / 100 : 0;
              const cgst = Math.round(taxableAmount * GST_HALF * 100) / 100;
              const sgst = Math.round(taxableAmount * GST_HALF * 100) / 100;
              const discVal = parseFloat(discount) || 0;
              const collectVal = Math.max(0, actualVal - discVal);
              return (
              <div className="summary-box">
                {(rateOverride || discountOverride || billTypeOverride) && (
                  <div style={{ fontSize: '11px', color: 'var(--cb)', fontWeight: 600, marginBottom: '8px' }}>
                    {rateOverride && `${rateOverride.target_value}: ₹${rateOverride.value}/L rate`}
                    {(rateOverride && discountOverride) || (rateOverride && billTypeOverride) ? ' · ' : ''}
                    {discountOverride && `${discountOverride.target_value}: ₹${discountOverride.value}/L discount`}
                    {discountOverride && billTypeOverride ? ' · ' : ''}
                    {billTypeOverride && `${billTypeOverride.target_value}: ${billTypeOverride.value === 'gst' ? 'GST' : 'Non-GST'} bill`}
                  </div>
                )}
                <div className="sum-row">
                  <span className="sum-label">Taxable amount</span>
                  <span className="sum-val">{L > 0 ? `₹${taxableAmount.toFixed(2)}` : '—'}</span>
                </div>
                <div className="sum-row" style={{ fontSize: '11px' }}>
                  <span className="sum-label">CGST ({GST_RATE/2}%)</span>
                  <span className="sum-val" style={{ color: 'var(--text-2)' }}>{L > 0 ? `₹${cgst.toFixed(2)}` : '—'}</span>
                </div>
                <div className="sum-row" style={{ fontSize: '11px' }}>
                  <span className="sum-label">SGST ({GST_RATE/2}%)</span>
                  <span className="sum-val" style={{ color: 'var(--text-2)' }}>{L > 0 ? `₹${sgst.toFixed(2)}` : '—'}</span>
                </div>
                <div className="sum-row">
                  <span className="sum-label">Actual amount (incl. GST)</span>
                  <span className="sum-val">{actualVal > 0 ? `₹${actualVal.toLocaleString('en-IN')}` : '—'}</span>
                </div>
                <div className="sum-row">
                  <span className="sum-label">Discount</span>
                  <span className="sum-val">{discVal > 0 ? `−₹${discVal}` : '—'}</span>
                </div>
                <div className="sum-row total">
                  <span className="sum-label">Collect</span>
                  <span className="sum-val" style={{ color: 'var(--green)' }}>
                    {collectVal > 0 ? `₹${collectVal.toLocaleString('en-IN')}` : '—'}
                  </span>
                </div>
              </div>
              );
            })()}
          </div>
        </div>

        {/* Shift totalizers & payment — only for sale */}
        {entryType === 'sale' && (
        <div className="card card-pad" style={{ marginBottom: '14px' }}>
          <div className="section-label">Payment & Shift Status</div>
          <div className="form-row">
            <div className="fg" style={{ flex: 1 }}>
              <label>Payment method <span className="req">*</span></label>
              <select value={payment} onChange={(e) => {
                setPayment(e.target.value);
                if (e.target.value === 'Cash + GPay') {
                  const half = Math.round(collectVal / 2 * 100) / 100;
                  setSplitCash(half.toString());
                  setSplitGpay((collectVal - half).toString());
                } else if (e.target.value === 'GPay + Cash Discount') {
                  setSplitGpay(actual || '0');
                  setSplitCash(discount || '0');
                } else {
                  setSplitCash('');
                  setSplitGpay('');
                }
              }}>
                <option value="">Select payment method</option>
                <option value="Cash">Cash</option>
                <option value="GPay">GPay</option>
                <option value="Cash + GPay">Cash + GPay</option>
                <option value="GPay + Cash Discount">GPay + Cash Discount</option>
                <option value="Credit">Credit</option>
              </select>
            </div>
          </div>

          {payment === 'Cash + GPay' && (
            <div className="form-row" style={{ marginTop: '10px' }}>
              <div className="fg">
                <label>Cash amount ₹</label>
                <input
                  type="number"
                  value={splitCash}
                  onChange={(e) => {
                    const c = parseFloat(e.target.value) || 0;
                    const remaining = Math.max(0, collectVal - c);
                    setSplitCash(e.target.value);
                    setSplitGpay(remaining > 0 ? remaining.toString() : '0');
                  }}
                  placeholder="₹ 0"
                  step="0.01"
                />
              </div>
              <div className="fg">
                <label>GPay amount ₹</label>
                <input
                  type="number"
                  value={splitGpay}
                  onChange={(e) => {
                    const g = parseFloat(e.target.value) || 0;
                    const remaining = Math.max(0, collectVal - g);
                    setSplitGpay(e.target.value);
                    setSplitCash(remaining > 0 ? remaining.toString() : '0');
                  }}
                  placeholder="₹ 0"
                  step="0.01"
                />
              </div>
            </div>
          )}

          {payment === 'GPay + Cash Discount' && (
            <div className="form-row" style={{ marginTop: '10px' }}>
              <div className="fg">
                <label>GPay received (full) ₹</label>
                <input
                  type="number"
                  value={actual || '0'}
                  disabled
                  style={{ background: 'var(--bg)', color: 'var(--text-2)', cursor: 'not-allowed' }}
                  placeholder="₹ 0"
                />
              </div>
              <div className="fg">
                <label>Cash discount given ₹</label>
                <input
                  type="number"
                  value={splitCash}
                  onChange={(e) => setSplitCash(e.target.value)}
                  placeholder="₹ 0"
                  step="0.01"
                />
              </div>
            </div>
          )}

          <div className="fg" style={{ marginTop: '14px' }}>
            <label>Remarks / Notes <span className="opt">(opt)</span></label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Any additional notes about this fill..."
              rows={2}
              style={{ width: '100%', padding: '9px 12px', border: '1px solid var(--border-mid)', borderRadius: 'var(--radius)', fontSize: '13px', color: 'var(--text)', outline: 'none', resize: 'vertical', fontFamily: 'inherit' }}
            />
          </div>
        </div>
        )}

        <button 
          type="submit" 
          className="btn btn-primary" 
          style={{ width: '100%', padding: '12px', fontSize: '14px', marginBottom: '40px' }}
        >
          ✓ Save Fill Entry
        </button>
      </form>
    </div>
  );
}
