import { useMemo, useState } from 'react';
import {
  Ban,
  ChevronDown,
  ChevronUp,
  CircleUser,
  FileText,
  Hash,
  MapPin,
  Package,
  Pencil,
  Truck,
  User,
  Warehouse,
  type LucideIcon,
} from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Field, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { EditDispatchPostStorageSheet } from '@/routes/store-admin/_authenticated/dispatch-post-storage/-EditDispatchPostStorageSheet';
import { toEditDispatchPostStorageGatePass } from '@/routes/store-admin/_authenticated/dispatch-post-storage/-form-schema';
import {
  isMarkDispatchPostStorageAsNullSuccess,
  useMarkDispatchPostStorageAsNull,
} from '@/services/store-admin/dispatch-post-storage/useMarkDispatchPostStorageAsNull';
import { usePermissionsStore } from '@/stores/usePermissionsStore';
import type {
  DispatchPostStorage,
  DispatchPostStorageCreatedBy,
  DispatchPostStorageFarmerStorageLink,
} from '@/types/dispatch-post-storage';

const InfoBlock = ({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: string | number;
  icon?: LucideIcon;
}) => (
  <div className="flex flex-col gap-1">
    <span className="text-muted-foreground font-custom flex items-center gap-1 text-[10px] font-medium tracking-wide uppercase">
      {Icon ? <Icon className="size-3.5 shrink-0" /> : null}
      {label}
    </span>
    <span className="text-foreground font-custom truncate text-xs font-semibold sm:text-sm">
      {value}
    </span>
  </div>
);

function isFarmerStorageLink(
  value: DispatchPostStorage['farmerStorageLinkId']
): value is DispatchPostStorageFarmerStorageLink {
  return typeof value === 'object' && value !== null;
}

function isCreatedByObject(
  value: DispatchPostStorage['createdBy']
): value is DispatchPostStorageCreatedBy {
  return typeof value === 'object' && value !== null;
}

function formatDateTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '--';

  return new Intl.DateTimeFormat('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

function formatLocation(row: { chamber: string; floor: string; row: string }) {
  const parts = [row.chamber, row.floor, row.row].filter((part) =>
    part?.trim()
  );
  return parts.length > 0 ? parts.join(' / ') : '--';
}

export interface DispatchPostStorageVoucherCardProps {
  gatePass: DispatchPostStorage;
}

export function DispatchPostStorageVoucherCard({
  gatePass,
}: DispatchPostStorageVoucherCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isMarkAsNullOpen, setIsMarkAsNullOpen] = useState(false);
  const [markAsNullRemarks, setMarkAsNullRemarks] = useState('');
  const canUpdate = usePermissionsStore((state) =>
    state.hasPermission('outgoing-gate-pass', 'update')
  );
  const {
    mutateAsync: markDispatchPostStorageAsNull,
    isPending: isMarkingAsNull,
  } = useMarkDispatchPostStorageAsNull();
  const editGatePass = useMemo(
    () => toEditDispatchPostStorageGatePass(gatePass),
    [gatePass]
  );

  const farmerStorageLink = isFarmerStorageLink(gatePass.farmerStorageLinkId)
    ? gatePass.farmerStorageLinkId
    : null;
  const farmer = farmerStorageLink?.farmerId;
  const createdBy = isCreatedByObject(gatePass.createdBy)
    ? gatePass.createdBy.name
    : '--';
  const orderDetails = gatePass.orderDetails ?? [];
  const totalIssued = orderDetails.reduce(
    (sum, row) => sum + (row.quantityIssued ?? 0),
    0
  );
  const isCancelledGatePass =
    totalIssued === 0 ||
    gatePass.status?.toUpperCase() === 'CANCELLED' ||
    gatePass.status?.toUpperCase() === 'NULL' ||
    Boolean(gatePass.markAsNullRemarks?.trim());

  const handleEditClick = () => {
    if (!canUpdate) return;
    setIsEditOpen(true);
  };

  const handleMarkAsNullOpenChange = (open: boolean) => {
    setIsMarkAsNullOpen(open);
    if (!open) setMarkAsNullRemarks('');
  };

  const handleMarkAsNullClick = () => {
    if (!canUpdate || isCancelledGatePass) return;
    setIsMarkAsNullOpen(true);
  };

  const handleMarkAsNullSubmit = async () => {
    const remarks = markAsNullRemarks.trim();
    if (!remarks || isMarkingAsNull) return;

    try {
      const data = await markDispatchPostStorageAsNull({
        id: gatePass._id,
        markAsNullRemarks: remarks,
      });
      if (!isMarkDispatchPostStorageAsNullSuccess(data)) return;
      handleMarkAsNullOpenChange(false);
    } catch {
      return;
    }
  };

  return (
    <>
      <Card
        className={cn(
          'border-border/40 bg-card hover:border-destructive/40 relative overflow-hidden rounded-xl pt-0 shadow-sm transition-all duration-200 hover:shadow-md',
          isCancelledGatePass &&
            'border-border/20 bg-muted/30 opacity-55 saturate-0'
        )}
      >
        {isCancelledGatePass ? (
          <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center">
            <div className="flex flex-col items-center gap-1">
              <div className="border-border/30 bg-background/40 rounded-full border p-3">
                <Ban className="text-muted-foreground/50 size-7" />
              </div>
              <span className="font-custom text-muted-foreground/60 text-[10px] tracking-[0.18em] uppercase">
                Null
              </span>
            </div>
          </div>
        ) : null}

        <div
          className={cn(
            'bg-muted/15 border-border/50 flex flex-col justify-between gap-3 border-b px-3 pt-2 pb-3 sm:flex-row sm:items-start sm:px-4 sm:pt-3 sm:pb-4',
            isCancelledGatePass && 'bg-muted/30 border-border/30'
          )}
        >
          <div className="min-w-0">
            <div className="flex items-center gap-2.5">
              <div className="bg-destructive size-2 shrink-0 rounded-full shadow-[0_0_8px_rgba(var(--destructive),0.6)]" />
              <h3 className="text-foreground font-custom text-sm font-bold tracking-tight sm:text-base">
                DPS{' '}
                <span className="text-destructive">#{gatePass.gatePassNo}</span>
              </h3>
              {gatePass.manualGatePassNumber != null ? (
                <Badge
                  variant="secondary"
                  className="font-custom px-2 py-0.5 text-[10px] font-medium"
                >
                  Manual #{gatePass.manualGatePassNumber}
                </Badge>
              ) : null}
            </div>
            <p className="text-muted-foreground font-custom mt-1 text-[11px] sm:text-xs">
              {formatDateTime(gatePass.date)}
            </p>
          </div>

          <div className="flex shrink-0 items-center gap-1.5">
            <Badge
              variant="outline"
              className={cn(
                'font-custom bg-background px-2 py-0.5 text-[10px] font-medium',
                isCancelledGatePass &&
                  'border-border/50 bg-muted/40 text-muted-foreground'
              )}
            >
              {totalIssued.toLocaleString('en-IN')} Bag(s)
            </Badge>
            {isCancelledGatePass ? (
              <Badge
                variant="secondary"
                className="font-custom border-border/60 bg-muted/40 text-muted-foreground px-2 py-0.5 text-[10px] font-medium"
              >
                Cancelled Gate Pass
              </Badge>
            ) : null}
          </div>
        </div>

        <div className="px-3 py-3 sm:px-4 sm:py-4">
          <div className="grid grid-cols-2 gap-x-3 gap-y-3 lg:grid-cols-3">
            <InfoBlock
              label="Farmer"
              value={farmer?.name ?? '--'}
              icon={User}
            />
            <InfoBlock
              label="Account"
              value={
                farmerStorageLink?.accountNumber != null
                  ? `#${farmerStorageLink.accountNumber}`
                  : '--'
              }
              icon={Hash}
            />
            <InfoBlock
              label="Variety"
              value={gatePass.variety?.trim() || '--'}
              icon={Package}
            />
            <InfoBlock
              label="From"
              value={gatePass.from?.trim() || '--'}
              icon={MapPin}
            />
            <InfoBlock
              label="To"
              value={gatePass.to?.trim() || '--'}
              icon={MapPin}
            />
            <InfoBlock
              label="Truck"
              value={gatePass.truckNumber?.trim() || '—'}
              icon={Truck}
            />
          </div>
        </div>

        <div className="bg-muted/10 border-border/50 flex items-center justify-between border-t px-3 py-2.5 sm:px-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsExpanded((prev) => !prev)}
            className="text-muted-foreground font-custom hover:text-foreground h-8 px-2 text-xs font-medium"
          >
            {isExpanded ? (
              <>
                <ChevronUp data-icon="inline-start" /> Less
              </>
            ) : (
              <>
                <ChevronDown data-icon="inline-start" /> More
              </>
            )}
          </Button>

          {canUpdate && !isCancelledGatePass ? (
            <div className="flex shrink-0 items-center gap-1.5">
              <Button
                type="button"
                variant="secondary"
                size="sm"
                className="font-custom h-8"
                onClick={handleMarkAsNullClick}
                aria-label={`Mark dispatch (post storage) ${gatePass.gatePassNo} as null`}
              >
                <Ban data-icon="inline-start" />
                Mark as Null
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="font-custom size-8 p-0"
                onClick={handleEditClick}
                aria-label={`Edit dispatch (post storage) ${gatePass.gatePassNo}`}
              >
                <Pencil />
              </Button>
            </div>
          ) : null}
        </div>

        {isExpanded ? (
          <div className="border-border/50 animate-in slide-in-from-top-2 fade-in flex flex-col gap-4 border-t p-3 duration-200 sm:p-4">
            <section>
              <h4 className="text-foreground font-custom flex items-center gap-2 text-xs font-semibold">
                <CircleUser className="text-destructive size-4" />
                System Record
              </h4>
              <div className="bg-muted/30 mt-2.5 grid grid-cols-2 gap-3 rounded-lg p-3">
                <InfoBlock label="Created By" value={createdBy} />
                <InfoBlock
                  label="Account"
                  value={
                    farmerStorageLink?.accountNumber != null
                      ? `#${farmerStorageLink.accountNumber}`
                      : '--'
                  }
                  icon={Hash}
                />
              </div>
            </section>

            <section>
              <h4 className="text-foreground font-custom flex items-center gap-2 text-xs font-semibold">
                <Warehouse className="text-destructive size-4" />
                Order details
              </h4>
              <div className="border-border/50 mt-2.5 overflow-hidden rounded-lg border">
                <div className="overflow-x-auto">
                  <table className="w-full min-w-140 text-left text-xs">
                    <thead className="bg-muted/50 text-muted-foreground font-custom text-[10px] font-semibold tracking-wide uppercase">
                      <tr>
                        <th className="px-4 py-3">Bag Size</th>
                        <th className="px-4 py-3">Bag Type</th>
                        <th className="px-4 py-3">Location</th>
                        <th className="px-4 py-3 text-right">Qty Issued</th>
                      </tr>
                    </thead>
                    <tbody className="divide-border/40 divide-y">
                      {orderDetails.map((row, idx) => (
                        <tr
                          key={`${row.size}-${row.chamber}-${row.floor}-${row.row}-${idx}`}
                          className="hover:bg-muted/20 transition-colors duration-200"
                        >
                          <td className="text-foreground px-4 py-3 font-medium">
                            {row.size}
                          </td>
                          <td className="text-muted-foreground px-4 py-3">
                            {row.bagType?.trim() ? (
                              <Badge
                                variant="outline"
                                className="font-custom border-border/60 bg-background px-2 py-0 text-[10px] font-medium tracking-wide uppercase"
                              >
                                {row.bagType.trim()}
                              </Badge>
                            ) : (
                              '—'
                            )}
                          </td>
                          <td className="text-muted-foreground px-4 py-3">
                            {formatLocation(row)}
                          </td>
                          <td className="text-destructive px-4 py-3 text-right font-semibold">
                            {row.quantityIssued.toLocaleString('en-IN')}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot className="bg-destructive/5 border-destructive/20 text-destructive border-t-2">
                      <tr>
                        <td
                          className="font-custom px-4 py-3 font-bold"
                          colSpan={3}
                        >
                          Total Summary
                        </td>
                        <td className="font-custom px-4 py-3 text-right font-bold">
                          {totalIssued.toLocaleString('en-IN')}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>
            </section>

            <section>
              <h4 className="text-foreground font-custom flex items-center gap-2 text-xs font-semibold">
                <FileText className="text-destructive size-4" />
                Remarks
              </h4>
              <div className="bg-muted/30 mt-2.5 flex flex-col gap-3 rounded-lg p-3">
                <p className="text-muted-foreground font-custom text-xs leading-relaxed">
                  {gatePass.remarks || '--'}
                </p>
                {gatePass.markAsNullRemarks?.trim() ? (
                  <p className="text-muted-foreground font-custom text-xs leading-relaxed">
                    <span className="text-foreground font-semibold">
                      Marked as null:{' '}
                    </span>
                    {gatePass.markAsNullRemarks.trim()}
                  </p>
                ) : null}
              </div>
            </section>
          </div>
        ) : null}
      </Card>
      <EditDispatchPostStorageSheet
        open={isEditOpen}
        onOpenChange={setIsEditOpen}
        gatePass={editGatePass}
      />
      <Dialog open={isMarkAsNullOpen} onOpenChange={handleMarkAsNullOpenChange}>
        <DialogContent className="font-custom sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-custom">Mark as Null</DialogTitle>
            <DialogDescription className="font-custom">
              This will cancel dispatch (post storage) #{gatePass.gatePassNo}.
              Enter a reason to continue.
            </DialogDescription>
          </DialogHeader>
          <FieldGroup>
            <Field>
              <FieldLabel
                htmlFor="mark-as-null-remarks"
                className="font-custom"
              >
                Remarks
              </FieldLabel>
              <Textarea
                id="mark-as-null-remarks"
                value={markAsNullRemarks}
                onChange={(event) => setMarkAsNullRemarks(event.target.value)}
                placeholder="e.g. Wrong destination entered"
                className="font-custom min-h-24 resize-y text-base"
              />
            </Field>
          </FieldGroup>
          <DialogFooter>
            <DialogClose asChild>
              <Button
                type="button"
                variant="outline"
                className="font-custom"
                disabled={isMarkingAsNull}
              >
                Cancel
              </Button>
            </DialogClose>
            <Button
              type="button"
              className="font-custom font-bold"
              disabled={!markAsNullRemarks.trim() || isMarkingAsNull}
              onClick={() => {
                void handleMarkAsNullSubmit();
              }}
            >
              {isMarkingAsNull ? 'Marking…' : 'Mark as Null'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
