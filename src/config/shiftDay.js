import { SHIFT_START, SHIFT_END, SHIFT_GRACE } from '../config/constants';

// Shift TYPE (morning/night label) — grace-softened, used for payment/shift-log
// attribution. A fill a few minutes either side of the 9am/9pm boundary still
// gets attributed to the shift it's really closing out.
export const getShiftType = (ts) => {
  const d = new Date(ts);
  const totalMin = d.getHours() * 60 + d.getMinutes();
  const startMin = SHIFT_START * 60;
  const endMin = SHIFT_END * 60;
  return totalMin >= startMin + SHIFT_GRACE && totalMin < endMin + SHIFT_GRACE ? 'morning' : 'night';
};

export const getFillShift = (f) => {
  const s = f.shift;
  if (s === 'morning' || s === 'night') return s;
  return getShiftType(f.ts);
};

// Business DAY — a hard 9am cutoff, deliberately independent of shift-type/
// grace. This is what "Today" should mean everywhere in the app: the day
// runs 9am to next 9am, full stop. Never move this off a fill's actual clock
// time, or early/late entries drift onto the wrong calendar day.
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

// The current business day's date string (e.g. '2026-07-14'), respecting the
// 9am cutoff. Use this instead of new Date() + setHours(0,0,0,0) anywhere
// "today" needs to mean "today's shift day".
export const getTodayShiftDay = () => getShiftDay(new Date());
