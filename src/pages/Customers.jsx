import { useState } from 'react';
import { dbAPI } from '../config/supabase';
import Modal from '../components/Modal';
import { MACHINES } from '../config/machines';
import { Search, Plus, MapPin, Phone, BookOpen, Calendar, HelpCircle } from 'lucide-react';
import { STATES, ACTIVE_DAYS, AT_RISK_DAYS } from '../config/constants';

export default function Customers({ customers, fills, triggerToast, refreshData }) {
  const [activeTab, setActiveTab] = useState('all'); // all, active, at-risk, churned
  const [searchQuery, setSearchQuery] = useState('');
  
  // Modals state
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [selectedCust, setSelectedCust] = useState(null);

  // New Customer Form State
  const [newName, setNewName] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newVeh, setNewVeh] = useState('');
  const [newCompany, setNewCompany] = useState('');
  const [newCoPhone, setNewCoPhone] = useState('');
  const [newState, setNewState] = useState('Tamil Nadu');
  const [newNotes, setNewNotes] = useState('');

  // Helper: calculate customer status and stats
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

  // Filter customers
  const filteredCustomers = customers.filter(c => {
    // 1. Tab filter
    const stats = getCustomerStatus(c);
    if (activeTab === 'active' && stats.status !== 'active' && stats.status !== 'new') return false;
    if (activeTab === 'at-risk' && stats.status !== 'at-risk') return false;
    if (activeTab === 'churned' && stats.status !== 'churned') return false;

    // 2. Search query filter
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const matchVeh = c.vehicle.toLowerCase().includes(q);
      const matchName = c.name.toLowerCase().includes(q);
      const matchComp = (c.company || '').toLowerCase().includes(q);
      const matchPhone = (c.phone || '').includes(q);
      return matchVeh || matchName || matchComp || matchPhone;
    }
    
    return true;
  }).sort((a, b) => {
    // Sort: newest fills first, then new customers
    const statsA = getCustomerStatus(a);
    const statsB = getCustomerStatus(b);
    if (statsA.daysSince === null) return 1;
    if (statsB.daysSince === null) return -1;
    return statsA.daysSince - statsB.daysSince;
  });

  const handleOpenDetail = (cust) => {
    setSelectedCust(cust);
    setDetailModalOpen(true);
  };

  const handleSaveCustomer = async (e) => {
    e.preventDefault();
    if (!newName) {
      triggerToast('Name is required', 'warn');
      return;
    }

    const payload = {
      name: newName.trim(),
      phone: newPhone.trim() || null,
      vehicle: newVeh.trim().toUpperCase() || 'Unknown-' + Date.now(),
      company: newCompany.trim() || null,
      co_phone: newCoPhone.trim() || null,
      state: newState,
      notes: newNotes.trim() || null,
    };

    const { error } = await dbAPI.addCustomer(payload);

    if (error) {
      triggerToast('Error adding customer: ' + error.message, 'warn');
    } else {
      triggerToast('Customer registered successfully ✓');
      setAddModalOpen(false);
      resetNewForm();
      refreshData();
    }
  };

  const resetNewForm = () => {
    setNewName('');
    setNewPhone('');
    setNewVeh('');
    setNewCompany('');
    setNewCoPhone('');
    setNewState('Tamil Nadu');
    setNewNotes('');
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-title">Customers</div>
          <div className="page-sub">{filteredCustomers.length} registered customers</div>
        </div>
        <button className="btn btn-primary" onClick={() => setAddModalOpen(true)} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <Plus size={16} />
          Add Customer
        </button>
      </div>

      <div className="tabs">
        <button className={`tab ${activeTab === 'all' ? 'active' : ''}`} onClick={() => setActiveTab('all')}>All</button>
        <button className={`tab ${activeTab === 'active' ? 'active' : ''}`} onClick={() => setActiveTab('active')}>Active</button>
        <button className={`tab ${activeTab === 'at-risk' ? 'active' : ''}`} onClick={() => setActiveTab('at-risk')}>At Risk</button>
        <button className={`tab ${activeTab === 'churned' ? 'active' : ''}`} onClick={() => setActiveTab('churned')}>Inactive</button>
      </div>

      <div className="search-bar">
        <Search size={16} className="search-icon" />
        <input 
          type="text" 
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search by name, vehicle number, company..." 
        />
      </div>

      <div className="customer-list">
        {filteredCustomers.length === 0 ? (
          <div className="card card-pad" style={{ textAlign: 'center', color: 'var(--text-3)' }}>
            No customers found matching this criteria.
          </div>
        ) : (
          filteredCustomers.map(c => {
            const stats = getCustomerStatus(c);
            let statusColor = 'dot-ok';
            let statusText = 'New Customer';

            if (stats.status === 'active') {
              statusColor = 'dot-ok';
              statusText = stats.daysSince === 0 ? 'Filled today' : `${stats.daysSince}d ago`;
            } else if (stats.status === 'at-risk') {
              statusColor = 'dot-warn';
              statusText = `${stats.daysSince}d ago`;
            } else if (stats.status === 'churned') {
              statusColor = 'dot-hp'; // HP red represents inactive/danger
              statusText = `${stats.daysSince}d ago`;
            }

            return (
              <div 
                key={c.id} 
                className={`customer-card ${stats.status === 'at-risk' ? 'at-risk' : stats.status === 'churned' ? 'churned' : ''}`}
                onClick={() => handleOpenDetail(c)}
              >
                <div className="cc-top">
                  <div>
                    <div className="cc-name">{c.name}</div>
                    <div className="cc-company">{c.company || '—'} · {c.state}</div>
                  </div>
                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <div style={{ fontFamily: 'var(--mono)', fontSize: '12px', fontWeight: '600', color: 'var(--text-2)' }}>{c.vehicle}</div>
                    <div style={{ fontSize: '11px', color: 'var(--text-3)', marginTop: '2px' }}>{c.phone || ''}</div>
                  </div>
                </div>
                <div className="cc-meta">
                  <div className="cc-meta-item">
                    <span className={`dot ${statusColor}`}></span>
                    {statusText}
                  </div>
                  <div className="cc-meta-item">🔢 {stats.fillCount} fill{stats.fillCount !== 1 ? 's' : ''}</div>
                  {stats.totalLitres > 0 && (
                    <div className="cc-meta-item">⛽ {stats.totalLitres.toFixed(1)}L total</div>
                  )}
                  {stats.totalRevenue > 0 && (
                    <div className="cc-meta-item">₹{stats.totalRevenue.toLocaleString('en-IN')}</div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Add Customer Modal */}
      <Modal
        isOpen={addModalOpen}
        onClose={() => setAddModalOpen(false)}
        title="Register New Customer"
        footer={
          <>
            <button className="btn btn-outline" onClick={() => setAddModalOpen(false)}>Cancel</button>
            <button className="btn btn-primary" onClick={handleSaveCustomer}>Register Customer</button>
          </>
        }
      >
        <div className="form-grid">
          <div className="form-row">
            <div className="fg">
              <label>Contact name <span className="req">*</span></label>
              <input type="text" value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Driver or owner name" />
            </div>
            <div className="fg">
              <label>Phone number</label>
              <input type="tel" value={newPhone} onChange={(e) => setNewPhone(e.target.value)} placeholder="Mobile" maxLength={10} />
            </div>
          </div>
          <div className="form-row">
            <div className="fg">
              <label>Vehicle number <span className="req">*</span></label>
              <input 
                type="text" 
                value={newVeh} 
                onChange={(e) => setNewVeh(e.target.value)} 
                placeholder="TN72AB1234" 
                style={{ textTransform: 'uppercase', fontFamily: 'var(--mono)' }} 
              />
            </div>
            <div className="fg">
              <label>Company / Transport</label>
              <input type="text" value={newCompany} onChange={(e) => setNewCompany(e.target.value)} placeholder="Transport name" />
            </div>
          </div>
          <div className="form-row">
            <div className="fg">
              <label>Company phone</label>
              <input type="tel" value={newCoPhone} onChange={(e) => setNewCoPhone(e.target.value)} placeholder="Mobile" maxLength={10} />
            </div>
            <div className="fg">
              <label>State</label>
              <select value={newState} onChange={(e) => setNewState(e.target.value)}>
                {STATES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          </div>
          <div className="fg">
            <label>Notes</label>
            <input type="text" value={newNotes} onChange={(e) => setNewNotes(e.target.value)} placeholder="Preferred machine, credit terms, notes, etc." />
          </div>
        </div>
      </Modal>

      {/* Customer Detail Modal */}
      {selectedCust && (() => {
        const stats = getCustomerStatus(selectedCust);
        const custFills = fills
          .filter(f => (f.vehicle || '').toUpperCase() === (selectedCust.vehicle || '').toUpperCase())
          .sort((a, b) => new Date(b.ts) - new Date(a.ts));
          
        return (
          <Modal
            isOpen={detailModalOpen}
            onClose={() => setDetailModalOpen(false)}
            title={selectedCust.name}
          >
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
            <div style={{ display: 'grid', gap: '6px', marginBottom: '16px', fontSize: '13px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-2)', display: 'flex', alignItems: 'center', gap: '4px' }}><Calendar size={13} /> Vehicle</span>
                <span style={{ fontFamily: 'var(--mono)', fontWeight: '600' }}>{selectedCust.vehicle}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-2)', display: 'flex', alignItems: 'center', gap: '4px' }}><Phone size={13} /> Phone</span>
                <span>{selectedCust.phone || '—'}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-2)', display: 'flex', alignItems: 'center', gap: '4px' }}><BookOpen size={13} /> Company</span>
                <span>{selectedCust.company || '—'}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-2)', display: 'flex', alignItems: 'center', gap: '4px' }}><Phone size={13} /> Company contact</span>
                <span>{selectedCust.co_phone || '—'}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-2)', display: 'flex', alignItems: 'center', gap: '4px' }}><MapPin size={13} /> State</span>
                <span>{selectedCust.state}</span>
              </div>
              {selectedCust.notes && (
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-2)', display: 'flex', alignItems: 'center', gap: '4px' }}><HelpCircle size={13} /> Notes</span>
                  <span>{selectedCust.notes}</span>
                </div>
              )}
            </div>

            <div className="section-label">Recent Fills</div>
            {custFills.slice(0, 5).map(f => (
              <div key={f.id} style={{ padding: '8px 0', borderBottom: '1px solid var(--border)', fontSize: '12px' }}>
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
            ))}
            {custFills.length === 0 && (
              <div style={{ color: 'var(--text-3)', fontSize: '13px', textAlign: 'center', padding: '10px 0' }}>No fills recorded yet.</div>
            )}
          </Modal>
        );
      })()}
    </div>
  );
}
