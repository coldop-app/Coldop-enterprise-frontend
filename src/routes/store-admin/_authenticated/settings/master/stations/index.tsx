/* eslint-disable react-refresh/only-export-components */
import { createFileRoute, Link } from '@tanstack/react-router';
import { useMemo, useState } from 'react';
import { useDebounceValue } from 'usehooks-ts';
import { ArrowLeft, Building, Plus, RefreshCw, XCircle } from 'lucide-react';

import { DeleteStationDialog } from '@/components/stations/DeleteStationDialog';
import { StationFormDialog } from '@/components/stations/StationFormDialog';
import { StationsTable } from '@/components/stations/StationsTable';
import { getStationSearchableText } from '@/components/stations/station-form-utils';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@/components/ui/empty';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { FilterBar } from '@/components/filter-bar';
import { useGetStationsWithLocalities } from '@/services/store-admin/station/useGetStationsWithLocalities';
import { useStore } from '@/stores/store';
import { usePermissionsStore } from '@/stores/usePermissionsStore';
import type { StationWithLocalities } from '@/types/station';

export const Route = createFileRoute(
  '/store-admin/_authenticated/settings/master/stations/'
)({
  component: RouteComponent,
});

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
  const [createOpen, setCreateOpen] = useState(false);
  const [editingStation, setEditingStation] =
    useState<StationWithLocalities | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [deletingStation, setDeletingStation] =
    useState<StationWithLocalities | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);

  const { data, isLoading, isFetching, isError, error, refetch } =
    useGetStationsWithLocalities({ coldStorageId });

  const stations = useMemo(() => data?.data ?? [], [data?.data]);

  const filteredStations = useMemo(() => {
    const trimmedSearch = search.trim().toLowerCase();

    const filtered = stations.filter((station) => {
      if (!trimmedSearch) return true;

      return getStationSearchableText(
        station.name,
        station.localities
      ).includes(trimmedSearch);
    });

    return [...filtered].sort((a, b) => {
      if (sortBy === 'name-desc') {
        return b.name.localeCompare(a.name);
      }

      if (sortBy === 'updated-desc') {
        return (
          new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
        );
      }

      return a.name.localeCompare(b.name);
    });
  }, [search, sortBy, stations]);

  const handleEdit = (station: StationWithLocalities) => {
    setEditingStation(station);
    setEditOpen(true);
  };

  const handleDelete = (station: StationWithLocalities) => {
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
        className="font-custom w-fit gap-2 px-0 transition-colors duration-200"
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
            Manage stations and their localities with seed dispatch and buy-back
            rates.
          </p>
        </div>

        <Badge variant="outline" className="font-custom h-7 px-2.5 text-xs">
          {filteredStations.length} station
          {filteredStations.length === 1 ? '' : 's'}
        </Badge>
      </div>

      <Separator />

      <FilterBar
        searchPlaceholder="Search stations and localities..."
        searchValue=""
        onSearchChange={setSearch}
        debounceDelay={0}
        selectedSort={sortBy}
        onSortChange={setSortBy}
        sortOptions={[
          { label: 'Name (A-Z)', value: 'name-asc' },
          { label: 'Name (Z-A)', value: 'name-desc' },
          { label: 'Recently Updated', value: 'updated-desc' },
        ]}
      >
        <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:justify-end">
          <Button
            variant="outline"
            size="sm"
            className="font-custom gap-2 transition-colors duration-200"
            onClick={() => void refetch()}
            disabled={isFetching}
          >
            <RefreshCw
              className={`h-4 w-4 ${isFetching ? 'animate-spin' : ''}`}
            />
            <span className="hidden sm:inline">Refresh</span>
          </Button>
          {canCreate && (
            <Button
              className="font-custom gap-2"
              size="sm"
              onClick={() => setCreateOpen(true)}
            >
              <Plus className="h-4 w-4" />
              Add Station
            </Button>
          )}
        </div>
      </FilterBar>

      {filteredStations.length > 0 ? (
        <StationsTable
          stations={filteredStations}
          canManage={canManage}
          canUpdate={canUpdate}
          canDelete={canDelete}
          onEdit={handleEdit}
          onDelete={handleDelete}
        />
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
                  ? 'Add your first station with at least one locality to get started.'
                  : 'Stations will appear here once they are created.'
                : 'Try a different search term or sort option.'}
            </EmptyDescription>
          </EmptyHeader>
          {stations.length === 0 && canCreate && (
            <Button
              className="font-custom gap-2"
              size="sm"
              onClick={() => setCreateOpen(true)}
            >
              <Plus className="h-4 w-4" />
              Add Station
            </Button>
          )}
        </Empty>
      )}

      <StationFormDialog
        mode="create"
        open={createOpen}
        onOpenChange={setCreateOpen}
        canSave={canCreate}
        coldStorageId={coldStorageId}
      />

      <StationFormDialog
        mode="edit"
        station={editingStation}
        open={editOpen}
        onOpenChange={setEditOpen}
        canSave={canUpdate}
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
