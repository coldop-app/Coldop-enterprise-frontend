import { memo } from 'react';
import { CalendarDays, FileText } from 'lucide-react';

import { MDASH } from './format-utils';
import FinanceSummaryStatItems from './finance-summary-card';
import type { FinanceReportSummary } from './finance-calculations';

export interface ReportMetaCardsProps {
  reportGeneratedOn: string;
  reportPeriodLabel: string;
  showSummary: boolean;
  summary: FinanceReportSummary;
}

function ReportMetaCards({
  reportGeneratedOn,
  reportPeriodLabel,
  showSummary,
  summary,
}: ReportMetaCardsProps) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <div className="border-border/50 bg-card rounded-xl border p-3">
        <p className="font-custom text-muted-foreground mb-1.5 flex items-center gap-1.5 text-xs font-medium tracking-wide uppercase">
          <CalendarDays className="h-3.5 w-3.5" />
          Generated On
        </p>
        <p className="font-custom text-foreground text-sm font-semibold">
          {reportGeneratedOn}
        </p>
      </div>
      <div className="border-border/50 bg-card rounded-xl border p-3">
        <p className="font-custom text-muted-foreground mb-1.5 flex items-center gap-1.5 text-xs font-medium tracking-wide uppercase">
          <FileText className="h-3.5 w-3.5" />
          Report Period
        </p>
        <p className="font-custom text-foreground text-sm font-semibold">
          {reportPeriodLabel}
        </p>
      </div>
      {showSummary ? (
        <FinanceSummaryStatItems summary={summary} />
      ) : (
        <>
          <div className="border-border/50 bg-card rounded-xl border p-3">
            <p className="font-custom text-muted-foreground mb-1.5 text-xs font-medium tracking-wide uppercase">
              Net Revenue
            </p>
            <p className="font-custom text-foreground text-sm font-semibold">
              {MDASH}
            </p>
          </div>
          <div className="border-border/50 bg-card rounded-xl border p-3">
            <p className="font-custom text-muted-foreground mb-1.5 text-xs font-medium tracking-wide uppercase">
              Net Amount Per Acre
            </p>
            <p className="font-custom text-foreground text-sm font-semibold">
              {MDASH}
            </p>
          </div>
        </>
      )}
    </div>
  );
}

export default memo(ReportMetaCards);
