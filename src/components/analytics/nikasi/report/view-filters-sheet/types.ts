import type { Table as TanstackTable } from '@tanstack/react-table';
import type {
  ColumnResizeDirection,
  ColumnResizeMode,
  VisibilityState,
} from '@tanstack/react-table';
import type { BagSizeColumnId } from '@/components/analytics/storage/report/columns';
import type { NikasiReportRow } from '../columns';

export type ViewFiltersSheetProps<TData = NikasiReportRow> = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  table: TanstackTable<TData>;
  defaultColumnOrder: string[];
  defaultColumnVisibility: VisibilityState;
  bagSizeColumnConfig: Array<{ id: BagSizeColumnId; label: string }>;
  columnResizeMode: ColumnResizeMode;
  columnResizeDirection: ColumnResizeDirection;
  onColumnResizeModeChange: (mode: ColumnResizeMode) => void;
  onColumnResizeDirectionChange: (direction: ColumnResizeDirection) => void;
};

export type InternalTransferFilterValue = 'Yes' | 'No';

export type FilterableColumnId =
  | 'gatePassNo'
  | 'manualGatePassNumber'
  | 'date'
  | 'farmerName'
  | 'variety'
  | 'truckNumber'
  | 'bagsReceived'
  | 'netWeightKg'
  | 'remarks'
  | 'location'
  | 'nikasiFrom'
  | 'nikasiTo';
