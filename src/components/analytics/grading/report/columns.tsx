import type {
  GradingGatePass,
  GradingGatePassIncomingRef,
} from '@/types/grading-gate-pass';

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
};
