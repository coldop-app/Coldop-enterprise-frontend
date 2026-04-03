/** =====================================================
 *  POTATO VARIETIES
 *  ===================================================== */

export const POTATO_VARIETIES: { label: string; value: string }[] = [
  { label: 'Himalini', value: 'Himalini' },
  { label: 'B101', value: 'B101' },
  { label: 'Jyoti', value: 'Jyoti' },
];

/** =====================================================
 *  GRADING SIZES (display / column order — matches operational spec sheet)
 *  ===================================================== */

export const GRADING_SIZES = [
  'Below 25',
  '25–30',
  'Below 30',
  '30–35',
  '30–40',
  '35–40',
  '40–45',
  '45–50',
  '50–55',
  'Above 50',
  'Above 55',
  'Cut',
] as const;

export type GradingSize = (typeof GRADING_SIZES)[number];

/** =====================================================
 *  GRADER OPTIONS (dropdown for grading form)
 *  ===================================================== */

export const GRADER_OPTIONS = [
  'Shiva grader',
  'Rama Jandu',
  'JICS Rama Jandu',
] as const;

/** =====================================================
 *  BAG CONFIG
 *  ===================================================== */

export const JUTE_BAG_WEIGHT = 0.7;
export const LENO_BAG_WEIGHT = 0.06;

export const BAG_TYPES = ['JUTE', 'LENO'] as const;
export type BagType = (typeof BAG_TYPES)[number];

/** =====================================================
 *  BUY BACK COST CONFIGURATION
 *  ===================================================== */

export type Variety = (typeof POTATO_VARIETIES)[number]['value'];

export type BuyBackCost = {
  variety: Variety;
  sizeRates: Record<GradingSize, number>;
};

export const BUY_BACK_COST: BuyBackCost[] = [
  {
    variety: 'Himalini',
    sizeRates: {
      'Below 25': 15.25,
      '25–30': 15.25,
      'Below 30': 15.25,
      '30–35': 15.25,
      '35–40': 15.25,
      '30–40': 15.25,
      '40–45': 12.25,
      '45–50': 10.25,
      '50–55': 8.75,
      'Above 50': 8.75,
      'Above 55': 8.75,
      Cut: 3.0,
    },
  },

  {
    variety: 'B101',
    sizeRates: {
      'Below 25': 19.25,
      '25–30': 19.25,
      'Below 30': 19.25,
      '30–35': 19.25,
      '35–40': 19.25,
      '30–40': 19.25,
      '40–45': 16.25,
      '45–50': 13.25,
      '50–55': 8.25,
      'Above 50': 8.25,
      'Above 55': 8.25,
      Cut: 3.0,
    },
  },
];
