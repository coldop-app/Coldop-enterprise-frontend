import type {
  AggregationFn,
  ColumnDef,
  FilterFn,
  SortingFn,
  VisibilityState,
} from '@tanstack/react-table';
import {
  type BagSizeColumnConfigEntry,
  formatBagSizeDisplayLabel,
} from '@/lib/bag-size-columns';
import type {
  NikasiGatePassReportColumn,
  NikasiGatePassReportDataRow,
} from '@/services/store-admin/nikasi-gate-pass/analytics/useGetNikasiGatePassReport';
import {
  getNikasiGatePassAverageWeight,
  getNikasiGatePassNetWeight,
  getNikasiGatePassTotalBags,
  getNikasiVarietyRowNetWeight,
  getNikasiVarietyRowTotalBags,
  NIKASI_WEIGHT_DECIMALS,
  roundNikasiWeight,
  type NikasiBagSizeCellLine,
  type NikasiBagSizeCellValue,
  type NikasiReportDisplayRow,
} from './nikasi-report-flatten';
import { formatIndianNumber } from './nikasi-report-totals';

/** Columns rendered once per variety sub-row (no rowSpan). */
export const NIKASI_VARIETY_SPLIT_COLUMN_IDS = new Set<string>(['variety']);

/** API columns omitted from the nikasi analytics table. */
export const NIKASI_EXCLUDED_TABLE_COLUMN_IDS = new Set<string>([
  'farmerName',
  'accountNumber',
]);

/**
 * Gate-pass-level fields duplicated on every variety sub-row.
 * Bag/weight metrics are variety-scoped; other fields suppress grouped aggregates.
 */
export const NIKASI_FROM_COLUMN_ID = 'from';

export const NIKASI_GATE_PASS_LEVEL_COLUMN_IDS = new Set<string>([
  'gatePassNo',
  'manualGatePassNumber',
  'date',
  NIKASI_FROM_COLUMN_ID,
  'dispatchLedger',
  'to',
  'truckNumber',
  'totalBagsIssued',
  'averageWeightPerBag',
  'netWeight',
  'isInternalTransfer',
  'remarks',
]);

const NIKASI_AGGREGATION_SUPPRESSED_COLUMN_IDS = new Set<string>([
  'gatePassNo',
  'manualGatePassNumber',
  'date',
  NIKASI_FROM_COLUMN_ID,
  'dispatchLedger',
  'to',
  'truckNumber',
  'isInternalTransfer',
  'remarks',
]);

export function shouldSuppressNikasiGroupedAggregation(
  columnId: string
): boolean {
  return NIKASI_AGGREGATION_SUPPRESSED_COLUMN_IDS.has(columnId);
}

const nikasiNoAggregate = {
  aggregationFn: () => null,
} as const;

export function aggregateNikasiTotalBags(
  rows: NikasiReportDisplayRow[]
): number {
  return rows.reduce((sum, row) => sum + getNikasiVarietyRowTotalBags(row), 0);
}

export function aggregateNikasiNetWeight(
  rows: NikasiReportDisplayRow[]
): number {
  const factor = 10 ** NIKASI_WEIGHT_DECIMALS;
  let scaledNetSum = 0;

  for (const row of rows) {
    scaledNetSum += Math.round(getNikasiVarietyRowNetWeight(row) * factor);
  }

  return scaledNetSum / factor;
}

export function aggregateNikasiAverageWeightPerBag(
  rows: NikasiReportDisplayRow[]
): number | null {
  const totalBags = aggregateNikasiTotalBags(rows);
  if (totalBags <= 0) return null;

  return roundNikasiWeight(aggregateNikasiNetWeight(rows) / totalBags);
}

export function aggregateNikasiBagSizeQuantity(
  rows: NikasiReportDisplayRow[],
  columnId: string
): number {
  return rows.reduce(
    (sum, row) => sum + (row.bagSizeFields[columnId]?.quantity ?? 0),
    0
  );
}

const nikasiTotalBagsIssuedAggregationFn: AggregationFn<
  NikasiReportDisplayRow
> = (_columnId, leafRows) =>
  aggregateNikasiTotalBags(leafRows.map((row) => row.original));

const nikasiNetWeightAggregationFn: AggregationFn<NikasiReportDisplayRow> = (
  _columnId,
  leafRows
) => aggregateNikasiNetWeight(leafRows.map((row) => row.original));

const nikasiAverageWeightPerBagAggregationFn: AggregationFn<
  NikasiReportDisplayRow
> = (_columnId, leafRows) =>
  aggregateNikasiAverageWeightPerBag(leafRows.map((row) => row.original));

export function renderNikasiAggregatedMetricCell(
  value: unknown,
  precision = 0
) {
  const numericValue = Number(value);
  if (!Number.isFinite(numericValue)) {
    return (
      <span className="font-custom text-muted-foreground/40 text-sm">-</span>
    );
  }

  return (
    <span className="font-custom text-sm font-medium tabular-nums">
      {formatIndianNumber(numericValue, precision)}
    </span>
  );
}

function getGatePassMetricAggregationExtras(
  columnId: string
): Partial<ColumnDef<NikasiReportDisplayRow>> {
  if (columnId === 'totalBagsIssued') {
    return {
      aggregationFn: nikasiTotalBagsIssuedAggregationFn,
      aggregatedCell: ({ getValue }) => (
        <div className="flex w-full justify-end">
          {renderNikasiAggregatedMetricCell(getValue(), 0)}
        </div>
      ),
    };
  }

  if (columnId === 'netWeight') {
    return {
      aggregationFn: nikasiNetWeightAggregationFn,
      aggregatedCell: ({ getValue }) => (
        <div className="flex w-full justify-end">
          {renderNikasiAggregatedMetricCell(
            Number(getValue()) || 0,
            NIKASI_WEIGHT_DECIMALS
          )}
        </div>
      ),
    };
  }

  if (columnId === 'averageWeightPerBag') {
    return {
      aggregationFn: nikasiAverageWeightPerBagAggregationFn,
      aggregatedCell: ({ getValue }) => (
        <div className="flex w-full justify-end">
          {renderNikasiAggregatedMetricCell(getValue(), NIKASI_WEIGHT_DECIMALS)}
        </div>
      ),
    };
  }

  return {};
}

const NIKASI_NUMERIC_COLUMN_IDS = new Set([
  'gatePassNo',
  'manualGatePassNumber',
  'totalBagsIssued',
  'averageWeightPerBag',
  'netWeight',
]);

const NIKASI_DATE_COLUMN_IDS = new Set(['date']);

export const NIKASI_DEFAULT_COLUMN_SIZE = 160;
export const NIKASI_DEFAULT_COLUMN_MIN_SIZE = 100;
export const NIKASI_DEFAULT_COLUMN_MAX_SIZE = 350;
export const NIKASI_REMARKS_COLUMN_SIZE = 350;

function getNikasiColumnSizing(columnId?: string) {
  const isRemarks = columnId === 'remarks';

  return {
    size: isRemarks ? NIKASI_REMARKS_COLUMN_SIZE : NIKASI_DEFAULT_COLUMN_SIZE,
    minSize: NIKASI_DEFAULT_COLUMN_MIN_SIZE,
    maxSize: NIKASI_DEFAULT_COLUMN_MAX_SIZE,
  };
}

export function isNikasiVarietySplitColumn(
  columnId: string,
  bagSizeColumnIds?: ReadonlySet<string>
): boolean {
  if (NIKASI_VARIETY_SPLIT_COLUMN_IDS.has(columnId)) return true;
  return bagSizeColumnIds?.has(columnId) ?? false;
}

export function getNikasiNumericColumnIds(
  bagSizeColumnIds: Iterable<string>
): Set<string> {
  return new Set([...NIKASI_NUMERIC_COLUMN_IDS, ...bagSizeColumnIds]);
}

function isNumericColumn(
  columnId: string,
  bagSizeColumnIds: ReadonlySet<string>
): boolean {
  return getNikasiNumericColumnIds(bagSizeColumnIds).has(columnId);
}

export function compareNikasiColumnValues(
  columnId: string,
  a: unknown,
  b: unknown,
  bagSizeColumnIds: ReadonlySet<string>
): number {
  if (isNumericColumn(columnId, bagSizeColumnIds)) {
    return (Number(a) || 0) - (Number(b) || 0);
  }

  if (NIKASI_DATE_COLUMN_IDS.has(columnId)) {
    const aTime = Date.parse(String(a ?? '')) || 0;
    const bTime = Date.parse(String(b ?? '')) || 0;
    return aTime - bTime;
  }

  if (typeof a === 'boolean' || typeof b === 'boolean') {
    return Number(Boolean(a)) - Number(Boolean(b));
  }

  return String(a ?? '').localeCompare(String(b ?? ''), undefined, {
    numeric: true,
    sensitivity: 'base',
  });
}

function tieBreakNikasiSort(
  rowA: NikasiReportDisplayRow,
  rowB: NikasiReportDisplayRow,
  primary: number
): number {
  if (primary !== 0) return primary;

  const byGatePass = rowA.gatePassId.localeCompare(rowB.gatePassId);
  if (byGatePass !== 0) return byGatePass;

  return rowA.varietyRowIndex - rowB.varietyRowIndex;
}

export function createNikasiSortingFn(
  bagSizeColumnIds: ReadonlySet<string>
): SortingFn<NikasiReportDisplayRow> {
  return (rowA, rowB, columnId) => {
    const primary = compareNikasiColumnValues(
      columnId,
      rowA.getValue(columnId),
      rowB.getValue(columnId),
      bagSizeColumnIds
    );

    return tieBreakNikasiSort(rowA.original, rowB.original, primary);
  };
}

export function renderNikasiAggregatedBagQuantity(value: unknown) {
  const quantity = Number(value) || 0;
  if (quantity <= 0) {
    return (
      <span className="font-custom text-muted-foreground/40 text-sm">-</span>
    );
  }

  return (
    <span className="font-custom text-sm font-medium tabular-nums">
      {quantity.toLocaleString('en-IN')}
    </span>
  );
}

function normalizeBagTypeKey(bagType: string): string {
  return bagType.trim().toLowerCase();
}

function formatBagTypeLabel(bagType: string): string {
  const trimmed = bagType.trim();
  if (!trimmed) return '';
  return trimmed
    .split(/\s+/)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}

function sortNikasiBagSizeLines(
  lines: NikasiBagSizeCellLine[]
): NikasiBagSizeCellLine[] {
  return [...lines].sort((a, b) =>
    formatBagTypeLabel(a.bagType).localeCompare(formatBagTypeLabel(b.bagType))
  );
}
function renderNikasiBagSizeQuantityCell(value?: NikasiBagSizeCellValue) {
  if (!value || value.quantity <= 0 || value.lines.length === 0) {
    return (
      <span className="font-custom text-muted-foreground/40 text-sm">-</span>
    );
  }

  if (value.lines.length > 1) {
    const lines = sortNikasiBagSizeLines(value.lines);
    return (
      <div className="flex w-full justify-end">
        <div className="font-custom bg-muted/45 text-foreground inline-flex max-w-44 flex-col items-end gap-1 rounded-md px-2 py-1.5 text-right">
          <span className="font-custom text-foreground text-base leading-none font-bold tabular-nums">
            {formatIndianNumber(value.quantity, 0)}
          </span>
          <div className="font-custom flex flex-col gap-0.5">
            {lines.map((line) => (
              <span
                key={normalizeBagTypeKey(line.bagType)}
                className="font-custom text-muted-foreground text-[11px] leading-snug tabular-nums"
              >
                {`${formatBagTypeLabel(line.bagType)} ${formatIndianNumber(line.quantity, 0)}`}
              </span>
            ))}
          </div>
        </div>
      </div>
    );
  }

  const line = value.lines[0]!;
  return (
    <div className="flex w-full flex-col items-end gap-0.5 text-right">
      <span className="font-custom text-sm font-medium tabular-nums">
        {formatIndianNumber(value.quantity, 0)}
      </span>
      {line.bagType ? (
        <span className="font-custom text-muted-foreground text-[10px] font-medium tracking-wide uppercase">
          {formatBagTypeLabel(line.bagType)}
        </span>
      ) : null}
    </div>
  );
}

export function formatNikasiBagSizeCellForExcel(
  value: NikasiBagSizeCellValue | undefined
): string | number {
  if (!value || value.quantity <= 0 || value.lines.length === 0) return '-';

  const output = [formatIndianNumber(value.quantity, 0)];

  if (value.lines.length > 1) {
    for (const line of sortNikasiBagSizeLines(value.lines)) {
      output.push(
        `${formatBagTypeLabel(line.bagType)} ${formatIndianNumber(line.quantity, 0)}`
      );
    }
  } else {
    const line = value.lines[0]!;
    if (line.bagType.trim()) {
      output.push(formatBagTypeLabel(line.bagType).toUpperCase());
    }
  }

  return output.length === 1 ? value.quantity : output.join('\n');
}

function formatNikasiDisplayDate(value: unknown): string {
  if (value === null || value === undefined || value === '') return '-';
  const parsed = new Date(String(value));
  if (Number.isNaN(parsed.getTime())) return '-';
  return parsed.toLocaleDateString('en-GB');
}

export function formatNikasiReportCellValue(
  value: unknown,
  columnId?: string
): string {
  if (columnId === 'date') {
    return formatNikasiDisplayDate(value);
  }

  if (columnId === 'netWeight' || columnId === 'averageWeightPerBag') {
    if (value === null || value === undefined || value === '') return '-';
    const numericValue = Number(value);
    if (!Number.isFinite(numericValue)) return '-';
    return formatIndianNumber(
      roundNikasiWeight(numericValue),
      NIKASI_WEIGHT_DECIMALS
    );
  }

  if (value === null || value === undefined || value === '') return '-';
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  if (Array.isArray(value)) {
    if (value.length === 0) return '-';
    return value.map((item) => String(item)).join(', ');
  }
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
}

export function getNikasiColumnFilterValue(
  columnId: string,
  value: unknown,
  row?: NikasiReportDisplayRow
): string {
  if (row?.bagSizeFields && columnId in row.bagSizeFields) {
    const quantity = row.bagSizeFields[columnId]?.quantity ?? 0;
    return quantity > 0 ? String(quantity) : '-';
  }

  if (
    typeof value === 'number' &&
    (columnId.startsWith('bag') || columnId.startsWith('bagSize__'))
  ) {
    return value > 0 ? String(value) : '-';
  }

  return formatNikasiReportCellValue(value, columnId);
}

export const nikasiMultiValueFilterFn: FilterFn<NikasiReportDisplayRow> = (
  row,
  columnId,
  filterValue: string[] | string
) => {
  const cellValue = getNikasiColumnFilterValue(
    columnId,
    row.getValue(columnId),
    row.original
  );
  if (typeof filterValue === 'string') {
    const normalized = filterValue.trim().toLowerCase();
    if (!normalized) return true;
    return cellValue.toLowerCase().includes(normalized);
  }
  if (!Array.isArray(filterValue)) return true;
  if (filterValue.length === 0) return true;
  return filterValue.includes(cellValue);
};

function isBagSizesApiColumn(column: NikasiGatePassReportColumn): boolean {
  return column.id === 'bagSizes' || column.accessorKey === 'bagSizes';
}

/** Canonical order for metric columns after variety. */
export const NIKASI_METRIC_TAIL_COLUMN_IDS = [
  'totalBagsIssued',
  'bagSizes',
  'averageWeightPerBag',
  'netWeight',
  'isInternalTransfer',
  'remarks',
] as const;

const NIKASI_METRIC_TAIL_ID_SET = new Set<string>(
  NIKASI_METRIC_TAIL_COLUMN_IDS
);

function isNikasiMetricTailColumn(column: NikasiGatePassReportColumn): boolean {
  return (
    NIKASI_METRIC_TAIL_ID_SET.has(column.id) || isBagSizesApiColumn(column)
  );
}

/** Reorders API metadata so bag sizes follow Total Bags Issued. */
export function normalizeNikasiReportApiColumnOrder(
  apiColumns: NikasiGatePassReportColumn[]
): NikasiGatePassReportColumn[] {
  const byId = new Map<string, NikasiGatePassReportColumn>();

  for (const column of apiColumns) {
    if (!NIKASI_EXCLUDED_TABLE_COLUMN_IDS.has(column.id)) {
      byId.set(column.id, column);
    }
  }

  const leading: NikasiGatePassReportColumn[] = [];
  const seenLeading = new Set<string>();

  for (const column of apiColumns) {
    if (NIKASI_EXCLUDED_TABLE_COLUMN_IDS.has(column.id)) continue;
    if (isNikasiMetricTailColumn(column)) continue;
    if (seenLeading.has(column.id)) continue;
    seenLeading.add(column.id);
    leading.push(column);
  }

  const tail = NIKASI_METRIC_TAIL_COLUMN_IDS.map((id) => byId.get(id)).filter(
    (column): column is NikasiGatePassReportColumn => column != null
  );

  return [...leading, ...tail];
}

/** Moves metric/bag columns into canonical tail order while preserving leading order. */
export function reorderNikasiMetricColumns(
  order: string[],
  bagSizeColumnIds: string[]
): string[] {
  const tailIdSet = new Set<string>([
    'totalBagsIssued',
    ...bagSizeColumnIds,
    'averageWeightPerBag',
    'netWeight',
    'isInternalTransfer',
    'remarks',
  ]);

  const leading = order.filter((id) => !tailIdSet.has(id));
  const tail: string[] = [];
  const orderSet = new Set(order);

  const pushIfInOrder = (id: string) => {
    if (orderSet.has(id) && !tail.includes(id)) {
      tail.push(id);
    }
  };

  pushIfInOrder('totalBagsIssued');
  for (const id of bagSizeColumnIds) {
    pushIfInOrder(id);
  }
  pushIfInOrder('averageWeightPerBag');
  pushIfInOrder('netWeight');
  pushIfInOrder('isInternalTransfer');
  pushIfInOrder('remarks');

  const placed = new Set([...leading, ...tail]);
  const remainder = order.filter((id) => !placed.has(id));

  return [...leading, ...tail, ...remainder];
}

export const defaultNikasiReportColumnVisibility: VisibilityState = {
  gatePassNo: false,
};

const NIKASI_FROM_REPORT_COLUMN: NikasiGatePassReportColumn = {
  id: NIKASI_FROM_COLUMN_ID,
  header: 'From',
  accessorKey: NIKASI_FROM_COLUMN_ID,
};

/** Client-side fallback when the report API omits column metadata. */
export const DEFAULT_NIKASI_REPORT_API_COLUMNS: NikasiGatePassReportColumn[] = [
  {
    id: 'gatePassNo',
    header: 'System Generated Gate Pass No',
    accessorKey: 'gatePassNo',
  },
  {
    id: 'manualGatePassNumber',
    header: 'Manual Gate Pass No',
    accessorKey: 'manualGatePassNumber',
  },
  { id: 'date', header: 'Date', accessorKey: 'date' },
  NIKASI_FROM_REPORT_COLUMN,
  {
    id: 'dispatchLedger',
    header: 'Dispatch Ledger',
    accessorKey: 'dispatchLedger',
  },
  { id: 'to', header: 'To', accessorKey: 'to' },
  {
    id: 'truckNumber',
    header: 'Truck Number',
    accessorKey: 'truckNumber',
  },
  { id: 'variety', header: 'Variety', accessorKey: 'variety' },
  {
    id: 'totalBagsIssued',
    header: 'Total Bags Issued',
    accessorKey: 'totalBagsIssued',
  },
  { id: 'bagSizes', header: 'Bag Sizes', accessorKey: 'bagSizes' },
  {
    id: 'averageWeightPerBag',
    header: 'Average Weight Per Bag',
    accessorKey: 'averageWeightPerBag',
  },
  { id: 'netWeight', header: 'Net Weight', accessorKey: 'netWeight' },
  {
    id: 'isInternalTransfer',
    header: 'Internal Transfer',
    accessorKey: 'isInternalTransfer',
  },
  { id: 'remarks', header: 'Remarks', accessorKey: 'remarks' },
];

function hasNikasiFromReportColumn(
  apiColumns: NikasiGatePassReportColumn[]
): boolean {
  return apiColumns.some(
    (column) =>
      column.id === NIKASI_FROM_COLUMN_ID ||
      column.accessorKey === NIKASI_FROM_COLUMN_ID
  );
}

/** Ensures the gate-pass origin column is present (API may omit column metadata). */
export function ensureNikasiFromReportColumn(
  apiColumns: NikasiGatePassReportColumn[]
): NikasiGatePassReportColumn[] {
  if (hasNikasiFromReportColumn(apiColumns)) return apiColumns;

  const insertBeforeIndex = apiColumns.findIndex(
    (column) =>
      column.id === 'dispatchLedger' || column.accessorKey === 'dispatchLedger'
  );
  const insertAt =
    insertBeforeIndex >= 0 ? insertBeforeIndex : apiColumns.length;

  return [
    ...apiColumns.slice(0, insertAt),
    NIKASI_FROM_REPORT_COLUMN,
    ...apiColumns.slice(insertAt),
  ];
}

/** Resolves report columns from the API, falling back to the full default schema. */
export function resolveNikasiReportApiColumns(
  apiColumns: NikasiGatePassReportColumn[]
): NikasiGatePassReportColumn[] {
  const base =
    apiColumns.length > 0 ? apiColumns : DEFAULT_NIKASI_REPORT_API_COLUMNS;
  return normalizeNikasiReportApiColumnOrder(
    ensureNikasiFromReportColumn(base)
  );
}

export function getNikasiColumnLabels(
  apiColumns: NikasiGatePassReportColumn[],
  bagSizeColumnConfig: BagSizeColumnConfigEntry[]
): Record<string, string> {
  const labels: Record<string, string> = {};

  for (const column of apiColumns) {
    if (NIKASI_EXCLUDED_TABLE_COLUMN_IDS.has(column.id)) continue;

    if (isBagSizesApiColumn(column)) {
      for (const { id, label } of bagSizeColumnConfig) {
        labels[id] = formatBagSizeDisplayLabel(label);
      }
      continue;
    }

    labels[column.id] = column.header;
  }

  return labels;
}

export function getNikasiDefaultColumnOrder(
  apiColumns: NikasiGatePassReportColumn[],
  bagSizeColumnIds: string[]
): string[] {
  const order: string[] = [];
  const normalized = normalizeNikasiReportApiColumnOrder(apiColumns);

  for (const column of normalized) {
    if (NIKASI_EXCLUDED_TABLE_COLUMN_IDS.has(column.id)) continue;

    if (isBagSizesApiColumn(column)) {
      order.push(...bagSizeColumnIds);
      continue;
    }
    order.push(column.id);
  }

  return order;
}

export function buildNikasiReportColumns(
  apiColumns: NikasiGatePassReportColumn[],
  bagSizeColumnConfig: BagSizeColumnConfigEntry[]
): ColumnDef<NikasiReportDisplayRow>[] {
  const bagSizeColumnIds = new Set(
    bagSizeColumnConfig.map((entry) => entry.id)
  );
  const sortingFn = createNikasiSortingFn(bagSizeColumnIds);
  const columns: ColumnDef<NikasiReportDisplayRow>[] = [];

  for (const column of apiColumns) {
    if (NIKASI_EXCLUDED_TABLE_COLUMN_IDS.has(column.id)) continue;

    if (isBagSizesApiColumn(column)) {
      for (const { id, label } of bagSizeColumnConfig) {
        columns.push({
          id,
          ...getNikasiColumnSizing(),
          accessorFn: (row) => row.bagSizeFields[id]?.quantity ?? 0,
          header: formatBagSizeDisplayLabel(label),
          enableHiding: true,
          enableGrouping: true,
          sortingFn,
          sortUndefined: 'last' as const,
          filterFn: nikasiMultiValueFilterFn,
          aggregationFn: 'sum',
          aggregatedCell: ({ getValue }) => (
            <div className="flex w-full justify-end">
              {renderNikasiAggregatedBagQuantity(getValue())}
            </div>
          ),
          cell: ({ row }) =>
            renderNikasiBagSizeQuantityCell(row.original.bagSizeFields[id]),
        });
      }
      continue;
    }

    const suppressAggregation = NIKASI_AGGREGATION_SUPPRESSED_COLUMN_IDS.has(
      column.id
    );
    const metricAggregationExtras = getGatePassMetricAggregationExtras(
      column.id
    );
    const varietyScopedMetricAccessor =
      column.id === 'totalBagsIssued'
        ? (row: NikasiReportDisplayRow) => getNikasiGatePassTotalBags(row)
        : column.id === 'netWeight'
          ? (row: NikasiReportDisplayRow) => getNikasiGatePassNetWeight(row)
          : column.id === 'averageWeightPerBag'
            ? (row: NikasiReportDisplayRow) =>
                getNikasiGatePassAverageWeight(row)
            : undefined;

    columns.push({
      id: column.id,
      ...getNikasiColumnSizing(column.id),
      ...(varietyScopedMetricAccessor
        ? { accessorFn: varietyScopedMetricAccessor }
        : {
            accessorKey:
              column.accessorKey as keyof NikasiGatePassReportDataRow,
          }),
      header: column.header,
      enableHiding: true,
      enableGrouping: true,
      ...(suppressAggregation ? nikasiNoAggregate : {}),
      ...metricAggregationExtras,
      sortingFn,
      sortUndefined: 'last' as const,
      filterFn: nikasiMultiValueFilterFn,
      cell: ({ row, getValue }) => (
        <span className="font-custom block w-full text-sm wrap-break-word whitespace-normal">
          {formatNikasiReportCellValue(
            column.id === 'totalBagsIssued'
              ? getNikasiGatePassTotalBags(row.original)
              : column.id === 'netWeight'
                ? getNikasiGatePassNetWeight(row.original)
                : column.id === 'averageWeightPerBag'
                  ? getNikasiGatePassAverageWeight(row.original)
                  : getValue(),
            column.id
          )}
        </span>
      ),
    });
  }

  return columns;
}
