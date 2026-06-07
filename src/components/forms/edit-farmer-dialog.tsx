import { memo, useEffect, useMemo, useState } from 'react';
import { useForm } from '@tanstack/react-form';
import * as z from 'zod';
import { Building, MapPin, Save } from 'lucide-react';

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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import {
  blurTargetOnNumberWheel,
  businessNumberSpinnerClassName,
  preventArrowUpDownOnNumericInput,
} from '@/lib/business-number-input';
import { cn } from '@/lib/utils';
import { useEditFarmer } from '@/services/store-admin/people/useEditFarmer';
import { useGetLocalities } from '@/services/store-admin/locality/useGetLocalities';
import { useGetStations } from '@/services/store-admin/station/useGetStations';
import { useStore } from '@/stores/store';

const formSchema = z.object({
  name: z.string().trim().min(1, 'Name is required'),
  address: z.string().trim().min(1, 'Address is required'),
  mobileNumber: z.string().length(10, 'Mobile number must be 10 digits'),
  accountNumber: z
    .string()
    .transform((value) =>
      value === '' || Number.isNaN(Number(value)) ? '' : value
    )
    .pipe(
      z
        .string()
        .min(1, 'Please enter an account number')
        .refine((value) => {
          const num = Number(value);
          return !Number.isNaN(num) && num > 0;
        }, 'Please enter an account number')
    ),
  stationId: z.string().trim().min(1, 'Station is required'),
  localityId: z.string().trim().min(1, 'Locality is required'),
});

export interface EditFarmerDialogInitialValues {
  name: string;
  address: string;
  mobileNumber: string;
  accountNumber: number;
  stationId: string;
  localityId: string;
}

export interface EditFarmerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  farmerStorageLinkId: string;
  initialValues: EditFarmerDialogInitialValues;
}

function toFormDefaultValues(initialValues: EditFarmerDialogInitialValues) {
  return {
    name: initialValues.name,
    address: initialValues.address,
    mobileNumber: initialValues.mobileNumber,
    accountNumber:
      initialValues.accountNumber > 0
        ? String(initialValues.accountNumber)
        : '',
    stationId: initialValues.stationId,
    localityId: initialValues.localityId,
  };
}

export const EditFarmerDialog = memo(function EditFarmerDialog({
  open,
  onOpenChange,
  farmerStorageLinkId,
  initialValues,
}: EditFarmerDialogProps) {
  const coldStorageId = useStore(
    (state) => state.coldStorage?._id ?? state.admin?.coldStorageId ?? ''
  );
  const { mutate: editFarmer, isPending } = useEditFarmer();

  const form = useForm({
    defaultValues: toFormDefaultValues(initialValues),
    validators: {
      onBlur: formSchema,
      onSubmit: formSchema,
    },
    onSubmit: async ({ value }) => {
      editFarmer(
        {
          farmerStorageLinkId,
          name: value.name.trim(),
          address: value.address.trim(),
          mobileNumber: value.mobileNumber,
          accountNumber: Number(value.accountNumber),
          stationId: value.stationId,
          localityId: value.localityId,
        },
        {
          onSuccess: (data) => {
            if (data.success) {
              form.reset();
              setSelectedStationId(initialValues.stationId);
              onOpenChange(false);
            }
          },
        }
      );
    },
  });

  const [selectedStationId, setSelectedStationId] = useState(
    initialValues.stationId
  );

  useEffect(() => {
    if (!open) {
      return;
    }

    const defaults = toFormDefaultValues(initialValues);
    form.setFieldValue('name', defaults.name);
    form.setFieldValue('address', defaults.address);
    form.setFieldValue('mobileNumber', defaults.mobileNumber);
    form.setFieldValue('accountNumber', defaults.accountNumber);
    form.setFieldValue('stationId', defaults.stationId);
    form.setFieldValue('localityId', defaults.localityId);
    setSelectedStationId(defaults.stationId);
  }, [
    form,
    initialValues.accountNumber,
    initialValues.address,
    initialValues.localityId,
    initialValues.mobileNumber,
    initialValues.name,
    initialValues.stationId,
    open,
  ]);

  const handleOpenChange = (nextOpen: boolean) => {
    onOpenChange(nextOpen);
    if (!nextOpen) {
      form.reset();
      setSelectedStationId(initialValues.stationId);
    }
  };

  const { data: stationsResult, isLoading: isStationsLoading } = useGetStations(
    { coldStorageId },
    { enabled: open && Boolean(coldStorageId.trim()) }
  );

  const { data: localitiesResult, isLoading: isLocalitiesLoading } =
    useGetLocalities(
      { stationId: selectedStationId },
      { enabled: open && Boolean(selectedStationId.trim()) }
    );

  const stations = useMemo(
    () => stationsResult?.data ?? [],
    [stationsResult?.data]
  );

  const localities = useMemo(
    () => localitiesResult?.data ?? [],
    [localitiesResult?.data]
  );

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="font-custom max-h-[90vh] overflow-y-auto sm:max-w-[480px]">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            e.stopPropagation();
            form.handleSubmit();
          }}
        >
          <DialogHeader>
            <DialogTitle>Edit Farmer</DialogTitle>
            <DialogDescription>
              Update farmer details and link this farmer to a station and
              locality.
            </DialogDescription>
          </DialogHeader>

          <FieldGroup className="mt-6 grid gap-4">
            <form.Field
              name="accountNumber"
              children={(field) => {
                const isInvalid =
                  field.state.meta.isTouched && !field.state.meta.isValid;

                return (
                  <Field data-invalid={isInvalid}>
                    <FieldLabel htmlFor={field.name}>Account Number</FieldLabel>
                    <Input
                      id={field.name}
                      name={field.name}
                      type="number"
                      value={field.state.value}
                      onBlur={field.handleBlur}
                      onChange={(e) => field.handleChange(e.target.value)}
                      aria-invalid={isInvalid}
                      className={cn(businessNumberSpinnerClassName)}
                      min={1}
                      onWheel={blurTargetOnNumberWheel}
                      onKeyDown={preventArrowUpDownOnNumericInput}
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
              name="mobileNumber"
              children={(field) => {
                const isInvalid =
                  field.state.meta.isTouched && !field.state.meta.isValid;

                return (
                  <Field data-invalid={isInvalid}>
                    <FieldLabel htmlFor={field.name}>Mobile Number</FieldLabel>
                    <Input
                      id={field.name}
                      name={field.name}
                      type="tel"
                      inputMode="numeric"
                      maxLength={10}
                      value={field.state.value}
                      onBlur={field.handleBlur}
                      onChange={(e) =>
                        field.handleChange(
                          e.target.value.replace(/\D/g, '').slice(0, 10)
                        )
                      }
                      aria-invalid={isInvalid}
                      autoComplete="tel-national"
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
              name="name"
              children={(field) => {
                const isInvalid =
                  field.state.meta.isTouched && !field.state.meta.isValid;

                return (
                  <Field data-invalid={isInvalid}>
                    <FieldLabel htmlFor={field.name}>Name</FieldLabel>
                    <Input
                      id={field.name}
                      name={field.name}
                      value={field.state.value}
                      onBlur={field.handleBlur}
                      onChange={(e) => field.handleChange(e.target.value)}
                      aria-invalid={isInvalid}
                      autoComplete="name"
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
              name="address"
              children={(field) => {
                const isInvalid =
                  field.state.meta.isTouched && !field.state.meta.isValid;

                return (
                  <Field data-invalid={isInvalid}>
                    <FieldLabel htmlFor={field.name}>Address</FieldLabel>
                    <Input
                      id={field.name}
                      name={field.name}
                      value={field.state.value}
                      onBlur={field.handleBlur}
                      onChange={(e) => field.handleChange(e.target.value)}
                      aria-invalid={isInvalid}
                      autoComplete="street-address"
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

            <Separator />

            <section className="space-y-3 rounded-xl border p-4">
              <div className="flex items-center gap-2">
                <div className="bg-primary/10 flex h-8 w-8 items-center justify-center rounded-lg">
                  <Building className="text-primary h-4 w-4" />
                </div>
                <h3 className="font-custom text-sm font-semibold">Location</h3>
              </div>

              <form.Field
                name="stationId"
                children={(field) => {
                  const isInvalid =
                    field.state.meta.isTouched && !field.state.meta.isValid;

                  return (
                    <Field data-invalid={isInvalid}>
                      <FieldLabel htmlFor="edit-farmer-station">
                        Station
                      </FieldLabel>
                      <Select
                        value={field.state.value}
                        onValueChange={(value) => {
                          field.handleChange(value);
                          field.handleBlur();
                          setSelectedStationId(value);
                          form.setFieldValue('localityId', '');
                        }}
                        disabled={isStationsLoading || stations.length === 0}
                      >
                        <SelectTrigger
                          id="edit-farmer-station"
                          aria-invalid={isInvalid}
                          className="font-custom focus-visible:ring-primary w-full focus-visible:ring-2 focus-visible:ring-offset-2"
                        >
                          <SelectValue
                            placeholder={
                              isStationsLoading
                                ? 'Loading stations…'
                                : stations.length === 0
                                  ? 'No stations available'
                                  : 'Select a station'
                            }
                          />
                        </SelectTrigger>
                        <SelectContent>
                          {stations.map((station) => (
                            <SelectItem
                              key={station._id}
                              value={station._id}
                              className="font-custom"
                            >
                              {station.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
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
                name="localityId"
                children={(field) => {
                  const isInvalid =
                    field.state.meta.isTouched && !field.state.meta.isValid;
                  const localityDisabled =
                    !selectedStationId.trim() ||
                    isLocalitiesLoading ||
                    localities.length === 0;

                  return (
                    <Field data-invalid={isInvalid}>
                      <FieldLabel htmlFor="edit-farmer-locality">
                        Locality
                      </FieldLabel>
                      <Select
                        value={field.state.value}
                        onValueChange={(value) => {
                          field.handleChange(value);
                          field.handleBlur();
                        }}
                        disabled={localityDisabled}
                      >
                        <SelectTrigger
                          id="edit-farmer-locality"
                          aria-invalid={isInvalid}
                          className="font-custom focus-visible:ring-primary w-full focus-visible:ring-2 focus-visible:ring-offset-2"
                        >
                          <SelectValue
                            placeholder={
                              !selectedStationId.trim()
                                ? 'Select a station first'
                                : isLocalitiesLoading
                                  ? 'Loading localities…'
                                  : localities.length === 0
                                    ? 'No localities for this station'
                                    : 'Select a locality'
                            }
                          />
                        </SelectTrigger>
                        <SelectContent>
                          {localities.map((locality) => (
                            <SelectItem
                              key={locality._id}
                              value={locality._id}
                              className="font-custom"
                            >
                              <span className="flex items-center gap-2">
                                <MapPin className="text-muted-foreground h-3.5 w-3.5 shrink-0" />
                                {locality.name}
                              </span>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
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
          </FieldGroup>

          <DialogFooter className="mt-6 gap-2 sm:justify-end">
            <DialogClose asChild>
              <Button type="button" variant="outline" disabled={isPending}>
                Cancel
              </Button>
            </DialogClose>

            <Button type="submit" disabled={isPending} className="font-bold">
              <Save className="h-4 w-4 shrink-0" aria-hidden />
              {isPending ? 'Saving…' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
});
