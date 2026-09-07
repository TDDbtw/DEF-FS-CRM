import { SHIFT_START, SHIFT_END, SHIFT_GRACE, SHIFT_NAME_A, SHIFT_NAME_B } from '../config/constants';

// Shift TYPE — grace-softened, used for payment/shift-log attribution.
// A fill a few minutes either side of the boundary still gets attributed
// to the shift it's really closing out.
export const getShiftType = (ts) => {
  const d = new Date(ts);
  const totalMin = d.getHours() * 60 + d.getMinutes();
  const startMin = SHIFT_START * 60;
  const endMin = SHIFT_END * 60;
  return totalMin >= startMin + SHIFT_GRACE && totalMin < endMin + SHIFT_GRACE ? SHIFT_NAME_A : SHIFT_NAME_B;
};

// Return the shift name for a fill, trusting the stored value only if it
// matches the current configured names. Old/stale values (e.g. from a
// previous shift configuration) are reclassified by time automatically.
export const getFillShift = (f) => {
  const s = f.shift;
  if (s === SHIFT_NAME_A || s === SHIFT_NAME_B) return s;
  return getShiftType(f.ts);
};

// Business DAY — hard cutoff at SHIFT_START hour, independent of shift-type
// grace. The day runs SHIFT_START to next SHIFT_START. Never move this off
// a fill's actual clock time, or early/late entries drift onto the wrong
// calendar day.
export const getShiftDay = (ts) => {
  const d = new Date(ts);
  const totalMin = d.getHours() * 60 + d.getMinutes();
  const startMin = SHIFT_START * 60;
  const shiftD = new Date(d);
  if (totalMin < startMin) {
    shiftD.setDate(shiftD.getDate() - 1);
  }
  const y = shiftD.getFullYear();
  const m = String(shiftD.getMonth() + 1).padStart(2, '0');
  const day = String(shiftD.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

export const fmtDate = (d) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

// The current business day's date string, respecting the SHIFT_START cutoff.
// Use this instead of new Date() + setHours(0,0,0,0) anywhere "today" needs
// to mean "today's shift day".
export const getTodayShiftDay = () => getShiftDay(new Date());
