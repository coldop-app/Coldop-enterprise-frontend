import { memo } from 'react';
import {
  BadgeCheck,
  Calendar,
  ClipboardList,
  FileText,
  LayoutGrid,
  Loader2,
  Package,
  Scale,
  User,
  UserCircle,
} from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

export interface GradingSummaryOrderRow {
  size: string;
  bagType: string;
  quantity: number;
  weightPerBagKg: number;
}

export interface GradingSummaryIncomingLine {
  gatePassNo?: number;
  manualGatePassNumber?: number;
  truckNumber?: string;
  bagsReceived?: number;
  netWeightKg?: number;
  remarks?: string;
}

/** Values passed into the grading edit summary drawer */
export interface GradingSummaryFormValues {
  gatePassNo: number;
  manualGatePassNumber?: number;
  dateDisplay: string;
  variety: string;
  grader: string;
  remarks: string;
  allocationStatus: string;
  orderDetails: GradingSummaryOrderRow[];
  farmer: {
    name: string;
    accountNumber?: number;
    mobileNumber?: string;
    address?: string;
  };
  incomingLines: GradingSummaryIncomingLine[];
  gradedByLabel?: string;
}

function formatKg(n: number) {
  return new Intl.NumberFormat('en-IN', { maximumFractionDigits: 2 }).format(n);
}

function MetaCard({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value?: string | number | null;
  icon?: typeof Calendar;
}) {
  if (value === undefined || value === null || value === '') return null;

  return (
    <Card className="shadow-sm transition-shadow hover:shadow-md">
      <CardContent className="p-4">
        <div className="mb-1 flex items-center gap-1.5">
          {Icon ? (
            <Icon className="text-muted-foreground size-3.5 shrink-0" />
          ) : null}
          <p className="font-custom text-muted-foreground text-[10px] font-medium tracking-wide uppercase">
            {label}
          </p>
        </div>
        <p className="font-custom text-foreground text-sm font-semibold">
          {value}
        </p>
      </CardContent>
    </Card>
  );
}

interface GradingSummarySheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  summary: GradingSummaryFormValues;
  isPending: boolean;
  onConfirm: () => void;
}

export const GradingSummarySheet = memo(function GradingSummarySheet({
  open,
  onOpenChange,
  summary,
  isPending,
  onConfirm,
}: GradingSummarySheetProps) {
  const totalBags = summary.orderDetails.reduce(
    (s, row) => s + (Number(row.quantity) || 0),
    0
  );

  const estNetKg = summary.orderDetails.reduce((s, row) => {
    const q = Number(row.quantity) || 0;
    const w = Number(row.weightPerBagKg) || 0;
    return s + q * w;
  }, 0);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="flex w-full flex-col gap-0 p-0 sm:max-w-xl"
      >
        <SheetHeader className="border-border shrink-0 space-y-2 border-b px-5 py-4 text-left">
          <SheetTitle className="font-custom text-xl font-semibold tracking-tight">
            Review grading voucher
          </SheetTitle>
          <SheetDescription className="font-custom text-sm leading-relaxed">
            Confirm header, grading details, and size breakdown before saving
            changes.
          </SheetDescription>
        </SheetHeader>

        <div className="min-h-0 flex-1 overflow-y-auto">
          <div className="space-y-6 px-5 py-4">
            <div className="flex flex-wrap items-center gap-2">
              <Badge
                variant="default"
                className="font-custom h-8 gap-1.5 px-3 text-xs font-semibold"
              >
                <FileText className="size-3.5" />
                System #{summary.gatePassNo}
              </Badge>
              {summary.manualGatePassNumber != null ? (
                <Badge
                  variant="secondary"
                  className="font-custom h-8 px-3 text-xs font-medium"
                >
                  Manual #{summary.manualGatePassNumber}
                </Badge>
              ) : null}
              <Badge
                variant="outline"
                className="font-custom text-muted-foreground ml-auto h-8 gap-1 border-dashed px-3 text-xs font-medium"
              >
                <BadgeCheck className="size-3.5" />
                {summary.allocationStatus}
              </Badge>
            </div>

            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              <MetaCard
                label="Date"
                value={summary.dateDisplay}
                icon={Calendar}
              />
              <MetaCard
                label="Variety"
                value={summary.variety}
                icon={Package}
              />
              <MetaCard
                label="Grader"
                value={summary.grader.trim() ? summary.grader : '—'}
                icon={UserCircle}
              />
              {summary.gradedByLabel ? (
                <MetaCard
                  label="Recorded by"
                  value={summary.gradedByLabel}
                  icon={User}
                />
              ) : null}
            </div>

            <Separator />

            <Card className="border-primary/20 from-muted/30 to-background bg-linear-to-br shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="font-custom text-foreground flex items-center gap-2 text-sm font-semibold">
                  <User className="text-muted-foreground size-4" />
                  Farmer & account
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 pt-0">
                <p className="font-custom text-foreground text-base leading-snug font-semibold">
                  {summary.farmer.name}
                </p>
                <div className="text-muted-foreground font-custom grid gap-1 text-xs leading-relaxed sm:grid-cols-2">
                  {summary.farmer.accountNumber != null ? (
                    <span>Account #{summary.farmer.accountNumber}</span>
                  ) : null}
                  {summary.farmer.mobileNumber ? (
                    <span>{summary.farmer.mobileNumber}</span>
                  ) : null}
                </div>
                {summary.farmer.address ? (
                  <p className="text-muted-foreground font-custom text-xs leading-relaxed">
                    {summary.farmer.address}
                  </p>
                ) : null}
              </CardContent>
            </Card>

            {summary.incomingLines.length > 0 ? (
              <>
                <Separator />
                <div>
                  <h3 className="font-custom text-foreground mb-3 flex items-center gap-2 text-sm font-semibold">
                    <ClipboardList className="text-muted-foreground size-4" />
                    Incoming gate passes
                  </h3>
                  <ul className="space-y-2">
                    {summary.incomingLines.map((line, i) => (
                      <li
                        key={`${line.gatePassNo}-${line.manualGatePassNumber}-${i}`}
                      >
                        <Card className="shadow-sm">
                          <CardContent className="p-4 text-sm">
                            <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
                              <span className="font-custom font-semibold">
                                GP #{line.gatePassNo ?? '—'}
                              </span>
                              {line.manualGatePassNumber != null ? (
                                <Badge
                                  variant="secondary"
                                  className="font-custom text-xs font-normal"
                                >
                                  Manual #{line.manualGatePassNumber}
                                </Badge>
                              ) : null}
                            </div>
                            <div className="text-muted-foreground font-custom mt-2 flex flex-wrap gap-x-3 gap-y-0.5 text-xs">
                              {line.truckNumber ? (
                                <span>{line.truckNumber}</span>
                              ) : null}
                              {line.bagsReceived != null ? (
                                <span>{line.bagsReceived} bags</span>
                              ) : null}
                              {line.netWeightKg != null ? (
                                <span className="flex items-center gap-1">
                                  <Scale className="size-3" />
                                  Net {formatKg(line.netWeightKg)} kg
                                </span>
                              ) : null}
                            </div>
                            {line.remarks?.trim() ? (
                              <p className="text-muted-foreground font-custom border-border/70 mt-3 border-t pt-3 text-xs leading-relaxed italic">
                                {line.remarks}
                              </p>
                            ) : null}
                          </CardContent>
                        </Card>
                      </li>
                    ))}
                  </ul>
                </div>
              </>
            ) : null}

            <Separator />

            <div>
              <div className="mb-3 flex items-center justify-between gap-2">
                <h3 className="font-custom text-foreground flex items-center gap-2 text-sm font-semibold">
                  <LayoutGrid className="text-muted-foreground size-4" />
                  Order details
                </h3>
                <Badge
                  variant="outline"
                  className="font-custom text-muted-foreground text-[11px] font-medium tracking-wide uppercase"
                >
                  {totalBags} bags · ~{formatKg(estNetKg)} kg
                </Badge>
              </div>
              <Card className="overflow-hidden py-0 shadow-sm">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50 hover:bg-muted/50">
                      <TableHead className="font-custom text-muted-foreground h-10 px-3 text-[10px] font-medium uppercase">
                        Size
                      </TableHead>
                      <TableHead className="font-custom text-muted-foreground h-10 px-3 text-[10px] font-medium uppercase">
                        Bag
                      </TableHead>
                      <TableHead className="font-custom text-muted-foreground h-10 px-3 text-right text-[10px] font-medium uppercase">
                        Qty
                      </TableHead>
                      <TableHead className="font-custom text-muted-foreground hidden h-10 px-3 text-right text-[10px] font-medium uppercase sm:table-cell">
                        / bag kg
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {summary.orderDetails.map((row, rowIndex) => (
                      <TableRow
                        key={`${row.size}-${row.bagType}-${row.weightPerBagKg}-${rowIndex}`}
                      >
                        <TableCell className="font-custom text-foreground px-3 py-2 font-medium whitespace-normal">
                          {row.size}
                        </TableCell>
                        <TableCell className="text-muted-foreground font-custom px-3 py-2 whitespace-normal">
                          {row.bagType}
                        </TableCell>
                        <TableCell className="font-custom text-primary px-3 py-2 text-right font-semibold tabular-nums">
                          {row.quantity}
                        </TableCell>
                        <TableCell className="text-muted-foreground font-custom hidden px-3 py-2 text-right text-xs tabular-nums sm:table-cell">
                          {formatKg(row.weightPerBagKg)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </Card>
            </div>

            {summary.remarks.trim() ? (
              <>
                <Separator />
                <Card className="border-border bg-muted/20 shadow-sm">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-muted-foreground font-custom text-[10px] font-semibold uppercase">
                      Remarks
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <p className="font-custom text-foreground text-sm leading-relaxed">
                      {summary.remarks}
                    </p>
                  </CardContent>
                </Card>
              </>
            ) : null}
          </div>
        </div>

        <Separator />

        <SheetFooter className="border-border bg-background shrink-0 border-t px-4 py-4 sm:px-6">
          <div className="flex w-full flex-col gap-3 sm:flex-row sm:justify-end">
            <Button
              type="button"
              variant="outline"
              className="font-custom focus-visible:ring-primary w-full sm:w-auto sm:min-w-[7rem]"
              onClick={() => onOpenChange(false)}
              disabled={isPending}
            >
              Back to form
            </Button>
            <Button
              type="button"
              size="lg"
              className="font-custom focus-visible:ring-primary w-full font-bold sm:flex-1"
              onClick={onConfirm}
              disabled={isPending}
            >
              {isPending ? (
                <span className="flex items-center justify-center gap-2">
                  <Loader2 className="size-4 animate-spin" aria-hidden />
                  Saving…
                </span>
              ) : (
                'Save changes'
              )}
            </Button>
          </div>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
});
