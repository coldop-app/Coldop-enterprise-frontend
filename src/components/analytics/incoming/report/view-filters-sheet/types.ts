import type { Table as TanstackTable } from '@tanstack/react-table';
import type {
  ColumnResizeDirection,
  ColumnResizeMode,
  VisibilityState,
} from '@tanstack/react-table';
import type { IncomingReportRow } from '../columns';

export type ViewFiltersSheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  table: TanstackTable<IncomingReportRow>;
  defaultColumnOrder: string[];
  /** Canonical defaults for the incoming report table (not `table.initialState`). */
  defaultColumnVisibility: VisibilityState;
  columnResizeMode: ColumnResizeMode;
  columnResizeDirection: ColumnResizeDirection;
  onColumnResizeModeChange: (mode: ColumnResizeMode) => void;
  onColumnResizeDirectionChange: (direction: ColumnResizeDirection) => void;
};

export type StatusFilterValue = 'GRADED' | 'NOT_GRADED';

/** Value-filter columns aligned with the default incoming report table view. */
export type FilterableColumnId =
  | 'farmerName'
  | 'farmerAddress'
  | 'gatePassNo'
  | 'manualGatePassNumber'
  | 'date'
  | 'variety'
  | 'truckNumber'
  | 'bagsReceived'
  | 'netWeightKg'
  | 'remarks';
