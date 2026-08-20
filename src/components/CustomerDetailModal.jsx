import { useState } from 'react';
import Modal from './Modal';
import FillDetailsModal from './FillDetailsModal';
import { MACHINES } from '../config/machines';
import { MapPin, Phone, BookOpen, Calendar, HelpCircle, Edit3 } from 'lucide-react';
import { STATES, ACTIVE_DAYS, AT_RISK_DAYS } from '../config/constants';
import { dbAPI } from '../config/supabase';

export default function CustomerDetailModal({ customer, isOpen, onClose, fills, userRole, triggerToast, refreshData }) {
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState({});
  const [selectedFill, setSelectedFill] = useState(null);
  const [fillDetailOpen, setFillDetailOpen] = useState(false);

  if (!customer) return null;

  const getCustomerStatus = (cust) => {
    const custFills = fills
      .filter(f => (f.vehicle || '').toUpperCase() === (cust.vehicle || '').toUpperCase())
      .sort((a, b) => new Date(b.ts) - new Date(a.ts));

    if (custFills.length === 0) {
      return { status: 'new', daysSince: null, fillCount: 0, totalLitres: 0, totalRevenue: 0, lastFill: null };
    }

    const lastFill = custFills[0];
    const diffMs = Date.now() - new Date(lastFill.ts).getTime();
    const days = Math.floor(diffMs / 86400000);
    return {
      status: days <= ACTIVE_DAYS ? 'active' : days <= AT_RISK_DAYS ? 'at-risk' : 'churned',
      daysSince: days,
      fillCount: custFills.length,
      lastFill: lastFill,
      totalLitres: custFills.reduce((sum, f) => sum + (f.litres || 0), 0),
      totalRevenue: custFills.reduce((sum, f) => sum + (f.final || 0), 0)
    };
  };

  const handleOpen = () => {
    setEditForm({ ...customer });
    setEditing(false);
  };

  const handleUpdateCustomer = async (e) => {
    e.preventDefault();
    if (!editForm.name) {
      triggerToast('Name is required', 'warn');
      return;
    }
    const payload = {
      name: editForm.name.trim(),
      phone: editForm.phone?.trim() || null,
      company: editForm.company?.trim() || null,
      co_phone: editForm.co_phone?.trim() || null,
      state: editForm.state,
      notes: editForm.notes?.trim() || null,
    };
    const { error } = await dbAPI.updateCustomer(customer.id, payload);
    if (error) {
      triggerToast('Error updating customer: ' + error.message, 'warn');
    } else {
      triggerToast('Customer updated ✓');
      setEditing(false);
      refreshData();
    }
  };

  const stats = getCustomerStatus(customer);
  const custFills = fills
    .filter(f => (f.vehicle || '').toUpperCase() === (customer.vehicle || '').toUpperCase())
    .sort((a, b) => new Date(b.ts) - new Date(a.ts));

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={() => { onClose(); setEditing(false); }}
      title={customer.name}
    >
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '8px' }}>
        {userRole === 'office' && !editing && (
          <button className="btn btn-sm btn-outline" onClick={() => { handleOpen(); setEditing(true); }} style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <Edit3 size={13} /> Edit
          </button>
        )}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '16px' }}>
        <div className="stat-card">
          <div className="stat-label">Total Fills</div>
          <div className="stat-val">{stats.fillCount}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Total Litres</div>
          <div className="stat-val">{stats.totalLitres.toFixed(0)}L</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Total Revenue</div>
          <div className="stat-val" style={{ fontSize: '18px' }}>₹{stats.totalRevenue.toLocaleString('en-IN')}</div>
        </div>
        <div className={`stat-card ${stats.status === 'at-risk' || stats.status === 'churned' ? 'warn' : ''}`}>
          <div className="stat-label">Last Fill Visit</div>
          <div className="stat-val" style={{ fontSize: '18px' }}>
            {stats.daysSince === null ? '—' : stats.daysSince === 0 ? 'Today' : `${stats.daysSince}d ago`}
          </div>
        </div>
      </div>

      <div className="section-label">Details</div>
      {editing ? (
        <form onSubmit={handleUpdateCustomer} style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '16px' }}>
          <div className="form-row">
            <div className="fg">
              <label>Name</label>
              <input type="text" value={editForm.name || ''} onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))} required />
            </div>
            <div className="fg">
              <label>Phone</label>
              <input type="tel" value={editForm.phone || ''} onChange={e => setEditForm(f => ({ ...f, phone: e.target.value }))} maxLength={10} />
            </div>
          </div>
          <div className="form-row">
            <div className="fg">
              <label>Company</label>
              <input type="text" value={editForm.company || ''} onChange={e => setEditForm(f => ({ ...f, company: e.target.value }))} />
            </div>
            <div className="fg">
              <label>Company Phone</label>
              <input type="tel" value={editForm.co_phone || ''} onChange={e => setEditForm(f => ({ ...f, co_phone: e.target.value }))} maxLength={10} />
            </div>
          </div>
          <div className="form-row">
            <div className="fg">
              <label>State</label>
              <select value={editForm.state || 'Tamil Nadu'} onChange={e => setEditForm(f => ({ ...f, state: e.target.value }))}>
                {STATES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div className="fg">
              <label>Notes</label>
              <input type="text" value={editForm.notes || ''} onChange={e => setEditForm(f => ({ ...f, notes: e.target.value }))} placeholder="Any notes about this customer" />
            </div>
          </div>
          <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
            <button type="submit" className="btn btn-primary">Save</button>
            <button type="button" className="btn btn-outline" onClick={() => setEditing(false)}>Cancel</button>
          </div>
        </form>
      ) : (
      <div style={{ display: 'grid', gap: '6px', marginBottom: '16px', fontSize: '13px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span style={{ color: 'var(--text-2)', display: 'flex', alignItems: 'center', gap: '4px' }}><Calendar size={13} /> Vehicle</span>
          <span style={{ fontFamily: 'var(--mono)', fontWeight: '600' }}>{customer.vehicle}</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span style={{ color: 'var(--text-2)', display: 'flex', alignItems: 'center', gap: '4px' }}><Phone size={13} /> Phone</span>
          <span>{customer.phone || '—'}</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span style={{ color: 'var(--text-2)', display: 'flex', alignItems: 'center', gap: '4px' }}><BookOpen size={13} /> Company</span>
          <span>{customer.company || '—'}</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span style={{ color: 'var(--text-2)', display: 'flex', alignItems: 'center', gap: '4px' }}><Phone size={13} /> Company contact</span>
          <span>{customer.co_phone || '—'}</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span style={{ color: 'var(--text-2)', display: 'flex', alignItems: 'center', gap: '4px' }}><MapPin size={13} /> State</span>
          <span>{customer.state}</span>
        </div>
        {customer.notes && (
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ color: 'var(--text-2)', display: 'flex', alignItems: 'center', gap: '4px' }}><HelpCircle size={13} /> Notes</span>
            <span>{customer.notes}</span>
          </div>
        )}
      </div>
      )}

      <div className="section-label">Recent Fills</div>
      {custFills.slice(0, 5).map((f, i) => {
        const prev = custFills[i + 1];
        const kmSince = f.odo && prev && prev.odo && parseFloat(f.odo) > parseFloat(prev.odo)
          ? parseFloat(f.odo) - parseFloat(prev.odo)
          : null;
        return (
        <div key={f.id} style={{ padding: '8px 0', borderBottom: '1px solid var(--border)', fontSize: '12px', cursor: 'pointer', borderRadius: '6px', margin: '0 -6px', paddingLeft: '6px', paddingRight: '6px', transition: 'background 0.15s' }}
          onClick={() => { setSelectedFill(f); setFillDetailOpen(true); }}
          onMouseEnter={e => e.currentTarget.style.background = 'var(--bg)'}
          onMouseLeave={e => e.currentTarget.style.background = ''}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div style={{ fontWeight: '500' }}>
                {new Date(f.ts).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
              </div>
              <div style={{ color: 'var(--text-3)' }}>
                {f.employee} · {f.payment}
                {f.driver && <span> · {f.driver}</span>}
                {f.company && <span> · {f.company}</span>}
              </div>
              {f.odo && (
                <div style={{ color: 'var(--text-2)', marginTop: '3px', fontFamily: 'var(--mono)', fontSize: '11px' }}>
                  <span>🛣 {parseFloat(f.odo).toLocaleString('en-IN')} km</span>
                  {kmSince !== null && (
                    <span style={{ color: 'var(--text-3)', marginLeft: '8px' }}>
                      +{kmSince.toLocaleString('en-IN')} km since last
                    </span>
                  )}
                </div>
              )}
            </div>
            <div style={{ textAlign: 'right' }}>
              <span className={f.machine === 'hp' ? 'pill-hp' : f.machine === 'cb' ? 'pill-cb' : 'pill-warn'}>
                {MACHINES[f.machine]?.name || f.machine.toUpperCase()}
              </span>
              <div style={{ marginTop: '4px', fontFamily: 'var(--mono)' }}>{f.litres}L · ₹{f.final.toLocaleString('en-IN')}</div>
            </div>
          </div>
          {f.notes && (
            <div style={{ color: 'var(--text-3)', marginTop: '4px', paddingLeft: '2px', fontStyle: 'italic', fontSize: '11px' }}>
              “{f.notes}”
            </div>
          )}
        </div>
        );
      })}
      {custFills.length === 0 && (
        <div style={{ color: 'var(--text-3)', fontSize: '13px', textAlign: 'center', padding: '10px 0' }}>No fills recorded yet.</div>
      )}
      </Modal>

      <FillDetailsModal
        fill={selectedFill}
        customer={customer}
        isOpen={fillDetailOpen}
        onClose={() => setFillDetailOpen(false)}
      />
    </>
  );
}
