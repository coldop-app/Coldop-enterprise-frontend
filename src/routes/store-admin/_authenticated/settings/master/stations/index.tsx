/* eslint-disable react-refresh/only-export-components */
import { createFileRoute, Link } from '@tanstack/react-router';
import { useEffect, useMemo, useState } from 'react';
import { useForm } from '@tanstack/react-form';
import { useDebounceValue } from 'usehooks-ts';
import * as z from 'zod';
import {
  ArrowLeft,
  Building,
  Pencil,
  Plus,
  RefreshCw,
  Trash2,
  XCircle,
} from 'lucide-react';

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
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
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@/components/ui/empty';
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { FilterBar } from '@/components/filter-bar';
import {
  blurTargetOnNumberWheel,
  businessNumberSpinnerClassName,
  preventArrowUpDownOnNumericInput,
} from '@/lib/business-number-input';
import { formatDate } from '@/lib/helpers';
import { cn } from '@/lib/utils';
import { useCreateStation } from '@/services/store-admin/station/useCreateStation';
import { useDeleteStation } from '@/services/store-admin/station/useDeleteStation';
import { useEditStation } from '@/services/store-admin/station/useEditStation';
import { useGetStations } from '@/services/store-admin/station/useGetStations';
import { useStore } from '@/stores/store';
import { usePermissionsStore } from '@/stores/usePermissionsStore';
import type { Station } from '@/types/station';

export const Route = createFileRoute(
  '/store-admin/_authenticated/settings/master/stations/'
)({
  component: RouteComponent,
});

const stationNameSchema = z.string().trim().min(1, 'Name is required');

const localitySchema = z.string().trim().min(1, 'Locality is required');

const requiredRateSchema = z
  .string()
  .transform((value) => value.trim())
  .refine(
    (value) =>
      value !== '' && !Number.isNaN(Number(value)) && Number(value) >= 0,
    'Must be a valid non-negative number'
  );

const createStationSchema = z.object({
  name: stationNameSchema,
  locality: localitySchema,
  seedDispatchRatePerBag: requiredRateSchema,
  seedBuyBackRatePerQuintal: requiredRateSchema,
});

const editStationSchema = createStationSchema;

function formatStationDate(value: string): string {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return '—';
  return formatDate(parsed);
}

function formatNumberValue(value?: number | null): string {
  if (value === undefined || value === null) return '—';
  return String(value);
}

function parseRequiredNumberInput(value: string): number {
  return Number(value.trim());
}

function CreateStationDialog({
  canCreate,
  coldStorageId,
}: {
  canCreate: boolean;
  coldStorageId: string;
}) {
  const [open, setOpen] = useState(false);
  const { mutate: createStation, isPending } = useCreateStation();

  const form = useForm({
    defaultValues: {
      name: '',
      locality: '',
      seedDispatchRatePerBag: '',
      seedBuyBackRatePerQuintal: '',
    },
    validators: {
      onBlur: createStationSchema,
      onSubmit: createStationSchema,
    },
    onSubmit: async ({ value }) => {
      createStation(
        {
          coldStorageId,
          name: value.name.trim(),
          locality: value.locality.trim(),
          seedDispatchRatePerBag: parseRequiredNumberInput(
            value.seedDispatchRatePerBag
          ),
          seedBuyBackRatePerQuintal: parseRequiredNumberInput(
            value.seedBuyBackRatePerQuintal
          ),
        },
        {
          onSuccess: (data) => {
            if (data.success) {
              form.reset();
              setOpen(false);
            }
          },
        }
      );
    },
  });

  useEffect(() => {
    if (!open) {
      form.reset();
    }
  }, [open, form]);

  if (!canCreate) return null;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="font-custom gap-2" size="sm">
          <Plus className="h-4 w-4" />
          Add Station
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
            <DialogTitle>Add Station</DialogTitle>
            <DialogDescription>
              Create a new station with locality and seed dispatch and buy-back
              rates.
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
                    <FieldLabel htmlFor="create-station-name">Name</FieldLabel>
                    <Input
                      id="create-station-name"
                      name={field.name}
                      value={field.state.value}
                      onBlur={field.handleBlur}
                      onChange={(e) => field.handleChange(e.target.value)}
                      aria-invalid={isInvalid}
                      autoFocus
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
              name="locality"
              children={(field) => {
                const isInvalid =
                  field.state.meta.isTouched && !field.state.meta.isValid;

                return (
                  <Field data-invalid={isInvalid}>
                    <FieldLabel htmlFor="create-station-locality">
                      Locality
                    </FieldLabel>
                    <Input
                      id="create-station-locality"
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
              name="seedDispatchRatePerBag"
              children={(field) => {
                const isInvalid =
                  field.state.meta.isTouched && !field.state.meta.isValid;

                return (
                  <Field data-invalid={isInvalid}>
                    <FieldLabel htmlFor="create-station-dispatch-rate">
                      Seed dispatch rate per bag
                    </FieldLabel>
                    <Input
                      id="create-station-dispatch-rate"
                      name={field.name}
                      type="number"
                      min={0}
                      step="any"
                      value={field.state.value}
                      onBlur={field.handleBlur}
                      onChange={(e) => field.handleChange(e.target.value)}
                      aria-invalid={isInvalid}
                      className={cn(businessNumberSpinnerClassName)}
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
              name="seedBuyBackRatePerQuintal"
              children={(field) => {
                const isInvalid =
                  field.state.meta.isTouched && !field.state.meta.isValid;

                return (
                  <Field data-invalid={isInvalid}>
                    <FieldLabel htmlFor="create-station-buyback-rate">
                      Seed buy-back rate per quintal
                    </FieldLabel>
                    <Input
                      id="create-station-buyback-rate"
                      name={field.name}
                      type="number"
                      min={0}
                      step="any"
                      value={field.state.value}
                      onBlur={field.handleBlur}
                      onChange={(e) => field.handleChange(e.target.value)}
                      aria-invalid={isInvalid}
                      className={cn(businessNumberSpinnerClassName)}
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
          </FieldGroup>

          <DialogFooter className="mt-6 gap-2 sm:justify-end">
            <DialogClose asChild>
              <Button type="button" variant="outline" disabled={isPending}>
                Cancel
              </Button>
            </DialogClose>
            <Button type="submit" disabled={isPending} className="font-bold">
              {isPending ? 'Creating…' : 'Create Station'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function EditStationDialog({
  station,
  open,
  onOpenChange,
  canUpdate,
  coldStorageId,
}: {
  station: Station | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  canUpdate: boolean;
  coldStorageId: string;
}) {
  const { mutate: editStation, isPending } = useEditStation();

  const form = useForm({
    defaultValues: {
      name: '',
      locality: '',
      seedDispatchRatePerBag: '',
      seedBuyBackRatePerQuintal: '',
    },
    validators: {
      onBlur: editStationSchema,
      onSubmit: editStationSchema,
    },
    onSubmit: async ({ value }) => {
      if (!station) return;

      editStation(
        {
          id: station._id,
          coldStorageId,
          name: value.name.trim(),
          locality: value.locality.trim(),
          seedDispatchRatePerBag: parseRequiredNumberInput(
            value.seedDispatchRatePerBag
          ),
          seedBuyBackRatePerQuintal: parseRequiredNumberInput(
            value.seedBuyBackRatePerQuintal
          ),
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
    if (!open || !station) return;
    form.reset({
      name: station.name,
      locality: station.locality,
      seedDispatchRatePerBag: String(station.seedDispatchRatePerBag),
      seedBuyBackRatePerQuintal: String(station.seedBuyBackRatePerQuintal),
    });
  }, [open, station, form]);

  if (!canUpdate) return null;

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
            <DialogTitle>Edit Station</DialogTitle>
            <DialogDescription>
              Update the station name, locality, and seed dispatch and buy-back
              rates.
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
                    <FieldLabel htmlFor="edit-station-name">Name</FieldLabel>
                    <Input
                      id="edit-station-name"
                      name={field.name}
                      value={field.state.value}
                      onBlur={field.handleBlur}
                      onChange={(e) => field.handleChange(e.target.value)}
                      aria-invalid={isInvalid}
                      autoFocus
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
              name="locality"
              children={(field) => {
                const isInvalid =
                  field.state.meta.isTouched && !field.state.meta.isValid;

                return (
                  <Field data-invalid={isInvalid}>
                    <FieldLabel htmlFor="edit-station-locality">
                      Locality
                    </FieldLabel>
                    <Input
                      id="edit-station-locality"
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
              name="seedDispatchRatePerBag"
              children={(field) => {
                const isInvalid =
                  field.state.meta.isTouched && !field.state.meta.isValid;

                return (
                  <Field data-invalid={isInvalid}>
                    <FieldLabel htmlFor="edit-station-dispatch-rate">
                      Seed dispatch rate per bag
                    </FieldLabel>
                    <Input
                      id="edit-station-dispatch-rate"
                      name={field.name}
                      type="number"
                      min={0}
                      step="any"
                      value={field.state.value}
                      onBlur={field.handleBlur}
                      onChange={(e) => field.handleChange(e.target.value)}
                      aria-invalid={isInvalid}
                      className={cn(businessNumberSpinnerClassName)}
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
              name="seedBuyBackRatePerQuintal"
              children={(field) => {
                const isInvalid =
                  field.state.meta.isTouched && !field.state.meta.isValid;

                return (
                  <Field data-invalid={isInvalid}>
                    <FieldLabel htmlFor="edit-station-buyback-rate">
                      Seed buy-back rate per quintal
                    </FieldLabel>
                    <Input
                      id="edit-station-buyback-rate"
                      name={field.name}
                      type="number"
                      min={0}
                      step="any"
                      value={field.state.value}
                      onBlur={field.handleBlur}
                      onChange={(e) => field.handleChange(e.target.value)}
                      aria-invalid={isInvalid}
                      className={cn(businessNumberSpinnerClassName)}
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
          </FieldGroup>

          <DialogFooter className="mt-6 gap-2 sm:justify-end">
            <DialogClose asChild>
              <Button type="button" variant="outline" disabled={isPending}>
                Cancel
              </Button>
            </DialogClose>
            <Button type="submit" disabled={isPending} className="font-bold">
              {isPending ? 'Saving…' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function DeleteStationDialog({
  station,
  open,
  onOpenChange,
  canDelete,
}: {
  station: Station | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  canDelete: boolean;
}) {
  const { mutate: deleteStation, isPending } = useDeleteStation();

  const handleDelete = () => {
    if (!station) return;

    deleteStation(
      { id: station._id },
      {
        onSuccess: (data) => {
          if (data.success) {
            onOpenChange(false);
          }
        },
      }
    );
  };

  if (!canDelete) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="font-custom sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Delete Station</DialogTitle>
          <DialogDescription>
            Are you sure you want to delete{' '}
            <span className="text-foreground font-medium">
              {station?.name ?? 'this station'}
            </span>
            ? This action cannot be undone. Stations assigned to farmer storage
            links cannot be deleted.
          </DialogDescription>
        </DialogHeader>

        <DialogFooter className="mt-6 gap-2 sm:justify-end">
          <DialogClose asChild>
            <Button type="button" variant="outline" disabled={isPending}>
              Cancel
            </Button>
          </DialogClose>
          <Button
            type="button"
            variant="destructive"
            disabled={isPending || !station}
            className="font-bold"
            onClick={handleDelete}
          >
            {isPending ? 'Deleting…' : 'Delete Station'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function RouteComponent() {
  const coldStorageId = useStore(
    (state) => state.coldStorage?._id ?? state.admin?.coldStorageId ?? ''
  );
  const role = useStore((state) => state.admin?.role);
  const hasPermission = usePermissionsStore((state) => state.hasPermission);
  const isAdmin = role === 'Admin';
  const canCreate = isAdmin || hasPermission('station', 'create');
  const canUpdate = isAdmin || hasPermission('station', 'update');
  const canDelete = isAdmin || hasPermission('station', 'delete');
  const canManage = canUpdate || canDelete;

  const [search, setSearch] = useDebounceValue('', 300);
  const [sortBy, setSortBy] = useState('name-asc');
  const [editingStation, setEditingStation] = useState<Station | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [deletingStation, setDeletingStation] = useState<Station | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);

  const { data, isLoading, isFetching, isError, error, refetch } =
    useGetStations({ coldStorageId });

  const stations = useMemo(() => data?.data ?? [], [data?.data]);

  const filteredStations = useMemo(() => {
    const trimmedSearch = search.trim().toLowerCase();

    const filtered = stations.filter((station) => {
      if (!trimmedSearch) return true;

      const searchableText = [
        station.name,
        station.locality,
        formatNumberValue(station.seedDispatchRatePerBag),
        formatNumberValue(station.seedBuyBackRatePerQuintal),
      ]
        .join(' ')
        .toLowerCase();

      return searchableText.includes(trimmedSearch);
    });

    return [...filtered].sort((a, b) => {
      if (sortBy === 'name-desc') {
        return b.name.localeCompare(a.name);
      }

      if (sortBy === 'locality-asc') {
        return a.locality.localeCompare(b.locality);
      }

      if (sortBy === 'locality-desc') {
        return b.locality.localeCompare(a.locality);
      }

      if (sortBy === 'dispatch-rate-asc') {
        return a.seedDispatchRatePerBag - b.seedDispatchRatePerBag;
      }

      if (sortBy === 'dispatch-rate-desc') {
        return b.seedDispatchRatePerBag - a.seedDispatchRatePerBag;
      }

      if (sortBy === 'buyback-rate-asc') {
        return a.seedBuyBackRatePerQuintal - b.seedBuyBackRatePerQuintal;
      }

      if (sortBy === 'buyback-rate-desc') {
        return b.seedBuyBackRatePerQuintal - a.seedBuyBackRatePerQuintal;
      }

      if (sortBy === 'updated-desc') {
        return (
          new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
        );
      }

      return a.name.localeCompare(b.name);
    });
  }, [search, sortBy, stations]);

  const handleEdit = (station: Station) => {
    setEditingStation(station);
    setEditOpen(true);
  };

  const handleDelete = (station: Station) => {
    setDeletingStation(station);
    setDeleteOpen(true);
  };

  if (isLoading) {
    return (
      <main className="mx-auto flex max-w-5xl flex-col gap-5 p-3 sm:p-4 lg:p-6">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-7 w-64" />
        <Skeleton className="h-4 w-80" />
        <Skeleton className="h-64 rounded-2xl" />
      </main>
    );
  }

  if (isError) {
    return (
      <main className="mx-auto max-w-5xl p-3 sm:p-4 lg:p-6">
        <Button
          variant="ghost"
          size="sm"
          className="font-custom mb-4 gap-2 px-0"
          asChild
        >
          <Link to="/store-admin/settings/master">
            <ArrowLeft className="h-4 w-4" />
            Back to Master
          </Link>
        </Button>
        <Alert variant="destructive" className="rounded-xl">
          <XCircle className="h-4 w-4" />
          <AlertTitle className="font-custom font-semibold">
            Unable to load stations
          </AlertTitle>
          <AlertDescription className="font-custom">
            {error instanceof Error
              ? error.message
              : 'Please refresh the page and try again.'}
          </AlertDescription>
        </Alert>
        <Button
          variant="outline"
          size="sm"
          className="font-custom mt-4 gap-2"
          onClick={() => void refetch()}
        >
          <RefreshCw className="h-4 w-4" />
          Retry
        </Button>
      </main>
    );
  }

  return (
    <main className="mx-auto flex max-w-5xl flex-col gap-5 p-3 sm:p-4 lg:p-6">
      <Button
        variant="ghost"
        size="sm"
        className="font-custom w-fit gap-2 px-0"
        asChild
      >
        <Link to="/store-admin/settings/master">
          <ArrowLeft className="h-4 w-4" />
          Back to Master
        </Link>
      </Button>

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2.5">
            <div className="bg-primary/10 flex h-8 w-8 items-center justify-center rounded-lg">
              <Building className="text-primary h-4 w-4" />
            </div>
            <h1 className="font-custom text-xl font-bold tracking-tight">
              Stations
            </h1>
          </div>
          <p className="font-custom text-muted-foreground ml-10.5 text-sm">
            Manage station master records used across the system.
          </p>
        </div>

        <Badge variant="outline" className="font-custom h-7 px-2.5 text-xs">
          {filteredStations.length} station
          {filteredStations.length === 1 ? '' : 's'}
        </Badge>
      </div>

      <Separator />

      <FilterBar
        searchPlaceholder="Search stations..."
        searchValue=""
        onSearchChange={setSearch}
        debounceDelay={0}
        selectedSort={sortBy}
        onSortChange={setSortBy}
        sortOptions={[
          { label: 'Name (A-Z)', value: 'name-asc' },
          { label: 'Name (Z-A)', value: 'name-desc' },
          { label: 'Locality (A-Z)', value: 'locality-asc' },
          { label: 'Locality (Z-A)', value: 'locality-desc' },
          {
            label: 'Dispatch rate (Low-High)',
            value: 'dispatch-rate-asc',
          },
          {
            label: 'Dispatch rate (High-Low)',
            value: 'dispatch-rate-desc',
          },
          {
            label: 'Buy-back rate (Low-High)',
            value: 'buyback-rate-asc',
          },
          {
            label: 'Buy-back rate (High-Low)',
            value: 'buyback-rate-desc',
          },
          { label: 'Recently Updated', value: 'updated-desc' },
        ]}
      >
        <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:justify-end">
          <Button
            variant="outline"
            size="sm"
            className="font-custom gap-2"
            onClick={() => void refetch()}
            disabled={isFetching}
          >
            <RefreshCw
              className={`h-4 w-4 ${isFetching ? 'animate-spin' : ''}`}
            />
            <span className="hidden sm:inline">Refresh</span>
          </Button>
          <CreateStationDialog
            canCreate={canCreate}
            coldStorageId={coldStorageId}
          />
        </div>
      </FilterBar>

      {filteredStations.length > 0 ? (
        <div className="overflow-hidden rounded-2xl border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="font-custom">Name</TableHead>
                <TableHead className="font-custom">Locality</TableHead>
                <TableHead className="font-custom hidden md:table-cell">
                  Dispatch rate / bag
                </TableHead>
                <TableHead className="font-custom hidden md:table-cell">
                  Buy-back rate / quintal
                </TableHead>
                <TableHead className="font-custom hidden sm:table-cell">
                  Updated
                </TableHead>
                {canManage && (
                  <TableHead className="font-custom w-[180px] text-right">
                    Actions
                  </TableHead>
                )}
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredStations.map((station) => (
                <TableRow key={station._id}>
                  <TableCell className="font-custom font-medium">
                    {station.name}
                  </TableCell>
                  <TableCell className="font-custom">
                    {station.locality}
                  </TableCell>
                  <TableCell className="font-custom hidden md:table-cell">
                    {formatNumberValue(station.seedDispatchRatePerBag)}
                  </TableCell>
                  <TableCell className="font-custom hidden md:table-cell">
                    {formatNumberValue(station.seedBuyBackRatePerQuintal)}
                  </TableCell>
                  <TableCell className="font-custom text-muted-foreground hidden sm:table-cell">
                    {formatStationDate(station.updatedAt)}
                  </TableCell>
                  {canManage && (
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        {canUpdate && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="font-custom gap-2"
                            onClick={() => handleEdit(station)}
                          >
                            <Pencil className="h-4 w-4" />
                            Edit
                          </Button>
                        )}
                        {canDelete && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="font-custom text-destructive hover:bg-destructive/10 hover:text-destructive gap-2"
                            onClick={() => handleDelete(station)}
                          >
                            <Trash2 className="h-4 w-4" />
                            Delete
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      ) : (
        <Empty className="rounded-2xl border py-16">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <Building />
            </EmptyMedia>
            <EmptyTitle className="font-custom">
              {stations.length === 0 ? 'No stations yet' : 'No stations found'}
            </EmptyTitle>
            <EmptyDescription className="font-custom">
              {stations.length === 0
                ? canCreate
                  ? 'Add your first station to get started.'
                  : 'Stations will appear here once they are created.'
                : 'Try a different search term or sort option.'}
            </EmptyDescription>
          </EmptyHeader>
          {stations.length === 0 && canCreate && (
            <CreateStationDialog
              canCreate={canCreate}
              coldStorageId={coldStorageId}
            />
          )}
        </Empty>
      )}

      <EditStationDialog
        station={editingStation}
        open={editOpen}
        onOpenChange={setEditOpen}
        canUpdate={canUpdate}
        coldStorageId={coldStorageId}
      />

      <DeleteStationDialog
        station={deletingStation}
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        canDelete={canDelete}
      />
    </main>
  );
}
