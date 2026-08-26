import { Fragment, useCallback, useState } from 'react';
import { ClipboardList, MapPin } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@/components/ui/empty';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { cn } from '@/lib/utils';
import type { StorageGatePassWithLink } from '@/types/storage-gate-pass';
import {
  StorageGatePassAllocationDrawer,
  type AllocationDrawerTarget,
} from './-StorageGatePassAllocationDrawer';
import {
  allocationKey,
  formatLocationShort,
  getAllocatableSlots,
  getBagSlotsForSize,
  type BagSlotDetail,
  type DatePassGroup,
} from './-storage-gate-pass-matrix-utils';

const FIXED_COLUMN_COUNT = 2;

function sizeLaneIndex(columnIndex: number) {
  return columnIndex - FIXED_COLUMN_COUNT;
}

function sizeLaneClasses(columnIndex: number, variant: 'head' | 'cell') {
  const lane = sizeLaneIndex(columnIndex);
  return cn(
    'border-l-2 border-border px-4',
    variant === 'head'
      ? cn('bg-muted/50 text-center', lane % 2 === 1 && 'bg-muted/65')
      : lane % 2 === 0
        ? 'bg-muted/20'
        : 'bg-muted/35'
  );
}

function stickyCheckboxHeadClass() {
  return 'bg-muted/50 sticky left-0 z-20 w-12 px-2';
}

function stickyVoucherHeadClass() {
  return 'bg-muted/50 sticky left-12 z-20 min-w-[5.5rem] border-r border-border shadow-[4px_0_8px_-4px_rgba(0,0,0,0.08)]';
}

function stickyCheckboxCellClass() {
  return 'bg-background sticky left-0 z-10 even:bg-muted/15';
}

function stickyVoucherCellClass() {
  return 'bg-background sticky left-12 z-10 min-w-[5.5rem] border-r border-border shadow-[4px_0_8px_-4px_rgba(0,0,0,0.08)] even:bg-muted/15';
}

function EmptySeat() {
  return (
    <Button
      type="button"
      variant="outline"
      disabled
      tabIndex={-1}
      className="h-11 min-w-[7.5rem] border-dashed opacity-100"
      aria-hidden
    />
  );
}

function SelectedQuantityBadge({ quantity }: { quantity: number }) {
  return (
    <Badge
      className="border-background pointer-events-none absolute top-0 right-0 z-10 h-5 min-w-7 translate-x-1/2 -translate-y-1/2 px-1.5 tabular-nums shadow-sm"
      aria-hidden
    >
      {quantity.toLocaleString('en-IN')}
    </Badge>
  );
}

function SlotButton({
  pass,
  sizeName,
  slot,
  selectedQty,
  onClick,
}: {
  pass: StorageGatePassWithLink;
  sizeName: string;
  slot: BagSlotDetail;
  selectedQty: number;
  onClick: () => void;
}) {
  const isSelected = selectedQty > 0;
  const available = slot.currentQuantity;

  return (
    <Button
      type="button"
      variant="outline"
      onClick={onClick}
      className={cn(
        'relative h-auto min-h-11 min-w-[7.5rem] flex-col items-stretch justify-start gap-0.5 rounded-md px-2 py-1.5 text-left font-normal',
        isSelected &&
          'border-primary bg-primary/5 ring-primary/30 hover:bg-primary/5 ring-2'
      )}
      aria-label={`${pass.variety}, ${sizeName}, ${formatLocationShort(slot)}, ${isSelected ? `${selectedQty} of ${available} selected` : `${available} available`}`}
    >
      {isSelected ? <SelectedQuantityBadge quantity={selectedQty} /> : null}
      <span className="text-muted-foreground flex items-center gap-0.5 text-xs">
        <MapPin className="size-3 shrink-0" aria-hidden />
        <span className="truncate">{formatLocationShort(slot)}</span>
      </span>
      <span className="text-foreground w-full text-right text-sm font-medium tabular-nums">
        {available.toLocaleString('en-IN')}
      </span>
    </Button>
  );
}

function GatePassSizeCell({
  pass,
  sizeName,
  allocations,
  onSlotClick,
}: {
  pass: StorageGatePassWithLink;
  sizeName: string;
  allocations: Record<string, number>;
  onSlotClick: (
    pass: StorageGatePassWithLink,
    sizeName: string,
    slot: BagSlotDetail
  ) => void;
}) {
  const slots = getBagSlotsForSize(pass, sizeName);

  if (slots.length === 0) {
    return <EmptySeat />;
  }

  return (
    <div className="flex min-w-[7.5rem] flex-col gap-2 overflow-visible pt-1">
      {slots.map((slot) => {
        const key = allocationKey(pass._id, sizeName, slot.bagIndex);
        const selectedQty = allocations[key] ?? 0;
        return (
          <SlotButton
            key={key}
            pass={pass}
            sizeName={sizeName}
            slot={slot}
            selectedQty={selectedQty}
            onClick={() => onSlotClick(pass, sizeName, slot)}
          />
        );
      })}
    </div>
  );
}

type StorageGatePassMatrixProps = {
  displayGroups: DatePassGroup[];
  visibleSizes: string[];
  selectedPassIds: Set<string>;
  onPassToggle: (passId: string) => void;
  allocations: Record<string, number>;
  onAllocationChange: (key: string, quantity: number) => void;
  onAllocationClear: (key: string) => void;
  hasFilteredData?: boolean;
  hasActiveFilters?: boolean;
};

export function StorageGatePassMatrix({
  displayGroups,
  visibleSizes,
  selectedPassIds,
  onPassToggle,
  allocations,
  onAllocationChange,
  onAllocationClear,
  hasFilteredData = true,
  hasActiveFilters = false,
}: StorageGatePassMatrixProps) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerTarget, setDrawerTarget] =
    useState<AllocationDrawerTarget | null>(null);

  const columnCount = FIXED_COLUMN_COUNT + visibleSizes.length;

  const handleSlotClick = useCallback(
    (pass: StorageGatePassWithLink, sizeName: string, slot: BagSlotDetail) => {
      const key = allocationKey(pass._id, sizeName, slot.bagIndex);
      setDrawerTarget({
        pass,
        sizeName,
        slot,
        allocationKey: key,
        currentQuantity: slot.currentQuantity,
      });
      setDrawerOpen(true);
    },
    []
  );

  const drawerInitialQty = drawerTarget
    ? (allocations[drawerTarget.allocationKey] ?? 0)
    : 0;

  if (!hasFilteredData) {
    return (
      <Card className="ring-border/60 overflow-hidden py-0 shadow-sm">
        <CardContent className="px-0 py-0">
          <Empty className="border-0 py-12">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <ClipboardList />
              </EmptyMedia>
              <EmptyTitle className="font-custom">
                {hasActiveFilters
                  ? 'No matching gate passes'
                  : 'No gate passes to show'}
              </EmptyTitle>
              <EmptyDescription className="font-custom">
                {hasActiveFilters
                  ? 'Try different filters or clear the search.'
                  : 'Check back when stock is available.'}
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card className="ring-border/60 overflow-hidden py-0 shadow-sm">
        <CardContent className="overflow-x-auto px-0 py-0">
          <Table className="min-w-max">
            <TableHeader className="bg-muted/50 sticky top-0 z-10 [&_tr]:border-b [&_tr]:hover:bg-transparent">
              <TableRow>
                <TableHead
                  className={cn(
                    'text-muted-foreground h-10 px-3',
                    stickyCheckboxHeadClass()
                  )}
                >
                  <span className="sr-only">Select voucher</span>
                </TableHead>
                <TableHead
                  className={cn(
                    'text-muted-foreground h-10 px-3',
                    stickyVoucherHeadClass()
                  )}
                >
                  <span className="text-muted-foreground text-xs font-medium">
                    R. Voucher
                  </span>
                </TableHead>
                {visibleSizes.map((sizeName, index) => (
                  <TableHead
                    key={sizeName}
                    className={cn(
                      'text-muted-foreground h-10 px-3',
                      sizeLaneClasses(FIXED_COLUMN_COUNT + index, 'head')
                    )}
                  >
                    <span className="text-foreground block w-full text-center text-sm font-semibold whitespace-nowrap">
                      {sizeName}
                    </span>
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {displayGroups.map((group) => (
                <Fragment key={group.dateKey}>
                  <TableRow className="hover:bg-transparent">
                    <TableCell
                      colSpan={Math.max(columnCount, 1)}
                      className="bg-muted/30 px-3 py-2"
                    >
                      <span className="text-primary font-custom text-sm font-semibold">
                        {group.dateLabel}
                      </span>
                    </TableCell>
                  </TableRow>
                  {group.passes.map((pass) => (
                    <TableRow
                      key={pass._id}
                      className="even:bg-muted/15"
                      data-selected={selectedPassIds.has(pass._id) || undefined}
                    >
                      <TableCell
                        className={cn(
                          'overflow-visible px-3 py-2.5 align-top',
                          stickyCheckboxCellClass()
                        )}
                      >
                        <Checkbox
                          checked={selectedPassIds.has(pass._id)}
                          onCheckedChange={() => onPassToggle(pass._id)}
                          disabled={getAllocatableSlots(pass).length === 0}
                          aria-label={
                            selectedPassIds.has(pass._id)
                              ? `Clear all quantities for gate pass ${pass.gatePassNo}`
                              : `Select all quantities for gate pass ${pass.gatePassNo}`
                          }
                        />
                      </TableCell>
                      <TableCell
                        className={cn(
                          'overflow-visible px-3 py-2.5 align-top',
                          stickyVoucherCellClass()
                        )}
                      >
                        <div className="flex flex-col gap-0.5">
                          <span className="text-foreground font-mono text-sm font-medium tabular-nums">
                            #{pass.gatePassNo}
                          </span>
                          {pass.variety?.trim() ? (
                            <span className="text-muted-foreground font-custom text-[11px] leading-tight font-medium">
                              {pass.variety.trim()}
                            </span>
                          ) : null}
                        </div>
                      </TableCell>
                      {visibleSizes.map((sizeName, index) => (
                        <TableCell
                          key={sizeName}
                          className={cn(
                            'overflow-visible py-2.5 align-top',
                            sizeLaneClasses(FIXED_COLUMN_COUNT + index, 'cell')
                          )}
                        >
                          <GatePassSizeCell
                            pass={pass}
                            sizeName={sizeName}
                            allocations={allocations}
                            onSlotClick={handleSlotClick}
                          />
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}
                </Fragment>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <StorageGatePassAllocationDrawer
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        target={drawerTarget}
        initialQuantity={drawerInitialQty}
        onApply={onAllocationChange}
        onClear={onAllocationClear}
      />
    </>
  );
}
