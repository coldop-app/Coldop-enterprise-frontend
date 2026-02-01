import { memo, type ReactNode } from 'react';
import { ChevronDown, Printer } from 'lucide-react';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { formatDisplayDate } from '@/lib/helpers';

export interface VoucherCardProps {
  prefix: string;
  gatePassNo?: number;
  date?: string;
  badges?: ReactNode;
  raw?: unknown;
  children: ReactNode;
}

const VoucherCard = memo(function VoucherCard({
  prefix,
  gatePassNo,
  date,
  badges,
  raw,
  children,
}: VoucherCardProps) {
  return (
    <div className="font-custom border-border/60 bg-muted/30 rounded-xl border p-3 transition-colors duration-200 ease-in-out sm:p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-primary font-semibold">
            <span className="bg-primary mr-1 inline-block h-2 w-2 rounded-full" />
            {prefix} #{gatePassNo ?? '—'}
          </span>
          <span className="text-muted-foreground text-sm">
            {formatDisplayDate(date)}
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {badges}
          <button
            type="button"
            aria-label="Print voucher"
            className="text-muted-foreground hover:text-foreground focus-visible:ring-primary rounded-md p-1.5 transition-colors duration-200 focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
          >
            <Printer className="h-4 w-4" />
          </button>
        </div>
      </div>
      <div className="mt-4">{children}</div>
      {raw != null && (
        <Collapsible className="group/collapse mt-3">
          <CollapsibleTrigger className="text-muted-foreground hover:text-foreground focus-visible:ring-primary mt-3 flex items-center gap-1 rounded text-sm font-medium transition-colors duration-200 focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none">
            More
            <ChevronDown className="h-4 w-4 shrink-0 transition-transform duration-200 group-data-[state=open]/collapse:rotate-180" />
          </CollapsibleTrigger>
          <CollapsibleContent>
            <pre className="bg-muted/50 mt-2 max-h-40 overflow-auto rounded-md p-3 text-xs leading-relaxed">
              {JSON.stringify(raw, null, 2)}
            </pre>
          </CollapsibleContent>
        </Collapsible>
      )}
    </div>
  );
});

export { VoucherCard };
