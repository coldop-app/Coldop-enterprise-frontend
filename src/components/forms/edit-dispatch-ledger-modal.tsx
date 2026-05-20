import { memo, useEffect, useMemo } from 'react';
import { useForm } from '@tanstack/react-form';
import * as z from 'zod';
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
import { useEditDispatchLedger } from '@/services/store-admin/dispatch-ledger/useEditDispatchLedger';
import { useGetDispatchLedgers } from '@/services/store-admin/dispatch-ledger/useGetDispatchLedgers';

interface EditDispatchLedgerModalProps {
  dispatchLedgerId: string;
  initialValues: {
    name: string;
    address: string;
    mobileNumber?: string;
  };
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onDispatchLedgerEdited?: () => void;
}

export const EditDispatchLedgerModal = memo(function EditDispatchLedgerModal({
  dispatchLedgerId,
  initialValues,
  isOpen,
  onOpenChange,
  onDispatchLedgerEdited,
}: EditDispatchLedgerModalProps) {
  const { mutate: editDispatchLedger, isPending } = useEditDispatchLedger();
  const { data: dispatchLedgersResponse } = useGetDispatchLedgers();
  const dispatchLedgers = dispatchLedgersResponse?.data ?? [];

  const usedMobileNumbers = useMemo(() => {
    return dispatchLedgers
      .filter((dispatchLedger) => dispatchLedger._id !== dispatchLedgerId)
      .map((dispatchLedger) => dispatchLedger.mobileNumber)
      .filter((mobile, index, source) => source.indexOf(mobile) === index)
      .sort();
  }, [dispatchLedgerId, dispatchLedgers]);

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
          .refine((value) => value.length > 0, {
            message: 'Name is required',
          }),
        address: z.string().trim().min(1, 'Address is required'),
        mobileNumber: z
          .string()
          .refine((value) => value.length === 0 || value.length === 10, {
            message: 'Mobile number must be 10 digits',
          })
          .refine(
            (value) => value.length === 0 || !usedMobileNumbers.includes(value),
            {
              message: 'Mobile number already in use',
            }
          ),
      }),
    [usedMobileNumbers]
  );

  const form = useForm({
    defaultValues: {
      name: initialValues.name,
      address: initialValues.address,
      mobileNumber: initialValues.mobileNumber ?? '',
    },
    validators: {
      onBlur: formSchema,
      onSubmit: formSchema,
    },
    onSubmit: async ({ value }) => {
      editDispatchLedger(
        {
          id: dispatchLedgerId,
          name: value.name,
          address: value.address,
          mobileNumber: value.mobileNumber || undefined,
        },
        {
          onSuccess: (response) => {
            if (!response.success) return;
            onOpenChange(false);
            onDispatchLedgerEdited?.();
          },
        }
      );
    },
  });

  useEffect(() => {
    if (isOpen) {
      form.setFieldValue('name', initialValues.name);
      form.setFieldValue('address', initialValues.address);
      form.setFieldValue('mobileNumber', initialValues.mobileNumber ?? '');
    }
  }, [
    form,
    initialValues.address,
    initialValues.mobileNumber,
    initialValues.name,
    isOpen,
  ]);

  const handleOpenChange = (open: boolean) => {
    onOpenChange(open);
    if (!open) {
      form.reset();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="font-custom sm:max-w-[425px]">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            e.stopPropagation();
            form.handleSubmit();
          }}
        >
          <DialogHeader>
            <DialogTitle>Edit Dispatch Ledger</DialogTitle>
            <DialogDescription>
              Update dispatch ledger details
            </DialogDescription>
          </DialogHeader>

          <FieldGroup className="mt-6 grid gap-4">
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
                      placeholder="Enter dispatch ledger name"
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
          </FieldGroup>

          <DialogFooter className="mt-6 gap-2">
            <DialogClose asChild>
              <Button type="button" variant="outline">
                Cancel
              </Button>
            </DialogClose>
            <Button type="submit" disabled={isPending}>
              {isPending ? 'Updating...' : 'Update Dispatch Ledger'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
});
