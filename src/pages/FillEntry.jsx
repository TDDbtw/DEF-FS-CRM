import React, { useState, useEffect, useRef } from 'react';
import { MACHINES } from '../config/machines';
import { dbAPI } from '../config/supabase';
import { Check, Search, RotateCcw } from 'lucide-react';

export default function FillEntry({ currentUser, triggerToast, refreshData, customers, fills }) {
  const [selectedMachine, setSelectedMachine] = useState('hp');
  
  // Form Fields
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
  const [notes, setNotes] = useState('');

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

  // Update calculations when litres or actual changes
  const L = parseFloat(litres) || 0;
  const currentMachine = MACHINES[selectedMachine];

  // Auto calculate actual amount (GST-inclusive) and discount if needed
  useEffect(() => {
    if (L > 0) {
      if (!actualManualEdited) {
        setActual(Math.round(L * currentMachine.rate).toString());
      }
      if (!discManualEdited) {
        setDiscount(Math.round(L).toString());
      }
    } else {
      if (!discManualEdited) {
        setDiscount('');
      }
    }
  }, [litres, selectedMachine]);

  // Derive GST breakdown from the actual amount
  const actualVal = parseFloat(actual) || 0;
  const taxableAmount = actualVal > 0 ? Math.round(actualVal / 1.18 * 100) / 100 : 0;
  const cgst = Math.round(taxableAmount * 0.09 * 100) / 100;
  const sgst = Math.round(taxableAmount * 0.09 * 100) / 100;
  const discVal = parseFloat(discount) || 0;
  const collectVal = Math.max(0, actualVal - discVal);

  const handleVehInput = (val) => {
    const v = val.toUpperCase();
    setVehicle(v);
    
    if (v.length < 2) {
      setAcOpen(false);
      setAcMatches([]);
      clearAutofill();
      return;
    }

    const matches = customers.filter(c => 
      c.vehicle.toUpperCase().includes(v) ||
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
      .filter(f => f.vehicle.toUpperCase() === cust.vehicle.toUpperCase())
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
    
    if (!vehicle || !driver || !litres || !actual || !payment) {
      triggerToast('Please fill in all required fields (*)', 'warn');
      return;
    }

    const payload = {
      employee: currentUser?.name || 'Unknown',
      machine: selectedMachine,
      vehicle: vehicle.trim(),
      driver: driver.trim(),
      driver_ph: driverPh.trim() || null,
      company: company.trim() || null,
      co_ph: coPh.trim() || null,
      odo: odo ? parseFloat(odo) : null,
      state,
      litres: parseFloat(litres),
      actual: parseFloat(actual),
      discount: parseFloat(discount) || 0,
      final: collectVal,
      payment,
      shift: 'Mid-shift fill',
      notes: notes.trim() || null
    };

    const { error } = await dbAPI.addFill(payload);

    if (error) {
      triggerToast('Error saving entry: ' + error.message, 'warn');
    } else {
      triggerToast('Fill entry saved successfully ✓');
      resetForm();
      refreshData();
    }
  };

  const resetForm = () => {
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
    setNotes('');
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
        {/* Machine selection card */}
        <div className="card card-pad" style={{ marginBottom: '14px' }}>
          <div className="section-label">Select Machine</div>
          <div 
            className="machine-toggle" 
            style={{ 
              borderColor: MACHINES[selectedMachine].themeColor,
              display: 'grid',
              gridTemplateColumns: `repeat(${Object.keys(MACHINES).length}, 1fr)` 
            }}
          >
            {Object.values(MACHINES).map((m) => {
              const active = selectedMachine === m.id;
              return (
                <button
                  type="button"
                  key={m.id}
                  className={`mt-opt ${active ? m.color : ''}`}
                  onClick={() => setSelectedMachine(m.id)}
                  style={{
                    background: active ? m.themeColor : 'var(--surface)',
                    color: active ? '#fff' : 'var(--text-2)'
                  }}
                >
                  {m.name} &nbsp;·&nbsp; ₹{m.rate}/L
                </button>
              );
            })}
          </div>
        </div>

        {/* Vehicle Lookup */}
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
                  const lastFill = fills.filter(f => f.vehicle.toUpperCase() === c.vehicle.toUpperCase()).sort((a,b) => new Date(b.ts) - new Date(a.ts))[0];
                  const daysSince = lastFill ? Math.floor((Date.now() - new Date(lastFill.ts).getTime()) / 86400000) : null;
                  const fillCount = fills.filter(f => f.vehicle.toUpperCase() === c.vehicle.toUpperCase()).length;

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

        {/* Driver + company details */}
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
                  <option value="Tamil Nadu">Tamil Nadu</option>
                  <option value="Kerala">Kerala</option>
                  <option value="Other">Other</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Transaction entries */}
        <div className="card card-pad" style={{ marginBottom: '14px' }}>
          <div className="section-label">Transaction Summary</div>
          <div className="form-grid">
            <div className="form-row">
              <div className="fg">
                <label>Litres filled <span className="req">*</span></label>
                <input
                  type="number"
                  value={litres}
                  onChange={(e) => setLitres(e.target.value)}
                  placeholder="0.00"
                  step="0.01"
                />
              </div>
              <div className="fg">
                <label>Actual amount ₹ <span className="req">*</span></label>
                <input
                  type="number"
                  value={actual}
                  onChange={(e) => handleActualChange(e.target.value)}
                  placeholder="₹ 0"
                />
              </div>
            </div>
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
                  placeholder="₹ 0"
                  style={{ flex: 1 }}
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
            <div className="summary-box">
              <div className="sum-row">
                <span className="sum-label">Taxable amount</span>
                <span className="sum-val">{L > 0 ? `₹${taxableAmount.toFixed(2)}` : '—'}</span>
              </div>
              <div className="sum-row" style={{ fontSize: '11px' }}>
                <span className="sum-label">CGST (9%)</span>
                <span className="sum-val" style={{ color: 'var(--text-2)' }}>{L > 0 ? `₹${cgst.toFixed(2)}` : '—'}</span>
              </div>
              <div className="sum-row" style={{ fontSize: '11px' }}>
                <span className="sum-label">SGST (9%)</span>
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
          </div>
        </div>

        {/* Shift totalizers & payment */}
        <div className="card card-pad" style={{ marginBottom: '14px' }}>
          <div className="section-label">Payment & Shift Status</div>
          <div className="form-row">
            <div className="fg">
              <label>Payment method <span className="req">*</span></label>
              <select value={payment} onChange={(e) => setPayment(e.target.value)}>
                <option value="">Select payment method</option>
                <option value="Cash">Cash</option>
                <option value="GPay / UPI">GPay / UPI</option>
                <option value="Credit">Credit</option>
              </select>
            </div>
          </div>

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
