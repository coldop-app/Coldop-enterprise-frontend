import { CONTRACT_FARMING_GRADING_COLUMNS } from '@/utils/contractFarmingReportShared';

export type ContractFarmingColumnVisibility = Record<string, boolean>;

export const STATIC_COLUMN_OPTIONS: { key: string; label: string }[] = [
  { key: 'sNo', label: 'S. No.' },
  { key: 'name', label: 'Name' },
  { key: 'accountNumber', label: 'Account no.' },
  { key: 'address', label: 'Address' },
  { key: 'acresPlanted', label: 'Acres planted' },
  { key: 'generation', label: 'Generation' },
  { key: 'sizeName', label: 'Size name' },
  { key: 'seedBags', label: 'Seed bags' },
  { key: 'buyBackBags', label: 'Buy back bags' },
  { key: 'wtWithoutBardana', label: 'Wt. without bardana' },
  { key: 'totalGradingBags', label: 'Total grading bags' },
  { key: 'below40Percent', label: 'Below 40 %' },
  { key: 'range40To50Percent', label: '40-50 %' },
  { key: 'above50Percent', label: 'Above 50 %' },
  { key: 'cutPercent', label: 'Cut %' },
  { key: 'netWeightAfterGrading', label: 'Net weight after grading (kg)' },
  { key: 'buyBackAmount', label: 'Buy back amount' },
  { key: 'totalSeedAmount', label: 'Total seed amount' },
  { key: 'netAmountPayable', label: 'Net amount payable' },
  { key: 'netAmountPerAcre', label: 'Net amount / acre' },
  { key: 'yieldPerAcreQuintals', label: 'Yield per acre (in quintals)' },
];

export const GRADING_COLUMN_OPTIONS = CONTRACT_FARMING_GRADING_COLUMNS.map(
  (col) => ({
    key: `grading:${col.header}`,
    label: col.header,
  })
);

export const CONTRACT_FARMING_COLUMN_OPTIONS = [
  ...STATIC_COLUMN_OPTIONS,
  ...GRADING_COLUMN_OPTIONS,
];

export const DEFAULT_CONTRACT_FARMING_COLUMN_VISIBILITY: ContractFarmingColumnVisibility =
  CONTRACT_FARMING_COLUMN_OPTIONS.reduce<ContractFarmingColumnVisibility>(
    (acc, col) => {
      acc[col.key] = true;
      return acc;
    },
    {}
  );
