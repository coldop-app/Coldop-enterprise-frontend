import { FileText, RefreshCw, SlidersHorizontal } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Item } from '@/components/ui/item';

const AccountingReportTopBar = () => {
  return (
    <Item
      variant="outline"
      size="sm"
      className="border-border/30 bg-background pointer-events-none rounded-2xl border p-3 shadow-sm select-none"
    >
      <div className="flex w-full flex-wrap items-center justify-between gap-2 lg:flex-nowrap">
        <div>
          <p className="font-custom text-muted-foreground text-xs font-medium tracking-widest uppercase">
            Report Actions
          </p>
          <p className="font-custom text-sm font-semibold text-[#333]">
            Accounting Statement Tools
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          className="font-custom border-primary text-primary hover:bg-primary/5 h-8 rounded-lg px-4 text-sm leading-none"
          disabled
          tabIndex={-1}
        >
          <SlidersHorizontal className="h-3.5 w-3.5" />
          View Filters
        </Button>
        <Button
          type="button"
          variant="default"
          className="font-custom h-8 rounded-lg px-4 text-sm leading-none"
          disabled
          tabIndex={-1}
        >
          <FileText className="h-3.5 w-3.5" />
          Pdf
        </Button>
        <Button
          type="button"
          variant="ghost"
          className="font-custom text-muted-foreground h-8 rounded-lg px-2 leading-none"
          disabled
          tabIndex={-1}
          aria-label="Refresh"
        >
          <RefreshCw className="h-3.5 w-3.5" />
        </Button>
      </div>
    </Item>
  );
};

export default AccountingReportTopBar;
