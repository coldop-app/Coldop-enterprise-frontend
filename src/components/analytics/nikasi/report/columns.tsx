import type { ColumnDef, SortingFn } from '@tanstack/react-table';
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

/** Columns rendered once per variety sub-row (no rowSpan). */
export const NIKASI_VARIETY_SPLIT_COLUMN_IDS = new Set<string>(['variety']);

const NIKASI_NUMERIC_COLUMN_IDS = new Set([
  'accountNumber',
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

function compareColumnValues(
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
    const primary = compareColumnValues(
      columnId,
      rowA.getValue(columnId),
      rowB.getValue(columnId),
      bagSizeColumnIds
    );

    return tieBreakNikasiSort(rowA.original, rowB.original, primary);
  };
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

export function formatNikasiReportCellValue(value: unknown): string {
  if (value === null || value === undefined || value === '') return '-';
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  if (Array.isArray(value)) {
    if (value.length === 0) return '-';
    return value.map((item) => String(item)).join(', ');
  }
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
}

function isBagSizesApiColumn(column: NikasiGatePassReportColumn): boolean {
  return column.id === 'bagSizes' || column.accessorKey === 'bagSizes';
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
    if (isBagSizesApiColumn(column)) {
      for (const { id, label } of bagSizeColumnConfig) {
        columns.push({
          id,
          ...getNikasiColumnSizing(),
          accessorFn: (row) => row.bagSizeFields[id]?.quantity ?? 0,
          header: formatBagSizeDisplayLabel(label),
          sortingFn,
          sortUndefined: 'last' as const,
          cell: ({ row }) =>
            renderNikasiBagSizeQuantityCell(row.original.bagSizeFields[id]),
        });
      }
      continue;
    }

    columns.push({
      id: column.id,
      ...getNikasiColumnSizing(column.id),
      accessorKey: column.accessorKey as keyof NikasiGatePassReportDataRow,
      header: column.header,
      sortingFn,
      sortUndefined: 'last' as const,
      cell: ({ getValue }) => (
        <span className="font-custom block w-full text-sm wrap-break-word whitespace-normal">
          {formatNikasiReportCellValue(getValue())}
        </span>
      ),
    });
  }

  return columns;
}
