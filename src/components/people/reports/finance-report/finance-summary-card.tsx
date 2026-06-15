import { memo } from 'react';
import { IndianRupee, Sprout } from 'lucide-react';

import type {
  FinanceReportSummary,
  FinanceVarietySummary,
} from './finance-calculations';
import {
  formatAmount,
  formatIndianNumber,
  formatPerAcre,
} from './format-utils';

export interface FinanceSummaryStatItemsProps {
  summary: FinanceReportSummary;
  varietySummaries: FinanceVarietySummary[];
}

function VarietyBreakdownList({
  items,
  formatValue,
  formatSubtext,
}: {
  items: FinanceVarietySummary[];
  formatValue: (item: FinanceVarietySummary) => string;
  formatSubtext?: (item: FinanceVarietySummary) => string | null;
}) {
  if (items.length === 0) return null;

  return (
    <ul className="border-border/50 mt-2 space-y-1.5 border-t pt-2">
      {items.map((item) => {
        const subtext = formatSubtext?.(item);

        return (
          <li key={item.varietyKey}>
            <div className="flex items-baseline justify-between gap-2">
              <span className="font-custom text-muted-foreground min-w-0 truncate text-xs">
                {item.varietyLabel}
              </span>
              <span className="font-custom text-foreground shrink-0 text-xs font-medium tabular-nums">
                {formatValue(item)}
              </span>
            </div>
            {subtext ? (
              <p className="font-custom text-muted-foreground mt-0.5 text-[11px] leading-relaxed">
                {subtext}
              </p>
            ) : null}
          </li>
        );
      })}
    </ul>
  );
}

function FinanceSummaryStatItems({
  summary,
  varietySummaries,
}: FinanceSummaryStatItemsProps) {
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
        <VarietyBreakdownList
          items={varietySummaries}
          formatValue={(item) => formatAmount(item.netRevenue)}
        />
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
        <VarietyBreakdownList
          items={varietySummaries}
          formatValue={(item) => formatPerAcre(item.netAmountPerAcre)}
          formatSubtext={(item) =>
            item.totalAcresPlanted > 0
              ? `${formatIndianNumber(item.totalAcresPlanted, 2)} acres`
              : 'No acres on record'
          }
        />
      </div>
    </>
  );
}

export default memo(FinanceSummaryStatItems);
