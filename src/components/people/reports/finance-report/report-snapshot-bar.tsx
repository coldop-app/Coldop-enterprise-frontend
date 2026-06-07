import { memo } from 'react';

import type { FinanceReportRowStats } from './finance-calculations';

export interface ReportSnapshotBarProps {
  rowStats: FinanceReportRowStats;
}

function ReportSnapshotBar({ rowStats }: ReportSnapshotBarProps) {
  return (
    <div className="border-border/50 bg-secondary/30 font-custom text-muted-foreground rounded-xl border px-3 py-3 text-sm sm:px-4">
      <span className="text-foreground font-semibold">Report snapshot</span>
      <span className="text-border mx-2">&middot;</span>
      Varieties:{' '}
      <span className="text-foreground font-medium tabular-nums">
        {rowStats.varieties}
      </span>
      <span className="text-border mx-2">&middot;</span>
      Planting rows:{' '}
      <span className="text-foreground font-medium tabular-nums">
        {rowStats.planting}
      </span>
      <span className="text-border mx-2">&middot;</span>
      Grading rows:{' '}
      <span className="text-foreground font-medium tabular-nums">
        {rowStats.grading}
      </span>
    </div>
  );
}

export default memo(ReportSnapshotBar);
