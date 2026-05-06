/** Must match {@link FILTER_VARIETY_LEVEL_PREFIX} in view-filters-sheet/constants. */
export const GRADE_BAG_COLUMN_KEY_PREFIX = 'grade_bags_' as const;

/** Dynamic per-grade bag column keys on each row (matches TanStack column ids). */
export type GradeBagFlatKey = `${typeof GRADE_BAG_COLUMN_KEY_PREFIX}${string}`;

/**
 * One physical row per size line; variety- and farmer-level metrics are duplicated
 * on every size row for TanStack grouping. Use `accountNumber` + `varietyName` as
 * the dedupe key for variety-level aggregations (see footer totals).
 */
export type FlattenedRow = {
  rowId: string;
  /** Group key by account-number family (base + decimal variants). */
  familyKey?: number;
  farmerName: string;
  /** Present for clubbed-family display rows: unique farmer names grouped under one base account. */
  clubbedFarmerNames?: string[];
  mobileNumber: string;
  /** Same as {@link mobileNumber}; supports legacy advanced filter `farmerMobile`. */
  farmerMobile: string;
  accountNumber: number;
  /** Same as {@link accountNumber}; supports legacy advanced filter keys. */
  farmerAccount: number;
  address: string;
  /** Same as {@link address}; supports legacy advanced filter `farmerAddress`. */
  farmerAddress: string;
  varietyName: string;
  generation: string;
  sizeName: string;
  sizeQuantity: number;
  sizeAcres: number;
  sizeAmountPayable: number;
  /** Same as {@link sizeAmountPayable}; supports legacy advanced filter `sizeAmount`. */
  sizeAmount: number;
  buyBackBags: number | null;
  buyBackNetWeightKg: number | null;
  /** Incoming net (kg); used with buy-back net for wastage when API provides it */
  incomingNetWeightKg: number | null;
  gradeData: Record<string, { bags: number; netWeightKg: number }>;
  /** Total acres planted for this farmer × variety (all sizes); from seed.totalAcres or sum of sizes. */
  varietyTotalAcres: number;
  /** Sum of seed `amountPayable` for this farmer × variety (matches seed.totalAmountPayable or summed sizes). */
  varietyTotalSeedAmountPayable: number;
} & Partial<Record<GradeBagFlatKey, number | null>>;
