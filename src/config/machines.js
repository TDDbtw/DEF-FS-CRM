export const MACHINES = {
  hp: {
    id: 'hp',
    name: 'HP',
    rate: Number(import.meta.env.VITE_RATE_HP || 65),
    color: 'hp',
    themeColor: 'var(--hp)',
    themeSoftColor: 'var(--hp-soft)',
    themeMidColor: 'var(--hp-mid)',
    badgeColor: 'badge-hp',
  },
  cb: {
    id: 'cb',
    name: 'C Blue',
    rate: Number(import.meta.env.VITE_RATE_CB || 55),
    color: 'cb',
    themeColor: 'var(--cb)',
    themeSoftColor: 'var(--cb-soft)',
    themeMidColor: 'var(--cb-mid)',
    badgeColor: 'badge-cb',
  },
  gulf: {
    id: 'gulf',
    name: 'Gulf',
    rate: Number(import.meta.env.VITE_RATE_GULF || 60),
    color: 'gulf',
    themeColor: 'var(--warn)',
    themeSoftColor: 'var(--warn-soft)',
    themeMidColor: '#fbd38d',
    badgeColor: 'badge-warn',
  }
};
