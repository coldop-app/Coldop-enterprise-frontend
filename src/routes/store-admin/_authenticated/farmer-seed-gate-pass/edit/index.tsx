/* eslint-disable react-refresh/only-export-components */
import { createFileRoute, useNavigate } from '@tanstack/react-router';
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
} from 'react';
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
import { formatDate, formatDateToISO } from '@/lib/helpers';
import { usePreferencesStore } from '@/stores/store';
import { useGetAllFarmers } from '@/services/store-admin/people/useGetAllFarmers';
import { useEditFarmerSeedEntry } from '@/services/store-admin/farmer-seed/useEditFarmerSeedEntry';
import {
  getBagsPerAcreForVarietySize,
  getRatePerBagForVarietySize,
  getStandardSeedEntryForVariety,
  type StandardSeedBagsPerAcreEntry,
} from '@/services/store-admin/preferences/useGetPreferences';
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

interface SeedQuantityRow {
  name: string;
  quantity: number;
}

type ExtraSeedQuantityRow = {
  id: string;
  name: string;
  quantity: number;
};

type FarmerSeedComputedRow = FarmerSeedSummaryBagSize & {
  bagsPerAcreFromPrefs: number;
};

function dashKeyVariants(label: string): string[] {
  return [label, label.replace(/-/g, '–'), label.replace(/–/g, '-')].filter(
    (v, i, a) => a.indexOf(v) === i
  );
}

function nameMatchesConfigured(rowName: string, configuredName: string) {
  const rowSet = new Set(dashKeyVariants(rowName));
  return dashKeyVariants(configuredName).some((v) => rowSet.has(v));
}

function findCanonicalConfiguredName(
  rowName: string,
  configuredOrder: string[]
): string | null {
  for (const c of configuredOrder) {
    if (nameMatchesConfigured(rowName, c)) return c;
  }
  return null;
}

function getFarmerSeedSizeNamesWithRateAndBagsPerAcre(
  entries: StandardSeedBagsPerAcreEntry[] | undefined,
  variety: string
): string[] {
  const entry = getStandardSeedEntryForVariety(entries, variety);
  if (!entry?.sizes?.length) return [];
  return entry.sizes
    .filter((s) => {
      const rate = getRatePerBagForVarietySize(entries, variety, s.name);
      const bags = getBagsPerAcreForVarietySize(entries, variety, s.name);
      return rate > 0 && bags > 0;
    })
    .map((s) => s.name);
}

function partitionParsedIntoBaseAndExtras(
  parsed: FarmerSeedBagSizeRow[],
  configuredOrder: string[]
): { baseRows: SeedQuantityRow[]; extras: ExtraSeedQuantityRow[] } {
  const remaining = parsed.map((r) => ({ ...r }));
  const baseRows = configuredOrder.map((name) => {
    const idx = remaining.findIndex((r) => nameMatchesConfigured(r.name, name));
    if (idx < 0) return { name, quantity: 0 };
    const qty = remaining[idx].quantity;
    remaining.splice(idx, 1);
    return {
      name,
      quantity: Number.isFinite(qty) ? Math.max(0, Math.trunc(qty)) : 0,
    };
  });
  const extras: ExtraSeedQuantityRow[] = [];
  for (const r of remaining) {
    const canon = findCanonicalConfiguredName(r.name, configuredOrder);
    if (!canon) continue;
    const qty = r.quantity;
    extras.push({
      id: crypto.randomUUID(),
      name: canon,
      quantity: Number.isFinite(qty) ? Math.max(0, Math.trunc(qty)) : 0,
    });
  }
  return { baseRows, extras };
}

function parseBagSizesFromSearchJson(
  bagSizesJson?: string
): FarmerSeedBagSizeRow[] {
  if (!bagSizesJson) return [];
  try {
    const parsed = JSON.parse(bagSizesJson) as Array<Record<string, unknown>>;
    if (!Array.isArray(parsed)) return [];
    return parsed
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
  } catch {
    return [];
  }
}

/** One row: label + Qty + Rate + Acres (same grid as add farmer seed form) */
const bagRowGridClass =
  'grid w-full min-w-[16rem] grid-cols-[minmax(7rem,13rem)_minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)] items-center gap-3';

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

function formatPrefRateDisplay(value: number) {
  if (!Number.isFinite(value) || value === 0) return '';
  if (Number.isInteger(value)) return String(value);
  return value.toFixed(2).replace(/\.?0+$/, '');
}

function calculateAcres(quantity: number, bagsPerAcre: number) {
  if (bagsPerAcre <= 0) return 0;
  return quantity / bagsPerAcre;
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
  const preferences = usePreferencesStore((state) => state.preferences);
  const [isSummarySheetOpen, setIsSummarySheetOpen] = useState(false);
  const [isMarkedAsNull, setIsMarkedAsNull] = useState(false);
  const remarksInputRef = useRef<HTMLInputElement | null>(null);
  const savedParsedBagRowsRef = useRef(
    parseBagSizesFromSearchJson(search.bagSizesJson)
  );
  const hydratedQuantityRowsFromSearchRef = useRef(false);

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
  const [seedQuantityRows, setSeedQuantityRows] = useState<SeedQuantityRow[]>(
    []
  );
  const [extraSeedQuantityRows, setExtraSeedQuantityRows] = useState<
    ExtraSeedQuantityRow[]
  >([]);

  const standardSeedEntries = preferences?.custom.standardSeedBagsPerAcre;

  const configuredFarmerSeedSizeNames = useMemo(
    () =>
      getFarmerSeedSizeNamesWithRateAndBagsPerAcre(
        standardSeedEntries,
        variety
      ),
    [standardSeedEntries, variety]
  );

  const standardSeedEntryForVariety = useMemo(
    () => getStandardSeedEntryForVariety(standardSeedEntries, variety),
    [standardSeedEntries, variety]
  );

  const varietySizeSignature = useMemo(() => {
    if (!variety.trim()) return '';
    return `${variety.trim()}\x1e${configuredFarmerSeedSizeNames.join('\x1e')}`;
  }, [variety, configuredFarmerSeedSizeNames]);

  const varietyHasConfiguredBagSizes = configuredFarmerSeedSizeNames.length > 0;

  const varietyHasStandardEntryButNoRatedSizes =
    Boolean(variety.trim()) &&
    Boolean(standardSeedEntryForVariety?.sizes?.length) &&
    !varietyHasConfiguredBagSizes;

  /* eslint-disable react-hooks/set-state-in-effect -- reset and resync quantity rows when variety or configured sizes from preferences change */
  useEffect(() => {
    if (!variety.trim()) {
      setSeedQuantityRows([]);
      setExtraSeedQuantityRows([]);
      return;
    }
    if (!configuredFarmerSeedSizeNames.length) {
      setSeedQuantityRows([]);
      setExtraSeedQuantityRows([]);
      return;
    }

    if (!hydratedQuantityRowsFromSearchRef.current) {
      hydratedQuantityRowsFromSearchRef.current = true;
      const { baseRows, extras } = partitionParsedIntoBaseAndExtras(
        savedParsedBagRowsRef.current,
        configuredFarmerSeedSizeNames
      );
      setSeedQuantityRows(baseRows);
      setExtraSeedQuantityRows(extras);
      return;
    }

    setSeedQuantityRows((prev) => {
      const prevByName = new Map(prev.map((r) => [r.name, r.quantity]));
      return configuredFarmerSeedSizeNames.map((name) => ({
        name,
        quantity: prevByName.get(name) ?? 0,
      }));
    });
    setExtraSeedQuantityRows((prev) =>
      prev.filter((r) => configuredFarmerSeedSizeNames.includes(r.name))
    );
  }, [varietySizeSignature, configuredFarmerSeedSizeNames, variety]);
  /* eslint-enable react-hooks/set-state-in-effect */

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

  const potatoVarietyOptions = useMemo<Option<string>[]>(() => {
    return preferences?.custom.potatoVarieties ?? [];
  }, [preferences?.custom.potatoVarieties]);

  const farmerSeedGenerationOptions = useMemo<Option<string>[]>(() => {
    return preferences?.custom.farmerSeedGenerations ?? [];
  }, [preferences?.custom.farmerSeedGenerations]);

  const displaySeedRows = useMemo(() => {
    const entries = preferences?.custom.standardSeedBagsPerAcre;
    const v = variety;
    const compute = (row: { name: string; quantity: number }) => {
      const bagsPerAcreFromPrefs = getBagsPerAcreForVarietySize(
        entries,
        v,
        row.name
      );
      const rate = getRatePerBagForVarietySize(entries, v, row.name);
      return {
        name: row.name,
        quantity: row.quantity,
        rate,
        acres: calculateAcres(row.quantity, bagsPerAcreFromPrefs),
        bagsPerAcreFromPrefs,
      } satisfies FarmerSeedComputedRow;
    };
    return [
      ...seedQuantityRows.map((row, index) => ({
        kind: 'base' as const,
        index,
        row,
        computed: compute(row),
      })),
      ...extraSeedQuantityRows.map((row) => ({
        kind: 'extra' as const,
        id: row.id,
        row,
        computed: compute(row),
      })),
    ];
  }, [
    seedQuantityRows,
    extraSeedQuantityRows,
    preferences?.custom.standardSeedBagsPerAcre,
    variety,
  ]);

  const allBagSizes = useMemo(
    () => displaySeedRows.map((r) => r.computed),
    [displaySeedRows]
  );

  const summaryBagSizes: FarmerSeedSummaryBagSize[] = useMemo(
    () =>
      allBagSizes.map((row) => ({
        name: row.name,
        quantity: row.quantity,
        rate: row.rate,
        acres: row.acres,
      })),
    [allBagSizes]
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
    (totalQty > 0 || isMarkedAsNull) &&
    Boolean(variety) &&
    Boolean(generation);

  const addExtraSeedQuantityRow = () => {
    const defaultName = configuredFarmerSeedSizeNames[0] ?? '';
    setExtraSeedQuantityRows((prev) => [
      ...prev,
      { id: crypto.randomUUID(), name: defaultName, quantity: 0 },
    ]);
  };

  const updateExtraSeedQuantityRow = (
    id: string,
    updates: Partial<Pick<ExtraSeedQuantityRow, 'name' | 'quantity'>>
  ) => {
    setExtraSeedQuantityRows((prev) =>
      prev.map((r) => (r.id === id ? { ...r, ...updates } : r))
    );
  };

  const removeExtraSeedQuantityRow = (id: string) => {
    setExtraSeedQuantityRows((prev) => prev.filter((r) => r.id !== id));
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
    if (!isMarkedAsNull) {
      if (!varietyHasConfiguredBagSizes) {
        toast.error(
          varietyHasStandardEntryButNoRatedSizes
            ? 'No bag sizes with both rate and bags per acre for this variety. Complete those fields in Settings → Preferences.'
            : 'This variety has no standard seed bag sizes in preferences.'
        );
        return;
      }
      if (totalQty <= 0) {
        toast.error('Please enter quantity for at least one bag size.');
        return;
      }
    }
    setIsSummarySheetOpen(true);
  };

  const handleClearBags = () => {
    setSeedQuantityRows((prev) => prev.map((row) => ({ ...row, quantity: 0 })));
    setExtraSeedQuantityRows([]);
  };

  const handleMarkAsNull = () => {
    setIsMarkedAsNull(true);
    setSeedQuantityRows((prev) => prev.map((row) => ({ ...row, quantity: 0 })));
    setExtraSeedQuantityRows([]);
    window.requestAnimationFrame(() => {
      remarksInputRef.current?.focus();
    });
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
        bagSizes: summaryBagSizes
          .filter((row) => (row.quantity ?? 0) > 0)
          .map((row) => ({
            name: row.name,
            quantity: Math.max(0, Math.trunc(row.quantity ?? 0)),
            rate: Math.max(0, Number(row.rate ?? 0)),
            acres: Math.max(0, Number(row.acres ?? 0)),
          })),
        remarks: remarks.trim(),
        isMarkedAsNull: isMarkedAsNull || undefined,
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
        <Button
          type="button"
          variant="destructive"
          className="font-custom block w-fit"
          onClick={handleMarkAsNull}
          disabled={isPending || isMarkedAsNull}
        >
          {isMarkedAsNull ? 'Marked as Null' : 'Mark as Null'}
        </Button>
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
              options={potatoVarietyOptions}
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
              options={farmerSeedGenerationOptions}
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
              ref={remarksInputRef}
              type="text"
              placeholder="Enter remarks"
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              className="font-custom"
            />
          </Field>

          <Card className="overflow-hidden">
            <CardHeader className="space-y-1.5 pb-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <CardTitle className="font-custom text-foreground text-xl font-semibold">
                  Enter bag sizes
                </CardTitle>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="font-custom text-muted-foreground hover:text-foreground shrink-0 transition-colors duration-200"
                  onClick={handleClearBags}
                  disabled={
                    isPending || isMarkedAsNull || !varietyHasConfiguredBagSizes
                  }
                >
                  Clear Bags
                </Button>
              </div>
              <CardDescription className="font-custom text-muted-foreground text-sm">
                Only bag sizes with both rate per bag and bags per acre set in
                preferences appear here. Enter quantity; rate and acres follow
                preferences. Use Add more for an extra line (e.g. same size
                again).
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {!variety.trim() ? (
                <p className="text-muted-foreground text-sm">
                  Select a variety to load bag sizes from preferences.
                </p>
              ) : !standardSeedEntryForVariety?.sizes?.length ? (
                <p className="text-muted-foreground text-sm">
                  No standard seed configuration for this variety in
                  preferences. Configure Standard Seed Bags Per Acre in Settings
                  → Preferences.
                </p>
              ) : varietyHasStandardEntryButNoRatedSizes ? (
                <p className="text-muted-foreground text-sm">
                  No bag sizes with both a rate and bags per acre for this
                  variety. Set both values for each size in Settings →
                  Preferences (Standard Seed Bags Per Acre).
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <div className="flex min-w-0 flex-col gap-3">
                    <div
                      className={`text-muted-foreground border-border/60 font-custom border-b pb-2 text-xs font-medium ${bagRowGridClass}`}
                      aria-hidden
                    >
                      <span>Size</span>
                      <span>Qty</span>
                      <span>Rate</span>
                      <span>Acres</span>
                    </div>
                    {displaySeedRows.map((entry) => {
                      if (entry.kind === 'base') {
                        const { index, row, computed } = entry;
                        return (
                          <div
                            key={`base-${row.name}-${index}`}
                            className={`font-custom ${bagRowGridClass}`}
                          >
                            <label
                              htmlFor={`farmer-seed-edit-qty-base-${index}`}
                              className="text-foreground text-base font-normal"
                            >
                              {row.name}
                            </label>
                            <Input
                              id={`farmer-seed-edit-qty-base-${index}`}
                              type="number"
                              min={0}
                              step={1}
                              placeholder="Qty"
                              value={
                                seedQuantityRows[index]?.quantity === 0
                                  ? ''
                                  : String(
                                      seedQuantityRows[index]?.quantity ?? ''
                                    )
                              }
                              onChange={(e) => {
                                const q = parsePositiveNumber(e.target.value);
                                setSeedQuantityRows((prev) =>
                                  prev.map((r, i) =>
                                    i === index ? { ...r, quantity: q } : r
                                  )
                                );
                              }}
                              onWheel={(e) => e.currentTarget.blur()}
                              onKeyDown={preventNumberInputArrowKeys}
                              disabled={isMarkedAsNull}
                              className="[appearance:textfield] rounded-lg [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                            />
                            <Input
                              readOnly
                              tabIndex={-1}
                              aria-label={`Rate from preferences for ${row.name}`}
                              value={formatPrefRateDisplay(computed.rate)}
                              placeholder="Rate"
                              className="bg-muted/40 text-muted-foreground pointer-events-none rounded-lg border-dashed"
                            />
                            <Input
                              readOnly
                              tabIndex={-1}
                              aria-label={`Acres for ${row.name}`}
                              value={formatAcresValue(computed.acres)}
                              className="bg-muted/40 text-muted-foreground pointer-events-none rounded-lg border-dashed"
                            />
                          </div>
                        );
                      }
                      const { id, row, computed } = entry;
                      return (
                        <div
                          key={`extra-${id}`}
                          className={`font-custom ${bagRowGridClass}`}
                        >
                          <div className="flex min-w-0 items-center gap-1">
                            <select
                              aria-label="Select bag size"
                              value={row.name}
                              onChange={(e) =>
                                updateExtraSeedQuantityRow(id, {
                                  name: e.target.value,
                                })
                              }
                              disabled={isMarkedAsNull}
                              className="border-input bg-background text-foreground font-custom focus-visible:ring-primary h-9 min-w-0 flex-1 rounded-md border px-2 py-1.5 text-sm focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
                            >
                              {configuredFarmerSeedSizeNames.map((n) => (
                                <option key={n} value={n}>
                                  {n}
                                </option>
                              ))}
                            </select>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="text-muted-foreground hover:text-destructive h-9 w-9 shrink-0"
                              onClick={() => removeExtraSeedQuantityRow(id)}
                              disabled={isMarkedAsNull}
                              aria-label="Remove extra row"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                          <Input
                            id={`farmer-seed-edit-qty-extra-${id}`}
                            type="number"
                            min={0}
                            step={1}
                            placeholder="Qty"
                            value={
                              row.quantity === 0 ? '' : String(row.quantity)
                            }
                            onChange={(e) => {
                              const q = parsePositiveNumber(e.target.value);
                              updateExtraSeedQuantityRow(id, { quantity: q });
                            }}
                            onWheel={(e) => e.currentTarget.blur()}
                            onKeyDown={preventNumberInputArrowKeys}
                            disabled={isMarkedAsNull}
                            className="[appearance:textfield] rounded-lg [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                          />
                          <Input
                            readOnly
                            tabIndex={-1}
                            aria-label={`Rate from preferences for ${row.name}`}
                            value={formatPrefRateDisplay(computed.rate)}
                            placeholder="Rate"
                            className="bg-muted/40 text-muted-foreground pointer-events-none rounded-lg border-dashed"
                          />
                          <Input
                            readOnly
                            tabIndex={-1}
                            aria-label={`Acres for ${row.name}`}
                            value={formatAcresValue(computed.acres)}
                            className="bg-muted/40 text-muted-foreground pointer-events-none rounded-lg border-dashed"
                          />
                        </div>
                      );
                    })}
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={addExtraSeedQuantityRow}
                      disabled={!varietyHasConfiguredBagSizes || isMarkedAsNull}
                      className="font-custom w-full sm:w-auto"
                    >
                      <Plus className="mr-2 h-4 w-4" />
                      Add more
                    </Button>
                  </div>
                </div>
              )}

              <Separator className="my-4" />

              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <span className="font-custom text-foreground text-base font-normal">
                  Total quantity
                </span>
                <span className="font-custom text-foreground text-base font-medium sm:text-right">
                  {totalQty}
                </span>
              </div>
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <span className="font-custom text-foreground text-base font-normal">
                  Total acres
                </span>
                <span className="font-custom text-foreground text-base font-medium sm:text-right">
                  {formatAcresValue(totalAcres)}
                </span>
              </div>
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <span className="font-custom text-foreground text-base font-normal">
                  Total amount
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
        bagSizes={summaryBagSizes}
        isPending={isPending}
        onSubmit={handleSubmit}
      />
    </main>
  );
}
