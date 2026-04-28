import { memo, useState } from 'react';
import { useNavigate } from '@tanstack/react-router';
import {
  ArrowUpRight,
  BarChart3,
  Boxes,
  Building2,
  ChevronDown,
  ChevronUp,
  ClipboardList,
  FileText,
  Package,
  RefreshCw,
  Sprout,
  Truck,
  Warehouse,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@/components/ui/empty';
import { useGetOverview } from '@/services/store-admin/general/useGetOverview';
interface GradingBags {
  initialQuantity: number;
  currentQuantity: number;
}

interface OverviewMetrics {
  totalSeedBagsGiven: number;
  totalIncomingBags: number;
  totalIncomingWeight: number;
  totalUngradedBags: number;
  totalUngradedWeight: number;
  totalGradingBags: GradingBags;
  totalGradingWeight: number;
  totalBagsStored: number;
  totalBagsStoredInitial?: number;
  totalBagsDispatched: number;
  totalOutgoingBags: number;
}

function formatNumber(value: number): string {
  return new Intl.NumberFormat('en-IN').format(value);
}

function formatWeight(kg: number): string {
  return `${formatNumber(Math.round(kg * 10) / 10)} kg`;
}

function toNumber(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : 0;
}

function toGradingBags(value: unknown): GradingBags {
  if (value == null || typeof value !== 'object' || Array.isArray(value)) {
    return { initialQuantity: 0, currentQuantity: 0 };
  }

  const raw = value as Record<string, unknown>;

  return {
    initialQuantity: toNumber(raw.initialQuantity),
    currentQuantity: toNumber(raw.currentQuantity),
  };
}

function normalizeOverviewData(data: unknown): OverviewMetrics | null {
  if (data == null || typeof data !== 'object' || Array.isArray(data)) {
    return null;
  }

  const raw = data as Record<string, unknown>;

  return {
    totalSeedBagsGiven: toNumber(raw.totalSeedBagsGiven),
    totalIncomingBags: toNumber(raw.totalIncomingBags),
    totalIncomingWeight: toNumber(raw.totalIncomingWeight),
    totalUngradedBags: toNumber(raw.totalUngradedBags),
    totalUngradedWeight: toNumber(raw.totalUngradedWeight),
    totalGradingBags: toGradingBags(raw.totalGradingBags),
    totalGradingWeight: toNumber(raw.totalGradingWeight),
    totalBagsStored: toNumber(raw.totalBagsStored),
    totalBagsStoredInitial:
      raw.totalBagsStoredInitial == null
        ? undefined
        : toNumber(raw.totalBagsStoredInitial),
    totalBagsDispatched: toNumber(raw.totalBagsDispatched),
    totalOutgoingBags: toNumber(raw.totalOutgoingBags),
  };
}

function computeShedStockBags(data: OverviewMetrics): number {
  const gradingInitial = data.totalGradingBags.initialQuantity;
  const storedInitial = data.totalBagsStoredInitial ?? data.totalBagsStored;
  return gradingInitial - storedInitial - data.totalBagsDispatched;
}

interface StatCardProps {
  title: string;
  value: string;
  description?: string;
  icon: React.ReactNode;
  onGetReportClick?: () => void;
}

const StatCard = memo(function StatCard({
  title,
  value,
  description,
  icon,
  onGetReportClick,
}: StatCardProps) {
  return (
    <Card className="group font-custom border-border/40 bg-card relative overflow-hidden rounded-2xl border shadow-sm transition-all duration-200 hover:-translate-y-1 hover:shadow-md">
      <div className="bg-primary absolute inset-x-0 top-0 h-[3px] rounded-t-2xl opacity-0 transition-opacity duration-200 group-hover:opacity-100" />
      <CardHeader className="flex flex-row items-center justify-between gap-4 space-y-0 pb-2">
        <CardTitle className="text-foreground text-[15px] leading-snug font-semibold sm:text-base">
          {title}
        </CardTitle>
        <span className="bg-primary/10 text-primary flex h-10 w-10 shrink-0 items-center justify-center rounded-full">
          {icon}
        </span>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="font-custom text-foreground text-2xl font-bold tracking-tight sm:text-3xl">
          {value}
        </p>
        {description != null && description !== '' && (
          <CardDescription className="font-custom text-muted-foreground text-sm">
            {description}
          </CardDescription>
        )}
        <Button
          variant="outline"
          size="sm"
          onClick={onGetReportClick}
          className="font-custom border-border/60 bg-background hover:bg-muted mt-2 cursor-pointer gap-1.5 rounded-lg"
        >
          <FileText className="h-4 w-4" />
          Get Reports
        </Button>
        <div className="bg-muted group-hover:bg-primary/10 absolute right-4 bottom-4 flex h-6 w-6 items-center justify-center rounded-full transition-all duration-150 group-hover:translate-x-0.5 group-hover:-translate-y-0.5">
          <ArrowUpRight className="text-primary h-3 w-3" />
        </div>
      </CardContent>
    </Card>
  );
});

interface GradingCardProps {
  initialQuantity: number;
  currentQuantity: number;
  weightKg: number;
}

const GradingCard = memo(function GradingCard({
  initialQuantity,
  currentQuantity,
  weightKg,
}: GradingCardProps) {
  const [open, setOpen] = useState(false);

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <Card className="group font-custom border-border/40 bg-card relative overflow-hidden rounded-2xl border shadow-sm transition-all duration-200 hover:-translate-y-1 hover:shadow-md">
        <div className="bg-primary absolute inset-x-0 top-0 h-[3px] rounded-t-2xl opacity-0 transition-opacity duration-200 group-hover:opacity-100" />
        <CardHeader className="flex flex-row items-center justify-between gap-4 space-y-0 pb-2">
          <CardTitle className="text-foreground text-[15px] leading-snug font-semibold sm:text-base">
            Grading (Initial)
          </CardTitle>
          <span className="bg-primary/10 text-primary flex h-10 w-10 shrink-0 items-center justify-center rounded-full">
            <ClipboardList className="h-5 w-5" />
          </span>
        </CardHeader>
        <CardContent className="space-y-2">
          <p className="font-custom text-foreground text-2xl font-bold tracking-tight sm:text-3xl">
            {formatNumber(initialQuantity)}
          </p>
          <CardDescription className="font-custom text-muted-foreground text-sm">
            {formatWeight(weightKg)}
          </CardDescription>
          <Button
            variant="outline"
            size="sm"
            className="font-custom border-border/60 bg-background hover:bg-muted mt-2 cursor-pointer gap-1.5 rounded-lg"
          >
            <FileText className="h-4 w-4" />
            Get Reports
          </Button>
          <CollapsibleTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="font-custom text-muted-foreground hover:text-primary mt-2 h-auto gap-1.5 px-0"
            >
              {open ? (
                <>
                  <ChevronUp className="h-4 w-4" />
                  Hide current
                </>
              ) : (
                <>
                  <ChevronDown className="h-4 w-4" />
                  Show current
                </>
              )}
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <div className="font-custom border-border/50 border-t pt-3 text-sm">
              <span className="text-muted-foreground">Current quantity: </span>
              <span className="text-foreground font-semibold">
                {formatNumber(currentQuantity)}
              </span>
            </div>
          </CollapsibleContent>
          <div className="bg-muted group-hover:bg-primary/10 absolute right-4 bottom-4 flex h-6 w-6 items-center justify-center rounded-full transition-all duration-150 group-hover:translate-x-0.5 group-hover:-translate-y-0.5">
            <ArrowUpRight className="text-primary h-3 w-3" />
          </div>
        </CardContent>
      </Card>
    </Collapsible>
  );
});

function OverviewSkeleton() {
  return (
    <div className="grid gap-4 sm:gap-6 md:grid-cols-2 lg:grid-cols-3 xl:gap-8">
      {Array.from({ length: 8 }).map((_, i) => (
        <Card key={i} className="font-custom">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <Skeleton className="h-5 w-32" />
            <Skeleton className="h-10 w-10 rounded-lg" />
          </CardHeader>
          <CardContent className="space-y-2">
            <Skeleton className="h-8 w-24 sm:h-9" />
            <Skeleton className="h-4 w-36" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

const Overview = memo(function Overview() {
  const navigate = useNavigate();
  const { data, isLoading, isError, error, refetch } = useGetOverview();
  const normalized = normalizeOverviewData(data);

  if (isLoading) {
    return <OverviewSkeleton />;
  }

  if (isError) {
    return (
      <Card className="font-custom border-destructive/30 bg-destructive/5">
        <CardHeader>
          <CardTitle className="text-destructive">
            Failed to load overview
          </CardTitle>
          <CardDescription>
            {error instanceof Error ? error.message : 'Something went wrong.'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button
            variant="default"
            onClick={() => void refetch()}
            className="font-custom gap-2"
          >
            <RefreshCw className="h-4 w-4" />
            Retry
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (!normalized) {
    return (
      <Empty className="bg-muted/10 rounded-xl border">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <BarChart3 />
          </EmptyMedia>
          <EmptyTitle className="font-custom">
            No overview data found
          </EmptyTitle>
          <EmptyDescription className="font-custom">
            We could not find overview metrics for this period.
          </EmptyDescription>
        </EmptyHeader>
      </Empty>
    );
  }

  const shedStockBags = computeShedStockBags(normalized);

  return (
    <div className="grid gap-4 sm:gap-6 md:grid-cols-2 lg:grid-cols-3 xl:gap-8">
      <StatCard
        title="Total Seed Bags Given"
        value={formatNumber(normalized.totalSeedBagsGiven)}
        icon={<Sprout className="h-5 w-5" />}
        description="Total seed bags issued to farmers"
      />
      <StatCard
        title="Total Incoming Bags"
        value={formatNumber(normalized.totalIncomingBags)}
        description={`${formatWeight(normalized.totalIncomingWeight)} (excl bardana)`}
        icon={<Package className="h-5 w-5" />}
        onGetReportClick={() =>
          void navigate({ to: '/store-admin/analytics/reports/incoming' })
        }
      />
      <StatCard
        title="Ungraded Bags"
        value={formatNumber(normalized.totalUngradedBags)}
        description={`${formatWeight(normalized.totalUngradedWeight)} ungraded`}
        icon={<Boxes className="h-5 w-5" />}
      />
      <GradingCard
        initialQuantity={normalized.totalGradingBags.initialQuantity}
        currentQuantity={normalized.totalGradingBags.currentQuantity}
        weightKg={normalized.totalGradingWeight}
      />
      <StatCard
        title="Bags Stored"
        value={formatNumber(normalized.totalBagsStored)}
        icon={<Warehouse className="h-5 w-5" />}
      />
      <StatCard
        title="Shed Stock"
        value={formatNumber(shedStockBags)}
        description="Grading (initial) - stored - dispatch"
        icon={<Building2 className="h-5 w-5" />}
      />
      <StatCard
        title="Dispatch"
        value={formatNumber(normalized.totalBagsDispatched)}
        icon={<Truck className="h-5 w-5" />}
      />
      <StatCard
        title="Total Outgoing Bags"
        value={formatNumber(normalized.totalOutgoingBags)}
        icon={<ArrowUpRight className="h-5 w-5" />}
      />
    </div>
  );
});

export default Overview;
