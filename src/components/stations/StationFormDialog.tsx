import { useEffect, useState } from 'react';
import { useForm } from '@tanstack/react-form';
import { Building, MapPin, Plus } from 'lucide-react';
import { toast } from 'sonner';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import {
  blurTargetOnNumberWheel,
  businessNumberSpinnerClassName,
  preventArrowUpDownOnNumericInput,
} from '@/lib/business-number-input';
import { cn } from '@/lib/utils';
import { useCreateLocality } from '@/services/store-admin/locality/useCreateLocality';
import { useDeleteLocality } from '@/services/store-admin/locality/useDeleteLocality';
import { useEditLocality } from '@/services/store-admin/locality/useEditLocality';
import { useCreateStation } from '@/services/store-admin/station/useCreateStation';
import { useEditStation } from '@/services/store-admin/station/useEditStation';
import type { StationWithLocalities } from '@/types/station';
import {
  handleCreateStationForm,
  handleEditStationForm,
} from './station-form-handlers';
import {
  defaultStationFormValues,
  stationFormSchema,
  type StationFormValues,
} from './station-form-utils';

interface StationFormDialogProps {
  mode: 'create' | 'edit';
  station?: StationWithLocalities | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  canSave: boolean;
  coldStorageId: string;
}

export function StationFormDialog({
  mode,
  station,
  open,
  onOpenChange,
  canSave,
  coldStorageId,
}: StationFormDialogProps) {
  const [removedLocalityIds, setRemovedLocalityIds] = useState<string[]>([]);
  const { mutateAsync: createStation, isPending: creatingStation } =
    useCreateStation();
  const { mutateAsync: editStation, isPending: editingStation } =
    useEditStation();
  const { mutateAsync: createLocality, isPending: creatingLocality } =
    useCreateLocality();
  const { mutateAsync: editLocality, isPending: editingLocality } =
    useEditLocality();
  const { mutateAsync: deleteLocality, isPending: deletingLocality } =
    useDeleteLocality();

  const isPending =
    creatingStation ||
    editingStation ||
    creatingLocality ||
    editingLocality ||
    deletingLocality;

  const form = useForm({
    defaultValues: defaultStationFormValues,
    validators: {
      onBlur: stationFormSchema,
      onSubmit: stationFormSchema,
    },
    onSubmit: async ({ value }) => {
      try {
        if (mode === 'create') {
          await handleCreateStationForm(
            value,
            coldStorageId,
            createStation,
            createLocality
          );
          toast.success('Station and localities created successfully');
        } else if (station) {
          await handleEditStationForm(
            station._id,
            value,
            removedLocalityIds,
            editStation,
            createLocality,
            editLocality,
            deleteLocality,
            coldStorageId
          );
          toast.success('Station updated successfully');
        }

        form.reset();
        setRemovedLocalityIds([]);
        onOpenChange(false);
      } catch (error) {
        toast.error(
          error instanceof Error ? error.message : 'Failed to save station'
        );
      }
    },
  });

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      form.reset(defaultStationFormValues);
    }
    setRemovedLocalityIds([]);
    onOpenChange(nextOpen);
  };

  useEffect(() => {
    if (!open || mode !== 'edit' || !station) return;

    form.reset({
      name: station.name,
      localities:
        station.localities.length > 0
          ? station.localities.map((locality) => ({
              _id: locality._id,
              name: locality.name,
              seedDispatchRatePerBag: String(locality.seedDispatchRatePerBag),
              seedBuyBackRatePerQuintal: String(
                locality.seedBuyBackRatePerQuintal
              ),
            }))
          : defaultStationFormValues.localities,
    });
  }, [open, mode, station, form]);

  const handleRemoveLocality = (
    index: number,
    localities: StationFormValues['localities']
  ) => {
    const row = localities[index];
    if (row?._id) {
      setRemovedLocalityIds((current) => [...current, row._id!]);
    }
  };

  if (!canSave) return null;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="font-custom max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            e.stopPropagation();
            form.handleSubmit();
          }}
        >
          <DialogHeader>
            <DialogTitle>
              {mode === 'create' ? 'Add Station & Localities' : 'Edit Station'}
            </DialogTitle>
            <DialogDescription>
              Set the station name, then add one or more localities with seed
              dispatch and buy-back rates.
            </DialogDescription>
          </DialogHeader>

          <FieldGroup className="mt-6 space-y-6">
            <section className="space-y-3 rounded-xl border p-4">
              <div className="flex items-center gap-2">
                <div className="bg-primary/10 flex h-8 w-8 items-center justify-center rounded-lg">
                  <Building className="text-primary h-4 w-4" />
                </div>
                <h3 className="font-custom text-sm font-semibold">Station</h3>
              </div>

              <form.Field
                name="name"
                children={(field) => {
                  const isInvalid =
                    field.state.meta.isTouched && !field.state.meta.isValid;

                  return (
                    <Field data-invalid={isInvalid}>
                      <FieldLabel htmlFor={`${mode}-station-name`}>
                        Station name
                      </FieldLabel>
                      <Input
                        id={`${mode}-station-name`}
                        name={field.name}
                        value={field.state.value}
                        onBlur={field.handleBlur}
                        onChange={(e) => field.handleChange(e.target.value)}
                        aria-invalid={isInvalid}
                        autoFocus
                        placeholder="e.g. North Block"
                        className="font-custom focus-visible:ring-primary focus-visible:ring-2 focus-visible:ring-offset-2"
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
            </section>

            <Separator />

            <section className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <div className="bg-primary/10 flex h-8 w-8 items-center justify-center rounded-lg">
                    <MapPin className="text-primary h-4 w-4" />
                  </div>
                  <h3 className="font-custom text-sm font-semibold">
                    Localities
                  </h3>
                  <form.Subscribe
                    selector={(state) => state.values.localities.length}
                    children={(count) => (
                      <Badge variant="secondary" className="font-custom">
                        {count}
                      </Badge>
                    )}
                  />
                </div>
              </div>

              <form.Field
                name="localities"
                mode="array"
                children={(field) => (
                  <div className="space-y-3">
                    {field.state.value.map((_, index) => (
                      <div
                        key={index}
                        className="bg-muted/20 grid gap-3 rounded-xl border p-4"
                      >
                        <div className="grid gap-3 md:grid-cols-3">
                          <form.Field name={`localities[${index}].name`}>
                            {(localityNameField) => {
                              const isInvalid =
                                localityNameField.state.meta.isTouched &&
                                !localityNameField.state.meta.isValid;

                              return (
                                <Field data-invalid={isInvalid}>
                                  <FieldLabel
                                    htmlFor={`${mode}-locality-name-${index}`}
                                  >
                                    Locality name
                                  </FieldLabel>
                                  <Input
                                    id={`${mode}-locality-name-${index}`}
                                    name={localityNameField.name}
                                    value={localityNameField.state.value}
                                    onBlur={localityNameField.handleBlur}
                                    onChange={(e) =>
                                      localityNameField.handleChange(
                                        e.target.value
                                      )
                                    }
                                    aria-invalid={isInvalid}
                                    placeholder="e.g. Village A"
                                    className="font-custom focus-visible:ring-primary focus-visible:ring-2 focus-visible:ring-offset-2"
                                  />
                                  {isInvalid && (
                                    <FieldError
                                      errors={
                                        localityNameField.state.meta
                                          .errors as Array<
                                          { message?: string } | undefined
                                        >
                                      }
                                    />
                                  )}
                                </Field>
                              );
                            }}
                          </form.Field>

                          <form.Field
                            name={`localities[${index}].seedDispatchRatePerBag`}
                          >
                            {(dispatchField) => {
                              const isInvalid =
                                dispatchField.state.meta.isTouched &&
                                !dispatchField.state.meta.isValid;

                              return (
                                <Field data-invalid={isInvalid}>
                                  <FieldLabel
                                    htmlFor={`${mode}-dispatch-rate-${index}`}
                                  >
                                    Dispatch / bag
                                  </FieldLabel>
                                  <Input
                                    id={`${mode}-dispatch-rate-${index}`}
                                    name={dispatchField.name}
                                    type="number"
                                    min={0}
                                    step="any"
                                    value={dispatchField.state.value}
                                    onBlur={dispatchField.handleBlur}
                                    onChange={(e) =>
                                      dispatchField.handleChange(e.target.value)
                                    }
                                    aria-invalid={isInvalid}
                                    className={cn(
                                      'font-custom focus-visible:ring-primary focus-visible:ring-2 focus-visible:ring-offset-2',
                                      businessNumberSpinnerClassName
                                    )}
                                    onWheel={blurTargetOnNumberWheel}
                                    onKeyDown={preventArrowUpDownOnNumericInput}
                                  />
                                  {isInvalid && (
                                    <FieldError
                                      errors={
                                        dispatchField.state.meta
                                          .errors as Array<
                                          { message?: string } | undefined
                                        >
                                      }
                                    />
                                  )}
                                </Field>
                              );
                            }}
                          </form.Field>

                          <form.Field
                            name={`localities[${index}].seedBuyBackRatePerQuintal`}
                          >
                            {(buyBackField) => {
                              const isInvalid =
                                buyBackField.state.meta.isTouched &&
                                !buyBackField.state.meta.isValid;

                              return (
                                <Field data-invalid={isInvalid}>
                                  <FieldLabel
                                    htmlFor={`${mode}-buyback-rate-${index}`}
                                  >
                                    Buy-back / quintal
                                  </FieldLabel>
                                  <Input
                                    id={`${mode}-buyback-rate-${index}`}
                                    name={buyBackField.name}
                                    type="number"
                                    min={0}
                                    step="any"
                                    value={buyBackField.state.value}
                                    onBlur={buyBackField.handleBlur}
                                    onChange={(e) =>
                                      buyBackField.handleChange(e.target.value)
                                    }
                                    aria-invalid={isInvalid}
                                    className={cn(
                                      'font-custom focus-visible:ring-primary focus-visible:ring-2 focus-visible:ring-offset-2',
                                      businessNumberSpinnerClassName
                                    )}
                                    onWheel={blurTargetOnNumberWheel}
                                    onKeyDown={preventArrowUpDownOnNumericInput}
                                  />
                                  {isInvalid && (
                                    <FieldError
                                      errors={
                                        buyBackField.state.meta.errors as Array<
                                          { message?: string } | undefined
                                        >
                                      }
                                    />
                                  )}
                                </Field>
                              );
                            }}
                          </form.Field>
                        </div>

                        {field.state.value.length > 1 && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="font-custom text-muted-foreground hover:text-destructive w-fit transition-colors duration-200"
                            onClick={() => {
                              handleRemoveLocality(
                                index,
                                field.state
                                  .value as StationFormValues['localities']
                              );
                              field.removeValue(index);
                            }}
                          >
                            Remove locality
                          </Button>
                        )}
                      </div>
                    ))}

                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="font-custom transition-colors duration-200"
                      onClick={() =>
                        field.pushValue({
                          name: '',
                          seedDispatchRatePerBag: '',
                          seedBuyBackRatePerQuintal: '',
                        })
                      }
                    >
                      <Plus className="mr-2 h-4 w-4" />
                      Add locality
                    </Button>

                    {field.state.meta.isTouched &&
                      !field.state.meta.isValid && (
                        <FieldError
                          errors={
                            field.state.meta.errors as Array<
                              { message?: string } | undefined
                            >
                          }
                        />
                      )}
                  </div>
                )}
              />
            </section>
          </FieldGroup>

          <DialogFooter className="mt-6 gap-2 sm:justify-end">
            <DialogClose asChild>
              <Button type="button" variant="outline" disabled={isPending}>
                Cancel
              </Button>
            </DialogClose>
            <Button type="submit" disabled={isPending} className="font-bold">
              {isPending
                ? 'Saving…'
                : mode === 'create'
                  ? 'Create'
                  : 'Save Changes'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
