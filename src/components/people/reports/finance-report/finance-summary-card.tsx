import { memo } from 'react';
import { IndianRupee, Sprout } from 'lucide-react';

import type { FinanceReportSummary } from './finance-calculations';

const MDASH = '—';

function formatIndianNumber(value: number, precision = 0): string {
  return value.toLocaleString('en-IN', {
    minimumFractionDigits: precision,
    maximumFractionDigits: precision,
  });
}

function formatAmount(value: number): string {
  return `₹${formatIndianNumber(value, 2)}`;
}

function formatPerAcre(value: number | null): string {
  if (value == null || !Number.isFinite(value)) return MDASH;
  return formatAmount(value);
}

export interface FinanceSummaryStatItemsProps {
  summary: FinanceReportSummary;
}

/** Net revenue and per-acre stats — matches accounting report meta card grid cells. */
function FinanceSummaryStatItems({ summary }: FinanceSummaryStatItemsProps) {
  return (
    <>
      <div className="border-border/50 bg-card rounded-xl border p-3">
        <p className="font-custom text-muted-foreground mb-1.5 flex items-center gap-1.5 text-xs font-medium tracking-wide uppercase">
          <IndianRupee className="h-3.5 w-3.5" aria-hidden />
          Net Revenue
        </p>
        <p className="font-custom text-foreground text-sm font-semibold tabular-nums">
          {formatAmount(summary.netRevenue)}
        </p>
      </div>
      <div className="border-border/50 bg-card rounded-xl border p-3">
        <p className="font-custom text-muted-foreground mb-1.5 flex items-center gap-1.5 text-xs font-medium tracking-wide uppercase">
          <Sprout className="h-3.5 w-3.5" aria-hidden />
          Net Amount Per Acre
        </p>
        <p className="font-custom text-foreground text-sm font-semibold tabular-nums">
          {formatPerAcre(summary.netAmountPerAcre)}
        </p>
        <p className="font-custom text-muted-foreground mt-1 text-xs leading-relaxed">
          {summary.totalAcresPlanted > 0
            ? `${formatIndianNumber(summary.totalAcresPlanted, 2)} acres planted`
            : 'No acres on record'}
        </p>
      </div>
    </>
  );
}

export default memo(FinanceSummaryStatItems);
