import { useState } from 'react';
import { MessageSquare, Phone, AlertTriangle, AlertCircle, CheckCircle, ArrowUpDown, Calendar, BookOpen, MapPin, HelpCircle } from 'lucide-react';
import Modal from '../components/Modal';
import { MACHINES } from '../config/machines';

export default function Alerts({ customers, fills }) {
  const [sortBy, setSortBy] = useState('days');
  const [page, setPage] = useState(1);
  const perPage = 10;
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [selectedCust, setSelectedCust] = useState(null);

  const handleOpenDetail = (cust) => {
    setSelectedCust(cust);
    setDetailModalOpen(true);
  };

  const activeDays = Number(import.meta.env.VITE_ACTIVE_DAYS) || 21;
  const atRiskDays = Number(import.meta.env.VITE_ATRISK_DAYS) || 45;

  const getCustomerStatus = (cust) => {
    const custFills = fills
      .filter(f => (f.vehicle || '').toUpperCase() === (cust.vehicle || '').toUpperCase())
      .sort((a, b) => new Date(b.ts) - new Date(a.ts));
      
    if (custFills.length === 0) {
      return { status: 'new', daysSince: null, fillCount: 0, totalLitres: 0 };
    }
    
    const lastFill = custFills[0];
    const diffMs = Date.now() - new Date(lastFill.ts).getTime();
    const days = Math.floor(diffMs / 86400000);
    
    return {
      status: days <= activeDays ? 'active' : days <= atRiskDays ? 'at-risk' : 'churned',
      daysSince: days,
      fillCount: custFills.length,
      totalLitres: custFills.reduce((sum, f) => sum + (f.litres || 0), 0)
    };
  };

  const atRisk = customers.filter(c => getCustomerStatus(c).status === 'at-risk');
  const churned = customers.filter(c => getCustomerStatus(c).status === 'churned');

  const sortCustomers = (list) => {
    const sorted = [...list];
    switch (sortBy) {
      case 'days': sorted.sort((a, b) => getCustomerStatus(b).daysSince - getCustomerStatus(a).daysSince); break;
      case 'name': sorted.sort((a, b) => a.name.localeCompare(b.name)); break;
      case 'fills': sorted.sort((a, b) => getCustomerStatus(b).fillCount - getCustomerStatus(a).fillCount); break;
    }
    return sorted;
  };

  const paginate = (list) => {
    const start = (page - 1) * perPage;
    return list.slice(start, start + perPage);
  };

  const getWhatsAppLink = (c, daysSince) => {
    const ph = c.phone || c.co_phone || '';
    if (!ph) return '';
    const message = encodeURIComponent(`Hi ${c.name}, this is Green Land & Ocean Blue Energy (Shenkottai). It's been a while since your last visit — hope all is well. Do stop by when you need DEF/AdBlue for your vehicles. We're open daily. Thank you!`);
    return `https://wa.me/91${ph}?text=${message}`;
  };

  const renderAlertCard = (c, type) => {
    const stats = getCustomerStatus(c);
    const ph = c.phone || c.co_phone;
    const waLink = getWhatsAppLink(c, stats.daysSince);
    
    return (
      <div 
        key={c.id} 
        className={`customer-card ${type}`} 
        style={{ marginBottom: '8px', cursor: 'pointer' }}
        onClick={() => handleOpenDetail(c)}
      >
        <div className="cc-top">
          <div>
            <div className="cc-name">{c.name}</div>
            <div className="cc-company">{c.company || '—'} · <span style={{ fontFamily: 'var(--mono)', fontSize: '12px' }}>{c.vehicle}</span></div>
          </div>
          <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '6px' }}>
            <span style={{ 
              fontSize: '12px', 
              fontWeight: '600', 
              color: type === 'churned' ? 'var(--danger)' : 'var(--warn)' 
            }}>
              {stats.daysSince}d since last fill
            </span>
            {ph && (
              <a 
                href={waLink} 
                target="_blank" 
                rel="noopener noreferrer" 
                className="btn btn-outline btn-sm" 
                style={{ 
                  textDecoration: 'none', 
                  color: 'var(--ok)', 
                  display: 'inline-flex', 
                  alignItems: 'center', 
                  gap: '4px',
                  borderColor: 'var(--ok)',
                  background: 'var(--ok-soft)'
                }}
              >
                <MessageSquare size={12} />
                WhatsApp
              </a>
            )}
          </div>
        </div>
        <div className="cc-meta" style={{ marginTop: '8px' }}>
          <div className="cc-meta-item">🔢 {stats.fillCount} total fill{stats.fillCount !== 1 ? 's' : ''}</div>
          <div className="cc-meta-item">⛽ {(stats.totalLitres || 0).toFixed(1)}L total</div>
          {ph && <div className="cc-meta-item">📱 {ph}</div>}
        </div>
      </div>
    );
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-title">Customer Alerts</div>
          <div className="page-sub">Customers who have not visited recently</div>
        </div>
      </div>

      {atRisk.length === 0 && churned.length === 0 ? (
        <div className="alert-strip alert-ok" style={{ display: 'flex', alignItems: 'center' }}>
          <CheckCircle size={16} style={{ marginRight: '8px' }} />
          ✓ All active customers have filled recently. No alerts.
        </div>
      ) : (
        <>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '12px', flexWrap: 'wrap' }}>
            <div style={{ fontSize: '12px', color: 'var(--text-3)', fontWeight: '500' }}>Sort by:</div>
            {['days', 'name', 'fills'].map(s => (
              <button
                key={s}
                className={`btn btn-sm ${sortBy === s ? 'btn-primary' : 'btn-outline'}`}
                onClick={() => { setSortBy(s); setPage(1); }}
                style={{ fontSize: '11px', padding: '4px 10px' }}
              >
                <ArrowUpDown size={11} style={{ marginRight: '4px' }} />
                {s === 'days' ? 'Days Since' : s === 'name' ? 'Name' : 'Total Fills'}
              </button>
            ))}
          </div>

          {churned.length > 0 && (
            <div style={{ marginBottom: '24px' }}>
              <div 
                className="alert-strip" 
                style={{ 
                  background: 'var(--danger-soft)', 
                  color: '#7f1d1d', 
                  border: '1px solid #fca5a5', 
                  marginBottom: '12px',
                  display: 'flex',
                  alignItems: 'center'
                }}
              >
                <AlertCircle size={16} style={{ marginRight: '8px' }} />
                <strong>Inactive:</strong> {churned.length} customer{churned.length > 1 ? 's have' : ' has'} not filled in over {atRiskDays} days.
              </div>
              <div>
                {paginate(sortCustomers(churned)).map(c => renderAlertCard(c, 'churned'))}
              </div>
              {churned.length > perPage && (
                <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', marginTop: '8px' }}>
                  <button className="btn btn-outline btn-sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>← Prev</button>
                  <span style={{ fontSize: '12px', color: 'var(--text-3)', alignSelf: 'center' }}>Page {page} of {Math.ceil(churned.length / perPage)}</span>
                  <button className="btn btn-outline btn-sm" disabled={page >= Math.ceil(churned.length / perPage)} onClick={() => setPage(p => p + 1)}>Next →</button>
                </div>
              )}
            </div>
          )}

          {atRisk.length > 0 && (
            <div>
              <div 
                className="alert-strip alert-warn" 
                style={{ 
                  marginBottom: '12px',
                  display: 'flex',
                  alignItems: 'center'
                }}
              >
                <AlertTriangle size={16} style={{ marginRight: '8px' }} />
                <strong>At Risk:</strong> {atRisk.length} customer{atRisk.length > 1 ? 's are' : ' is'} at risk ({activeDays}–{atRiskDays} days since last visit).
              </div>
              <div>
                {paginate(sortCustomers(atRisk)).map(c => renderAlertCard(c, 'at-risk'))}
              </div>
              {atRisk.length > perPage && (
                <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', marginTop: '8px' }}>
                  <button className="btn btn-outline btn-sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>← Prev</button>
                  <span style={{ fontSize: '12px', color: 'var(--text-3)', alignSelf: 'center' }}>Page {page} of {Math.ceil(atRisk.length / perPage)}</span>
                  <button className="btn btn-outline btn-sm" disabled={page >= Math.ceil(atRisk.length / perPage)} onClick={() => setPage(p => p + 1)}>Next →</button>
                </div>
              )}
            </div>
          )}
        </>
      )}

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
                <div className="stat-val" style={{ fontSize: '18px' }}>₹{(stats.totalLitres * 55).toLocaleString('en-IN')}</div>
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
                    <div style={{ marginTop: '4px', fontFamily: 'var(--mono)' }}>{f.litres}L · ₹{(f.final || 0).toLocaleString('en-IN')}</div>
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
