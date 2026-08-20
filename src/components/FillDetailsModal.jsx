import Modal from './Modal';
import { MACHINES } from '../config/machines';
import { EMPLOYEE_INITIALS } from '../config/constants';
import { getFillShift } from '../config/shiftDay';
import {
  Calendar, Clock, Fuel, IndianRupee, Truck, User,
  Gauge, Phone, MapPin, Banknote, StickyNote, Cog, Sun, Moon,
} from 'lucide-react';

const mono = { fontFamily: 'var(--mono)' };

function Card({ children, style }) {
  return (
    <div style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '14px 16px', ...style }}>
      {children}
    </div>
  );
}

function CardTitle({ icon: Icon, children }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '7px', fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '.06em', color: 'var(--text-3)', marginBottom: '10px' }}>
      <Icon size={13} />
      {children}
    </div>
  );
}

function Fact({ icon: Icon, color, bg, label, value, mon }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', minWidth: 0 }}>
      <span style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: 'var(--text-3)', fontWeight: '500' }}>
        <span style={{ width: '24px', height: '24px', borderRadius: '7px', background: bg, color, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <Icon size={12} />
        </span>
        {label}
      </span>
      <span style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text)', fontFamily: mon ? 'var(--mono)' : 'inherit', wordBreak: 'break-word', lineHeight: 1.3 }}>
        {value ?? '—'}
      </span>
    </div>
  );
}

export default function FillDetailsModal({ fill, customer, isOpen, onClose }) {
  if (!fill || !isOpen) return null;

  const isTest = fill.entry_type === 'test';
  const isSpill = fill.entry_type === 'spill';
  const typeLabel = isTest ? 'Test' : isSpill ? 'Spill' : 'Sale';
  const typeColor = isSpill ? 'var(--warn)' : isTest ? 'var(--hp)' : 'var(--ok)';
  const typeBg = isSpill ? 'var(--warn-soft)' : isTest ? 'var(--hp-soft)' : 'var(--ok-soft)';
  const machine = MACHINES[fill.machine]?.name || (fill.machine || '').toUpperCase();
  const shiftType = getFillShift(fill);
  const rate = fill.litres && fill.actual ? Math.round(fill.actual / fill.litres) : null;
  const isGst = (fill.bill_type || 'gst') === 'gst';
  const tots = Object.entries(fill.totalizers || {})
    .map(([k, v]) => `${k.toUpperCase()}: ${v}`)
    .join(' | ');

  const accent = fill.machine === 'hp'
    ? { color: 'var(--hp)', soft: 'var(--hp-soft)' }
    : fill.machine === 'cb'
    ? { color: 'var(--cb)', soft: 'var(--cb-soft)' }
    : { color: 'var(--warn)', soft: 'var(--warn-soft)' };

  const dt = new Date(fill.ts);
  const dateStr = dt.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  const timeStr = dt.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '10px', fontWeight: '600', padding: '2px 8px', borderRadius: '10px', background: typeBg, color: typeColor }}>
            {typeLabel}
          </span>
          <span className={fill.machine === 'hp' ? 'pill-hp' : fill.machine === 'cb' ? 'pill-cb' : 'pill-warn'}>
            {machine}
          </span>
          <span style={{ fontSize: '14px', fontWeight: '600' }}>{fill.vehicle}</span>
        </div>
      }
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {/* Hero */}
        <div style={{ background: accent.soft, border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px' }}>
          <div style={{ minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: 'var(--text-2)', flexWrap: 'wrap' }}>
              <Calendar size={13} /> {dateStr}
              <span style={{ display: 'flex', alignItems: 'center', gap: '3px', color: 'var(--text-3)' }}>
                <Clock size={12} /> {timeStr}
              </span>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', background: 'rgba(255,255,255,.7)', border: '1px solid var(--border)', borderRadius: '12px', padding: '2px 8px', fontSize: '11px', fontWeight: '600', color: 'var(--text-2)' }}>
                {shiftType === 'morning' ? <Sun size={11} /> : <Moon size={11} />}
                {shiftType === 'morning' ? 'Morning' : 'Night'}
              </span>
            </div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '10px', marginTop: '10px', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '22px', fontWeight: '700', fontFamily: 'var(--mono)', color: accent.color }}>{fill.litres}L</span>
              {rate !== null && (
                <span style={{ fontSize: '12px', color: 'var(--text-3)' }}>@ ₹{rate}/L</span>
              )}
            </div>
          </div>
          <div style={{ textAlign: 'right', flexShrink: 0 }}>
            <div style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '.05em', color: 'var(--text-3)' }}>Final</div>
            <div style={{ fontSize: '26px', fontWeight: '700', fontFamily: 'var(--mono)', color: 'var(--text)', lineHeight: 1.2 }}>₹{(fill.final || 0).toLocaleString('en-IN')}</div>
            {fill.discount > 0 && (
              <div style={{ fontSize: '11px', color: 'var(--text-3)' }}>incl. −₹{fill.discount.toLocaleString('en-IN')}</div>
            )}
          </div>
        </div>

        {/* Fuel & Payment stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px' }}>
          <Card>
            <CardTitle icon={Fuel}>Fuel</CardTitle>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <Fact icon={Fuel} color={accent.color} bg={accent.soft} label="Litres" value={`${fill.litres}L`} mon />
              <Fact icon={IndianRupee} color="var(--ok)" bg="var(--ok-soft)" label="Amount" value={`₹${(fill.actual || 0).toLocaleString('en-IN')}`} mon />
              {rate !== null && <Fact icon={IndianRupee} color="var(--text-2)" bg="var(--bg)" label="Rate / L" value={`₹${rate}`} mon />}
              <Fact icon={IndianRupee} color="var(--text-2)" bg="var(--bg)" label="Discount" value={fill.discount > 0 ? `−₹${fill.discount.toLocaleString('en-IN')}` : '—'} mon />
            </div>
          </Card>
          <Card>
            <CardTitle icon={Banknote}>Payment</CardTitle>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {fill.payment === 'Cash + GPay' ? (
                <>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '13px' }}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontWeight: '600' }}>💵 Cash</span>
                    <span style={mono}>₹{(fill.split_cash || 0).toLocaleString('en-IN')}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '13px' }}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontWeight: '600' }}>📱 GPay</span>
                    <span style={mono}>₹{(fill.split_gpay || 0).toLocaleString('en-IN')}</span>
                  </div>
                </>
              ) : fill.payment === 'GPay + Cash Discount' ? (
                <>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '13px' }}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontWeight: '600' }}>📱 GPay</span>
                    <span style={mono}>₹{(fill.split_gpay || 0).toLocaleString('en-IN')}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '13px' }}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontWeight: '600' }}>💵 Cash discount</span>
                    <span style={{ ...mono, color: 'var(--ok)' }}>−₹{(fill.split_cash || 0).toLocaleString('en-IN')}</span>
                  </div>
                </>
              ) : (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', fontWeight: '600', padding: '6px 0' }}>
                  {fill.payment === 'Credit' ? '📒' : fill.payment === 'Cash' ? '💵' : '📱'} {fill.payment || '—'}
                </div>
              )}
              <div style={{ fontSize: '12px', color: 'var(--text-3)', borderTop: '1px dashed var(--border)', paddingTop: '8px' }}>
                Employee: <span style={{ fontWeight: '600', color: 'var(--text-2)' }}>{EMPLOYEE_INITIALS[fill.employee?.toLowerCase()] || fill.employee || '—'}</span>
                {fill.bill_type && <span> · <span style={{ color: isGst ? 'var(--ok)' : 'var(--text-3)', fontWeight: '600' }}>{isGst ? 'GST bill' : 'Non-GST'}</span></span>}
              </div>
            </div>
          </Card>
        </div>

        {/* Vehicle & customer */}
        <Card>
          <CardTitle icon={Truck}>Vehicle &amp; Customer</CardTitle>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px 20px' }}>
            <Fact icon={Truck} color="var(--cb)" bg="var(--cb-soft)" label="Truck No" value={fill.vehicle} mon />
            <Fact icon={User} color="var(--text-2)" bg="var(--bg)" label="Customer" value={customer?.name || fill.company || '—'} />
            <Fact icon={User} color="var(--text-2)" bg="var(--bg)" label="Driver" value={isTest ? 'Test' : fill.driver || '—'} />
            <Fact icon={Phone} color="var(--text-2)" bg="var(--bg)" label="Driver Mobile" value={fill.driver_ph || '—'} mon />
            <Fact icon={Phone} color="var(--text-2)" bg="var(--bg)" label="Company Phone" value={fill.co_ph || '—'} mon />
            <Fact icon={MapPin} color="var(--text-2)" bg="var(--bg)" label="State" value={fill.state || '—'} />
          </div>
          {fill.odo && (
            <div style={{ marginTop: '12px', borderTop: '1px dashed var(--border)', paddingTop: '10px' }}>
              <Fact icon={Gauge} color="var(--warn)" bg="var(--warn-soft)" label="Odometer" value={`${parseFloat(fill.odo).toLocaleString('en-IN')} km`} mon />
            </div>
          )}
        </Card>

        {tots && (
          <Card>
            <CardTitle icon={Cog}>Totalizer Readings</CardTitle>
            <div style={{ fontSize: '12px', fontFamily: 'var(--mono)', color: 'var(--text-2)', background: 'var(--surface)', border: '1px solid var(--border)', padding: '10px 12px', borderRadius: 'var(--radius)' }}>
              {tots}
            </div>
          </Card>
        )}

        {fill.notes && (
          <Card>
            <CardTitle icon={StickyNote}>Remarks</CardTitle>
            <div style={{ fontSize: '12px', color: 'var(--text-2)', background: 'var(--surface)', border: '1px solid var(--border)', padding: '10px 12px', borderRadius: 'var(--radius)', fontStyle: 'italic' }}>
              “{fill.notes}”
            </div>
          </Card>
        )}
      </div>
    </Modal>
  );
}