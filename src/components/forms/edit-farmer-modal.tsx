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
import { useUpdateFarmer } from '@/services/store-admin/farmer-storage-link/useUpdateFarmer';
import type { FarmerStorageLink } from '@/types/farmer';

export interface EditFarmerModalUpdated {
  id: string;
  name: string;
  address: string;
  mobileNumber: string;
  accountNumber: number;
}

export interface EditFarmerModalProps {
  link: FarmerStorageLink;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdated?: (updated: EditFarmerModalUpdated) => void;
}

export const EditFarmerModal = memo(function EditFarmerModal({
  link,
  open,
  onOpenChange,
  onUpdated,
}: EditFarmerModalProps) {
  const { mutate: updateFarmer, isPending } = useUpdateFarmer();

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
        mobileNumber: z.string().length(10, 'Mobile number must be 10 digits'),
        accountNumber: z
          .string()
          .min(1, 'Please enter an account number')
          .refine((val) => {
            const num = Number(val);
            return !Number.isNaN(num) && num > 0;
          }, 'Please enter a valid positive account number'),
      }),
    []
  );

  const form = useForm({
    defaultValues: {
      name: link.farmerId?.name ?? '',
      address: link.farmerId?.address ?? '',
      mobileNumber: link.farmerId?.mobileNumber ?? '',
      accountNumber: link.accountNumber.toString(),
    },
    validators: {
      onChange: formSchema,
      onBlur: formSchema,
      onSubmit: formSchema,
    },
    onSubmit: async ({ value }) => {
      updateFarmer(
        {
          id: link._id,
          name: value.name,
          address: value.address,
          mobileNumber: value.mobileNumber,
          accountNumber: Number(value.accountNumber),
        },
        {
          onSuccess: () => {
            onUpdated?.({
              id: link._id,
              name: value.name,
              address: value.address,
              mobileNumber: value.mobileNumber,
              accountNumber: Number(value.accountNumber),
            });
            form.reset();
            onOpenChange(false);
          },
        }
      );
    },
  });

  useEffect(() => {
    if (!open) return;
    form.setFieldValue('name', link.farmerId?.name ?? '');
    form.setFieldValue('address', link.farmerId?.address ?? '');
    form.setFieldValue('mobileNumber', link.farmerId?.mobileNumber ?? '');
    form.setFieldValue('accountNumber', link.accountNumber.toString());
  }, [open, link, form]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="font-custom sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Edit Farmer</DialogTitle>
          <DialogDescription>
            Update farmer details for this farmer-storage link.
          </DialogDescription>
        </DialogHeader>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            e.stopPropagation();
            form.handleSubmit();
          }}
        >
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
              {isPending ? 'Saving...' : <Save className="mr-2 h-4 w-4" />}
              Save Changes
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
});
