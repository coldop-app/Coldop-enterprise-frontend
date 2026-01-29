import { memo } from 'react';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Item, ItemContent, ItemTitle } from '@/components/ui/item';

export interface GradingGatePassCellProps {
  /** Variety label (e.g. pass.variety) */
  variety: string;
  currentQuantity: number;
  initialQuantity: number;
  /** Quantity user has entered to remove; shown in badge when > 0 */
  removedQuantity: number;
  onClick: () => void;
  onQuickRemove: (e: React.MouseEvent) => void;
  disabled?: boolean;
}

export const GradingGatePassCell = memo(function GradingGatePassCell({
  variety,
  currentQuantity,
  initialQuantity,
  removedQuantity,
  onClick,
  onQuickRemove,
  disabled,
}: GradingGatePassCellProps) {
  const quantity = removedQuantity;
  const hasQuantity = quantity !== undefined && quantity > 0;
  const isActive = hasQuantity;

  return (
    <Item
      variant="outline"
      size="xs"
      role="button"
      tabIndex={disabled ? -1 : 0}
      onClick={disabled ? undefined : onClick}
      onKeyDown={(e) => {
        if (disabled) return;
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick();
        }
      }}
      className={cn(
        'focus-visible:ring-primary hover:bg-muted/50 hover:border-muted-foreground/20 relative cursor-pointer transition-all duration-200 outline-none hover:shadow-sm focus-visible:ring-2 focus-visible:ring-offset-2',
        isActive
          ? 'bg-primary/5 border-primary/30 shadow-sm'
          : 'bg-card/50 border-border/60'
      )}
    >
      {hasQuantity && (
        <div className="group/badge ring-background font-custom absolute -top-1 -right-1 z-10 flex h-5 w-5 items-center justify-center rounded-full bg-green-600 text-[9px] font-semibold text-white shadow ring-2">
          <span className="group-hover/badge:hidden">
            {typeof quantity === 'number' ? quantity.toFixed(1) : quantity}
          </span>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onQuickRemove(e);
            }}
            className="hidden h-full w-full items-center justify-center rounded-full transition-colors group-hover/badge:flex hover:bg-green-700"
            aria-label="Remove quantity"
          >
            <X className="h-2.5 w-2.5" />
          </button>
        </div>
      )}

      <ItemContent className="gap-0.5">
        <ItemTitle className="font-custom text-foreground/90 truncate text-[11px] leading-tight font-medium">
          {variety}
        </ItemTitle>
        <div className="text-right">
          <p className="font-custom text-foreground text-sm leading-none font-semibold">
            {currentQuantity.toFixed(1)}
          </p>
          <p className="font-custom text-muted-foreground/70 text-[10px]">
            /{initialQuantity.toFixed(1)}
          </p>
        </div>
      </ItemContent>
    </Item>
  );
});
