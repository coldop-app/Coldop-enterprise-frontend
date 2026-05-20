import { GRADE_BAG_COLUMN_KEY_PREFIX } from '../types';

export const FILTER_VARIETY_LEVEL_PREFIX = GRADE_BAG_COLUMN_KEY_PREFIX;

/** Grading columns: Cut is shown alone; bag-size ranges include (MM). */
export function isContractFarmingCutGrade(grade: string): boolean {
  return grade.trim().toLowerCase() === 'cut';
}

export function formatContractFarmingGradeColumnLabel(grade: string): string {
  if (isContractFarmingCutGrade(grade)) return 'Cut';
  return `${grade} (MM)`;
}

/** Per-grade net-weight column headers (hidden by default, like bag columns). */
export function formatContractFarmingGradeNetWeightColumnLabel(
  grade: string
): string {
  if (isContractFarmingCutGrade(grade)) return 'Cut (kg)';
  return `${grade} (kg)`;
}

export {
  filterOperatorLabels,
  numberOperators,
  stringOperators,
} from '@/components/analytics/incoming/report/view-filters-sheet/constants';
