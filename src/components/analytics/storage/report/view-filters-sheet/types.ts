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
  /** Base visibility from `useState` (not `table.initialState`). */
  defaultColumnVisibility: VisibilityState;
  /** Bag-size columns with no data — hidden in the table via `effectiveColumnVisibility`. */
  emptyBagSizeColumnIds: ReadonlySet<string>;
  columnResizeMode: ColumnResizeMode;
  columnResizeDirection: ColumnResizeDirection;
  onColumnResizeModeChange: (mode: ColumnResizeMode) => void;
  onColumnResizeDirectionChange: (direction: ColumnResizeDirection) => void;
};
