/* eslint-disable react-refresh/only-export-components -- column defs export columns + type; header/cell helpers are local */
import type { CellContext, ColumnDef } from '@tanstack/table-core';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { GRADING_REPORT_BAG_SIZE_LABELS } from '@/components/analytics/reports/grading-report/grading-bag-sizes';

export interface FarmerSeedReportRow {
  id: string;
  farmerName: string;
  accountNumber: number | string;
  farmerAddress: string;
  gatePassNo: number | string;
  invoiceNumber: string;
  date: string;
  dateSortTs: number;
  variety: string;
  generation: string;
  totalBags: number;
  rate: number;
  totalSeedAmount: number;
  bagSizeQtyByName: Record<string, number>;
  remarks: string;
}

export function farmerSeedBagSizeColumnId(size: string): string {
  const short = GRADING_REPORT_BAG_SIZE_LABELS[size] ?? size;
  return `farmerSeedBagSize_${short}`;
}

const FARMER_SEED_BAG_SIZE_ORDER = [
  'Below 25',
  'Below 30',
  '30-40',
  '35-40',
  '40-45',
  '45-50',
  '50-55',
  'Above 50',
  'Above 55',
  'Cut',
] as const;

function normalizeBagSize(size: string): string {
  return size.replace(/–/g, '-').trim().toLowerCase();
}

const FARMER_SEED_BAG_SIZE_ORDER_INDEX = new Map(
  FARMER_SEED_BAG_SIZE_ORDER.map(
    (size, idx) => [normalizeBagSize(size), idx] as const
  )
);

export function orderFarmerSeedBagSizes(sizes: Iterable<string>): string[] {
  return Array.from(new Set(sizes)).sort((a, b) => {
    const aNorm = normalizeBagSize(a);
    const bNorm = normalizeBagSize(b);
    const aIdx = FARMER_SEED_BAG_SIZE_ORDER_INDEX.get(aNorm);
    const bIdx = FARMER_SEED_BAG_SIZE_ORDER_INDEX.get(bNorm);
    if (aIdx != null && bIdx != null && aIdx !== bIdx) return aIdx - bIdx;
    if (aIdx != null && bIdx == null) return -1;
    if (aIdx == null && bIdx != null) return 1;
    return a.localeCompare(b, 'en', { sensitivity: 'base' });
  });
}

function GroupableCell({
  row,
  column,
  table,
}: CellContext<FarmerSeedReportRow, unknown>) {
  const isGrouped = row.getIsGrouped();
  const canExpand = row.getCanExpand();
  const grouping = table.getState().grouping ?? [];
  const groupingColumnId = grouping[row.depth];
  const isThisColumnGrouping = groupingColumnId === column.id;
  const showExpandCollapse = isGrouped && canExpand && isThisColumnGrouping;
  const value = String(row.getValue(column.id) ?? '—');

  return (
    <div className="font-custom flex items-center gap-1">
      {showExpandCollapse ? (
        <button
          type="button"
          onClick={row.getToggleExpandedHandler()}
          className="text-muted-foreground focus-visible:ring-primary hover:bg-primary/10 hover:text-primary inline-flex shrink-0 rounded p-0.5 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
          aria-label={row.getIsExpanded() ? 'Collapse group' : 'Expand group'}
        >
          {row.getIsExpanded() ? (
            <ChevronDown className="h-4 w-4" />
          ) : (
            <ChevronRight className="h-4 w-4" />
          )}
        </button>
      ) : null}
      <span
        style={{
          paddingLeft: showExpandCollapse ? 0 : row.depth * 20,
        }}
      >
        {value}
      </span>
    </div>
  );
}

/** Farmer cell: show account number inline as `#<number>` on non-group rows. */
function FarmerCell({
  row,
  column,
  table,
}: CellContext<FarmerSeedReportRow, unknown>) {
  const isGrouped = row.getIsGrouped();
  const canExpand = row.getCanExpand();
  const grouping = table.getState().grouping ?? [];
  const groupingColumnId = grouping[row.depth];
  const isThisColumnGrouping = groupingColumnId === column.id;
  const showExpandCollapse = isGrouped && canExpand && isThisColumnGrouping;
  const name = String(row.getValue('farmerName') ?? '—');
  const accountNo = row.original.accountNumber;
  const accountStr =
    accountNo != null && accountNo !== '' && accountNo !== '—'
      ? ` #${accountNo}`
      : '';

  return (
    <div className="font-custom flex items-center gap-1">
      {showExpandCollapse ? (
        <button
          type="button"
          onClick={row.getToggleExpandedHandler()}
          className="text-muted-foreground focus-visible:ring-primary hover:bg-primary/10 hover:text-primary inline-flex shrink-0 rounded p-0.5 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
          aria-label={row.getIsExpanded() ? 'Collapse group' : 'Expand group'}
        >
          {row.getIsExpanded() ? (
            <ChevronDown className="h-4 w-4" />
          ) : (
            <ChevronRight className="h-4 w-4" />
          )}
        </button>
      ) : null}
      <span
        style={{
          paddingLeft: showExpandCollapse ? 0 : row.depth * 20,
        }}
      >
        {name}
        {!isGrouped && accountStr ? (
          <span className="text-muted-foreground font-normal">
            {accountStr}
          </span>
        ) : null}
      </span>
    </div>
  );
}

export function createFarmerSeedReportColumns(
  visibleBagSizes: readonly string[]
): ColumnDef<FarmerSeedReportRow>[] {
  const bagSizeColumns: ColumnDef<FarmerSeedReportRow>[] =
    orderFarmerSeedBagSizes(visibleBagSizes).map((size) => {
      const columnId = farmerSeedBagSizeColumnId(size);
      const label = GRADING_REPORT_BAG_SIZE_LABELS[size] ?? size;
      return {
        id: columnId,
        accessorFn: (row) => row.bagSizeQtyByName?.[size] ?? 0,
        header: () => <div className="font-custom text-right">{label}</div>,
        cell: ({ row }) => {
          const qty = row.original.bagSizeQtyByName?.[size] ?? 0;
          return (
            <span className="font-custom block text-right font-semibold">
              {qty > 0 ? qty.toLocaleString('en-IN') : ''}
            </span>
          );
        },
        aggregationFn: 'sum',
      };
    });

  return [
    {
      accessorKey: 'farmerName',
      header: 'Farmer',
      cell: FarmerCell,
      sortingFn: (rowA, rowB) =>
        rowA.original.farmerName.localeCompare(rowB.original.farmerName, 'en', {
          sensitivity: 'base',
        }),
    },
    {
      accessorKey: 'farmerAddress',
      header: 'Address',
      cell: ({ row }) => row.original.farmerAddress,
    },
    {
      accessorKey: 'gatePassNo',
      header: 'Gate Pass No.',
      cell: ({ row }) => row.original.gatePassNo,
      sortingFn: (rowA, rowB) => {
        const a = rowA.original.gatePassNo;
        const b = rowB.original.gatePassNo;
        const numA = Number(a);
        const numB = Number(b);
        const hasNumA = Number.isFinite(numA);
        const hasNumB = Number.isFinite(numB);
        if (hasNumA && hasNumB) return numA - numB;
        return String(a).localeCompare(String(b), 'en', { numeric: true });
      },
    },
    {
      accessorKey: 'invoiceNumber',
      header: 'Invoice No.',
      cell: ({ row }) => row.original.invoiceNumber,
      sortingFn: (rowA, rowB) =>
        rowA.original.invoiceNumber.localeCompare(
          rowB.original.invoiceNumber,
          'en',
          {
            numeric: true,
            sensitivity: 'base',
          }
        ),
    },
    {
      accessorKey: 'date',
      header: 'Date',
      cell: GroupableCell,
      sortingFn: (rowA, rowB) =>
        rowA.original.dateSortTs - rowB.original.dateSortTs,
    },
    {
      accessorKey: 'variety',
      header: 'Variety',
      cell: GroupableCell,
    },
    {
      accessorKey: 'generation',
      header: 'Generation',
      cell: GroupableCell,
    },
    ...bagSizeColumns,
    {
      accessorKey: 'totalBags',
      header: 'Total Bags',
      cell: ({ row }) => (
        <span className="font-custom text-right font-semibold">
          {row.original.totalBags.toLocaleString('en-IN')}
        </span>
      ),
    },
    {
      accessorKey: 'rate',
      header: 'Rate',
      cell: ({ row }) => (
        <span className="font-custom text-right font-semibold">
          {row.original.rate.toLocaleString('en-IN', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          })}
        </span>
      ),
    },
    {
      accessorKey: 'totalSeedAmount',
      header: 'Total Seed Amount',
      cell: ({ row }) => (
        <span className="font-custom text-right font-semibold">
          {row.original.totalSeedAmount.toLocaleString('en-IN', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          })}
        </span>
      ),
      aggregationFn: 'sum',
    },
    {
      accessorKey: 'remarks',
      header: 'Remarks',
      cell: ({ row }) => row.original.remarks,
    },
  ];
}

export const columns: ColumnDef<FarmerSeedReportRow>[] =
  createFarmerSeedReportColumns([]);
