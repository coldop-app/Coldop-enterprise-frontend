import type { GradingReportRow } from './columns';
import type { FilterGroupNode } from './advanced-filters';
import {
  evaluateFilterGroup,
  isAdvancedFilterGroup,
  numericFilterFields,
} from './advanced-filters';

function getDynamicBagQtyByColumnId(
  row: GradingReportRow,
  columnId: string
): number | undefined {
  const qtyByCol = row.gradedBagSizeQtyByColumnId ?? {};
  if (Object.prototype.hasOwnProperty.call(qtyByCol, columnId)) {
    return qtyByCol[columnId] ?? 0;
  }
  return undefined;
}

function getFilterFieldValue(row: GradingReportRow, field: string): unknown {
  const bagSizeValue = getDynamicBagQtyByColumnId(row, field);
  if (bagSizeValue != null) return bagSizeValue;
  return row[field as keyof GradingReportRow];
}

export const gradingGlobalFilterFn = (
  row: GradingReportRow,
  value: string | FilterGroupNode,
  allNumericFields: string[]
): boolean => {
  if (isAdvancedFilterGroup(value)) {
    return evaluateFilterGroup(row, value, {
      getFieldValue: getFilterFieldValue,
      numericFields: allNumericFields,
    });
  }
  const normalized = String(value ?? '')
    .trim()
    .toLowerCase();
  if (!normalized) return true;
  return String(row.manualGatePassNumber).toLowerCase().includes(normalized);
};

export const gradingNumericFilterFields = numericFilterFields;
