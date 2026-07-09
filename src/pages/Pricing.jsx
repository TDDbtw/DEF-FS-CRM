import { useState, useRef, useEffect } from 'react';
import { dbAPI } from '../config/supabase';
import Modal from '../components/Modal';
import { MACHINES } from '../config/machines';
import { Tag, Plus, Trash2 } from 'lucide-react';

const machineOptions = [
  { id: 'all', label: 'All Machines' },
  ...Object.entries(MACHINES).map(([id, m]) => ({ id, label: m.name })),
];

export default function Pricing({ overrides = [], customers = [], triggerToast, refreshData }) {
  const [modalOpen, setModalOpen] = useState(false);
  const [targetType, setTargetType] = useState('company');
  const [targetValue, setTargetValue] = useState('');
  const [field, setField] = useState('rate');
  const [machine, setMachine] = useState('all');
  const [value, setValue] = useState('');
  const [acOpen, setAcOpen] = useState(false);
  const [acMatches, setAcMatches] = useState([]);
  const [filterTab, setFilterTab] = useState('all');
  const acRef = useRef(null);

  const filteredOverrides = filterTab === 'all'
    ? overrides
    : overrides.filter(o => o.field === filterTab);

  useEffect(() => {
    function handleClickOutside(e) {
      if (acRef.current && !acRef.current.contains(e.target)) {
        setAcOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleTargetChange = (val) => {
    setTargetValue(val);
    const q = val.toLowerCase().trim();
    if (q.length < 1) {
      setAcOpen(false);
      setAcMatches([]);
      return;
    }
    const seen = new Set();
    const matches = [];
    for (const c of customers) {
      if (targetType === 'company' && c.company) {
        const key = c.company.toLowerCase();
        if (key.includes(q) && !seen.has(key)) {
          seen.add(key);
          matches.push({ label: c.company, sub: c.vehicle || '' });
        }
      }
      if (targetType === 'vehicle' && c.vehicle) {
        const key = c.vehicle.toUpperCase();
        if (key.includes(q.toUpperCase()) && !seen.has(key)) {
          seen.add(key);
          matches.push({ label: c.vehicle.toUpperCase(), sub: c.name || '' });
        }
      }
    }
    setAcMatches(matches);
    setAcOpen(matches.length > 0);
  };

  const handleAdd = async (e) => {
    e.preventDefault();
    if (!targetValue || !value) {
      triggerToast('Please fill all fields', 'warn');
      return;
    }
    const payload = {
      target_type: targetType,
      target_value: targetValue.trim(),
      field,
      machine: machine === 'all' ? null : machine,
      value: field === 'bill_type' ? value : Number(value),
    };
    const { error } = await dbAPI.addOverride(payload);
    if (error) {
      triggerToast('Error: ' + error.message, 'warn');
    } else {
      triggerToast('Override added ✓');
      setModalOpen(false);
      setTargetValue('');
      setValue('');
      refreshData();
    }
  };

  const handleDelete = async (id) => {
    const { error } = await dbAPI.deleteOverride(id);
    if (!error) {
      triggerToast('Override removed ✓');
      refreshData();
    }
  };

  const getCompanyVehicles = (companyName) => {
    const q = companyName.toLowerCase();
    return customers
      .filter(c => c.company && c.company.toLowerCase() === q && c.vehicle)
      .map(c => c.vehicle.toUpperCase());
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-title">Pricing Overrides</div>
          <div className="page-sub">{overrides.length} overrides configured</div>
        </div>
        <button className="btn btn-primary" onClick={() => setModalOpen(true)}>
          <Plus size={16} /> Add Override
        </button>
      </div>

      <div className="tabs" style={{ marginBottom: '12px' }}>
        <button className={`tab ${filterTab === 'all' ? 'active' : ''}`} onClick={() => setFilterTab('all')}>All</button>
        <button className={`tab ${filterTab === 'rate' ? 'active' : ''}`} onClick={() => setFilterTab('rate')}>Rate</button>
        <button className={`tab ${filterTab === 'discount' ? 'active' : ''}`} onClick={() => setFilterTab('discount')}>Discount</button>
        <button className={`tab ${filterTab === 'bill_type' ? 'active' : ''}`} onClick={() => setFilterTab('bill_type')}>Bill Type</button>
      </div>

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        {filteredOverrides.length === 0 ? (
          <div className="card-pad" style={{ textAlign: 'center', color: 'var(--text-3)' }}>
            {overrides.length === 0
              ? 'No pricing overrides configured yet. Add custom rates or discounts for specific companies or vehicles.'
              : `No ${filterTab} overrides found.`}
          </div>
        ) : (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Type</th>
                  <th>Target</th>
                  {filterTab === 'all' && <th>Field</th>}
                  <th>Machine</th>
                  <th>{filterTab === 'bill_type' ? 'Bill' : 'Value'}</th>
                  <th style={{ width: 40 }}></th>
                </tr>
              </thead>
              <tbody>
                {filteredOverrides.map((o) => {
                  const vehicles = o.target_type === 'company' ? getCompanyVehicles(o.target_value) : [];
                  return (
                    <tr key={o.id}>
                      <td><span className={`badge ${o.target_type === 'company' ? 'badge-ok' : 'badge-grey'}`}>{o.target_type}</span></td>
                      <td>
                        <div style={{ fontWeight: 500 }}>{o.target_value}</div>
                        {vehicles.length > 0 && (
                          <div style={{ fontSize: '11px', color: 'var(--text-3)', marginTop: '3px' }}>
                            {vehicles.length} vehicle{vehicles.length > 1 ? 's' : ''}: {vehicles.join(', ')}
                          </div>
                        )}
                      </td>
                      {filterTab === 'all' && <td><span className={`badge ${o.field === 'rate' ? 'badge-hp' : o.field === 'discount' ? 'badge-cb' : 'badge-ok'}`}>{o.field === 'bill_type' ? 'bill' : o.field}</span></td>}
                      <td>{o.machine ? <span className={`badge ${MACHINES[o.machine]?.badgeColor || 'badge-grey'}`}>{MACHINES[o.machine]?.name || o.machine}</span> : <span className="badge badge-grey">All</span>}</td>
                      <td style={{ fontWeight: 600, color: 'var(--green)' }}>
                        {o.field === 'bill_type' ? (o.value === 'gst' ? 'GST' : 'Non-GST') : `₹${o.value}/L`}
                      </td>
                      <td>
                        <button className="btn btn-sm btn-outline" onClick={() => handleDelete(o.id)}
                          style={{ color: 'var(--danger)', borderColor: 'var(--danger)' }}>
                          <Trash2 size={13} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title="Add Pricing Override">
        <form onSubmit={handleAdd} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div>
            <div style={{ marginBottom: '6px', fontSize: '12px', fontWeight: 500, color: 'var(--text-2)' }}>Target Type</div>
            <div className="tabs" style={{ marginBottom: 0 }}>
              <button type="button" className={`tab ${targetType === 'company' ? 'active' : ''}`}
                onClick={() => { setTargetType('company'); setAcOpen(false); }}>Company</button>
              <button type="button" className={`tab ${targetType === 'vehicle' ? 'active' : ''}`}
                onClick={() => { setTargetType('vehicle'); setAcOpen(false); }}>Vehicle</button>
            </div>
          </div>

          <div ref={acRef} style={{ position: 'relative' }}>
            <div style={{ marginBottom: '6px', fontSize: '12px', fontWeight: 500, color: 'var(--text-2)' }}>
              {targetType === 'company' ? 'Company Name' : 'Vehicle Number'}
            </div>
            <input type="text" value={targetValue} onChange={(e) => handleTargetChange(e.target.value)}
              placeholder={targetType === 'company' ? 'e.g. SS Transport' : 'e.g. TN72AB1234'}
              style={styles.input} autoFocus />
            {acOpen && (
              <div style={{
                position: 'absolute', top: '100%', left: 0, right: 0,
                background: 'var(--surface)', border: '1px solid var(--border-mid)',
                borderRadius: 'var(--radius)', boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                zIndex: 10, maxHeight: '180px', overflowY: 'auto',
              }}>
                {acMatches.map((m, i) => (
                  <div key={i} onClick={() => { setTargetValue(m.label); setAcOpen(false); }}
                    style={{
                      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                      padding: '8px 12px', cursor: 'pointer', fontSize: '13px',
                      borderBottom: i < acMatches.length - 1 ? '1px solid var(--border)' : 'none',
                    }}>
                    <span style={{ fontWeight: 500 }}>{m.label}</span>
                    <span style={{ fontSize: '11px', color: 'var(--text-3)' }}>{m.sub}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div>
            <div style={{ marginBottom: '6px', fontSize: '12px', fontWeight: 500, color: 'var(--text-2)' }}>Field</div>
            <div className="tabs" style={{ marginBottom: 0 }}>
              <button type="button" className={`tab ${field === 'rate' ? 'active' : ''}`}
                onClick={() => { setField('rate'); setValue(''); }}>Rate (₹/L)</button>
              <button type="button" className={`tab ${field === 'discount' ? 'active' : ''}`}
                onClick={() => { setField('discount'); setValue(''); }}>Discount (₹/L)</button>
              <button type="button" className={`tab ${field === 'bill_type' ? 'active' : ''}`}
                onClick={() => { setField('bill_type'); setValue('gst'); }}>Bill Type</button>
            </div>
          </div>

          <div>
            <div style={{ marginBottom: '6px', fontSize: '12px', fontWeight: 500, color: 'var(--text-2)' }}>Machine</div>
            <div className="tabs" style={{ marginBottom: 0 }}>
              {machineOptions.map((m) => {
                const machineColor = m.id !== 'all' ? MACHINES[m.id]?.themeColor : null;
                return (
                  <button key={m.id} type="button" className={`tab ${machine === m.id ? 'active' : ''}`}
                    onClick={() => setMachine(m.id)}
                    style={machine === m.id && machineColor ? { background: machineColor, borderColor: machineColor, color: '#fff' } : {}}>
                    {m.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <div style={{ marginBottom: '6px', fontSize: '12px', fontWeight: 500, color: 'var(--text-2)' }}>
              {field === 'bill_type' ? 'Bill Type' : 'Override Value (₹/litre)'}
            </div>
            {field === 'bill_type' ? (
              <div className="tabs" style={{ marginBottom: 0 }}>
                <button type="button" className={`tab ${value === 'gst' ? 'active' : ''}`}
                  onClick={() => setValue('gst')}>GST Bill</button>
                <button type="button" className={`tab ${value === 'non-gst' ? 'active' : ''}`}
                  onClick={() => setValue('non-gst')}>Non-GST Bill</button>
              </div>
            ) : (
              <input type="number" step="0.01" min="0" value={value} onChange={(e) => setValue(e.target.value)}
                placeholder={field === 'rate' ? 'e.g. 63' : 'e.g. 2'}
                style={styles.input} />
            )}
          </div>

          <button type="submit" className="btn btn-primary" style={{ marginTop: '4px' }}>
            Save Override
          </button>
        </form>
      </Modal>
    </div>
  );
}

const styles = {
  input: {
    width: '100%',
    padding: '9px 12px',
    border: '1px solid var(--border-mid)',
    borderRadius: 'var(--radius)',
    fontSize: '13px',
    color: 'var(--text)',
    outline: 'none',
    background: 'var(--surface)',
    boxSizing: 'border-box',
  },
};
