import type { Table as TanstackTable } from '@tanstack/react-table';
import type {
  ColumnResizeDirection,
  ColumnResizeMode,
} from '@tanstack/react-table';
import type { IncomingReportRow } from '../columns';

export type ViewFiltersSheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  table: TanstackTable<IncomingReportRow>;
  defaultColumnOrder: string[];
  columnResizeMode: ColumnResizeMode;
  columnResizeDirection: ColumnResizeDirection;
  onColumnResizeModeChange: (mode: ColumnResizeMode) => void;
  onColumnResizeDirectionChange: (direction: ColumnResizeDirection) => void;
};

export type FilterableColumnId =
  | 'gatePassNo'
  | 'manualGatePassNumber'
  | 'date'
  | 'variety'
  | 'bagBelow25'
  | 'bag25to30'
  | 'bagBelow30'
  | 'bag30to35'
  | 'bag30to40'
  | 'bag35to40'
  | 'bag40to45'
  | 'bag45to50'
  | 'bag50to55'
  | 'bagAbove50'
  | 'bagAbove55'
  | 'bagCut'
  | 'totalBags';
