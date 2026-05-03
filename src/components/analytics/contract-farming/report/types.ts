/** One logical row before rowspan metadata is merged in `recomputeRowSpans`. */
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
  gradeData: Record<string, { bags: number; netWeightKg: number }>;
  /** Total acres planted for this farmer × variety (all sizes); from seed.totalAcres or sum of sizes. */
  varietyTotalAcres: number;
};
