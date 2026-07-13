// The three instruments this journal trades. NIFTY size is in contracts
// (1 lot = 65 qty per the current NSE contract terms — update lotSize here
// whenever NSE revises it); forex size is in lots and the multiplier
// converts lots -> contract units for P&L.
export const INSTRUMENTS = {
  'NIFTY 50': {
    asset: 'INDEX',
    currency: 'INR',
    multiplier: 1,
    sizeLabel: 'Quantity',
    lotSize: 65, // stepper moves one lot at a time
    sizeChips: [65, 130, 195, 260],
    chipLabel: (v) => `${v / 65} lot${v > 65 ? 's' : ''}`,
    sizeMin: 1,
    sizeMax: 1300,
    defaultSize: 65,
    priceStep: 0.05,
    defaultPrice: 25000,
    priceDecimals: 2,
    hint: 'Indian index · 1 lot = 65 qty · P&L in ₹',
  },
  XAUUSD: {
    asset: 'GOLD',
    currency: 'USD',
    multiplier: 100, // 1 lot = 100 oz
    sizeLabel: 'Lots',
    lotSize: 0.01,
    sizeChips: [0.01, 0.05, 0.1, 0.5, 1],
    chipLabel: (v) => String(v),
    sizeMin: 0.01,
    sizeMax: 10,
    defaultSize: 0.1,
    priceStep: 0.1,
    defaultPrice: 3300,
    priceDecimals: 2,
    hint: 'Gold spot · 1 lot = 100 oz · P&L in $',
  },
  EURUSD: {
    asset: 'FOREX',
    currency: 'USD',
    multiplier: 100000, // 1 standard lot = 100,000 units
    sizeLabel: 'Lots',
    lotSize: 0.01,
    sizeChips: [0.01, 0.05, 0.1, 0.5, 1],
    chipLabel: (v) => String(v),
    sizeMin: 0.01,
    sizeMax: 10,
    defaultSize: 0.1,
    priceStep: 0.0001,
    defaultPrice: 1.085,
    priceDecimals: 4,
    hint: 'FX pair · 1 lot = 100,000 units · P&L in $',
  },
}

export const SYMBOLS = Object.keys(INSTRUMENTS)

const FALLBACK = {
  asset: 'OTHER',
  currency: 'USD',
  multiplier: 1,
  sizeLabel: 'Size',
  lotSize: 1,
  sizeChips: [1, 10, 100],
  chipLabel: (v) => String(v),
  sizeMin: 0.01,
  sizeMax: 1e6,
  defaultSize: 1,
  priceStep: 0.01,
  defaultPrice: 100,
  priceDecimals: 2,
  hint: '',
}

export function instrumentFor(symbol) {
  return INSTRUMENTS[symbol] ?? FALLBACK
}
