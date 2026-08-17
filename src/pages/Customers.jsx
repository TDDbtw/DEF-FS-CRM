import { useState, useEffect } from 'react';
import { dbAPI } from '../config/supabase';
import Modal from '../components/Modal';
import CustomerDetailModal from '../components/CustomerDetailModal';
import { Search, Plus } from 'lucide-react';
import { STATES, ACTIVE_DAYS, AT_RISK_DAYS } from '../config/constants';

export default function Customers({ customers, fills, triggerToast, refreshData, userRole }) {
  const [activeTab, setActiveTab] = useState('all'); // all, active, at-risk, churned
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(0);
  const pageSize = 10;
  
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

  // Reset to first page when filters/tabs/search change
  useEffect(() => { setPage(0); }, [activeTab, searchQuery]);

  const totalPages = Math.max(1, Math.ceil(filteredCustomers.length / pageSize));
  const pagedCustomers = filteredCustomers.slice(page * pageSize, (page + 1) * pageSize);

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

    try {
      const { error } = await dbAPI.addCustomer(payload);

      if (error) {
        triggerToast('Error adding customer: ' + error.message, 'warn');
      } else {
        triggerToast('Customer registered successfully ✓');
        setAddModalOpen(false);
        resetNewForm();
        refreshData();
      }
    } catch (e) {
      triggerToast('Failed to add customer. Check your connection.', 'warn');
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
          pagedCustomers.map(c => {
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

      {filteredCustomers.length > 0 && totalPages > 1 && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 4px 0' }}>
          <span style={{ fontSize: '11px', color: 'var(--text-3)', fontWeight: '500' }}>
            {filteredCustomers.length === 0
              ? 'No entries'
              : `${page * pageSize + 1}–${Math.min((page + 1) * pageSize, filteredCustomers.length)} of ${filteredCustomers.length}`}
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
      )}

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
      <CustomerDetailModal
        customer={selectedCust}
        isOpen={detailModalOpen}
        onClose={() => setDetailModalOpen(false)}
        fills={fills}
        userRole={userRole}
        triggerToast={triggerToast}
        refreshData={refreshData}
      />
    </div>
  );
}
