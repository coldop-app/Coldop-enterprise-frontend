import type { FilterField } from '@/lib/advanced-filters';

export const FILTER_VARIETY_LEVEL_PREFIX = 'grade_bags_' as const;

/** Grading columns: Cut is shown alone; bag-size ranges include (MM). */
export function isContractFarmingCutGrade(grade: string): boolean {
  return grade.trim().toLowerCase() === 'cut';
}

export function formatContractFarmingGradeColumnLabel(grade: string): string {
  if (isContractFarmingCutGrade(grade)) return 'Cut';
  return `${grade} (MM)`;
}

export const advancedFieldToColumnId: Partial<Record<FilterField, string>> = {
  farmerName: 'farmer',
  farmerMobile: 'farmerMobile',
  farmerAddress: 'address',
  varietyName: 'variety',
  generation: 'generation',
  sizeName: 'size',
  sizeQuantity: 'qty',
  sizeAcres: 'acres',
  sizeAmount: 'amount',
  buyBackBags: 'bbBags',
  buyBackNetWeightKg: 'bbNetWeight',
};

export const advancedFilterFields: Array<{ id: FilterField; label: string }> = [
  { id: 'farmerName', label: 'Farmer' },
  { id: 'farmerMobile', label: 'Mobile' },
  { id: 'farmerAddress', label: 'Address' },
  { id: 'varietyName', label: 'Variety' },
  { id: 'generation', label: 'Gen' },
  { id: 'sizeName', label: 'Size' },
  { id: 'sizeQuantity', label: 'Qty (bags)' },
  { id: 'sizeAcres', label: 'Acres' },
  { id: 'sizeAmount', label: 'Seed amt (₹)' },
  { id: 'buyBackBags', label: 'Buy back bags' },
  { id: 'buyBackNetWeightKg', label: 'Buy back net wt (kg)' },
];

export function buildContractFarmingFilterableColumns(gradeHeaders: string[]) {
  const base = [
    { id: 'farmer', label: 'Farmer' },
    { id: 'farmerMobile', label: 'Mobile' },
    { id: 'address', label: 'Address' },
    { id: 'variety', label: 'Variety' },
    { id: 'generation', label: 'Gen' },
    { id: 'size', label: 'Size' },
    { id: 'qty', label: 'Qty (bags)' },
    { id: 'acres', label: 'Acres' },
    { id: 'amount', label: 'Seed amt (₹)' },
    { id: 'bbBags', label: 'Buy back — Bags' },
    { id: 'bbNetWeight', label: 'Buy back — Net wt (kg)' },
  ] satisfies Array<{ id: string; label: string }>;

  return [
    ...base,
    ...gradeHeaders.map((grade) => ({
      id: `${FILTER_VARIETY_LEVEL_PREFIX}${grade}`,
      label: formatContractFarmingGradeColumnLabel(grade),
    })),
  ];
}

export {
  filterOperatorLabels,
  numberOperators,
  stringOperators,
} from '@/components/analytics/incoming/report/view-filters-sheet/constants';
