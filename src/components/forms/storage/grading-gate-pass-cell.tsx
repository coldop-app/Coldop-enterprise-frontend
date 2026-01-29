import { memo } from 'react';
import { MapPin, X } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface GradingGatePassCellProps {
  /** Variety label (e.g. pass.variety) */
  variety: string;
  /** Location/size label shown next to MapPin */
  location: string;
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
  location,
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
    <div
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
        'group focus-visible:ring-primary relative cursor-pointer rounded-lg border p-3 transition-all duration-200 outline-none focus-visible:ring-2 focus-visible:ring-offset-2',
        'hover:bg-muted/50 hover:border-muted-foreground/20 hover:shadow-sm',
        isActive
          ? 'bg-primary/5 border-primary/30 shadow-sm'
          : 'bg-card/50 border-border/60'
      )}
    >
      {hasQuantity && (
        <div className="group/badge ring-background font-custom absolute -top-1.5 -right-1.5 z-10 flex h-7 w-7 items-center justify-center rounded-full bg-green-600 text-[10px] font-semibold text-white shadow-lg ring-2">
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
            <X className="h-3 w-3" />
          </button>
        </div>
      )}

      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="font-custom text-foreground/90 mb-1.5 truncate text-sm font-medium">
            {variety}
          </p>
          <div className="flex items-center gap-1.5">
            <MapPin
              className="text-muted-foreground/70 h-3 w-3 shrink-0"
              aria-hidden
            />
            <p className="font-custom text-muted-foreground/80 truncate text-xs">
              {location}
            </p>
          </div>
        </div>

        <div className="shrink-0 text-right">
          <p className="font-custom text-foreground text-lg leading-none font-semibold">
            {currentQuantity.toFixed(1)}
          </p>
          <p className="font-custom text-muted-foreground/70 mt-0.5 text-xs">
            /{initialQuantity.toFixed(1)}
          </p>
        </div>
      </div>
    </div>
  );
});
