import type { ColumnFiltersState } from '@tanstack/react-table';
import {
  hasAnyUsableFilter,
  isAdvancedFilterGroup,
  type FilterGroupNode,
} from '@/lib/advanced-filters';
import { isNikasiVarietySplitColumn } from './columns';
import type { NikasiGlobalFilterValue } from './nikasi-advanced-filters';
import {
  applyVisibleGatePassTotalBags,
  recomputeNikasiVarietyRowSpans,
  type NikasiReportDisplayRow,
} from './nikasi-report-flatten';

export type NikasiRowSpanMeta = {
  varietyRowIndex: number;
  varietyRowSpan: number;
};

function filterGroupTargetsSplitColumns(
  group: FilterGroupNode,
  bagSizeColumnIds: ReadonlySet<string>
): boolean {
  return group.conditions.some((node) => {
    if (node.type === 'group') {
      return filterGroupTargetsSplitColumns(node, bagSizeColumnIds);
    }

    if (node.value.trim().length === 0) return false;
    return isNikasiVarietySplitColumn(node.field, bagSizeColumnIds);
  });
}

function isActiveColumnFilterValue(value: unknown): boolean {
  if (value == null) return false;
  if (Array.isArray(value) && value.length === 0) return false;
  if (typeof value === 'string' && value.trim() === '') return false;
  return true;
}

export function nikasiVarietyColumnFilterIsActive(
  columnFilters: ColumnFiltersState
): boolean {
  return columnFilters.some(
    ({ id, value }) => id === 'variety' && isActiveColumnFilterValue(value)
  );
}

export function nikasiColumnFiltersTargetSplitColumns(
  columnFilters: ColumnFiltersState,
  bagSizeColumnIds: ReadonlySet<string>
): boolean {
  return columnFilters.some(({ id, value }) => {
    if (!isActiveColumnFilterValue(value)) return false;
    return isNikasiVarietySplitColumn(id, bagSizeColumnIds);
  });
}

export function nikasiGlobalFilterTargetsSplitColumns(
  filter: NikasiGlobalFilterValue,
  bagSizeColumnIds: ReadonlySet<string>
): boolean {
  if (!isAdvancedFilterGroup(filter) || !hasAnyUsableFilter(filter)) {
    return false;
  }

  return filterGroupTargetsSplitColumns(filter, bagSizeColumnIds);
}

/** True when any active view or logic filter can remove individual variety sub-rows. */
function globalFilterTargetsVariety(filter: NikasiGlobalFilterValue): boolean {
  if (!isAdvancedFilterGroup(filter) || !hasAnyUsableFilter(filter)) {
    return false;
  }

  const visit = (group: FilterGroupNode): boolean =>
    group.conditions.some((node) => {
      if (node.type === 'group') return visit(node);
      if (node.value.trim().length === 0) return false;
      return node.field === 'variety';
    });

  return visit(filter);
}

export function nikasiActiveFiltersTargetSplitColumns(
  columnFilters: ColumnFiltersState,
  globalFilter: NikasiGlobalFilterValue,
  bagSizeColumnIds: ReadonlySet<string>
): boolean {
  return (
    nikasiVarietyColumnFilterIsActive(columnFilters) ||
    globalFilterTargetsVariety(globalFilter) ||
    nikasiColumnFiltersTargetSplitColumns(columnFilters, bagSizeColumnIds) ||
    nikasiGlobalFilterTargetsSplitColumns(globalFilter, bagSizeColumnIds)
  );
}

/** Restores all variety sub-rows for gate passes that still have at least one match. */
export function expandNikasiGatePassBlocks(
  filteredRows: NikasiReportDisplayRow[],
  allDisplayRows: NikasiReportDisplayRow[]
): NikasiReportDisplayRow[] {
  if (filteredRows.length === 0) return filteredRows;

  const gatePassIds = new Set(filteredRows.map((row) => row.gatePassId));
  return allDisplayRows.filter((row) => gatePassIds.has(row.gatePassId));
}

export function normalizeNikasiFilteredDisplayRows(
  filteredRows: NikasiReportDisplayRow[],
  allDisplayRows: NikasiReportDisplayRow[],
  options: { preserveGatePassBlocks: boolean }
): NikasiReportDisplayRow[] {
  const baseRows = options.preserveGatePassBlocks
    ? expandNikasiGatePassBlocks(filteredRows, allDisplayRows)
    : filteredRows;

  const spanAdjusted = recomputeNikasiVarietyRowSpans(baseRows);
  return applyVisibleGatePassTotalBags(spanAdjusted, filteredRows);
}

export function buildNikasiRowSpanMetaById(
  rows: NikasiReportDisplayRow[]
): Map<string, NikasiRowSpanMeta> {
  return new Map(
    rows.map((row) => [
      row.id,
      {
        varietyRowIndex: row.varietyRowIndex,
        varietyRowSpan: row.varietyRowSpan,
      },
    ])
  );
}
