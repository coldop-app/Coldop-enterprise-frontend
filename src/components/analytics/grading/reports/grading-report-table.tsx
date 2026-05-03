import * as React from 'react';
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  type Column,
  type SortingState,
  useReactTable,
} from '@tanstack/react-table';
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  RefreshCw,
  Search,
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
  useGetGradingGatePassReport,
  type GetGradingGatePassReportParams,
} from '@/services/store-admin/grading-gate-pass/analytics/useGetGradingGatePassReport';
import type {
  GradingGatePass,
  GradingGatePassFarmerStorageLink,
  GradingGatePassIncomingRef,
  GradingGatePassIncomingRefLink,
  GradingGatePassIncomingReportFarmerStorageLink,
  GradingGatePassOrderDetail,
} from '@/types/grading-gate-pass';

type GradingReportTableRow = {
  gradingGatePass: GradingGatePass;
  /** One incoming gate pass number per displayed row when a pass has multiple links */
  incomingDisplay: string;
  /** Populated nested incoming record for this sub-row (`undefined` when no incoming linked) */
  incomingRef?: GradingGatePassIncomingRef;
  mergedRowSpan: number;
  isFirstOfMergedBlock: boolean;
  incomingSubIndex: number;
  /** Parent index before row expansion — used for zebra striping */
  parentRowIndex: number;
};

/** Column order for bag-size breakdown (must match API `orderDetails[].size` labels). */
const GRADING_BAG_SIZE_COLUMN_ORDER = [
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

type CanonBagSize = (typeof GRADING_BAG_SIZE_COLUMN_ORDER)[number];

/** Bag-size column IDs must match {@link GRADING_BAG_SIZE_COLUMN_ORDER}. */
function getGradingBagSizeColumnId(sizeLabel: CanonBagSize): string {
  return `bagSize__${sizeLabel.replace(/[^a-zA-Z0-9]+/g, '_')}`;
}

function gradingBagSizeColumnHeaderText(sizeLabel: CanonBagSize): string {
  if (sizeLabel === 'Cut') return sizeLabel;
  return `${sizeLabel} (mm)`;
}

const gradingRightAlignedColumnIds = new Set<string>([
  'gradedBags',
  'incomingSystemGatePassNo',
  'incomingFarmerStorageAccountNo',
  'incomingBagsReceived',
  'incomingGrossKg',
  'incomingTareKg',
  'incomingNetKg',
  'incomingNetWeightWithoutBardana',
  ...GRADING_BAG_SIZE_COLUMN_ORDER.map(getGradingBagSizeColumnId),
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

interface AggregatedBagSizeCell {
  totalQuantity: number;
  lines: BagSizeBreakdownLine[];
}

function bagSizeBreakdownLineKey(bagType: string, weightPerBagKg: number) {
  return `${normalizeBagSizeKey(bagType)}|${weightPerBagKg}`;
}

function aggregateOrderDetailsByCanonicalSize(
  orderDetails: GradingGatePassOrderDetail[] | undefined
): Map<CanonBagSize, AggregatedBagSizeCell> {
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

  const result = new Map<CanonBagSize, AggregatedBagSizeCell>();
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

function GradedBagSizeCell({
  cell,
}: {
  cell: AggregatedBagSizeCell | undefined;
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
}

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

function searchableChunksFromIncomingRef(
  ref: GradingGatePassIncomingRef | undefined
): string[] {
  if (!ref) return [];
  const link = incomingRefFarmerStorageLink(ref);
  const farmer = link?.farmerId;
  return [
    String(ref.gatePassNo ?? ''),
    ref.manualGatePassNumber != null ? String(ref.manualGatePassNumber) : '',
    incomingRefFarmerName(ref),
    farmer && typeof farmer !== 'string' ? (farmer.mobileNumber ?? '') : '',
    farmer && typeof farmer !== 'string' ? (farmer.address ?? '') : '',
    link?._id != null ? String(link._id) : '',
    typeof link?.accountNumber === 'number' ? String(link.accountNumber) : '',
    ref.location ?? '',
    ref.truckNumber ?? '',
    ref.bagsReceived != null ? String(ref.bagsReceived) : '',
    ref.weightSlip?.slipNumber ?? '',
    ref.weightSlip?.grossWeightKg != null
      ? String(ref.weightSlip.grossWeightKg)
      : '',
    ref.weightSlip?.tareWeightKg != null
      ? String(ref.weightSlip.tareWeightKg)
      : '',
    ref.status ?? '',
    ref.remarks ?? '',
    toDisplayDate(ref.date),
  ];
}

function formatIncomingGatePasses(gp: GradingGatePass): string {
  const refs = gp.incomingGatePassIds ?? [];
  if (!refs.length) return '-';
  return refs.map(incomingRefDisplayLabel).join(', ');
}

function expandGradingReportRows(
  gradingPasses: GradingGatePass[]
): GradingReportTableRow[] {
  const out: GradingReportTableRow[] = [];
  gradingPasses.forEach((gp, parentRowIndex) => {
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
    });
  });
  return out;
}

function gradingGatePassMatchesSearch(
  gp: GradingGatePass,
  query: string
): boolean {
  const n = query.trim().toLowerCase();
  if (!n) return true;
  const chunks = [
    String(gp.gatePassNo ?? ''),
    gp.manualGatePassNumber != null ? String(gp.manualGatePassNumber) : '',
    gp.farmerStorageLinkId ?? '',
    gp.variety ?? '',
    gp.grader ?? '',
    gp.remarks ?? '',
    formatIncomingGatePasses(gp),
    formatCreatedBy(gp),
    ...(gp.incomingGatePassIds ?? []).flatMap((ref) =>
      searchableChunksFromIncomingRef(ref)
    ),
  ];
  return chunks.some((s) => s.toLowerCase().includes(n));
}

const columnHelper = createColumnHelper<GradingReportTableRow>();

const bagSizeColumns = GRADING_BAG_SIZE_COLUMN_ORDER.map((sizeLabel) =>
  columnHelper.display({
    id: getGradingBagSizeColumnId(sizeLabel),
    meta: { gradingReportRowSpan: 'merge' },
    header: () => (
      <div className="font-custom w-full text-right">
        {gradingBagSizeColumnHeaderText(sizeLabel)}
      </div>
    ),
    minSize: 90,
    maxSize: 180,
    enableSorting: false,
    cell: ({ row }) => {
      const bySize = aggregateOrderDetailsByCanonicalSize(
        row.original.gradingGatePass.orderDetails
      );
      const cellData = bySize.get(sizeLabel);
      return <GradedBagSizeCell cell={cellData} />;
    },
  })
);

const columns = [
  columnHelper.display({
    id: 'incomingGatePassIds',
    meta: { gradingReportRowSpan: 'split' },
    header: 'Incoming Manual Gate Pass No',
    enableSorting: false,
    cell: ({ row }) => (
      <span className="font-custom">{row.original.incomingDisplay}</span>
    ),
  }),
  columnHelper.display({
    id: 'incomingSystemGatePassNo',
    meta: { gradingReportRowSpan: 'split' },
    header: 'Incoming System Generated Gate Pass Number',
    enableSorting: false,
    cell: ({ row }) => {
      const v = row.original.incomingRef?.gatePassNo;
      return (
        <span className="font-custom">
          {v != null ? formatIndianNumber(v, 0) : '-'}
        </span>
      );
    },
  }),
  columnHelper.display({
    id: 'incomingFarmerName',
    meta: { gradingReportRowSpan: 'split' },
    header: 'Farmer',
    enableSorting: false,
    cell: ({ row }) => (
      <span
        className="font-custom block max-w-[14rem] truncate"
        title={incomingRefFarmerName(row.original.incomingRef)}
      >
        {incomingRefFarmerName(row.original.incomingRef)}
      </span>
    ),
  }),
  columnHelper.display({
    id: 'incomingFarmerStorageAccountNo',
    meta: { gradingReportRowSpan: 'split' },
    header: 'Account No',
    enableSorting: false,
    cell: ({ row }) => (
      <span className="font-custom">
        {incomingFarmerAccountNumber(row.original.incomingRef)}
      </span>
    ),
  }),
  columnHelper.display({
    id: 'incomingDate',
    meta: { gradingReportRowSpan: 'split' },
    header: 'Incoming date',
    enableSorting: false,
    cell: ({ row }) => (
      <span className="font-custom">
        {toDisplayDate(row.original.incomingRef?.date)}
      </span>
    ),
  }),
  columnHelper.display({
    id: 'incomingLocation',
    meta: { gradingReportRowSpan: 'split' },
    header: 'Location',
    enableSorting: false,
    cell: ({ row }) => (
      <span
        className="font-custom block max-w-[12rem] truncate"
        title={row.original.incomingRef?.location ?? undefined}
      >
        {row.original.incomingRef?.location?.trim() || '-'}
      </span>
    ),
  }),
  columnHelper.display({
    id: 'incomingTruckNumber',
    meta: { gradingReportRowSpan: 'split' },
    header: 'Truck No.',
    enableSorting: false,
    cell: ({ row }) => (
      <span className="font-custom">
        {row.original.incomingRef?.truckNumber?.trim() || '-'}
      </span>
    ),
  }),
  columnHelper.display({
    id: 'incomingBagsReceived',
    meta: { gradingReportRowSpan: 'split' },
    header: 'Bags received',
    enableSorting: false,
    cell: ({ row }) => {
      const b = row.original.incomingRef?.bagsReceived;
      return (
        <span className="font-custom font-medium tabular-nums">
          {b != null && Number.isFinite(b) ? formatIndianNumber(b, 0) : '-'}
        </span>
      );
    },
  }),
  columnHelper.display({
    id: 'incomingSlipNumber',
    meta: { gradingReportRowSpan: 'split' },
    header: 'Slip No.',
    enableSorting: false,
    cell: ({ row }) => (
      <span className="font-custom">
        {row.original.incomingRef?.weightSlip?.slipNumber?.trim() || '-'}
      </span>
    ),
  }),
  columnHelper.display({
    id: 'incomingGrossKg',
    meta: { gradingReportRowSpan: 'split' },
    header: 'Gross (kg)',
    enableSorting: false,
    cell: ({ row }) => (
      <span className="font-custom">
        {formatIncomingWeightKg(row.original.incomingRef, 'grossWeightKg')}
      </span>
    ),
  }),
  columnHelper.display({
    id: 'incomingTareKg',
    meta: { gradingReportRowSpan: 'split' },
    header: 'Tare (kg)',
    enableSorting: false,
    cell: ({ row }) => (
      <span className="font-custom">
        {formatIncomingWeightKg(row.original.incomingRef, 'tareWeightKg')}
      </span>
    ),
  }),
  columnHelper.display({
    id: 'incomingNetKg',
    meta: { gradingReportRowSpan: 'split' },
    header: 'Net (kg)',
    enableSorting: false,
    cell: ({ row }) => (
      <span className="font-custom">
        {formatIncomingNetKg(row.original.incomingRef)}
      </span>
    ),
  }),
  columnHelper.display({
    id: 'incomingNetWeightWithoutBardana',
    meta: { gradingReportRowSpan: 'split' },
    header: 'Incoming Net Weight (w/o Bardana)',
    enableSorting: false,
    cell: () => <span className="font-custom">test</span>,
  }),
  columnHelper.display({
    id: 'incomingStatus',
    meta: { gradingReportRowSpan: 'split' },
    header: 'Incoming status',
    enableSorting: false,
    cell: ({ row }) => (
      <span className="font-custom">
        {row.original.incomingRef?.status?.trim() || '-'}
      </span>
    ),
  }),
  columnHelper.display({
    id: 'incomingRemarks',
    meta: { gradingReportRowSpan: 'split' },
    header: 'Incoming remarks',
    enableSorting: false,
    cell: ({ row }) => (
      <span
        className="font-custom block max-w-[14rem] truncate"
        title={row.original.incomingRef?.remarks ?? undefined}
      >
        {row.original.incomingRef?.remarks?.trim() || '-'}
      </span>
    ),
  }),
  columnHelper.display({
    id: 'createdBy',
    meta: {
      gradingReportRowSpan: 'merge',
      gradingReportGradingSectionStart: true,
    },
    header: 'Created By',
    enableSorting: false,
    cell: ({ row }) => (
      <span className="font-custom">
        {formatCreatedBy(row.original.gradingGatePass)}
      </span>
    ),
  }),
  columnHelper.accessor((r) => r.gradingGatePass.gatePassNo, {
    id: 'gatePassNo',
    meta: { gradingReportRowSpan: 'merge' },
    header: 'System Generated Gate Pass No',
    sortingFn: 'alphanumeric',
    cell: (info) => (
      <span className="font-custom font-medium">{info.getValue()}</span>
    ),
  }),
  columnHelper.accessor((r) => r.gradingGatePass.manualGatePassNumber, {
    id: 'manualGatePassNumber',
    meta: { gradingReportRowSpan: 'merge' },
    header: 'Manual Gate Pass No',
    sortingFn: 'alphanumeric',
    cell: (info) =>
      info.getValue() != null ? (
        <span className="font-custom">{String(info.getValue())}</span>
      ) : (
        <span className="text-muted-foreground/50 font-custom">-</span>
      ),
  }),
  columnHelper.accessor((r) => r.gradingGatePass.date, {
    id: 'date',
    meta: { gradingReportRowSpan: 'merge' },
    header: 'Date',
    sortingFn: 'alphanumeric',
    cell: (info) => (
      <span className="font-custom">{toDisplayDate(info.getValue())}</span>
    ),
  }),
  columnHelper.accessor((r) => r.gradingGatePass.variety, {
    id: 'variety',
    meta: { gradingReportRowSpan: 'merge' },
    header: 'Variety',
    sortingFn: 'text',
    cell: (info) => <span className="font-custom">{info.getValue()}</span>,
  }),
  columnHelper.display({
    id: 'gradedBags',
    meta: { gradingReportRowSpan: 'merge' },
    header: () => (
      <div className="font-custom w-full text-right">Graded bags</div>
    ),
    enableSorting: false,
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
  columnHelper.display({
    id: 'netWeightAfterGradingWithoutBardana',
    meta: { gradingReportRowSpan: 'merge' },
    header: () => (
      <div className="font-custom w-full text-right">
        Net Weight After Grading (w/o Bardana)
      </div>
    ),
    enableSorting: false,
    cell: () => <span className="font-custom">test</span>,
  }),
  columnHelper.display({
    id: 'wastagePercent',
    meta: { gradingReportRowSpan: 'merge' },
    header: () => (
      <div className="font-custom w-full text-right">Wastage (%)</div>
    ),
    enableSorting: false,
    cell: () => <span className="font-custom">test</span>,
  }),
  columnHelper.accessor((r) => r.gradingGatePass.grader, {
    id: 'grader',
    meta: { gradingReportRowSpan: 'merge' },
    header: 'Grader',
    sortingFn: 'text',
    cell: (info) => (
      <span className="font-custom">{info.getValue() ?? '-'}</span>
    ),
  }),
  columnHelper.accessor((r) => r.gradingGatePass.remarks, {
    id: 'remarks',
    meta: { gradingReportRowSpan: 'merge' },
    header: 'Remarks',
    sortingFn: 'text',
    cell: (info) => (
      <span className="font-custom">{info.getValue() ?? '-'}</span>
    ),
  }),
];

const TABLE_SKELETON_COLUMNS = 11;
const TABLE_SKELETON_ROWS = 10;

const GradingReportTable = () => {
  const [fromDate, setFromDate] = React.useState('');
  const [toDate, setToDate] = React.useState('');
  const [appliedFromDate, setAppliedFromDate] = React.useState('');
  const [appliedToDate, setAppliedToDate] = React.useState('');
  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [searchQuery, setSearchQuery] = React.useState('');

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

  const filteredData = React.useMemo(() => {
    const rows = data ?? [];
    return rows.filter((row) => gradingGatePassMatchesSearch(row, searchQuery));
  }, [data, searchQuery]);

  const tableData = React.useMemo(
    () => expandGradingReportRows(filteredData),
    [filteredData]
  );

  const table = useReactTable({
    data: tableData,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
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

  return (
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
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search manual gate pass…"
                  className="h-8 pl-8 text-sm"
                />
              </div>
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
              <table className="font-custom w-max min-w-full text-sm">
                <TableHeader className="bg-secondary border-border/60 text-secondary-foreground sticky top-0 z-10 border-b backdrop-blur-sm">
                  {table.getHeaderGroups().map((headerGroup) => (
                    <TableRow
                      key={headerGroup.id}
                      className="hover:bg-transparent"
                    >
                      {headerGroup.headers.map((header) => {
                        if (header.isPlaceholder) return null;

                        const canSort = header.column.getCanSort();
                        const isRightAligned = gradingRightAlignedColumnIds.has(
                          header.column.id
                        );

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
                                <span className={isRightAligned ? 'ml-2' : ''}>
                                  {{
                                    asc: (
                                      <ArrowUp className="ml-1 h-3.5 w-3.5 shrink-0" />
                                    ),
                                    desc: (
                                      <ArrowDown className="ml-1 h-3.5 w-3.5 shrink-0" />
                                    ),
                                  }[header.column.getIsSorted() as string] ?? (
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
                    const expanded = row.original;
                    const cellsToRender = row
                      .getVisibleCells()
                      .filter((cell) => {
                        if (isGradingSplitSpanColumn(cell.column)) return true;
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
  );
};

export default GradingReportTable;
