/* eslint-disable react-refresh/only-export-components */
import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useMemo, useState, type KeyboardEvent } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

import { AddFarmerModal } from '@/components/forms/add-farmer-modal';
import { DatePicker } from '@/components/date-picker';
import {
  SearchSelector,
  type Option,
} from '@/components/forms/search-selector';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Field, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import {
  FARMER_SEED_GENERATIONS,
  GRADING_SIZES,
  POTATO_VARIETIES,
} from '@/lib/constants';
import { formatDate, formatDateToISO } from '@/lib/helpers';
import { useGetAllFarmers } from '@/services/store-admin/people/useGetAllFarmers';
import { useCreateFarmerSeedEntry } from '@/services/store-admin/farmer-seed/useCreateFarmerSeedEntry';
import {
  FarmerSeedSummarySheet,
  type FarmerSeedSummaryBagSize,
} from './edit/-SummarySheet';

type FarmerSeedBagSizeRow = FarmerSeedSummaryBagSize;
type FarmerSeedExtraBagSizeRow = FarmerSeedSummaryBagSize & { id: string };

const FARMER_SEED_DEFAULT_SIZES = [
  'Below 30',
  '30-40',
  '40-50',
  'Above 50',
] as const;

const defaultBagSizes: FarmerSeedBagSizeRow[] = FARMER_SEED_DEFAULT_SIZES.map(
  (size) => ({
    name: size,
    quantity: 0,
    rate: 0,
    acres: 0,
  })
);

export const Route = createFileRoute(
  '/store-admin/_authenticated/farmer-seed-gate-pass/'
)({
  component: FarmerSeedCreateForm,
});

function parsePositiveNumber(value: string): number {
  const next = Number(value);
  if (!Number.isFinite(next)) return 0;
  return Math.max(0, next);
}

const preventNumberInputArrowKeys = (
  event: KeyboardEvent<HTMLInputElement>
) => {
  if (event.key === 'ArrowUp' || event.key === 'ArrowDown') {
    event.preventDefault();
  }
};

function formatAcresValue(value: number) {
  return Number.isInteger(value)
    ? String(value)
    : value.toFixed(2).replace(/\.?0+$/, '');
}

function formatSeedAmount(value: number) {
  return `Rs. ${Math.round(value).toLocaleString('en-IN')}`;
}

function FarmerSeedCreateForm() {
  const navigate = useNavigate();
  const {
    data: farmerLinks = [],
    refetch: refetchFarmers,
    isLoading: isLoadingFarmers,
  } = useGetAllFarmers();
  const { mutate: createFarmerSeedEntry, isPending } =
    useCreateFarmerSeedEntry();
  const [isSummarySheetOpen, setIsSummarySheetOpen] = useState(false);

  const [farmerStorageLinkId, setFarmerStorageLinkId] = useState('');
  const [gatePassNo, setGatePassNo] = useState('');
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [date, setDate] = useState(formatDate(new Date()));
  const [variety, setVariety] = useState('');
  const [generation, setGeneration] = useState('');
  const [remarks, setRemarks] = useState('');
  const [bagSizes, setBagSizes] =
    useState<FarmerSeedBagSizeRow[]>(defaultBagSizes);
  const [extraBagSizeRows, setExtraBagSizeRows] = useState<
    FarmerSeedExtraBagSizeRow[]
  >([]);

  const farmerOptions: Option<string>[] = useMemo(() => {
    return farmerLinks
      .filter((link) => link.isActive)
      .map((link) => ({
        value: link._id,
        label: `${link.farmerId.name} (Account #${link.accountNumber})`,
        searchableText: `${link.farmerId.name} ${link.accountNumber} ${link.farmerId.mobileNumber} ${link.farmerId.address}`,
      }));
  }, [farmerLinks]);

  const selectedFarmer = useMemo(() => {
    if (!farmerStorageLinkId) return null;
    return farmerLinks.find((link) => link._id === farmerStorageLinkId) ?? null;
  }, [farmerLinks, farmerStorageLinkId]);

  const allBagSizes = useMemo(
    () => [
      ...bagSizes,
      ...extraBagSizeRows.map(({ id: _id, ...rest }) => rest),
    ],
    [bagSizes, extraBagSizeRows]
  );

  const totalQty = useMemo(
    () => allBagSizes.reduce((sum, row) => sum + (row.quantity ?? 0), 0),
    [allBagSizes]
  );
  const totalAmount = useMemo(
    () =>
      allBagSizes.reduce(
        (sum, row) => sum + (row.quantity ?? 0) * (row.rate ?? 0),
        0
      ),
    [allBagSizes]
  );
  const totalAcres = useMemo(
    () => allBagSizes.reduce((sum, row) => sum + (row.acres ?? 0), 0),
    [allBagSizes]
  );

  const canSubmit = totalQty > 0 && Boolean(variety) && Boolean(generation);

  const addExtraRow = () => {
    const defaultExtraName = GRADING_SIZES[0] ?? '';
    setExtraBagSizeRows((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        name: defaultExtraName,
        quantity: 0,
        rate: 0,
        acres: 0,
      },
    ]);
  };

  const updateExtraRow = (
    id: string,
    updates: Partial<FarmerSeedExtraBagSizeRow>
  ) => {
    setExtraBagSizeRows((prev) =>
      prev.map((row) => (row.id === id ? { ...row, ...updates } : row))
    );
  };

  const removeExtraRow = (id: string) => {
    setExtraBagSizeRows((prev) => prev.filter((row) => row.id !== id));
  };

  const handleOpenSummary = () => {
    if (!variety || !generation) {
      toast.error('Please select variety and generation.');
      return;
    }
    if (totalQty <= 0) {
      toast.error('Please enter quantity for at least one bag size.');
      return;
    }
    setIsSummarySheetOpen(true);
  };

  const handleSubmit = () => {
    createFarmerSeedEntry(
      {
        farmerStorageLinkId: farmerStorageLinkId || undefined,
        gatePassNo: gatePassNo ? parsePositiveNumber(gatePassNo) : undefined,
        invoiceNumber: invoiceNumber.trim() || undefined,
        date: formatDateToISO(date),
        variety: variety.trim() || undefined,
        generation: generation.trim() || undefined,
        bagSizes: allBagSizes
          .filter((row) => (row.quantity ?? 0) > 0)
          .map((row) => ({
            name: row.name,
            quantity: Math.max(0, Math.trunc(row.quantity ?? 0)),
            rate: Math.max(0, Number(row.rate ?? 0)),
            acres: Math.max(0, Number(row.acres ?? 0)),
          })),
        remarks: remarks.trim() || undefined,
      },
      {
        onSuccess: (response) => {
          if (!response.success) return;
          setIsSummarySheetOpen(false);
          navigate({ to: '/store-admin/daybook' });
        },
      }
    );
  };

  return (
    <main className="font-custom mx-auto max-w-2xl px-4 py-6 sm:px-8 sm:py-12">
      <div className="mb-8 space-y-4">
        <h1 className="font-custom text-foreground text-3xl font-bold sm:text-4xl">
          Add Farmer Seed Entry
        </h1>
      </div>

      <form className="space-y-6" onSubmit={(e) => e.preventDefault()}>
        <FieldGroup className="space-y-6">
          <Field>
            <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
              <div className="flex-1">
                <FieldLabel
                  htmlFor="farmer-seed-farmer-select"
                  className="font-custom mb-2 block text-base font-semibold"
                >
                  Enter Account Name (search and select)
                </FieldLabel>
                <SearchSelector
                  id="farmer-seed-farmer-select"
                  options={farmerOptions}
                  placeholder="Search or Create Farmer"
                  searchPlaceholder="Search by name, account number, or mobile..."
                  onSelect={(value) => setFarmerStorageLinkId(value)}
                  value={farmerStorageLinkId}
                  loading={isLoadingFarmers}
                  loadingMessage="Loading farmers..."
                  emptyMessage="No farmers found"
                  className="w-full"
                  buttonClassName="w-full justify-between"
                />
              </div>
              <AddFarmerModal
                links={farmerLinks}
                onFarmerAdded={() => refetchFarmers()}
              />
            </div>
          </Field>

          <Field>
            <FieldLabel className="font-custom mb-2 block text-base font-semibold">
              Gate Pass No
            </FieldLabel>
            <Input
              type="number"
              min={0}
              step={1}
              placeholder="Enter gate pass number"
              value={gatePassNo}
              onChange={(e) => setGatePassNo(e.target.value)}
              onWheel={(e) => e.currentTarget.blur()}
              onKeyDown={preventNumberInputArrowKeys}
              className="font-custom [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
            />
          </Field>

          <Field>
            <FieldLabel className="font-custom mb-2 block text-base font-semibold">
              Invoice Number
            </FieldLabel>
            <Input
              type="text"
              placeholder="Enter invoice number"
              value={invoiceNumber}
              onChange={(e) => setInvoiceNumber(e.target.value)}
              className="font-custom"
            />
          </Field>

          <Field>
            <DatePicker
              id="farmer-seed-date"
              label="Date"
              value={date}
              onChange={(value) => setDate(value)}
            />
          </Field>

          <Field>
            <FieldLabel className="font-custom mb-2 block text-base font-semibold">
              Select Variety
            </FieldLabel>
            <SearchSelector
              options={POTATO_VARIETIES}
              placeholder="Select a variety"
              searchPlaceholder="Search variety..."
              onSelect={(value) => setVariety(value ?? '')}
              value={variety}
              buttonClassName="w-full justify-between"
            />
          </Field>

          <Field>
            <FieldLabel className="font-custom mb-2 block text-base font-semibold">
              Select Generation
            </FieldLabel>
            <SearchSelector
              id="farmer-seed-generation"
              options={FARMER_SEED_GENERATIONS}
              placeholder="Select generation"
              searchPlaceholder="Search generation..."
              onSelect={(value) => setGeneration(value ?? '')}
              value={generation}
              buttonClassName="w-full justify-between"
            />
          </Field>

          <Field>
            <FieldLabel className="font-custom mb-2 block text-base font-semibold">
              Remarks (optional)
            </FieldLabel>
            <Input
              type="text"
              placeholder="Enter remarks"
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              className="font-custom"
            />
          </Field>

          <Card className="overflow-hidden">
            <CardHeader className="space-y-1.5 pb-4">
              <CardTitle className="font-custom text-foreground text-xl font-semibold">
                Enter Bag Sizes
              </CardTitle>
              <CardDescription className="font-custom text-muted-foreground text-sm">
                Add quantity and rate for each size. Use Add Size for additional
                grading sizes.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {bagSizes.map((row, index) => (
                <div
                  key={`${row.name}-${index}`}
                  className="grid grid-cols-1 gap-2 sm:grid-cols-4 sm:items-center sm:gap-4"
                >
                  <label
                    htmlFor={`farmer-seed-size-${index}`}
                    className="font-custom text-foreground text-base font-normal"
                  >
                    {row.name}
                  </label>
                  <Input
                    id={`farmer-seed-size-${index}`}
                    type="number"
                    min={0}
                    step={1}
                    placeholder="Qty"
                    value={row.quantity === 0 ? '' : String(row.quantity)}
                    onChange={(e) => {
                      const next = [...bagSizes];
                      next[index] = {
                        ...next[index],
                        quantity: parsePositiveNumber(e.target.value),
                      };
                      setBagSizes(next);
                    }}
                    onWheel={(e) => e.currentTarget.blur()}
                    onKeyDown={preventNumberInputArrowKeys}
                    className="font-custom [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                  />
                  <Input
                    type="number"
                    min={0}
                    step="0.01"
                    placeholder="Rate"
                    value={row.rate === 0 ? '' : String(row.rate)}
                    onChange={(e) => {
                      const next = [...bagSizes];
                      next[index] = {
                        ...next[index],
                        rate: parsePositiveNumber(e.target.value),
                      };
                      setBagSizes(next);
                    }}
                    onWheel={(e) => e.currentTarget.blur()}
                    onKeyDown={preventNumberInputArrowKeys}
                    className="font-custom [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                  />
                  <Input
                    type="number"
                    min={0}
                    step="0.01"
                    placeholder="Acres"
                    value={row.acres === 0 ? '' : String(row.acres)}
                    onChange={(e) => {
                      const next = [...bagSizes];
                      next[index] = {
                        ...next[index],
                        acres: parsePositiveNumber(e.target.value),
                      };
                      setBagSizes(next);
                    }}
                    onWheel={(e) => e.currentTarget.blur()}
                    onKeyDown={preventNumberInputArrowKeys}
                    className="font-custom [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                  />
                </div>
              ))}

              {extraBagSizeRows.map((row) => (
                <div
                  key={row.id}
                  className="grid grid-cols-1 gap-2 sm:grid-cols-4 sm:items-center sm:gap-4"
                >
                  <div className="flex min-w-0 items-center gap-2">
                    <select
                      aria-label="Select bag size"
                      value={row.name}
                      onChange={(e) =>
                        updateExtraRow(row.id, { name: e.target.value })
                      }
                      className="border-input bg-background text-foreground font-custom focus-visible:ring-primary h-9 min-w-0 flex-1 rounded-md border px-3 py-1.5 text-sm focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
                    >
                      {GRADING_SIZES.map((size) => (
                        <option key={size} value={size}>
                          {size}
                        </option>
                      ))}
                    </select>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="text-muted-foreground hover:text-destructive shrink-0"
                      onClick={() => removeExtraRow(row.id)}
                      aria-label={`Remove ${row.name || 'size'} row`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                  <Input
                    type="number"
                    min={0}
                    step={1}
                    placeholder="Qty"
                    value={row.quantity === 0 ? '' : String(row.quantity)}
                    onChange={(e) =>
                      updateExtraRow(row.id, {
                        quantity: parsePositiveNumber(e.target.value),
                      })
                    }
                    onWheel={(e) => e.currentTarget.blur()}
                    onKeyDown={preventNumberInputArrowKeys}
                    className="font-custom [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                  />
                  <Input
                    type="number"
                    min={0}
                    step="0.01"
                    placeholder="Rate"
                    value={row.rate === 0 ? '' : String(row.rate)}
                    onChange={(e) =>
                      updateExtraRow(row.id, {
                        rate: parsePositiveNumber(e.target.value),
                      })
                    }
                    onWheel={(e) => e.currentTarget.blur()}
                    onKeyDown={preventNumberInputArrowKeys}
                    className="font-custom [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                  />
                  <Input
                    type="number"
                    min={0}
                    step="0.01"
                    placeholder="Acres"
                    value={row.acres === 0 ? '' : String(row.acres)}
                    onChange={(e) =>
                      updateExtraRow(row.id, {
                        acres: parsePositiveNumber(e.target.value),
                      })
                    }
                    onWheel={(e) => e.currentTarget.blur()}
                    onKeyDown={preventNumberInputArrowKeys}
                    className="font-custom [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                  />
                </div>
              ))}

              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addExtraRow}
                className="font-custom w-full sm:w-auto"
              >
                <Plus className="mr-2 h-4 w-4" />
                Add Size
              </Button>

              <Separator className="my-4" />

              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <span className="font-custom text-foreground text-base font-normal">
                  Total Quantity
                </span>
                <span className="font-custom text-foreground text-base font-medium sm:text-right">
                  {totalQty}
                </span>
              </div>
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <span className="font-custom text-foreground text-base font-normal">
                  Total Acres
                </span>
                <span className="font-custom text-foreground text-base font-medium sm:text-right">
                  {formatAcresValue(totalAcres)}
                </span>
              </div>
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <span className="font-custom text-foreground text-base font-normal">
                  Total Amount
                </span>
                <span className="font-custom text-foreground text-base font-medium sm:text-right">
                  {formatSeedAmount(totalAmount)}
                </span>
              </div>
            </CardContent>
          </Card>
        </FieldGroup>

        <div className="flex flex-wrap items-center justify-end gap-4 pt-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => navigate({ to: '/store-admin/daybook' })}
            className="font-custom"
            disabled={isPending}
          >
            Cancel
          </Button>
          <Button
            type="button"
            variant="default"
            size="lg"
            className="font-custom px-8 font-bold"
            disabled={isPending || !canSubmit}
            onClick={handleOpenSummary}
          >
            Next
          </Button>
        </div>
      </form>

      <FarmerSeedSummarySheet
        open={isSummarySheetOpen}
        onOpenChange={setIsSummarySheetOpen}
        gatePassNo={gatePassNo}
        invoiceNumber={invoiceNumber}
        date={date}
        variety={variety}
        generation={generation}
        farmerName={selectedFarmer?.farmerId.name}
        farmerAccountNumber={
          selectedFarmer?.accountNumber !== undefined
            ? String(selectedFarmer.accountNumber)
            : undefined
        }
        remarks={remarks}
        bagSizes={allBagSizes}
        isPending={isPending}
        onSubmit={handleSubmit}
        description="Review details before creating this entry."
        submitLabel="Create Farmer Seed Entry"
        pendingSubmitLabel="Creating..."
      />
    </main>
  );
}
