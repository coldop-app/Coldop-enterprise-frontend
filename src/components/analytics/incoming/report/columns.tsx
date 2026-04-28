import { createColumnHelper } from '@tanstack/react-table';
import type {
  IncomingRecord,
  IncomingStatus,
} from './incoming-digital-report-shared';

const columnHelper = createColumnHelper<IncomingRecord>();
const numberFormatter = new Intl.NumberFormat();

const statusClasses: Record<IncomingStatus, string> = {
  NOT_GRADED: 'bg-secondary text-secondary-foreground ring-1 ring-border',
  GRADED: 'bg-primary/10 text-primary ring-1 ring-primary/20',
};

const multiValueFilterFn = (
  row: { getValue: (columnId: string) => unknown },
  columnId: string,
  filterValue: string[] | string
) => {
  const cellValue = String(row.getValue(columnId) ?? '');
  if (typeof filterValue === 'string') {
    const normalized = filterValue.trim().toLowerCase();
    if (!normalized) return true;
    return cellValue.toLowerCase().includes(normalized);
  }
  if (!Array.isArray(filterValue)) return true;
  if (filterValue.length === 0) return false;
  return filterValue.includes(cellValue);
};

export const incomingReportColumns = [
  columnHelper.accessor('gatePassNo', {
    header: 'Gate Pass',
    sortingFn: 'basic',
    filterFn: multiValueFilterFn,
    cell: (info) => (
      <div className="flex flex-col">
        <span className="text-foreground font-medium">{info.getValue()}</span>
        {info.row.original.manualGatePassNumber ? (
          <span className="text-muted-foreground text-[11px]">
            Ref: {info.row.original.manualGatePassNumber}
          </span>
        ) : null}
      </div>
    ),
  }),
  columnHelper.accessor('date', {
    header: 'Date',
    sortingFn: 'alphanumeric',
    filterFn: multiValueFilterFn,
    cell: (info) => (
      <span className="text-muted-foreground text-xs">{info.getValue()}</span>
    ),
  }),
  columnHelper.accessor('variety', {
    header: 'Variety',
    sortingFn: 'text',
    filterFn: multiValueFilterFn,
    cell: (info) => (
      <div className="flex flex-col">
        <span className="font-medium">{info.getValue()}</span>
        {info.row.original.location ? (
          <span className="text-muted-foreground text-[11px]">
            {info.row.original.location}
          </span>
        ) : null}
      </div>
    ),
  }),
  columnHelper.accessor('truckNumber', {
    header: 'Truck No.',
    sortingFn: 'text',
    filterFn: multiValueFilterFn,
    cell: (info) => (
      <span className="font-mono text-xs">{info.getValue()}</span>
    ),
  }),
  columnHelper.accessor('bagsReceived', {
    header: () => <div className="w-full text-right">Bags</div>,
    sortingFn: 'basic',
    filterFn: multiValueFilterFn,
    minSize: 100,
    maxSize: 180,
    cell: (info) => (
      <div className="text-right font-medium tabular-nums">
        {info.getValue()}
      </div>
    ),
  }),
  columnHelper.accessor('slipNumber', {
    header: 'Slip No.',
    sortingFn: 'alphanumeric',
    filterFn: multiValueFilterFn,
    cell: (info) => (
      <span className="text-muted-foreground text-xs">
        {info.getValue() ?? '-'}
      </span>
    ),
  }),
  columnHelper.accessor('grossWeightKg', {
    header: () => <div className="w-full text-right">Gross (kg)</div>,
    sortingFn: 'basic',
    filterFn: multiValueFilterFn,
    minSize: 120,
    maxSize: 220,
    cell: (info) => (
      <div className="text-muted-foreground text-right tabular-nums">
        {info.getValue()
          ? numberFormatter.format(Number(info.getValue()))
          : '-'}
      </div>
    ),
  }),
  columnHelper.accessor('tareWeightKg', {
    header: () => <div className="w-full text-right">Tare (kg)</div>,
    sortingFn: 'basic',
    filterFn: multiValueFilterFn,
    minSize: 120,
    maxSize: 220,
    cell: (info) => (
      <div className="text-muted-foreground text-right tabular-nums">
        {info.getValue()
          ? numberFormatter.format(Number(info.getValue()))
          : '-'}
      </div>
    ),
  }),
  columnHelper.accessor('status', {
    header: 'Status',
    sortingFn: 'text',
    filterFn: multiValueFilterFn,
    cell: (info) => (
      <span
        className={`inline-flex rounded-md px-2 py-1 text-[10px] font-bold tracking-wide uppercase ${
          statusClasses[info.getValue() as IncomingStatus]
        }`}
      >
        {String(info.getValue()).replace('_', ' ')}
      </span>
    ),
  }),
];

export const incomingReportDefaultColumnOrder = [
  'gatePassNo',
  'date',
  'variety',
  'truckNumber',
  'bagsReceived',
  'slipNumber',
  'grossWeightKg',
  'tareWeightKg',
  'status',
];
