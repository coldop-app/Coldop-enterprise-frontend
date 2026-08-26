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
  Handshake,
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
import { useStore } from '@/stores/store';
import { usePermissionsStore } from '@/stores/usePermissionsStore';
import { useGetOverview } from '@/services/store-admin/general/useGetOverview';
import {
  toAnalyticsDateSearch,
  type AnalyticsDateRange,
} from './-analytics-date-search';
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
  bagsDispatchedInternalTransfer: number;
  bagsDispatchedNotInternalTransfer: number;
  totalBagsDispatchedPostStorage: number;
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
    bagsDispatchedInternalTransfer: toNumber(
      raw.bagsDispatchedInternalTransfer
    ),
    bagsDispatchedNotInternalTransfer:
      raw.bagsDispatchedNotInternalTransfer == null
        ? toNumber(raw.totalBagsDispatched)
        : toNumber(raw.bagsDispatchedNotInternalTransfer),
    totalBagsDispatchedPostStorage:
      raw.totalBagsDispatchedPostStorage == null
        ? toNumber(raw.totalOutgoingBags)
        : toNumber(raw.totalBagsDispatchedPostStorage),
  };
}

function computeShedStockBags(data: OverviewMetrics): number {
  const gradingInitial = data.totalGradingBags.initialQuantity;
  const storedInitial = data.totalBagsStoredInitial ?? data.totalBagsStored;
  return (
    gradingInitial +
    data.totalUngradedBags -
    storedInitial -
    data.bagsDispatchedNotInternalTransfer
  );
}

interface StatCardProps {
  title: string;
  value: string;
  description?: string;
  icon: React.ReactNode;
  onGetReportClick?: () => void;
}

interface StaticReportCardProps {
  title: string;
  icon: React.ReactNode;
  onGetReportClick?: () => void;
}

const StaticReportCard = memo(function StaticReportCard({
  title,
  icon,
  onGetReportClick,
}: StaticReportCardProps) {
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
        {onGetReportClick != null && (
          <Button
            variant="outline"
            size="sm"
            onClick={onGetReportClick}
            className="font-custom border-border/60 bg-background hover:bg-muted mt-2 cursor-pointer gap-1.5 rounded-lg"
          >
            <FileText className="h-4 w-4" />
            Get Reports
          </Button>
        )}
        <div className="bg-muted group-hover:bg-primary/10 absolute right-4 bottom-4 flex h-6 w-6 items-center justify-center rounded-full transition-all duration-150 group-hover:translate-x-0.5 group-hover:-translate-y-0.5">
          <ArrowUpRight className="text-primary h-3 w-3" />
        </div>
      </CardContent>
    </Card>
  );
});

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
        {onGetReportClick != null && (
          <Button
            variant="outline"
            size="sm"
            onClick={onGetReportClick}
            className="font-custom border-border/60 bg-background hover:bg-muted mt-2 cursor-pointer gap-1.5 rounded-lg"
          >
            <FileText className="h-4 w-4" />
            Get Reports
          </Button>
        )}
        <div className="bg-muted group-hover:bg-primary/10 absolute right-4 bottom-4 flex h-6 w-6 items-center justify-center rounded-full transition-all duration-150 group-hover:translate-x-0.5 group-hover:-translate-y-0.5">
          <ArrowUpRight className="text-primary h-3 w-3" />
        </div>
      </CardContent>
    </Card>
  );
});

interface DispatchCardProps {
  totalBags: number;
  internalTransferBags: number;
  notInternalTransferBags: number;
  onGetReportClick?: () => void;
}

const DispatchCard = memo(function DispatchCard({
  totalBags,
  internalTransferBags,
  notInternalTransferBags,
  onGetReportClick,
}: DispatchCardProps) {
  const [open, setOpen] = useState(false);

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <Card className="group font-custom border-border/40 bg-card relative overflow-hidden rounded-2xl border shadow-sm transition-all duration-200 hover:-translate-y-1 hover:shadow-md">
        <div className="bg-primary absolute inset-x-0 top-0 h-[3px] rounded-t-2xl opacity-0 transition-opacity duration-200 group-hover:opacity-100" />
        <CardHeader className="flex flex-row items-center justify-between gap-4 space-y-0 pb-2">
          <CardTitle className="text-foreground text-[15px] leading-snug font-semibold sm:text-base">
            Dispatch (Pre Storage)
          </CardTitle>
          <span className="bg-primary/10 text-primary flex h-10 w-10 shrink-0 items-center justify-center rounded-full">
            <Truck className="h-5 w-5" />
          </span>
        </CardHeader>
        <CardContent className="space-y-2">
          <p className="font-custom text-foreground text-2xl font-bold tracking-tight sm:text-3xl">
            {formatNumber(totalBags)}
          </p>
          <CardDescription className="font-custom text-muted-foreground text-sm">
            Internal: {formatNumber(internalTransferBags)} · Dispatched:{' '}
            {formatNumber(notInternalTransferBags)}
          </CardDescription>
          {onGetReportClick != null && (
            <Button
              variant="outline"
              size="sm"
              onClick={onGetReportClick}
              className="font-custom border-border/60 bg-background hover:bg-muted mt-2 cursor-pointer gap-1.5 rounded-lg"
            >
              <FileText className="h-4 w-4" />
              Get Reports
            </Button>
          )}
          <CollapsibleTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="font-custom text-muted-foreground hover:text-primary mt-2 h-auto gap-1.5 px-0"
            >
              {open ? (
                <>
                  <ChevronUp className="h-4 w-4" />
                  Hide breakdown
                </>
              ) : (
                <>
                  <ChevronDown className="h-4 w-4" />
                  Show breakdown
                </>
              )}
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <div className="font-custom border-border/50 space-y-2 border-t pt-3 text-sm">
              <div className="flex items-center justify-between gap-4">
                <span className="text-muted-foreground">Internal</span>
                <span className="text-foreground font-semibold">
                  {formatNumber(internalTransferBags)}
                </span>
              </div>
              <div className="flex items-center justify-between gap-4">
                <span className="text-muted-foreground">Dispatched</span>
                <span className="text-foreground font-semibold">
                  {formatNumber(notInternalTransferBags)}
                </span>
              </div>
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

interface OverviewProps {
  dateRange: AnalyticsDateRange;
}

const Overview = memo(function Overview({ dateRange }: OverviewProps) {
  const navigate = useNavigate();
  const setAnalyticsActiveTab = useStore(
    (state) => state.setAnalyticsActiveTab
  );
  const hasPermission = usePermissionsStore((state) => state.hasPermission);
  const canReadOverview = hasPermission('analytics-overview', 'read');
  const canReadFarmerSeedReports = hasPermission(
    'farmer-seed-gate-pass',
    'reports'
  );
  const canReadIncomingReports = hasPermission('incoming-gate-pass', 'reports');
  const canReadGradingReports = hasPermission('grading-gate-pass', 'reports');
  const canReadStorageReports = hasPermission('storage-gate-pass', 'reports');
  const canReadNikasiReports = hasPermission('nikasi-gate-pass', 'reports');
  const canReadOutgoingReports = hasPermission('outgoing-gate-pass', 'reports');
  const contractFarmingPermissions = usePermissionsStore(
    (state) => state.permissions['contract-farming']
  );
  const shouldShowContractFarmingCard =
    contractFarmingPermissions != null &&
    Object.keys(contractFarmingPermissions).length > 0;
  const { data, isLoading, isError, error, refetch } = useGetOverview({
    dateFrom: dateRange.fromDate || undefined,
    dateTo: dateRange.toDate || undefined,
  });
  const normalized = normalizeOverviewData(data);
  const dateSearch = toAnalyticsDateSearch(dateRange);

  const goToReport = (to: string) => {
    void navigate({
      to,
      search: (prev) => ({
        ...prev,
        ...dateSearch,
      }),
    });
  };

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

  if (!canReadOverview) {
    return (
      <Empty className="bg-muted/10 rounded-xl border">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <BarChart3 />
          </EmptyMedia>
          <EmptyTitle className="font-custom">
            Access restricted for analytics overview
          </EmptyTitle>
          <EmptyDescription className="font-custom">
            You do not have read permission for analytics overview.
          </EmptyDescription>
        </EmptyHeader>
      </Empty>
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
        onGetReportClick={
          canReadFarmerSeedReports
            ? () => goToReport('/store-admin/analytics/reports/farmer-seed')
            : undefined
        }
      />
      <StatCard
        title="Total Incoming Bags"
        value={formatNumber(normalized.totalIncomingBags)}
        description={`${formatWeight(normalized.totalIncomingWeight)} (excl bardana)`}
        icon={<Package className="h-5 w-5" />}
        onGetReportClick={
          canReadIncomingReports
            ? () => goToReport('/store-admin/analytics/reports/incoming')
            : undefined
        }
      />
      <StatCard
        title="Ungraded Bags"
        value={formatNumber(normalized.totalUngradedBags)}
        description={`${formatWeight(normalized.totalUngradedWeight)} ungraded`}
        icon={<Boxes className="h-5 w-5" />}
        onGetReportClick={
          canReadIncomingReports
            ? () => goToReport('/store-admin/analytics/reports/ungraded')
            : undefined
        }
      />
      <StatCard
        title="Grading"
        value={formatNumber(normalized.totalGradingBags.initialQuantity)}
        description={formatWeight(normalized.totalGradingWeight)}
        icon={<ClipboardList className="h-5 w-5" />}
        onGetReportClick={
          canReadGradingReports
            ? () => goToReport('/store-admin/analytics/reports/grading')
            : undefined
        }
      />
      <StatCard
        title="Bags Stored"
        value={formatNumber(normalized.totalBagsStored)}
        icon={<Warehouse className="h-5 w-5" />}
        onGetReportClick={
          canReadStorageReports
            ? () => goToReport('/store-admin/analytics/reports/storage')
            : undefined
        }
      />
      <StatCard
        title="Shed Stock"
        value={formatNumber(shedStockBags)}
        description="Grading + ungraded - stored - dispatch (excl internal transfer)"
        icon={<Building2 className="h-5 w-5" />}
        onGetReportClick={
          canReadOverview
            ? () => goToReport('/store-admin/analytics/reports/shed')
            : undefined
        }
      />
      <DispatchCard
        totalBags={normalized.totalBagsDispatched}
        internalTransferBags={normalized.bagsDispatchedInternalTransfer}
        notInternalTransferBags={normalized.bagsDispatchedNotInternalTransfer}
        onGetReportClick={
          canReadNikasiReports
            ? () =>
                goToReport(
                  '/store-admin/analytics/reports/dispatch-pre-storage'
                )
            : undefined
        }
      />
      <StatCard
        title="Dispatch (Post Storage)"
        value={formatNumber(normalized.totalBagsDispatchedPostStorage)}
        description="Bags dispatched after storage"
        icon={<ArrowUpRight className="h-5 w-5" />}
        onGetReportClick={
          canReadOutgoingReports
            ? () => {
                setAnalyticsActiveTab('dispatch-outgoing');
                void navigate({
                  to: '/store-admin/analytics',
                  search: (prev) => ({
                    ...prev,
                    ...dateSearch,
                  }),
                });
              }
            : undefined
        }
      />
      {shouldShowContractFarmingCard && (
        <StaticReportCard
          title="Contract Farming Report"
          icon={<Handshake className="h-5 w-5" />}
          onGetReportClick={
            canReadFarmerSeedReports
              ? () =>
                  goToReport('/store-admin/analytics/reports/contract-farming')
              : undefined
          }
        />
      )}
    </div>
  );
});

export default Overview;
