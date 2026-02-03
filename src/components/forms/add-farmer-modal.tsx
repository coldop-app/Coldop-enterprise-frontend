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
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { useQuickAddFarmer } from '@/services/store-admin/functions/useQuickAddFarmer';
import { useStore } from '@/stores/store';
import type { FarmerStorageLink } from '@/types/farmer';

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
      .map((l) => l.accountNumber.toString())
      .filter((acc, i, s) => s.indexOf(acc) === i)
      .sort((a, b) => Number(a) - Number(b));
  }, [links]);

  const usedMobileNumbers = useMemo(() => {
    return links
      .map((l) => l.farmerId.mobileNumber)
      .filter((mob, i, s) => s.indexOf(mob) === i)
      .sort();
  }, [links]);

  const nextAccountNumber = useMemo(() => {
    if (usedAccountNumbers.length === 0) return 1;
    const latest = Number(usedAccountNumbers[usedAccountNumbers.length - 1]);
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
          .transform((val) => {
            const trimmed = val.trim();
            if (!trimmed) return trimmed;

            return (
              trimmed.charAt(0).toUpperCase() + trimmed.slice(1).toLowerCase()
            );
          })
          .refine((val) => val.length > 0, {
            message: 'Name is required',
          }),

        address: z.string().min(1, 'Address is required'),

        mobileNumber: z
          .string()
          .length(10, 'Mobile number must be 10 digits')
          .refine((val) => !usedMobileNumbers.includes(val), {
            message: 'Mobile number already in use',
          }),

        accountNumber: z
          .string()
          .transform((val) =>
            val === '' || Number.isNaN(Number(val)) ? '' : val
          )
          .pipe(
            z
              .string()
              .min(1, 'Please enter an account number')
              .refine((val) => {
                const num = Number(val);
                return !Number.isNaN(num) && num > 0;
              }, 'Please enter an account number')
              .refine((val) => !usedAccountNumbers.includes(val), {
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
      onChange: formSchema,
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
    if (!open) form.reset();
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
            {/* ---------------- ACCOUNT NUMBER ---------------- */}

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
                          className="flex-1"
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
          </FieldGroup>

          <DialogFooter className="mt-6">
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
