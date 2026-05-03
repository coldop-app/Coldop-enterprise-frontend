import { memo } from 'react';
import { Link } from '@tanstack/react-router';
import {
  ArrowUpFromLine,
  BookOpen,
  Clock,
  Edit,
  FileText,
  Hash,
  Layers,
  MapPin,
  Sprout,
  type LucideIcon,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

export interface FarmerProfileAggregates {
  totalBagsSeed: number;
  totalBagsIncoming: number;
  totalBagsUngraded: number;
  totalBagsGraded: number;
  totalBagsStored: number;
  totalBagsNikasi: number;
  totalBagsOutgoing: number;
}

const METRICS: Array<{
  key: keyof FarmerProfileAggregates;
  label: string;
  Icon: LucideIcon;
  color: 'info' | 'warning' | 'default' | 'success';
}> = [
  {
    key: 'totalBagsSeed',
    label: 'Seed',
    Icon: Sprout,
    color: 'success',
  },
  {
    key: 'totalBagsIncoming',
    label: 'Incoming',
    Icon: ArrowUpFromLine,
    color: 'info',
  },
  {
    key: 'totalBagsUngraded',
    label: 'Ungraded',
    Icon: Clock,
    color: 'warning',
  },
  { key: 'totalBagsGraded', label: 'Grading', Icon: Layers, color: 'default' },
];

const iconWrapperClass: Record<string, string> = {
  info: 'bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400',
  warning: 'bg-amber-50 dark:bg-amber-950 text-amber-600 dark:text-amber-400',
  success: 'bg-green-50 dark:bg-green-950 text-green-600 dark:text-green-400',
  default: 'bg-muted text-muted-foreground',
};

const getInitials = (name: string) =>
  name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('');

const reportLinkClassName =
  'font-custom focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 rounded-md';

const PLACEHOLDER_NAME = 'Ramesh Kumar';
const PLACEHOLDER_ACCOUNT = 'AC-10284';
const PLACEHOLDER_ADDRESS = '42, Sample Village Road, Punjab';

export interface FarmerProfileOverviewProps {
  name?: string;
  accountNumber?: string;
  address?: string;
  /** When set, Farmer report / Accounting report navigate to the corresponding routes. */
  farmerStorageLinkId?: string;
  onEdit?: () => void;
  editAriaLabel?: string;
  aggregates: FarmerProfileAggregates;
}

export const FarmerProfileOverview = memo(function FarmerProfileOverview({
  name: nameProp,
  accountNumber: accountNumberProp,
  address: addressProp,
  farmerStorageLinkId,
  onEdit,
  editAriaLabel = 'Edit farmer',
  aggregates,
}: FarmerProfileOverviewProps) {
  const name = nameProp ?? PLACEHOLDER_NAME;
  const accountNumber = accountNumberProp ?? PLACEHOLDER_ACCOUNT;
  const address = addressProp ?? PLACEHOLDER_ADDRESS;

  return (
    <div className="space-y-6">
      <TooltipProvider delayDuration={300}>
        <div className="space-y-5">
          <div className="flex items-start justify-between gap-3">
            <div className="flex min-w-0 items-center gap-3.5">
              <Avatar className="ring-border h-14 w-14 shrink-0 ring-1">
                <AvatarFallback className="bg-primary/10 text-primary text-lg font-medium">
                  {getInitials(name)}
                </AvatarFallback>
              </Avatar>

              <div className="min-w-0 space-y-1.5">
                <h1 className="font-custom text-foreground truncate text-base font-medium tracking-tight">
                  {name}
                </h1>
                <Badge
                  variant="secondary"
                  className="font-custom text-muted-foreground gap-1 text-xs font-normal"
                >
                  <Hash className="h-3 w-3 opacity-60" />
                  {accountNumber}
                </Badge>
                <p className="font-custom text-muted-foreground flex items-start gap-1.5 text-sm leading-snug">
                  <MapPin
                    className="mt-0.5 h-3.5 w-3.5 shrink-0 opacity-60"
                    aria-hidden
                  />
                  <span className="min-w-0 wrap-break-word">{address}</span>
                </p>
              </div>
            </div>

            <div className="flex shrink-0 items-center gap-0.5">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="text-muted-foreground hover:text-foreground h-8 w-8 rounded-full"
                    onClick={onEdit}
                    aria-label={editAriaLabel}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom">Edit</TooltipContent>
              </Tooltip>
            </div>
          </div>

          <Separator />

          <div className="flex flex-wrap gap-2">
            {farmerStorageLinkId ? (
              <Button type="button" size="sm" className="gap-1.5" asChild>
                <Link
                  to="/store-admin/people/$farmerStorageLinkId/farmer-report"
                  params={{ farmerStorageLinkId }}
                  preload="intent"
                  className={reportLinkClassName}
                >
                  <FileText className="h-3.5 w-3.5" />
                  Farmer report
                </Link>
              </Button>
            ) : (
              <Button type="button" size="sm" className="gap-1.5" disabled>
                <FileText className="h-3.5 w-3.5" />
                Farmer report
              </Button>
            )}

            {farmerStorageLinkId ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="gap-1.5"
                asChild
              >
                <Link
                  to="/store-admin/people/$farmerStorageLinkId/accounting-report"
                  params={{ farmerStorageLinkId }}
                  preload="intent"
                  className={reportLinkClassName}
                >
                  <BookOpen className="h-3.5 w-3.5" />
                  Accounting report
                </Link>
              </Button>
            ) : (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="gap-1.5"
                disabled
              >
                <BookOpen className="h-3.5 w-3.5" />
                Accounting report
              </Button>
            )}
          </div>
        </div>
      </TooltipProvider>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {METRICS.map(({ key, label, Icon, color }) => (
          <div
            key={key}
            className="border-border/50 bg-card space-y-2.5 rounded-xl border p-4"
          >
            <div className="flex items-center gap-2">
              <div
                className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${iconWrapperClass[color]}`}
              >
                <Icon className="h-3.5 w-3.5" />
              </div>
              <span className="text-muted-foreground text-[11px] font-medium tracking-wider uppercase">
                {label}
              </span>
            </div>

            <div>
              <p className="text-foreground text-[22px] leading-none font-medium tabular-nums">
                {aggregates[key].toLocaleString('en-IN')}
              </p>
              <p className="text-muted-foreground/60 mt-1 text-[11px]">bags</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
});
