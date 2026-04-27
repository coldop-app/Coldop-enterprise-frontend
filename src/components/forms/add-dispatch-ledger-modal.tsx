import { memo, useMemo, useState } from 'react';
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
  FieldError,
  FieldGroup,
  FieldLabel,
} from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { useCreateNikasiLedger } from '@/services/store-admin/nikasi-gate-pass/nikasi-ledger/useCreateNikasiLedger';

interface AddDispatchLedgerModalProps {
  onLedgerAdded?: (name: string) => void;
}

export const AddDispatchLedgerModal = memo(function AddDispatchLedgerModal({
  onLedgerAdded,
}: AddDispatchLedgerModalProps) {
  const { mutate: createNikasiLedger, isPending } = useCreateNikasiLedger();
  const [isOpen, setIsOpen] = useState(false);

  const formSchema = useMemo(
    () =>
      z.object({
        name: z
          .string()
          .trim()
          .min(1, 'Name is required')
          .max(120, 'Name must be 120 characters or less'),
        address: z
          .string()
          .trim()
          .min(1, 'Address is required')
          .max(300, 'Address must be 300 characters or less'),
        mobileNumber: z
          .string()
          .trim()
          .refine(
            (val) => val === '' || /^\d{10}$/.test(val),
            'Mobile number must be 10 digits'
          ),
      }),
    []
  );

  const form = useForm({
    defaultValues: {
      name: '',
      address: '',
      mobileNumber: '',
    },
    validators: {
      onChange: formSchema,
      onBlur: formSchema,
      onSubmit: formSchema,
    },
    onSubmit: async ({ value }) => {
      createNikasiLedger(
        {
          name: value.name.trim(),
          address: value.address.trim(),
          mobileNumber: value.mobileNumber.trim() || undefined,
        },
        {
          onSuccess: (response) => {
            if (!response.success) return;
            const createdName = response.data?.name ?? value.name.trim();
            onLedgerAdded?.(createdName);
            form.reset();
            setIsOpen(false);
          },
        }
      );
    },
  });

  const handleOpenChange = (open: boolean) => {
    setIsOpen(open);
    if (!open) form.reset();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button className="font-custom h-10 w-full sm:w-auto">
          <Plus className="h-4 w-4 shrink-0" />
          Add Dispatch Ledger
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
            <DialogTitle>Add Dispatch Ledger</DialogTitle>
            <DialogDescription>
              Create a dispatch ledger that you can select in this form.
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
                      placeholder="Enter ledger name"
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
                      placeholder="Enter 10-digit mobile number (optional)"
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
              {isPending ? 'Adding...' : 'Add Dispatch Ledger'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
});
