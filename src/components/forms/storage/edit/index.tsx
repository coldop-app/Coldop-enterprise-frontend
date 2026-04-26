import { memo, useEffect, useMemo } from 'react';
import { useForm } from '@tanstack/react-form';
import { useNavigate, useSearch } from '@tanstack/react-router';
import * as z from 'zod';
import { Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { DatePicker } from '@/components/forms/date-picker';
import {
  BAG_TYPES,
  GRADING_SIZES,
  POTATO_VARIETIES,
} from '@/components/forms/grading/constants';
import { SearchSelector } from '@/components/forms/search-selector';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Field, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { formatDate, formatDateToISO } from '@/lib/helpers';
import { useEditStorageGatePass } from '@/services/store-admin/analytics/storage/useEditStorageGatePass';
import { useGetStorageGatePassById } from '@/services/store-admin/storage-gate-pass/useGetStorageGatePassById';

type BagRow = {
  id: string;
  size: string;
  quantity: number;
  bagType: string;
  chamber: string;
  floor: string;
  row: string;
};

const formSchema = z
  .object({
    date: z.string().min(1, 'Date is required'),
    variety: z.string().min(1, 'Please select a variety'),
    manualGatePassNumber: z.union([z.number(), z.undefined()]),
    remarks: z.string(),
    reason: z.string(),
    bagRows: z.array(
      z.object({
        id: z.string(),
        size: z.string().min(1),
        quantity: z.number().min(0),
        bagType: z.string().min(1),
        chamber: z.string(),
        floor: z.string(),
        row: z.string(),
      })
    ),
  })
  .refine(
    (data) => (data.bagRows ?? []).some((item) => (item.quantity ?? 0) > 0),
    { message: 'Please enter at least one bag quantity.', path: ['bagRows'] }
  )
  .refine(
    (data) =>
      (data.bagRows ?? [])
        .filter((item) => (item.quantity ?? 0) > 0)
        .every(
          (item) =>
            item.chamber.trim() !== '' &&
            item.floor.trim() !== '' &&
            item.row.trim() !== ''
        ),
    {
      message: 'Please fill chamber, floor and row for each row with quantity.',
      path: ['bagRows'],
    }
  );

const StorageEdit = memo(function StorageEdit() {
  const navigate = useNavigate();
  const search = useSearch({
    from: '/store-admin/_authenticated/storage/edit/',
  });
  const id = search.id ?? '';
  const { data, isLoading, error } = useGetStorageGatePassById(id);
  const { mutate: editStorageGatePass, isPending } = useEditStorageGatePass();

  const initialBagRows = useMemo<BagRow[]>(
    () =>
      (data?.bagSizes ?? []).map((item) => ({
        id: crypto.randomUUID(),
        size: item.size ?? '',
        quantity: Number(item.currentQuantity ?? item.initialQuantity ?? 0),
        bagType: item.bagType ?? 'JUTE',
        chamber: item.chamber ?? '',
        floor: item.floor ?? '',
        row: item.row ?? '',
      })),
    [data?.bagSizes]
  );

  const getFormDefaults = () => ({
    date: data?.date ? formatDate(new Date(data.date)) : formatDate(new Date()),
    variety: data?.variety ?? '',
    manualGatePassNumber: data?.manualGatePassNumber,
    remarks: data?.remarks ?? '',
    reason: '',
    bagRows:
      initialBagRows.length > 0
        ? initialBagRows
        : [
            {
              id: crypto.randomUUID(),
              size: GRADING_SIZES[0] ?? '',
              quantity: 0,
              bagType: 'JUTE',
              chamber: '',
              floor: '',
              row: '',
            },
          ],
  });

  const form = useForm({
    defaultValues: getFormDefaults(),
    validators: { onSubmit: formSchema as never },
    onSubmit: async ({ value }) => {
      if (!id) {
        toast.error('Missing storage gate pass id.');
        return;
      }

      editStorageGatePass(
        {
          id,
          date: formatDateToISO(value.date),
          variety: value.variety.trim(),
          manualGatePassNumber: value.manualGatePassNumber,
          remarks: value.remarks.trim(),
          reason: value.reason.trim() || undefined,
          bagSizes: value.bagRows
            .filter((item) => (item.quantity ?? 0) > 0)
            .map((item) => ({
              size: item.size,
              bagType: item.bagType,
              currentQuantity: Number(item.quantity ?? 0),
              initialQuantity: Number(item.quantity ?? 0),
              chamber: item.chamber.trim(),
              floor: item.floor.trim(),
              row: item.row.trim(),
            })),
        },
        {
          onSuccess: (response) => {
            if (!response.success) return;
            navigate({ to: '/store-admin/analytics' });
          },
        }
      );
    },
  });

  useEffect(() => {
    if (!data) return;
    form.reset(getFormDefaults());
  }, [data, initialBagRows, form]);

  if (isLoading) {
    return (
      <main className="font-custom mx-auto max-w-4xl px-4 py-6 sm:px-8 sm:py-12">
        <Card>
          <CardContent className="py-6">
            Loading storage gate pass...
          </CardContent>
        </Card>
      </main>
    );
  }

  if (error || !data) {
    return (
      <main className="font-custom mx-auto max-w-4xl px-4 py-6 sm:px-8 sm:py-12">
        <Card>
          <CardContent className="space-y-4 py-6">
            <p className="font-custom text-destructive">
              {error instanceof Error
                ? error.message
                : 'Failed to load storage gate pass.'}
            </p>
            <Button
              className="font-custom"
              onClick={() => navigate({ to: '/store-admin/analytics' })}
            >
              Back to Reports
            </Button>
          </CardContent>
        </Card>
      </main>
    );
  }

  return (
    <main className="font-custom mx-auto max-w-4xl px-4 py-6 sm:px-8 sm:py-12">
      <div className="mb-8 space-y-2">
        <h1 className="font-custom text-foreground text-3xl font-bold sm:text-4xl">
          Edit Storage Gate Pass
        </h1>
        <p className="font-custom text-muted-foreground text-sm">
          Gate pass #{data.gatePassNo}
        </p>
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          e.stopPropagation();
          form.handleSubmit();
        }}
        className="space-y-6"
      >
        <FieldGroup className="space-y-6">
          <form.Field
            name="manualGatePassNumber"
            children={(field) => (
              <Field>
                <FieldLabel className="font-custom mb-2 block text-base font-semibold">
                  Manual Gate Pass Number (optional)
                </FieldLabel>
                <Input
                  type="number"
                  min={0}
                  value={field.state.value ?? ''}
                  onChange={(e) => {
                    const raw = e.target.value;
                    if (raw === '') {
                      field.handleChange(undefined);
                      return;
                    }
                    const parsed = parseInt(raw, 10);
                    field.handleChange(
                      Number.isNaN(parsed) ? undefined : parsed
                    );
                  }}
                />
              </Field>
            )}
          />

          <form.Field
            name="date"
            children={(field) => (
              <Field>
                <DatePicker
                  id="storage-edit-date"
                  label="Date"
                  value={field.state.value}
                  onChange={(value) => field.handleChange(value)}
                />
              </Field>
            )}
          />

          <form.Field
            name="variety"
            children={(field) => (
              <Field>
                <FieldLabel className="font-custom mb-2 block text-base font-semibold">
                  Select Variety
                </FieldLabel>
                <SearchSelector
                  options={POTATO_VARIETIES}
                  placeholder="Select a variety"
                  searchPlaceholder="Search variety..."
                  onSelect={(value) => field.handleChange(value ?? '')}
                  value={field.state.value}
                  buttonClassName="w-full justify-between"
                />
              </Field>
            )}
          />

          <form.Field
            name="bagRows"
            children={(field) => (
              <Card>
                <CardContent className="space-y-4 pt-6">
                  {(field.state.value ?? []).map((row, index) => (
                    <div
                      key={row.id}
                      className="grid grid-cols-1 gap-2 border-b pb-3 sm:grid-cols-7"
                    >
                      <select
                        aria-label="Size"
                        value={row.size}
                        onChange={(e) => {
                          const next = [...field.state.value];
                          next[index] = { ...row, size: e.target.value };
                          field.handleChange(next);
                        }}
                        className="border-input bg-background font-custom h-9 rounded-md border px-2 text-sm"
                      >
                        {GRADING_SIZES.map((size) => (
                          <option key={size} value={size}>
                            {size}
                          </option>
                        ))}
                      </select>
                      <Input
                        type="number"
                        min={0}
                        placeholder="Qty"
                        value={row.quantity === 0 ? '' : String(row.quantity)}
                        onChange={(e) => {
                          const qty =
                            e.target.value === '' ? 0 : Number(e.target.value);
                          const next = [...field.state.value];
                          next[index] = {
                            ...row,
                            quantity: Math.max(0, qty || 0),
                          };
                          field.handleChange(next);
                        }}
                      />
                      <select
                        aria-label="Bag type"
                        value={row.bagType}
                        onChange={(e) => {
                          const next = [...field.state.value];
                          next[index] = { ...row, bagType: e.target.value };
                          field.handleChange(next);
                        }}
                        className="border-input bg-background font-custom h-9 rounded-md border px-2 text-sm"
                      >
                        {BAG_TYPES.map((type) => (
                          <option key={type} value={type}>
                            {type}
                          </option>
                        ))}
                      </select>
                      <Input
                        placeholder="Ch"
                        value={row.chamber}
                        onChange={(e) => {
                          const next = [...field.state.value];
                          next[index] = {
                            ...row,
                            chamber: e.target.value.toUpperCase(),
                          };
                          field.handleChange(next);
                        }}
                      />
                      <Input
                        placeholder="Fl"
                        value={row.floor}
                        onChange={(e) => {
                          const next = [...field.state.value];
                          next[index] = {
                            ...row,
                            floor: e.target.value.toUpperCase(),
                          };
                          field.handleChange(next);
                        }}
                      />
                      <Input
                        placeholder="Row"
                        value={row.row}
                        onChange={(e) => {
                          const next = [...field.state.value];
                          next[index] = {
                            ...row,
                            row: e.target.value.toUpperCase(),
                          };
                          field.handleChange(next);
                        }}
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          const next = (field.state.value ?? []).filter(
                            (item) => item.id !== row.id
                          );
                          field.handleChange(
                            next.length > 0
                              ? next
                              : [
                                  {
                                    id: crypto.randomUUID(),
                                    size: GRADING_SIZES[0] ?? '',
                                    quantity: 0,
                                    bagType: 'JUTE',
                                    chamber: '',
                                    floor: '',
                                    row: '',
                                  },
                                ]
                          );
                        }}
                        aria-label="Remove size row"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}

                  <Button
                    type="button"
                    variant="outline"
                    onClick={() =>
                      field.handleChange([
                        ...(field.state.value ?? []),
                        {
                          id: crypto.randomUUID(),
                          size: GRADING_SIZES[0] ?? '',
                          quantity: 0,
                          bagType: 'JUTE',
                          chamber: '',
                          floor: '',
                          row: '',
                        },
                      ])
                    }
                    className="font-custom"
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Add Size Row
                  </Button>
                </CardContent>
              </Card>
            )}
          />

          <form.Field
            name="remarks"
            children={(field) => (
              <Field>
                <FieldLabel className="font-custom mb-2 block text-base font-semibold">
                  Remarks
                </FieldLabel>
                <textarea
                  value={field.state.value}
                  onChange={(e) => field.handleChange(e.target.value)}
                  rows={4}
                  className="border-input bg-background text-foreground font-custom w-full rounded-md border p-2"
                />
              </Field>
            )}
          />

          <form.Field
            name="reason"
            children={(field) => (
              <Field>
                <FieldLabel className="font-custom mb-2 block text-base font-semibold">
                  Edit Reason (optional)
                </FieldLabel>
                <Input
                  value={field.state.value}
                  onChange={(e) => field.handleChange(e.target.value)}
                  placeholder="Why are you editing this gate pass?"
                />
              </Field>
            )}
          />
        </FieldGroup>

        <div className="flex items-center justify-end gap-3">
          <Button
            type="button"
            variant="outline"
            className="font-custom"
            onClick={() => navigate({ to: '/store-admin/analytics' })}
            disabled={isPending}
          >
            Cancel
          </Button>
          <Button type="submit" className="font-custom" disabled={isPending}>
            {isPending ? 'Updating…' : 'Update Storage Gate Pass'}
          </Button>
        </div>
      </form>
    </main>
  );
});

export default StorageEdit;
