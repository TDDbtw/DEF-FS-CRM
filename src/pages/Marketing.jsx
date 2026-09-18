import { useState, useMemo } from 'react';
import { dbAPI } from '../config/supabase';
import { Search, Plus, Pencil, Trash2, Eye, Megaphone, Phone, Building2, User, Calendar, Info, Download, ChevronLeft, ChevronRight, Filter } from 'lucide-react';
// import * as XLSX from 'xlsx';
import ExcelJS from 'exceljs';
import Modal from '../components/Modal';

const STATUS_OPTIONS = ['New', 'Contacted', 'Follow-up', 'Converted', 'Lost', 'Not Interested'];

const STATUS_STYLES = {
  'New':             { bg: 'var(--cb-soft)',    color: 'var(--cb)' },
  'Contacted':       { bg: 'var(--hp-soft)',    color: 'var(--hp)' },
  'Follow-up':       { bg: 'var(--warn-soft)',  color: 'var(--warn)' },
  'Converted':       { bg: 'var(--ok-soft)',    color: 'var(--ok)' },
  'Lost':            { bg: 'var(--bg)',         color: 'var(--text-3)' },
  'Not Interested':  { bg: '#f3e8ff',          color: '#7c3aed' },
};

const PAGE_SIZE = 25;

const emptyLead = {
  date: new Date().toISOString().slice(0, 10),
  product: 'ADBLUE',
  customer: '',
  persons_met: '',
  designation: '',
  mobile: '',
  details: '',
  reply: '',
  payment_terms: '',
  present_supplier: '',
  present_rate: '',
  key_person: '',
  other_info: '',
  ibc_required: false,
  status: 'New',
};

export default function Marketing({ currentUser, triggerToast }) {
  const userRole = currentUser?.role;

  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);

  const todayStr = new Date().toISOString().slice(0, 10);

  const datePresets = [
    { label: 'Today',       range: () => ({ from: todayStr, to: todayStr }) },
    { label: 'This Week',   range: () => { const d = new Date(); d.setDate(d.getDate() - d.getDay()); return { from: d.toISOString().slice(0,10), to: todayStr }; } },
    { label: 'This Month',  range: () => { const d = new Date(); d.setDate(1); return { from: d.toISOString().slice(0,10), to: todayStr }; } },
    { label: 'All Time',    range: () => ({ from: '', to: '' }) },
  ];

  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [activePreset, setActivePreset] = useState('All Time');
  const [showCustom, setShowCustom] = useState(false);

  const [activeStatus, setActiveStatus] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);
  const [includeNotInterested, setIncludeNotInterested] = useState(false);

  const [addModalOpen, setAddModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [selectedLead, setSelectedLead] = useState(null);
  const [formData, setFormData] = useState({ ...emptyLead });
  const [saving, setSaving] = useState(false);

  const loadLeads = async () => {
    setLoading(true);
    const { data, error } = await dbAPI.fetchLeads();
    if (error) {
      triggerToast('Could not load marketing leads', 'warn');
    } else {
      setLeads(data || []);
    }
    setLoading(false);
  };

  useMemo(() => { loadLeads(); }, []);

  const statusCounts = useMemo(() => {
    const counts = { All: leads.length };
    STATUS_OPTIONS.forEach(s => { counts[s] = leads.filter(l => l.status === s).length; });
    return counts;
  }, [leads]);

  const filtered = useMemo(() => {
    let result = leads;
    if (activeStatus !== 'All') {
      result = result.filter(l => l.status === activeStatus);
    }
    if (dateFrom) {
      result = result.filter(l => (l.date || '') >= dateFrom);
    }
    if (dateTo) {
      const nextDay = new Date(dateTo);
      nextDay.setDate(nextDay.getDate() + 1);
      const toInc = nextDay.toISOString().slice(0, 10);
      result = result.filter(l => (l.date || '') < toInc);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(l =>
        (l.customer || '').toLowerCase().includes(q) ||
        (l.mobile || '').toLowerCase().includes(q) ||
        (l.designation || '').toLowerCase().includes(q) ||
        (l.key_person || '').toLowerCase().includes(q) ||
        (l.details || '').toLowerCase().includes(q)
      );
    }
    return result;
  }, [leads, activeStatus, dateFrom, dateTo, searchQuery]);

  const exportFiltered = useMemo(() => {
    if (includeNotInterested) return filtered;
    return filtered.filter(l => l.status !== 'Not Interested');
  }, [filtered, includeNotInterested]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paged = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const handlePreset = (rangeFn, label) => {
    const { from, to } = rangeFn();
    setDateFrom(from);
    setDateTo(to);
    setActivePreset(label);
    setPage(1);
  };

  const navigateDay = (dir) => {
    const base = dateFrom || todayStr;
    const d = new Date(base);
    d.setDate(d.getDate() + dir);
    const next = d.toISOString().slice(0, 10);
    if (next > todayStr) return;
    setDateFrom(next);
    setDateTo(next);
    setActivePreset('');
    setPage(1);
  };

  const handleFormChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleAdd = async () => {
    if (!formData.customer.trim()) {
      triggerToast('Customer name is required', 'warn');
      return;
    }
    setSaving(true);
    const payload = {
      ...formData,
      persons_met: formData.persons_met ? parseInt(formData.persons_met) : 0,
      created_by: currentUser?.name || 'Unknown',
    };
    const { data, error } = await dbAPI.addLead(payload);
    if (error) {
      triggerToast('Failed to save lead', 'warn');
    } else {
      triggerToast('Lead added successfully');
      setAddModalOpen(false);
      setFormData({ ...emptyLead });
      await loadLeads();
    }
    setSaving(false);
  };

  const handleEdit = async () => {
    if (!formData.customer.trim()) {
      triggerToast('Customer name is required', 'warn');
      return;
    }
    setSaving(true);
    const payload = {
      ...formData,
      persons_met: formData.persons_met ? parseInt(formData.persons_met) : 0,
    };
    const { data, error } = await dbAPI.updateLead(selectedLead.id, payload);
    if (error) {
      triggerToast('Failed to update lead', 'warn');
    } else {
      triggerToast('Lead updated');
      setEditModalOpen(false);
      setSelectedLead(null);
      await loadLeads();
    }
    setSaving(false);
  };

  const handleDelete = async (lead) => {
    if (!confirm(`Delete lead for "${lead.customer}"?`)) return;
    const { error } = await dbAPI.deleteLead(lead.id);
    if (error) {
      triggerToast('Failed to delete lead', 'warn');
    } else {
      triggerToast('Lead deleted');
      setDetailModalOpen(false);
      setSelectedLead(null);
      await loadLeads();
    }
  };

  const handleStatusChange = async (lead, newStatus) => {
    const { error } = await dbAPI.updateLead(lead.id, { status: newStatus });
    if (error) {
      triggerToast('Failed to update status', 'warn');
    } else {
      triggerToast(`Status changed to ${newStatus}`);
      await loadLeads();
    }
  };

  const openAddModal = () => {
    setFormData({ ...emptyLead, date: new Date().toISOString().slice(0, 10) });
    setAddModalOpen(true);
  };

  const openEditModal = (lead) => {
    setFormData({
      date: lead.date || new Date().toISOString().slice(0, 10),
      product: lead.product || 'ADBLUE',
      customer: lead.customer || '',
      persons_met: lead.persons_met || '',
      designation: lead.designation || '',
      mobile: lead.mobile || '',
      details: lead.details || '',
      reply: lead.reply || '',
      payment_terms: lead.payment_terms || '',
      present_supplier: lead.present_supplier || '',
      present_rate: lead.present_rate || '',
      key_person: lead.key_person || '',
      other_info: lead.other_info || '',
      ibc_required: lead.ibc_required || false,
      status: lead.status || 'New',
    });
    setSelectedLead(lead);
    setEditModalOpen(true);
  };

  const openDetailModal = (lead) => {
    setSelectedLead(lead);
    setDetailModalOpen(true);
  };

  // const exportXLSX = () => {
  //   if (filtered.length === 0) return;
  //   try {
  //     const headers = [
  //       'Date', 'Product', 'Customer', 'Persons Met', 'Designation', 'Mobile No',
  //       'Details', 'Reply', 'Payment Terms', 'Present Supplier', 'Present Rate',
  //       'Key Person', 'Other Info', 'IBC Required', 'Status', 'Created By'
  //     ];
  //     const rows = filtered.map(l => [
  //       l.date || '',
  //       l.product || '',
  //       l.customer || '',
  //       l.persons_met || '',
  //       l.designation || '',
  //       l.mobile || '',
  //       l.details || '',
  //       l.reply || '',
  //       l.payment_terms || '',
  //       l.present_supplier || '',
  //       l.present_rate || '',
  //       l.key_person || '',
  //       l.other_info || '',
  //       l.ibc_required ? 'Yes' : 'No',
  //       l.status || '',
  //       l.created_by || '',
  //     ]);

  //     const wsData = [headers, ...rows];
  //     const ws = XLSX.utils.aoa_to_sheet(wsData);
  //     const colWidths = headers.map((h, colIdx) => {
  //       const lengths = wsData.map(row => String(row[colIdx] ?? '').length);
  //       const max = Math.max(...lengths, h.length);
  //       return { wch: Math.min(max + 2, 40) };
  //     });
  //     ws['!cols'] = colWidths;

  //     const wb = XLSX.utils.book_new();
  //     XLSX.utils.book_append_sheet(wb, ws, 'Marketing Leads');
  //     XLSX.writeFile(wb, `marketing_leads_${new Date().toISOString().slice(0, 10)}.xlsx`);
  //     triggerToast('Excel file exported');
  //   } catch (err) {
  //     console.error('XLSX export failed:', err);
  //     triggerToast('Excel export failed. Please try again.', 'warn');
  //   }
  // };
const exportXLSX = async () => {
  if (exportFiltered.length === 0) return;
  try {
    const COMPANY_HEADER =
      'GREEN LAND AND OCEAN BLUE ENERGY, OFFICIAL  DISTRIBUTOR FOR HP DEF,ROHAN ADBLUE, GULF ADBLUE';

    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet('Marketing Leads');

    ws.columns = [
      { width: 4 },  // SN
      { width: 22 }, // CUSTOMER
      { width: 12 }, // PERSONS MET
      { width: 16 }, // DESIGNATION
      { width: 14 }, // MOBILE NO
      { width: 18 }, // FIELD
      { width: 30 }, // VALUE
      { width: 40 }, // NOTES
    ];

    // Row 1: company banner, bold + merged across the full width
    const bannerRow = ws.addRow([COMPANY_HEADER]);
    ws.mergeCells(1, 1, 1, 8);
    bannerRow.getCell(1).font = { bold: true, size: 12 };
    bannerRow.getCell(1).alignment = { vertical: 'middle', horizontal: 'left' };

    // Row 2: header row, bold with shaded fill
    const headerRow = ws.addRow([
      'SN', 'CUSTOMER', 'PERSONS MET', 'DESIGNATION', 'MOBILE NO', 'FIELD', 'VALUE', 'NOTES',
    ]);
    headerRow.eachCell((cell) => {
      cell.font = { bold: true };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD9D9D9' } };
      cell.border = {
        top: { style: 'thin' }, left: { style: 'thin' },
        bottom: { style: 'thin' }, right: { style: 'thin' },
      };
    });

    const thinBorder = {
      top: { style: 'thin' }, left: { style: 'thin' },
      bottom: { style: 'thin' }, right: { style: 'thin' },
    };
    const addBorderedRow = (values) => {
      const row = ws.addRow(values);
      row.eachCell({ includeEmpty: true }, (cell) => {
        cell.border = thinBorder;
      });
      return row;
    };

    exportFiltered.forEach((l, idx) => {
      // Main row: identity columns + first label/value pair
      addBorderedRow([
        idx + 1,
        l.customer || '',
        l.persons_met || '',
        l.designation || '',
        l.mobile || '',
        'DATE',
        l.date || '',
        l.details || '',
      ]);

      // Remaining label/value rows — same shape as the PMNT TERMS / PRESENT SUPPLIER /
      // PRESENT RATE / KEY PERSON rows in your source files
      const subRows = [
        ['PRODUCT', l.product || ''],
        ['REPLY', l.reply || ''],
        ['PMNT TERMS', l.payment_terms || ''],
        ['PRESENT SUPPLIER', l.present_supplier || ''],
        ['PRESENT RATE', l.present_rate || ''],
        ['KEY PERSON', l.key_person || ''],
        ['IBC REQD.', l.ibc_required ? 'Yes' : 'No'],
        ['STATUS', l.status || ''],
        ['CREATED BY', l.created_by || ''],
      ];
      subRows.forEach(([label, value]) => {
        const row = addBorderedRow(['', '', '', '', '', label, value, '']);
        row.getCell(6).font = { bold: true };
      });

      // OTHER INFO row
      const otherRow = addBorderedRow(['', 'OTHER INFO', l.other_info || '', '', '', '', '', '']);
      otherRow.getCell(2).font = { bold: true };

      // spacer row between records
      ws.addRow([]);
    });

    const buffer = await wb.xlsx.writeBuffer();
    const blob = new Blob([buffer], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `marketing_leads_${new Date().toISOString().slice(0, 10)}.xlsx`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);

    triggerToast('Excel file exported');
  } catch (err) {
    console.error('XLSX export failed:', err);
    triggerToast('Excel export failed. Please try again.', 'warn');
  }
};
  const formatDate = (d) => {
    if (!d) return '—';
    return new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  const renderFormFields = () => (
    <div className="form-grid">
      <div className="form-row">
        <div className="fg">
          <label>Date <span className="req">*</span></label>
          <input type="date" value={formData.date} onChange={e => handleFormChange('date', e.target.value)} />
        </div>
        <div className="fg">
          <label>Product</label>
          <input type="text" value={formData.product} onChange={e => handleFormChange('product', e.target.value)} />
        </div>
      </div>
      <div className="form-row">
        <div className="fg">
          <label>Customer <span className="req">*</span></label>
          <input type="text" value={formData.customer} onChange={e => handleFormChange('customer', e.target.value)} placeholder="Company name" />
        </div>
        <div className="fg">
          <label>Mobile No</label>
          <input type="tel" value={formData.mobile} onChange={e => handleFormChange('mobile', e.target.value)} placeholder="Phone number" />
        </div>
      </div>
      <div className="form-row">
        <div className="fg">
          <label>Persons Met</label>
          <input type="number" min="0" value={formData.persons_met} onChange={e => handleFormChange('persons_met', e.target.value)} placeholder="0" />
        </div>
        <div className="fg">
          <label>Designation</label>
          <input type="text" value={formData.designation} onChange={e => handleFormChange('designation', e.target.value)} placeholder="e.g. Fleet Manager" />
        </div>
      </div>
      <div className="form-row">
        <div className="fg">
          <label>Details</label>
          <input type="text" value={formData.details} onChange={e => handleFormChange('details', e.target.value)} placeholder="What they need" />
        </div>
        <div className="fg">
          <label>Key Person</label>
          <input type="text" value={formData.key_person} onChange={e => handleFormChange('key_person', e.target.value)} placeholder="Decision maker" />
        </div>
      </div>
      <div className="form-row">
        <div className="fg">
          <label>Payment Terms</label>
          <input type="text" value={formData.payment_terms} onChange={e => handleFormChange('payment_terms', e.target.value)} placeholder="e.g. Monthly, Cash" />
        </div>
        <div className="fg">
          <label>Present Supplier</label>
          <input type="text" value={formData.present_supplier} onChange={e => handleFormChange('present_supplier', e.target.value)} placeholder="Current supplier" />
        </div>
      </div>
      <div className="form-row">
        <div className="fg">
          <label>Present Rate</label>
          <input type="text" value={formData.present_rate} onChange={e => handleFormChange('present_rate', e.target.value)} placeholder="e.g. ₹38/L" />
        </div>
        <div className="fg">
          <label>Status</label>
          <select value={formData.status} onChange={e => handleFormChange('status', e.target.value)}>
            {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
      </div>
      <div className="form-row">
        <div className="fg">
          <label>Reply</label>
          <input type="text" value={formData.reply} onChange={e => handleFormChange('reply', e.target.value)} placeholder="Their response" />
        </div>
        <div className="fg">
          <label>Other Info</label>
          <input type="text" value={formData.other_info} onChange={e => handleFormChange('other_info', e.target.value)} placeholder="Any other notes" />
        </div>
      </div>
      <div className="form-row">
        <div className="fg">
          <label style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <input
              type="checkbox"
              checked={formData.ibc_required}
              onChange={e => handleFormChange('ibc_required', e.target.checked)}
              style={{ width: 'auto' }}
            />
            IBC Required
          </label>
        </div>
      </div>
    </div>
  );

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title"><Megaphone size={18} /> Marketing</h1>
          <p className="page-sub">{leads.length} total leads &middot; {statusCounts['New'] || 0} new</p>
        </div>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <label style={{ fontSize: '11px', color: 'var(--text-2)', display: 'flex', alignItems: 'center', gap: '4px', whiteSpace: 'nowrap' }}>
            <input
              type="checkbox"
              checked={includeNotInterested}
              onChange={e => setIncludeNotInterested(e.target.checked)}
              style={{ width: 'auto' }}
            />
            Include Not Interested
          </label>
          <button className="btn btn-outline" onClick={exportXLSX} disabled={exportFiltered.length === 0} title="Export to Excel">
            <Download size={14} /> Excel ({exportFiltered.length})
          </button>
          {userRole !== 'office' && (
            <button className="btn btn-primary" onClick={openAddModal}>
              <Plus size={14} /> Add Lead
            </button>
          )}
        </div>
      </div>

      <div className="tabs" style={{ marginBottom: '12px', flexWrap: 'wrap' }}>
        {['All', ...STATUS_OPTIONS].map(s => (
          <button
            key={s}
            className={`tab ${activeStatus === s ? 'active' : ''}`}
            onClick={() => { setActiveStatus(s); setPage(1); }}
          >
            {s} <span style={{ fontSize: '10px', opacity: 0.7 }}>({statusCounts[s] || 0})</span>
          </button>
        ))}
      </div>

      {/* Date filter */}
      <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', alignItems: 'center', marginBottom: '10px' }}>
        {datePresets.map(p => (
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
          onClick={() => setShowCustom(v => !v)}
          className={`btn btn-sm ${showCustom ? 'btn-primary' : 'btn-outline'}`}
          title="Custom date range"
        >
          <Filter size={12} /> Custom
        </button>

        <span style={{ flex: 1 }} />

        {dateFrom && (
          <span style={{ fontSize: '12px', color: 'var(--text-2)', fontWeight: '500' }}>
            {dateFrom === dateTo
              ? new Date(dateFrom).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
              : `${new Date(dateFrom).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })} – ${new Date(dateTo).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}`
            }
          </span>
        )}
        {!dateFrom && (
          <span style={{ fontSize: '12px', color: 'var(--text-2)', fontWeight: '500' }}>All dates</span>
        )}

        <button onClick={() => navigateDay(-1)} className="btn btn-sm btn-outline" title="Previous day">
          <ChevronLeft size={14} />
        </button>
        <button
          onClick={() => navigateDay(1)}
          className="btn btn-sm btn-outline"
          title="Next day"
          disabled={dateFrom >= todayStr}
        >
          <ChevronRight size={14} />
        </button>
      </div>

      {showCustom && (
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'flex-end', marginBottom: '10px', paddingBottom: '10px', borderBottom: '1px solid var(--border)' }}>
          <div className="fg" style={{ minWidth: '130px' }}>
            <label style={{ fontSize: '10px', fontWeight: '600', color: 'var(--text-3)' }}><Calendar size={10} style={{ display: 'inline', marginRight: 3 }} />From</label>
            <input type="date" value={dateFrom} onChange={e => { setDateFrom(e.target.value); setActivePreset(''); setPage(1); }} style={{ padding: '6px 10px', fontSize: '12px', border: '1px solid var(--border)', borderRadius: '8px', background: 'var(--surface)', color: 'var(--text)' }} />
          </div>
          <div className="fg" style={{ minWidth: '130px' }}>
            <label style={{ fontSize: '10px', fontWeight: '600', color: 'var(--text-3)' }}>To</label>
            <input type="date" value={dateTo} onChange={e => { setDateTo(e.target.value); setActivePreset(''); setPage(1); }} style={{ padding: '6px 10px', fontSize: '12px', border: '1px solid var(--border)', borderRadius: '8px', background: 'var(--surface)', color: 'var(--text)' }} />
          </div>
        </div>
      )}

      <div className="search-bar" style={{ marginBottom: '12px' }}>
        <Search size={14} className="search-icon" />
        <input
          placeholder="Search by customer, mobile, designation..."
          value={searchQuery}
          onChange={e => { setSearchQuery(e.target.value); setPage(1); }}
        />
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-3)' }}>Loading leads...</div>
      ) : filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-3)' }}>
          {leads.length === 0 ? 'No leads yet. Click "Add Lead" to get started.' : 'No leads match your search.'}
        </div>
      ) : (
        <>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid var(--border)' }}>
                  <th style={thStyle}>#</th>
                  <th style={thStyle}>Date</th>
                  <th style={thStyle}>Customer</th>
                  <th style={thStyle}>Designation</th>
                  <th style={thStyle}>Mobile</th>
                  <th style={thStyle}>Details</th>
                  <th style={thStyle}>Status</th>
                  <th style={thStyle}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {paged.map((lead, i) => (
                  <tr
                    key={lead.id}
                    style={{ borderBottom: '1px solid var(--border)', cursor: 'pointer', transition: 'background 0.15s' }}
                    onMouseEnter={e => e.currentTarget.style.background = 'var(--bg)'}
                    onMouseLeave={e => e.currentTarget.style.background = ''}
                  >
                    <td style={tdStyle}>{(page - 1) * PAGE_SIZE + i + 1}</td>
                    <td style={tdStyle}>{formatDate(lead.date)}</td>
                    <td style={{ ...tdStyle, fontWeight: '600', color: 'var(--text)' }}>{lead.customer}</td>
                    <td style={tdStyle}>{lead.designation || '—'}</td>
                    <td style={{ ...tdStyle, fontFamily: 'var(--mono)' }}>{lead.mobile || '—'}</td>
                    <td style={{ ...tdStyle, maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{lead.details || '—'}</td>
                    <td style={tdStyle}>
                      <span style={{
                        ...statusBadgeBase,
                        background: STATUS_STYLES[lead.status]?.bg || 'var(--bg)',
                        color: STATUS_STYLES[lead.status]?.color || 'var(--text-2)',
                      }}>
                        {lead.status}
                      </span>
                    </td>
                    <td style={tdStyle}>
                      <div style={{ display: 'flex', gap: '4px' }}>
                        <button
                          style={iconBtnStyle}
                          title="View details"
                          onClick={(e) => { e.stopPropagation(); openDetailModal(lead); }}
                        >
                          <Eye size={13} />
                        </button>
                        {userRole !== 'office' && (
                          <>
                            <button
                              style={iconBtnStyle}
                              title="Edit lead"
                              onClick={(e) => { e.stopPropagation(); openEditModal(lead); }}
                            >
                              <Pencil size={13} />
                            </button>
                            <button
                              style={{ ...iconBtnStyle, color: 'var(--hp)' }}
                              title="Delete lead"
                              onClick={(e) => { e.stopPropagation(); handleDelete(lead); }}
                            >
                              <Trash2 size={13} />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '6px', marginTop: '16px', flexWrap: 'wrap' }}>
              <button
                className="pill"
                disabled={page === 1}
                onClick={() => setPage(p => p - 1)}
                style={{ opacity: page === 1 ? 0.4 : 1, cursor: page === 1 ? 'default' : 'pointer' }}
              >
                Prev
              </button>
              {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
                let pageNum;
                if (totalPages <= 7) {
                  pageNum = i + 1;
                } else if (page <= 4) {
                  pageNum = i + 1;
                } else if (page >= totalPages - 3) {
                  pageNum = totalPages - 6 + i;
                } else {
                  pageNum = page - 3 + i;
                }
                return (
                  <button
                    key={pageNum}
                    className={`pill ${page === pageNum ? 'pill-active' : ''}`}
                    onClick={() => setPage(pageNum)}
                  >
                    {pageNum}
                  </button>
                );
              })}
              <button
                className="pill"
                disabled={page === totalPages}
                onClick={() => setPage(p => p + 1)}
                style={{ opacity: page === totalPages ? 0.4 : 1, cursor: page === totalPages ? 'default' : 'pointer' }}
              >
                Next
              </button>
            </div>
          )}
        </>
      )}

      {/* Add Modal */}
      <Modal
        isOpen={addModalOpen}
        onClose={() => setAddModalOpen(false)}
        title="Add Marketing Lead"
        footer={
          <>
            <button className="btn btn-outline" onClick={() => setAddModalOpen(false)}>Cancel</button>
            <button className="btn btn-primary" onClick={handleAdd} disabled={saving}>
              {saving ? 'Saving...' : 'Save Lead'}
            </button>
          </>
        }
      >
        {renderFormFields()}
      </Modal>

      {/* Edit Modal */}
      <Modal
        isOpen={editModalOpen}
        onClose={() => setEditModalOpen(false)}
        title="Edit Marketing Lead"
        footer={
          <>
            <button className="btn btn-outline" onClick={() => setEditModalOpen(false)}>Cancel</button>
            <button className="btn btn-primary" onClick={handleEdit} disabled={saving}>
              {saving ? 'Saving...' : 'Update Lead'}
            </button>
          </>
        }
      >
        {renderFormFields()}
      </Modal>

      {/* Detail Modal */}
      {selectedLead && (
        <Modal
          isOpen={detailModalOpen}
          onClose={() => { setDetailModalOpen(false); setSelectedLead(null); }}
          title={
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{ fontWeight: '600' }}>{selectedLead.customer}</span>
              <span style={{
                ...statusBadgeBase,
                background: STATUS_STYLES[selectedLead.status]?.bg || 'var(--bg)',
                color: STATUS_STYLES[selectedLead.status]?.color || 'var(--text-2)',
              }}>
                {selectedLead.status}
              </span>
            </div>
          }
          footer={
            userRole !== 'office' ? (
              <>
                <button className="btn btn-outline" style={{ color: 'var(--hp)' }} onClick={() => handleDelete(selectedLead)}>
                  <Trash2 size={13} /> Delete
                </button>
                <button className="btn btn-outline" onClick={() => { setDetailModalOpen(false); openEditModal(selectedLead); }}>
                  <Pencil size={13} /> Edit
                </button>
                <button className="btn btn-primary" onClick={() => setDetailModalOpen(false)}>
                  Close
                </button>
              </>
            ) : (
              <button className="btn btn-primary" onClick={() => setDetailModalOpen(false)}>Close</button>
            )
          }
        >
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px', marginBottom: '16px' }}>
            <DetailItem icon={<Calendar size={14} />} label="Date" value={formatDate(selectedLead.date)} />
            <DetailItem icon={<Building2 size={14} />} label="Product" value={selectedLead.product} />
            <DetailItem icon={<User size={14} />} label="Persons Met" value={selectedLead.persons_met || '—'} />
            <DetailItem icon={<User size={14} />} label="Designation" value={selectedLead.designation || '—'} />
            <DetailItem icon={<Phone size={14} />} label="Mobile" value={selectedLead.mobile || '—'} />
            <DetailItem icon={<User size={14} />} label="Key Person" value={selectedLead.key_person || '—'} />
          </div>

          <div style={{ borderTop: '1px solid var(--border)', paddingTop: '12px', marginBottom: '12px' }}>
            <div style={{ fontSize: '11px', fontWeight: '600', color: 'var(--text-2)', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Info size={12} /> Additional Details
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '8px' }}>
              <DetailItem label="Details" value={selectedLead.details || '—'} />
              <DetailItem label="Reply" value={selectedLead.reply || '—'} />
              <DetailItem label="Payment Terms" value={selectedLead.payment_terms || '—'} />
              <DetailItem label="Present Supplier" value={selectedLead.present_supplier || '—'} />
              <DetailItem label="Present Rate" value={selectedLead.present_rate || '—'} />
              <DetailItem label="Other Info" value={selectedLead.other_info || '—'} />
              <DetailItem label="IBC Required" value={selectedLead.ibc_required ? 'Yes' : 'No'} />
              <DetailItem label="Created By" value={selectedLead.created_by || '—'} />
            </div>
          </div>

          {userRole !== 'office' && (
            <div style={{ borderTop: '1px solid var(--border)', paddingTop: '12px' }}>
              <label style={{ fontSize: '11px', fontWeight: '600', color: 'var(--text-2)', marginBottom: '6px', display: 'block' }}>
                Change Status
              </label>
              <div className="pill-group">
                {STATUS_OPTIONS.map(s => (
                  <button
                    key={s}
                    className={`pill ${selectedLead.status === s ? 'pill-active' : ''}`}
                    onClick={() => handleStatusChange(selectedLead, s)}
                    style={selectedLead.status === s ? {
                      background: STATUS_STYLES[s]?.color || 'var(--green)',
                      borderColor: STATUS_STYLES[s]?.color || 'var(--green)',
                    } : {}}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}
        </Modal>
      )}
    </div>
  );
}

function DetailItem({ icon, label, value }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
      <span style={{ fontSize: '10px', fontWeight: '600', color: 'var(--text-3)', display: 'flex', alignItems: 'center', gap: '4px' }}>
        {icon} {label}
      </span>
      <span style={{ fontSize: '12px', color: 'var(--text)', wordBreak: 'break-word' }}>{value}</span>
    </div>
  );
}

const thStyle = {
  textAlign: 'left',
  padding: '8px 10px',
  fontSize: '10px',
  fontWeight: '600',
  color: 'var(--text-3)',
  textTransform: 'uppercase',
  letterSpacing: '0.5px',
};

const tdStyle = {
  padding: '8px 10px',
  fontSize: '12px',
  color: 'var(--text-2)',
};

const statusBadgeBase = {
  padding: '2px 8px',
  borderRadius: '20px',
  fontSize: '10px',
  fontWeight: '600',
  whiteSpace: 'nowrap',
};

const iconBtnStyle = {
  background: 'none',
  border: '1px solid var(--border)',
  borderRadius: '6px',
  padding: '4px',
  cursor: 'pointer',
  color: 'var(--text-2)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  transition: 'all 0.15s',
};
