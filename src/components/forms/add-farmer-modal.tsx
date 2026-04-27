import { memo, useState, useMemo, useEffect } from 'react';
import { useForm } from '@tanstack/react-form';
import * as z from 'zod';
import { Plus } from 'lucide-react';

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
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { useQuickAddFarmer } from '@/services/store-admin/people/useQuickAddFarmer';
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
  const [isOpen, setIsOpen] = useState(false);

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

      <DialogContent className="font-custom sm:max-w-[480px]">
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
              Create a farmer profile and link it to your storage account.
            </DialogDescription>
          </DialogHeader>

          <FieldGroup className="mt-6 gap-5">
            <div className="bg-muted/40 rounded-lg border p-3">
              <p className="text-foreground text-sm font-medium">
                Suggested account number: {nextAccountNumber}
              </p>
              <p className="text-muted-foreground mt-1 text-xs">
                This is auto-calculated from existing farmer accounts.
              </p>
            </div>

            <form.Field
              name="accountNumber"
              children={(field) => {
                const isInvalid =
                  field.state.meta.isTouched && !field.state.meta.isValid;

                return (
                  <Field data-invalid={isInvalid}>
                    <FieldLabel htmlFor={field.name}>Account Number</FieldLabel>

                    <div className="flex flex-col gap-2">
                      <div className="flex flex-col gap-2 sm:flex-row">
                        <Input
                          id={field.name}
                          name={field.name}
                          type="number"
                          value={field.state.value}
                          onBlur={field.handleBlur}
                          onChange={(e) => field.handleChange(e.target.value)}
                          placeholder={`Suggested: ${nextAccountNumber}`}
                          aria-invalid={isInvalid}
                          className="flex-1"
                          min={1}
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
                          className="sm:w-auto"
                        >
                          Use suggested
                        </Button>
                      </div>

                      <FieldDescription>
                        Enter a positive number that is not already assigned.
                      </FieldDescription>
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
                    <FieldDescription>
                      Must be a unique 10-digit phone number.
                    </FieldDescription>

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
                    <FieldDescription>
                      Use the farmer&apos;s full name.
                    </FieldDescription>

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
                    <FieldDescription>
                      Village, town, or full postal address.
                    </FieldDescription>

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
