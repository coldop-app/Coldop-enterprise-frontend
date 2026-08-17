import { useForm } from '@tanstack/react-form';
import { Pencil } from 'lucide-react';
import { useMemo } from 'react';

import { DatePicker } from '@/components/date-picker';
import { Button } from '@/components/ui/button';
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSet,
} from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Textarea } from '@/components/ui/textarea';
import {
  blurTargetOnNumberWheel,
  businessNumberSpinnerClassName,
  preventArrowUpDownOnNumericInput,
} from '@/lib/business-number-input';
import { cn } from '@/lib/utils';
import { formatDateToISO } from '@/lib/helpers';
import {
  isEditDispatchPostStorageSuccess,
  useEditDispatchPostStorage,
} from '@/services/store-admin/dispatch-post-storage/useEditDispatchPostStorage';
import {
  editDispatchPostStorageFormSchema,
  getEditDispatchPostStorageDefaults,
  isFieldInvalid,
  parseOptionalPositiveNumber,
  type FieldErrors,
  type MockDispatchPostStorageGatePass,
} from './-form-schema';

type EditDispatchPostStorageFormFieldsProps = {
  gatePass: MockDispatchPostStorageGatePass;
  onClose: () => void;
};

function EditDispatchPostStorageFormFields({
  gatePass,
  onClose,
}: EditDispatchPostStorageFormFieldsProps) {
  const defaultValues = useMemo(
    () => getEditDispatchPostStorageDefaults(gatePass.values),
    [gatePass.values]
  );
  const { mutateAsync: editDispatchPostStorage, isPending } =
    useEditDispatchPostStorage();

  const form = useForm({
    defaultValues,
    validators: {
      onSubmit: editDispatchPostStorageFormSchema as never,
    },
    onSubmit: async ({ value }) => {
      try {
        const data = await editDispatchPostStorage({
          id: gatePass._id,
          date: formatDateToISO(value.date),
          from: value.from,
          to: value.to,
          truckNumber: value.truckNumber.trim() || undefined,
          remarks: value.remarks.trim() || undefined,
          manualGatePassNumber: value.manualGatePassNumber,
        });
        if (!isEditDispatchPostStorageSuccess(data)) return;
        onClose();
      } catch {
        return;
      }
    },
  });

  const handleReset = () => {
    form.reset(defaultValues);
  };

  return (
    <form
      id={`edit-dispatch-post-storage-form-${gatePass._id}`}
      noValidate
      className="flex flex-1 flex-col overflow-hidden"
      onSubmit={(event) => {
        event.preventDefault();
        void form.handleSubmit();
      }}
    >
      <div className="flex-1 overflow-y-auto px-5 py-5">
        <FieldGroup className="gap-8">
          <FieldSet>
            <FieldLegend className="font-custom text-base font-semibold">
              General details
            </FieldLegend>
            <FieldDescription className="font-custom">
              Update the outgoing date and optional manual pass number.
            </FieldDescription>
            <FieldGroup className="mt-5 grid grid-cols-1 gap-6">
              <form.Field name="date">
                {(field) => {
                  const isInvalid = isFieldInvalid(field.state.meta);
                  return (
                    <Field data-invalid={isInvalid}>
                      <DatePicker
                        id={field.name}
                        label="Date"
                        value={field.state.value}
                        onChange={(value) => field.handleChange(value)}
                      />
                      {isInvalid ? (
                        <FieldError
                          errors={field.state.meta.errors as FieldErrors}
                        />
                      ) : null}
                    </Field>
                  );
                }}
              </form.Field>

              <form.Field name="manualGatePassNumber">
                {(field) => {
                  const isInvalid = isFieldInvalid(field.state.meta);
                  return (
                    <Field data-invalid={isInvalid}>
                      <FieldLabel htmlFor={field.name} className="font-custom">
                        Manual gate pass no.
                      </FieldLabel>
                      <Input
                        type="number"
                        min={0}
                        id={field.name}
                        name={field.name}
                        value={
                          field.state.value != null
                            ? String(field.state.value)
                            : ''
                        }
                        onBlur={field.handleBlur}
                        onChange={(event) =>
                          field.handleChange(
                            parseOptionalPositiveNumber(event.target.value)
                          )
                        }
                        onWheel={blurTargetOnNumberWheel}
                        onKeyDown={preventArrowUpDownOnNumericInput}
                        inputMode="numeric"
                        placeholder="Optional"
                        aria-invalid={isInvalid}
                        className={cn(
                          'font-custom h-11 text-base tabular-nums',
                          businessNumberSpinnerClassName
                        )}
                      />
                      <FieldDescription className="font-custom">
                        Leave blank if no manual slip number was issued.
                      </FieldDescription>
                      {isInvalid ? (
                        <FieldError
                          errors={field.state.meta.errors as FieldErrors}
                        />
                      ) : null}
                    </Field>
                  );
                }}
              </form.Field>
            </FieldGroup>
          </FieldSet>

          <FieldSet>
            <FieldLegend className="font-custom text-base font-semibold">
              Route & vehicle
            </FieldLegend>
            <FieldDescription className="font-custom">
              Source, destination, and truck for this outgoing dispatch.
            </FieldDescription>
            <FieldGroup className="mt-5 grid grid-cols-1 gap-6">
              <form.Field name="from">
                {(field) => {
                  const isInvalid = isFieldInvalid(field.state.meta);
                  return (
                    <Field data-invalid={isInvalid}>
                      <FieldLabel htmlFor={field.name} className="font-custom">
                        From
                      </FieldLabel>
                      <Input
                        id={field.name}
                        name={field.name}
                        value={field.state.value}
                        onBlur={field.handleBlur}
                        onChange={(event) =>
                          field.handleChange(event.target.value)
                        }
                        placeholder="e.g. Chamber A"
                        autoComplete="off"
                        aria-invalid={isInvalid}
                        className="font-custom h-11 text-base"
                      />
                      {isInvalid ? (
                        <FieldError
                          errors={field.state.meta.errors as FieldErrors}
                        />
                      ) : null}
                    </Field>
                  );
                }}
              </form.Field>

              <form.Field name="to">
                {(field) => {
                  const isInvalid = isFieldInvalid(field.state.meta);
                  return (
                    <Field data-invalid={isInvalid}>
                      <FieldLabel htmlFor={field.name} className="font-custom">
                        To
                      </FieldLabel>
                      <Input
                        id={field.name}
                        name={field.name}
                        value={field.state.value}
                        onBlur={field.handleBlur}
                        onChange={(event) =>
                          field.handleChange(event.target.value)
                        }
                        placeholder="e.g. Market Yard"
                        autoComplete="off"
                        aria-invalid={isInvalid}
                        className="font-custom h-11 text-base"
                      />
                      {isInvalid ? (
                        <FieldError
                          errors={field.state.meta.errors as FieldErrors}
                        />
                      ) : null}
                    </Field>
                  );
                }}
              </form.Field>

              <form.Field name="truckNumber">
                {(field) => {
                  const isInvalid = isFieldInvalid(field.state.meta);
                  return (
                    <Field data-invalid={isInvalid}>
                      <FieldLabel htmlFor={field.name} className="font-custom">
                        Truck number
                      </FieldLabel>
                      <Input
                        id={field.name}
                        name={field.name}
                        value={field.state.value}
                        onBlur={field.handleBlur}
                        onChange={(event) =>
                          field.handleChange(event.target.value.toUpperCase())
                        }
                        placeholder="e.g. HR-12-3456"
                        autoComplete="off"
                        aria-invalid={isInvalid}
                        className="font-custom h-11 text-base uppercase"
                      />
                      {isInvalid ? (
                        <FieldError
                          errors={field.state.meta.errors as FieldErrors}
                        />
                      ) : null}
                    </Field>
                  );
                }}
              </form.Field>
            </FieldGroup>
          </FieldSet>

          <FieldSet>
            <FieldLegend className="font-custom text-base font-semibold">
              Remarks
            </FieldLegend>
            <FieldGroup className="mt-5">
              <form.Field name="remarks">
                {(field) => {
                  const isInvalid = isFieldInvalid(field.state.meta);
                  return (
                    <Field data-invalid={isInvalid}>
                      <FieldLabel htmlFor={field.name} className="sr-only">
                        Remarks
                      </FieldLabel>
                      <Textarea
                        id={field.name}
                        name={field.name}
                        value={field.state.value}
                        onBlur={field.handleBlur}
                        onChange={(event) =>
                          field.handleChange(event.target.value)
                        }
                        aria-invalid={isInvalid}
                        placeholder="Add any additional comments or observations (optional)"
                        className="font-custom min-h-30 resize-y text-base"
                      />
                      {isInvalid ? (
                        <FieldError
                          errors={field.state.meta.errors as FieldErrors}
                        />
                      ) : null}
                    </Field>
                  );
                }}
              </form.Field>
            </FieldGroup>
          </FieldSet>
        </FieldGroup>
      </div>

      <SheetFooter className="border-border/40 flex-row gap-2.5 border-t px-5 py-4">
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="font-custom"
          onClick={handleReset}
        >
          Reset
        </Button>
        <form.Subscribe selector={(state) => state.isSubmitting}>
          {(isSubmitting) => (
            <Button
              type="submit"
              size="sm"
              className="font-custom flex-1 font-bold"
              disabled={isSubmitting || isPending}
            >
              {isSubmitting || isPending ? 'Saving…' : 'Save changes'}
            </Button>
          )}
        </form.Subscribe>
      </SheetFooter>
    </form>
  );
}

type EditDispatchPostStorageSheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  gatePass: MockDispatchPostStorageGatePass;
};

export function EditDispatchPostStorageSheet({
  open,
  onOpenChange,
  gatePass,
}: EditDispatchPostStorageSheetProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="flex w-full flex-col gap-0 p-0 data-[side=right]:max-w-full sm:data-[side=right]:max-w-md"
      >
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
          <SheetHeader className="border-border/40 border-b px-5 py-4">
            <div className="flex items-center gap-3">
              <span className="bg-primary/10 text-primary flex size-8 shrink-0 items-center justify-center rounded-lg">
                <Pencil className="size-4" />
              </span>
              <div className="min-w-0">
                <SheetTitle className="font-custom text-base leading-none font-semibold">
                  Edit Dispatch (Post Storage){' '}
                  <span className="font-mono tabular-nums">
                    #{gatePass.gatePassNo}
                  </span>
                </SheetTitle>
                <SheetDescription className="text-muted-foreground font-custom text-xs leading-snug">
                  Update date, route, truck, and remarks for this dispatch.
                </SheetDescription>
              </div>
            </div>
          </SheetHeader>

          {open ? (
            <EditDispatchPostStorageFormFields
              key={gatePass._id}
              gatePass={gatePass}
              onClose={() => onOpenChange(false)}
            />
          ) : null}
        </div>
      </SheetContent>
    </Sheet>
  );
}
