/* eslint-disable react-refresh/only-export-components */
import * as React from 'react';
import {
  createColumnHelper,
  type Column,
  type FilterFn,
  type VisibilityState,
} from '@tanstack/react-table';
import {
  calculateIncomingMetrics,
  calculateGradingMetrics,
  formatNumber,
  getBagWeightsFromStore,
} from '@/components/daybook/grading-calculations';
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
import {
  evaluateGradingFilterGroup,
  isGradingAdvancedFilterGroup,
  type GradingFilterGroupNode,
} from './view-filters-sheet/advanced-filters';

/** One bag-size bucket after aggregating order details (shared by table cells + accessors). */
export interface GradingBagSizeAggregateCell {
  totalQuantity: number;
  lines: Array<{
    bagType: string;
    weightPerBagKg: number;
    initialQuantity: number;
  }>;
}

/** Row shape for the grading analytics table. */
export type GradingReportTableRow = {
  gradingGatePass: GradingGatePass;
  incomingDisplay: string;
  incomingRef?: GradingGatePassIncomingRef;
  mergedRowSpan: number;
  isFirstOfMergedBlock: boolean;
  incomingSubIndex: number;
  parentRowIndex: number;
  bagSizeAggregate: Map<CanonBagSize, GradingBagSizeAggregateCell>;
};

/** Unicode hyphen/dash/minus variants -> ASCII `-` so `30-40` resolves correctly. */
const UNICODE_DASH_CHARS = /[\u2010-\u2015\u2212\uFE58\uFE63\uFF0D]/g;

export const DEFAULT_COLUMN_SIZE = 170;
export const DEFAULT_COLUMN_MIN_SIZE = 120;
export const DEFAULT_COLUMN_MAX_SIZE = 550;

/** Primary vertical rule between nested incoming refs and grading gate pass fields. */
export const GRADING_SECTION_START_BORDER_CLASSES =
  'border-l-[3px] border-l-primary' as const;

export const gradingRightAlignedColumnIds = new Set<string>([
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

export const gradingNumericColumnIds = new Set<string>([
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

export function isGradingSplitSpanColumn(
  column: Column<GradingReportTableRow, unknown>
): boolean {
  return column.columnDef.meta?.gradingReportRowSpan === 'split';
}

export function isGradingReportGradingSectionStartColumn(
  column: Column<GradingReportTableRow, unknown>
): boolean {
  return Boolean(column.columnDef.meta?.gradingReportGradingSectionStart);
}

/**
 * tbody `rowSpan` is authored manually (TanStack does not compute rowspan for body cells).
 * Body spanning is driven by `columnDef.meta.gradingReportRowSpan` on each column.
 */
export function gradingMergedTdRowSpan(
  expanded: GradingReportTableRow,
  column: Column<GradingReportTableRow, unknown>
): number | undefined {
  if (isGradingSplitSpanColumn(column)) return undefined;
  if (!expanded.isFirstOfMergedBlock) return undefined;
  if (expanded.mergedRowSpan <= 1) return undefined;
  return expanded.mergedRowSpan;
}

export function formatIndianNumber(value: number, precision = 0): string {
  return value.toLocaleString('en-IN', {
    minimumFractionDigits: precision,
    maximumFractionDigits: precision,
  });
}

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
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
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
    const totalQuantity = lines.reduce(
      (sum, line) => sum + line.initialQuantity,
      0
    );
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
  return orderDetails.reduce(
    (sum, detail) => sum + (Number(detail.initialQuantity) || 0),
    0
  );
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

export function toDisplayDate(value?: string): string {
  if (!value) return '-';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return '-';
  return parsed.toLocaleDateString('en-GB');
}

function formatCreatedBy(gp: GradingGatePass): string {
  if (gp.createdBy && typeof gp.createdBy !== 'string')
    return gp.createdBy.name;
  if (typeof gp.createdBy === 'string') return gp.createdBy;
  return '-';
}

function incomingRefDisplayLabel(ref: GradingGatePassIncomingRef): string {
  return ref.manualGatePassNumber != null
    ? String(ref.manualGatePassNumber)
    : String(ref.gatePassNo);
}

function incomingRefFarmerStorageLink(
  ref: GradingGatePassIncomingRef | undefined
):
  | GradingGatePassIncomingRefLink
  | GradingGatePassFarmerStorageLink
  | GradingGatePassIncomingReportFarmerStorageLink
  | undefined {
  const value = ref?.farmerStorageLinkId;
  if (!value || typeof value !== 'object') return undefined;
  return value;
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
  const value = ref?.weightSlip?.[key];
  if (typeof value !== 'number' || !Number.isFinite(value)) return '-';
  return formatIndianNumber(value, 0);
}

function formatIncomingNetKg(
  ref: GradingGatePassIncomingRef | undefined
): string {
  const gross = ref?.weightSlip?.grossWeightKg;
  const tare = ref?.weightSlip?.tareWeightKg;
  if (typeof gross !== 'number' || typeof tare !== 'number') return '-';
  const net = gross - tare;
  if (!Number.isFinite(net)) return '-';
  return formatIndianNumber(net, 0);
}

function formatIncomingBardanaWeightKg(
  ref: GradingGatePassIncomingRef | undefined
): string {
  if (!ref) return '-';
  const bagWeights = getBagWeightsFromStore();
  const incoming = calculateIncomingMetrics([ref], bagWeights);
  const value = incoming.rows[0]?.bardanaKg;
  if (typeof value !== 'number' || !Number.isFinite(value)) return '-';
  return formatNumber(value);
}

function formatIncomingNetWeightWithoutBardana(
  ref: GradingGatePassIncomingRef | undefined
): string {
  if (!ref) return '-';
  const bagWeights = getBagWeightsFromStore();
  const incoming = calculateIncomingMetrics([ref], bagWeights);
  const netProductKg = incoming.rows[0]?.netProductKg;
  if (typeof netProductKg !== 'number' || !Number.isFinite(netProductKg)) {
    return '-';
  }
  return formatNumber(netProductKg);
}

function getGradingTotalsForGatePass(gp: GradingGatePass) {
  const bagWeights = getBagWeightsFromStore();
  const incoming = calculateIncomingMetrics(
    gp.incomingGatePassIds ?? [],
    bagWeights
  );
  return calculateGradingMetrics(
    gp.orderDetails ?? [],
    incoming.totals.totalNetProductKg,
    bagWeights
  ).totals;
}

function formatGradingBardanaWeightKg(gp: GradingGatePass): string {
  const value = getGradingTotalsForGatePass(gp).totalDeductionKg;
  if (!Number.isFinite(value)) return '-';
  return formatNumber(value);
}

function formatNetWeightAfterGradingWithoutBardana(
  gp: GradingGatePass
): string {
  const value = getGradingTotalsForGatePass(gp).totalNetKg;
  if (!Number.isFinite(value)) return '-';
  return formatNumber(value);
}

function formatWastagePercentFromGatePass(gp: GradingGatePass): string {
  const value = getGradingTotalsForGatePass(gp).wastagePct;
  if (!Number.isFinite(value)) return '-';
  return `${formatNumber(value)}%`;
}

export function expandGradingReportRows(
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
      const value = ref?.gatePassNo;
      return value != null && Number.isFinite(value) ? value : undefined;
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
      const value = ref?.bagsReceived;
      return value != null && Number.isFinite(value) ? value : undefined;
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
      const value = gp.gatePassNo;
      return value != null && Number.isFinite(Number(value))
        ? Number(value)
        : undefined;
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

export function getGradingNumericValue(
  row: GradingReportTableRow,
  columnId: string
): number | null {
  if (columnId.startsWith('bagSize__')) {
    const canon = GRADING_BAG_SIZE_COLUMN_ID_TO_CANON.get(columnId);
    if (!canon) return null;
    return row.bagSizeAggregate.get(canon)?.totalQuantity ?? 0;
  }

  const ref = row.incomingRef;
  const gp = row.gradingGatePass;

  switch (columnId) {
    case 'incomingSystemGatePassNo': {
      const value = ref?.gatePassNo;
      return typeof value === 'number' && Number.isFinite(value) ? value : null;
    }
    case 'incomingFarmerStorageAccountNo': {
      const link = incomingRefFarmerStorageLink(ref);
      const value = link?.accountNumber;
      return typeof value === 'number' && Number.isFinite(value) ? value : null;
    }
    case 'incomingBagsReceived': {
      const value = ref?.bagsReceived;
      return typeof value === 'number' && Number.isFinite(value) ? value : null;
    }
    case 'incomingGrossKg': {
      const value = ref?.weightSlip?.grossWeightKg;
      return typeof value === 'number' && Number.isFinite(value) ? value : null;
    }
    case 'incomingTareKg': {
      const value = ref?.weightSlip?.tareWeightKg;
      return typeof value === 'number' && Number.isFinite(value) ? value : null;
    }
    case 'incomingNetKg': {
      const gross = ref?.weightSlip?.grossWeightKg;
      const tare = ref?.weightSlip?.tareWeightKg;
      if (typeof gross !== 'number' || typeof tare !== 'number') return null;
      const net = gross - tare;
      return Number.isFinite(net) ? net : null;
    }
    case 'incomingBardanaWeightKg': {
      if (!ref) return null;
      const incoming = calculateIncomingMetrics(
        [ref],
        getBagWeightsFromStore()
      );
      const value = incoming.rows[0]?.bardanaKg;
      return typeof value === 'number' && Number.isFinite(value) ? value : null;
    }
    case 'incomingNetWeightWithoutBardana': {
      if (!ref) return null;
      const incoming = calculateIncomingMetrics(
        [ref],
        getBagWeightsFromStore()
      );
      const value = incoming.rows[0]?.netProductKg;
      return typeof value === 'number' && Number.isFinite(value) ? value : null;
    }
    case 'gradedBags':
      return sumInitialBags(gp.orderDetails);
    case 'gradingBardanaWeightKg': {
      const value = getGradingTotalsForGatePass(gp).totalDeductionKg;
      return Number.isFinite(value) ? value : null;
    }
    case 'netWeightAfterGradingWithoutBardana': {
      const value = getGradingTotalsForGatePass(gp).totalNetKg;
      return Number.isFinite(value) ? value : null;
    }
    case 'wastagePercent': {
      const value = getGradingTotalsForGatePass(gp).wastagePct;
      return Number.isFinite(value) ? value : null;
    }
    default:
      return null;
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

export type GlobalFilterValue = string | GradingFilterGroupNode;

export const globalGradingFilterFn: FilterFn<GradingReportTableRow> = (
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

export const defaultGradingReportColumnVisibility: VisibilityState = {
  incomingSlipNumber: false,
  incomingGrossKg: false,
  incomingTareKg: false,
  createdBy: false,
  gatePassNo: false,
};

export function shouldSuppressGradingAggregatedCell(columnId: string) {
  if (columnId === 'gradedBags' || columnId === 'incomingBagsReceived') {
    return false;
  }
  return true;
}

const columnHelper = createColumnHelper<GradingReportTableRow>();

const bagSizeColumns = GRADING_BAG_SIZE_COLUMN_ORDER.map((sizeLabel) => {
  const id = getGradingBagSizeColumnId(sizeLabel);
  return columnHelper.accessor(
    (row) => row.bagSizeAggregate.get(sizeLabel)?.totalQuantity ?? 0,
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
      filterFn: multiValueFilterFn,
      cell: ({ row }) => (
        <GradedBagSizeCell
          cell={row.original.bagSizeAggregate.get(sizeLabel)}
        />
      ),
    }
  );
});

export const gradingReportColumns = [
  columnHelper.accessor(
    (row) => getGradingColumnFilterValue(row, 'incomingGatePassIds'),
    {
      id: 'incomingGatePassIds',
      meta: { gradingReportRowSpan: 'split' },
      header: 'Incoming Manual Gate Pass No',
      filterFn: multiValueFilterFn,
      cell: ({ row }) => (
        <span className="font-custom">{row.original.incomingDisplay}</span>
      ),
    }
  ),
  columnHelper.accessor(
    (row) => getGradingColumnFilterValue(row, 'incomingSystemGatePassNo'),
    {
      id: 'incomingSystemGatePassNo',
      meta: { gradingReportRowSpan: 'split' },
      header: 'Incoming System Generated Gate Pass Number',
      filterFn: multiValueFilterFn,
      cell: ({ row }) => {
        const value = row.original.incomingRef?.gatePassNo;
        return (
          <span className="font-custom">
            {value != null ? formatIndianNumber(value, 0) : '-'}
          </span>
        );
      },
    }
  ),
  columnHelper.accessor(
    (row) => getGradingColumnFilterValue(row, 'incomingFarmerName'),
    {
      id: 'incomingFarmerName',
      meta: { gradingReportRowSpan: 'split' },
      header: 'Farmer',
      filterFn: multiValueFilterFn,
      cell: ({ row }) => (
        <span
          className="font-custom block max-w-56 truncate"
          title={incomingRefFarmerName(row.original.incomingRef)}
        >
          {incomingRefFarmerName(row.original.incomingRef)}
        </span>
      ),
    }
  ),
  columnHelper.accessor(
    (row) => getGradingColumnFilterValue(row, 'incomingFarmerAddress'),
    {
      id: 'incomingFarmerAddress',
      meta: { gradingReportRowSpan: 'split' },
      header: 'Farmer address',
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
    (row) => getGradingColumnFilterValue(row, 'incomingFarmerStorageAccountNo'),
    {
      id: 'incomingFarmerStorageAccountNo',
      meta: { gradingReportRowSpan: 'split' },
      header: 'Account No',
      filterFn: multiValueFilterFn,
      cell: ({ row }) => (
        <span className="font-custom">
          {incomingFarmerAccountNumber(row.original.incomingRef)}
        </span>
      ),
    }
  ),
  columnHelper.accessor(
    (row) => getGradingColumnFilterValue(row, 'incomingDate'),
    {
      id: 'incomingDate',
      meta: { gradingReportRowSpan: 'split' },
      header: 'Incoming date',
      filterFn: multiValueFilterFn,
      cell: ({ row }) => (
        <span className="font-custom">
          {toDisplayDate(row.original.incomingRef?.date)}
        </span>
      ),
    }
  ),
  columnHelper.accessor(
    (row) => getGradingColumnFilterValue(row, 'incomingLocation'),
    {
      id: 'incomingLocation',
      meta: { gradingReportRowSpan: 'split' },
      header: 'Location',
      filterFn: multiValueFilterFn,
      cell: ({ row }) => (
        <span
          className="font-custom block max-w-48 truncate"
          title={row.original.incomingRef?.location ?? undefined}
        >
          {row.original.incomingRef?.location?.trim() || '-'}
        </span>
      ),
    }
  ),
  columnHelper.accessor(
    (row) => getGradingColumnFilterValue(row, 'incomingTruckNumber'),
    {
      id: 'incomingTruckNumber',
      meta: { gradingReportRowSpan: 'split' },
      header: 'Truck No.',
      filterFn: multiValueFilterFn,
      cell: ({ row }) => (
        <span className="font-custom">
          {row.original.incomingRef?.truckNumber?.trim() || '-'}
        </span>
      ),
    }
  ),
  columnHelper.accessor(
    (row) => getGradingColumnFilterValue(row, 'incomingBagsReceived'),
    {
      id: 'incomingBagsReceived',
      meta: { gradingReportRowSpan: 'split' },
      header: 'Bags received',
      filterFn: multiValueFilterFn,
      cell: ({ row }) => {
        const value = row.original.incomingRef?.bagsReceived;
        return (
          <span className="font-custom font-medium tabular-nums">
            {value != null && Number.isFinite(value)
              ? formatIndianNumber(value, 0)
              : '-'}
          </span>
        );
      },
    }
  ),
  columnHelper.accessor(
    (row) => getGradingColumnFilterValue(row, 'incomingSlipNumber'),
    {
      id: 'incomingSlipNumber',
      meta: { gradingReportRowSpan: 'split' },
      header: 'Slip No.',
      filterFn: multiValueFilterFn,
      cell: ({ row }) => (
        <span className="font-custom">
          {row.original.incomingRef?.weightSlip?.slipNumber?.trim() || '-'}
        </span>
      ),
    }
  ),
  columnHelper.accessor(
    (row) => getGradingColumnFilterValue(row, 'incomingGrossKg'),
    {
      id: 'incomingGrossKg',
      meta: { gradingReportRowSpan: 'split' },
      header: 'Gross (kg)',
      filterFn: multiValueFilterFn,
      cell: ({ row }) => (
        <span className="font-custom">
          {formatIncomingWeightKg(row.original.incomingRef, 'grossWeightKg')}
        </span>
      ),
    }
  ),
  columnHelper.accessor(
    (row) => getGradingColumnFilterValue(row, 'incomingTareKg'),
    {
      id: 'incomingTareKg',
      meta: { gradingReportRowSpan: 'split' },
      header: 'Tare (kg)',
      filterFn: multiValueFilterFn,
      cell: ({ row }) => (
        <span className="font-custom">
          {formatIncomingWeightKg(row.original.incomingRef, 'tareWeightKg')}
        </span>
      ),
    }
  ),
  columnHelper.accessor(
    (row) => getGradingColumnFilterValue(row, 'incomingNetKg'),
    {
      id: 'incomingNetKg',
      meta: { gradingReportRowSpan: 'split' },
      header: 'Net (kg)',
      filterFn: multiValueFilterFn,
      cell: ({ row }) => (
        <span className="font-custom">
          {formatIncomingNetKg(row.original.incomingRef)}
        </span>
      ),
    }
  ),
  columnHelper.accessor(
    (row) => getGradingColumnFilterValue(row, 'incomingBardanaWeightKg'),
    {
      id: 'incomingBardanaWeightKg',
      meta: { gradingReportRowSpan: 'split' },
      header: 'Incoming bardana weight',
      filterFn: multiValueFilterFn,
      cell: ({ row }) => (
        <span className="font-custom font-medium tabular-nums">
          {formatIncomingBardanaWeightKg(row.original.incomingRef)}
        </span>
      ),
    }
  ),
  columnHelper.accessor(
    (row) =>
      getGradingColumnFilterValue(row, 'incomingNetWeightWithoutBardana'),
    {
      id: 'incomingNetWeightWithoutBardana',
      meta: { gradingReportRowSpan: 'split' },
      header: 'Incoming Net Weight (w/o Bardana)',
      filterFn: multiValueFilterFn,
      cell: ({ row }) => (
        <span className="font-custom font-medium tabular-nums">
          {formatIncomingNetWeightWithoutBardana(row.original.incomingRef)}
        </span>
      ),
    }
  ),
  columnHelper.accessor(
    (row) => getGradingColumnFilterValue(row, 'incomingStatus'),
    {
      id: 'incomingStatus',
      meta: { gradingReportRowSpan: 'split' },
      header: 'Incoming status',
      filterFn: multiValueFilterFn,
      cell: ({ row }) => (
        <span className="font-custom">
          {row.original.incomingRef?.status?.trim() || '-'}
        </span>
      ),
    }
  ),
  columnHelper.accessor(
    (row) => getGradingColumnFilterValue(row, 'incomingRemarks'),
    {
      id: 'incomingRemarks',
      meta: { gradingReportRowSpan: 'split' },
      header: 'Incoming remarks',
      filterFn: multiValueFilterFn,
      cell: ({ row }) => (
        <span
          className="font-custom block max-w-56 truncate"
          title={row.original.incomingRef?.remarks ?? undefined}
        >
          {row.original.incomingRef?.remarks?.trim() || '-'}
        </span>
      ),
    }
  ),
  columnHelper.accessor(
    (row) => getGradingColumnFilterValue(row, 'createdBy'),
    {
      id: 'createdBy',
      meta: {
        gradingReportRowSpan: 'merge',
        gradingReportGradingSectionStart: true,
      },
      header: 'Created By',
      filterFn: multiValueFilterFn,
      cell: ({ row }) => (
        <span className="font-custom">
          {formatCreatedBy(row.original.gradingGatePass)}
        </span>
      ),
    }
  ),
  columnHelper.accessor(
    (row) => getGradingColumnFilterValue(row, 'gatePassNo'),
    {
      id: 'gatePassNo',
      meta: { gradingReportRowSpan: 'merge' },
      header: 'System Generated Gate Pass No',
      sortingFn: 'alphanumeric',
      filterFn: multiValueFilterFn,
      cell: (info) => {
        const value = info.getValue();
        return (
          <span className="font-custom font-medium">
            {value != null && value !== '' && Number.isFinite(Number(value))
              ? formatIndianNumber(Number(value), 0)
              : '-'}
          </span>
        );
      },
    }
  ),
  columnHelper.accessor(
    (row) => getGradingColumnFilterValue(row, 'manualGatePassNumber'),
    {
      id: 'manualGatePassNumber',
      meta: { gradingReportRowSpan: 'merge' },
      header: 'Manual Gate Pass No',
      sortingFn: 'alphanumeric',
      filterFn: multiValueFilterFn,
      cell: (info) => {
        const value = info.getValue();
        return value != null && String(value).length > 0 ? (
          <span className="font-custom">{String(value)}</span>
        ) : (
          <span className="text-muted-foreground/50 font-custom">-</span>
        );
      },
    }
  ),
  columnHelper.accessor((row) => getGradingColumnFilterValue(row, 'date'), {
    id: 'date',
    meta: { gradingReportRowSpan: 'merge' },
    header: 'Date',
    sortingFn: 'alphanumeric',
    filterFn: multiValueFilterFn,
    cell: (info) => (
      <span className="font-custom">{String(info.getValue() ?? '-')}</span>
    ),
  }),
  columnHelper.accessor((row) => getGradingColumnFilterValue(row, 'variety'), {
    id: 'variety',
    meta: { gradingReportRowSpan: 'merge' },
    header: 'Variety',
    sortingFn: 'text',
    filterFn: multiValueFilterFn,
    cell: (info) => (
      <span className="font-custom">{String(info.getValue())}</span>
    ),
  }),
  columnHelper.accessor(
    (row) => getGradingColumnFilterValue(row, 'gradedBags'),
    {
      id: 'gradedBags',
      meta: { gradingReportRowSpan: 'merge' },
      header: () => (
        <div className="font-custom w-full text-right">Graded bags</div>
      ),
      filterFn: multiValueFilterFn,
      cell: ({ row }) => (
        <div className="w-full text-right font-medium tabular-nums">
          {formatIndianNumber(
            sumInitialBags(row.original.gradingGatePass.orderDetails),
            0
          )}
        </div>
      ),
    }
  ),
  ...bagSizeColumns,
  columnHelper.accessor(
    (row) => getGradingColumnFilterValue(row, 'gradingBardanaWeightKg'),
    {
      id: 'gradingBardanaWeightKg',
      meta: { gradingReportRowSpan: 'merge' },
      header: () => (
        <div className="font-custom w-full text-right">
          Grading bardana weight
        </div>
      ),
      filterFn: multiValueFilterFn,
      cell: ({ row }) => (
        <span className="font-custom font-medium tabular-nums">
          {formatGradingBardanaWeightKg(row.original.gradingGatePass)}
        </span>
      ),
    }
  ),
  columnHelper.accessor(
    (row) =>
      getGradingColumnFilterValue(row, 'netWeightAfterGradingWithoutBardana'),
    {
      id: 'netWeightAfterGradingWithoutBardana',
      meta: { gradingReportRowSpan: 'merge' },
      header: () => (
        <div className="font-custom w-full text-right">
          Net Weight After Grading (w/o Bardana)
        </div>
      ),
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
    (row) => getGradingColumnFilterValue(row, 'wastagePercent'),
    {
      id: 'wastagePercent',
      meta: { gradingReportRowSpan: 'merge' },
      header: () => (
        <div className="font-custom w-full text-right">Wastage (%)</div>
      ),
      filterFn: multiValueFilterFn,
      cell: ({ row }) => (
        <span className="font-custom font-medium tabular-nums">
          {formatWastagePercentFromGatePass(row.original.gradingGatePass)}
        </span>
      ),
    }
  ),
  columnHelper.accessor((row) => getGradingColumnFilterValue(row, 'grader'), {
    id: 'grader',
    meta: { gradingReportRowSpan: 'merge' },
    header: 'Grader',
    sortingFn: 'text',
    filterFn: multiValueFilterFn,
    cell: (info) => (
      <span className="font-custom">{String(info.getValue() ?? '-')}</span>
    ),
  }),
  columnHelper.accessor((row) => getGradingColumnFilterValue(row, 'remarks'), {
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

export { defaultGradingColumnOrder };
