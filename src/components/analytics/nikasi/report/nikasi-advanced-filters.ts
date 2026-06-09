import type { FilterFn } from '@tanstack/react-table';
import {
  createDefaultCondition,
  createDefaultFilterGroup,
  evaluateFilterGroup,
  isAdvancedFilterGroup,
  isNumericFilterField,
  type FilterField,
  type FilterGroupNode,
} from '@/lib/advanced-filters';
import {
  formatNikasiReportCellValue,
  getNikasiColumnFilterValue,
} from './columns';
import {
  getNikasiGatePassTotalBags,
  getNikasiVarietyRowAverageWeight,
  getNikasiVarietyRowNetWeight,
  type NikasiReportDisplayRow,
} from './nikasi-report-flatten';

export type NikasiGlobalFilterValue = string | FilterGroupNode;

const NIKASI_STANDARD_FILTER_FIELDS = [
  'gatePassNo',
  'manualGatePassNumber',
  'date',
  'from',
  'dispatchLedger',
  'to',
  'truckNumber',
  'variety',
  'totalBagsIssued',
  'averageWeightPerBag',
  'netWeight',
  'isInternalTransfer',
  'remarks',
] as const;

function setNikasiAdvancedFilterFieldValue(
  record: Record<string, unknown>,
  row: NikasiReportDisplayRow,
  field: string
) {
  const filterField = field as FilterField;

  if (field in row.bagSizeFields) {
    record[field] = row.bagSizeFields[field]?.quantity ?? 0;
    return;
  }

  if (field === 'totalBagsIssued') {
    record[field] = getNikasiGatePassTotalBags(row);
    return;
  }

  if (field === 'netWeight') {
    record[field] = getNikasiVarietyRowNetWeight(row);
    return;
  }

  if (field === 'averageWeightPerBag') {
    record[field] = getNikasiVarietyRowAverageWeight(row) ?? 0;
    return;
  }

  if (isNumericFilterField(filterField)) {
    record[field] =
      Number(row[field as keyof NikasiReportDisplayRow] ?? 0) || 0;
    return;
  }

  record[field] = getNikasiAdvancedFilterFieldValue(row, field);
}

export function buildNikasiAdvancedFilterRecord(
  row: NikasiReportDisplayRow
): Record<string, unknown> {
  const record: Record<string, unknown> = {};

  for (const field of NIKASI_STANDARD_FILTER_FIELDS) {
    setNikasiAdvancedFilterFieldValue(record, row, field);
  }

  for (const columnId of Object.keys(row.bagSizeFields)) {
    if (columnId in record) continue;
    setNikasiAdvancedFilterFieldValue(record, row, columnId);
  }

  return record;
}

export function getNikasiAdvancedFilterFieldValue(
  row: NikasiReportDisplayRow,
  field: string
): string {
  if (field in row.bagSizeFields) {
    return getNikasiColumnFilterValue(
      field,
      row.bagSizeFields[field]?.quantity,
      row
    );
  }

  if (field === 'isInternalTransfer') {
    return formatNikasiReportCellValue(row.isInternalTransfer);
  }

  return getNikasiColumnFilterValue(
    field,
    row[field as keyof NikasiReportDisplayRow],
    row
  );
}

export function createDefaultNikasiLogicFilter(): FilterGroupNode {
  return {
    ...createDefaultFilterGroup(),
    conditions: [createDefaultCondition('gatePassNo')],
  };
}

export const globalNikasiReportFilterFn: FilterFn<NikasiReportDisplayRow> = (
  row,
  _columnId,
  filterValue: NikasiGlobalFilterValue
) => {
  if (isAdvancedFilterGroup(filterValue)) {
    return evaluateFilterGroup(
      buildNikasiAdvancedFilterRecord(row.original),
      filterValue
    );
  }

  return true;
};
