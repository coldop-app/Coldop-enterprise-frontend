import type {
  GradingGatePass,
  GradingGatePassIncomingRef,
} from '@/types/grading-gate-pass';
import type { CanonBagSize } from './column-meta';

/** One bag-size bucket after aggregating order details (shared by table cells + accessors). */
export interface GradingBagSizeAggregateCell {
  totalQuantity: number;
  lines: Array<{
    bagType: string;
    weightPerBagKg: number;
    initialQuantity: number;
  }>;
}

/** Row shape for the grading analytics table (mirrors incoming report `columns.tsx` row type). */
export type GradingReportTableRow = {
  gradingGatePass: GradingGatePass;
  /** One incoming gate pass number per displayed row when a pass has multiple links */
  incomingDisplay: string;
  /** Populated nested incoming record for this sub-row (`undefined` when no incoming linked) */
  incomingRef?: GradingGatePassIncomingRef;
  mergedRowSpan: number;
  isFirstOfMergedBlock: boolean;
  incomingSubIndex: number;
  /** Parent index before row expansion — used for zebra striping */
  parentRowIndex: number;
  /**
   * Precomputed once per physical gate pass in `expandGradingReportRows`.
   * Avoids repeating `aggregateOrderDetailsByCanonicalSize` on every accessor/cell render (major win for TanStack faceting + flexRender).
   */
  bagSizeAggregate: Map<CanonBagSize, GradingBagSizeAggregateCell>;
};
