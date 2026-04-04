import { memo } from 'react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Hash, Edit, Loader2 } from 'lucide-react';
import type { FarmerStorageLink } from '@/types/farmer';

function getInitials(name: string) {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

export interface FarmerProfileHeaderCardProps {
  link: FarmerStorageLink;
  onEditClick: () => void;
  onViewFarmerReport: () => void;
  /** Opens the grading-table accounting report dialog (pass selection + PDF/Excel). */
  onOpenAccountingReport?: () => void;
  /** When true, disables the Farmer Report button and shows a spinner. */
  isViewFarmerReportLoading?: boolean;
}

export const FarmerProfileHeaderCard = memo(function FarmerProfileHeaderCard({
  link,
  onEditClick,
  onViewFarmerReport,
  onOpenAccountingReport,
  isViewFarmerReportLoading = false,
}: FarmerProfileHeaderCardProps) {
  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-4">
          <Avatar className="h-16 w-16 shadow-md sm:h-20 sm:w-20">
            <AvatarFallback className="bg-primary text-primary-foreground font-custom text-xl font-bold sm:text-2xl">
              {getInitials(link.farmerId?.name ?? '')}
            </AvatarFallback>
          </Avatar>
          <div className="space-y-2">
            <h1 className="font-custom text-xl font-bold tracking-tight sm:text-2xl">
              {link.farmerId?.name ?? '—'}
            </h1>
            <Badge variant="secondary" className="font-custom w-fit">
              <Hash className="mr-1 h-3 w-3" />
              {link.accountNumber}
            </Badge>
          </div>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="focus-visible:ring-primary h-10 w-10 rounded-full focus-visible:ring-2 focus-visible:ring-offset-2"
          onClick={onEditClick}
          aria-label="Edit farmer"
        >
          <Edit className="h-4 w-4" />
        </Button>
      </div>

      <div className="flex flex-wrap gap-3">
        <Button
          type="button"
          variant="default"
          disabled={isViewFarmerReportLoading}
          className="font-custom focus-visible:ring-primary inline-flex h-9 cursor-pointer items-center gap-2 rounded-lg px-4 text-sm font-medium focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-70"
          onClick={onViewFarmerReport}
          aria-busy={isViewFarmerReportLoading}
        >
          {isViewFarmerReportLoading ? (
            <>
              <Loader2 className="h-4 w-4 shrink-0 animate-spin" />
              Generating…
            </>
          ) : (
            'Farmer Report'
          )}
        </Button>
        {onOpenAccountingReport != null ? (
          <Button
            type="button"
            variant="secondary"
            disabled={isViewFarmerReportLoading}
            className="font-custom focus-visible:ring-primary inline-flex h-9 cursor-pointer items-center gap-2 rounded-lg px-4 text-sm font-medium focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-70"
            onClick={onOpenAccountingReport}
            aria-label="Accounting report"
          >
            Accounting Report
          </Button>
        ) : null}
      </div>
    </div>
  );
});
