import React, { useState, useEffect, useCallback } from 'react';
import { dbAPI } from '../config/supabase';
import { MACHINES } from '../config/machines';
import { Clock, Play, Square } from 'lucide-react';

const machineList = Object.values(MACHINES);

export default function Shifts({ currentUser, triggerToast }) {
  const [type, setType] = useState('start');
  const [totals, setTotals] = useState({ hp: '', cb: '', gulf: '' });
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadLogs = useCallback(async () => {
    setLoading(true);
    const { data } = await dbAPI.fetchShiftLogs();
    setLogs(data || []);
    setLoading(false);
  }, []);

  useEffect(() => { loadLogs(); }, [loadLogs]);

  const save = async () => {
    const hasVal = machineList.some(m => parseFloat(totals[m.id]) >= 0);
    if (!hasVal) { triggerToast('Enter at least one totalizer reading', 'warn'); return; }
    setSaving(true);
    const entry = { employee_name: currentUser?.name, type };
    for (const m of machineList) {
      const v = parseFloat(totals[m.id]);
      entry[`tot_${m.id}`] = isNaN(v) ? null : v;
    }
    if (notes.trim()) entry.notes = notes.trim();
    const { error } = await dbAPI.addShiftLog(entry);
    setSaving(false);
    if (error) { triggerToast(error.message, 'warn'); return; }
    setTotals({ hp: '', cb: '', gulf: '' });
    setNotes('');
    triggerToast(`Shift ${type === 'start' ? 'start' : 'end'} logged ✓`);
    loadLogs();
  };

  const shiftDiff = (startLog, endLog) => {
    if (!startLog || !endLog) return null;
    const diff = {};
    for (const m of machineList) {
      const s = startLog[`tot_${m.id}`];
      const e = endLog[`tot_${m.id}`];
      diff[m.id] = (s != null && e != null) ? (e - s).toFixed(2) : null;
    }
    return diff;
  };

  // Pair start/end logs by employee per day
  const paired = [];
  const seen = new Set();
  logs.forEach((log, i) => {
    if (seen.has(log.id)) return;
    if (log.type === 'start') {
      const end = logs.slice(i + 1).find(l =>
        l.employee_name === log.employee_name && l.type === 'end' &&
        new Date(l.created_at).toDateString() === new Date(log.created_at).toDateString()
      );
      paired.push({ start: log, end: end || null });
      seen.add(log.id);
      if (end) seen.add(end.id);
    } else if (!seen.has(log.id)) {
      paired.push({ start: null, end: log });
      seen.add(log.id);
    }
  });

  const fmt = (iso) => {
    const d = new Date(iso);
    return d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
  };

  const fmtDate = (iso) => {
    const d = new Date(iso);
    return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  return (
    <div style={{ maxWidth: '680px', margin: '0 auto' }}>
      <div style={{ marginBottom: '20px' }}>
        <h1 style={{ fontSize: '18px', fontWeight: '600' }}>Shift Log</h1>
        <p style={{ fontSize: '13px', color: 'var(--text-3)', marginTop: '2px' }}>
          Record totalizer readings at shift start and end
        </p>
      </div>

      {/* Log form */}
      <div className="card card-pad" style={{ marginBottom: '20px' }}>
        <div className="section-label">Log shift — {currentUser?.name}</div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '16px' }}>
          {[['start', '▶ Starting shift'], ['end', '■ Ending shift']].map(([v, label]) => (
            <button key={v} onClick={() => setType(v)} style={{
              padding: '11px 0', textAlign: 'center', fontSize: '13px', fontWeight: '500',
              border: `1.5px solid ${type === v ? 'var(--green)' : 'var(--border-mid)'}`,
              borderRadius: 'var(--radius)', cursor: 'pointer',
              background: type === v ? 'var(--green-soft)' : 'var(--surface)',
              color: type === v ? 'var(--green)' : 'var(--text-2)',
              transition: 'all .15s'
            }}>
              {label}
            </button>
          ))}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', marginBottom: '12px' }}>
          {machineList.map(m => (
            <div className="fg" key={m.id}>
              <label>{m.name} totalizer</label>
              <input
                type="number" step="0.01"
                value={totals[m.id]}
                onChange={e => setTotals(t => ({ ...t, [m.id]: e.target.value }))}
                placeholder="0.00"
                style={{ width: '100%', padding: '8px 10px', border: '1px solid var(--border-mid)', borderRadius: 'var(--radius)', fontSize: '13px', color: 'var(--text)', outline: 'none', fontFamily: 'var(--mono)' }}
              />
            </div>
          ))}
        </div>

        <div className="fg">
          <label>Notes <span className="opt">(opt)</span></label>
          <input
            value={notes}
            onChange={e => setNotes(e.target.value)}
            placeholder="Any remarks for this shift…"
            style={{ width: '100%', padding: '8px 10px', border: '1px solid var(--border-mid)', borderRadius: 'var(--radius)', fontSize: '13px', color: 'var(--text)', outline: 'none' }}
          />
        </div>

        <button onClick={save} disabled={saving} style={{
          marginTop: '14px', width: '100%', justifyContent: 'center', padding: '10px',
          border: 'none', borderRadius: 'var(--radius)', cursor: 'pointer',
          background: saving ? 'var(--border-mid)' : 'var(--green)', color: '#fff',
          fontSize: '13px', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '6px',
        }}>
          {saving ? 'Saving…' : (type === 'start' ? <><Play size={14} /> Log shift start</> : <><Square size={14} /> Log shift end</>)}
        </button>
      </div>

      {/* Recent shifts */}
      <h2 style={{ fontSize: '15px', fontWeight: '600', marginBottom: '12px' }}>Recent shifts</h2>

      {loading && <div style={{ textAlign: 'center', padding: '20px', color: 'var(--text-3)' }}>Loading…</div>}

      {!loading && paired.map((pair, i) => {
        const ref = pair.start || pair.end;
        const diff = shiftDiff(pair.start, pair.end);
        return (
          <div key={i} className="card card-pad" style={{ marginBottom: '10px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <div>
                <span style={{ fontWeight: '600', fontSize: '14px' }}>{ref.employee_name}</span>
                <span style={{ fontSize: '12px', color: 'var(--text-3)', marginLeft: '8px' }}>
                  {fmtDate(ref.created_at)}
                </span>
              </div>
              <span style={{
                padding: '2px 8px', borderRadius: '20px', fontSize: '11px', fontWeight: '500',
                background: pair.end ? 'var(--ok-soft)' : 'var(--warn-soft)',
                color: pair.end ? 'var(--ok)' : 'var(--warn)',
              }}>
                {pair.end ? 'Complete' : 'In progress'}
              </span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
              {machineList.map(m => {
                const startVal = pair.start?.[`tot_${m.id}`];
                const endVal = pair.end?.[`tot_${m.id}`];
                const d = diff?.[m.id];
                return (
                  <div key={m.id} style={{ background: 'var(--bg)', borderRadius: '8px', padding: '10px 12px' }}>
                    <div style={{ fontSize: '11px', color: m.themeColor, fontWeight: '500', marginBottom: '6px' }}>{m.name}</div>
                    <div style={{ fontSize: '12px', color: 'var(--text-2)' }}>
                      Start: <span style={{ fontFamily: 'var(--mono)', color: 'var(--text)' }}>{startVal ?? '—'}</span>
                    </div>
                    <div style={{ fontSize: '12px', color: 'var(--text-2)', marginTop: '2px' }}>
                      End: <span style={{ fontFamily: 'var(--mono)', color: 'var(--text)' }}>{endVal ?? '—'}</span>
                    </div>
                    {d != null && (
                      <div style={{ fontSize: '12px', fontWeight: '600', color: 'var(--green)', marginTop: '4px', borderTop: '1px solid var(--border)', paddingTop: '4px' }}>
                        Dispensed: {d}L
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
