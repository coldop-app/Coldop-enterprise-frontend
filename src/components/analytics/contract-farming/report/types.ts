/** Must match {@link FILTER_VARIETY_LEVEL_PREFIX} in view-filters-sheet/constants. */
export const GRADE_BAG_COLUMN_KEY_PREFIX = 'grade_bags_' as const;

/** Per-grade net-weight columns (`grade_net_weight_kg_<grade>`). */
export const GRADE_NET_WEIGHT_COLUMN_KEY_PREFIX =
  'grade_net_weight_kg_' as const;

/** Dynamic per-grade bag column keys on each row (matches TanStack column ids). */
export type GradeBagFlatKey = `${typeof GRADE_BAG_COLUMN_KEY_PREFIX}${string}`;

/** One farmer account line shown in a merged family block. */
export type FamilyMemberSummary = {
  farmerId: string;
  farmerName: string;
  accountNumber: number;
};

/**
 * One physical row per size line; variety- and farmer-level metrics are duplicated
 * on every size row for TanStack grouping. Use `accountNumber` + `varietyName` as
 * the dedupe key for variety-level aggregations (see footer totals).
 */
export type FlattenedRow = {
  rowId: string;
  /** Stable key for a farmer × variety block. */
  varietyRowKey: string;
  /** Number of seed-size rows represented by this farmer × variety block. */
  mergedRowSpan: number;
  /** True for the first physical row inside a merged farmer × variety block. */
  isFirstOfMergedBlock: boolean;
  /** Zero-based index of this seed-size row within the merged farmer × variety block. */
  sizeRowIndex: number;
  /** Stable farmer id from API (`farmer.id`). */
  farmerId: string;
  /** Group key by account-number family (base + decimal variants). */
  familyKey?: number;
  /** Total physical rows for this family when Group Families is enabled. */
  familyMergedRowSpan?: number;
  /** First row of a family block (farmer-level columns rowSpan). */
  isFirstOfFamilyBlock?: boolean;
  farmerName: string;
  /**
   * When Group Families is enabled: all accounts in this family (e.g. 68, 68.1, 68.2)
   * for display in the merged farmer cell.
   */
  familyMembers?: FamilyMemberSummary[];
  /** @deprecated Use {@link familyMembers} */
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
