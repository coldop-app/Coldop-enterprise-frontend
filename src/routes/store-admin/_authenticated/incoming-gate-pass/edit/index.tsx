/* eslint-disable react-refresh/only-export-components */
import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Field, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { DatePicker } from '@/components/date-picker';
import {
  SearchSelector,
  type Option,
} from '@/components/forms/search-selector';
import { AddFarmerModal } from '@/components/forms/add-farmer-modal';
import { POTATO_VARIETIES } from '@/lib/constants';
import { useEditIncomingGatePass } from '@/services/store-admin/incoming-gate-pass/useEditIncomingGatePass';
import type { GatePassStatus } from '@/types/incoming-gate-pass';
import { SummarySheet } from './-SummarySheet';

export const Route = createFileRoute(
  '/store-admin/_authenticated/incoming-gate-pass/edit/'
)({
  validateSearch: (
    search: Record<string, unknown>
  ): {
    id?: string;
    gatePassNo?: string;
    manualGatePassNumber?: string;
    date?: string;
    variety?: string;
    location?: string;
    truckNumber?: string;
    bagsReceived?: string;
    weightSlipNumber?: string;
    weightSlipGrossKg?: string;
    weightSlipTareKg?: string;
    remarks?: string;
    farmerName?: string;
    farmerAccountNumber?: string;
    farmerLinkId?: string;
    status?: GatePassStatus;
  } => ({
    id: search.id ? String(search.id) : undefined,
    gatePassNo: search.gatePassNo ? String(search.gatePassNo) : undefined,
    manualGatePassNumber: search.manualGatePassNumber
      ? String(search.manualGatePassNumber)
      : undefined,
    date: search.date ? String(search.date) : undefined,
    variety: search.variety ? String(search.variety) : undefined,
    location: search.location ? String(search.location) : undefined,
    truckNumber: search.truckNumber ? String(search.truckNumber) : undefined,
    bagsReceived: search.bagsReceived ? String(search.bagsReceived) : undefined,
    weightSlipNumber: search.weightSlipNumber
      ? String(search.weightSlipNumber)
      : undefined,
    weightSlipGrossKg: search.weightSlipGrossKg
      ? String(search.weightSlipGrossKg)
      : undefined,
    weightSlipTareKg: search.weightSlipTareKg
      ? String(search.weightSlipTareKg)
      : undefined,
    remarks: search.remarks ? String(search.remarks) : undefined,
    farmerName: search.farmerName ? String(search.farmerName) : undefined,
    farmerAccountNumber: search.farmerAccountNumber
      ? String(search.farmerAccountNumber)
      : undefined,
    farmerLinkId: search.farmerLinkId ? String(search.farmerLinkId) : undefined,
    status: search.status
      ? (String(search.status) as GatePassStatus)
      : undefined,
  }),
  component: EditIncomingFormComponent,
});

/** Default location options for incoming gate pass */
const DEFAULT_INCOMING_LOCATIONS: Option<string>[] = [
  { label: 'Jindal Ice And Cold Store', value: 'Jindal Ice And Cold Store' },
  { label: 'Goyal Tarai Seed Shed', value: 'Goyal Tarai Seed Shed' },
];

function toDisplayDate(value?: string): string {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const dd = String(date.getDate()).padStart(2, '0');
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const yyyy = date.getFullYear();
  return `${dd}.${mm}.${yyyy}`;
}

function parseNumber(value: string): number | undefined {
  const normalized = value.trim();
  if (!normalized) return undefined;
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function toIsoDateFromDisplay(value: string): string | undefined {
  const normalized = value.trim();
  if (!normalized) return undefined;

  const [day, month, year] = normalized.split('.').map(Number);
  if (!day || !month || !year) return undefined;

  const date = new Date(year, month - 1, day);
  if (Number.isNaN(date.getTime())) return undefined;

  return date.toISOString();
}

function EditIncomingFormComponent() {
  const navigate = useNavigate();
  const search = Route.useSearch();
  const { mutate: editGatePass, isPending } = useEditIncomingGatePass();
  const [isSummarySheetOpen, setIsSummarySheetOpen] = useState(false);
  const [isMarkedAsNull, setIsMarkedAsNull] = useState(false);

  const [truckNumber, setTruckNumber] = useState(search.truckNumber ?? '');
  const [manualGatePassNumber, setManualGatePassNumber] = useState(
    search.manualGatePassNumber ?? ''
  );
  const [selectedVariety, setSelectedVariety] = useState(search.variety ?? '');
  const [selectedLocation, setSelectedLocation] = useState(
    search.location ?? ''
  );
  const [submissionDate, setSubmissionDate] = useState(
    toDisplayDate(search.date)
  );
  const [bagsReceived, setBagsReceived] = useState(search.bagsReceived ?? '');
  const [weightSlipNumber, setWeightSlipNumber] = useState(
    search.weightSlipNumber ?? ''
  );
  const [weightSlipGrossKg, setWeightSlipGrossKg] = useState(
    search.weightSlipGrossKg ?? ''
  );
  const [weightSlipTareKg, setWeightSlipTareKg] = useState(
    search.weightSlipTareKg ?? ''
  );
  const [remarks, setRemarks] = useState(search.remarks ?? '');
  const remarksRef = useRef<HTMLTextAreaElement | null>(null);

  const gatePassNo = parseNumber(search.gatePassNo ?? '');
  const voucherNumberDisplay =
    gatePassNo !== undefined ? `#${gatePassNo}` : undefined;

  const farmerOptions = useMemo<Option<string>[]>(() => {
    if (!search.farmerLinkId || !search.farmerName) return [];
    const accountSuffix = search.farmerAccountNumber
      ? ` • A/C ${search.farmerAccountNumber}`
      : '';
    return [
      {
        label: `${search.farmerName}${accountSuffix}`,
        value: search.farmerLinkId,
      },
    ];
  }, [search.farmerAccountNumber, search.farmerLinkId, search.farmerName]);

  const varietyOptions = useMemo<Option<string>[]>(() => {
    const exists = POTATO_VARIETIES.some(
      (opt) => opt.value === selectedVariety
    );
    if (!selectedVariety || exists) return POTATO_VARIETIES;
    return [
      ...POTATO_VARIETIES,
      { label: selectedVariety, value: selectedVariety },
    ];
  }, [selectedVariety]);

  const locationOptions = useMemo<Option<string>[]>(() => {
    const exists = DEFAULT_INCOMING_LOCATIONS.some(
      (opt) => opt.value === selectedLocation
    );
    if (!selectedLocation || exists) return DEFAULT_INCOMING_LOCATIONS;
    return [
      ...DEFAULT_INCOMING_LOCATIONS,
      { label: selectedLocation, value: selectedLocation },
    ];
  }, [selectedLocation]);

  const gross = parseNumber(weightSlipGrossKg) ?? 0;
  const tare = parseNumber(weightSlipTareKg) ?? 0;
  const netWeight = gross - tare;

  const canEdit = Boolean(search.id);

  const handleMarkAsNull = () => {
    setIsMarkedAsNull(true);
    setBagsReceived('0');
    setWeightSlipGrossKg('0');
    setWeightSlipTareKg('0');
    requestAnimationFrame(() => {
      remarksRef.current?.focus();
    });
  };

  const handleOpenSummary = () => {
    if (!canEdit) {
      toast.error(
        'Missing incoming gate pass id. Please open edit from Daybook.'
      );
      return;
    }
    setIsSummarySheetOpen(true);
  };

  const handleSubmitEdit = () => {
    if (!search.id) {
      toast.error(
        'Missing incoming gate pass id. Please open edit from Daybook.'
      );
      return;
    }

    editGatePass(
      {
        id: search.id,
        farmerStorageLinkId: search.farmerLinkId,
        gatePassNo,
        manualGatePassNumber: parseNumber(manualGatePassNumber),
        date: toIsoDateFromDisplay(submissionDate),
        variety: selectedVariety || undefined,
        location: selectedLocation || undefined,
        truckNumber: truckNumber.trim() || undefined,
        bagsReceived: parseNumber(bagsReceived),
        weightSlip: {
          slipNumber: weightSlipNumber.trim() || undefined,
          grossWeightKg: parseNumber(weightSlipGrossKg) ?? 0,
          tareWeightKg: parseNumber(weightSlipTareKg) ?? 0,
        },
        status: search.status ?? 'NOT_GRADED',
        remarks: remarks.trim() || undefined,
        reason: remarks.trim() || undefined,
      },
      {
        onSuccess: (data) => {
          if (!data.success) return;
          setIsSummarySheetOpen(false);
          navigate({ to: '/store-admin/daybook' });
        },
      }
    );
  };

  return (
    <main className="font-custom mx-auto max-w-2xl px-4 py-6 sm:px-8 sm:py-12">
      {/* Header */}
      <div className="mb-8 space-y-4">
        <h1 className="font-custom text-3xl font-bold text-[#333] sm:text-4xl dark:text-white">
          Edit Incoming Gate Pass
        </h1>

        {/* Voucher Number Badge */}
        {voucherNumberDisplay ? (
          <div className="bg-primary/20 block w-fit rounded-full px-4 py-1.5">
            <span className="font-custom text-primary text-sm font-medium">
              VOUCHER NO: {voucherNumberDisplay}
            </span>
          </div>
        ) : null}

        <Button
          type="button"
          variant="destructive"
          className="font-custom block w-fit"
          onClick={handleMarkAsNull}
          disabled={isMarkedAsNull}
        >
          {isMarkedAsNull ? 'Marked as Null' : 'Mark as Null'}
        </Button>
      </div>

      {/* Form UI */}
      <form className="space-y-6" onSubmit={(e) => e.preventDefault()}>
        <FieldGroup className="space-y-6">
          {/* Truck Number */}
          <Field>
            <FieldLabel
              htmlFor="truckNumber"
              className="font-custom text-base font-semibold"
            >
              Truck Number
            </FieldLabel>
            <Input
              id="truckNumber"
              name="truckNumber"
              placeholder="Enter truck number"
              className="font-custom"
              value={truckNumber}
              onChange={(e) => setTruckNumber(e.target.value)}
              disabled={isMarkedAsNull}
            />
          </Field>

          {/* Manual Gate Pass Number */}
          <Field>
            <FieldLabel
              htmlFor="manualGatePassNumber"
              className="font-custom text-base font-semibold"
            >
              Manual Gate Pass Number
            </FieldLabel>
            <Input
              id="manualGatePassNumber"
              type="number"
              min={0}
              placeholder=""
              className="font-custom [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
              value={manualGatePassNumber}
              onChange={(e) => setManualGatePassNumber(e.target.value)}
              disabled={isMarkedAsNull}
            />
          </Field>

          {/* Farmer Selection */}
          <Field>
            <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
              <div className="flex-1">
                <FieldLabel
                  htmlFor="farmer-select"
                  className="font-custom mb-2 block text-base font-semibold"
                >
                  Enter Account Name (search and select)
                </FieldLabel>
                <SearchSelector
                  id="farmer-select"
                  options={farmerOptions}
                  placeholder="Search or Create Farmer"
                  searchPlaceholder="Search by name, account number, or mobile..."
                  className="w-full"
                  buttonClassName="w-full justify-between"
                  value={search.farmerLinkId ?? ''}
                  disabled
                />
              </div>
              {isMarkedAsNull ? (
                <Button
                  type="button"
                  className="font-custom h-10 w-full sm:w-auto"
                  disabled
                >
                  New Farmer
                </Button>
              ) : (
                <AddFarmerModal links={[]} onFarmerAdded={() => {}} />
              )}
            </div>
          </Field>

          {/* Variety Selection */}
          <Field>
            <div className="border-primary/30 bg-primary/5 space-y-2 rounded-lg border p-4">
              <FieldLabel
                htmlFor="variety-select"
                className="font-custom block text-base font-semibold"
              >
                Select Variety
              </FieldLabel>
              <p className="font-custom text-sm text-[#6f6f6f]">
                Choose the potato variety for this order
              </p>
              <div className={isMarkedAsNull ? 'pointer-events-none' : ''}>
                <SearchSelector
                  id="variety-select"
                  options={varietyOptions}
                  placeholder="Select a variety"
                  searchPlaceholder="Search variety..."
                  className="w-full"
                  buttonClassName="w-full justify-between"
                  value={selectedVariety}
                  onSelect={(value) => setSelectedVariety(value)}
                />
              </div>
            </div>
          </Field>

          {/* Location Selection */}
          <Field>
            <FieldLabel
              htmlFor="location-select"
              className="font-custom text-base font-semibold"
            >
              Location
            </FieldLabel>
            <div className={isMarkedAsNull ? 'pointer-events-none' : ''}>
              <SearchSelector
                id="location-select"
                options={locationOptions}
                placeholder="Select location"
                searchPlaceholder="Search location..."
                className="w-full"
                buttonClassName="w-full justify-between"
                value={selectedLocation}
                onSelect={(value) => setSelectedLocation(value)}
              />
            </div>
          </Field>

          {/* Date Selection */}
          <Field>
            <div className={isMarkedAsNull ? 'pointer-events-none' : ''}>
              <DatePicker
                label="Date of Submission"
                id="date-of-submission"
                value={submissionDate}
                onChange={setSubmissionDate}
              />
            </div>
          </Field>

          {/* Bags Received */}
          <Field>
            <FieldLabel
              htmlFor="bagsReceived"
              className="font-custom text-base font-semibold"
            >
              Bags Received
            </FieldLabel>
            <Input
              id="bagsReceived"
              name="bagsReceived"
              type="number"
              min="0"
              step="1"
              placeholder="0"
              className="font-custom [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
              value={bagsReceived}
              onChange={(e) => setBagsReceived(e.target.value)}
              disabled={isMarkedAsNull}
            />
          </Field>

          {/* Weight Slip */}
          <div className="border-primary/30 bg-primary/5 space-y-3 rounded-lg border p-4">
            <p className="font-custom text-base font-semibold">Weight Slip</p>
            <div className="grid gap-3 sm:grid-cols-3">
              <Field>
                <FieldLabel
                  htmlFor="weight-slip-number"
                  className="font-custom text-sm font-medium"
                >
                  Slip Number
                </FieldLabel>
                <Input
                  id="weight-slip-number"
                  placeholder="Enter slip number"
                  className="font-custom"
                  value={weightSlipNumber}
                  onChange={(e) => setWeightSlipNumber(e.target.value)}
                  disabled={isMarkedAsNull}
                />
              </Field>
              <Field>
                <FieldLabel
                  htmlFor="weight-gross"
                  className="font-custom text-sm font-medium"
                >
                  Gross (kg)
                </FieldLabel>
                <Input
                  id="weight-gross"
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="0"
                  className="font-custom [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                  value={weightSlipGrossKg}
                  onChange={(e) => setWeightSlipGrossKg(e.target.value)}
                  disabled={isMarkedAsNull}
                />
              </Field>
              <Field>
                <FieldLabel
                  htmlFor="weight-tare"
                  className="font-custom text-sm font-medium"
                >
                  Tare (kg)
                </FieldLabel>
                <Input
                  id="weight-tare"
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="0"
                  className="font-custom [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                  value={weightSlipTareKg}
                  onChange={(e) => setWeightSlipTareKg(e.target.value)}
                  disabled={isMarkedAsNull}
                />
              </Field>
            </div>

            <p className="text-muted-foreground font-custom text-sm">
              <span className="text-foreground font-medium">Net (kg):</span>{' '}
              {netWeight.toFixed(2)}
            </p>
          </div>

          {/* Remarks */}
          <Field>
            <FieldLabel
              htmlFor="remarks"
              className="font-custom text-base font-semibold"
            >
              Remarks
            </FieldLabel>
            <textarea
              ref={remarksRef}
              id="remarks"
              name="remarks"
              placeholder="Max 500 characters"
              maxLength={500}
              rows={3}
              className="border-input bg-background ring-offset-background focus-visible:ring-primary font-custom flex w-full rounded-md border px-3 py-2 text-base focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50"
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
            />
          </Field>
        </FieldGroup>

        {/* Submit Buttons */}
        <div className="flex justify-end gap-4 pt-4">
          <Button
            type="button"
            variant="outline"
            className="font-custom"
            onClick={() => navigate({ to: '/store-admin/daybook' })}
          >
            Cancel
          </Button>
          <Button
            type="button"
            variant="default"
            size="lg"
            className="font-custom px-8 font-bold"
            onClick={handleOpenSummary}
            disabled={!canEdit}
          >
            Next
          </Button>
        </div>
      </form>

      {/* Summary Sheet Component */}
      <SummarySheet
        open={isSummarySheetOpen}
        onOpenChange={setIsSummarySheetOpen}
        voucherNumberDisplay={voucherNumberDisplay}
        selectedFarmer={
          search.farmerName
            ? {
                farmerId: { name: search.farmerName },
                accountNumber: search.farmerAccountNumber ?? '--',
              }
            : null
        }
        formValues={{
          date: submissionDate,
          variety: selectedVariety,
          location: selectedLocation,
          truckNumber,
          bagsReceived: parseNumber(bagsReceived) ?? 0,
          remarks,
          weightSlip: {
            slipNumber: weightSlipNumber,
            grossWeightKg: parseNumber(weightSlipGrossKg) ?? 0,
            tareWeightKg: parseNumber(weightSlipTareKg) ?? 0,
          },
        }}
        isPending={isPending}
        isLoadingVoucher={false}
        gatePassNo={gatePassNo}
        onSubmit={handleSubmitEdit}
      />
    </main>
  );
}

export default EditIncomingFormComponent;
