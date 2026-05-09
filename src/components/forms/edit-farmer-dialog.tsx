import { memo, useEffect, useMemo } from 'react';
import { useForm } from '@tanstack/react-form';
import * as z from 'zod';
import { Save } from 'lucide-react';

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
  blurTargetOnNumberWheel,
  businessNumberSpinnerClassName,
  preventArrowUpDownOnNumericInput,
} from '@/lib/business-number-input';
import { cn } from '@/lib/utils';
import { useEditFarmer } from '@/services/store-admin/people/useEditFarmer';

export interface EditFarmerDialogInitialValues {
  name: string;
  address: string;
  mobileNumber: string;
  accountNumber: number;
}

export interface EditFarmerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  farmerStorageLinkId: string;
  initialValues: EditFarmerDialogInitialValues;
}

export const EditFarmerDialog = memo(function EditFarmerDialog({
  open,
  onOpenChange,
  farmerStorageLinkId,
  initialValues,
}: EditFarmerDialogProps) {
  const { mutate: editFarmer, isPending } = useEditFarmer();

  const formSchema = useMemo(
    () =>
      z.object({
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
      }),
    []
  );

  const form = useForm({
    defaultValues: {
      name: '',
      address: '',
      mobileNumber: '',
      accountNumber: '',
    },
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
        },
        {
          onSuccess: (data) => {
            if (data.success) {
              onOpenChange(false);
            }
          },
        }
      );
    },
  });

  useEffect(() => {
    if (!open) return;
    form.reset({
      name: initialValues.name,
      address: initialValues.address,
      mobileNumber: initialValues.mobileNumber,
      accountNumber:
        initialValues.accountNumber > 0
          ? String(initialValues.accountNumber)
          : '',
    });
  }, [open, initialValues, form]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="font-custom sm:max-w-[425px]">
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
              Update farmer details for this farmer-storage link.
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
