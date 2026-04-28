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
import { useEditFarmerSeedEntry } from '@/services/store-admin/farmer-seed/useEditFarmerSeedEntry';
import {
  FarmerSeedSummarySheet,
  type FarmerSeedSummaryBagSize,
} from './-SummarySheet';

type EditSeedSearch = {
  id?: string;
  farmerLinkId?: string;
  farmerName?: string;
  farmerAccountNumber?: string;
  gatePassNo?: string;
  invoiceNumber?: string;
  date?: string;
  variety?: string;
  generation?: string;
  remarks?: string;
  bagSizesJson?: string;
};

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
  '/store-admin/_authenticated/farmer-seed-gate-pass/edit/'
)({
  validateSearch: (search: Record<string, unknown>): EditSeedSearch => ({
    id: search.id ? String(search.id) : undefined,
    farmerLinkId: search.farmerLinkId ? String(search.farmerLinkId) : undefined,
    farmerName: search.farmerName ? String(search.farmerName) : undefined,
    farmerAccountNumber: search.farmerAccountNumber
      ? String(search.farmerAccountNumber)
      : undefined,
    gatePassNo: search.gatePassNo ? String(search.gatePassNo) : undefined,
    invoiceNumber: search.invoiceNumber
      ? String(search.invoiceNumber)
      : undefined,
    date: search.date ? String(search.date) : undefined,
    variety: search.variety ? String(search.variety) : undefined,
    generation: search.generation ? String(search.generation) : undefined,
    remarks: search.remarks ? String(search.remarks) : undefined,
    bagSizesJson: search.bagSizesJson ? String(search.bagSizesJson) : undefined,
  }),
  component: FarmerSeedEditForm,
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

function toDisplayDate(value?: string): string {
  if (!value) return formatDate(new Date());
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return formatDate(new Date());
  return formatDate(parsed);
}

function formatAcresValue(value: number) {
  return Number.isInteger(value)
    ? String(value)
    : value.toFixed(2).replace(/\.?0+$/, '');
}

function formatSeedAmount(value: number) {
  return `Rs. ${Math.round(value).toLocaleString('en-IN')}`;
}

function mapInitialBagSizes(bagSizesJson?: string): {
  fixedRows: FarmerSeedBagSizeRow[];
  extraRows: FarmerSeedExtraBagSizeRow[];
} {
  if (!bagSizesJson) {
    return { fixedRows: defaultBagSizes, extraRows: [] };
  }

  try {
    const parsed = JSON.parse(bagSizesJson) as Array<Record<string, unknown>>;
    if (!Array.isArray(parsed))
      return { fixedRows: defaultBagSizes, extraRows: [] };

    const normalized = parsed
      .map((row) => ({
        name: String(row.name ?? '').trim(),
        quantity: Number(row.quantity ?? 0),
        rate: Number(row.rate ?? 0),
        acres: Number(row.acres ?? 0),
      }))
      .filter((row) => row.name.length > 0)
      .map((row) => ({
        ...row,
        quantity: Number.isFinite(row.quantity)
          ? Math.max(0, Math.trunc(row.quantity))
          : 0,
        rate: Number.isFinite(row.rate) ? Math.max(0, row.rate) : 0,
        acres: Number.isFinite(row.acres) ? Math.max(0, row.acres) : 0,
      }));

    if (normalized.length === 0) {
      return { fixedRows: defaultBagSizes, extraRows: [] };
    }

    const fixedRows = defaultBagSizes.map((defaultRow) => {
      const found = normalized.find((row) => row.name === defaultRow.name);
      return found ?? defaultRow;
    });

    const extraRows = normalized
      .filter(
        (row) =>
          !FARMER_SEED_DEFAULT_SIZES.includes(
            row.name as (typeof FARMER_SEED_DEFAULT_SIZES)[number]
          )
      )
      .map((row) => ({ ...row, id: crypto.randomUUID() }));

    return { fixedRows, extraRows };
  } catch {
    return { fixedRows: defaultBagSizes, extraRows: [] };
  }
}

function FarmerSeedEditForm() {
  const navigate = useNavigate();
  const search = Route.useSearch();
  const {
    data: farmerLinks = [],
    refetch: refetchFarmers,
    isLoading: isLoadingFarmers,
  } = useGetAllFarmers();
  const { mutate: editFarmerSeedEntry, isPending } = useEditFarmerSeedEntry();
  const [isSummarySheetOpen, setIsSummarySheetOpen] = useState(false);

  const initialBagRows = useMemo(
    () => mapInitialBagSizes(search.bagSizesJson),
    [search.bagSizesJson]
  );

  const [farmerStorageLinkId, setFarmerStorageLinkId] = useState(
    search.farmerLinkId ?? ''
  );
  const [gatePassNo, setGatePassNo] = useState(search.gatePassNo ?? '');
  const [invoiceNumber, setInvoiceNumber] = useState(
    search.invoiceNumber ?? ''
  );
  const [date, setDate] = useState(toDisplayDate(search.date));
  const [variety, setVariety] = useState(search.variety ?? '');
  const [generation, setGeneration] = useState(search.generation ?? '');
  const [remarks, setRemarks] = useState(search.remarks ?? '');
  const [bagSizes, setBagSizes] = useState<FarmerSeedBagSizeRow[]>(
    initialBagRows.fixedRows
  );
  const [extraBagSizeRows, setExtraBagSizeRows] = useState<
    FarmerSeedExtraBagSizeRow[]
  >(initialBagRows.extraRows);

  const farmerOptions: Option<string>[] = useMemo(() => {
    const options = farmerLinks
      .filter((link) => link.isActive)
      .map((link) => ({
        value: link._id,
        label: `${link.farmerId.name} (Account #${link.accountNumber})`,
        searchableText: `${link.farmerId.name} ${link.accountNumber} ${link.farmerId.mobileNumber} ${link.farmerId.address}`,
      }));

    if (
      search.farmerLinkId &&
      search.farmerName &&
      !options.some((option) => option.value === search.farmerLinkId)
    ) {
      options.unshift({
        value: search.farmerLinkId,
        label: `${search.farmerName} (Account #${search.farmerAccountNumber ?? '--'})`,
        searchableText:
          `${search.farmerName} ${search.farmerAccountNumber ?? ''}`.trim(),
      });
    }

    return options;
  }, [
    farmerLinks,
    search.farmerAccountNumber,
    search.farmerLinkId,
    search.farmerName,
  ]);

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

  const canSubmit =
    Boolean(search.id) &&
    totalQty > 0 &&
    Boolean(variety) &&
    Boolean(generation);

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
    if (!search.id) {
      toast.error('Missing farmer seed id. Please open edit from Daybook.');
      return;
    }
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
    if (!search.id) {
      toast.error('Missing farmer seed id. Please open edit from Daybook.');
      return;
    }

    editFarmerSeedEntry(
      {
        id: search.id,
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
          Edit Farmer Seed Entry
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
        farmerName={selectedFarmer?.farmerId.name ?? search.farmerName}
        farmerAccountNumber={
          selectedFarmer?.accountNumber !== undefined
            ? String(selectedFarmer.accountNumber)
            : search.farmerAccountNumber
        }
        remarks={remarks}
        bagSizes={allBagSizes}
        isPending={isPending}
        onSubmit={handleSubmit}
      />
    </main>
  );
}
