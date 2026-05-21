import {
  type FilterFn,
  type VisibilityState,
  createColumnHelper,
} from '@tanstack/react-table';
import { Badge } from '@/components/ui/badge';
import {
  type BagSizeColumnConfigEntry,
  formatBagSizeDisplayLabel,
} from '@/lib/bag-size-columns';
import {
  evaluateFilterGroup,
  isAdvancedFilterGroup,
  type FilterGroupNode,
} from '@/lib/advanced-filters';

/** Gate-pass-level columns rendered once with `rowSpan` across variety rows. */
export const NIKASI_GATE_PASS_ROWSPAN_COLUMN_IDS = new Set<string>([
  'gatePassNo',
  'manualGatePassNumber',
  'date',
  'farmerMobile',
  'storageAccountLabel',
  'linkedByName',
  'location',
  'dispatchLedgerMobile',
  'createdByName',
  'nikasiFrom',
  'nikasiTo',
  'truckNumber',
  'bagsReceived',
  'netWeightKg',
  'averageWeightPerBag',
  'isInternalTransferLabel',
  'remarks',
  'createdAt',
  'updatedAt',
]);

export type NikasiReportBagFields = Record<string, number>;

export interface NikasiReportRow {
  id: string;
  /** Original gate pass `_id` (dedupe totals / Excel merges). */
  gatePassId: string;
  /** Index of this row within the gate pass’s variety group (0-based). */
  varietyRowIndex: number;
  /** Number of variety rows for this gate pass. */
  varietyRowSpan: number;
  gatePassNo: number;
  manualGatePassNumber: string;
  date: string;
  dateSortValue: number;
  farmerMobile: string;
  storageAccountLabel: string;
  linkedByName: string;
  location: string;
  dispatchLedgerMobile: string;
  createdByName: string;
  nikasiFrom: string;
  nikasiTo: string;
  truckNumber: string;
  variety: string;
  bagsReceived: number;
  netWeightKg: number;
  netWeightPrecision: number;
  averageWeightPerBag: number;
  averageWeightPrecision: number;
  remarks: string;
  isInternalTransferLabel: string;
  createdAt: string;
  updatedAt: string;
  /** Dynamic bag-size column quantities keyed by column id. */
  [bagColumnId: string]: number | string;
}

export function createEmptyNikasiBagFields(
  columnIds: string[] = []
): NikasiReportBagFields {
  return Object.fromEntries(columnIds.map((id) => [id, 0]));
}

export function getNikasiBagValue(
  row: NikasiReportRow,
  columnId: string
): number {
  return Number(row[columnId] ?? 0);
}

function tieBreakNikasiSort(
  a: NikasiReportRow,
  b: NikasiReportRow,
  primary: number
): number {
  if (primary !== 0) return primary;
  const byGate = a.gatePassId.localeCompare(b.gatePassId);
  if (byGate !== 0) return byGate;
  return a.varietyRowIndex - b.varietyRowIndex;
}

export function getDecimalPlaces(value: number): number {
  if (!Number.isFinite(value)) return 0;
  const asString = value.toString().toLowerCase();
  if (!asString.includes('e')) {
    return asString.includes('.') ? (asString.split('.')[1]?.length ?? 0) : 0;
  }

  const [base, exponentPart] = asString.split('e');
  const exponent = Number(exponentPart);
  const baseDecimals = base.includes('.')
    ? (base.split('.')[1]?.length ?? 0)
    : 0;

  if (!Number.isFinite(exponent)) return baseDecimals;
  if (exponent >= 0) return Math.max(0, baseDecimals - exponent);
  return baseDecimals + Math.abs(exponent);
}

export function formatIndianNumber(value: number, precision = 0): string {
  return value.toLocaleString('en-IN', {
    minimumFractionDigits: precision,
    maximumFractionDigits: precision,
  });
}

function formatNumberOrEmpty(value: number, precision = 0): string {
  return Number(value || 0) === 0 ? '' : formatIndianNumber(value, precision);
}

const NIKASI_COLUMN_PREFIX: string[] = [
  'farmerMobile',
  'storageAccountLabel',
  'linkedByName',
  'location',
  'dispatchLedgerMobile',
  'createdByName',
  'gatePassNo',
  'manualGatePassNumber',
  'date',
  'nikasiFrom',
  'nikasiTo',
  'truckNumber',
  'variety',
];

const NIKASI_COLUMN_SUFFIX: string[] = [
  'bagsReceived',
  'netWeightKg',
  'averageWeightPerBag',
  'isInternalTransferLabel',
  'remarks',
  'createdAt',
  'updatedAt',
];

export function getNikasiDefaultColumnOrder(
  bagSizeColumnIds: string[]
): string[] {
  return [
    ...NIKASI_COLUMN_PREFIX,
    ...bagSizeColumnIds,
    ...NIKASI_COLUMN_SUFFIX,
  ];
}

export const defaultNikasiReportColumnVisibility: VisibilityState = {
  farmerMobile: false,
  storageAccountLabel: false,
  linkedByName: false,
  dispatchLedgerMobile: false,
  createdByName: false,
  gatePassNo: false,
  averageWeightPerBag: false,
  createdAt: false,
  updatedAt: false,
  nikasiFrom: false,
};

export function getNikasiNumericColumnIds(
  bagSizeColumnIds: string[]
): Set<string> {
  return new Set([
    ...bagSizeColumnIds,
    'bagsReceived',
    'netWeightKg',
    'averageWeightPerBag',
  ]);
}

const multiValueFilterFn = (
  row: { getValue: (columnId: string) => unknown },
  columnId: string,
  filterValue: string[] | string
) => {
  const cellValue = String(row.getValue(columnId));
  if (typeof filterValue === 'string') {
    const normalized = filterValue.trim().toLowerCase();
    if (!normalized) return true;
    return cellValue.toLowerCase().includes(normalized);
  }
  if (!Array.isArray(filterValue)) return true;
  if (filterValue.length === 0) return true;
  return filterValue.includes(cellValue);
};

const columnHelper = createColumnHelper<NikasiReportRow>();

const nikasiGroupableColumn = {
  enableGrouping: true,
  aggregationFn: 'count' as const,
  aggregatedCell: () => null,
};

const nikasiNonGroupableColumn = {
  enableGrouping: false,
};

export function getNikasiReportColumns(
  bagSizeColumnConfig: BagSizeColumnConfigEntry[]
) {
  return [
    columnHelper.accessor('gatePassNo', {
      ...nikasiNonGroupableColumn,
      header: 'Gate Pass No',
      sortingFn: (rowA, rowB) =>
        tieBreakNikasiSort(
          rowA.original,
          rowB.original,
          rowA.original.gatePassNo - rowB.original.gatePassNo
        ),
      filterFn: multiValueFilterFn,
      cell: (info) => (
        <span className="font-custom font-medium">{info.getValue()}</span>
      ),
    }),
    columnHelper.accessor('manualGatePassNumber', {
      ...nikasiNonGroupableColumn,
      header: 'Manual Gate Pass No',
      sortingFn: (rowA, rowB) =>
        tieBreakNikasiSort(
          rowA.original,
          rowB.original,
          String(rowA.original.manualGatePassNumber).localeCompare(
            String(rowB.original.manualGatePassNumber)
          )
        ),
      filterFn: multiValueFilterFn,
    }),
    columnHelper.accessor('date', {
      ...nikasiGroupableColumn,
      header: 'Date',
      sortingFn: (rowA, rowB) =>
        tieBreakNikasiSort(
          rowA.original,
          rowB.original,
          Number(rowA.original.dateSortValue || 0) -
            Number(rowB.original.dateSortValue || 0)
        ),
      filterFn: multiValueFilterFn,
    }),
    columnHelper.accessor('farmerMobile', {
      ...nikasiGroupableColumn,
      header: 'Mobile Number',
      sortingFn: (rowA, rowB) =>
        tieBreakNikasiSort(
          rowA.original,
          rowB.original,
          rowA.original.farmerMobile.localeCompare(rowB.original.farmerMobile)
        ),
      filterFn: multiValueFilterFn,
    }),
    columnHelper.accessor('storageAccountLabel', {
      ...nikasiGroupableColumn,
      header: 'Storage account',
      sortingFn: (rowA, rowB) =>
        tieBreakNikasiSort(
          rowA.original,
          rowB.original,
          rowA.original.storageAccountLabel.localeCompare(
            rowB.original.storageAccountLabel
          )
        ),
      filterFn: multiValueFilterFn,
    }),
    columnHelper.accessor('linkedByName', {
      ...nikasiGroupableColumn,
      header: 'Linked by',
      sortingFn: (rowA, rowB) =>
        tieBreakNikasiSort(
          rowA.original,
          rowB.original,
          rowA.original.linkedByName.localeCompare(rowB.original.linkedByName)
        ),
      filterFn: multiValueFilterFn,
    }),
    columnHelper.accessor('location', {
      ...nikasiGroupableColumn,
      header: 'Dispatch ledger',
      sortingFn: (rowA, rowB) =>
        tieBreakNikasiSort(
          rowA.original,
          rowB.original,
          rowA.original.location.localeCompare(rowB.original.location)
        ),
      filterFn: multiValueFilterFn,
    }),
    columnHelper.accessor('dispatchLedgerMobile', {
      ...nikasiGroupableColumn,
      header: 'Ledger mobile',
      sortingFn: (rowA, rowB) =>
        tieBreakNikasiSort(
          rowA.original,
          rowB.original,
          rowA.original.dispatchLedgerMobile.localeCompare(
            rowB.original.dispatchLedgerMobile
          )
        ),
      filterFn: multiValueFilterFn,
    }),
    columnHelper.accessor('createdByName', {
      ...nikasiGroupableColumn,
      header: 'Created by',
      sortingFn: (rowA, rowB) =>
        tieBreakNikasiSort(
          rowA.original,
          rowB.original,
          rowA.original.createdByName.localeCompare(rowB.original.createdByName)
        ),
      filterFn: multiValueFilterFn,
    }),
    columnHelper.accessor('nikasiFrom', {
      ...nikasiGroupableColumn,
      header: 'From',
      sortingFn: (rowA, rowB) =>
        tieBreakNikasiSort(
          rowA.original,
          rowB.original,
          rowA.original.nikasiFrom.localeCompare(rowB.original.nikasiFrom)
        ),
      filterFn: multiValueFilterFn,
    }),
    columnHelper.accessor('nikasiTo', {
      ...nikasiGroupableColumn,
      header: 'To',
      sortingFn: (rowA, rowB) =>
        tieBreakNikasiSort(
          rowA.original,
          rowB.original,
          rowA.original.nikasiTo.localeCompare(rowB.original.nikasiTo)
        ),
      filterFn: multiValueFilterFn,
    }),
    columnHelper.accessor('truckNumber', {
      ...nikasiGroupableColumn,
      header: 'Truck No.',
      sortingFn: (rowA, rowB) =>
        tieBreakNikasiSort(
          rowA.original,
          rowB.original,
          rowA.original.truckNumber.localeCompare(rowB.original.truckNumber)
        ),
      filterFn: multiValueFilterFn,
    }),
    columnHelper.accessor('variety', {
      ...nikasiGroupableColumn,
      header: 'Variety',
      sortingFn: (rowA, rowB) =>
        tieBreakNikasiSort(
          rowA.original,
          rowB.original,
          rowA.original.variety.localeCompare(rowB.original.variety)
        ),
      filterFn: multiValueFilterFn,
      size: 200,
      maxSize: 320,
    }),
    ...bagSizeColumnConfig.map(({ id, label }) => {
      const displayLabel = formatBagSizeDisplayLabel(label);
      return columnHelper.accessor(
        id as Extract<keyof NikasiReportRow, string>,
        {
          ...nikasiNonGroupableColumn,
          id,
          meta: displayLabel,
          header: () => <div className="w-full text-right">{displayLabel}</div>,
          sortingFn: (rowA, rowB) =>
            tieBreakNikasiSort(
              rowA.original,
              rowB.original,
              Number(rowA.original[id] ?? 0) - Number(rowB.original[id] ?? 0)
            ),
          filterFn: multiValueFilterFn,
          aggregationFn: 'sum',
          aggregatedCell: (info) => (
            <div className="w-full text-right font-medium tabular-nums">
              {formatNumberOrEmpty(Number(info.getValue() || 0), 0)}
            </div>
          ),
          minSize: 90,
          maxSize: 170,
          cell: (info) => (
            <div className="w-full text-right tabular-nums">
              {formatNumberOrEmpty(Number(info.getValue() || 0), 0)}
            </div>
          ),
        }
      );
    }),
    columnHelper.accessor('bagsReceived', {
      ...nikasiNonGroupableColumn,
      header: () => <div className="w-full text-right">Bags issued</div>,
      sortingFn: (rowA, rowB) =>
        tieBreakNikasiSort(
          rowA.original,
          rowB.original,
          Number(rowA.original.bagsReceived ?? 0) -
            Number(rowB.original.bagsReceived ?? 0)
        ),
      filterFn: multiValueFilterFn,
      minSize: 100,
      maxSize: 160,
      cell: (info) => (
        <div className="w-full text-right tabular-nums">
          {formatIndianNumber(Number(info.getValue()), 0)}
        </div>
      ),
    }),
    columnHelper.accessor('netWeightKg', {
      ...nikasiNonGroupableColumn,
      header: () => <div className="w-full text-right">Net (kg)</div>,
      sortingFn: (rowA, rowB) =>
        tieBreakNikasiSort(
          rowA.original,
          rowB.original,
          Number(rowA.original.netWeightKg ?? 0) -
            Number(rowB.original.netWeightKg ?? 0)
        ),
      filterFn: multiValueFilterFn,
      aggregationFn: (_columnId, leafRows) => {
        const maxPrecision = leafRows.reduce((max, row) => {
          const precision = Number(row.original.netWeightPrecision ?? 0);
          return Math.max(max, precision);
        }, 0);
        const factor = 10 ** maxPrecision;
        const scaledSum = leafRows.reduce((sum, row) => {
          const value = Number(row.original.netWeightKg ?? 0);
          return sum + Math.round(value * factor);
        }, 0);
        return scaledSum / factor;
      },
      aggregatedCell: (info) => {
        const groupedRows = info.row.getLeafRows();
        const maxPrecision = groupedRows.reduce((max, row) => {
          const precision = Number(row.original.netWeightPrecision ?? 0);
          return Math.max(max, precision);
        }, 0);
        const factor = 10 ** maxPrecision;
        const scaledSum = groupedRows.reduce((sum, row) => {
          const value = Number(row.original.netWeightKg ?? 0);
          return sum + Math.round(value * factor);
        }, 0);
        const safeTotal = scaledSum / factor;
        return (
          <div className="w-full text-right font-medium tabular-nums">
            {formatIndianNumber(Number(safeTotal), maxPrecision)}
          </div>
        );
      },
      minSize: 110,
      maxSize: 200,
      cell: (info) => {
        const { netWeightKg, netWeightPrecision } = info.row.original;
        return (
          <div className="w-full text-right font-medium tabular-nums">
            {formatIndianNumber(Number(netWeightKg), netWeightPrecision)}
          </div>
        );
      },
    }),
    columnHelper.accessor('averageWeightPerBag', {
      ...nikasiNonGroupableColumn,
      header: () => <div className="w-full text-right">Avg / bag (kg)</div>,
      sortingFn: (rowA, rowB) =>
        tieBreakNikasiSort(
          rowA.original,
          rowB.original,
          Number(rowA.original.averageWeightPerBag ?? 0) -
            Number(rowB.original.averageWeightPerBag ?? 0)
        ),
      filterFn: multiValueFilterFn,
      minSize: 120,
      maxSize: 180,
      cell: (info) => {
        const { averageWeightPerBag, averageWeightPrecision } =
          info.row.original;
        return (
          <div className="w-full text-right tabular-nums">
            {formatIndianNumber(
              Number(averageWeightPerBag),
              averageWeightPrecision
            )}
          </div>
        );
      },
    }),
    columnHelper.accessor('isInternalTransferLabel', {
      ...nikasiGroupableColumn,
      header: 'Internal',
      sortingFn: (rowA, rowB) =>
        tieBreakNikasiSort(
          rowA.original,
          rowB.original,
          rowA.original.isInternalTransferLabel.localeCompare(
            rowB.original.isInternalTransferLabel
          )
        ),
      filterFn: (row, columnId, filterValue: string[]) => {
        const v = row.getValue(columnId) as string;
        if (!Array.isArray(filterValue)) return true;
        if (filterValue.length === 0) return true;
        return filterValue.includes(v);
      },
      cell: (info) => {
        const value = info.getValue();
        const isYes = value === 'Yes';
        return (
          <Badge
            variant={isYes ? 'secondary' : 'outline'}
            className={`font-custom h-7 self-center rounded-lg border px-2.5 text-[11px] leading-none tracking-wide uppercase ${
              isYes
                ? 'border-muted-foreground/25 bg-muted/80 text-muted-foreground'
                : 'border-primary/35 bg-primary/12 text-primary'
            }`}
          >
            {value}
          </Badge>
        );
      },
    }),
    columnHelper.accessor('remarks', {
      ...nikasiGroupableColumn,
      header: 'Remarks',
      sortingFn: (rowA, rowB) =>
        tieBreakNikasiSort(
          rowA.original,
          rowB.original,
          rowA.original.remarks.localeCompare(rowB.original.remarks)
        ),
      filterFn: multiValueFilterFn,
      size: 400,
      maxSize: 500,
    }),
    columnHelper.accessor('createdAt', {
      ...nikasiGroupableColumn,
      header: 'Created',
      sortingFn: (rowA, rowB) =>
        tieBreakNikasiSort(
          rowA.original,
          rowB.original,
          rowA.original.createdAt.localeCompare(rowB.original.createdAt)
        ),
      filterFn: multiValueFilterFn,
    }),
    columnHelper.accessor('updatedAt', {
      ...nikasiGroupableColumn,
      header: 'Updated',
      sortingFn: (rowA, rowB) =>
        tieBreakNikasiSort(
          rowA.original,
          rowB.original,
          rowA.original.updatedAt.localeCompare(rowB.original.updatedAt)
        ),
      filterFn: multiValueFilterFn,
    }),
  ];
}

export type GlobalFilterValue = string | FilterGroupNode;

function bagHaystack(o: NikasiReportRow): string {
  return Object.entries(o)
    .filter(([key]) => key.startsWith('bag'))
    .map(([, value]) => String(value ?? ''))
    .join(' ');
}

export const globalNikasiReportSearchFilterFn: FilterFn<NikasiReportRow> = (
  row,
  _columnId,
  filterValue: GlobalFilterValue
) => {
  if (isAdvancedFilterGroup(filterValue)) {
    return evaluateFilterGroup(
      row.original as unknown as Record<string, unknown>,
      filterValue
    );
  }
  const normalized = String(filterValue).trim().toLowerCase();
  if (!normalized) return true;
  const o = row.original;
  const haystack = [
    o.gatePassNo,
    o.manualGatePassNumber,
    o.farmerMobile,
    o.location,
    o.truckNumber,
    o.nikasiFrom,
    o.nikasiTo,
    o.variety,
    bagHaystack(o),
  ]
    .map((v) => String(v ?? '').toLowerCase())
    .join(' ');
  return haystack.includes(normalized);
};
