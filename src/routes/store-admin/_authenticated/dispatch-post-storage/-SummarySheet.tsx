import { memo, type ReactNode } from 'react';
import {
  ArrowLeft,
  ArrowUpRight,
  Calendar,
  CheckCircle2,
  ClipboardCheck,
  FileText,
  Loader2,
  MapPin,
  Scale,
  Truck,
  User2,
  Warehouse,
  type LucideIcon,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { cn } from '@/lib/utils';
import type { DispatchPostStorageFormValues } from '@/types/dispatch-post-storage';
import { listPositiveAllocations } from './-storage-gate-pass-matrix-utils';

function formatReviewDate(dateStr: string) {
  if (!dateStr?.trim()) return '—';
  const trimmed = dateStr.trim();

  let date: Date;
  if (/^\d{1,2}\.\d{1,2}\.\d{4}$/.test(trimmed)) {
    const [day, month, year] = trimmed.split('.').map(Number);
    date = new Date(year, month - 1, day);
  } else {
    date = new Date(trimmed);
  }

  if (Number.isNaN(date.getTime())) return '—';
  return new Intl.DateTimeFormat('en-IN', {
    weekday: 'short',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(date);
}

function groupAllocationsBySize(allocations: Record<string, number>) {
  const bySize = new Map<string, number>();
  for (const line of listPositiveAllocations(allocations)) {
    bySize.set(line.sizeName, (bySize.get(line.sizeName) ?? 0) + line.quantity);
  }
  return [...bySize.entries()].map(([sizeName, quantity]) => ({
    sizeName,
    quantity,
  }));
}

function DetailRow({
  label,
  value,
  icon: Icon,
  valueClassName,
}: {
  label: string;
  value: ReactNode;
  icon?: LucideIcon;
  valueClassName?: string;
}) {
  return (
    <div className="flex items-start justify-between gap-4 py-2.5">
      <span className="text-muted-foreground font-custom flex shrink-0 items-center gap-1.5 text-xs">
        {Icon ? <Icon className="size-3.5 shrink-0" /> : null}
        {label}
      </span>
      <span
        className={cn(
          'text-foreground font-custom text-right text-sm font-medium',
          valueClassName
        )}
      >
        {value ?? '—'}
      </span>
    </div>
  );
}

function SectionLabel({
  icon: Icon,
  children,
}: {
  icon: LucideIcon;
  children: ReactNode;
}) {
  return (
    <div className="flex items-center gap-2">
      <span className="bg-primary/10 text-primary flex size-6 shrink-0 items-center justify-center rounded-md">
        <Icon className="size-3.5" />
      </span>
      <span className="text-foreground/70 font-custom text-[11px] font-bold tracking-widest uppercase">
        {children}
      </span>
    </div>
  );
}

function SummaryCard({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'border-border/50 bg-card divide-border/40 divide-y rounded-xl border px-4',
        className
      )}
    >
      {children}
    </div>
  );
}

function DispatchReviewSummary({
  values,
  farmerLabel,
  voucherNumberDisplay,
}: {
  values: DispatchPostStorageFormValues;
  farmerLabel: string;
  voucherNumberDisplay: string | null;
}) {
  const sizeGroups = groupAllocationsBySize(values.allocations ?? {});
  const totalBags = sizeGroups.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <div className="flex flex-col gap-7">
      <div className="border-border/40 bg-muted/30 flex items-center justify-between gap-3 rounded-xl border px-4 py-3.5">
        <div className="flex min-w-0 items-center gap-3">
          <span className="border-primary/20 bg-primary/10 text-primary flex size-9 shrink-0 items-center justify-center rounded-lg border">
            <ArrowUpRight className="size-4" />
          </span>
          <div className="min-w-0">
            <p className="font-custom text-sm font-semibold tracking-tight">
              Stock outgoing
            </p>
            <p className="text-muted-foreground mt-0.5 flex items-center gap-1 text-[11px]">
              <Calendar className="size-3 shrink-0" />
              {formatReviewDate(values.date)}
            </p>
          </div>
        </div>
        {voucherNumberDisplay ? (
          <span className="text-foreground font-custom shrink-0 font-mono text-sm font-semibold tabular-nums">
            {voucherNumberDisplay}
          </span>
        ) : null}
      </div>

      <div className="flex flex-col gap-2">
        <SectionLabel icon={User2}>Account</SectionLabel>
        <SummaryCard>
          <DetailRow
            label="Farmer"
            value={farmerLabel.trim() || '—'}
            icon={User2}
          />
        </SummaryCard>
      </div>

      <div className="flex flex-col gap-2">
        <SectionLabel icon={Calendar}>Outgoing date</SectionLabel>
        <SummaryCard>
          <DetailRow
            label="Date"
            value={formatReviewDate(values.date)}
            icon={Calendar}
          />
          {values.manualGatePassNumber != null ? (
            <DetailRow
              label="Manual GP no."
              value={values.manualGatePassNumber.toLocaleString('en-IN')}
              valueClassName="font-mono tabular-nums"
            />
          ) : null}
        </SummaryCard>
      </div>

      <div className="flex flex-col gap-2">
        <SectionLabel icon={Truck}>Route & vehicle</SectionLabel>
        <SummaryCard>
          <DetailRow label="From" value={values.from || '—'} icon={MapPin} />
          <DetailRow label="To" value={values.to || '—'} icon={MapPin} />
          {values.truckNumber.trim() ? (
            <DetailRow
              label="Truck"
              value={values.truckNumber}
              icon={Truck}
              valueClassName="font-mono uppercase"
            />
          ) : null}
        </SummaryCard>
      </div>

      <div className="flex flex-col gap-2">
        <SectionLabel icon={Scale}>Allocations</SectionLabel>
        {sizeGroups.length > 0 ? (
          <SummaryCard>
            {sizeGroups.map((item) => (
              <DetailRow
                key={item.sizeName}
                label={item.sizeName}
                value={`${item.quantity.toLocaleString('en-IN')} bags`}
                valueClassName="tabular-nums"
              />
            ))}
          </SummaryCard>
        ) : (
          <div className="border-border/50 bg-muted/20 rounded-xl border border-dashed px-4 py-3">
            <p className="text-muted-foreground font-custom text-sm">
              No quantities allocated yet.
            </p>
          </div>
        )}
        <SummaryCard>
          <DetailRow
            label="Total bags"
            value={totalBags.toLocaleString('en-IN')}
            icon={Warehouse}
            valueClassName="font-semibold tabular-nums"
          />
        </SummaryCard>
      </div>

      {values.remarks.trim() ? (
        <div className="flex flex-col gap-2">
          <SectionLabel icon={FileText}>Remarks</SectionLabel>
          <div className="border-border/50 bg-muted/15 rounded-xl border border-dashed px-4 py-3">
            <p className="text-muted-foreground font-custom text-sm leading-relaxed whitespace-pre-wrap italic">
              {values.remarks}
            </p>
          </div>
        </div>
      ) : null}
    </div>
  );
}

export interface DispatchPostStorageSummarySheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  voucherNumberDisplay: string | null;
  farmerLabel: string;
  values: DispatchPostStorageFormValues | null;
  onBack: () => void;
  onSubmit: () => void;
  isPending?: boolean;
}

export const DispatchPostStorageSummarySheet = memo(
  function DispatchPostStorageSummarySheet({
    open,
    onOpenChange,
    voucherNumberDisplay,
    farmerLabel,
    values,
    onBack,
    onSubmit,
    isPending = false,
  }: DispatchPostStorageSummarySheetProps) {
    const sizeGroups = groupAllocationsBySize(values?.allocations ?? {});
    const canSubmit = Boolean(values) && sizeGroups.length > 0 && !isPending;

    return (
      <Sheet
        open={open}
        onOpenChange={(nextOpen) => {
          if (isPending) return;
          onOpenChange(nextOpen);
        }}
      >
        <SheetContent
          side="right"
          className="flex w-full flex-col gap-0 p-0 sm:max-w-md"
        >
          <SheetHeader className="border-border/40 border-b px-5 py-4">
            <div className="flex items-center gap-3">
              <span className="bg-primary/10 text-primary flex size-8 shrink-0 items-center justify-center rounded-lg">
                <ClipboardCheck className="size-4" />
              </span>
              <div className="flex min-w-0 flex-col gap-0.5">
                <SheetTitle className="font-custom text-base leading-none font-semibold">
                  Review outgoing
                </SheetTitle>
                <SheetDescription className="text-muted-foreground font-custom text-xs leading-snug">
                  Verify farmer, allocations, and date before confirming.
                </SheetDescription>
              </div>
            </div>
          </SheetHeader>

          <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5">
            {values ? (
              <DispatchReviewSummary
                values={values}
                farmerLabel={farmerLabel}
                voucherNumberDisplay={voucherNumberDisplay}
              />
            ) : (
              <div className="border-border/50 bg-muted/20 flex min-h-48 flex-col items-center justify-center gap-2 rounded-xl border border-dashed px-6 text-center">
                <ArrowUpRight className="text-muted-foreground/40 size-7" />
                <p className="font-custom text-sm font-medium">
                  No summary available
                </p>
                <p className="text-muted-foreground font-custom text-xs">
                  Complete the form and open review again.
                </p>
              </div>
            )}
          </div>

          <SheetFooter className="border-border/40 flex-row gap-2.5 border-t px-5 py-4">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="text-muted-foreground hover:text-foreground font-custom"
              onClick={onBack}
              disabled={isPending}
            >
              <ArrowLeft data-icon="inline-start" />
              Back
            </Button>
            <Button
              type="button"
              size="sm"
              className="font-custom flex-1"
              disabled={!canSubmit}
              onClick={onSubmit}
            >
              {isPending ? (
                <>
                  <Loader2 data-icon="inline-start" className="animate-spin" />
                  Submitting…
                </>
              ) : (
                <>
                  <CheckCircle2 data-icon="inline-start" />
                  Confirm & submit
                </>
              )}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    );
  }
);
