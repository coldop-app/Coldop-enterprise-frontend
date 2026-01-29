import { memo } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

export interface QuantityRemoveDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  quantityInput: string;
  quantityError: string;
  maxQuantity: number;
  /** Whether the current cell already has a quantity (show Remove button) */
  hasExistingQuantity: boolean;
  onQuantityInputChange: (value: string) => void;
  onQuantitySubmit: () => void;
  onQuantityRemove: () => void;
  onClose: () => void;
}

export const QuantityRemoveDialog = memo(function QuantityRemoveDialog({
  open,
  onOpenChange,
  quantityInput,
  quantityError,
  maxQuantity,
  hasExistingQuantity,
  onQuantityInputChange,
  onQuantitySubmit,
  onQuantityRemove,
  onClose,
}: QuantityRemoveDialogProps) {
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (!quantityError) onQuantitySubmit();
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="font-custom sm:max-w-md" showCloseButton>
        <DialogHeader>
          <DialogTitle className="font-custom text-xl font-bold">
            Enter quantity to remove
          </DialogTitle>
          <DialogDescription className="font-custom text-muted-foreground/80 text-sm">
            Specify the amount you wish to remove from this item.
          </DialogDescription>
        </DialogHeader>

        <div className="py-2">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label
                htmlFor="quantity-input"
                className="font-custom text-foreground/90 text-sm font-medium"
              >
                Quantity
              </label>
              {maxQuantity > 0 && (
                <span className="font-custom text-muted-foreground/70 text-xs">
                  Max: {maxQuantity.toFixed(1)}
                </span>
              )}
            </div>

            <Input
              id="quantity-input"
              type="number"
              placeholder="0.0"
              value={quantityInput}
              onChange={(e) => onQuantityInputChange(e.target.value)}
              onKeyDown={handleKeyDown}
              autoFocus
              min={0}
              max={maxQuantity}
              step={0.1}
              className={cn(
                'font-custom [appearance:textfield] text-base [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none',
                quantityError &&
                  'border-destructive focus-visible:ring-destructive/20'
              )}
              aria-invalid={!!quantityError}
            />

            {quantityError && (
              <p className="font-custom text-destructive mt-1 text-xs">
                {quantityError}
              </p>
            )}
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          {hasExistingQuantity && (
            <Button
              type="button"
              variant="destructive"
              onClick={onQuantityRemove}
              className="font-custom sm:min-w-[80px]"
            >
              Remove
            </Button>
          )}

          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            className="font-custom sm:min-w-[80px]"
          >
            Cancel
          </Button>

          <Button
            type="button"
            onClick={onQuantitySubmit}
            className="font-custom sm:min-w-[80px]"
            disabled={
              !!quantityError ||
              !quantityInput ||
              parseFloat(quantityInput) <= 0
            }
          >
            Confirm
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
});
