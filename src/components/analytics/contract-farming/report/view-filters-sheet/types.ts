import type { Table as TanstackTable } from '@tanstack/react-table';
import type {
  ColumnResizeDirection,
  ColumnResizeMode,
  GroupingState,
} from '@tanstack/react-table';
import type { FlattenedRow } from '../types';

export type ContractFarmingViewFiltersSheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  table: TanstackTable<FlattenedRow>;
  defaultColumnOrder: string[];
  columnResizeMode: ColumnResizeMode;
  columnResizeDirection: ColumnResizeDirection;
  onColumnResizeModeChange: (mode: ColumnResizeMode) => void;
  onColumnResizeDirectionChange: (direction: ColumnResizeDirection) => void;
  rowSpanGrouping: GroupingState;
  onRowSpanGroupingChange: (next: GroupingState) => void;
};
