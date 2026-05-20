import type { ContractFarmingReportRowContext } from './contract-farming-report-calculations';
import { AlertCircle } from 'lucide-react';

export function FarmerVarietyContext({
  context,
}: {
  context: ContractFarmingReportRowContext;
}) {
  return (
    <section className="flex flex-col gap-3">
      <p className="text-muted-foreground font-custom text-xs font-medium tracking-wide uppercase">
        Farmer × variety
      </p>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
        <ValueRow label="Farmer" value={context.farmerName} />
        <ValueRow label="Account" value={String(context.accountNumber)} />
        <ValueRow label="Variety" value={context.varietyName} />
      </div>
    </section>
  );
}

export function CalculationIssueBanner({ message }: { message: string }) {
  return (
    <div
      role="status"
      className="flex gap-3 rounded-lg border border-amber-500/30 bg-amber-500/8 px-4 py-3"
    >
      <AlertCircle
        className="mt-0.5 size-4 shrink-0 text-amber-700 dark:text-amber-400"
        aria-hidden
      />
      <p className="text-foreground font-custom text-xs leading-relaxed">
        {message}
      </p>
    </div>
  );
}

export function FormulaCard({
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

export function ValueRow({ label, value }: { label: string; value: string }) {
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

export function CalculationResultBox({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint: string;
}) {
  return (
    <div className="border-primary/25 bg-primary/5 flex flex-col gap-2 rounded-xl border px-4 py-4">
      <p className="text-primary font-custom text-xs font-semibold tracking-wide uppercase">
        {label}
      </p>
      <p className="text-foreground font-custom text-2xl font-bold tabular-nums">
        {value}
      </p>
      <p className="text-muted-foreground font-custom text-xs leading-relaxed">
        {hint}
      </p>
    </div>
  );
}
