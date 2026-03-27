import { memo, useMemo } from 'react';
import { useForm } from '@tanstack/react-form';
import * as z from 'zod';

import { AddFarmerModal } from '@/components/forms/add-farmer-modal';
import {
  SearchSelector,
  type Option,
} from '@/components/forms/search-selector';
import {
  GRADING_SIZES,
  POTATO_VARIETIES,
} from '@/components/forms/grading/constants';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { useGetAllFarmers } from '@/services/store-admin/functions/useGetAllFarmers';
import { useCreateFarmerSeedEntry } from '@/services/store-admin/farmer-seed/useCreateFarmerSeedEntry';
import { FarmerSeedSummarySheet } from '@/components/forms/farmer-seed/summary-sheet';
import { toast } from 'sonner';
import { useState } from 'react';

type FieldErrors = Array<{ message?: string } | undefined>;
type FarmerSeedBagSizeRow = { name: string; quantity: number; rate: number };

const formSchema = z
  .object({
    farmerStorageLinkId: z.string().min(1, 'Please select a farmer'),
    variety: z.string().min(1, 'Please select a variety'),
    bagSizes: z.array(
      z.object({
        name: z.string().min(1, 'Bag size is required'),
        quantity: z.number().int().min(0, 'Quantity must be non-negative'),
        rate: z.number().min(0, 'Rate must be non-negative'),
      })
    ),
  })
  .refine((data) => data.bagSizes.some((item) => (item.quantity ?? 0) > 0), {
    message: 'Please enter quantity for at least one bag size.',
    path: ['bagSizes'],
  });

const defaultBagSizes: FarmerSeedBagSizeRow[] = GRADING_SIZES.map((size) => ({
  name: size,
  quantity: 0,
  rate: 0,
}));

const FarmerSeedForm = memo(function FarmerSeedForm() {
  const [isSummarySheetOpen, setIsSummarySheetOpen] = useState(false);
  const {
    data: farmerLinks,
    isLoading: isLoadingFarmers,
    refetch: refetchFarmers,
  } = useGetAllFarmers();
  const { mutate: createFarmerSeedEntry, isPending } =
    useCreateFarmerSeedEntry();

  const farmerOptions: Option<string>[] = useMemo(() => {
    if (!farmerLinks) return [];
    return farmerLinks
      .filter((link) => link.isActive)
      .map((link) => ({
        value: link._id,
        label: `${link.farmerId.name} (Account #${link.accountNumber})`,
        searchableText: `${link.farmerId.name} ${link.accountNumber} ${link.farmerId.mobileNumber} ${link.farmerId.address}`,
      }));
  }, [farmerLinks]);

  const form = useForm({
    defaultValues: {
      farmerStorageLinkId: '',
      variety: '',
      bagSizes: defaultBagSizes,
    },
    validators: {
      onSubmit: formSchema,
    },
    onSubmit: async ({ value }) => {
      createFarmerSeedEntry(
        {
          farmerStorageLinkId: value.farmerStorageLinkId,
          variety: value.variety.trim(),
          bagSizes: value.bagSizes
            .filter((item) => (item.quantity ?? 0) > 0)
            .map((item) => ({
              name: item.name,
              quantity: Number(item.quantity ?? 0),
              rate: Number(item.rate ?? 0),
            })),
        },
        {
          onSuccess: (data) => {
            if (data.success) {
              form.reset();
            }
          },
        }
      );
    },
  });

  const selectedFarmer = useMemo(() => {
    if (!form.state.values.farmerStorageLinkId || !farmerLinks) return null;
    return (
      farmerLinks.find(
        (link) => link._id === form.state.values.farmerStorageLinkId
      ) ?? null
    );
  }, [form.state.values.farmerStorageLinkId, farmerLinks]);

  const handleNextClick = () => {
    requestAnimationFrame(() => {
      form.validateAllFields('submit');
      requestAnimationFrame(() => {
        if (form.state.isValid) setIsSummarySheetOpen(true);
      });
    });
  };

  return (
    <main className="font-custom mx-auto max-w-2xl px-4 py-6 sm:px-8 sm:py-12">
      <div className="mb-8 space-y-4">
        <h1 className="font-custom text-foreground text-3xl font-bold sm:text-4xl">
          Create Farmer Seed Entry
        </h1>
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          e.stopPropagation();
          form.handleSubmit();
        }}
        className="space-y-6"
      >
        <FieldGroup className="space-y-6">
          <form.Field
            name="farmerStorageLinkId"
            children={(field) => {
              const hasSubmitError = Boolean(
                field.state.meta.errorMap &&
                'onSubmit' in field.state.meta.errorMap &&
                field.state.meta.errorMap.onSubmit
              );
              const invalidFromValidation =
                hasSubmitError ||
                (field.state.meta.isTouched && !field.state.meta.isValid);
              const isInvalid = invalidFromValidation && !field.state.value;
              return (
                <Field data-invalid={isInvalid}>
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
                        onSelect={(value) => field.handleChange(value)}
                        value={field.state.value}
                        loading={isLoadingFarmers}
                        loadingMessage="Loading farmers..."
                        emptyMessage="No farmers found"
                        className="w-full"
                        buttonClassName="w-full justify-between"
                      />
                    </div>
                    <AddFarmerModal
                      links={farmerLinks ?? []}
                      onFarmerAdded={() => refetchFarmers()}
                    />
                  </div>
                  {isInvalid && (
                    <FieldError
                      errors={field.state.meta.errors as FieldErrors}
                    />
                  )}
                </Field>
              );
            }}
          />

          <form.Field
            name="variety"
            children={(field) => {
              const hasSubmitError = Boolean(
                field.state.meta.errorMap &&
                'onSubmit' in field.state.meta.errorMap &&
                field.state.meta.errorMap.onSubmit
              );
              const invalidFromValidation =
                hasSubmitError ||
                (field.state.meta.isTouched && !field.state.meta.isValid);
              const isInvalid = invalidFromValidation && !field.state.value;
              return (
                <Field data-invalid={isInvalid}>
                  <FieldLabel className="font-custom mb-2 block text-base font-semibold">
                    Select Variety
                  </FieldLabel>
                  <p className="font-custom text-muted-foreground mb-2 text-sm">
                    Choose the potato variety for this farmer seed entry
                  </p>
                  <SearchSelector
                    options={POTATO_VARIETIES}
                    placeholder="Select a variety"
                    searchPlaceholder="Search variety..."
                    onSelect={(value) => field.handleChange(value ?? '')}
                    value={field.state.value}
                    buttonClassName="w-full justify-between"
                  />
                  {isInvalid && (
                    <FieldError
                      errors={field.state.meta.errors as FieldErrors}
                    />
                  )}
                </Field>
              );
            }}
          />

          <form.Field
            name="bagSizes"
            children={(field) => {
              const bagSizes = field.state.value ?? defaultBagSizes;
              const totalQty = bagSizes.reduce(
                (sum, row) => sum + (row.quantity ?? 0),
                0
              );
              const hasQty = totalQty > 0;

              return (
                <Card className="overflow-hidden">
                  <CardHeader className="space-y-1.5 pb-4">
                    <CardTitle className="font-custom text-foreground text-xl font-semibold">
                      Enter Bag Sizes
                    </CardTitle>
                    <CardDescription className="font-custom text-muted-foreground text-sm">
                      Add quantity and rate for each size. At least one size
                      must have quantity greater than zero.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {bagSizes.map((row, index) => {
                      const qtyDisplay =
                        row.quantity === 0 ? '' : String(row.quantity);
                      const rateDisplay =
                        row.rate === 0 ? '' : String(row.rate);

                      return (
                        <div
                          key={`${row.name}-${index}`}
                          className="grid grid-cols-1 gap-2 sm:grid-cols-3 sm:items-center sm:gap-4"
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
                            value={qtyDisplay}
                            onChange={(e) => {
                              const raw = e.target.value;
                              const num =
                                raw === ''
                                  ? 0
                                  : Math.max(0, parseInt(raw, 10) || 0);
                              const next = [...bagSizes];
                              next[index] = { ...next[index], quantity: num };
                              field.handleChange(next);
                            }}
                            onWheel={(e) => e.currentTarget.blur()}
                            className="font-custom [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                          />
                          <Input
                            type="number"
                            min={0}
                            step="0.01"
                            placeholder="Rate"
                            value={rateDisplay}
                            onChange={(e) => {
                              const raw = e.target.value;
                              const num =
                                raw === ''
                                  ? 0
                                  : Math.max(0, parseFloat(raw) || 0);
                              const next = [...bagSizes];
                              next[index] = { ...next[index], rate: num };
                              field.handleChange(next);
                            }}
                            onWheel={(e) => e.currentTarget.blur()}
                            className="font-custom [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                          />
                        </div>
                      );
                    })}
                    <Separator className="my-4" />
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                      <span className="font-custom text-foreground text-base font-normal">
                        Total Quantity
                      </span>
                      <span className="font-custom text-foreground text-base font-medium sm:text-right">
                        {totalQty}
                      </span>
                    </div>
                    {!hasQty && (
                      <p className="font-custom text-destructive text-sm">
                        Please enter quantity for at least one bag size.
                      </p>
                    )}
                    {field.state.meta.isTouched &&
                      !field.state.meta.isValid && (
                        <FieldError
                          errors={field.state.meta.errors as FieldErrors}
                        />
                      )}
                  </CardContent>
                </Card>
              );
            }}
          />
        </FieldGroup>

        <div className="flex flex-wrap items-center justify-end gap-4 pt-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              form.reset();
              toast.info('Form reset');
            }}
            className="font-custom"
            disabled={isPending}
          >
            Reset
          </Button>
          <Button
            type="button"
            variant="default"
            size="lg"
            className="font-custom px-8 font-bold"
            disabled={isPending}
            onClick={handleNextClick}
          >
            Next
          </Button>
        </div>
      </form>

      <FarmerSeedSummarySheet
        open={isSummarySheetOpen}
        onOpenChange={setIsSummarySheetOpen}
        selectedFarmer={selectedFarmer}
        formValues={{
          variety: form.state.values.variety,
          bagSizes: form.state.values.bagSizes,
        }}
        isPending={isPending}
        onSubmit={() => form.handleSubmit()}
      />
    </main>
  );
});

export default FarmerSeedForm;
