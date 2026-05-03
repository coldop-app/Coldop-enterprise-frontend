import type { Table as TanstackTable } from '@tanstack/react-table';
import type {
  ColumnResizeDirection,
  ColumnResizeMode,
  VisibilityState,
} from '@tanstack/react-table';
import type { GradingFilterField } from '../column-meta';
import type { GradingReportTableRow } from '../columns';

export type ViewFiltersSheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  table: TanstackTable<GradingReportTableRow>;
  defaultColumnOrder: readonly string[];
  defaultColumnVisibility: VisibilityState;
  columnResizeMode: ColumnResizeMode;
  columnResizeDirection: ColumnResizeDirection;
  onColumnResizeModeChange: (mode: ColumnResizeMode) => void;
  onColumnResizeDirectionChange: (direction: ColumnResizeDirection) => void;
};

export type GradingFilterableColumnId = GradingFilterField;
