/* eslint-disable react-refresh/only-export-components */
import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useMemo, useState } from 'react';

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
import { useGetReceiptVoucherNumber } from '@/services/store-admin/general/useGetVoucherNumber';
import { useCreateIncomingGatePass } from '@/services/store-admin/incoming-gate-pass/useCreateIncomingGatePass';
import { useGetAllFarmers } from '@/services/store-admin/people/useGetAllFarmers';
import { SummarySheet } from './edit/-SummarySheet';

export const Route = createFileRoute(
  '/store-admin/_authenticated/incoming-gate-pass/'
)({
  component: AddIncomingGatePassComponent,
});

const DEFAULT_INCOMING_LOCATIONS: Option<string>[] = [
  { label: 'Jindal Ice And Cold Store', value: 'Jindal Ice And Cold Store' },
  { label: 'Goyal Tarai Seed Shed', value: 'Goyal Tarai Seed Shed' },
];

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

function AddIncomingGatePassComponent() {
  const navigate = useNavigate();
  const { mutate: createGatePass, isPending } = useCreateIncomingGatePass();
  const { data: farmerLinks = [] } = useGetAllFarmers();
  const { data: gatePassNo, isFetching: isFetchingVoucherNumber } =
    useGetReceiptVoucherNumber('incoming-gate-pass');
  const [isSummarySheetOpen, setIsSummarySheetOpen] = useState(false);
  const [truckNumber, setTruckNumber] = useState('');
  const [manualGatePassNumber, setManualGatePassNumber] = useState('');
  const [selectedFarmerLinkId, setSelectedFarmerLinkId] = useState('');
  const [selectedVariety, setSelectedVariety] = useState('');
  const [selectedLocation, setSelectedLocation] = useState('');
  const [submissionDate, setSubmissionDate] = useState('');
  const [bagsReceived, setBagsReceived] = useState('');
  const [weightSlipNumber, setWeightSlipNumber] = useState('');
  const [weightSlipGrossKg, setWeightSlipGrossKg] = useState('');
  const [weightSlipTareKg, setWeightSlipTareKg] = useState('');
  const [remarks, setRemarks] = useState('');

  const netWeight =
    (parseNumber(weightSlipGrossKg) ?? 0) -
    (parseNumber(weightSlipTareKg) ?? 0);

  const handleSubmitCreate = () => {
    createGatePass(
      {
        gatePassNo,
        farmerStorageLinkId: selectedFarmerLinkId || undefined,
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
        remarks: remarks.trim() || undefined,
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

  const farmerOptions = useMemo<Option<string>[]>(() => {
    return farmerLinks.map((link) => ({
      label: `${link.farmerId.name} (Account #${link.accountNumber})`,
      value: link._id,
      searchableText:
        `${link.farmerId.name} ${link.accountNumber} ${link.farmerId.mobileNumber}`.trim(),
    }));
  }, [farmerLinks]);

  const selectedFarmerLink = farmerLinks.find(
    (link) => link._id === selectedFarmerLinkId
  );
  const voucherNumberDisplay =
    typeof gatePassNo === 'number' ? `#${gatePassNo}` : undefined;

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

  return (
    <main className="font-custom mx-auto max-w-2xl px-4 py-6 sm:px-8 sm:py-12">
      <div className="mb-8 space-y-4">
        <h1 className="font-custom text-3xl font-bold text-[#333] sm:text-4xl dark:text-white">
          Add Incoming Gate Pass
        </h1>
        {voucherNumberDisplay ? (
          <div className="bg-primary/20 block w-fit rounded-full px-4 py-1.5">
            <span className="font-custom text-primary text-sm font-medium">
              VOUCHER NO: {voucherNumberDisplay}
            </span>
          </div>
        ) : null}
      </div>

      <form
        className="space-y-6"
        onSubmit={(event) => {
          event.preventDefault();
          event.stopPropagation();
        }}
      >
        <FieldGroup className="space-y-6">
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
            />
          </Field>

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
            />
          </Field>

          <Field>
            <FieldLabel
              htmlFor="farmer-select"
              className="font-custom mb-2 block text-base font-semibold"
            >
              Enter Account Name (search and select)
            </FieldLabel>
            <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
              <div className="flex-1">
                <SearchSelector
                  id="farmer-select"
                  options={farmerOptions}
                  placeholder="Search or Create Farmer"
                  searchPlaceholder="Search by name, account number, or mobile..."
                  className="w-full"
                  buttonClassName="w-full justify-between"
                  value={selectedFarmerLinkId}
                  onSelect={(value) => setSelectedFarmerLinkId(value)}
                />
              </div>
              <AddFarmerModal links={farmerLinks} onFarmerAdded={() => {}} />
            </div>
          </Field>

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
          </Field>

          <Field>
            <FieldLabel
              htmlFor="location-select"
              className="font-custom text-base font-semibold"
            >
              Location
            </FieldLabel>
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
          </Field>

          <Field>
            <DatePicker
              label="Date of Submission"
              id="date-of-submission"
              value={submissionDate}
              onChange={setSubmissionDate}
            />
          </Field>

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
            />
          </Field>

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
                />
              </Field>
            </div>

            <p className="text-muted-foreground font-custom text-sm">
              <span className="text-foreground font-medium">Net (kg):</span>{' '}
              {netWeight.toFixed(2)}
            </p>
          </div>

          <Field>
            <FieldLabel
              htmlFor="remarks"
              className="font-custom text-base font-semibold"
            >
              Remarks
            </FieldLabel>
            <textarea
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
            onClick={() => setIsSummarySheetOpen(true)}
          >
            Next
          </Button>
        </div>
      </form>

      <SummarySheet
        open={isSummarySheetOpen}
        onOpenChange={setIsSummarySheetOpen}
        voucherNumberDisplay={voucherNumberDisplay}
        selectedFarmer={
          selectedFarmerLink
            ? {
                farmerId: { name: selectedFarmerLink.farmerId.name },
                accountNumber: String(selectedFarmerLink.accountNumber),
              }
            : null
        }
        formValues={{
          manualGatePassNumber,
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
        isLoadingVoucher={isFetchingVoucherNumber}
        gatePassNo={gatePassNo}
        onSubmit={handleSubmitCreate}
        submitLabel="Create Incoming Order"
      />
    </main>
  );
}
