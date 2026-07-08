// Shift boundary hours
export const SHIFT_START = Number(import.meta.env.VITE_SHIFT_START) || 9;
export const SHIFT_END = Number(import.meta.env.VITE_SHIFT_END) || 21;

// GST
export const GST_RATE = Number(import.meta.env.VITE_GST_RATE) || 18;
export const GST_MULTIPLIER = 1 + GST_RATE / 100;
export const GST_HALF = GST_RATE / 2 / 100;

// Business info
export const BUSINESS_NAME = import.meta.env.VITE_BUSINESS_NAME || 'Green Land & Ocean Blue Energy';
export const BUSINESS_LOCATION = import.meta.env.VITE_BUSINESS_LOCATION || 'Shenkottai, Tenkasi';

// States list
export const STATES = ['Tamil Nadu', 'Kerala', 'Karnataka', 'Andhra Pradesh', 'Telangana', 'Maharashtra', 'Other'];

// Active/At-risk thresholds
export const ACTIVE_DAYS = Number(import.meta.env.VITE_ACTIVE_DAYS) || 21;
export const AT_RISK_DAYS = Number(import.meta.env.VITE_ATRISK_DAYS) || 45;

// Employee names derived from env vars
export const EMPLOYEE_NAMES = (() => {
  const names = [];
  if (import.meta.env.VITE_EMAIL_BASIL) names.push('Basil');
  if (import.meta.env.VITE_EMAIL_BHAGAVATHI) names.push('Bhagavathi');
  if (import.meta.env.VITE_EMAIL_OFFICE) names.push('Office');
  return names.length ? names : ['Basil', 'Bhagavathi', 'Office'];
})();

export const EMPLOYEE_INITIALS = {
  [import.meta.env.VITE_EMAIL_BASIL?.toLowerCase()]: 'MB',
  [import.meta.env.VITE_EMAIL_BHAGAVATHI?.toLowerCase()]: 'BH',
  [import.meta.env.VITE_EMAIL_OFFICE?.toLowerCase()]: 'OF',
};
