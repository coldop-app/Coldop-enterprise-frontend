import { memo, useState, useCallback, useEffect } from 'react';
import { Card, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import {
  ChevronDown,
  ChevronUp,
  Pencil,
  Printer,
  MapPin,
  User,
  Truck,
  Package,
} from 'lucide-react';
import { useEditIncomingGatePass } from '@/services/store-admin/incoming-gate-pass/useEditIncomingGatePass';
import { Spinner } from '@/components/ui/spinner';
import { DetailRow } from './detail-row';
import { formatVoucherDate } from './format-date';
import type { IncomingVoucherData } from './types';
import type { VoucherFarmerInfo } from './types';
import { JUTE_BAG_WEIGHT } from '@/components/forms/grading/constants';

export interface IncomingVoucherProps extends VoucherFarmerInfo {
  voucher: IncomingVoucherData;
  farmerAddress?: string;
  farmerMobile?: string;
}

const IncomingVoucher = memo(function IncomingVoucher({
  voucher,
  farmerName,
  farmerAccount,
  farmerAddress,
  farmerMobile,
}: IncomingVoucherProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isPrinting, setIsPrinting] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editManualGatePassNumber, setEditManualGatePassNumber] = useState('');
  const [editGrossWeightKg, setEditGrossWeightKg] = useState('');
  const [editTareWeightKg, setEditTareWeightKg] = useState('');

  const { mutate: editIncomingGatePass, isPending: isEditPending } =
    useEditIncomingGatePass();

  const voucherId = voucher._id;

  const resetEditForm = useCallback(() => {
    setEditManualGatePassNumber(
      voucher.manualGatePassNumber != null
        ? String(voucher.manualGatePassNumber)
        : ''
    );
    setEditGrossWeightKg(
      voucher.weightSlip?.grossWeightKg != null
        ? String(voucher.weightSlip.grossWeightKg)
        : ''
    );
    setEditTareWeightKg(
      voucher.weightSlip?.tareWeightKg != null
        ? String(voucher.weightSlip.tareWeightKg)
        : ''
    );
  }, [voucher.manualGatePassNumber, voucher.weightSlip]);

  useEffect(() => {
    if (isEditDialogOpen) resetEditForm();
  }, [isEditDialogOpen, resetEditForm]);

  const handleEditSubmit = useCallback(() => {
    if (!voucherId) return;
    const manual =
      editManualGatePassNumber.trim() === ''
        ? undefined
        : Number(editManualGatePassNumber);
    const gross = Number(editGrossWeightKg);
    const tare = Number(editTareWeightKg);
    if (Number.isNaN(gross) || Number.isNaN(tare) || gross < 0 || tare < 0) {
      return;
    }
    editIncomingGatePass(
      {
        id: voucherId,
        ...(manual != null &&
          !Number.isNaN(manual) && { manualGatePassNumber: manual }),
        weightSlip: { grossWeightKg: gross, tareWeightKg: tare },
        reason: 'Updated from daybook',
      },
      {
        onSuccess: () => setIsEditDialogOpen(false),
      }
    );
  }, [
    voucherId,
    editManualGatePassNumber,
    editGrossWeightKg,
    editTareWeightKg,
    editIncomingGatePass,
  ]);

  const bags = voucher.bagsReceived ?? 0;

  const handlePrint = async () => {
    // Open window synchronously so mobile popup blockers allow it
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(
        '<html><body style="font-family:sans-serif;padding:2rem;text-align:center;color:#666;">Generating PDF…</body></html>'
      );
    }
    setIsPrinting(true);
    try {
      const [{ pdf }, { IncomingVoucherPdf }] = await Promise.all([
        import('@react-pdf/renderer'),
        import('@/components/pdf/IncomingVoucherPdf'),
      ]);
      const blob = await pdf(
        <IncomingVoucherPdf
          voucher={voucher}
          farmerName={farmerName}
          farmerAccount={farmerAccount}
        />
      ).toBlob();
      const url = URL.createObjectURL(blob);
      if (printWindow) {
        printWindow.location.href = url;
      } else {
        window.location.href = url;
      }
      setTimeout(() => URL.revokeObjectURL(url), 60_000);
    } finally {
      setIsPrinting(false);
    }
  };
  const status = voucher.status ?? '—';
  const linkedBy = voucher.createdBy;

  return (
    <Card className="border-border/40 hover:border-primary/30 overflow-hidden pt-0 shadow-sm transition-all duration-200 hover:shadow-md">
      <div className="px-3 pt-2 pb-3 sm:px-4 sm:pb-4">
        <CardHeader className="px-0 pt-2 pb-2 sm:pt-3">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <div className="flex min-w-0 items-center gap-2">
                <div className="bg-primary h-1.5 w-1.5 shrink-0 rounded-full" />
                <h3 className="text-foreground font-custom text-base font-bold tracking-tight">
                  IGP{' '}
                  <span className="text-primary">
                    #{voucher.gatePassNo ?? '—'}
                  </span>
                  {voucher.manualGatePassNumber != null && (
                    <span className="text-muted-foreground font-normal">
                      {' '}
                      · Manual #{voucher.manualGatePassNumber}
                    </span>
                  )}
                </h3>
              </div>
              <p className="text-muted-foreground mt-2 text-xs">
                {formatVoucherDate(voucher.date)}
              </p>
            </div>

            <div className="flex shrink-0 items-center gap-1.5">
              <Badge
                variant="secondary"
                className="px-2 py-0.5 text-[10px] font-medium"
              >
                {bags.toLocaleString('en-IN')} bags
              </Badge>
              <Badge
                variant="outline"
                className="px-2 py-0.5 text-[10px] font-medium capitalize"
              >
                {(status as string).replace(/_/g, ' ')}
              </Badge>
            </div>
          </div>
        </CardHeader>

        <div className="mb-3 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          <DetailRow label="Farmer" value={farmerName ?? '—'} icon={User} />
          <DetailRow label="Account" value={`#${farmerAccount ?? '—'}`} />
          <DetailRow
            label="Location"
            value={voucher.location ?? '—'}
            icon={MapPin}
          />
          <DetailRow
            label="Truck"
            value={voucher.truckNumber ?? '—'}
            icon={Truck}
          />
          <DetailRow
            label="Variety"
            value={voucher.variety ?? '—'}
            icon={Package}
          />
        </div>

        <div className="flex items-center justify-between pt-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsExpanded((p) => !p)}
            className="hover:bg-accent h-8 px-3 text-xs"
          >
            {isExpanded ? (
              <>
                <ChevronUp className="mr-1.5 h-3.5 w-3.5" />
                Less
              </>
            ) : (
              <>
                <ChevronDown className="mr-1.5 h-3.5 w-3.5" />
                More
              </>
            )}
          </Button>

          <div className="flex shrink-0 items-center gap-1.5">
            {voucherId != null && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsEditDialogOpen(true)}
                className="h-8 w-8 p-0"
                aria-label="Edit incoming gate pass"
              >
                <Pencil className="h-3.5 w-3.5" />
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={handlePrint}
              disabled={isPrinting}
              className="h-8 w-8 p-0"
              aria-label={isPrinting ? 'Generating PDF…' : 'Print gate pass'}
            >
              {isPrinting ? (
                <Spinner className="h-3.5 w-3.5" />
              ) : (
                <Printer className="h-3.5 w-3.5" />
              )}
            </Button>
          </div>
        </div>

        {isExpanded && (
          <>
            <Separator className="my-4" />
            <div className="space-y-4">
              <section>
                <h4 className="text-muted-foreground/70 mb-2 text-xs font-semibold tracking-wider uppercase">
                  Farmer Details
                </h4>
                <div className="bg-muted/30 grid grid-cols-1 gap-2 rounded-lg p-2 sm:grid-cols-2 lg:grid-cols-3">
                  <DetailRow label="Name" value={farmerName ?? '—'} />
                  <DetailRow label="Mobile" value={farmerMobile ?? '—'} />
                  <DetailRow
                    label="Account"
                    value={`${farmerAccount ?? '—'}`}
                  />
                  <DetailRow
                    label="Address"
                    value={farmerAddress ?? '—'}
                    icon={MapPin}
                  />
                </div>
              </section>

              <Separator />

              <section>
                <h4 className="text-muted-foreground/70 mb-2.5 text-xs font-semibold tracking-wider uppercase">
                  Gate Pass Details
                </h4>
                <div className="bg-muted/30 grid grid-cols-1 gap-3 rounded-lg p-3 sm:grid-cols-2 lg:grid-cols-3">
                  <DetailRow
                    label="Pass Number"
                    value={`#${voucher.gatePassNo ?? '—'}`}
                  />
                  {voucher.manualGatePassNumber != null && (
                    <DetailRow
                      label="Manual Gate Pass No"
                      value={`#${voucher.manualGatePassNumber}`}
                    />
                  )}
                  <DetailRow
                    label="Status"
                    value={(voucher.status ?? '—').replace(/_/g, ' ')}
                  />
                  <DetailRow
                    label="Location"
                    value={voucher.location ?? '—'}
                    icon={MapPin}
                  />
                  <DetailRow
                    label="Bags Received"
                    value={(voucher.bagsReceived ?? 0).toLocaleString('en-IN')}
                  />
                  <DetailRow label="Created By" value={linkedBy?.name ?? '—'} />
                </div>

                {voucher.weightSlip != null && (
                  <div className="border-primary/20 bg-primary/5 mt-4 rounded-lg border p-3">
                    <h4 className="text-muted-foreground/70 mb-2.5 text-xs font-semibold tracking-wider uppercase">
                      Weight Slip
                    </h4>
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                      <DetailRow
                        label="Slip No"
                        value={voucher.weightSlip.slipNumber ?? '—'}
                      />
                      <DetailRow
                        label="Gross (kg)"
                        value={(
                          voucher.weightSlip.grossWeightKg ?? 0
                        ).toLocaleString('en-IN')}
                      />
                      <DetailRow
                        label="Tare (kg)"
                        value={(
                          voucher.weightSlip.tareWeightKg ?? 0
                        ).toLocaleString('en-IN')}
                      />
                    </div>
                    {(() => {
                      const gross = voucher.weightSlip.grossWeightKg ?? 0;
                      const tare = voucher.weightSlip.tareWeightKg ?? 0;
                      const netKg = gross - tare;
                      const bardanaKg = bags * JUTE_BAG_WEIGHT;
                      const netProductKg = netKg - bardanaKg;
                      return (
                        <div className="text-muted-foreground mt-2 space-y-1 text-xs">
                          <p>
                            Net weight:{' '}
                            <span className="text-foreground font-semibold">
                              {netKg.toLocaleString('en-IN')} kg
                            </span>
                          </p>
                          <p>
                            Bardana ({bags} bags × {JUTE_BAG_WEIGHT} kg):{' '}
                            <span className="text-foreground font-medium">
                              {bardanaKg.toLocaleString('en-IN')} kg
                            </span>
                          </p>
                          <p>
                            Net weight (after bardana):{' '}
                            <span className="text-foreground font-semibold">
                              {netProductKg.toLocaleString('en-IN')} kg
                            </span>
                          </p>
                        </div>
                      );
                    })()}
                  </div>
                )}

                {voucher.remarks != null && voucher.remarks !== '' && (
                  <div className="mt-4">
                    <h4 className="text-muted-foreground/70 mb-2.5 text-xs font-semibold tracking-wider uppercase">
                      Remarks
                    </h4>
                    <div className="bg-muted/30 rounded-lg p-3">
                      <p className="text-foreground text-sm font-medium">
                        {voucher.remarks}
                      </p>
                    </div>
                  </div>
                )}
              </section>
            </div>
          </>
        )}
      </div>

      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="font-custom sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-custom text-lg font-bold">
              Edit Incoming Gate Pass
            </DialogTitle>
            <p className="text-muted-foreground text-sm">
              Update manual gate pass number and weight slip details.
            </p>
          </DialogHeader>
          <FieldGroup className="gap-4">
            <Field>
              <FieldLabel>Manual Gate Pass Number</FieldLabel>
              <Input
                type="number"
                inputMode="numeric"
                placeholder="e.g. 400"
                value={editManualGatePassNumber}
                onChange={(e) => setEditManualGatePassNumber(e.target.value)}
                min={0}
                step={1}
              />
              <FieldError />
            </Field>
            <Field>
              <FieldLabel>Gross Weight (kg)</FieldLabel>
              <Input
                type="number"
                inputMode="decimal"
                placeholder="e.g. 620.5"
                value={editGrossWeightKg}
                onChange={(e) => setEditGrossWeightKg(e.target.value)}
                min={0}
                step={0.1}
              />
              <FieldError />
            </Field>
            <Field>
              <FieldLabel>Tare Weight (kg)</FieldLabel>
              <Input
                type="number"
                inputMode="decimal"
                placeholder="e.g. 520.2"
                value={editTareWeightKg}
                onChange={(e) => setEditTareWeightKg(e.target.value)}
                min={0}
                step={0.1}
              />
              <FieldError />
            </Field>
          </FieldGroup>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => setIsEditDialogOpen(false)}
              disabled={isEditPending}
            >
              Cancel
            </Button>
            <Button
              variant="default"
              onClick={handleEditSubmit}
              disabled={isEditPending}
            >
              {isEditPending ? <Spinner className="mr-2 h-3.5 w-3.5" /> : null}
              Save changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
});

export { IncomingVoucher };
