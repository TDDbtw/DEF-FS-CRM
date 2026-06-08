import React, { useState } from 'react';
import { MessageSquare, Phone, AlertTriangle, AlertCircle, CheckCircle, ArrowUpDown } from 'lucide-react';

export default function Alerts({ customers, fills }) {
  const [sortBy, setSortBy] = useState('days');
  const [page, setPage] = useState(1);
  const perPage = 10;

  const activeDays = Number(import.meta.env.VITE_ACTIVE_DAYS) || 21;
  const atRiskDays = Number(import.meta.env.VITE_ATRISK_DAYS) || 45;

  const getCustomerStatus = (cust) => {
    const custFills = fills
      .filter(f => f.vehicle.toUpperCase() === cust.vehicle.toUpperCase())
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
        style={{ marginBottom: '8px' }}
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
    </div>
  );
}
