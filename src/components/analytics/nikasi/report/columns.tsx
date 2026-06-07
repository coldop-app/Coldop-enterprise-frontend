import type {
  AggregationFn,
  ColumnDef,
  FilterFn,
  Row,
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
import type {
  NikasiBagSizeCellValue,
  NikasiReportDisplayRow,
} from './nikasi-report-flatten';
import { formatIndianNumber, getDecimalPlaces } from './nikasi-report-totals';

const AVERAGE_WEIGHT_AGGREGATE_DECIMALS = 2;

/** Columns rendered once per variety sub-row (no rowSpan). */
export const NIKASI_VARIETY_SPLIT_COLUMN_IDS = new Set<string>(['variety']);

/** API columns omitted from the nikasi analytics table. */
export const NIKASI_EXCLUDED_TABLE_COLUMN_IDS = new Set<string>([
  'farmerName',
  'accountNumber',
]);

/**
 * Gate-pass-level fields duplicated on every variety sub-row.
 * Most suppress aggregates; weight/bag totals use deduped gate-pass aggregation.
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

function uniqueGatePassRowsFromLeaves(
  leafRows: Row<NikasiReportDisplayRow>[]
): NikasiReportDisplayRow[] {
  const seen = new Set<string>();
  const unique: NikasiReportDisplayRow[] = [];

  for (const row of leafRows) {
    const gatePassId = row.original.gatePassId;
    if (seen.has(gatePassId)) continue;
    seen.add(gatePassId);
    unique.push(row.original);
  }

  return unique;
}

const nikasiTotalBagsIssuedAggregationFn: AggregationFn<
  NikasiReportDisplayRow
> = (_columnId, leafRows) =>
  uniqueGatePassRowsFromLeaves(leafRows).reduce(
    (sum, row) => sum + (Number(row.totalBagsIssued) || 0),
    0
  );

const nikasiNetWeightAggregationFn: AggregationFn<NikasiReportDisplayRow> = (
  _columnId,
  leafRows
) => {
  const uniqueRows = uniqueGatePassRowsFromLeaves(leafRows);
  let netPrecision = 0;

  for (const row of uniqueRows) {
    netPrecision = Math.max(
      netPrecision,
      getDecimalPlaces(Number(row.netWeight ?? 0))
    );
  }

  const factor = 10 ** netPrecision;
  let scaledNetSum = 0;

  for (const row of uniqueRows) {
    scaledNetSum += Math.round((Number(row.netWeight ?? 0) || 0) * factor);
  }

  return scaledNetSum / factor;
};

const nikasiAverageWeightPerBagAggregationFn: AggregationFn<
  NikasiReportDisplayRow
> = (_columnId, leafRows) => {
  const values = uniqueGatePassRowsFromLeaves(leafRows)
    .map((row) => row.averageWeightPerBag)
    .filter((value): value is number => Number.isFinite(Number(value)))
    .map(Number);

  if (values.length === 0) return null;

  return values.reduce((sum, value) => sum + value, 0) / values.length;
};

function renderNikasiAggregatedMetricCell(value: unknown, precision = 0) {
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
      aggregatedCell: ({ getValue }) => {
        const numericValue = Number(getValue()) || 0;
        return (
          <div className="flex w-full justify-end">
            {renderNikasiAggregatedMetricCell(
              numericValue,
              getDecimalPlaces(numericValue)
            )}
          </div>
        );
      },
    };
  }

  if (columnId === 'averageWeightPerBag') {
    return {
      aggregationFn: nikasiAverageWeightPerBagAggregationFn,
      aggregatedCell: ({ getValue }) => (
        <div className="flex w-full justify-end">
          {renderNikasiAggregatedMetricCell(
            getValue(),
            AVERAGE_WEIGHT_AGGREGATE_DECIMALS
          )}
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

function renderNikasiAggregatedBagQuantity(value: unknown) {
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

function renderNikasiBagSizeQuantityCell(value?: NikasiBagSizeCellValue) {
  if (!value || value.quantity <= 0) {
    return (
      <span className="font-custom text-muted-foreground/40 text-sm">-</span>
    );
  }

  return (
    <div className="flex w-full flex-col items-end gap-0.5 text-right">
      <span className="font-custom text-sm font-medium tabular-nums">
        {value.quantity.toLocaleString('en-IN')}
      </span>
      {value.bagType ? (
        <span className="font-custom text-muted-foreground text-[10px] font-medium tracking-wide uppercase">
          {value.bagType}
        </span>
      ) : null}
    </div>
  );
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

export const defaultNikasiReportColumnVisibility: VisibilityState = {
  gatePassNo: false,
};

const NIKASI_FROM_REPORT_COLUMN: NikasiGatePassReportColumn = {
  id: NIKASI_FROM_COLUMN_ID,
  header: 'From',
  accessorKey: NIKASI_FROM_COLUMN_ID,
};

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

  for (const column of apiColumns) {
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

    columns.push({
      id: column.id,
      ...getNikasiColumnSizing(column.id),
      accessorKey: column.accessorKey as keyof NikasiGatePassReportDataRow,
      header: column.header,
      enableHiding: true,
      enableGrouping: true,
      ...(suppressAggregation ? nikasiNoAggregate : {}),
      ...metricAggregationExtras,
      sortingFn,
      sortUndefined: 'last' as const,
      filterFn: nikasiMultiValueFilterFn,
      cell: ({ getValue }) => (
        <span className="font-custom block w-full text-sm wrap-break-word whitespace-normal">
          {formatNikasiReportCellValue(getValue(), column.id)}
        </span>
      ),
    });
  }

  return columns;
}
