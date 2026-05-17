export const FREIGHT_SEED_DISPATCHED_PARTICULAR_NAME =
  'Freight: Seed (Dispatched)';

export const BUY_BACK_FREIGHT_PARTICULAR_NAME =
  'Freight: Buy Back material (Trolly Charges Rs. 20/- Qtl)';

export const ROUGHING_CHARGES_PARTICULAR_NAME = 'Roughing Charges';

export const PALADAAR_FROM_FIELD_PARTICULAR_NAME =
  'Paladaar Charges From Field (Unloading Charges)';

export const BARDANA_FROM_FIELD_PARTICULAR_NAME =
  'Bardana (Multiple use) from field';

export const SUTLI_INCOMING_BAGS_PARTICULAR_NAME = 'Sutli (Incoming Bags)';

export const MARKA_INCOMING_JUTE_BAGS_PARTICULAR_NAME =
  'Marka Expenses (Incoming Jute Bags)';

/** Particulars charged as incoming bag count × rate (before grading charges). */
export const INCOMING_BAGS_TIMES_RATE_PARTICULAR_NAMES = new Set<string>([
  PALADAAR_FROM_FIELD_PARTICULAR_NAME,
  BARDANA_FROM_FIELD_PARTICULAR_NAME,
  SUTLI_INCOMING_BAGS_PARTICULAR_NAME,
  MARKA_INCOMING_JUTE_BAGS_PARTICULAR_NAME,
]);

export const GRADING_CHARGES_PARTICULAR_NAME = 'Grading Charges';

export const PALADAAR_TANKA_TOLAI_PARTICULAR_NAME =
  'Paladaar Charges (Tanka + Tolai)';

export const PALADAAR_SHIFTING_AFTER_GRADING_PARTICULAR_NAME =
  'Paladaar Charge Shifting after grading (Dhank)';

export const SUTLI_TAG_PARCHI_AFTER_GRADING_PARTICULAR_NAME =
  'Sutli + Tag & Parchi after Grading';

export const PALADAAR_AFTER_LOADING_GRADING_PARTICULAR_NAME =
  'Paladaar Charges after loading after grading';

export const STORAGE_CHARGES_PARTICULAR_NAME = 'Storage Charges';

export const MULTIPLICATION_EXPENSES_PARTICULAR_NAME =
  'Multiplication Expenses';

export const SALARY_EMPLOYEE_EXPENSE_PARTICULAR_NAME =
  'Salary plus other employee expense';

export const DAILY_LABOUR_PARTICULAR_NAME = 'Daily labour';

export const ROOM_RENT_MISCELLANEOUS_PARTICULAR_NAME =
  'Room rent charges, Miscellaneous';

/** Particulars charged as net planted acres × rate. */
export const ACRES_TIMES_RATE_PARTICULAR_NAMES = new Set<string>([
  ROUGHING_CHARGES_PARTICULAR_NAME,
  SALARY_EMPLOYEE_EXPENSE_PARTICULAR_NAME,
  DAILY_LABOUR_PARTICULAR_NAME,
  ROOM_RENT_MISCELLANEOUS_PARTICULAR_NAME,
]);

/** Particulars charged as grading-related bag count × rate (per-row bag rules). */
export const GRADING_BAGS_TIMES_RATE_PARTICULAR_NAMES = new Set<string>([
  GRADING_CHARGES_PARTICULAR_NAME,
  PALADAAR_TANKA_TOLAI_PARTICULAR_NAME,
  PALADAAR_SHIFTING_AFTER_GRADING_PARTICULAR_NAME,
  SUTLI_TAG_PARCHI_AFTER_GRADING_PARTICULAR_NAME,
  PALADAAR_AFTER_LOADING_GRADING_PARTICULAR_NAME,
  STORAGE_CHARGES_PARTICULAR_NAME,
]);

/** Grading / summary sizes ≥ 40 mm (canonical labels). */
export const GRADING_BAG_SIZES_40MM_AND_ABOVE = [
  '40-45',
  '40-50',
  '45-50',
  '50-55',
  'Above 50',
  'Above 55',
  'Cut',
] as const;

export const PARTICULARS = [
  {
    name: FREIGHT_SEED_DISPATCHED_PARTICULAR_NAME,
    rate: 32124.0,
  },
  {
    name: BUY_BACK_FREIGHT_PARTICULAR_NAME,
    rate: 20,
  },
  {
    name: ROUGHING_CHARGES_PARTICULAR_NAME,
    rate: 20,
  },
  {
    name: PALADAAR_FROM_FIELD_PARTICULAR_NAME,
    rate: 1000,
  },
  {
    name: BARDANA_FROM_FIELD_PARTICULAR_NAME,
    rate: 1000,
  },
  {
    name: SUTLI_INCOMING_BAGS_PARTICULAR_NAME,
    rate: 0.96,
  },
  {
    name: MARKA_INCOMING_JUTE_BAGS_PARTICULAR_NAME,
    rate: 0.96,
  },
  {
    name: GRADING_CHARGES_PARTICULAR_NAME,
    rate: 14.2,
  },
  {
    name: PALADAAR_TANKA_TOLAI_PARTICULAR_NAME,
    rate: 3,
  },
  {
    name: PALADAAR_SHIFTING_AFTER_GRADING_PARTICULAR_NAME,
    rate: 5.5,
  },
  {
    name: SUTLI_TAG_PARCHI_AFTER_GRADING_PARTICULAR_NAME,
    rate: 2.9,
  },
  {
    name: PALADAAR_AFTER_LOADING_GRADING_PARTICULAR_NAME,
    rate: 5.5,
  },
  {
    name: STORAGE_CHARGES_PARTICULAR_NAME,
    rate: 200,
  },
  {
    name: MULTIPLICATION_EXPENSES_PARTICULAR_NAME,
    rate: 0,
  },
  {
    name: SALARY_EMPLOYEE_EXPENSE_PARTICULAR_NAME,
    rate: 2000,
  },
  {
    name: DAILY_LABOUR_PARTICULAR_NAME,
    rate: 3.43,
  },
  {
    name: ROOM_RENT_MISCELLANEOUS_PARTICULAR_NAME,
    rate: 200,
  },
];

export const ACTUAL_COST_WITHOUT_SUBSIDY = [
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
      '40–50': 11.25,
      '45–50': 10.25,
      '50–55': 8.75,
      'Above 50': 8.75,
      'Above 55': 8.75,
      Cut: 3,
    },
  },
  {
    variety: 'Jyoti',
    sizeRates: {
      'Below 25': 15.25,
      '25–30': 15.25,
      'Below 30': 15.25,
      '30–35': 15.25,
      '35–40': 15.25,
      '30–40': 15.25,
      '40–45': 12.25,
      '40–50': 11.25,
      '45–50': 10.25,
      '50–55': 8.75,
      'Above 50': 8.75,
      'Above 55': 8.75,
      Cut: 3,
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
      '40–50': 14.75,
      '45–50': 13.25,
      '50–55': 8.25,
      'Above 50': 8.25,
      'Above 55': 8.25,
      Cut: 3,
    },
  },
];

export const SALE_PRICE_PER_BAG = [
  {
    variety: 'Himalini',
    sizeRates: {
      'Below 25': 1740,
      '25–30': 1740,
      'Below 30': 1740,
      '30–35': 1740,
      '35–40': 1740,
      '30–40': 1740,
      '40–45': 1160,
      '40–50': 500,
      '45–50': 940,
      '50–55': 500,
      'Above 50': 500,
      'Above 55': 500,
      Cut: 150,
    },
  },
  {
    variety: 'Jyoti',
    sizeRates: {
      'Below 25': 1740,
      '25–30': 1740,
      'Below 30': 1740,
      '30–35': 1740,
      '35–40': 1740,
      '30–40': 1740,
      '40–45': 1160,
      '40–50': 500,
      '45–50': 940,
      '50–55': 500,
      'Above 50': 500,
      'Above 55': 500,
      Cut: 150,
    },
  },
  {
    variety: 'B101',
    sizeRates: {
      'Below 25': 1740,
      '25–30': 1740,
      'Below 30': 1740,
      '30–35': 1740,
      '35–40': 1740,
      '30–40': 1740,
      '40–45': 1160,
      '40–50': 500,
      '45–50': 940,
      '50–55': 500,
      'Above 50': 500,
      'Above 55': 500,
      Cut: 150,
    },
  },
];
