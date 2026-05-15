import type { ReactNode } from 'react';

import {
  formatNumber,
  getAverageQuintalPerAcreBreakdown,
  getBuyBackAmountBreakdown,
  getGradeWeightPercentBreakdown,
  getNetAmountPerAcreBreakdown,
  getOutputPercentageBreakdown,
  getSeedAmountBreakdown,
  getWastageKgBreakdown,
} from './contract-farming-report-calculations';
import type { ContractFarmingMetricCalculation } from './contract-farming-metric-types';
import {
  CalculationIssueBanner,
  CalculationResultBox,
  FarmerVarietyContext,
  FormulaCard,
  ValueRow,
} from './report-calculation-dialog-shared';
import type { FlattenedRow } from './types';
import { formatContractFarmingGradeColumnLabel } from './view-filters-sheet/constants';
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
import { Calculator, Divide, IndianRupee, Percent, Scale } from 'lucide-react';

interface ContractFarmingMetricCalculationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  row: FlattenedRow;
  metric: ContractFarmingMetricCalculation;
}

function metricDialogMeta(metric: ContractFarmingMetricCalculation): {
  title: string;
  description: string;
} {
  switch (metric.type) {
    case 'averageQuintalPerAcre':
      return {
        title: 'Average quintal per acre',
        description:
          'Graded output in quintals divided by total planted acres for this farmer × variety.',
      };
    case 'gradeWeightPercent':
      return {
        title: `${formatContractFarmingGradeColumnLabel(metric.grade)} weight %`,
        description:
          'Share of total graded net weight (kg) attributed to this grade or size group.',
      };
    case 'wastage':
      return {
        title: 'Wastage (kg)',
        description:
          'Inbound net weight minus total graded net weight after grading.',
      };
    case 'outputPercentage':
      return {
        title: 'Output percentage',
        description:
          'Graded net weight as a percentage of inbound net weight (buy-back or incoming).',
      };
    case 'buyBackAmount':
      return {
        title: 'Buy back amount',
        description:
          'Sum of graded net kg × buy-back rate per grade from cold storage preferences.',
      };
    case 'seedAmount':
      return {
        title: 'Seed amount',
        description:
          'Seed amount payable for this size line on the contract-farming report.',
      };
    case 'netAmountPerAcre':
      return {
        title: 'Net amount per acre',
        description:
          'Net amount (buy-back minus variety seed total) divided by variety total planted acres.',
      };
  }
}

function ContributorsTable({
  title,
  rows,
  totalLabel,
  totalValue,
}: {
  title: string;
  rows: { key: string; label: string; value: string }[];
  totalLabel: string;
  totalValue: string;
}) {
  if (rows.length === 0) return null;

  return (
    <section className="flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <Scale className="text-primary size-4 shrink-0" aria-hidden />
        <h4 className="text-foreground font-custom text-sm font-semibold">
          {title}
        </h4>
      </div>
      <div className="border-border/60 overflow-hidden rounded-lg border">
        <table className="w-full text-left">
          <thead>
            <tr className="bg-muted/40 border-border/60 border-b">
              <th className="text-muted-foreground font-custom px-3 py-2 text-[10px] font-medium tracking-wide uppercase">
                Grade
              </th>
              <th className="text-muted-foreground font-custom px-3 py-2 text-right text-[10px] font-medium tracking-wide uppercase">
                Net (kg)
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr
                key={row.key}
                className="border-border/40 border-b last:border-b-0"
              >
                <td className="text-foreground font-custom px-3 py-2 text-xs">
                  {row.label}
                </td>
                <td className="text-foreground font-custom px-3 py-2 text-right text-xs font-medium tabular-nums">
                  {row.value}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="bg-muted/30">
              <td className="text-foreground font-custom px-3 py-2.5 text-xs font-semibold">
                {totalLabel}
              </td>
              <td className="text-foreground font-custom px-3 py-2.5 text-right text-xs font-semibold tabular-nums">
                {totalValue}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </section>
  );
}

function MetricBreakdownBody({
  row,
  metric,
}: {
  row: FlattenedRow;
  metric: ContractFarmingMetricCalculation;
}) {
  switch (metric.type) {
    case 'averageQuintalPerAcre':
      return <AverageQuintalPerAcreBody row={row} />;
    case 'gradeWeightPercent':
      return <GradeWeightPercentBody row={row} grade={metric.grade} />;
    case 'wastage':
      return <WastageBody row={row} />;
    case 'outputPercentage':
      return <OutputPercentageBody row={row} />;
    case 'buyBackAmount':
      return <BuyBackAmountBody row={row} />;
    case 'seedAmount':
      return <SeedAmountBody row={row} />;
    case 'netAmountPerAcre':
      return <NetAmountPerAcreBody row={row} />;
  }
}

function AverageQuintalPerAcreBody({ row }: { row: FlattenedRow }) {
  const b = getAverageQuintalPerAcreBreakdown(row);
  const acresLabel =
    b.varietyTotalAcres > 0 ? formatNumber(b.varietyTotalAcres) : '—';
  const resultLabel =
    b.result !== null ? `${formatNumber(b.result)} q/ac` : '—';

  return (
    <MetricBodyShell>
      <FarmerVarietyContext context={b} />
      {b.issue === 'no_graded_weight' ? (
        <CalculationIssueBanner message="Needs positive graded net weight (kg) across all grades for this farmer × variety." />
      ) : null}
      {b.issue === 'no_acres' ? (
        <CalculationIssueBanner message="Needs variety total planted acres greater than zero." />
      ) : null}
      <ContributorsTable
        title="Graded net weight by grade"
        rows={b.gradeLines.map((line) => ({
          key: line.grade,
          label: formatContractFarmingGradeColumnLabel(line.grade),
          value: formatNumber(line.netWeightKg),
        }))}
        totalLabel="Total"
        totalValue={formatNumber(b.totalNetWeightKg)}
      />
      <FormulaSection
        cards={[
          {
            title: 'Step 1 — Total graded net weight',
            detail:
              'Sum net weight (kg) from every grade column for this farmer × variety.',
            lines: [`Total = ${formatNumber(b.totalNetWeightKg)} kg`],
          },
          {
            title: 'Step 2 — Convert to quintals',
            detail: 'One quintal = 100 kg.',
            lines: [
              `${formatNumber(b.totalNetWeightKg)} kg ÷ 100 = ${formatNumber(b.quintals)} q`,
            ],
          },
          {
            title: 'Step 3 — Divide by variety total acres',
            detail:
              'Uses total planted acres for the variety (all seed sizes).',
            lines: [
              `Variety total acres = ${acresLabel}`,
              b.result !== null
                ? `${formatNumber(b.quintals)} q ÷ ${acresLabel} acres = ${formatNumber(b.result)} q/ac`
                : `Cannot divide when acres are missing or zero.`,
            ],
          },
        ]}
      />
      <CalculationResultBox
        label="Result"
        value={resultLabel}
        hint='Same value as the "Average Quintal Per Acre" column for this row.'
      />
    </MetricBodyShell>
  );
}

function GradeWeightPercentBody({
  row,
  grade,
}: {
  row: FlattenedRow;
  grade: string;
}) {
  const b = getGradeWeightPercentBreakdown(row, grade);
  const gradeLabel = formatContractFarmingGradeColumnLabel(b.gradeHeader);
  const resultLabel = b.result !== null ? `${formatNumber(b.result, 2)}%` : '—';

  return (
    <MetricBodyShell>
      <FarmerVarietyContext context={b} />
      {b.issue === 'no_total_weight' ? (
        <CalculationIssueBanner message="Weight % needs positive total graded net weight (kg) for this farmer × variety." />
      ) : null}
      <ContributorsTable
        title={`${gradeLabel} net weight (contributing grades)`}
        rows={b.contributors.map((line) => ({
          key: line.grade,
          label: formatContractFarmingGradeColumnLabel(line.grade),
          value: formatNumber(line.netWeightKg),
        }))}
        totalLabel={`${gradeLabel} total`}
        totalValue={formatNumber(b.gradeNetWeightKg)}
      />
      <FormulaSection
        cards={[
          {
            title: 'Step 1 — Grade net weight',
            detail:
              b.contributors.length > 1
                ? 'Grouped column: sum of net weights for all sizes in this range.'
                : 'Net weight (kg) for this grade from grading data.',
            lines: [
              `${gradeLabel} net = ${formatNumber(b.gradeNetWeightKg)} kg`,
            ],
          },
          {
            title: 'Step 2 — Total graded net weight',
            detail: 'Denominator is the sum of net weight across all grades.',
            lines: [
              `Total graded net = ${formatNumber(b.totalNetWeightKg)} kg`,
            ],
          },
          {
            title: 'Step 3 — Weight percentage',
            detail: 'Grade share of total graded output.',
            lines: [
              `${gradeLabel} % = (${formatNumber(b.gradeNetWeightKg)} ÷ ${formatNumber(b.totalNetWeightKg)}) × 100`,
              b.result !== null
                ? `${gradeLabel} % = ${formatNumber(b.result, 2)}%`
                : 'Cannot compute when total graded net weight is zero.',
            ],
          },
        ]}
      />
      <CalculationResultBox
        label="Result"
        value={resultLabel}
        hint={`Same value as the "${gradeLabel} %" column for this row.`}
      />
    </MetricBodyShell>
  );
}

function inboundSourceLabel(source: 'buyBack' | 'incoming' | null): string {
  if (source === 'buyBack') return 'Buy-back net weight (kg)';
  if (source === 'incoming') return 'Incoming net weight (kg)';
  return 'Inbound net weight';
}

function WastageBody({ row }: { row: FlattenedRow }) {
  const b = getWastageKgBreakdown(row);
  const resultLabel = b.result !== null ? `${formatNumber(b.result)} kg` : '—';

  return (
    <MetricBodyShell>
      <FarmerVarietyContext context={b} />
      {b.issue === 'no_inbound' ? (
        <CalculationIssueBanner message="Wastage needs buy-back net weight or incoming net weight on the report row." />
      ) : null}
      <FormulaSection
        cards={[
          {
            title: 'Step 1 — Inbound net weight',
            detail:
              'Uses buy-back net weight when present; otherwise incoming net weight (same baseline as output %).',
            lines: [
              b.inboundKg !== null
                ? `${inboundSourceLabel(b.inboundSource)} = ${formatNumber(b.inboundKg)} kg`
                : 'No inbound net weight available',
            ],
          },
          {
            title: 'Step 2 — Total graded net weight',
            detail: 'Sum of net weight (kg) after grading across all grades.',
            lines: [`Total graded net = ${formatNumber(b.totalGradedKg)} kg`],
          },
          {
            title: 'Step 3 — Wastage',
            detail: 'Inbound minus graded net (kg).',
            lines: [
              b.inboundKg !== null
                ? `Wastage = ${formatNumber(b.inboundKg)} − ${formatNumber(b.totalGradedKg)} kg`
                : 'Wastage = inbound − graded net',
              b.result !== null
                ? `Wastage = ${formatNumber(b.result)} kg`
                : 'Cannot compute without inbound net weight.',
            ],
          },
        ]}
      />
      <CalculationResultBox
        label="Result"
        value={resultLabel}
        hint='Same value as the "Wastage (kg)" column for this row.'
      />
    </MetricBodyShell>
  );
}

function OutputPercentageBody({ row }: { row: FlattenedRow }) {
  const b = getOutputPercentageBreakdown(row);
  const resultLabel = b.result !== null ? `${formatNumber(b.result, 2)}%` : '—';

  return (
    <MetricBodyShell>
      <FarmerVarietyContext context={b} />
      {b.issue === 'no_inbound' ? (
        <CalculationIssueBanner message="Output % needs positive buy-back or incoming net weight on the report row." />
      ) : null}
      <FormulaSection
        cards={[
          {
            title: 'Step 1 — Inbound net weight',
            detail: inboundSourceLabel(b.inboundSource),
            lines: [
              b.inboundKg !== null && b.inboundKg > 0
                ? `${formatNumber(b.inboundKg)} kg`
                : 'No positive inbound net weight',
            ],
          },
          {
            title: 'Step 2 — Total graded net weight',
            detail: 'Sum of net weight (kg) after grading.',
            lines: [`Total graded net = ${formatNumber(b.totalGradedKg)} kg`],
          },
          {
            title: 'Step 3 — Output percentage',
            detail: 'Graded net as a percentage of inbound net.',
            lines: [
              b.inboundKg !== null && b.inboundKg > 0
                ? `Output % = (${formatNumber(b.totalGradedKg)} ÷ ${formatNumber(b.inboundKg)}) × 100`
                : 'Output % = (graded net ÷ inbound net) × 100',
              b.result !== null
                ? `Output % = ${formatNumber(b.result, 2)}%`
                : 'Cannot compute without positive inbound net weight.',
            ],
          },
        ]}
      />
      <CalculationResultBox
        label="Result"
        value={resultLabel}
        hint='Same value as the "Output Percentage" column for this row.'
      />
    </MetricBodyShell>
  );
}

function BuyBackAmountBody({ row }: { row: FlattenedRow }) {
  const b = getBuyBackAmountBreakdown(row);
  const resultLabel = b.result !== null ? `₹${formatNumber(b.result)}` : '—';

  return (
    <MetricBodyShell>
      <FarmerVarietyContext context={b} />
      {b.issue === 'no_graded_weight' ? (
        <CalculationIssueBanner message="Buy-back amount needs positive graded net weight on at least one grade." />
      ) : null}
      {b.issue === 'missing_rate' ? (
        <CalculationIssueBanner message="A buy-back rate is missing in cold storage preferences (custom.buyBackCost) for this variety and one or more graded sizes." />
      ) : null}
      {b.lines.length > 0 ? (
        <section className="flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <IndianRupee className="text-primary size-4 shrink-0" aria-hidden />
            <h4 className="text-foreground font-custom text-sm font-semibold">
              Per-grade buy-back lines
            </h4>
          </div>
          <div className="border-border/60 overflow-hidden rounded-lg border">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-muted/40 border-border/60 border-b">
                  <th className="text-muted-foreground font-custom px-3 py-2 text-[10px] font-medium tracking-wide uppercase">
                    Grade
                  </th>
                  <th className="text-muted-foreground font-custom px-3 py-2 text-right text-[10px] font-medium tracking-wide uppercase">
                    Net (kg)
                  </th>
                  <th className="text-muted-foreground font-custom px-3 py-2 text-right text-[10px] font-medium tracking-wide uppercase">
                    Rate (₹/kg)
                  </th>
                  <th className="text-muted-foreground font-custom px-3 py-2 text-right text-[10px] font-medium tracking-wide uppercase">
                    Line (₹)
                  </th>
                </tr>
              </thead>
              <tbody>
                {b.lines.map((line) => (
                  <tr
                    key={line.grade}
                    className="border-border/40 border-b last:border-b-0"
                  >
                    <td className="text-foreground font-custom px-3 py-2 text-xs">
                      {formatContractFarmingGradeColumnLabel(line.grade)}
                    </td>
                    <td className="text-foreground font-custom px-3 py-2 text-right text-xs tabular-nums">
                      {formatNumber(line.netWeightKg)}
                    </td>
                    <td className="text-foreground font-custom px-3 py-2 text-right text-xs tabular-nums">
                      {line.ratePerKg !== null
                        ? formatNumber(line.ratePerKg)
                        : '—'}
                    </td>
                    <td className="text-foreground font-custom px-3 py-2 text-right text-xs font-medium tabular-nums">
                      {line.lineAmount !== null
                        ? `₹${formatNumber(line.lineAmount)}`
                        : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}
      <FormulaSection
        cards={[
          {
            title: 'Per grade',
            detail:
              'Each line: net weight (kg) × buy-back rate (₹/kg) from preferences, rounded to 2 decimals.',
            lines: b.lines.map((line) =>
              line.ratePerKg !== null && line.lineAmount !== null
                ? `${formatContractFarmingGradeColumnLabel(line.grade)}: ${formatNumber(line.netWeightKg)} × ${formatNumber(line.ratePerKg)} = ₹${formatNumber(line.lineAmount)}`
                : `${formatContractFarmingGradeColumnLabel(line.grade)}: rate not configured`
            ),
          },
          {
            title: 'Total buy-back amount',
            detail: 'Sum of all grade lines (rounded total).',
            lines: [
              b.result !== null
                ? `Total = ₹${formatNumber(b.result)}`
                : 'Total cannot be computed until all rates are configured.',
            ],
          },
        ]}
      />
      <CalculationResultBox
        label="Result"
        value={resultLabel}
        hint='Same value as the "Buy Back Amount" column for this row.'
      />
    </MetricBodyShell>
  );
}

function SeedAmountBody({ row }: { row: FlattenedRow }) {
  const b = getSeedAmountBreakdown(row);
  const resultLabel = b.result !== null ? `₹${formatNumber(b.result)}` : '—';

  return (
    <MetricBodyShell>
      <FarmerVarietyContext context={b} />
      {b.issue === 'zero_amount' ? (
        <CalculationIssueBanner message="This seed size line has no seed amount payable (₹0 or missing)." />
      ) : null}
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        <ValueRow label="Seed size" value={b.sizeName || '—'} />
        <ValueRow label="Quantity" value={formatNumber(b.sizeQuantity, 0)} />
        <ValueRow label="Acres (this size)" value={formatNumber(b.sizeAcres)} />
        <ValueRow
          label="Variety seed total (₹)"
          value={
            b.varietyTotalSeedAmountPayable > 0
              ? `₹${formatNumber(b.varietyTotalSeedAmountPayable)}`
              : '—'
          }
        />
      </div>
      <FormulaSection
        cards={[
          {
            title: 'This row',
            detail:
              'Seed amount comes from the contract-farming API for this farmer × variety × size line (amountPayable).',
            lines: [
              `Size: ${b.sizeName || '—'}`,
              `Amount payable = ₹${formatNumber(b.sizeAmountPayable)}`,
            ],
          },
          {
            title: 'Variety context',
            detail:
              'Net amount uses the sum of seed amounts across all sizes for this variety (shown for reference).',
            lines: [
              `Variety total seed = ₹${formatNumber(b.varietyTotalSeedAmountPayable)}`,
            ],
          },
        ]}
      />
      <CalculationResultBox
        label="Result"
        value={resultLabel}
        hint='Same value as the "Seed amt (₹)" column for this row.'
      />
    </MetricBodyShell>
  );
}

function NetAmountPerAcreBody({ row }: { row: FlattenedRow }) {
  const b = getNetAmountPerAcreBreakdown(row);
  const acresLabel =
    b.varietyTotalAcres > 0 ? formatNumber(b.varietyTotalAcres) : '—';
  const resultLabel =
    b.result !== null ? `₹${formatNumber(b.result)} / acre` : '—';

  return (
    <MetricBodyShell>
      <FarmerVarietyContext context={b} />
      {b.issue === 'missing_buy_back' ? (
        <CalculationIssueBanner message="Net amount per acre needs a computable buy-back amount (all buy-back rates configured)." />
      ) : null}
      {b.issue === 'no_acres' ? (
        <CalculationIssueBanner message="Net amount per acre needs variety total planted acres greater than zero." />
      ) : null}
      <FormulaSection
        cards={[
          {
            title: 'Step 1 — Buy-back amount',
            detail:
              'Total ₹ from graded net × buy-back rates (see Buy Back Amount dialog).',
            lines: [
              b.buyBackAmount !== null
                ? `Buy-back = ₹${formatNumber(b.buyBackAmount)}`
                : 'Buy-back amount unavailable',
            ],
          },
          {
            title: 'Step 2 — Net amount',
            detail:
              'Buy-back minus total seed amount payable for the variety (all sizes).',
            lines: [
              b.netAmount !== null
                ? `Net = ₹${formatNumber(b.buyBackAmount ?? 0)} − ₹${formatNumber(b.varietyTotalSeedAmountPayable)} = ₹${formatNumber(b.netAmount)}`
                : 'Net amount unavailable',
            ],
          },
          {
            title: 'Step 3 — Per acre',
            detail: 'Net amount divided by variety total planted acres.',
            lines: [
              `Variety total acres = ${acresLabel}`,
              b.result !== null
                ? `₹${formatNumber(b.netAmount ?? 0)} ÷ ${acresLabel} acres = ₹${formatNumber(b.result)} / acre`
                : 'Cannot divide when net amount or acres are missing.',
            ],
          },
        ]}
      />
      <CalculationResultBox
        label="Result"
        value={resultLabel}
        hint='Same value as the "Net Amount Per Acre" column for this row.'
      />
    </MetricBodyShell>
  );
}

function MetricBodyShell({ children }: { children: ReactNode }) {
  return (
    <div className="flex max-h-[min(70vh,32rem)] flex-col gap-6 overflow-y-auto px-6 py-5">
      {children}
    </div>
  );
}

function FormulaSection({
  cards,
}: {
  cards: { title: string; detail: string; lines: string[] }[];
}) {
  return (
    <section className="flex flex-col gap-4">
      <div className="flex items-center gap-2">
        <Divide className="text-primary size-4 shrink-0" aria-hidden />
        <h4 className="text-foreground font-custom text-sm font-semibold">
          Formula
        </h4>
      </div>
      {cards.map((card) => (
        <FormulaCard
          key={card.title}
          title={card.title}
          detail={card.detail}
          lines={card.lines.length > 0 ? card.lines : ['—']}
        />
      ))}
    </section>
  );
}

export function ContractFarmingMetricCalculationDialog({
  open,
  onOpenChange,
  row,
  metric,
}: ContractFarmingMetricCalculationDialogProps) {
  const meta = metricDialogMeta(metric);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="font-custom gap-0 p-0 sm:max-w-lg">
        <DialogHeader className="border-border/50 shrink-0 border-b px-6 pt-6 pb-4">
          <div className="flex items-start gap-3">
            <div className="bg-primary/12 border-primary/20 flex size-11 shrink-0 items-center justify-center rounded-lg border">
              {metric.type === 'gradeWeightPercent' ||
              metric.type === 'outputPercentage' ? (
                <Percent className="text-primary size-5" aria-hidden />
              ) : (
                <Calculator className="text-primary size-5" aria-hidden />
              )}
            </div>
            <div className="flex flex-col gap-2 text-left">
              <DialogTitle className="font-custom text-xl font-semibold tracking-tight">
                {meta.title}
              </DialogTitle>
              <DialogDescription className="font-custom text-muted-foreground text-sm leading-relaxed">
                {meta.description}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <MetricBreakdownBody row={row} metric={metric} />

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
