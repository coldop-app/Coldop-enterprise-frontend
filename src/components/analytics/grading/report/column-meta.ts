/** Column order for bag-size breakdown (must match API `orderDetails[].size` labels). */
export const GRADING_BAG_SIZE_COLUMN_ORDER = [
  'Below 25',
  '25-30',
  'Below 30',
  '30-35',
  '30-40',
  '35-40',
  '40-45',
  '40-50',
  '45-50',
  '50-55',
  'Above 50',
  'Above 55',
  'Cut',
] as const;

export type CanonBagSize = (typeof GRADING_BAG_SIZE_COLUMN_ORDER)[number];

/** Bag-size column IDs must match {@link GRADING_BAG_SIZE_COLUMN_ORDER}. */
export function getGradingBagSizeColumnId(sizeLabel: CanonBagSize): string {
  return `bagSize__${sizeLabel.replace(/[^a-zA-Z0-9]+/g, '_')}`;
}

/** Resolve `bagSize__*` TanStack column id → canonical size label (O(1)). */
export const GRADING_BAG_SIZE_COLUMN_ID_TO_CANON: ReadonlyMap<
  string,
  CanonBagSize
> = new Map(
  GRADING_BAG_SIZE_COLUMN_ORDER.map((label) => [
    getGradingBagSizeColumnId(label),
    label,
  ])
);

export const defaultGradingColumnOrder = [
  'incomingGatePassIds',
  'incomingSystemGatePassNo',
  'incomingFarmerName',
  'incomingFarmerAddress',
  'incomingFarmerStorageAccountNo',
  'incomingDate',
  'incomingLocation',
  'incomingTruckNumber',
  'incomingBagsReceived',
  'incomingSlipNumber',
  'incomingGrossKg',
  'incomingTareKg',
  'incomingNetKg',
  'incomingBardanaWeightKg',
  'incomingNetWeightWithoutBardana',
  'incomingStatus',
  'incomingRemarks',
  'createdBy',
  'gatePassNo',
  'manualGatePassNumber',
  'date',
  'variety',
  'gradedBags',
  ...GRADING_BAG_SIZE_COLUMN_ORDER.map((s) => getGradingBagSizeColumnId(s)),
  'gradingBardanaWeightKg',
  'netWeightAfterGradingWithoutBardana',
  'wastagePercent',
  'grader',
  'remarks',
] as const;

export type GradingFilterField = (typeof defaultGradingColumnOrder)[number];
