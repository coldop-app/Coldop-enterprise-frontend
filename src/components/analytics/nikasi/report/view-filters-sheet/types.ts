import type { Table as TanstackTable } from '@tanstack/react-table';
import type {
  ColumnResizeDirection,
  ColumnResizeMode,
  VisibilityState,
} from '@tanstack/react-table';
import type { NikasiReportDisplayRow } from '../nikasi-report-flatten';

export type ViewFiltersSheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  table: TanstackTable<NikasiReportDisplayRow>;
  defaultColumnOrder: string[];
  /** Base visibility from `useState` (not `table.initialState`). */
  defaultColumnVisibility: VisibilityState;
  /** Bag-size columns with no data — hidden in the table via `effectiveColumnVisibility`. */
  emptyBagSizeColumnIds: ReadonlySet<string>;
  /** Display labels for the Columns tab (API headers + bag-size labels). */
  columnLabelById: Record<string, string>;
  columnResizeMode: ColumnResizeMode;
  columnResizeDirection: ColumnResizeDirection;
  onColumnResizeModeChange: (mode: ColumnResizeMode) => void;
  onColumnResizeDirectionChange: (direction: ColumnResizeDirection) => void;
};

export type FilterableColumnId =
  | 'gatePassNo'
  | 'manualGatePassNumber'
  | 'date'
  | 'from'
  | 'dispatchLedger'
  | 'to'
  | 'truckNumber'
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
  | 'totalBagsIssued'
  | 'averageWeightPerBag'
  | 'netWeight'
  | 'isInternalTransfer'
  | 'remarks';
