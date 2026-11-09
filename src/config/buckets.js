// Prefilled DEF buckets. Selling rates and opening qty come from env
// (Nov 26 sheet). A sale stores the rate it was made at.

const price = (envVal, fallback) => Number(envVal || fallback);
const qty = (envVal, fallback) => Number(envVal || fallback);

export const BUCKETS = [
  {
    id: 'gulf-eco-20',
    sn: 1,
    name: 'GULF ECO PRO-20L BUC',
    color: 'var(--gulf)',
    soft: 'var(--gulf-soft)',
    litres: 20,
    price: price(import.meta.env.VITE_BUCKET_GULF_ECO_20_PRICE, 1620),
    openingQty: qty(import.meta.env.VITE_BUCKET_GULF_ECO_20_QTY, 18),
  },
  {
    id: 'hp-def-20',
    sn: 2,
    name: 'HP DEF-20 L BUC',
    color: 'var(--hp)',
    soft: 'var(--hp-soft)',
    litres: 20,
    price: price(import.meta.env.VITE_BUCKET_HP_DEF_20_PRICE, 1410),
    openingQty: qty(import.meta.env.VITE_BUCKET_HP_DEF_20_QTY, 20),
  },
  {
    id: 'amaron-20',
    sn: 3,
    name: 'AMARON-20 L BUC',
    color: 'var(--amaron)',
    soft: 'var(--amaron-soft)',
    litres: 20,
    price: price(import.meta.env.VITE_BUCKET_AMARON_20_PRICE, 1240),
    openingQty: qty(import.meta.env.VITE_BUCKET_AMARON_20_QTY, 10),
  },
  {
    id: 'amaron-10',
    sn: 4,
    name: 'AMARON-10L BUC',
    color: 'var(--amaron)',
    soft: 'var(--amaron-soft)',
    litres: 10,
    price: price(import.meta.env.VITE_BUCKET_AMARON_10_PRICE, 680),
    openingQty: qty(import.meta.env.VITE_BUCKET_AMARON_10_QTY, 20),
  },
  {
    id: 'amaron-5',
    sn: 5,
    name: 'AMARON-5L BUC',
    color: 'var(--amaron)',
    soft: 'var(--amaron-soft)',
    litres: 5,
    price: price(import.meta.env.VITE_BUCKET_AMARON_5_PRICE, 360),
    openingQty: qty(import.meta.env.VITE_BUCKET_AMARON_5_QTY, 20),
  },
];

export const inr = (n) => '₹' + Number(n || 0).toLocaleString('en-IN');
