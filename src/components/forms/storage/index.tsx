import { memo, useMemo, useState, useCallback, useRef, useEffect } from 'react';
import { useNavigate } from '@tanstack/react-router';

import { Field, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { useGetReceiptVoucherNumber } from '@/services/store-admin/functions/useGetVoucherNumber';
import { useGetGradingGatePasses } from '@/services/store-admin/grading-gate-pass/useGetGradingGatePasses';
import { useCreateBulkStorageGatePasses } from '@/services/store-admin/storage-gate-pass/useCreateBulkStorageGatePasses';
import { toast } from 'sonner';
import { formatDateToISO } from '@/lib/helpers';
import type { GradingGatePass } from '@/types/grading-gate-pass';
import type { CreateStorageGatePassGradingEntry } from '@/types/storage-gate-pass';

import {
  getUniqueSizes,
  getUniqueVarieties,
  getOrderDetailForSize,
  groupPassesByFarmer,
  groupPassesByDate,
  toDisplayGroups,
  toDisplayGroupsFromDate,
} from '@/components/forms/storage/storage-form-utils';
import {
  createDefaultPass,
  type StoragePassState,
  type StorageGatePassFormProps,
} from '@/components/forms/storage/storage-form-types';

import { StorageFormHeader } from '@/components/forms/storage/StorageFormHeader';
import { StorageFormStepIndicator } from '@/components/forms/storage/StorageFormStepIndicator';
import { Step1BagsCard } from '@/components/forms/storage/Step1BagsCard';
import { Step2LocationCard } from '@/components/forms/storage/Step2LocationCard';
import { StorageFormFooter } from '@/components/forms/storage/StorageFormFooter';
import { QuantityRemoveDialog } from '@/components/forms/storage/quantity-remove-dialog';
import {
  StorageSummarySheet,
  type StorageSummaryGradingEntry,
  type StorageSummaryFormValues,
} from '@/components/forms/storage/summary-sheet';

const StorageGatePassForm = memo(function StorageGatePassForm({
  farmerStorageLinkId,
  gradingPassId,
}: StorageGatePassFormProps) {
  const { data: voucherNumber, isLoading: isLoadingVoucher } =
    useGetReceiptVoucherNumber('storage-gate-pass');
  const { data: allGradingPasses = [], isLoading: isLoadingPasses } =
    useGetGradingGatePasses();

  const varieties = useMemo(
    () => getUniqueVarieties(allGradingPasses),
    [allGradingPasses]
  );

  const initialVarietySet = useRef(false);
  const [varietyFilter, setVarietyFilter] = useState<string>('');

  useEffect(() => {
    if (
      !gradingPassId ||
      allGradingPasses.length === 0 ||
      initialVarietySet.current
    )
      return;
    const pass = allGradingPasses.find((p) => p._id === gradingPassId);
    const variety = pass?.variety?.trim();
    if (!variety) return;
    initialVarietySet.current = true;
    queueMicrotask(() => setVarietyFilter(variety));
  }, [gradingPassId, allGradingPasses]);

  const navigate = useNavigate();
  const { mutate: createBulkStorageGatePasses, isPending } =
    useCreateBulkStorageGatePasses();
  const [voucherSort, setVoucherSort] = useState<'asc' | 'desc'>('asc');
  const [groupBy, setGroupBy] = useState<'farmer' | 'date'>('farmer');
  const [manualGatePassNumberInput, setManualGatePassNumberInput] =
    useState<string>('');
  const [formStep, setFormStep] = useState<1 | 2>(1);
  const [isSummarySheetOpen, setIsSummarySheetOpen] = useState(false);
  const [locationErrors, setLocationErrors] = useState<
    Record<string, Record<string, string>>
  >({});

  const filteredAndSortedPasses = useMemo(() => {
    if (!varietyFilter.trim()) return [];
    const list = allGradingPasses.filter(
      (p) => p.variety?.trim() === varietyFilter
    );
    return [...list].sort((a, b) => {
      const na = a.gatePassNo ?? 0;
      const nb = b.gatePassNo ?? 0;
      return voucherSort === 'asc' ? na - nb : nb - na;
    });
  }, [allGradingPasses, varietyFilter, voucherSort]);

  const displayGroups = useMemo(() => {
    if (groupBy === 'farmer') {
      return toDisplayGroups(
        groupPassesByFarmer(filteredAndSortedPasses, voucherSort)
      );
    }
    return toDisplayGroupsFromDate(
      groupPassesByDate(filteredAndSortedPasses, voucherSort)
    );
  }, [filteredAndSortedPasses, voucherSort, groupBy]);

  const [passes, setPasses] = useState<StoragePassState[]>(() => [
    createDefaultPass(`pass-${Date.now()}`),
  ]);
  const [selectedOrders, setSelectedOrders] = useState<Set<string>>(
    () => new Set()
  );
  const [visibleColumns, setVisibleColumns] = useState<Set<string>>(
    () => new Set()
  );

  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogStoragePassId, setDialogStoragePassId] = useState<string | null>(
    null
  );
  const [dialogPassId, setDialogPassId] = useState<string | null>(null);
  const [dialogSize, setDialogSize] = useState<string | null>(null);
  const [quantityInput, setQuantityInput] = useState('');
  const [quantityError, setQuantityError] = useState('');
  const [dialogMaxQuantity, setDialogMaxQuantity] = useState(0);

  const tableSizes = useMemo(
    () => getUniqueSizes(filteredAndSortedPasses),
    [filteredAndSortedPasses]
  );

  const visibleSizes = useMemo(() => {
    if (visibleColumns.size === 0 && tableSizes.length > 0) return tableSizes;
    return tableSizes.filter((s) => visibleColumns.has(s));
  }, [tableSizes, visibleColumns]);

  const updatePass = useCallback(
    (passId: string, patch: Partial<Omit<StoragePassState, 'id'>>) => {
      setPasses((prev) =>
        prev.map((p) => (p.id === passId ? { ...p, ...patch } : p))
      );
    },
    []
  );

  const setRemoved = useCallback(
    (
      storagePassId: string,
      gradingPassId: string,
      size: string,
      quantity: number
    ) => {
      setPasses((prev) =>
        prev.map((p) => {
          if (p.id !== storagePassId) return p;
          const next = { ...p.removedQuantities };
          const passEntry = { ...(next[gradingPassId] ?? {}) };
          if (quantity <= 0) {
            delete passEntry[size];
          } else {
            passEntry[size] = quantity;
          }
          if (Object.keys(passEntry).length === 0) delete next[gradingPassId];
          else next[gradingPassId] = passEntry;
          return { ...p, removedQuantities: next };
        })
      );
    },
    []
  );

  const openDialog = useCallback(
    (storagePassId: string, gradingPass: GradingGatePass, size: string) => {
      const detail = getOrderDetailForSize(gradingPass, size);
      if (!detail || detail.currentQuantity <= 0) return;
      const pass = passes.find((p) => p.id === storagePassId);
      const existing = pass?.removedQuantities[gradingPass._id]?.[size] ?? 0;
      setDialogStoragePassId(storagePassId);
      setDialogPassId(gradingPass._id);
      setDialogSize(size);
      setQuantityInput(existing > 0 ? String(existing) : '');
      setQuantityError('');
      setDialogMaxQuantity(detail.currentQuantity);
      setDialogOpen(true);
    },
    [passes]
  );

  const validateQuantity = useCallback(
    (input: string): string => {
      if (!input.trim()) return 'Quantity is required';
      const parsed = parseFloat(input);
      if (Number.isNaN(parsed)) return 'Enter a valid number';
      if (parsed < 0) return 'Quantity cannot be negative';
      if (parsed > dialogMaxQuantity)
        return `Quantity cannot exceed ${dialogMaxQuantity.toFixed(1)}`;
      return '';
    },
    [dialogMaxQuantity]
  );

  const handleQuantityInputChange = useCallback(
    (value: string) => {
      setQuantityInput(value);
      setQuantityError(validateQuantity(value));
    },
    [validateQuantity]
  );

  const handleQuantitySubmit = useCallback(() => {
    const err = validateQuantity(quantityInput);
    if (err) {
      setQuantityError(err);
      return;
    }
    const qty = parseFloat(quantityInput);
    if (dialogStoragePassId && dialogPassId && dialogSize)
      setRemoved(dialogStoragePassId, dialogPassId, dialogSize, qty);
    setDialogOpen(false);
    setDialogStoragePassId(null);
    setDialogPassId(null);
    setDialogSize(null);
  }, [
    quantityInput,
    dialogStoragePassId,
    dialogPassId,
    dialogSize,
    setRemoved,
    validateQuantity,
  ]);

  const handleQuantityRemove = useCallback(() => {
    if (dialogStoragePassId && dialogPassId && dialogSize)
      setRemoved(dialogStoragePassId, dialogPassId, dialogSize, 0);
    setDialogOpen(false);
    setDialogStoragePassId(null);
    setDialogPassId(null);
    setDialogSize(null);
  }, [dialogStoragePassId, dialogPassId, dialogSize, setRemoved]);

  const handleDialogClose = useCallback(() => {
    setDialogOpen(false);
    setDialogStoragePassId(null);
    setDialogPassId(null);
    setDialogSize(null);
  }, []);

  const handleColumnToggle = useCallback((size: string) => {
    setVisibleColumns((prev) => {
      const next = new Set(prev);
      if (next.has(size)) next.delete(size);
      else next.add(size);
      return next;
    });
  }, []);

  const handleOrderToggle = useCallback((passId: string) => {
    setSelectedOrders((prev) => {
      const next = new Set(prev);
      if (next.has(passId)) next.delete(passId);
      else next.add(passId);
      return next;
    });
  }, []);

  const getSizesWithQuantityForPass = useCallback(
    (pass: StoragePassState): string[] => {
      const set = new Set<string>();
      for (const sizes of Object.values(pass.removedQuantities)) {
        for (const [size, qty] of Object.entries(sizes)) {
          if (qty > 0) set.add(size);
        }
      }
      return Array.from(set).sort();
    },
    []
  );

  const setLocationForSize = useCallback(
    (
      passId: string,
      size: string,
      field: 'chamber' | 'floor' | 'row',
      value: string
    ) => {
      setPasses((prev) =>
        prev.map((p) => {
          if (p.id !== passId) return p;
          return {
            ...p,
            sizeLocations: {
              ...p.sizeLocations,
              [size]: {
                ...(p.sizeLocations[size] ?? {
                  chamber: '',
                  floor: '',
                  row: '',
                }),
                [field]: value,
              },
            },
          };
        })
      );
      setLocationErrors((prev) => {
        const next = { ...prev };
        if (next[passId]) {
          const passErrs = { ...next[passId] };
          delete passErrs[size];
          if (Object.keys(passErrs).length === 0) delete next[passId];
          else next[passId] = passErrs;
        }
        return next;
      });
    },
    []
  );

  const hasAnyQuantity = useMemo(
    () =>
      passes.some((p) =>
        Object.values(p.removedQuantities).some((sizes) =>
          Object.values(sizes).some((q) => q > 0)
        )
      ),
    [passes]
  );

  const isFormValidStep1 = useMemo(
    () => varietyFilter.trim() !== '' && hasAnyQuantity,
    [varietyFilter, hasAnyQuantity]
  );

  const isFormValidStep2 = useMemo(
    () => passes.every((p) => (p.date ?? '').trim() !== ''),
    [passes]
  );

  const validateLocations = useCallback((): boolean => {
    const errors: Record<string, Record<string, string>> = {};
    for (const pass of passes) {
      const sizesWithQty = getSizesWithQuantityForPass(pass);
      if (sizesWithQty.length === 0) continue;
      const passErrs: Record<string, string> = {};
      for (const size of sizesWithQty) {
        const loc = pass.sizeLocations[size];
        if (!loc?.chamber?.trim()) passErrs[size] = 'Chamber is required';
        else if (!loc?.floor?.trim()) passErrs[size] = 'Floor is required';
        else if (!loc?.row?.trim()) passErrs[size] = 'Row is required';
      }
      if (Object.keys(passErrs).length > 0) errors[pass.id] = passErrs;
    }
    setLocationErrors(errors);
    return Object.keys(errors).length === 0;
  }, [passes, getSizesWithQuantityForPass]);

  const handleStep1Next = useCallback(() => {
    if (varietyFilter.trim() === '') {
      toast.error('Please select a variety from the filter.');
      return;
    }
    if (!hasAnyQuantity) {
      toast.error('Select at least one bag quantity.');
      return;
    }
    setPasses((prev) =>
      prev.map((p) => {
        const sizesWithQty = getSizesWithQuantityForPass(p);
        if (sizesWithQty.length === 0) return p;
        const nextLocations = { ...p.sizeLocations };
        for (const size of sizesWithQty) {
          if (!nextLocations[size])
            nextLocations[size] = { chamber: '', floor: '', row: '' };
        }
        return { ...p, sizeLocations: nextLocations };
      })
    );
    setLocationErrors({});
    setFormStep(2);
  }, [varietyFilter, hasAnyQuantity, getSizesWithQuantityForPass]);

  const handleStep2Next = useCallback(() => {
    if (!isFormValidStep2) {
      toast.error('Please fill date for every pass.');
      return;
    }
    if (!validateLocations()) {
      toast.error(
        'Please fill chamber, floor and row for each selected size in every pass.'
      );
      return;
    }
    setIsSummarySheetOpen(true);
  }, [isFormValidStep2, validateLocations]);

  const handleStep2Back = useCallback(() => {
    setFormStep(1);
    setLocationErrors({});
  }, []);

  const voucherNumberDisplay =
    voucherNumber != null && varietyFilter.trim() !== ''
      ? passes.length === 1
        ? `#${voucherNumber}`
        : `#${voucherNumber}–#${voucherNumber + passes.length - 1}`
      : null;
  const gatePassNo = voucherNumber ?? 0;

  const summaryFormValues = useMemo((): StorageSummaryFormValues => {
    const passSummaries: StorageSummaryFormValues['passes'] = passes.map(
      (pass) => {
        const gradingGatePasses: StorageSummaryGradingEntry[] = Object.entries(
          pass.removedQuantities
        )
          .filter(([_, sizes]) => Object.values(sizes).some((q) => q > 0))
          .map(([gradingGatePassId, sizes]) => {
            const gp = filteredAndSortedPasses.find(
              (p) => p._id === gradingGatePassId
            );
            return {
              gradingGatePassId,
              gatePassNo: gp?.gatePassNo,
              date: gp?.date,
              allocations: Object.entries(sizes)
                .filter(([_, qty]) => qty > 0)
                .map(([size, quantityToAllocate]) => {
                  const detail = gp ? getOrderDetailForSize(gp, size) : null;
                  const loc = pass.sizeLocations[size];
                  return {
                    size,
                    quantityToAllocate,
                    chamber: loc?.chamber ?? '',
                    floor: loc?.floor ?? '',
                    row: loc?.row ?? '',
                    availableQuantity: detail?.currentQuantity ?? 0,
                  };
                }),
            };
          });
        return {
          date: pass.date,
          variety: varietyFilter.trim(),
          remarks: pass.remarks,
          gradingGatePasses,
        };
      }
    );
    return { passes: passSummaries };
  }, [passes, filteredAndSortedPasses, varietyFilter]);

  const handleSubmit = useCallback(() => {
    if (!voucherNumber) return;
    const manualStart =
      manualGatePassNumberInput.trim() === ''
        ? null
        : parseInt(manualGatePassNumberInput.trim(), 10);
    const useManual =
      typeof manualStart === 'number' &&
      !Number.isNaN(manualStart) &&
      manualStart > 0;

    const apiPasses = passes.map((pass, index) => {
      const gradingGatePasses: CreateStorageGatePassGradingEntry[] =
        Object.entries(pass.removedQuantities)
          .filter(([_, sizes]) => Object.values(sizes).some((q) => q > 0))
          .map(([gradingGatePassId, sizes]) => {
            const locs = pass.sizeLocations;
            return {
              gradingGatePassId,
              allocations: Object.entries(sizes)
                .filter(([_, qty]) => qty > 0)
                .map(([size, quantityToAllocate]) => ({
                  size,
                  quantityToAllocate,
                  chamber: locs[size]?.chamber ?? '',
                  floor: locs[size]?.floor ?? '',
                  row: locs[size]?.row ?? '',
                })),
            };
          });
      return {
        farmerStorageLinkId,
        gatePassNo: voucherNumber + index,
        ...(useManual ? { manualGatePassNumber: manualStart + index } : {}),
        date: formatDateToISO(pass.date),
        variety: varietyFilter.trim(),
        gradingGatePasses,
        remarks: pass.remarks.trim() || undefined,
      };
    });
    const passesWithAllocations = apiPasses.filter((p) =>
      p.gradingGatePasses.some((g) =>
        g.allocations.some((a) => a.quantityToAllocate > 0)
      )
    );
    if (passesWithAllocations.length === 0) return;
    createBulkStorageGatePasses(
      { passes: passesWithAllocations },
      {
        onSuccess: () => {
          setPasses([createDefaultPass(`pass-${Date.now()}`)]);
          setIsSummarySheetOpen(false);
          navigate({ to: '/store-admin/daybook' });
        },
      }
    );
  }, [
    passes,
    voucherNumber,
    varietyFilter,
    farmerStorageLinkId,
    manualGatePassNumberInput,
    createBulkStorageGatePasses,
    navigate,
  ]);

  const hasGradingData = allGradingPasses.length > 0;
  const hasFilteredData =
    filteredAndSortedPasses.length > 0 && tableSizes.length > 0;
  const currentDialogPass = passes.find((p) => p.id === dialogStoragePassId);
  const hasExistingQuantity =
    dialogStoragePassId != null &&
    dialogPassId != null &&
    dialogSize != null &&
    (currentDialogPass?.removedQuantities[dialogPassId]?.[dialogSize] ?? 0) > 0;

  const filterBarProps = useMemo(
    () => ({
      varietyFilter,
      onVarietyFilterChange: setVarietyFilter,
      voucherSort,
      onVoucherSortChange: setVoucherSort,
      groupBy,
      onGroupByChange: setGroupBy,
      varieties,
      tableSizes,
      visibleColumns,
      onColumnToggle: handleColumnToggle,
      hasGradingData,
    }),
    [
      varietyFilter,
      voucherSort,
      groupBy,
      varieties,
      tableSizes,
      visibleColumns,
      handleColumnToggle,
      hasGradingData,
    ]
  );

  return (
    <main className="font-custom mx-auto max-w-7xl px-4 py-6 sm:px-8 sm:py-12">
      <StorageFormHeader
        varietySelected={varietyFilter.trim() !== ''}
        isLoadingVoucher={isLoadingVoucher}
        voucherNumberDisplay={voucherNumberDisplay}
      />

      <form
        onSubmit={(e) => {
          e.preventDefault();
          e.stopPropagation();
          if (formStep === 1) handleStep1Next();
          else handleStep2Next();
        }}
        className="space-y-6"
      >
        <StorageFormStepIndicator formStep={formStep} />

        {formStep === 1 && (
          <Field>
            <FieldLabel
              htmlFor="storage-manual-gate-pass-no"
              className="font-custom text-sm"
            >
              Manual Gate Pass No (optional)
            </FieldLabel>
            <Input
              id="storage-manual-gate-pass-no"
              type="number"
              min={1}
              step={1}
              placeholder="e.g. 101"
              value={manualGatePassNumberInput}
              onChange={(e) => setManualGatePassNumberInput(e.target.value)}
              className="font-custom w-full max-w-48"
            />
          </Field>
        )}

        <FieldGroup className="space-y-6">
          {formStep === 1 &&
            passes.map((pass, passIndex) => (
              <Step1BagsCard
                key={pass.id}
                pass={pass}
                showFilters={passIndex === 0}
                filterBarProps={filterBarProps}
                displayGroups={displayGroups}
                visibleSizes={visibleSizes}
                selectedOrders={selectedOrders}
                onOrderToggle={handleOrderToggle}
                onCellClick={(gp, size) => openDialog(pass.id, gp, size)}
                onQuickRemove={(gradingPassId, size) =>
                  setRemoved(pass.id, gradingPassId, size, 0)
                }
                isLoadingPasses={isLoadingPasses}
                hasGradingData={hasGradingData}
                hasFilteredData={hasFilteredData}
                varietyFilter={varietyFilter}
              />
            ))}

          {formStep === 2 &&
            passes.map((pass) => {
              const sizesWithQty = getSizesWithQuantityForPass(pass);
              const passLocationErrors = locationErrors[pass.id] ?? {};
              if (sizesWithQty.length === 0) return null;
              return (
                <Step2LocationCard
                  key={pass.id}
                  pass={pass}
                  sizesWithQuantity={sizesWithQty}
                  locationErrors={passLocationErrors}
                  onDateChange={(value) => updatePass(pass.id, { date: value })}
                  onLocationChange={(size, field, value) =>
                    setLocationForSize(pass.id, size, field, value)
                  }
                  onRemarksChange={(value) =>
                    updatePass(pass.id, { remarks: value })
                  }
                />
              );
            })}
        </FieldGroup>

        <StorageFormFooter
          formStep={formStep}
          onReset={() => {
            setPasses([createDefaultPass(`pass-${Date.now()}`)]);
            setFormStep(1);
            setManualGatePassNumberInput('');
            toast.info('Form reset');
          }}
          onStep2Back={handleStep2Back}
          isLoadingVoucher={isLoadingVoucher}
          voucherNumber={voucherNumber ?? null}
          isFormValidStep1={isFormValidStep1}
        />
      </form>

      <StorageSummarySheet
        open={isSummarySheetOpen}
        onOpenChange={setIsSummarySheetOpen}
        voucherNumberDisplay={voucherNumberDisplay}
        formValues={summaryFormValues}
        isPending={isPending}
        isLoadingVoucher={isLoadingVoucher}
        gatePassNo={gatePassNo}
        onSubmit={handleSubmit}
      />

      <QuantityRemoveDialog
        open={dialogOpen}
        onOpenChange={(open) => !open && handleDialogClose()}
        quantityInput={quantityInput}
        quantityError={quantityError}
        maxQuantity={dialogMaxQuantity}
        hasExistingQuantity={!!hasExistingQuantity}
        onQuantityInputChange={handleQuantityInputChange}
        onQuantitySubmit={handleQuantitySubmit}
        onQuantityRemove={handleQuantityRemove}
        onClose={handleDialogClose}
      />
    </main>
  );
});

export default StorageGatePassForm;
