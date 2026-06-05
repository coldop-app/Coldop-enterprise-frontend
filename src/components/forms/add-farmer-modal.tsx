import { memo, useState, useMemo, useEffect } from 'react';
import { useForm } from '@tanstack/react-form';
import * as z from 'zod';
import { Info, Plus } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  blurTargetOnNumberWheel,
  businessNumberSpinnerClassName,
  preventArrowUpDownOnNumericInput,
} from '@/lib/business-number-input';
import { cn } from '@/lib/utils';
import { useQuickAddFarmer } from '@/services/store-admin/people/useQuickAddFarmer';
import { useGetStations } from '@/services/store-admin/station/useGetStations';
import { useStore } from '@/stores/store';
import type { FarmerStorageLink } from '@/types/incoming-gate-pass';

interface AddFarmerModalProps {
  links?: FarmerStorageLink[];
  onFarmerAdded?: () => void;
}

export const AddFarmerModal = memo(function AddFarmerModal({
  links = [],
  onFarmerAdded,
}: AddFarmerModalProps) {
  const { mutate: quickAddFarmer, isPending } = useQuickAddFarmer();
  const { coldStorage, admin } = useStore();
  const coldStorageId = coldStorage?._id ?? '';
  const [isOpen, setIsOpen] = useState(false);

  const { data: stationsResult, isLoading: isStationsLoading } = useGetStations(
    { coldStorageId },
    { enabled: isOpen && Boolean(coldStorageId.trim()) }
  );

  const stations = useMemo(
    () => stationsResult?.data ?? [],
    [stationsResult?.data]
  );

  /* ---------------------------------- */
  /* Used numbers */
  /* ---------------------------------- */

  const usedAccountNumbers = useMemo(() => {
    return links
      .map((link) => link.accountNumber)
      .filter((accountNo, index, source) => source.indexOf(accountNo) === index)
      .sort((a, b) => a - b);
  }, [links]);

  const usedMobileNumbers = useMemo(() => {
    return links
      .map((link) => link.farmerId.mobileNumber)
      .filter((mobile, index, source) => source.indexOf(mobile) === index)
      .sort();
  }, [links]);

  const nextAccountNumber = useMemo(() => {
    if (usedAccountNumbers.length === 0) return 1;
    const latest = usedAccountNumbers[usedAccountNumbers.length - 1];
    return latest + 1;
  }, [usedAccountNumbers]);

  /* ---------------------------------- */
  /* Schema */
  /* ---------------------------------- */

  const formSchema = useMemo(
    () =>
      z.object({
        name: z
          .string()
          .transform((value) => {
            const trimmed = value.trim();
            if (!trimmed) return trimmed;

            return (
              trimmed.charAt(0).toUpperCase() + trimmed.slice(1).toLowerCase()
            );
          })
          .refine((val) => val.length > 0, {
            message: 'Name is required',
          }),

        address: z.string().trim().min(1, 'Address is required'),

        mobileNumber: z
          .string()
          .length(10, 'Mobile number must be 10 digits')
          .refine((value) => !usedMobileNumbers.includes(value), {
            message: 'Mobile number already in use',
          }),

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
              .refine((value) => !usedAccountNumbers.includes(Number(value)), {
                message: 'This account number is already taken',
              })
          ),

        station: z.string().trim().min(1, 'Station is required'),
      }),
    [usedAccountNumbers, usedMobileNumbers]
  );

  /* ---------------------------------- */
  /* Form */
  /* ---------------------------------- */

  const form = useForm({
    defaultValues: {
      name: '',
      address: '',
      mobileNumber: '',
      accountNumber: nextAccountNumber.toString(),
      station: '',
    },

    validators: {
      onBlur: formSchema,
      onSubmit: formSchema,
    },

    onSubmit: async ({ value }) => {
      if (!coldStorage?._id || !admin?._id) return;

      quickAddFarmer(
        {
          name: value.name,
          address: value.address,
          mobileNumber: value.mobileNumber,
          coldStorageId: coldStorage._id,
          linkedById: admin._id,
          accountNumber: Number(value.accountNumber),
          station: value.station,
        },
        {
          onSuccess: () => {
            form.reset();
            setIsOpen(false);
            onFarmerAdded?.();
          },
        }
      );
    },
  });

  /* ---------------------------------- */
  /* When modal opens */
  /* ---------------------------------- */

  useEffect(() => {
    if (isOpen) {
      form.setFieldValue('accountNumber', nextAccountNumber.toString());
    }
  }, [isOpen, nextAccountNumber, form]);

  const handleOpenChange = (open: boolean) => {
    setIsOpen(open);
    if (!open) {
      form.reset();
    }
  };

  /* ---------------------------------- */
  /* Render */
  /* ---------------------------------- */

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button className="font-custom h-10 w-full sm:w-auto">
          <Plus className="h-4 w-4 shrink-0" />
          New Farmer
        </Button>
      </DialogTrigger>

      <DialogContent className="font-custom sm:max-w-[425px]">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            e.stopPropagation();
            form.handleSubmit();
          }}
        >
          <DialogHeader>
            <DialogTitle>Add New Farmer</DialogTitle>
            <DialogDescription>
              Enter the farmer details to register them quickly
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
                    <div className="flex items-center justify-between">
                      <FieldLabel htmlFor={field.name}>
                        Account Number
                      </FieldLabel>

                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 p-0"
                          >
                            <Info className="text-muted-foreground h-4 w-4" />
                          </Button>
                        </TooltipTrigger>

                        <TooltipContent className="max-w-xs">
                          {usedAccountNumbers.length > 0 ? (
                            <span>
                              Used account numbers:{' '}
                              {usedAccountNumbers.join(', ')}
                            </span>
                          ) : (
                            'No account numbers in use'
                          )}
                        </TooltipContent>
                      </Tooltip>
                    </div>

                    <div className="flex flex-col gap-2">
                      <div className="flex gap-2">
                        <Input
                          id={field.name}
                          name={field.name}
                          type="number"
                          value={field.state.value}
                          onBlur={field.handleBlur}
                          onChange={(e) => field.handleChange(e.target.value)}
                          placeholder={`Suggested: ${nextAccountNumber}`}
                          aria-invalid={isInvalid}
                          className={cn(
                            'flex-1',
                            businessNumberSpinnerClassName
                          )}
                          min={1}
                          onWheel={blurTargetOnNumberWheel}
                          onKeyDown={preventArrowUpDownOnNumericInput}
                        />

                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() =>
                            form.setFieldValue(
                              'accountNumber',
                              nextAccountNumber.toString()
                            )
                          }
                        >
                          Use suggested ({nextAccountNumber})
                        </Button>
                      </div>

                      <p className="text-muted-foreground text-xs">
                        Enter any positive number. Duplicate values are not
                        allowed.
                      </p>
                    </div>

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

            {/* ---------------- MOBILE NUMBER ---------------- */}

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
                      value={field.state.value}
                      onBlur={field.handleBlur}
                      onChange={(e) =>
                        field.handleChange(
                          e.target.value.replace(/\D/g, '').slice(0, 10)
                        )
                      }
                      placeholder="Enter 10-digit mobile number"
                      maxLength={10}
                      aria-invalid={isInvalid}
                      autoComplete="tel"
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

            {/* ---------------- NAME ---------------- */}

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
                      placeholder="Enter farmer name"
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

            {/* ---------------- ADDRESS ---------------- */}

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
                      placeholder="Enter address"
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

            <form.Field
              name="station"
              children={(field) => {
                const isInvalid =
                  field.state.meta.isTouched && !field.state.meta.isValid;

                return (
                  <Field data-invalid={isInvalid}>
                    <FieldLabel htmlFor={field.name}>Station</FieldLabel>
                    <Select
                      value={field.state.value}
                      onValueChange={(value) => {
                        field.handleChange(value);
                        field.handleBlur();
                      }}
                      disabled={isStationsLoading || stations.length === 0}
                    >
                      <SelectTrigger
                        id={field.name}
                        aria-invalid={isInvalid}
                        className="font-custom w-full"
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
          </FieldGroup>

          <DialogFooter className="mt-6 gap-2">
            <DialogClose asChild>
              <Button type="button" variant="outline">
                Cancel
              </Button>
            </DialogClose>

            <Button type="submit" disabled={isPending}>
              {isPending ? 'Adding...' : 'Add Farmer'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
});
