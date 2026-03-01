import { memo } from 'react';
import { ArrowUpFromLine, Layers } from 'lucide-react';
import type { DaybookEntrySummaries } from '@/types/daybook';

interface EntrySummariesBarProps {
  summaries: DaybookEntrySummaries | undefined;
}

const STAGES = [
  {
    key: 'totalBagsIncoming' as const,
    short: 'Inc',
    label: 'Incoming',
    icon: ArrowUpFromLine,
  },
  {
    key: 'totalBagsGraded' as const,
    short: 'Gra',
    label: 'Graded',
    icon: Layers,
  },
] as const;

const EntrySummariesBar = memo(function EntrySummariesBar({
  summaries,
}: EntrySummariesBarProps) {
  if (!summaries) return null;

  const hasAny = STAGES.some((s) => (summaries[s.key] ?? 0) > 0);
  if (!hasAny) return null;

  return (
    <div
      className="border-border/50 flex flex-wrap items-center gap-x-3 gap-y-2 border-t px-3 py-2 sm:px-4 sm:py-2.5"
      role="region"
      aria-label="Bag totals by stage"
    >
      <span className="font-custom text-muted-foreground text-xs font-medium sm:text-sm">
        Totals
      </span>
      <div className="font-custom flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs sm:gap-x-4">
        {STAGES.map((stage, idx) => {
          const value = summaries[stage.key] ?? 0;
          const Icon = stage.icon;
          return (
            <span
              key={stage.key}
              className="text-muted-foreground flex items-center gap-1.5"
            >
              {idx > 0 && (
                <span className="text-muted-foreground/50 pr-0.5" aria-hidden>
                  ·
                </span>
              )}
              <Icon
                className="text-muted-foreground/70 h-3.5 w-3.5 shrink-0"
                aria-hidden
              />
              <span className="hidden sm:inline">{stage.label}</span>
              <span className="sm:hidden">{stage.short}</span>
              <span className="text-foreground font-medium tabular-nums">
                {value.toLocaleString('en-IN')}
              </span>
            </span>
          );
        })}
      </div>
    </div>
  );
});

export default EntrySummariesBar;
