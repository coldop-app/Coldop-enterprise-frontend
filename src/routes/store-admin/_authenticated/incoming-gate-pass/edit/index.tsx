/* eslint-disable react-refresh/only-export-components */
import { createFileRoute } from '@tanstack/react-router';
import { useState } from 'react';

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
import { SummarySheet } from './-SummarySheet';

export const Route = createFileRoute(
  '/store-admin/_authenticated/incoming-gate-pass/edit/'
)({
  component: EditIncomingFormComponent,
});

/** Default location options for incoming gate pass */
const DEFAULT_INCOMING_LOCATIONS: Option<string>[] = [
  { label: 'Jindal Ice And Cold Store', value: 'Jindal Ice And Cold Store' },
  { label: 'Goyal Tarai Seed Shed', value: 'Goyal Tarai Seed Shed' },
];

function EditIncomingFormComponent() {
  const [isSummarySheetOpen, setIsSummarySheetOpen] = useState(false);

  // Mocking variables for UI purposes
  const isLoadingVoucher = false;
  const voucherNumberDisplay = '#12345';

  return (
    <main className="font-custom mx-auto max-w-2xl px-4 py-6 sm:px-8 sm:py-12">
      {/* Header */}
      <div className="mb-8 space-y-4">
        <h1 className="font-custom text-3xl font-bold text-[#333] sm:text-4xl dark:text-white">
          Edit Incoming Order
        </h1>

        {/* Voucher Number Badge */}
        {isLoadingVoucher ? (
          <div className="bg-primary/20 inline-block rounded-full px-4 py-1.5">
            <span className="font-custom text-primary text-sm font-medium">
              Loading voucher number...
            </span>
          </div>
        ) : voucherNumberDisplay ? (
          <div className="bg-primary/20 inline-block rounded-full px-4 py-1.5">
            <span className="font-custom text-primary text-sm font-medium">
              VOUCHER NO: {voucherNumberDisplay}
            </span>
          </div>
        ) : null}
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
                  options={[]}
                  placeholder="Search or Create Farmer"
                  searchPlaceholder="Search by name, account number, or mobile..."
                  className="w-full"
                  buttonClassName="w-full justify-between"
                />
              </div>
              <AddFarmerModal links={[]} onFarmerAdded={() => {}} />
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
              <SearchSelector
                id="variety-select"
                options={POTATO_VARIETIES}
                placeholder="Select a variety"
                searchPlaceholder="Search variety..."
                className="w-full"
                buttonClassName="w-full justify-between"
              />
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
            <SearchSelector
              id="location-select"
              options={DEFAULT_INCOMING_LOCATIONS}
              placeholder="Select location"
              searchPlaceholder="Search location..."
              className="w-full"
              buttonClassName="w-full justify-between"
            />
          </Field>

          {/* Date Selection */}
          <Field>
            <DatePicker label="Date of Submission" id="date-of-submission" />
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
                />
              </Field>
            </div>

            <p className="text-muted-foreground font-custom text-sm">
              <span className="text-foreground font-medium">Net (kg):</span>{' '}
              0.00
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
              id="remarks"
              name="remarks"
              placeholder="Max 500 characters"
              maxLength={500}
              rows={3}
              className="border-input bg-background ring-offset-background focus-visible:ring-primary font-custom flex w-full rounded-md border px-3 py-2 text-base focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50"
            />
          </Field>
        </FieldGroup>

        {/* Submit Buttons */}
        <div className="flex justify-end gap-4 pt-4">
          <Button type="button" variant="outline" className="font-custom">
            Cancel
          </Button>
          <Button
            type="button"
            variant="default"
            size="lg"
            className="font-custom px-8 font-bold"
            onClick={() => setIsSummarySheetOpen(true)}
          >
            Update
          </Button>
        </div>
      </form>

      {/* Summary Sheet Component */}
      <SummarySheet
        open={isSummarySheetOpen}
        onOpenChange={setIsSummarySheetOpen}
        voucherNumberDisplay={voucherNumberDisplay}
        selectedFarmer={null}
        formValues={{
          date: '',
          variety: '',
          location: '',
          truckNumber: '',
          bagsReceived: 0,
        }}
        isPending={false}
        isLoadingVoucher={false}
        gatePassNo={12345}
        onSubmit={() => setIsSummarySheetOpen(false)}
      />
    </main>
  );
}

export default EditIncomingFormComponent;
