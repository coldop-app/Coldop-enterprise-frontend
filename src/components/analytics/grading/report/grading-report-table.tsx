import * as React from 'react';
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  getExpandedRowModel,
  getFacetedRowModel,
  getFacetedUniqueValues,
  getFilteredRowModel,
  getGroupedRowModel,
  getSortedRowModel,
  type Column,
  type ColumnFiltersState,
  type ColumnResizeDirection,
  type ColumnResizeMode,
  type FilterFn,
  type GroupingState,
  type SortingState,
  type VisibilityState,
  useReactTable,
} from '@tanstack/react-table';
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  RefreshCw,
  Search,
  SlidersHorizontal,
} from 'lucide-react';
import { DatePicker } from '@/components/date-picker';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Item } from '@/components/ui/item';
import { Skeleton } from '@/components/ui/skeleton';
import {
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { cn } from '@/lib/utils';
import {
  calculateIncomingMetrics,
  calculateGradingMetrics,
  formatNumber,
  getBagWeightsFromStore,
} from '@/components/daybook/grading-calculations';
import {
  useGetGradingGatePassReport,
  type GetGradingGatePassReportParams,
} from '@/services/store-admin/grading-gate-pass/analytics/useGetGradingGatePassReport';
import { usePreferencesStore, useStore } from '@/stores/store';
import type {
  GradingGatePass,
  GradingGatePassFarmerStorageLink,
  GradingGatePassIncomingRef,
  GradingGatePassIncomingRefLink,
  GradingGatePassIncomingReportFarmerStorageLink,
  GradingGatePassOrderDetail,
} from '@/types/grading-gate-pass';
import {
  GRADING_BAG_SIZE_COLUMN_ID_TO_CANON,
  GRADING_BAG_SIZE_COLUMN_ORDER,
  defaultGradingColumnOrder,
  getGradingBagSizeColumnId,
  gradingBagSizeColumnHeaderText,
  type CanonBagSize,
} from './column-meta';
import type {
  GradingBagSizeAggregateCell,
  GradingReportTableRow,
} from './columns';
import {
  evaluateGradingFilterGroup,
  isGradingAdvancedFilterGroup,
  type GradingFilterGroupNode,
} from './view-filters-sheet/advanced-filters';
import { ViewFiltersSheet } from './view-filters-sheet/index';
import { GradingExcelButton } from './grading-excel-button';

/** Stable row-model factories — TanStack Table compares these by reference. */
const gradingReportGetCoreRowModel = getCoreRowModel<GradingReportTableRow>();
const gradingReportGetFilteredRowModel =
  getFilteredRowModel<GradingReportTableRow>();
const gradingReportGetFacetedRowModel =
  getFacetedRowModel<GradingReportTableRow>();
const gradingReportGetFacetedUniqueValues =
  getFacetedUniqueValues<GradingReportTableRow>();
const gradingReportGetSortedRowModel =
  getSortedRowModel<GradingReportTableRow>();
const gradingReportGetGroupedRowModel =
  getGroupedRowModel<GradingReportTableRow>();
const gradingReportGetExpandedRowModel =
  getExpandedRowModel<GradingReportTableRow>();

const gradingRightAlignedColumnIds = new Set<string>([
  'gradedBags',
  'incomingSystemGatePassNo',
  'incomingFarmerStorageAccountNo',
  'incomingBagsReceived',
  'incomingGrossKg',
  'incomingTareKg',
  'incomingNetKg',
  'incomingBardanaWeightKg',
  'incomingNetWeightWithoutBardana',
  ...GRADING_BAG_SIZE_COLUMN_ORDER.map(getGradingBagSizeColumnId),
  'gradingBardanaWeightKg',
  'netWeightAfterGradingWithoutBardana',
  'wastagePercent',
]);

function isGradingSplitSpanColumn(
  column: Column<GradingReportTableRow, unknown>
): boolean {
  return column.columnDef.meta?.gradingReportRowSpan === 'split';
}

function isGradingReportGradingSectionStartColumn(
  column: Column<GradingReportTableRow, unknown>
): boolean {
  return Boolean(column.columnDef.meta?.gradingReportGradingSectionStart);
}

/** Primary vertical rule between nested incoming refs and grading gate pass fields */
const GRADING_SECTION_START_BORDER_CLASSES =
  'border-l-[3px] border-l-primary' as const;

/**
 * tbody `rowSpan` is authored manually (TanStack does not compute rowspan for body cells).
 * thead uses `header.colSpan` as in https://tanstack.com/table/v8/docs/guide/headers
 * Body spanning is driven by `columnDef.meta.gradingReportRowSpan` on each column.
 */
function gradingMergedTdRowSpan(
  expanded: GradingReportTableRow,
  column: Column<GradingReportTableRow, unknown>
): number | undefined {
  if (isGradingSplitSpanColumn(column)) return undefined;
  if (!expanded.isFirstOfMergedBlock) return undefined;
  if (expanded.mergedRowSpan <= 1) return undefined;
  return expanded.mergedRowSpan;
}

function formatIndianNumber(value: number, precision = 0): string {
  return value.toLocaleString('en-IN', {
    minimumFractionDigits: precision,
    maximumFractionDigits: precision,
  });
}

/** Unicode hyphen/dash/minus variants → ASCII `-` so `30–40` matches column `30-40`. */
const UNICODE_DASH_CHARS = /[\u2010-\u2015\u2212\uFE58\uFE63\uFF0D]/g;

function normalizeBagSizeKey(raw: string): string {
  return String(raw)
    .trim()
    .replace(UNICODE_DASH_CHARS, '-')
    .replace(/\s+/g, ' ')
    .toLowerCase();
}

function matchCanonicalBagSize(
  raw: string | undefined | null
): CanonBagSize | null {
  if (raw == null) return null;
  const normalized = normalizeBagSizeKey(raw);
  if (!normalized) return null;
  for (const canon of GRADING_BAG_SIZE_COLUMN_ORDER) {
    if (canon.toLowerCase() === normalized) return canon;
  }
  return null;
}

function formatBagTypeLabel(bagType: string): string {
  const t = bagType.trim();
  if (!t) return '';
  return t
    .split(/\s+/)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(' ');
}

function formatWeightPerBagKg(kg: number): string {
  if (!Number.isFinite(kg)) return '-';
  return new Intl.NumberFormat('en-IN', { maximumFractionDigits: 2 }).format(
    kg
  );
}

interface BagSizeBreakdownLine {
  bagType: string;
  weightPerBagKg: number;
  initialQuantity: number;
}

function bagSizeBreakdownLineKey(bagType: string, weightPerBagKg: number) {
  return `${normalizeBagSizeKey(bagType)}|${weightPerBagKg}`;
}

function aggregateOrderDetailsByCanonicalSize(
  orderDetails: GradingGatePassOrderDetail[] | undefined
): Map<CanonBagSize, GradingBagSizeAggregateCell> {
  const outer = new Map<CanonBagSize, Map<string, BagSizeBreakdownLine>>();
  if (!orderDetails?.length) return new Map();

  for (const od of orderDetails) {
    const canon = matchCanonicalBagSize(od.size);
    if (!canon) continue;

    const init = Number(od.initialQuantity) || 0;
    if (init <= 0) continue;

    const weight = Number(od.weightPerBagKg) || 0;
    const key = bagSizeBreakdownLineKey(od.bagType ?? '', weight);
    let inner = outer.get(canon);
    if (!inner) {
      inner = new Map();
      outer.set(canon, inner);
    }
    const existing = inner.get(key);
    if (existing) {
      existing.initialQuantity += init;
    } else {
      inner.set(key, {
        bagType: od.bagType ?? '',
        weightPerBagKg: weight,
        initialQuantity: init,
      });
    }
  }

  const result = new Map<CanonBagSize, GradingBagSizeAggregateCell>();
  for (const [canon, inner] of outer) {
    const lines = [...inner.values()].sort((a, b) =>
      formatBagTypeLabel(a.bagType).localeCompare(formatBagTypeLabel(b.bagType))
    );
    const totalQuantity = lines.reduce((s, l) => s + l.initialQuantity, 0);
    if (totalQuantity > 0) {
      result.set(canon, { totalQuantity, lines });
    }
  }
  return result;
}

function sumInitialBags(
  orderDetails: GradingGatePassOrderDetail[] | undefined
) {
  if (!orderDetails?.length) return 0;
  return orderDetails.reduce((s, d) => s + (Number(d.initialQuantity) || 0), 0);
}

const GradedBagSizeCell = React.memo(function GradedBagSizeCell({
  cell,
}: {
  cell: GradingBagSizeAggregateCell | undefined;
}) {
  if (!cell || cell.totalQuantity <= 0 || cell.lines.length === 0) {
    return null;
  }

  if (cell.lines.length > 1) {
    return (
      <div className="flex w-full justify-start">
        <div className="font-custom bg-muted/45 text-foreground inline-flex max-w-44 flex-col items-start gap-1 rounded-md px-2 py-1.5 text-left">
          <span className="font-custom text-foreground text-base leading-none font-bold tabular-nums">
            {formatIndianNumber(cell.totalQuantity, 0)}
          </span>
          <div className="font-custom flex flex-col gap-0.5">
            {cell.lines.map((line) => (
              <span
                key={bagSizeBreakdownLineKey(line.bagType, line.weightPerBagKg)}
                className="font-custom text-muted-foreground text-[11px] leading-snug tabular-nums"
              >
                {`${formatBagTypeLabel(line.bagType)} ${formatIndianNumber(line.initialQuantity, 0)} (${formatWeightPerBagKg(line.weightPerBagKg)})`}
              </span>
            ))}
          </div>
        </div>
      </div>
    );
  }

  const line = cell.lines[0]!;
  const sub = `${formatBagTypeLabel(line.bagType)} (${formatWeightPerBagKg(line.weightPerBagKg)})`;

  return (
    <div className="flex w-full justify-center">
      <div className="font-custom bg-primary/10 text-foreground inline-flex max-w-40 min-w-17 flex-col items-center justify-center gap-0.5 rounded-lg px-2.5 py-2 text-center">
        <span className="font-custom text-base leading-none font-bold tabular-nums">
          {formatIndianNumber(cell.totalQuantity, 0)}
        </span>
        <span className="font-custom text-muted-foreground text-[11px] leading-snug">
          {sub}
        </span>
      </div>
    </div>
  );
});

function toDisplayDate(value?: string): string {
  if (!value) return '-';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return '-';
  return parsed.toLocaleDateString('en-GB');
}

function toApiDate(value: string): string | undefined {
  const [day, month, year] = value.split('.');
  if (!day || !month || !year) return undefined;

  const normalizedDay = day.padStart(2, '0');
  const normalizedMonth = month.padStart(2, '0');
  if (year.length !== 4) return undefined;

  return `${year}-${normalizedMonth}-${normalizedDay}`;
}

function formatCreatedBy(gp: GradingGatePass): string {
  if (gp.createdBy && typeof gp.createdBy !== 'string') {
    return gp.createdBy.name;
  }
  if (typeof gp.createdBy === 'string') return gp.createdBy;
  return '-';
}

function incomingRefDisplayLabel(ref: GradingGatePassIncomingRef): string {
  return ref.manualGatePassNumber != null
    ? String(ref.manualGatePassNumber)
    : String(ref.gatePassNo);
}

/** Populated farmer-storage object on nested incoming refs (report + list projections). */
function incomingRefFarmerStorageLink(
  ref: GradingGatePassIncomingRef | undefined
):
  | GradingGatePassIncomingRefLink
  | GradingGatePassFarmerStorageLink
  | GradingGatePassIncomingReportFarmerStorageLink
  | undefined {
  const v = ref?.farmerStorageLinkId;
  if (!v || typeof v !== 'object') return undefined;
  return v;
}

function incomingRefFarmerName(ref: GradingGatePassIncomingRef | undefined) {
  const link = incomingRefFarmerStorageLink(ref);
  return link?.farmerId?.name?.trim() || '-';
}

function incomingRefFarmerAddress(ref: GradingGatePassIncomingRef | undefined) {
  const link = incomingRefFarmerStorageLink(ref);
  const farmer = link?.farmerId;
  if (farmer && typeof farmer !== 'string') {
    return farmer.address?.trim() || '-';
  }
  return '-';
}

function incomingFarmerAccountNumber(
  ref: GradingGatePassIncomingRef | undefined
) {
  const link = incomingRefFarmerStorageLink(ref);
  if (typeof link?.accountNumber !== 'number') return '-';
  return formatIndianNumber(link.accountNumber, 0);
}

function formatIncomingWeightKg(
  ref: GradingGatePassIncomingRef | undefined,
  key: 'grossWeightKg' | 'tareWeightKg'
): string {
  const v = ref?.weightSlip?.[key];
  if (typeof v !== 'number' || !Number.isFinite(v)) return '-';
  return formatIndianNumber(v, 0);
}

function formatIncomingNetKg(
  ref: GradingGatePassIncomingRef | undefined
): string {
  const g = ref?.weightSlip?.grossWeightKg;
  const t = ref?.weightSlip?.tareWeightKg;
  if (typeof g !== 'number' || typeof t !== 'number') return '-';
  const n = g - t;
  if (!Number.isFinite(n)) return '-';
  return formatIndianNumber(n, 0);
}

function formatIncomingBardanaWeightKg(
  ref: GradingGatePassIncomingRef | undefined
): string {
  if (!ref) return '-';
  const bagWeights = getBagWeightsFromStore();
  const inc = calculateIncomingMetrics([ref], bagWeights);
  const v = inc.rows[0]?.bardanaKg;
  if (typeof v !== 'number' || !Number.isFinite(v)) return '-';
  return formatNumber(v);
}

function formatIncomingNetWeightWithoutBardana(
  ref: GradingGatePassIncomingRef | undefined
): string {
  if (!ref) return '-';
  const bagWeights = getBagWeightsFromStore();
  const inc = calculateIncomingMetrics([ref], bagWeights);
  const netProductKg = inc.rows[0]?.netProductKg;
  if (typeof netProductKg !== 'number' || !Number.isFinite(netProductKg)) {
    return '-';
  }
  return formatNumber(netProductKg);
}

function getGradingTotalsForGatePass(gp: GradingGatePass) {
  const bagWeights = getBagWeightsFromStore();
  const inc = calculateIncomingMetrics(
    gp.incomingGatePassIds ?? [],
    bagWeights
  );
  return calculateGradingMetrics(
    gp.orderDetails ?? [],
    inc.totals.totalNetProductKg,
    bagWeights
  ).totals;
}

function formatGradingBardanaWeightKg(gp: GradingGatePass): string {
  const v = getGradingTotalsForGatePass(gp).totalDeductionKg;
  if (!Number.isFinite(v)) return '-';
  return formatNumber(v);
}

function formatNetWeightAfterGradingWithoutBardana(
  gp: GradingGatePass
): string {
  const v = getGradingTotalsForGatePass(gp).totalNetKg;
  if (!Number.isFinite(v)) return '-';
  return formatNumber(v);
}

function formatWastagePercentFromGatePass(gp: GradingGatePass): string {
  const v = getGradingTotalsForGatePass(gp).wastagePct;
  if (!Number.isFinite(v)) return '-';
  return `${formatNumber(v)}%`;
}

function expandGradingReportRows(
  gradingPasses: GradingGatePass[]
): GradingReportTableRow[] {
  const out: GradingReportTableRow[] = [];
  gradingPasses.forEach((gp, parentRowIndex) => {
    const bagSizeAggregate = aggregateOrderDetailsByCanonicalSize(
      gp.orderDetails
    );
    const refs = gp.incomingGatePassIds ?? [];
    if (refs.length >= 2) {
      refs.forEach((ref, incomingSubIndex) => {
        out.push({
          gradingGatePass: gp,
          incomingDisplay: incomingRefDisplayLabel(ref),
          incomingRef: ref,
          mergedRowSpan: refs.length,
          isFirstOfMergedBlock: incomingSubIndex === 0,
          incomingSubIndex,
          parentRowIndex,
          bagSizeAggregate,
        });
      });
      return;
    }
    const singleRef = refs.length === 1 ? refs[0]! : undefined;
    const incomingDisplay = singleRef
      ? incomingRefDisplayLabel(singleRef)
      : '-';
    out.push({
      gradingGatePass: gp,
      incomingDisplay,
      incomingRef: singleRef,
      mergedRowSpan: 1,
      isFirstOfMergedBlock: true,
      incomingSubIndex: 0,
      parentRowIndex,
      bagSizeAggregate,
    });
  });
  return out;
}

function getGradingColumnFilterValue(
  row: GradingReportTableRow,
  columnId: string
): unknown {
  const gp = row.gradingGatePass;
  const ref = row.incomingRef;
  if (columnId.startsWith('bagSize__')) {
    const canon = GRADING_BAG_SIZE_COLUMN_ID_TO_CANON.get(columnId);
    if (!canon) return 0;
    return row.bagSizeAggregate.get(canon)?.totalQuantity ?? 0;
  }
  switch (columnId) {
    case 'incomingGatePassIds':
      return row.incomingDisplay ?? '-';
    case 'incomingSystemGatePassNo': {
      const v = ref?.gatePassNo;
      return v != null && Number.isFinite(v) ? v : undefined;
    }
    case 'incomingFarmerName':
      return incomingRefFarmerName(ref);
    case 'incomingFarmerAddress':
      return incomingRefFarmerAddress(ref);
    case 'incomingFarmerStorageAccountNo':
      return incomingFarmerAccountNumber(ref);
    case 'incomingDate':
      return toDisplayDate(ref?.date);
    case 'incomingLocation':
      return ref?.location?.trim() || '-';
    case 'incomingTruckNumber':
      return ref?.truckNumber?.trim() || '-';
    case 'incomingBagsReceived': {
      const b = ref?.bagsReceived;
      return b != null && Number.isFinite(b) ? b : undefined;
    }
    case 'incomingSlipNumber':
      return ref?.weightSlip?.slipNumber?.trim() || '-';
    case 'incomingGrossKg':
      return formatIncomingWeightKg(ref, 'grossWeightKg');
    case 'incomingTareKg':
      return formatIncomingWeightKg(ref, 'tareWeightKg');
    case 'incomingNetKg':
      return formatIncomingNetKg(ref);
    case 'incomingBardanaWeightKg':
      return formatIncomingBardanaWeightKg(ref);
    case 'incomingNetWeightWithoutBardana':
      return formatIncomingNetWeightWithoutBardana(ref);
    case 'incomingStatus':
      return ref?.status?.trim() || '-';
    case 'incomingRemarks':
      return ref?.remarks?.trim() || '-';
    case 'createdBy':
      return formatCreatedBy(gp);
    case 'gatePassNo': {
      const g = gp.gatePassNo;
      return g != null && Number.isFinite(Number(g)) ? Number(g) : undefined;
    }
    case 'manualGatePassNumber':
      return gp.manualGatePassNumber != null
        ? String(gp.manualGatePassNumber)
        : '';
    case 'date':
      return toDisplayDate(gp.date);
    case 'variety':
      return gp.variety?.trim() || '-';
    case 'gradedBags':
      return sumInitialBags(gp.orderDetails);
    case 'gradingBardanaWeightKg':
      return formatGradingBardanaWeightKg(gp);
    case 'netWeightAfterGradingWithoutBardana':
      return formatNetWeightAfterGradingWithoutBardana(gp);
    case 'wastagePercent':
      return formatWastagePercentFromGatePass(gp);
    case 'grader':
      return gp.grader?.trim() || '-';
    case 'remarks':
      return gp.remarks?.trim() || '-';
    default:
      return '';
  }
}

function gradingReportRowToFilterRecord(
  row: GradingReportTableRow
): Record<string, unknown> {
  const record: Record<string, unknown> = {};
  for (const id of defaultGradingColumnOrder) {
    record[id] = getGradingColumnFilterValue(row, id);
  }
  return record;
}

function shouldSuppressGradingAggregatedCell(columnId: string) {
  if (columnId === 'gradedBags' || columnId === 'incomingBagsReceived') {
    return false;
  }
  return true;
}

const multiValueFilterFn: FilterFn<GradingReportTableRow> = (
  row,
  columnId,
  filterValue
) => {
  const raw = row.getValue(columnId);
  const cellValue = String(raw ?? '');
  if (typeof filterValue === 'string') {
    const normalized = filterValue.trim().toLowerCase();
    if (!normalized) return true;
    return cellValue.toLowerCase().includes(normalized);
  }
  if (!Array.isArray(filterValue)) return true;
  if (filterValue.length === 0) return true;
  return filterValue.map(String).includes(cellValue);
};

type GlobalFilterValue = string | GradingFilterGroupNode;

const globalGradingFilterFn: FilterFn<GradingReportTableRow> = (
  row,
  _columnId,
  filterValue
) => {
  if (isGradingAdvancedFilterGroup(filterValue)) {
    return evaluateGradingFilterGroup(
      gradingReportRowToFilterRecord(row.original),
      filterValue
    );
  }
  const normalized = String(filterValue).trim().toLowerCase();
  if (!normalized) return true;
  const manual = row.original.gradingGatePass.manualGatePassNumber;
  return String(manual ?? '')
    .toLowerCase()
    .includes(normalized);
};

const defaultGradingReportColumnVisibility: VisibilityState = {
  incomingSlipNumber: false,
  incomingGrossKg: false,
  incomingTareKg: false,
  createdBy: false,
  gatePassNo: false,
};

const DEFAULT_COLUMN_SIZE = 170;
const DEFAULT_COLUMN_MIN_SIZE = 120;
const DEFAULT_COLUMN_MAX_SIZE = 550;

const columnHelper = createColumnHelper<GradingReportTableRow>();

const bagSizeColumns = GRADING_BAG_SIZE_COLUMN_ORDER.map((sizeLabel) => {
  const id = getGradingBagSizeColumnId(sizeLabel);
  return columnHelper.accessor(
    (r) => r.bagSizeAggregate.get(sizeLabel)?.totalQuantity ?? 0,
    {
      id,
      meta: { gradingReportRowSpan: 'merge' },
      header: () => (
        <div className="font-custom w-full text-right">
          {gradingBagSizeColumnHeaderText(sizeLabel)}
        </div>
      ),
      minSize: 90,
      maxSize: 180,
      enableSorting: false,
      filterFn: multiValueFilterFn,
      cell: ({ row }) => (
        <GradedBagSizeCell
          cell={row.original.bagSizeAggregate.get(sizeLabel)}
        />
      ),
    }
  );
});

const columns = [
  columnHelper.accessor(
    (r) => getGradingColumnFilterValue(r, 'incomingGatePassIds'),
    {
      id: 'incomingGatePassIds',
      meta: { gradingReportRowSpan: 'split' },
      header: 'Incoming Manual Gate Pass No',
      enableSorting: false,
      filterFn: multiValueFilterFn,
      cell: ({ row }) => (
        <span className="font-custom">{row.original.incomingDisplay}</span>
      ),
    }
  ),
  columnHelper.accessor(
    (r) => getGradingColumnFilterValue(r, 'incomingSystemGatePassNo'),
    {
      id: 'incomingSystemGatePassNo',
      meta: { gradingReportRowSpan: 'split' },
      header: 'Incoming System Generated Gate Pass Number',
      enableSorting: false,
      filterFn: multiValueFilterFn,
      cell: ({ row }) => {
        const v = row.original.incomingRef?.gatePassNo;
        return (
          <span className="font-custom">
            {v != null ? formatIndianNumber(v, 0) : '-'}
          </span>
        );
      },
    }
  ),
  columnHelper.accessor(
    (r) => getGradingColumnFilterValue(r, 'incomingFarmerName'),
    {
      id: 'incomingFarmerName',
      meta: { gradingReportRowSpan: 'split' },
      header: 'Farmer',
      enableSorting: false,
      filterFn: multiValueFilterFn,
      cell: ({ row }) => (
        <span
          className="font-custom block max-w-[14rem] truncate"
          title={incomingRefFarmerName(row.original.incomingRef)}
        >
          {incomingRefFarmerName(row.original.incomingRef)}
        </span>
      ),
    }
  ),
  columnHelper.accessor(
    (r) => getGradingColumnFilterValue(r, 'incomingFarmerAddress'),
    {
      id: 'incomingFarmerAddress',
      meta: { gradingReportRowSpan: 'split' },
      header: 'Farmer address',
      enableSorting: false,
      filterFn: multiValueFilterFn,
      minSize: 200,
      maxSize: 360,
      cell: ({ row }) => {
        const text = incomingRefFarmerAddress(row.original.incomingRef);
        return (
          <span
            className="font-custom block max-w-64 truncate"
            title={text !== '-' ? text : undefined}
          >
            {text}
          </span>
        );
      },
    }
  ),
  columnHelper.accessor(
    (r) => getGradingColumnFilterValue(r, 'incomingFarmerStorageAccountNo'),
    {
      id: 'incomingFarmerStorageAccountNo',
      meta: { gradingReportRowSpan: 'split' },
      header: 'Account No',
      enableSorting: false,
      filterFn: multiValueFilterFn,
      cell: ({ row }) => (
        <span className="font-custom">
          {incomingFarmerAccountNumber(row.original.incomingRef)}
        </span>
      ),
    }
  ),
  columnHelper.accessor((r) => getGradingColumnFilterValue(r, 'incomingDate'), {
    id: 'incomingDate',
    meta: { gradingReportRowSpan: 'split' },
    header: 'Incoming date',
    enableSorting: false,
    filterFn: multiValueFilterFn,
    cell: ({ row }) => (
      <span className="font-custom">
        {toDisplayDate(row.original.incomingRef?.date)}
      </span>
    ),
  }),
  columnHelper.accessor(
    (r) => getGradingColumnFilterValue(r, 'incomingLocation'),
    {
      id: 'incomingLocation',
      meta: { gradingReportRowSpan: 'split' },
      header: 'Location',
      enableSorting: false,
      filterFn: multiValueFilterFn,
      cell: ({ row }) => (
        <span
          className="font-custom block max-w-[12rem] truncate"
          title={row.original.incomingRef?.location ?? undefined}
        >
          {row.original.incomingRef?.location?.trim() || '-'}
        </span>
      ),
    }
  ),
  columnHelper.accessor(
    (r) => getGradingColumnFilterValue(r, 'incomingTruckNumber'),
    {
      id: 'incomingTruckNumber',
      meta: { gradingReportRowSpan: 'split' },
      header: 'Truck No.',
      enableSorting: false,
      filterFn: multiValueFilterFn,
      cell: ({ row }) => (
        <span className="font-custom">
          {row.original.incomingRef?.truckNumber?.trim() || '-'}
        </span>
      ),
    }
  ),
  columnHelper.accessor(
    (r) => getGradingColumnFilterValue(r, 'incomingBagsReceived'),
    {
      id: 'incomingBagsReceived',
      meta: { gradingReportRowSpan: 'split' },
      header: 'Bags received',
      enableSorting: false,
      filterFn: multiValueFilterFn,
      cell: ({ row }) => {
        const b = row.original.incomingRef?.bagsReceived;
        return (
          <span className="font-custom font-medium tabular-nums">
            {b != null && Number.isFinite(b) ? formatIndianNumber(b, 0) : '-'}
          </span>
        );
      },
    }
  ),
  columnHelper.accessor(
    (r) => getGradingColumnFilterValue(r, 'incomingSlipNumber'),
    {
      id: 'incomingSlipNumber',
      meta: { gradingReportRowSpan: 'split' },
      header: 'Slip No.',
      enableSorting: false,
      filterFn: multiValueFilterFn,
      cell: ({ row }) => (
        <span className="font-custom">
          {row.original.incomingRef?.weightSlip?.slipNumber?.trim() || '-'}
        </span>
      ),
    }
  ),
  columnHelper.accessor(
    (r) => getGradingColumnFilterValue(r, 'incomingGrossKg'),
    {
      id: 'incomingGrossKg',
      meta: { gradingReportRowSpan: 'split' },
      header: 'Gross (kg)',
      enableSorting: false,
      filterFn: multiValueFilterFn,
      cell: ({ row }) => (
        <span className="font-custom">
          {formatIncomingWeightKg(row.original.incomingRef, 'grossWeightKg')}
        </span>
      ),
    }
  ),
  columnHelper.accessor(
    (r) => getGradingColumnFilterValue(r, 'incomingTareKg'),
    {
      id: 'incomingTareKg',
      meta: { gradingReportRowSpan: 'split' },
      header: 'Tare (kg)',
      enableSorting: false,
      filterFn: multiValueFilterFn,
      cell: ({ row }) => (
        <span className="font-custom">
          {formatIncomingWeightKg(row.original.incomingRef, 'tareWeightKg')}
        </span>
      ),
    }
  ),
  columnHelper.accessor(
    (r) => getGradingColumnFilterValue(r, 'incomingNetKg'),
    {
      id: 'incomingNetKg',
      meta: { gradingReportRowSpan: 'split' },
      header: 'Net (kg)',
      enableSorting: false,
      filterFn: multiValueFilterFn,
      cell: ({ row }) => (
        <span className="font-custom">
          {formatIncomingNetKg(row.original.incomingRef)}
        </span>
      ),
    }
  ),
  columnHelper.accessor(
    (r) => getGradingColumnFilterValue(r, 'incomingBardanaWeightKg'),
    {
      id: 'incomingBardanaWeightKg',
      meta: { gradingReportRowSpan: 'split' },
      header: 'Incoming bardana weight',
      enableSorting: false,
      filterFn: multiValueFilterFn,
      cell: ({ row }) => (
        <span className="font-custom font-medium tabular-nums">
          {formatIncomingBardanaWeightKg(row.original.incomingRef)}
        </span>
      ),
    }
  ),
  columnHelper.accessor(
    (r) => getGradingColumnFilterValue(r, 'incomingNetWeightWithoutBardana'),
    {
      id: 'incomingNetWeightWithoutBardana',
      meta: { gradingReportRowSpan: 'split' },
      header: 'Incoming Net Weight (w/o Bardana)',
      enableSorting: false,
      filterFn: multiValueFilterFn,
      cell: ({ row }) => (
        <span className="font-custom font-medium tabular-nums">
          {formatIncomingNetWeightWithoutBardana(row.original.incomingRef)}
        </span>
      ),
    }
  ),
  columnHelper.accessor(
    (r) => getGradingColumnFilterValue(r, 'incomingStatus'),
    {
      id: 'incomingStatus',
      meta: { gradingReportRowSpan: 'split' },
      header: 'Incoming status',
      enableSorting: false,
      filterFn: multiValueFilterFn,
      cell: ({ row }) => (
        <span className="font-custom">
          {row.original.incomingRef?.status?.trim() || '-'}
        </span>
      ),
    }
  ),
  columnHelper.accessor(
    (r) => getGradingColumnFilterValue(r, 'incomingRemarks'),
    {
      id: 'incomingRemarks',
      meta: { gradingReportRowSpan: 'split' },
      header: 'Incoming remarks',
      enableSorting: false,
      filterFn: multiValueFilterFn,
      cell: ({ row }) => (
        <span
          className="font-custom block max-w-[14rem] truncate"
          title={row.original.incomingRef?.remarks ?? undefined}
        >
          {row.original.incomingRef?.remarks?.trim() || '-'}
        </span>
      ),
    }
  ),
  columnHelper.accessor((r) => getGradingColumnFilterValue(r, 'createdBy'), {
    id: 'createdBy',
    meta: {
      gradingReportRowSpan: 'merge',
      gradingReportGradingSectionStart: true,
    },
    header: 'Created By',
    enableSorting: false,
    filterFn: multiValueFilterFn,
    cell: ({ row }) => (
      <span className="font-custom">
        {formatCreatedBy(row.original.gradingGatePass)}
      </span>
    ),
  }),
  columnHelper.accessor((r) => getGradingColumnFilterValue(r, 'gatePassNo'), {
    id: 'gatePassNo',
    meta: { gradingReportRowSpan: 'merge' },
    header: 'System Generated Gate Pass No',
    sortingFn: 'alphanumeric',
    filterFn: multiValueFilterFn,
    cell: (info) => {
      const v = info.getValue();
      return (
        <span className="font-custom font-medium">
          {v != null && v !== '' && Number.isFinite(Number(v))
            ? formatIndianNumber(Number(v), 0)
            : '-'}
        </span>
      );
    },
  }),
  columnHelper.accessor(
    (r) => getGradingColumnFilterValue(r, 'manualGatePassNumber'),
    {
      id: 'manualGatePassNumber',
      meta: { gradingReportRowSpan: 'merge' },
      header: 'Manual Gate Pass No',
      sortingFn: 'alphanumeric',
      filterFn: multiValueFilterFn,
      cell: (info) => {
        const v = info.getValue();
        return v != null && String(v).length > 0 ? (
          <span className="font-custom">{String(v)}</span>
        ) : (
          <span className="text-muted-foreground/50 font-custom">-</span>
        );
      },
    }
  ),
  columnHelper.accessor((r) => getGradingColumnFilterValue(r, 'date'), {
    id: 'date',
    meta: { gradingReportRowSpan: 'merge' },
    header: 'Date',
    sortingFn: 'alphanumeric',
    filterFn: multiValueFilterFn,
    cell: (info) => (
      <span className="font-custom">{String(info.getValue() ?? '-')}</span>
    ),
  }),
  columnHelper.accessor((r) => getGradingColumnFilterValue(r, 'variety'), {
    id: 'variety',
    meta: { gradingReportRowSpan: 'merge' },
    header: 'Variety',
    sortingFn: 'text',
    filterFn: multiValueFilterFn,
    cell: (info) => (
      <span className="font-custom">{String(info.getValue())}</span>
    ),
  }),
  columnHelper.accessor((r) => getGradingColumnFilterValue(r, 'gradedBags'), {
    id: 'gradedBags',
    meta: { gradingReportRowSpan: 'merge' },
    header: () => (
      <div className="font-custom w-full text-right">Graded bags</div>
    ),
    enableSorting: false,
    filterFn: multiValueFilterFn,
    cell: ({ row }) => (
      <div className="w-full text-right font-medium tabular-nums">
        {formatIndianNumber(
          sumInitialBags(row.original.gradingGatePass.orderDetails),
          0
        )}
      </div>
    ),
  }),
  ...bagSizeColumns,
  columnHelper.accessor(
    (r) => getGradingColumnFilterValue(r, 'gradingBardanaWeightKg'),
    {
      id: 'gradingBardanaWeightKg',
      meta: { gradingReportRowSpan: 'merge' },
      header: () => (
        <div className="font-custom w-full text-right">
          Grading bardana weight
        </div>
      ),
      enableSorting: false,
      filterFn: multiValueFilterFn,
      cell: ({ row }) => (
        <span className="font-custom font-medium tabular-nums">
          {formatGradingBardanaWeightKg(row.original.gradingGatePass)}
        </span>
      ),
    }
  ),
  columnHelper.accessor(
    (r) =>
      getGradingColumnFilterValue(r, 'netWeightAfterGradingWithoutBardana'),
    {
      id: 'netWeightAfterGradingWithoutBardana',
      meta: { gradingReportRowSpan: 'merge' },
      header: () => (
        <div className="font-custom w-full text-right">
          Net Weight After Grading (w/o Bardana)
        </div>
      ),
      enableSorting: false,
      filterFn: multiValueFilterFn,
      cell: ({ row }) => (
        <span className="font-custom font-medium tabular-nums">
          {formatNetWeightAfterGradingWithoutBardana(
            row.original.gradingGatePass
          )}
        </span>
      ),
    }
  ),
  columnHelper.accessor(
    (r) => getGradingColumnFilterValue(r, 'wastagePercent'),
    {
      id: 'wastagePercent',
      meta: { gradingReportRowSpan: 'merge' },
      header: () => (
        <div className="font-custom w-full text-right">Wastage (%)</div>
      ),
      enableSorting: false,
      filterFn: multiValueFilterFn,
      cell: ({ row }) => (
        <span className="font-custom font-medium tabular-nums">
          {formatWastagePercentFromGatePass(row.original.gradingGatePass)}
        </span>
      ),
    }
  ),
  columnHelper.accessor((r) => getGradingColumnFilterValue(r, 'grader'), {
    id: 'grader',
    meta: { gradingReportRowSpan: 'merge' },
    header: 'Grader',
    sortingFn: 'text',
    filterFn: multiValueFilterFn,
    cell: (info) => (
      <span className="font-custom">{String(info.getValue() ?? '-')}</span>
    ),
  }),
  columnHelper.accessor((r) => getGradingColumnFilterValue(r, 'remarks'), {
    id: 'remarks',
    meta: { gradingReportRowSpan: 'merge' },
    header: 'Remarks',
    sortingFn: 'text',
    filterFn: multiValueFilterFn,
    cell: (info) => (
      <span className="font-custom">{String(info.getValue() ?? '-')}</span>
    ),
  }),
];

const TABLE_SKELETON_COLUMNS = 13;
const TABLE_SKELETON_ROWS = 10;

const GradingReportTable = () => {
  const coldStorageName = useStore(
    (state) => state.coldStorage?.name?.trim() || 'Cold Storage'
  );
  const [fromDate, setFromDate] = React.useState('');
  const [toDate, setToDate] = React.useState('');
  const [appliedFromDate, setAppliedFromDate] = React.useState('');
  const [appliedToDate, setAppliedToDate] = React.useState('');
  const [isViewFiltersOpen, setIsViewFiltersOpen] = React.useState(false);
  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [columnVisibility, setColumnVisibility] =
    React.useState<VisibilityState>(defaultGradingReportColumnVisibility);
  const [columnOrder, setColumnOrder] = React.useState<string[]>(() => [
    ...defaultGradingColumnOrder,
  ]);
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>(
    []
  );
  const [grouping, setGrouping] = React.useState<GroupingState>([]);
  const [globalFilter, setGlobalFilter] = React.useState<GlobalFilterValue>('');
  const [columnResizeMode, setColumnResizeMode] =
    React.useState<ColumnResizeMode>('onChange');
  const [columnResizeDirection, setColumnResizeDirection] =
    React.useState<ColumnResizeDirection>('ltr');

  const bagWeightsRevision = usePreferencesStore((s) =>
    [
      s.preferences?.custom?.bagConfig?.juteBagWeight,
      s.preferences?.custom?.bagConfig?.lenoBagWeight,
    ].join(':')
  );

  const hasDateFilters = Boolean(fromDate && toDate);
  const canApply = hasDateFilters;

  const reportParams = React.useMemo<GetGradingGatePassReportParams>(() => {
    const from = appliedFromDate.trim();
    const to = appliedToDate.trim();
    if (!from || !to) return {};

    return { fromDate: from, toDate: to };
  }, [appliedFromDate, appliedToDate]);

  const { data, isLoading, isFetching, error, refetch, isError } =
    useGetGradingGatePassReport(reportParams);

  const filteredData = React.useMemo(() => data ?? [], [data]);

  const tableData = React.useMemo(
    () => expandGradingReportRows(filteredData),
    [filteredData]
  );

  const table = useReactTable({
    data: tableData,
    columns,
    defaultColumn: {
      size: DEFAULT_COLUMN_SIZE,
      minSize: DEFAULT_COLUMN_MIN_SIZE,
      maxSize: DEFAULT_COLUMN_MAX_SIZE,
    },
    state: {
      sorting,
      columnVisibility,
      columnOrder,
      columnFilters,
      grouping,
      globalFilter,
    },
    onSortingChange: setSorting,
    onColumnVisibilityChange: setColumnVisibility,
    onColumnOrderChange: setColumnOrder,
    onColumnFiltersChange: setColumnFilters,
    onGroupingChange: setGrouping,
    onGlobalFilterChange: setGlobalFilter,
    columnResizeMode,
    columnResizeDirection,
    globalFilterFn: globalGradingFilterFn,
    getCoreRowModel: gradingReportGetCoreRowModel,
    getFilteredRowModel: gradingReportGetFilteredRowModel,
    getFacetedRowModel: gradingReportGetFacetedRowModel,
    getFacetedUniqueValues: gradingReportGetFacetedUniqueValues,
    getSortedRowModel: gradingReportGetSortedRowModel,
    getGroupedRowModel: gradingReportGetGroupedRowModel,
    getExpandedRowModel: gradingReportGetExpandedRowModel,
    getRowId: (row) => `${row.gradingGatePass._id}_${row.incomingSubIndex}`,
  });

  const handleApply = () => {
    if (hasDateFilters) {
      const nextFromDate = toApiDate(fromDate);
      const nextToDate = toApiDate(toDate);
      if (!nextFromDate || !nextToDate) return;
      setAppliedFromDate(nextFromDate);
      setAppliedToDate(nextToDate);
    }
  };

  const handleResetFilters = () => {
    setFromDate('');
    setToDate('');
    setAppliedFromDate('');
    setAppliedToDate('');
  };

  const rows = table.getRowModel().rows;
  const isGroupedView = table.getState().grouping.length > 0;

  return (
    <>
      <main className="from-background via-muted/20 to-background mx-auto max-w-7xl bg-linear-to-b p-3 sm:p-4 lg:p-6">
        <div className="space-y-4">
          <Item
            variant="outline"
            size="sm"
            className="border-border/30 bg-background rounded-2xl border p-3 shadow-sm"
          >
            <div className="flex w-full flex-wrap items-end gap-3 lg:flex-nowrap">
              <div className="flex items-end gap-2 self-end">
                <DatePicker
                  id="grading-report-from-date"
                  label="From"
                  compact
                  value={fromDate}
                  onChange={setFromDate}
                />
                <span className="text-muted-foreground mb-2 self-end text-sm">
                  →
                </span>
                <DatePicker
                  id="grading-report-to-date"
                  label="To"
                  compact
                  value={toDate}
                  onChange={setToDate}
                />
              </div>

              <div className="bg-border/40 hidden h-7 w-px lg:block" />

              <div className="flex items-center gap-2 self-end">
                <Button
                  type="button"
                  className="h-8 rounded-lg px-4 text-sm shadow-none"
                  disabled={!canApply}
                  onClick={handleApply}
                >
                  Apply
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="text-muted-foreground h-8 rounded-lg px-4 text-sm"
                  onClick={handleResetFilters}
                >
                  Reset
                </Button>
              </div>

              <div className="bg-border/40 hidden h-7 w-px lg:block" />

              <div className="ml-auto flex items-center gap-2 self-end">
                <div className="relative min-w-[160px] lg:w-[220px]">
                  <Search className="text-muted-foreground pointer-events-none absolute top-1/2 left-2.5 h-3.5 w-3.5 -translate-y-1/2" />
                  <Input
                    value={typeof globalFilter === 'string' ? globalFilter : ''}
                    onChange={(e) => setGlobalFilter(e.target.value)}
                    placeholder="Search manual gate pass…"
                    className="h-8 pl-8 text-sm"
                  />
                </div>
                <Button
                  type="button"
                  variant="outline"
                  className="border-primary text-primary hover:bg-primary/5 h-8 rounded-lg px-4 text-sm leading-none"
                  onClick={() => setIsViewFiltersOpen(true)}
                >
                  <SlidersHorizontal className="h-3.5 w-3.5" />
                  View Filters
                </Button>
                <GradingExcelButton
                  table={table}
                  coldStorageName={coldStorageName}
                />
                <Button
                  type="button"
                  variant="ghost"
                  className="text-muted-foreground h-8 rounded-lg px-2 leading-none"
                  disabled={isFetching}
                  aria-label="Refresh"
                  onClick={() => {
                    void refetch();
                  }}
                >
                  <RefreshCw
                    className={cn('h-3.5 w-3.5', isFetching && 'animate-spin')}
                  />
                </Button>
              </div>
            </div>
          </Item>

          <div className="w-full">
            {isError && (
              <p className="mb-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                {error instanceof Error
                  ? error.message
                  : 'Failed to load grading gate pass report'}
              </p>
            )}
            <div
              className="subtle-scrollbar border-primary/15 bg-card/95 ring-primary/5 relative overflow-x-auto overflow-y-auto rounded-2xl border shadow-[0_1px_2px_rgba(0,0,0,0.05),0_8px_24px_rgba(0,0,0,0.06)] ring-1"
              style={{
                direction: table.options.columnResizeDirection,
                height: '560px',
                position: 'relative',
              }}
            >
              {isLoading ? (
                <div className="space-y-4 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <Skeleton className="h-8 w-44 rounded-lg" />
                    <Skeleton className="h-8 w-24 rounded-lg" />
                  </div>
                  <div className="grid grid-cols-10 gap-2">
                    {Array.from({ length: TABLE_SKELETON_COLUMNS }).map(
                      (_, index) => (
                        <Skeleton
                          key={`grading-report-header-skeleton-${index}`}
                          className="h-8 w-full rounded-md"
                        />
                      )
                    )}
                  </div>
                  <div className="space-y-2">
                    {Array.from({ length: TABLE_SKELETON_ROWS }).map(
                      (_, rowIndex) => (
                        <div
                          key={`grading-report-row-skeleton-${rowIndex}`}
                          className="grid grid-cols-10 gap-2"
                        >
                          {Array.from({ length: TABLE_SKELETON_COLUMNS }).map(
                            (_, columnIndex) => (
                              <Skeleton
                                key={`grading-report-cell-skeleton-${rowIndex}-${columnIndex}`}
                                className="h-7 w-full rounded-md"
                              />
                            )
                          )}
                        </div>
                      )
                    )}
                  </div>
                </div>
              ) : rows.length === 0 ? (
                <div className="text-muted-foreground flex h-24 items-center justify-center">
                  No records found.
                </div>
              ) : (
                <table
                  key={bagWeightsRevision}
                  className="font-custom w-max min-w-full text-sm"
                >
                  <TableHeader className="bg-secondary border-border/60 text-secondary-foreground sticky top-0 z-10 border-b backdrop-blur-sm">
                    {table.getHeaderGroups().map((headerGroup) => (
                      <TableRow
                        key={headerGroup.id}
                        className="hover:bg-transparent"
                      >
                        {headerGroup.headers.map((header) => {
                          if (header.isPlaceholder) return null;

                          const canSort = header.column.getCanSort();
                          const isRightAligned =
                            gradingRightAlignedColumnIds.has(header.column.id);

                          return (
                            <TableHead
                              key={header.id}
                              colSpan={header.colSpan}
                              className={cn(
                                'font-custom border-border/50 text-foreground/75 h-10 border-r px-3 py-2.5 text-[11px] font-semibold tracking-[0.08em] uppercase select-none last:border-r-0',
                                isGradingReportGradingSectionStartColumn(
                                  header.column
                                ) && GRADING_SECTION_START_BORDER_CLASSES
                              )}
                            >
                              {canSort ? (
                                <div
                                  role="button"
                                  tabIndex={0}
                                  className={cn(
                                    'group focus-visible:ring-primary flex w-full min-w-0 cursor-pointer items-center gap-1 rounded transition-colors outline-none focus-visible:ring-2 focus-visible:ring-offset-2',
                                    isRightAligned
                                      ? 'justify-end'
                                      : 'justify-between'
                                  )}
                                  onClick={header.column.getToggleSortingHandler()}
                                  onKeyDown={(event) => {
                                    if (
                                      event.key !== 'Enter' &&
                                      event.key !== ' '
                                    ) {
                                      return;
                                    }
                                    event.preventDefault();
                                    header.column.getToggleSortingHandler()?.(
                                      event
                                    );
                                  }}
                                >
                                  <span className="truncate">
                                    {flexRender(
                                      header.column.columnDef.header,
                                      header.getContext()
                                    )}
                                  </span>
                                  <span
                                    className={isRightAligned ? 'ml-2' : ''}
                                  >
                                    {{
                                      asc: (
                                        <ArrowUp className="ml-1 h-3.5 w-3.5 shrink-0" />
                                      ),
                                      desc: (
                                        <ArrowDown className="ml-1 h-3.5 w-3.5 shrink-0" />
                                      ),
                                    }[
                                      header.column.getIsSorted() as string
                                    ] ?? (
                                      <ArrowUpDown className="text-muted-foreground ml-1 h-3.5 w-3.5 shrink-0 opacity-0 transition-opacity group-hover:opacity-100" />
                                    )}
                                  </span>
                                </div>
                              ) : (
                                <div
                                  className={cn(
                                    'flex w-full min-w-0 items-center gap-1',
                                    isRightAligned && 'justify-end'
                                  )}
                                >
                                  {flexRender(
                                    header.column.columnDef.header,
                                    header.getContext()
                                  )}
                                </div>
                              )}
                            </TableHead>
                          );
                        })}
                      </TableRow>
                    ))}
                  </TableHeader>
                  <TableBody>
                    {rows.map((row) => {
                      if (isGroupedView) {
                        return (
                          <TableRow
                            key={row.id}
                            className={cn(
                              'border-border/50 hover:bg-accent/40 border-b transition-colors',
                              row.index % 2 === 0
                                ? 'bg-background'
                                : 'bg-muted/25'
                            )}
                          >
                            {row.getVisibleCells().map((cell) => {
                              const isRightAligned =
                                gradingRightAlignedColumnIds.has(
                                  cell.column.id
                                );
                              const isGroupedCell = cell.getIsGrouped();
                              const isAggregatedCell = cell.getIsAggregated();
                              const isPlaceholderCell = cell.getIsPlaceholder();

                              return (
                                <TableCell
                                  key={cell.id}
                                  className={cn(
                                    'font-custom border-border/40 text-foreground/85 border-r px-3 py-2.5 align-middle whitespace-nowrap',
                                    isGradingReportGradingSectionStartColumn(
                                      cell.column
                                    ) && GRADING_SECTION_START_BORDER_CLASSES,
                                    isRightAligned && 'text-right'
                                  )}
                                >
                                  {isGroupedCell ? (
                                    <button
                                      type="button"
                                      onClick={row.getToggleExpandedHandler()}
                                      className={cn(
                                        'font-custom focus-visible:ring-primary inline-flex items-center gap-1 rounded text-left transition-colors outline-none focus-visible:ring-2 focus-visible:ring-offset-2',
                                        row.getCanExpand()
                                          ? 'hover:text-primary cursor-pointer'
                                          : 'cursor-default'
                                      )}
                                    >
                                      <span className="text-xs">
                                        {row.getIsExpanded() ? '▼' : '▶'}
                                      </span>
                                      {flexRender(
                                        cell.column.columnDef.cell,
                                        cell.getContext()
                                      )}
                                      <span className="text-muted-foreground text-xs">
                                        ({row.subRows.length})
                                      </span>
                                    </button>
                                  ) : isAggregatedCell ? (
                                    shouldSuppressGradingAggregatedCell(
                                      cell.column.id
                                    ) ? (
                                      <span className="text-muted-foreground/50 font-custom">
                                        -
                                      </span>
                                    ) : (
                                      flexRender(
                                        cell.column.columnDef.aggregatedCell ??
                                          cell.column.columnDef.cell,
                                        cell.getContext()
                                      )
                                    )
                                  ) : isPlaceholderCell ? null : (
                                    flexRender(
                                      cell.column.columnDef.cell,
                                      cell.getContext()
                                    )
                                  )}
                                </TableCell>
                              );
                            })}
                          </TableRow>
                        );
                      }

                      const expanded = row.original;
                      const cellsToRender = row
                        .getVisibleCells()
                        .filter((cell) => {
                          if (isGradingSplitSpanColumn(cell.column))
                            return true;
                          return expanded.isFirstOfMergedBlock;
                        });

                      return (
                        <TableRow
                          key={row.id}
                          className={cn(
                            'border-border/50 hover:bg-accent/40 border-b transition-colors',
                            expanded.parentRowIndex % 2 === 0
                              ? 'bg-background'
                              : 'bg-muted/25'
                          )}
                        >
                          {cellsToRender.map((cell, cellIndexInRow) => {
                            const isRightAligned =
                              gradingRightAlignedColumnIds.has(cell.column.id);
                            const rowSpan = gradingMergedTdRowSpan(
                              expanded,
                              cell.column
                            );

                            const isLastBodyCellInWideRow =
                              expanded.isFirstOfMergedBlock &&
                              cellIndexInRow === cellsToRender.length - 1;

                            return (
                              <TableCell
                                key={cell.id}
                                rowSpan={rowSpan}
                                className={cn(
                                  'font-custom border-border/40 text-foreground/85 border-r px-3 py-2.5 align-middle whitespace-nowrap',
                                  isGradingReportGradingSectionStartColumn(
                                    cell.column
                                  ) && GRADING_SECTION_START_BORDER_CLASSES,
                                  isLastBodyCellInWideRow && 'border-r-0',
                                  isRightAligned && 'text-right'
                                )}
                              >
                                {flexRender(
                                  cell.column.columnDef.cell,
                                  cell.getContext()
                                )}
                              </TableCell>
                            );
                          })}
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </table>
              )}
            </div>
          </div>
        </div>
      </main>
      <ViewFiltersSheet
        open={isViewFiltersOpen}
        onOpenChange={setIsViewFiltersOpen}
        table={table}
        defaultColumnOrder={defaultGradingColumnOrder}
        defaultColumnVisibility={defaultGradingReportColumnVisibility}
        columnResizeMode={columnResizeMode}
        columnResizeDirection={columnResizeDirection}
        onColumnResizeModeChange={setColumnResizeMode}
        onColumnResizeDirectionChange={setColumnResizeDirection}
      />
    </>
  );
};

export default GradingReportTable;
