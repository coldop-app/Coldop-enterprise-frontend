import type { Table as TanstackTable } from '@tanstack/react-table';
import type {
  ColumnResizeDirection,
  ColumnResizeMode,
} from '@tanstack/react-table';
import type { ContractFarmingReportRow } from '../columns';

export type ViewFiltersSheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  table: TanstackTable<ContractFarmingReportRow>;
  defaultColumnOrder: string[];
  columnResizeMode: ColumnResizeMode;
  columnResizeDirection: ColumnResizeDirection;
  onColumnResizeModeChange: (mode: ColumnResizeMode) => void;
  onColumnResizeDirectionChange: (direction: ColumnResizeDirection) => void;
};

export type StatusFilterValue = 'ACTIVE';

export type FilterableColumnId =
  | 'gatePassNo'
  | 'date'
  | 'farmerName'
  | 'variety'
  | 'bagsReceived'
  | 'netWeightKg'
  | 'location'
  | 'truckNumber';
