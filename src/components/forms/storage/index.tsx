import { memo, useMemo, useState, useCallback } from 'react';
import { useForm } from '@tanstack/react-form';
import * as z from 'zod';

import { Button } from '@/components/ui/button';
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from '@/components/ui/field';
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
import { useGetReceiptVoucherNumber } from '@/services/store-admin/functions/useGetVoucherNumber';
import { useGetGradingGatePasses } from '@/services/store-admin/grading-gate-pass/useGetGradingGatePasses';
import { formatDate } from '@/lib/helpers';
import type { GradingGatePass } from '@/types/grading-gate-pass';
import { Columns } from 'lucide-react';
import { QuantityRemoveDialog } from './quantity-remove-dialog';
import { GradingGatePassCell } from './grading-gate-pass-cell';

function buildFormSchema() {
  return z.object({
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

const StorageGatePassForm = memo(function StorageGatePassForm() {
  const { data: voucherNumber, isLoading: isLoadingVoucher } =
    useGetReceiptVoucherNumber('storage-gate-pass');
  const { data: gradingPasses = [], isLoading: isLoadingPasses } =
    useGetGradingGatePasses();

  const sizes = useMemo(() => getUniqueSizes(gradingPasses), [gradingPasses]);

  const [removedQuantities, setRemovedQuantities] = useState<RemovedQuantities>(
    () => ({})
  );
  const [selectedOrders, setSelectedOrders] = useState<Set<string>>(
    () => new Set()
  );
  const [visibleColumns, setVisibleColumns] = useState<Set<string>>(
    () => new Set()
  );

  // When sizes load, default to all columns visible (avoid setState in effect by deriving in visibleSizes)

  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogPassId, setDialogPassId] = useState<string | null>(null);
  const [dialogSize, setDialogSize] = useState<string | null>(null);
  const [quantityInput, setQuantityInput] = useState('');
  const [quantityError, setQuantityError] = useState('');
  const [dialogMaxQuantity, setDialogMaxQuantity] = useState(0);

  const visibleSizes = useMemo(() => {
    if (visibleColumns.size === 0 && sizes.length > 0) return sizes;
    return sizes.filter((s) => visibleColumns.has(s));
  }, [sizes, visibleColumns]);

  const formSchema = useMemo(() => buildFormSchema(), []);

  const form = useForm({
    defaultValues: {
      date: formatDate(new Date()),
      remarks: '',
    },
    validators: {
      onChange: formSchema,
      onBlur: formSchema,
      onSubmit: formSchema,
    },
    onSubmit: async () => {
      // TODO: Wire to useCreateStorageGatePass when gradingGatePasses / variety are added
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

  const voucherNumberDisplay =
    voucherNumber != null ? `#${voucherNumber}` : null;

  const hasGradingData = gradingPasses.length > 0 && sizes.length > 0;
  const hasExistingQuantity =
    dialogPassId != null &&
    dialogSize != null &&
    (removedQuantities[dialogPassId]?.[dialogSize] ?? 0) > 0;

  return (
    <main className="font-custom mx-auto max-w-2xl px-4 py-6 sm:px-8 sm:py-12">
      {/* Header */}
      <div className="mb-8 space-y-4">
        <h1 className="font-custom text-3xl font-bold text-[#333] sm:text-4xl dark:text-white">
          Create Storage Gate Pass
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
              Storage Gate Pass {voucherNumberDisplay}
            </span>
          </div>
        ) : null}
      </div>

      {/* Form */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          e.stopPropagation();
          form.handleSubmit();
        }}
        className="space-y-6"
      >
        <FieldGroup className="space-y-6">
          {/* Date */}
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
                    id="storage-gate-pass-date"
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

          {/* Grading gate passes – Card + Table */}
          <Card>
            <CardHeader>
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <CardTitle className="font-custom text-xl">
                    Grading Gate Passes
                  </CardTitle>
                  <CardDescription className="font-custom text-muted-foreground text-sm">
                    {hasGradingData
                      ? `Select quantities to remove from each size. Use the Columns button to show or hide size columns.`
                      : 'Load grading gate passes to see orders.'}
                  </CardDescription>
                </div>
                {hasGradingData && sizes.length > 0 && (
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
                      {sizes.map((size) => (
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
                (visibleSizes.length === 0 ? (
                  <div className="font-custom text-muted-foreground py-8 text-center text-sm">
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
                        {gradingPasses.map((pass) => (
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
                              const detail = getOrderDetailForSize(pass, size);
                              const removed =
                                removedQuantities[pass._id]?.[size] ?? 0;
                              if (!detail) {
                                return (
                                  <TableCell key={size} className="py-2">
                                    <div className="bg-muted/30 border-border/40 h-20 rounded-lg border" />
                                  </TableCell>
                                );
                              }
                              return (
                                <TableCell key={size} className="py-2">
                                  <GradingGatePassCell
                                    variety={pass.variety}
                                    location={size}
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
                  htmlFor="storage-gate-pass-remarks"
                  className="font-custom text-base font-semibold"
                >
                  Remarks (optional)
                </FieldLabel>
                <textarea
                  id="storage-gate-pass-remarks"
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
            disabled={isLoadingVoucher || voucherNumber == null}
          >
            Submit
          </Button>
        </div>
      </form>

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
