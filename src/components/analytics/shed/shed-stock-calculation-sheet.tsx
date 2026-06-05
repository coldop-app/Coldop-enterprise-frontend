import { memo } from 'react';
import { Calculator, Equal, Minus, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Separator } from '@/components/ui/separator';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import type {
  CalculationBreakdown,
  FormulaTerm,
} from './shed-stock-calculation';

function formatBags(value: number): string {
  return value.toLocaleString('en-IN');
}

function OperatorIcon({ operator }: { operator?: '+' | '−' | '=' }) {
  if (operator === '+') {
    return <Plus className="size-3.5 shrink-0" aria-hidden />;
  }
  if (operator === '−') {
    return <Minus className="size-3.5 shrink-0" aria-hidden />;
  }
  if (operator === '=') {
    return <Equal className="size-3.5 shrink-0" aria-hidden />;
  }
  return null;
}

function FormulaTermRow({
  term,
  isFirst,
}: {
  term: FormulaTerm;
  isFirst: boolean;
}) {
  const isResult = term.variant === 'result';
  const showOperator = !isFirst || term.operator === '=';

  return (
    <div
      className={cn(
        'flex items-center gap-3 rounded-lg px-3 py-2.5 transition-colors duration-200',
        isResult
          ? 'bg-primary/10 ring-primary/20 ring-1'
          : term.variant === 'positive'
            ? 'bg-primary/5'
            : term.variant === 'negative'
              ? 'bg-destructive/5'
              : 'bg-muted/50'
      )}
    >
      <div
        className={cn(
          'flex size-7 shrink-0 items-center justify-center rounded-full',
          isResult
            ? 'bg-primary text-primary-foreground'
            : term.variant === 'positive'
              ? 'bg-primary/15 text-primary'
              : term.variant === 'negative'
                ? 'bg-destructive/15 text-destructive'
                : 'bg-muted text-muted-foreground'
        )}
      >
        {showOperator ? <OperatorIcon operator={term.operator} /> : null}
      </div>
      <div className="min-w-0 flex-1">
        <p
          className={cn(
            'font-custom text-sm',
            isResult ? 'text-primary font-bold' : 'text-foreground font-medium'
          )}
        >
          {term.label}
        </p>
      </div>
      <p
        className={cn(
          'font-custom shrink-0 tabular-nums',
          isResult
            ? 'text-primary text-base font-bold'
            : 'text-foreground text-sm font-semibold'
        )}
      >
        {formatBags(term.value)}
      </p>
    </div>
  );
}

function BreakdownSection({
  breakdown,
  highlight = false,
}: {
  breakdown: CalculationBreakdown;
  highlight?: boolean;
}) {
  return (
    <section className="space-y-3">
      <div>
        <h3
          className={cn(
            'font-custom text-sm font-semibold',
            highlight ? 'text-primary' : 'text-foreground'
          )}
        >
          {breakdown.title}
        </h3>
        <p className="font-custom text-muted-foreground mt-0.5 text-xs">
          {breakdown.subtitle}
        </p>
      </div>

      <div className="bg-muted/30 border-border rounded-xl border p-4">
        <p className="font-custom text-muted-foreground text-[10px] font-medium tracking-wide uppercase">
          Result
        </p>
        <p className="font-custom text-primary mt-1 text-3xl font-bold tabular-nums">
          {formatBags(breakdown.result)}
          <span className="text-muted-foreground ml-2 text-sm font-medium">
            bags
          </span>
        </p>
      </div>

      <div className="space-y-1.5">
        {breakdown.terms.map((term, index) => (
          <FormulaTermRow
            key={`${term.label}-${index}`}
            term={term}
            isFirst={index === 0}
          />
        ))}
      </div>

      {breakdown.notes.length > 0 && (
        <ul className="space-y-1.5">
          {breakdown.notes.map((note) => (
            <li
              key={note}
              className="font-custom text-muted-foreground text-xs leading-relaxed"
            >
              {note}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

export interface ShedStockCalculationSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  cellBreakdown: CalculationBreakdown | null;
  overallBreakdown: CalculationBreakdown | null;
  metricLabel: string;
}

const ShedStockCalculationSheet = ({
  open,
  onOpenChange,
  cellBreakdown,
  overallBreakdown,
  metricLabel,
}: ShedStockCalculationSheetProps) => {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="font-custom w-full overflow-y-auto sm:max-w-md"
      >
        <SheetHeader className="border-border border-b pb-4">
          <div className="flex items-center gap-2">
            <div className="bg-primary/10 text-primary flex size-9 items-center justify-center rounded-lg">
              <Calculator className="size-4" aria-hidden />
            </div>
            <div>
              <SheetTitle className="font-custom text-left text-lg font-bold">
                Calculation Breakdown
              </SheetTitle>
              <SheetDescription className="font-custom text-left">
                {metricLabel} — how this value is derived
              </SheetDescription>
            </div>
          </div>
        </SheetHeader>

        <div className="flex flex-col gap-6 px-4 pb-6">
          {cellBreakdown ? (
            <BreakdownSection breakdown={cellBreakdown} highlight />
          ) : (
            <p className="font-custom text-muted-foreground text-sm">
              Select a cell to view its calculation.
            </p>
          )}

          {overallBreakdown && cellBreakdown && (
            <>
              <Separator />
              <BreakdownSection breakdown={overallBreakdown} />
            </>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default memo(ShedStockCalculationSheet);
