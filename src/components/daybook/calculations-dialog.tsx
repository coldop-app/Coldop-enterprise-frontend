import { formatNumber } from './grading-calculations';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';
import {
  Boxes,
  Calculator,
  ClipboardList,
  Divide,
  Package,
  Scale,
} from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export interface CalculationsSummary {
  incomingNetProductKg: number;
  totalGradedNetKg: number;
  wastageKg: number;
  totalGradedPct: number;
  wastagePct: number;
}

interface IncomingTotals {
  totalBags: number;
  totalGrossKg: number;
  totalTareKg: number;
  totalBardanaKg: number;
  totalNetProductKg: number;
}

interface GradingRow {
  size?: string;
  bagType?: string;
  initialQuantity?: number;
  weightPerBagKg?: number;
  bagWt?: number;
  grossKg?: number;
  deductionKg?: number;
  netKg?: number;
}

interface GradingTotals {
  totalInitial: number;
  totalGrossKg: number;
  totalDeductionKg: number;
  totalNetKg: number;
}

interface CalculationsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** JUTE / LENO kg per bag from cold storage preferences (or defaults). */
  bagWeights: Record<string, number>;
  summary?: CalculationsSummary;
  incomingTotals?: IncomingTotals;
  gradingRows?: GradingRow[];
  gradingTotals?: GradingTotals;
}

function FormulaCard({
  title,
  detail,
  lines,
}: {
  title: string;
  detail: string;
  lines: string[];
}) {
  return (
    <div className="border-border/60 bg-muted/25 flex flex-col gap-3 rounded-lg border p-4">
      <div className="flex flex-col gap-1">
        <p className="text-foreground font-custom text-xs font-semibold">
          {title}
        </p>
        <p className="text-muted-foreground font-custom text-xs leading-relaxed">
          {detail}
        </p>
      </div>
      <div className="bg-muted/60 border-border/40 flex flex-col gap-2 rounded-md border px-3 py-2.5">
        {lines.map((line) => (
          <span
            key={line}
            className="text-foreground font-custom text-[11px] leading-snug tracking-tight md:text-xs"
          >
            {line}
          </span>
        ))}
      </div>
    </div>
  );
}

function ValueRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="border-border/60 bg-background flex items-center justify-between gap-4 rounded-md border px-3 py-2.5">
      <span className="text-muted-foreground font-custom text-[11px] font-medium tracking-wide uppercase">
        {label}
      </span>
      <span className="text-foreground font-custom text-sm font-semibold tabular-nums">
        {value}
      </span>
    </div>
  );
}

export function CalculationsDialog({
  open,
  onOpenChange,
  bagWeights,
  summary,
  incomingTotals,
  gradingRows,
  gradingTotals,
}: CalculationsDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="font-custom gap-0 p-0 sm:max-w-2xl">
        <DialogHeader className="border-border/50 shrink-0 border-b px-6 pt-6 pb-4">
          <div className="flex items-start gap-3">
            <div className="bg-primary/12 border-primary/20 flex size-11 shrink-0 items-center justify-center rounded-lg border">
              <Calculator className="text-primary size-5" aria-hidden />
            </div>
            <div className="flex flex-col gap-2 text-left">
              <DialogTitle className="font-custom text-xl font-semibold tracking-tight">
                Grading gate pass calculations
              </DialogTitle>
              <DialogDescription className="font-custom text-muted-foreground text-sm leading-relaxed">
                The figures on this voucher follow two stages: netting product
                weight from incoming gate passes, then splitting that product
                across graded bags and reconciling wastage.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="flex max-h-[min(70vh,32rem)] flex-col gap-6 overflow-y-auto px-6 py-5">
          <section className="flex flex-col gap-4">
            <div className="flex items-center gap-2">
              <Package className="text-primary size-4 shrink-0" aria-hidden />
              <h4 className="text-foreground font-custom text-sm font-semibold">
                Standard bag weights
              </h4>
            </div>
            <p className="text-muted-foreground font-custom text-xs leading-relaxed">
              Empty bag weight (
              <span className="text-foreground font-medium">bardana</span>)
              comes from cold storage preferences (
              <span className="text-foreground font-medium">bagConfig</span>),
              so the whole daybook stays aligned with what you configured in
              Settings.
            </p>
            <div className="flex flex-wrap gap-2">
              <div className="border-border/60 bg-background flex items-center gap-2 rounded-md border px-3 py-2">
                <span className="text-muted-foreground font-custom text-[10px] font-medium tracking-wide uppercase">
                  JUTE
                </span>
                <span className="text-foreground font-custom text-sm font-semibold tabular-nums">
                  {formatNumber(bagWeights.JUTE ?? 0)}&nbsp;kg / bag
                </span>
              </div>
              <div className="border-border/60 bg-background flex items-center gap-2 rounded-md border px-3 py-2">
                <span className="text-muted-foreground font-custom text-[10px] font-medium tracking-wide uppercase">
                  LENO
                </span>
                <span className="text-foreground font-custom text-sm font-semibold tabular-nums">
                  {formatNumber(bagWeights.LENO ?? 0)}&nbsp;kg / bag
                </span>
              </div>
            </div>
          </section>

          <Separator className="bg-border/70" />

          <Tabs defaultValue="step-1" className="gap-4">
            <TabsList className="w-full">
              <TabsTrigger value="step-1" className="font-custom text-xs">
                Step 1: Incoming
              </TabsTrigger>
              <TabsTrigger value="step-2" className="font-custom text-xs">
                Step 2: Grading
              </TabsTrigger>
              <TabsTrigger value="step-3" className="font-custom text-xs">
                Step 3: Wastage
              </TabsTrigger>
            </TabsList>

            <TabsContent value="step-1" className="flex flex-col gap-4">
              <section className="flex flex-col gap-4">
                <div className="flex items-center gap-2">
                  <Scale className="text-primary size-4 shrink-0" aria-hidden />
                  <h4 className="text-foreground font-custom text-sm font-semibold">
                    Incoming net product calculations
                  </h4>
                </div>
                <p className="text-muted-foreground font-custom text-xs leading-relaxed">
                  Each linked incoming gate pass reads gross and tare from the
                  slip, derives base net weight, then subtracts bardana.
                  Incoming sacks are treated as{' '}
                  <span className="text-foreground font-medium">jute</span> at
                  the documented constant per bag.
                </p>
                <FormulaCard
                  title="Per incoming gate pass"
                  detail="Rows are totaled after these quantities are computed."
                  lines={[
                    'base net (kg) = gross − tare',
                    `bardana (kg) = bags received × ${formatNumber(bagWeights.JUTE ?? 0)}`,
                    'net product (kg) = base net − bardana',
                  ]}
                />
                <FormulaCard
                  title="Totals across incoming passes"
                  detail="Feeds the denominator used for graded output percentages and wastage later."
                  lines={[
                    'total gross / tare / bags = sums of respective columns',
                    'total bardana = sum of bags × jute bag weight',
                    'total net product = (sum of gross − sum of tare) − total bardana',
                  ]}
                />
                {summary ? (
                  <div className="border-primary/25 bg-primary/5 flex flex-col gap-2 rounded-lg border p-3">
                    <ValueRow
                      label="Incoming net product"
                      value={`${formatNumber(summary.incomingNetProductKg)} kg`}
                    />
                    {incomingTotals ? (
                      <div className="bg-background/70 border-border/60 rounded-md border p-2.5">
                        <p className="text-foreground font-custom text-xs leading-relaxed">
                          Total net product = (Gross − Tare) − Bardana = (
                          {formatNumber(incomingTotals.totalGrossKg)} −{' '}
                          {formatNumber(incomingTotals.totalTareKg)}) −{' '}
                          {formatNumber(incomingTotals.totalBardanaKg)} ={' '}
                          {formatNumber(incomingTotals.totalNetProductKg)} kg
                        </p>
                      </div>
                    ) : null}
                  </div>
                ) : null}
              </section>
            </TabsContent>

            <TabsContent value="step-2" className="flex flex-col gap-4">
              <section className="flex flex-col gap-4">
                <div className="flex items-center gap-2">
                  <Boxes className="text-primary size-4 shrink-0" aria-hidden />
                  <h4 className="text-foreground font-custom text-sm font-semibold">
                    Grading calculations
                  </h4>
                </div>
                <p className="text-muted-foreground font-custom text-xs leading-relaxed">
                  Each graded line multiplies quantity by declared
                  weight-per-bag for gross sack weight, then deducts bardana
                  using the mapped constant for{' '}
                  <span className="font-medium">JUTE</span> versus{' '}
                  <span className="font-medium">LENO</span>.
                </p>
                <FormulaCard
                  title="Per size / bag-type line"
                  detail="Totals roll up across lines into the graded net used for wastage and yield percentages."
                  lines={[
                    'bag wt (constant) = mapped value for bag type (JUTE / LENO)',
                    'gross (kg) = initial quantity × weight per bag',
                    'deduction (kg) = quantity × bag wt',
                    'net (kg) = gross − deduction',
                  ]}
                />
                {gradingRows?.length ? (
                  <div className="flex flex-col gap-2.5">
                    <p className="text-foreground font-custom text-xs font-semibold">
                      Per row worked calculations
                    </p>
                    {gradingRows.map((row, index) => {
                      const qty = row.initialQuantity ?? 0;
                      const wtPerBag = row.weightPerBagKg ?? 0;
                      const bagWt = row.bagWt ?? 0;
                      const gross = row.grossKg ?? qty * wtPerBag;
                      const deduction = row.deductionKg ?? qty * bagWt;
                      const net = row.netKg ?? gross - deduction;
                      const bagType = (row.bagType ?? '').toUpperCase();
                      const rowLabel = row.size
                        ? `${row.size}`
                        : `Row ${index + 1}`;

                      return (
                        <div
                          key={`${rowLabel}-${bagType}-${index}`}
                          className="border-border/60 bg-muted/25 rounded-lg border p-3"
                        >
                          <p className="text-foreground font-custom text-xs font-semibold">
                            Row {index + 1} — {rowLabel} ({bagType || '—'})
                          </p>
                          <p className="text-muted-foreground font-custom mt-1 text-xs leading-relaxed">
                            Line gross = {formatNumber(qty)} ×{' '}
                            {formatNumber(wtPerBag)} = {formatNumber(gross)} kg.
                            Bag deduction = {formatNumber(qty)} ×{' '}
                            {formatNumber(bagWt)} ({bagType || 'BAG'}) ={' '}
                            {formatNumber(deduction)} kg. Line product ={' '}
                            {formatNumber(gross)} − {formatNumber(deduction)} ={' '}
                            {formatNumber(net)} kg.
                          </p>
                        </div>
                      );
                    })}
                  </div>
                ) : null}
                {summary ? (
                  <div className="border-primary/25 bg-primary/5 flex flex-col gap-2 rounded-lg border p-3">
                    <ValueRow
                      label="Total graded net"
                      value={`${formatNumber(summary.totalGradedNetKg)} kg`}
                    />
                    <ValueRow
                      label="Graded vs incoming"
                      value={`${formatNumber(summary.totalGradedPct)}%`}
                    />
                    {gradingTotals ? (
                      <div className="bg-background/70 border-border/60 rounded-md border p-2.5">
                        <p className="text-foreground font-custom text-xs leading-relaxed">
                          Total graded product = Total gross − Total bag
                          deduction = {formatNumber(gradingTotals.totalGrossKg)}{' '}
                          − {formatNumber(gradingTotals.totalDeductionKg)} ={' '}
                          {formatNumber(gradingTotals.totalNetKg)} kg (Total
                          bags: {formatNumber(gradingTotals.totalInitial)})
                        </p>
                      </div>
                    ) : null}
                  </div>
                ) : null}
              </section>
            </TabsContent>

            <TabsContent value="step-3" className="flex flex-col gap-4">
              <section className="flex flex-col gap-4">
                <div className="flex items-center gap-2">
                  <Divide
                    className="text-primary size-4 shrink-0"
                    aria-hidden
                  />
                  <h4 className="text-foreground font-custom text-sm font-semibold">
                    Final wastage calculations
                  </h4>
                </div>
                <FormulaCard
                  title="After graded nets are summed"
                  detail="Line weight % compares each graded line's net to total graded net; yield and wastage compare total graded net to incoming net product."
                  lines={[
                    'weight % (line vs graded) = line net ÷ total graded net × 100',
                    'wastage (kg) = max(0, incoming net product − Σ line nets)',
                    'graded yield % = total graded net ÷ incoming net product × 100',
                    'wastage % = wastage ÷ incoming net product × 100',
                  ]}
                />
                {summary ? (
                  <div className="border-primary/25 bg-primary/5 flex flex-col gap-2 rounded-lg border p-3">
                    <ValueRow
                      label="Final wastage"
                      value={`${formatNumber(summary.wastageKg)} kg`}
                    />
                    <ValueRow
                      label="Wastage percentage"
                      value={`${formatNumber(summary.wastagePct)}%`}
                    />
                    <div className="bg-background/70 border-border/60 rounded-md border p-2.5">
                      <p className="text-foreground font-custom text-xs leading-relaxed">
                        Wastage (kg) = Incoming net product − Total graded
                        product = {formatNumber(summary.incomingNetProductKg)} −{' '}
                        {formatNumber(summary.totalGradedNetKg)} ={' '}
                        {formatNumber(summary.wastageKg)} kg. Wastage % ={' '}
                        {formatNumber(summary.wastageKg)} ÷{' '}
                        {formatNumber(summary.incomingNetProductKg)} × 100 ={' '}
                        {formatNumber(summary.wastagePct)}%.
                      </p>
                    </div>
                  </div>
                ) : null}
              </section>
            </TabsContent>
          </Tabs>

          <Separator className="bg-border/70" />

          <section className="flex flex-col gap-4">
            <div className="flex items-center gap-2">
              <ClipboardList
                className="text-primary size-4 shrink-0"
                aria-hidden
              />
              <h4 className="text-foreground font-custom text-sm font-semibold">
                Display & rounding
              </h4>
            </div>
            <p className="text-muted-foreground font-custom text-xs leading-relaxed">
              Values round to at most two decimal places using a small epsilon
              guard against floating-point drift. Display uses Indian digit
              grouping (<span className="font-medium">en-IN</span>).
            </p>
          </section>

          {summary ? (
            <>
              <Separator className="bg-border/70" />
              <div className="border-primary/25 bg-primary/5 flex flex-col gap-4 rounded-xl border px-4 py-4">
                <div className="flex flex-col gap-1">
                  <p className="text-primary text-xs font-semibold tracking-wide uppercase">
                    This voucher (snapshot)
                  </p>
                  <p className="text-muted-foreground font-custom text-xs leading-relaxed">
                    Using the same inputs as above for the totals currently on
                    screen.
                  </p>
                </div>
                <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div className="flex flex-col gap-0.5">
                    <dt className="text-muted-foreground text-[10px] font-medium tracking-wide uppercase">
                      Incoming net product
                    </dt>
                    <dd className="text-foreground text-sm font-semibold tabular-nums">
                      {formatNumber(summary.incomingNetProductKg)} kg
                    </dd>
                  </div>
                  <div className="flex flex-col gap-0.5">
                    <dt className="text-muted-foreground text-[10px] font-medium tracking-wide uppercase">
                      Total graded net
                    </dt>
                    <dd className="text-foreground text-sm font-semibold tabular-nums">
                      {formatNumber(summary.totalGradedNetKg)} kg
                    </dd>
                  </div>
                  <div className="flex flex-col gap-0.5">
                    <dt className="text-muted-foreground text-[10px] font-medium tracking-wide uppercase">
                      Graded vs incoming
                    </dt>
                    <dd className="text-foreground text-sm font-semibold tabular-nums">
                      {formatNumber(summary.totalGradedPct)}%
                    </dd>
                  </div>
                  <div className="flex flex-col gap-0.5">
                    <dt className="text-muted-foreground text-[10px] font-medium tracking-wide uppercase">
                      Grading wastage
                    </dt>
                    <dd className="text-foreground text-sm font-semibold tabular-nums">
                      {formatNumber(summary.wastageKg)} kg (
                      {formatNumber(summary.wastagePct)}%)
                    </dd>
                  </div>
                </dl>
              </div>
            </>
          ) : null}
        </div>

        <DialogFooter className="border-border/50 shrink-0 border-t px-6 py-4">
          <DialogClose asChild>
            <Button
              variant="outline"
              className="font-custom focus-visible:ring-primary px-6 font-medium duration-200 ease-in-out focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
            >
              Close
            </Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
