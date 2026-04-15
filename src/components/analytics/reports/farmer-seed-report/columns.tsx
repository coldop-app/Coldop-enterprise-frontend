/* eslint-disable react-refresh/only-export-components -- column defs export columns + type; header/cell helpers are local */
import type { CellContext, ColumnDef } from '@tanstack/table-core';
import { ChevronDown, ChevronRight, MoreVertical } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export interface FarmerSeedReportRow {
  id: string;
  farmerName: string;
  accountNumber: number | string;
  farmerAddress: string;
  gatePassNo: number | string;
  invoiceNumber: string;
  date: string;
  variety: string;
  generation: string;
  totalBags: number;
  bagSizeQtyByName: Record<string, number>;
  bagSizesSummary: string;
  remarks: string;
}

function GroupableHeader({
  column,
  label,
}: {
  column: { getIsGrouped: () => boolean; toggleGrouping: () => void };
  label: string;
}) {
  return (
    <div className="flex items-center gap-1">
      <span className="font-custom">{label}</span>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="focus-visible:ring-primary h-8 w-8 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
            aria-label={`${label} column options`}
          >
            <MoreVertical className="h-4 w-4 text-gray-600" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start">
          <DropdownMenuItem
            onSelect={(e) => {
              e.preventDefault();
              column.toggleGrouping();
            }}
          >
            {column.getIsGrouped()
              ? `Ungroup by ${label}`
              : `Group by ${label}`}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
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

export const columns: ColumnDef<FarmerSeedReportRow>[] = [
  {
    accessorKey: 'farmerName',
    header: ({ column }) => <GroupableHeader column={column} label="Farmer" />,
    cell: GroupableCell,
  },
  {
    accessorKey: 'accountNumber',
    header: 'Account No.',
    cell: ({ row }) => row.original.accountNumber,
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
  },
  {
    accessorKey: 'invoiceNumber',
    header: 'Invoice No.',
    cell: ({ row }) => row.original.invoiceNumber,
  },
  {
    accessorKey: 'date',
    header: ({ column }) => <GroupableHeader column={column} label="Date" />,
    cell: GroupableCell,
  },
  {
    accessorKey: 'variety',
    header: ({ column }) => <GroupableHeader column={column} label="Variety" />,
    cell: GroupableCell,
  },
  {
    accessorKey: 'generation',
    header: ({ column }) => (
      <GroupableHeader column={column} label="Generation" />
    ),
    cell: GroupableCell,
  },
  {
    accessorKey: 'bagSizesSummary',
    header: 'Bag Sizes',
    cell: ({ row }) => (
      <span className="font-custom text-sm">
        {row.original.bagSizesSummary}
      </span>
    ),
  },
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
    accessorKey: 'remarks',
    header: 'Remarks',
    cell: ({ row }) => row.original.remarks,
  },
];
