import type { ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';
import {
  ArrowDown,
  ArrowUp,
  Columns,
  MapPin,
  Package,
  RotateCcw,
  Search,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from '@/components/ui/empty';
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from '@/components/ui/input-group';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import {
  STORAGE_GATE_PASSES_FOR_FARMER_QUERY_PARAMS,
  useGetStorageGatePassesForFarmer,
} from '@/services/store-admin/storage-gate-pass/useGetStorageGatePassesForFarmer';
import { StorageGatePassMatrix } from './-StorageGatePassMatrix';
import { useStorageGatePassMatrix } from './-use-storage-gate-pass-matrix';

type StorageGatePassesSectionProps = {
  farmerStorageLinkId: string;
  allocations: Record<string, number>;
  onAllocationsChange: (next: Record<string, number>) => void;
  farmerPromptLabel?: string;
};

export function StorageGatePassesSection({
  farmerStorageLinkId,
  allocations,
  onAllocationsChange,
  farmerPromptLabel = 'farmer',
}: StorageGatePassesSectionProps) {
  const { data, isLoading, error } = useGetStorageGatePassesForFarmer(
    farmerStorageLinkId,
    STORAGE_GATE_PASSES_FOR_FARMER_QUERY_PARAMS
  );

  const allPasses = data?.data ?? [];
  const matrix = useStorageGatePassMatrix({
    allPasses,
    allocations,
    onAllocationsChange,
  });

  if (!farmerStorageLinkId) {
    return (
      <GatePassesSectionMessage
        title="Select a farmer"
        description={
          farmerPromptLabel === 'From' ? (
            <>
              Choose a <span className="text-foreground font-medium">From</span>{' '}
              farmer to view storage gate passes.
            </>
          ) : (
            <>
              Choose a{' '}
              <span className="text-foreground font-medium">farmer</span> to
              view storage gate passes.
            </>
          )
        }
      />
    );
  }

  if (isLoading) {
    return (
      <Card className="ring-border/60 py-4">
        <CardContent className="flex flex-col gap-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-11 w-full" />
          ))}
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <GatePassesSectionMessage
        title="Could not load gate passes"
        description={error.message}
        variant="destructive"
      />
    );
  }

  if (!allPasses.length) {
    return (
      <GatePassesSectionMessage
        title="No gate passes"
        description="No storage gate passes for this farmer."
      />
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <InputGroup className="h-11">
        <InputGroupAddon align="inline-start">
          <Search className="size-4" aria-hidden />
        </InputGroupAddon>
        <InputGroupInput
          placeholder="Search by gate pass or manual parchi number"
          value={matrix.gatePassSearch}
          onChange={(e) => matrix.setGatePassSearch(e.target.value)}
          className="text-base sm:text-sm"
          aria-label="Search gate passes"
        />
      </InputGroup>

      <Card className="bg-muted/30 ring-border/60 py-4">
        <CardContent className="flex flex-wrap items-end gap-x-5 gap-y-4 px-4">
          <div className="flex flex-col gap-2">
            <Label className="text-muted-foreground text-xs leading-none font-medium">
              Sort by gate pass
            </Label>
            <div className="flex h-10 items-center gap-1.5">
              <Button
                type="button"
                variant={matrix.voucherSort === 'asc' ? 'default' : 'outline'}
                size="sm"
                className="font-custom h-10 gap-1.5 px-3"
                onClick={() => matrix.setVoucherSort('asc')}
              >
                <ArrowUp className="size-4" />
                Ascending
              </Button>
              <Button
                type="button"
                variant={matrix.voucherSort === 'desc' ? 'default' : 'outline'}
                size="sm"
                className="font-custom h-10 gap-1.5 px-3"
                onClick={() => matrix.setVoucherSort('desc')}
              >
                <ArrowDown className="size-4" />
                Descending
              </Button>
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <Label className="text-muted-foreground text-xs leading-none font-medium">
              Sizes
            </Label>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="font-custom h-10 gap-2"
                >
                  <Columns className="size-4" />
                  Sizes
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuLabel>Toggle sizes</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuCheckboxItem
                  checked={matrix.sizeVisibility === 'all'}
                  onCheckedChange={(checked) => {
                    if (checked) matrix.handleSelectAllSizes();
                    else matrix.setSizeVisibility(new Set());
                  }}
                >
                  All
                </DropdownMenuCheckboxItem>
                <DropdownMenuSeparator />
                {matrix.sizesForColumnPicker.map((size) => (
                  <DropdownMenuCheckboxItem
                    key={size}
                    checked={matrix.isSizeVisible(matrix.sizeVisibility, size)}
                    onCheckedChange={() => matrix.handleSizeToggle(size)}
                  >
                    {size}
                  </DropdownMenuCheckboxItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {matrix.uniqueVarieties.length > 0 ? (
            <MatrixRadioFilter
              label="Variety"
              value={matrix.varietyFilter}
              options={matrix.uniqueVarieties}
              onChange={matrix.setVarietyFilter}
              icon={Package}
              triggerClassName="min-w-30"
              ariaLabel="Variety filter"
            />
          ) : null}

          {matrix.uniqueLocations.chambers.length > 0 ? (
            <MatrixRadioFilter
              label="Chamber"
              value={matrix.locationFilters.chamber}
              options={matrix.uniqueLocations.chambers}
              onChange={(chamber) =>
                matrix.setLocationFilters((prev) => ({ ...prev, chamber }))
              }
              icon={MapPin}
            />
          ) : null}
          {matrix.uniqueLocations.floors.length > 0 ? (
            <MatrixRadioFilter
              label="Floor"
              value={matrix.locationFilters.floor}
              options={matrix.uniqueLocations.floors}
              onChange={(floor) =>
                matrix.setLocationFilters((prev) => ({ ...prev, floor }))
              }
              icon={MapPin}
            />
          ) : null}
          {matrix.uniqueLocations.rows.length > 0 ? (
            <MatrixRadioFilter
              label="Row"
              value={matrix.locationFilters.row}
              options={matrix.uniqueLocations.rows}
              onChange={(row) =>
                matrix.setLocationFilters((prev) => ({ ...prev, row }))
              }
              icon={MapPin}
            />
          ) : null}

          <div className="flex flex-col gap-2">
            <Label className="text-muted-foreground text-xs leading-none font-medium">
              Reset
            </Label>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="font-custom h-10 gap-2"
              onClick={matrix.handleResetFilters}
            >
              <RotateCcw className="size-4" />
              Reset filters
            </Button>
          </div>
        </CardContent>
      </Card>

      <StorageGatePassMatrix
        displayGroups={matrix.displayGroups}
        visibleSizes={matrix.visibleSizes}
        selectedPassIds={matrix.selectedPassIds}
        onPassToggle={matrix.handlePassToggle}
        allocations={allocations}
        onAllocationChange={matrix.handleAllocationChange}
        onAllocationClear={matrix.handleAllocationClear}
        hasFilteredData={matrix.hasFilteredData}
        hasActiveFilters={matrix.hasActiveFilters}
      />
    </div>
  );
}

function GatePassesSectionMessage({
  title,
  description,
  variant = 'default',
}: {
  title: string;
  description: ReactNode;
  variant?: 'default' | 'destructive';
}) {
  return (
    <Card className="ring-border/60 py-0">
      <CardContent className="px-0 py-0">
        <Empty className="border-0 py-10">
          <EmptyHeader>
            <EmptyTitle
              className={cn(
                'font-custom',
                variant === 'destructive' ? 'text-destructive' : undefined
              )}
            >
              {title}
            </EmptyTitle>
            <EmptyDescription className="font-custom">
              {description}
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      </CardContent>
    </Card>
  );
}

function MatrixRadioFilter({
  label,
  value,
  options,
  onChange,
  icon: Icon,
  triggerClassName,
  ariaLabel,
}: {
  label?: string;
  value: string;
  options: string[];
  onChange: (value: string) => void;
  icon?: LucideIcon;
  triggerClassName?: string;
  ariaLabel?: string;
}) {
  return (
    <div className="flex flex-col gap-2">
      {label ? (
        <Label className="text-muted-foreground text-xs leading-none font-medium">
          {label}
        </Label>
      ) : null}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className={cn(
              'font-custom h-10 min-w-25 justify-between gap-2',
              triggerClassName
            )}
            aria-label={ariaLabel ?? `${label} filter`}
          >
            {Icon ? <Icon className="size-4 shrink-0" /> : null}
            {value || 'All'}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-48">
          <DropdownMenuRadioGroup
            value={value}
            onValueChange={(v) => onChange(v ?? '')}
          >
            <DropdownMenuRadioItem value="">All</DropdownMenuRadioItem>
            {options.map((opt) => (
              <DropdownMenuRadioItem key={opt} value={opt}>
                {opt}
              </DropdownMenuRadioItem>
            ))}
          </DropdownMenuRadioGroup>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
