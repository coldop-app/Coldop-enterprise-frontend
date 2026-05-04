/** One logical row per size line in the contract-farming report grid. */
export type FlattenedRow = {
  rowId: string;
  farmerName: string;
  farmerMobile: string;
  farmerAccount: number;
  farmerAddress: string;
  varietyName: string;
  generation: string;
  sizeName: string;
  sizeQuantity: number;
  sizeAcres: number;
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
};
