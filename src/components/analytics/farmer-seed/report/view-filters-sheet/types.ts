import type { Table as TanstackTable } from '@tanstack/react-table';
import type {
  ColumnResizeDirection,
  ColumnResizeMode,
  VisibilityState,
} from '@tanstack/react-table';
import type { FarmerSeedReportRow } from '../columns';

export type ViewFiltersSheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  table: TanstackTable<FarmerSeedReportRow>;
  defaultColumnOrder: string[];
  /** Canonical defaults for the farmer-seed table (not `table.initialState`). */
  defaultColumnVisibility: VisibilityState;
  columnResizeMode: ColumnResizeMode;
  columnResizeDirection: ColumnResizeDirection;
  onColumnResizeModeChange: (mode: ColumnResizeMode) => void;
  onColumnResizeDirectionChange: (direction: ColumnResizeDirection) => void;
};

/** Value-filter columns — IDs match `FarmerSeedReportRow` / table column ids. */
export type FilterableColumnId =
  | 'farmerName'
  | 'totalAcres'
  | 'gatePassNo'
  | 'invoiceNumber'
  | 'date'
  | 'variety'
  | 'generation'
  | 'bag35to40'
  | 'bag40to45'
  | 'bag40to50'
  | 'bag45to50'
  | 'bag50to55'
  | 'totalBags'
  | 'averageRate'
  | 'totalAmount'
  | 'remarks';
