import { memo, useMemo, useState, useCallback } from 'react';
import { useForm } from '@tanstack/react-form';
import { useNavigate } from '@tanstack/react-router';
import * as z from 'zod';

import { Button } from '@/components/ui/button';
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { DatePicker } from '@/components/forms/date-picker';
import { SearchSelector } from '@/components/forms/search-selector';
import { useGetReceiptVoucherNumber } from '@/services/store-admin/functions/useGetVoucherNumber';
import { useGetGradingGatePasses } from '@/services/store-admin/grading-gate-pass/useGetGradingGatePasses';
import { useCreateNikasiGatePass } from '@/services/store-admin/nikasi-gate-pass/useCreateNikasiGatePass';
import {
  formatDate,
  formatDateToISO,
  parseDateToTimestamp,
} from '@/lib/helpers';
import type { GradingGatePass } from '@/types/grading-gate-pass';
import type { CreateNikasiGatePassGradingEntry } from '@/types/nikasi-gate-pass';
import { ArrowDown, ArrowUp, ChevronRight, Columns } from 'lucide-react';
import { QuantityRemoveDialog } from '@/components/forms/storage/quantity-remove-dialog';
import { GradingGatePassCell } from '@/components/forms/storage/grading-gate-pass-cell';
import {
  NikasiSummarySheet,
  type NikasiSummaryGradingEntry,
  type NikasiSummaryFormValues,
} from './summary-sheet';

function buildFormSchema() {
  return z.object({
    from: z.string().min(1, 'From is required'),
    toField: z.string().min(1, 'To is required'),
    date: z.string().min(1, 'Date is required'),
    remarks: z
      .string()
      .trim()
      .max(500, 'Remarks must not exceed 500 characters'),
  });
}

/** Collect unique sizes from all grading passes, sorted */
function getUniqueSizes(passes: GradingGatePass[]): string[] {
  const set = new Set<string>();
  for (const pass of passes) {
    for (const detail of pass.orderDetails ?? []) {
      if (detail.size) set.add(detail.size);
    }
  }
  return Array.from(set).sort();
}

/** Collect unique varieties from all grading passes, sorted */
function getUniqueVarieties(passes: GradingGatePass[]): string[] {
  const set = new Set<string>();
  for (const pass of passes) {
    if (pass.variety?.trim()) set.add(pass.variety.trim());
  }
  return Array.from(set).sort();
}

/** Get order detail for a given size from a grading pass */
function getOrderDetailForSize(
  pass: GradingGatePass,
  size: string
): { currentQuantity: number; initialQuantity: number } | null {
  const detail = pass.orderDetails?.find((d) => d.size === size);
  if (!detail) return null;
  return {
    currentQuantity: detail.currentQuantity ?? 0,
    initialQuantity: detail.initialQuantity ?? 0,
  };
}

type RemovedQuantities = Record<string, Record<string, number>>;

const NikasiGatePassForm = memo(function NikasiGatePassForm() {
  const { data: voucherNumber, isLoading: isLoadingVoucher } =
    useGetReceiptVoucherNumber('nikasi-gate-pass');
  const { data: gradingPasses = [], isLoading: isLoadingPasses } =
    useGetGradingGatePasses();
  const navigate = useNavigate();
  const { mutate: createNikasiGatePass, isPending } = useCreateNikasiGatePass();

  const varieties = useMemo(
    () => getUniqueVarieties(gradingPasses),
    [gradingPasses]
  );

  const [varietyFilter, setVarietyFilter] = useState<string>('');
  const [dateFilterFrom, setDateFilterFrom] = useState<string>('');
  const [dateFilterTo, setDateFilterTo] = useState<string>('');
  const [dateSort, setDateSort] = useState<'asc' | 'desc'>('desc');
  const [isSummarySheetOpen, setIsSummarySheetOpen] = useState(false);

  const filteredAndSortedPasses = useMemo(() => {
    let list = gradingPasses;
    if (varietyFilter) {
      list = list.filter((p) => p.variety?.trim() === varietyFilter);
    }
    const fromTs = dateFilterFrom ? parseDateToTimestamp(dateFilterFrom) : null;
    const toTs = dateFilterTo ? parseDateToTimestamp(dateFilterTo) : null;
    if (fromTs != null && !Number.isNaN(fromTs)) {
      list = list.filter((p) => parseDateToTimestamp(p.date) >= fromTs);
    }
    if (toTs != null && !Number.isNaN(toTs)) {
      list = list.filter((p) => parseDateToTimestamp(p.date) <= toTs);
    }
    return [...list].sort((a, b) => {
      const ta = parseDateToTimestamp(a.date);
      const tb = parseDateToTimestamp(b.date);
      if (Number.isNaN(ta) || Number.isNaN(tb)) return 0;
      return dateSort === 'asc' ? ta - tb : tb - ta;
    });
  }, [gradingPasses, varietyFilter, dateFilterFrom, dateFilterTo, dateSort]);

  const [removedQuantities, setRemovedQuantities] = useState<RemovedQuantities>(
    () => ({})
  );
  const [selectedOrders, setSelectedOrders] = useState<Set<string>>(
    () => new Set()
  );
  const [visibleColumns, setVisibleColumns] = useState<Set<string>>(
    () => new Set()
  );

  const [dialogOpen, setDialogOpen] = useState(false);
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

  const formSchema = useMemo(() => buildFormSchema(), []);

  const form = useForm({
    defaultValues: {
      from: '',
      toField: '',
      date: formatDate(new Date()),
      remarks: '',
    },
    validators: {
      onChange: formSchema,
      onBlur: formSchema,
      onSubmit: formSchema,
    },
    onSubmit: async ({ value }) => {
      const gradingGatePasses: CreateNikasiGatePassGradingEntry[] =
        Object.entries(removedQuantities)
          .filter(([_, sizes]) => Object.values(sizes).some((q) => q > 0))
          .map(([gradingGatePassId, sizes]) => ({
            gradingGatePassId,
            allocations: Object.entries(sizes)
              .filter(([_, qty]) => qty > 0)
              .map(([size, quantityToAllocate]) => ({
                size,
                quantityToAllocate,
              })),
          }));

      const firstPassId = Object.keys(removedQuantities).find((id) =>
        Object.values(removedQuantities[id] ?? {}).some((q) => q > 0)
      );
      const firstPass = filteredAndSortedPasses.find(
        (p) => p._id === firstPassId
      );
      const variety = firstPass?.variety?.trim() ?? '';

      if (!voucherNumber) return;
      createNikasiGatePass(
        {
          gatePassNo: voucherNumber,
          date: formatDateToISO(value.date),
          variety,
          from: value.from.trim(),
          toField: value.toField.trim(),
          gradingGatePasses,
          remarks: value.remarks.trim() || undefined,
        },
        {
          onSuccess: () => {
            setRemovedQuantities({});
            setIsSummarySheetOpen(false);
            form.reset();
            navigate({ to: '/store-admin/daybook' });
          },
        }
      );
    },
  });

  const setRemoved = useCallback(
    (gradingPassId: string, size: string, quantity: number) => {
      setRemovedQuantities((prev) => {
        const next = { ...prev };
        const passEntry = { ...(next[gradingPassId] ?? {}) };
        if (quantity <= 0) {
          delete passEntry[size];
        } else {
          passEntry[size] = quantity;
        }
        if (Object.keys(passEntry).length === 0) delete next[gradingPassId];
        else next[gradingPassId] = passEntry;
        return next;
      });
    },
    []
  );

  const openDialog = useCallback(
    (pass: GradingGatePass, size: string) => {
      const detail = getOrderDetailForSize(pass, size);
      if (!detail || detail.currentQuantity <= 0) return;
      const existing = removedQuantities[pass._id]?.[size] ?? 0;
      setDialogPassId(pass._id);
      setDialogSize(size);
      setQuantityInput(existing > 0 ? String(existing) : '');
      setQuantityError('');
      setDialogMaxQuantity(detail.currentQuantity);
      setDialogOpen(true);
    },
    [removedQuantities]
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
    if (dialogPassId && dialogSize) setRemoved(dialogPassId, dialogSize, qty);
    setDialogOpen(false);
    setDialogPassId(null);
    setDialogSize(null);
  }, [quantityInput, dialogPassId, dialogSize, setRemoved, validateQuantity]);

  const handleQuantityRemove = useCallback(() => {
    if (dialogPassId && dialogSize) setRemoved(dialogPassId, dialogSize, 0);
    setDialogOpen(false);
    setDialogPassId(null);
    setDialogSize(null);
  }, [dialogPassId, dialogSize, setRemoved]);

  const handleDialogClose = useCallback(() => {
    setDialogOpen(false);
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

  const hasAnyQuantity = useMemo(
    () =>
      Object.values(removedQuantities).some((sizes) =>
        Object.values(sizes).some((q) => q > 0)
      ),
    [removedQuantities]
  );

  const handleNext = useCallback(() => {
    if (!hasAnyQuantity) return;
    setIsSummarySheetOpen(true);
  }, [hasAnyQuantity]);

  const voucherNumberDisplay =
    voucherNumber != null ? `#${voucherNumber}` : null;
  const gatePassNo = voucherNumber ?? 0;

  const summaryFormValues = useMemo((): NikasiSummaryFormValues => {
    const gradingGatePasses: NikasiSummaryGradingEntry[] = Object.entries(
      removedQuantities
    )
      .filter(([_, sizes]) => Object.values(sizes).some((q) => q > 0))
      .map(([gradingGatePassId, sizes]) => {
        const pass = filteredAndSortedPasses.find(
          (p) => p._id === gradingGatePassId
        );
        return {
          gradingGatePassId,
          gatePassNo: pass?.gatePassNo,
          date: pass?.date,
          allocations: Object.entries(sizes)
            .filter(([_, qty]) => qty > 0)
            .map(([size, quantityToAllocate]) => {
              const detail = pass ? getOrderDetailForSize(pass, size) : null;
              return {
                size,
                quantityToAllocate,
                availableQuantity: detail?.currentQuantity ?? 0,
              };
            }),
        };
      });
    const firstPassId = Object.keys(removedQuantities).find((id) =>
      Object.values(removedQuantities[id] ?? {}).some((q) => q > 0)
    );
    const firstPass = filteredAndSortedPasses.find(
      (p) => p._id === firstPassId
    );
    const variety = firstPass?.variety?.trim() ?? '';
    return {
      date: form.state.values.date,
      from: form.state.values.from ?? '',
      toField: form.state.values.toField ?? '',
      remarks: form.state.values.remarks ?? '',
      gradingGatePasses,
      variety,
    };
  }, [
    removedQuantities,
    filteredAndSortedPasses,
    form.state.values.date,
    form.state.values.from,
    form.state.values.toField,
    form.state.values.remarks,
  ]);

  const hasGradingData = gradingPasses.length > 0;
  const hasFilteredData =
    filteredAndSortedPasses.length > 0 && tableSizes.length > 0;
  const hasActiveFilters =
    !!varietyFilter || !!dateFilterFrom || !!dateFilterTo;
  const hasExistingQuantity =
    dialogPassId != null &&
    dialogSize != null &&
    (removedQuantities[dialogPassId]?.[dialogSize] ?? 0) > 0;

  const isFormValid =
    (form.state.values.from ?? '').trim() !== '' &&
    (form.state.values.toField ?? '').trim() !== '' &&
    (form.state.values.date ?? '').trim() !== '';

  return (
    <main className="font-custom mx-auto max-w-7xl px-4 py-6 sm:px-8 sm:py-12">
      <div className="mb-8 space-y-4">
        <h1 className="font-custom text-3xl font-bold text-[#333] sm:text-4xl dark:text-white">
          Create Nikasi Gate Pass
        </h1>

        {isLoadingVoucher ? (
          <div className="bg-primary/20 inline-block rounded-full px-4 py-1.5">
            <span className="font-custom text-primary text-sm font-medium">
              Loading voucher number...
            </span>
          </div>
        ) : voucherNumberDisplay ? (
          <div className="bg-primary/20 inline-block rounded-full px-4 py-1.5">
            <span className="font-custom text-primary text-sm font-medium">
              Nikasi Gate Pass {voucherNumberDisplay}
            </span>
          </div>
        ) : null}
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          e.stopPropagation();
          handleNext();
        }}
        className="space-y-6"
      >
        <FieldGroup className="space-y-6">
          {/* From, To, Date */}
          <Card>
            <CardHeader>
              <CardTitle className="font-custom text-xl">
                Gate pass details
              </CardTitle>
              <CardDescription className="font-custom text-muted-foreground text-sm">
                Enter From, To, and Date for this nikasi gate pass.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <form.Field
                name="from"
                children={(field) => {
                  const isInvalid =
                    field.state.meta.isTouched && !field.state.meta.isValid;
                  return (
                    <Field data-invalid={isInvalid}>
                      <FieldLabel
                        htmlFor="nikasi-from"
                        className="font-custom text-sm"
                      >
                        From
                      </FieldLabel>
                      <Input
                        id="nikasi-from"
                        value={field.state.value ?? ''}
                        onBlur={field.handleBlur}
                        onChange={(e) => field.handleChange(e.target.value)}
                        placeholder="e.g. Location / Party"
                        className="font-custom"
                      />
                      {isInvalid && (
                        <FieldError
                          errors={
                            field.state.meta.errors as Array<
                              { message?: string } | undefined
                            >
                          }
                        />
                      )}
                    </Field>
                  );
                }}
              />
              <form.Field
                name="toField"
                children={(field) => {
                  const isInvalid =
                    field.state.meta.isTouched && !field.state.meta.isValid;
                  return (
                    <Field data-invalid={isInvalid}>
                      <FieldLabel
                        htmlFor="nikasi-to"
                        className="font-custom text-sm"
                      >
                        To
                      </FieldLabel>
                      <Input
                        id="nikasi-to"
                        value={field.state.value ?? ''}
                        onBlur={field.handleBlur}
                        onChange={(e) => field.handleChange(e.target.value)}
                        placeholder="e.g. Location / Party"
                        className="font-custom"
                      />
                      {isInvalid && (
                        <FieldError
                          errors={
                            field.state.meta.errors as Array<
                              { message?: string } | undefined
                            >
                          }
                        />
                      )}
                    </Field>
                  );
                }}
              />
              <form.Field
                name="date"
                children={(field) => {
                  const isInvalid =
                    field.state.meta.isTouched && !field.state.meta.isValid;
                  return (
                    <Field data-invalid={isInvalid}>
                      <DatePicker
                        value={field.state.value}
                        onChange={(value) => field.handleChange(value)}
                        label="Date"
                        id="nikasi-gate-pass-date"
                      />
                      {isInvalid && (
                        <FieldError
                          errors={
                            field.state.meta.errors as Array<
                              { message?: string } | undefined
                            >
                          }
                        />
                      )}
                    </Field>
                  );
                }}
              />
            </CardContent>
          </Card>

          {/* Grading gate passes table */}
          <Card>
            <CardHeader>
              <div className="flex flex-col gap-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <CardTitle className="font-custom text-xl">
                      Grading Gate Passes
                    </CardTitle>
                    <CardDescription className="font-custom text-muted-foreground text-sm">
                      {hasGradingData
                        ? 'Select quantities to issue from each size. Use the Columns button to show or hide size columns.'
                        : 'Load grading gate passes to see orders.'}
                    </CardDescription>
                  </div>
                  {hasGradingData && tableSizes.length > 0 && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="font-custom gap-2"
                        >
                          <Columns className="h-4 w-4" />
                          Columns
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-48">
                        <DropdownMenuLabel className="font-custom">
                          Toggle Columns
                        </DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        {tableSizes.map((size) => (
                          <DropdownMenuCheckboxItem
                            key={size}
                            checked={visibleColumns.has(size)}
                            onCheckedChange={() => handleColumnToggle(size)}
                            className="font-custom"
                          >
                            {size}
                          </DropdownMenuCheckboxItem>
                        ))}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                </div>

                {hasGradingData && (
                  <div className="border-border/60 bg-muted/30 flex flex-wrap items-end gap-3 rounded-lg border px-3 py-3 sm:gap-4">
                    <div className="flex flex-col gap-1.5">
                      <label
                        htmlFor="nikasi-grading-variety-filter"
                        className="font-custom text-muted-foreground text-xs font-medium"
                      >
                        Variety
                      </label>
                      <SearchSelector
                        id="nikasi-grading-variety-filter"
                        options={[
                          { value: '', label: 'All varieties' },
                          ...varieties.map((v) => ({ value: v, label: v })),
                        ]}
                        placeholder="All varieties"
                        onSelect={(value) => setVarietyFilter(value ?? '')}
                        defaultValue={varietyFilter || ''}
                        buttonClassName="font-custom w-[160px] sm:w-[180px]"
                      />
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <span className="font-custom text-muted-foreground text-xs font-medium">
                        Date from
                      </span>
                      <DatePicker
                        value={dateFilterFrom}
                        onChange={(v) => setDateFilterFrom(v ?? '')}
                        id="nikasi-grading-date-from"
                        label=""
                      />
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <span className="font-custom text-muted-foreground text-xs font-medium">
                        Date to
                      </span>
                      <DatePicker
                        value={dateFilterTo}
                        onChange={(v) => setDateFilterTo(v ?? '')}
                        id="nikasi-grading-date-to"
                        label=""
                      />
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <span className="font-custom text-muted-foreground text-xs font-medium">
                        Sort by date
                      </span>
                      <div className="flex gap-1">
                        <Button
                          type="button"
                          variant={
                            dateSort === 'desc' ? 'default' : 'outline'
                          }
                          size="sm"
                          className="font-custom gap-1.5"
                          onClick={() => setDateSort('desc')}
                        >
                          <ArrowDown className="h-4 w-4" />
                          Newest first
                        </Button>
                        <Button
                          type="button"
                          variant={dateSort === 'asc' ? 'default' : 'outline'}
                          size="sm"
                          className="font-custom gap-1.5"
                          onClick={() => setDateSort('asc')}
                        >
                          <ArrowUp className="h-4 w-4" />
                          Oldest first
                        </Button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </CardHeader>

            <CardContent>
              {isLoadingPasses && (
                <p className="font-custom text-muted-foreground text-sm">
                  Loading grading gate passes...
                </p>
              )}

              {!isLoadingPasses && !hasGradingData && (
                <p className="font-custom text-muted-foreground text-sm">
                  No grading gate passes available. Create grading gate passes
                  first.
                </p>
              )}

              {!isLoadingPasses &&
                hasGradingData &&
                !hasFilteredData &&
                (hasActiveFilters ? (
                  <p className="font-custom text-muted-foreground py-6 text-center text-sm">
                    No passes match the current filters. Try adjusting variety or
                    date range.
                  </p>
                ) : (
                  <p className="font-custom text-muted-foreground py-6 text-center text-sm">
                    No grading gate passes with order details. Create grading
                    gate passes first.
                  </p>
                ))}

              {!isLoadingPasses &&
                hasGradingData &&
                hasFilteredData &&
                (visibleSizes.length === 0 ? (
                  <div className="font-custom text-muted-foreground py-8 text-center">
                    No columns selected. Use the Columns button to show columns.
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow className="hover:bg-transparent">
                          <TableHead className="font-custom text-foreground/80 w-[120px] font-medium">
                            R. Voucher
                          </TableHead>
                          {visibleSizes.map((size) => (
                            <TableHead
                              key={size}
                              className="font-custom text-foreground/80 font-medium"
                            >
                              {size}
                            </TableHead>
                          ))}
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredAndSortedPasses.map((pass) => (
                          <TableRow
                            key={pass._id}
                            className="border-border/40 hover:bg-transparent"
                          >
                            <TableCell className="py-3">
                              <div className="flex items-center gap-2.5">
                                <Checkbox
                                  checked={selectedOrders.has(pass._id)}
                                  onCheckedChange={() =>
                                    handleOrderToggle(pass._id)
                                  }
                                  className="data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                                />
                                <span className="font-custom text-foreground/90 font-medium">
                                  #{pass.gatePassNo}
                                </span>
                              </div>
                            </TableCell>
                            {visibleSizes.map((size) => {
                              const detail = getOrderDetailForSize(
                                pass,
                                size
                              );
                              const removed =
                                removedQuantities[pass._id]?.[size] ?? 0;
                              if (!detail) {
                                return (
                                  <TableCell key={size} className="py-1">
                                    <div className="bg-muted/30 border-border/40 h-[58px] w-[70px] rounded-md border" />
                                  </TableCell>
                                );
                              }
                              return (
                                <TableCell key={size} className="py-1">
                                  <GradingGatePassCell
                                    variety={pass.variety}
                                    currentQuantity={detail.currentQuantity}
                                    initialQuantity={detail.initialQuantity}
                                    removedQuantity={removed}
                                    onClick={() => openDialog(pass, size)}
                                    onQuickRemove={() => {
                                      setRemoved(pass._id, size, 0);
                                    }}
                                    disabled={detail.currentQuantity <= 0}
                                  />
                                </TableCell>
                              );
                            })}
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                ))}
            </CardContent>
          </Card>

          {/* Remarks */}
          <form.Field
            name="remarks"
            children={(field) => (
              <Field>
                <FieldLabel
                  htmlFor="nikasi-gate-pass-remarks"
                  className="font-custom text-base font-semibold"
                >
                  Remarks (optional)
                </FieldLabel>
                <textarea
                  id="nikasi-gate-pass-remarks"
                  name={field.name}
                  value={field.state.value ?? ''}
                  onBlur={field.handleBlur}
                  onChange={(e) => field.handleChange(e.target.value)}
                  placeholder="Max 500 characters"
                  maxLength={500}
                  rows={3}
                  className="border-input bg-background ring-offset-background focus-visible:ring-primary font-custom flex w-full rounded-md border px-3 py-2 text-base focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50"
                />
              </Field>
            )}
          />
        </FieldGroup>

        <div className="flex flex-col gap-3 pt-4 sm:flex-row sm:justify-end sm:gap-4">
          <Button
            type="button"
            variant="outline"
            className="font-custom order-2 w-full sm:order-1 sm:w-auto"
            onClick={() => form.reset()}
          >
            Reset
          </Button>
          <Button
            type="submit"
            variant="default"
            size="lg"
            className="font-custom order-1 w-full px-8 font-bold sm:order-2 sm:w-auto"
            disabled={
              isLoadingVoucher ||
              voucherNumber == null ||
              !hasAnyQuantity ||
              !isFormValid
            }
          >
            Next: Review summary
            <ChevronRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      </form>

      <NikasiSummarySheet
        open={isSummarySheetOpen}
        onOpenChange={setIsSummarySheetOpen}
        voucherNumberDisplay={voucherNumberDisplay}
        formValues={summaryFormValues}
        isPending={isPending}
        isLoadingVoucher={isLoadingVoucher}
        gatePassNo={gatePassNo}
        onSubmit={() => form.handleSubmit()}
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

export default NikasiGatePassForm;
