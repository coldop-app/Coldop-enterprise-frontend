import { useRef, useState } from 'react';
import { MapPin, Package, XIcon } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from '@/components/ui/drawer';
import {
  Field,
  FieldDescription,
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
import type { StorageGatePassWithLink } from '@/types/storage-gate-pass';
import { type BagSlotDetail } from './-storage-gate-pass-matrix-utils';

export type AllocationDrawerTarget = {
  pass: StorageGatePassWithLink;
  sizeName: string;
  slot: BagSlotDetail;
  allocationKey: string;
  currentQuantity: number;
};

type StorageGatePassAllocationDrawerProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  target: AllocationDrawerTarget | null;
  initialQuantity: number;
  onApply: (key: string, quantity: number) => void;
  onClear: (key: string) => void;
};

function formatLocationDetail(slot: BagSlotDetail) {
  return `Ch: ${slot.chamber} · F: ${slot.floor} · R: ${slot.row}`;
}

function AllocationDrawerContent({
  target,
  initialQuantity,
  onApply,
  onClear,
  onOpenChange,
}: Omit<StorageGatePassAllocationDrawerProps, 'open'>) {
  const maxQty = target?.currentQuantity ?? 0;
  const [quantity, setQuantity] = useState(initialQuantity);
  const quantityInputRef = useRef<HTMLInputElement>(null);

  const focusQuantityInput = () => {
    const input = quantityInputRef.current;
    if (!input) return;
    input.focus();
    input.select();
  };

  const handleApply = () => {
    if (!target) return;
    const clamped = Math.min(Math.max(0, quantity), maxQty);
    if (clamped <= 0) onClear(target.allocationKey);
    else onApply(target.allocationKey, clamped);
    onOpenChange(false);
  };

  const handleClear = () => {
    if (!target) return;
    onClear(target.allocationKey);
    onOpenChange(false);
  };

  return (
    <DrawerContent
      className="mx-auto w-[calc(100%-1.5rem)] max-w-md [&>div:first-child]:hidden"
      onOpenAutoFocus={(event) => {
        event.preventDefault();
        requestAnimationFrame(focusQuantityInput);
      }}
    >
      <DrawerHeader className="border-border flex-row items-start justify-between gap-3 border-b group-data-[vaul-drawer-direction=bottom]/drawer-content:text-left">
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <DrawerTitle className="font-custom text-lg font-bold">
            Allocate bags
          </DrawerTitle>
          <DrawerDescription className="font-custom">
            Set how many bags to allocate from this slot.
          </DrawerDescription>
        </div>
        <DrawerClose asChild>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            aria-label="Close"
          >
            <XIcon />
          </Button>
        </DrawerClose>
      </DrawerHeader>

      {target ? (
        <div className="flex flex-col gap-5 px-4 pb-2">
          <Card className="gap-3 py-0 shadow-none">
            <CardHeader className="px-4 pt-4">
              <CardTitle className="font-custom flex items-center gap-2 text-sm font-medium">
                <Package className="text-primary size-4 shrink-0" aria-hidden />
                Gate pass #{target.pass.gatePassNo}
              </CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-1.5 px-4 pb-4">
              <p className="font-custom text-base font-semibold">
                {target.pass.variety}
              </p>
              <p className="font-custom text-sm">
                Size: <span className="font-semibold">{target.sizeName}</span>
              </p>
              <p className="text-muted-foreground font-custom flex items-center gap-1.5 text-sm">
                <MapPin className="size-3.5 shrink-0" aria-hidden />
                {formatLocationDetail(target.slot)}
              </p>
              <p className="font-custom text-sm">
                Available:{' '}
                <span className="font-semibold">
                  {maxQty.toLocaleString('en-IN')} bags
                </span>
              </p>
            </CardContent>
          </Card>

          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="allocation-qty" className="font-custom">
                Quantity to allocate
              </FieldLabel>
              <Input
                ref={quantityInputRef}
                id="allocation-qty"
                type="number"
                min={0}
                max={maxQty}
                value={quantity || ''}
                onChange={(e) => {
                  const raw = e.target.value;
                  if (!raw) {
                    setQuantity(0);
                    return;
                  }
                  const parsed = Number.parseInt(raw, 10);
                  if (Number.isNaN(parsed)) return;
                  setQuantity(Math.min(Math.max(0, parsed), maxQty));
                }}
                onWheel={blurTargetOnNumberWheel}
                onKeyDown={preventArrowUpDownOnNumericInput}
                inputMode="numeric"
                className={cn(
                  'font-custom h-11 text-base tabular-nums',
                  businessNumberSpinnerClassName
                )}
              />
              <FieldDescription className="font-custom">
                Enter a value from 1 to {maxQty.toLocaleString('en-IN')}.
              </FieldDescription>
            </Field>
          </FieldGroup>
        </div>
      ) : null}

      <DrawerFooter className="border-border flex-row gap-2.5 border-t">
        <DrawerClose asChild>
          <Button type="button" variant="outline" className="font-custom">
            Cancel
          </Button>
        </DrawerClose>
        <Button
          type="button"
          variant="outline"
          className="font-custom text-destructive hover:bg-destructive/10 hover:text-destructive"
          onClick={handleClear}
          disabled={!target || initialQuantity <= 0}
        >
          Clear
        </Button>
        <Button
          type="button"
          className="font-custom flex-1 font-bold"
          onClick={handleApply}
          disabled={!target}
        >
          Apply
        </Button>
      </DrawerFooter>
    </DrawerContent>
  );
}

export function StorageGatePassAllocationDrawer({
  open,
  onOpenChange,
  target,
  initialQuantity,
  onApply,
  onClear,
}: StorageGatePassAllocationDrawerProps) {
  return (
    <Drawer
      open={open}
      onOpenChange={onOpenChange}
      direction="bottom"
      repositionInputs={false}
      shouldScaleBackground={false}
    >
      <AllocationDrawerContent
        key={`${target?.allocationKey ?? 'none'}-${open ? 'open' : 'closed'}`}
        target={target}
        initialQuantity={initialQuantity}
        onApply={onApply}
        onClear={onClear}
        onOpenChange={onOpenChange}
      />
    </Drawer>
  );
}
