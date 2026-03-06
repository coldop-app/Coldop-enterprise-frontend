import { memo, useCallback, useMemo, useState } from 'react';
import { Link } from '@tanstack/react-router';
import { Card, CardContent } from '@/components/ui/card';

import {
  Item,
  ItemHeader,
  ItemMedia,
  ItemTitle,
  ItemActions,
  ItemFooter,
} from '@/components/ui/item';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationPrevious,
  PaginationNext,
} from '@/components/ui/pagination';
import {
  Search,
  ChevronDown,
  RefreshCw,
  Receipt,
  ArrowUpFromLine,
  ClipboardList,
  Package,
  Truck,
  ArrowRightFromLine,
} from 'lucide-react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import {
  Empty,
  EmptyHeader,
  EmptyTitle,
  EmptyContent,
  EmptyMedia,
} from '@/components/ui/empty';
import type { DaybookEntry } from '@/types/daybook';
import {
  JUTE_BAG_WEIGHT,
  LENO_BAG_WEIGHT,
} from '@/components/forms/grading/constants';
import EntrySummariesBar from './EntrySummariesBar';
import {
  IncomingVoucher,
  GradingVoucher,
  totalBagsFromOrderDetails,
  type IncomingVoucherData,
  type PassVoucherData,
} from './vouchers';

interface DaybookEntryCardProps {
  entry: DaybookEntry;
  /** When parent tab is Incoming vs Grading, card opens on that sub-tab */
  defaultSubTab?: 'incoming' | 'grading';
}

const PIPELINE_STAGES = 2; // Incoming → Grading

/** Get farmerStorageLinkId from incoming (id string or populated object with _id) */
function getFarmerStorageLinkId(
  incoming: Record<string, unknown>
): string | undefined {
  const link = incoming.farmerStorageLinkId;
  if (typeof link === 'string') return link;
  if (link != null && typeof link === 'object' && '_id' in link)
    return (link as { _id: string })._id;
  return undefined;
}

/** Progress = (number of steps achieved / total steps) * 100. Counts Incoming and Grading only. */
function getPipelineProgress(entry: DaybookEntry): number {
  const hasIncoming = 1; // Incoming is always present when we have an entry
  const hasGrading = (entry.gradingPasses?.length ?? 0) > 0 ? 1 : 0;
  const completedStages = hasIncoming + hasGrading;
  return Math.round((completedStages / PIPELINE_STAGES) * 100);
}

const DaybookEntryCard = memo(function DaybookEntryCard({
  entry,
  defaultSubTab = 'incoming',
}: DaybookEntryCardProps) {
  const incoming = entry.incoming as IncomingVoucherData | undefined;
  const farmer = entry.farmer;
  const farmerName = farmer?.name;
  const farmerAccount = farmer?.accountNumber;
  const farmerAddress = farmer?.address;
  const farmerMobile = farmer?.mobileNumber;
  const progressValue = getPipelineProgress(entry);

  const summariesWithNikasi = useMemo(() => {
    const base = entry.summaries ?? {
      totalBagsIncoming: 0,
      totalBagsGraded: 0,
      totalBagsStored: 0,
      totalBagsNikasi: 0,
      totalBagsOutgoing: 0,
    };
    const nikasiTotal = (entry.nikasiPasses ?? []).reduce<number>(
      (sum, pass) =>
        sum + totalBagsFromOrderDetails((pass as PassVoucherData).orderDetails),
      0
    );

    // Wastage (kg) = [Net − (incoming bags × 700 g)] − [graded weight − (per row: bags × JUTE/LENO bag weight)]
    let wastageKg: number | undefined;
    let incomingNetKg: number | undefined;
    const slip = incoming?.weightSlip;
    const incomingBags =
      (incoming as { bagsReceived?: number })?.bagsReceived ?? 0;
    if (slip && typeof slip === 'object') {
      const gross =
        Number((slip as { grossWeightKg?: number }).grossWeightKg) || 0;
      const tare =
        Number((slip as { tareWeightKg?: number }).tareWeightKg) || 0;
      incomingNetKg = gross - tare;
      let gradingWeightKg = 0;
      let bagWeightDeductionKg = 0;
      for (const pass of entry.gradingPasses ?? []) {
        const details = (pass as PassVoucherData).orderDetails ?? [];
        for (const od of details) {
          const qty = (od as { initialQuantity?: number }).initialQuantity ?? 0;
          const wt = (od as { weightPerBagKg?: number }).weightPerBagKg ?? 0;
          const bagType = (od as { bagType?: string }).bagType?.toUpperCase();
          gradingWeightKg += qty * wt;
          const bagWt = bagType === 'JUTE' ? JUTE_BAG_WEIGHT : LENO_BAG_WEIGHT;
          bagWeightDeductionKg += qty * bagWt;
        }
      }
      const part1 = incomingNetKg - incomingBags * JUTE_BAG_WEIGHT;
      const part2 = gradingWeightKg - bagWeightDeductionKg;
      wastageKg = part1 - part2;
    }
    let wastagePercent: number | undefined;
    if (wastageKg !== undefined && slip && typeof slip === 'object') {
      const gross =
        Number((slip as { grossWeightKg?: number }).grossWeightKg) || 0;
      const tare =
        Number((slip as { tareWeightKg?: number }).tareWeightKg) || 0;
      const netKg = gross - tare;
      wastagePercent = netKg > 0 ? (wastageKg / netKg) * 100 : undefined;
    }

    return {
      ...base,
      totalBagsNikasi: nikasiTotal,
      ...(wastageKg !== undefined && { wastageKg }),
      ...(wastagePercent !== undefined && { wastagePercent }),
      ...(incomingNetKg !== undefined && { incomingNetKg }),
      incomingBagsCount: incomingBags,
    };
  }, [
    entry.summaries,
    entry.nikasiPasses,
    entry.gradingPasses,
    entry.incoming,
    incoming?.weightSlip,
  ]);

  const farmerStorageLinkId = getFarmerStorageLinkId(entry.incoming);
  const incomingGatePassId = incoming?._id;
  const variety = incoming?.variety;

  const gradingSearch =
    farmerStorageLinkId && incomingGatePassId && variety
      ? {
          farmerStorageLinkId,
          incomingGatePassId,
          variety,
        }
      : undefined;

  return (
    <Card className="overflow-hidden p-0">
      <div className="border-border bg-muted/30 px-3 py-2 sm:px-4 sm:py-2.5">
        <div className="flex items-center justify-between gap-2">
          <span className="font-custom text-muted-foreground text-xs font-medium sm:text-sm">
            Pipeline
          </span>
          <span className="font-custom text-muted-foreground text-xs sm:text-sm">
            {progressValue}%
          </span>
        </div>
        <Progress value={progressValue} className="mt-1.5 h-2" />
      </div>
      <EntrySummariesBar summaries={summariesWithNikasi} />
      <Tabs defaultValue={defaultSubTab} className="w-full">
        <TabsList className="font-custom flex h-auto w-full flex-nowrap overflow-x-auto">
          <TabsTrigger
            value="incoming"
            className="min-w-0 flex-1 shrink-0 px-3 sm:px-4"
          >
            <span className="sm:hidden">Inc</span>
            <span className="hidden sm:inline">Incoming</span>
          </TabsTrigger>
          <TabsTrigger
            value="grading"
            className="min-w-0 flex-1 shrink-0 px-3 sm:px-4"
          >
            <span className="sm:hidden">Gra</span>
            <span className="hidden sm:inline">Grading</span>
          </TabsTrigger>
        </TabsList>
        <div className="p-0">
          <TabsContent value="incoming" className="mt-0 outline-none">
            {incoming ? (
              <IncomingVoucher
                voucher={incoming}
                farmerName={farmerName}
                farmerAccount={farmerAccount}
                farmerAddress={farmerAddress}
                farmerMobile={farmerMobile}
              />
            ) : (
              <p className="text-muted-foreground font-custom py-6 text-center text-sm">
                No incoming voucher.
              </p>
            )}
          </TabsContent>
          <TabsContent value="grading" className="mt-0 outline-none">
            {entry.gradingPasses.length > 0 ? (
              <div className="space-y-4">
                {(entry.gradingPasses as PassVoucherData[]).map((pass) => (
                  <GradingVoucher
                    key={pass._id ?? String(pass.gatePassNo)}
                    voucher={pass}
                    farmerName={farmerName}
                    farmerAccount={farmerAccount}
                    farmerStorageLinkId={farmerStorageLinkId}
                    wastageKg={summariesWithNikasi.wastageKg}
                    wastagePercent={summariesWithNikasi.wastagePercent}
                    incomingNetKg={summariesWithNikasi.incomingNetKg}
                    incomingBagsCount={summariesWithNikasi.incomingBagsCount}
                  />
                ))}
              </div>
            ) : (
              <Empty className="font-custom py-6">
                <EmptyHeader>
                  <EmptyMedia variant="icon">
                    <ClipboardList className="size-6" />
                  </EmptyMedia>
                  <EmptyTitle>No Grading voucher is present</EmptyTitle>
                </EmptyHeader>
                <EmptyContent>
                  <Button
                    className="font-custom focus-visible:ring-primary focus-visible:ring-2 focus-visible:ring-offset-2"
                    asChild
                  >
                    <Link to="/store-admin/grading" search={gradingSearch}>
                      Add Grading voucher
                    </Link>
                  </Button>
                </EmptyContent>
              </Empty>
            )}
          </TabsContent>
        </div>
      </Tabs>
    </Card>
  );
});

export { DaybookEntryCard };

/** Storage tab: renders voucher list (data provided by parent) */
const StorageTabContent = memo(function StorageTabContent() {
  return (
    <Card>
      <CardContent className="py-8 pt-6">
        <Empty className="font-custom">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <Package className="size-6" />
            </EmptyMedia>
            <EmptyTitle>No storage vouchers yet</EmptyTitle>
          </EmptyHeader>
          <EmptyContent>
            <Button
              className="font-custom focus-visible:ring-primary focus-visible:ring-2 focus-visible:ring-offset-2"
              asChild
            >
              <Link to="/store-admin/storage">Add Storage voucher</Link>
            </Button>
          </EmptyContent>
        </Empty>
      </CardContent>
    </Card>
  );
});

/** Dispatch tab: renders voucher list (data provided by parent) */
const DispatchTabContent = memo(function DispatchTabContent() {
  return (
    <Card>
      <CardContent className="py-8 pt-6">
        <Empty className="font-custom">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <Truck className="size-6" />
            </EmptyMedia>
            <EmptyTitle>No dispatch vouchers yet</EmptyTitle>
          </EmptyHeader>
          <EmptyContent>
            <Button
              className="font-custom focus-visible:ring-primary focus-visible:ring-2 focus-visible:ring-offset-2"
              asChild
            >
              <Link to="/store-admin/nikasi">Add Dispatch voucher</Link>
            </Button>
          </EmptyContent>
        </Empty>
      </CardContent>
    </Card>
  );
});

const LIMIT_OPTIONS = [10, 25, 50, 100] as const;

interface TabSummaryBarProps {
  count: number;
  icon: React.ReactNode;
  onRefresh?: () => void;
  isRefreshing?: boolean;
}

/** Bar shown below the tab label: "X vouchers" + Refresh button. One per tab. */
const TabSummaryBar = memo(function TabSummaryBar({
  count,
  icon,
  onRefresh,
  isRefreshing = false,
}: TabSummaryBarProps) {
  return (
    <Item variant="outline" size="sm" className="rounded-xl shadow-sm">
      <ItemHeader className="h-full">
        <div className="flex items-center gap-3">
          <ItemMedia variant="icon" className="rounded-lg">
            {icon}
          </ItemMedia>
          <ItemTitle className="font-custom text-sm font-semibold sm:text-base">
            {count} {count === 1 ? 'voucher' : 'vouchers'}
          </ItemTitle>
        </div>
        <ItemActions>
          <Button
            variant="outline"
            size="sm"
            disabled={isRefreshing}
            onClick={() => onRefresh?.()}
            className="font-custom h-8 gap-2 rounded-lg px-3"
          >
            <RefreshCw
              className={`h-4 w-4 shrink-0 ${
                isRefreshing ? 'animate-spin' : ''
              }`}
            />
            <span className="hidden sm:inline">Refresh</span>
          </Button>
        </ItemActions>
      </ItemHeader>
    </Item>
  );
});

type IncomingStatusFilter = 'all' | 'graded' | 'ungraded';

interface TabToolbarSimpleProps {
  addButtonLabel: string;
  addButtonTo: string;
  addButtonIcon: React.ReactNode;
}

/** Toolbar with search + sort by only (no filter). Used for Storage, Dispatch, Outgoing tabs. */
const TabToolbarSimple = memo(function TabToolbarSimple({
  addButtonLabel,
  addButtonTo,
  addButtonIcon,
}: TabToolbarSimpleProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [sortBy, setSortBy] = useState<'Date' | 'Voucher Number'>('Date');
  return (
    <Item
      variant="outline"
      size="sm"
      className="flex-col items-stretch gap-4 rounded-xl"
    >
      <div className="relative w-full">
        <Search className="text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
        <Input
          placeholder="Search by voucher number, date..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="font-custom focus-visible:ring-primary w-full pl-10 focus-visible:ring-2 focus-visible:ring-offset-2"
        />
      </div>
      <ItemFooter className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="outline"
              className="font-custom focus-visible:ring-primary w-full min-w-0 rounded-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 sm:w-auto sm:min-w-40"
            >
              <span className="hidden sm:inline">Sort by: </span>
              <span className="sm:hidden">Sort: </span>
              {sortBy === 'Voucher Number' ? (
                <span className="truncate">Voucher No.</span>
              ) : (
                sortBy
              )}
              <span className="font-custom text-muted-foreground hidden sm:inline">
                {' '}
                · {sortOrder === 'asc' ? 'Ascending' : 'Descending'}
              </span>
              <ChevronDown className="ml-2 h-4 w-4 shrink-0" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="font-custom">
            <DropdownMenuItem onClick={() => setSortBy('Date')}>
              Date
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setSortBy('Voucher Number')}>
              Voucher Number
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setSortOrder('asc')}>
              Ascending
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setSortOrder('desc')}>
              Descending
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        <Button
          className="font-custom h-10 w-full shrink-0 gap-2 sm:w-auto"
          asChild
        >
          <Link to={addButtonTo}>
            {addButtonIcon}
            {addButtonLabel}
          </Link>
        </Button>
      </ItemFooter>
    </Item>
  );
});

/** Get sortable date from daybook entry (incoming date). */
function getEntryDate(entry: DaybookEntry): number {
  const inc = entry.incoming as { date?: string };
  return inc?.date ? new Date(inc.date).getTime() : 0;
}

const DaybookPage = memo(function DaybookPage() {
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [statusFilter, setStatusFilter] = useState<IncomingStatusFilter>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const daybook: DaybookEntry[] = [];

  const setLimitAndResetPage = useCallback((newLimit: number) => {
    setLimit(newLimit);
    setPage(1);
  }, []);

  const sortedByDate = useMemo(() => {
    const sorted = [...daybook].sort((a, b) => {
      const dateA = getEntryDate(a);
      const dateB = getEntryDate(b);
      return sortOrder === 'desc' ? dateB - dateA : dateA - dateB;
    });
    return sorted;
  }, [daybook, sortOrder]);

  const filteredBySearch = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return sortedByDate;
    return sortedByDate.filter((entry) => {
      const inc = entry.incoming as { gatePassNo?: number; date?: string };
      const voucherNo = String(inc?.gatePassNo ?? '');
      const dateStr = inc?.date
        ? new Date(inc.date).toLocaleDateString('en-IN')
        : '';
      return (
        voucherNo.toLowerCase().includes(q) || dateStr.toLowerCase().includes(q)
      );
    });
  }, [sortedByDate, searchQuery]);

  const incomingFilteredEntries: DaybookEntry[] = useMemo(() => {
    if (statusFilter === 'all') return filteredBySearch;
    return filteredBySearch.filter((entry) => {
      const hasGrading = (entry.gradingPasses?.length ?? 0) > 0;
      if (statusFilter === 'graded') return hasGrading;
      return !hasGrading;
    });
  }, [filteredBySearch, statusFilter]);

  const gradingFilteredEntries: DaybookEntry[] = filteredBySearch;

  const totalPages = 1;
  const hasPrev = false;
  const hasNext = false;

  return (
    <main className="mx-auto max-w-7xl p-3 sm:p-4 lg:p-6">
      <div className="space-y-4 sm:space-y-6">
        <div className="flex flex-col gap-4">
          <Tabs defaultValue="incoming" className="w-full">
            <TabsList className="font-custom mb-4 flex h-auto w-full flex-nowrap overflow-x-auto rounded-xl">
              <TabsTrigger
                value="incoming"
                className="min-w-0 flex-1 shrink-0 px-3 sm:px-4"
              >
                Incoming
              </TabsTrigger>
              <TabsTrigger
                value="grading"
                className="min-w-0 flex-1 shrink-0 px-3 sm:px-4"
              >
                Grading
              </TabsTrigger>
              <TabsTrigger
                value="storage"
                className="min-w-0 flex-1 shrink-0 px-3 sm:px-4"
              >
                Storage
              </TabsTrigger>
              <TabsTrigger
                value="dispatch"
                className="min-w-0 flex-1 shrink-0 px-3 sm:px-4"
              >
                Dispatch
              </TabsTrigger>
              <TabsTrigger
                value="outgoing"
                className="min-w-0 flex-1 shrink-0 px-3 sm:px-4"
              >
                Outgoing
              </TabsTrigger>
            </TabsList>

            <TabsContent
              value="incoming"
              className="mt-0 flex flex-col gap-4 outline-none"
            >
              <TabSummaryBar
                count={incomingFilteredEntries.length}
                icon={<Receipt className="text-primary h-5 w-5" />}
              />
              <Item
                variant="outline"
                size="sm"
                className="flex-col items-stretch gap-4 rounded-xl"
              >
                <div className="relative w-full">
                  <Search className="text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
                  <Input
                    placeholder="Search by gate pass number"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="font-custom focus-visible:ring-primary w-full pl-10 focus-visible:ring-2 focus-visible:ring-offset-2"
                  />
                </div>
                <ItemFooter className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex w-full flex-wrap items-center gap-3 sm:w-auto">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="outline"
                          className="font-custom focus-visible:ring-primary w-full min-w-0 rounded-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 sm:w-auto sm:min-w-40"
                        >
                          Sort Order:{' '}
                          {sortOrder === 'desc'
                            ? 'Latest first'
                            : 'Oldest first'}
                          <ChevronDown className="ml-2 h-4 w-4 shrink-0" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent
                        align="start"
                        className="font-custom"
                      >
                        <DropdownMenuItem
                          onClick={() => {
                            setSortOrder('asc');
                            setPage(1);
                          }}
                        >
                          Oldest first
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => {
                            setSortOrder('desc');
                            setPage(1);
                          }}
                        >
                          Latest first
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="outline"
                          className="font-custom focus-visible:ring-primary w-full min-w-0 rounded-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 sm:w-auto sm:min-w-40"
                        >
                          Status:{' '}
                          {statusFilter === 'all'
                            ? 'All'
                            : statusFilter === 'graded'
                              ? 'Graded'
                              : 'Ungraded'}
                          <ChevronDown className="ml-2 h-4 w-4 shrink-0" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent
                        align="start"
                        className="font-custom"
                      >
                        <DropdownMenuItem
                          onClick={() => setStatusFilter('all')}
                        >
                          All
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => setStatusFilter('graded')}
                        >
                          Graded
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => setStatusFilter('ungraded')}
                        >
                          Ungraded
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                  <Button
                    className="font-custom h-10 w-full shrink-0 gap-2 sm:w-auto"
                    asChild
                  >
                    <Link to="/store-admin/incoming">
                      <ArrowUpFromLine className="h-4 w-4 shrink-0" />
                      Add Incoming
                    </Link>
                  </Button>
                </ItemFooter>
              </Item>

              {/* List: one tabbed card per daybook entry */}
              <div className="mt-4 sm:mt-6">
                {incomingFilteredEntries.length === 0 ? (
                  <Card>
                    <CardContent className="py-8 pt-6">
                      <Empty className="font-custom">
                        <EmptyHeader>
                          <EmptyMedia variant="icon">
                            <ArrowUpFromLine className="size-6" />
                          </EmptyMedia>
                          <EmptyTitle>No incoming vouchers yet</EmptyTitle>
                        </EmptyHeader>
                        <EmptyContent>
                          <Button
                            className="font-custom focus-visible:ring-primary focus-visible:ring-2 focus-visible:ring-offset-2"
                            asChild
                          >
                            <Link to="/store-admin/incoming">
                              Add Incoming voucher
                            </Link>
                          </Button>
                        </EmptyContent>
                      </Empty>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="space-y-6">
                    {incomingFilteredEntries.map((entry, idx) => (
                      <DaybookEntryCard
                        key={
                          (entry.incoming as { _id?: string })?._id ??
                          entry.farmer?._id ??
                          `entry-${idx}`
                        }
                        entry={entry}
                        defaultSubTab="incoming"
                      />
                    ))}
                  </div>
                )}

                {/* Pagination footer */}
                {incomingFilteredEntries.length > 0 && (
                  <Item
                    variant="outline"
                    size="sm"
                    className="flex flex-wrap items-center justify-between gap-3 rounded-xl px-4 py-3"
                  >
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="outline"
                          size="sm"
                          className="font-custom focus-visible:ring-primary rounded-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
                        >
                          {limit} per page
                          <ChevronDown className="ml-1.5 h-4 w-4 shrink-0" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="start">
                        {LIMIT_OPTIONS.map((n) => (
                          <DropdownMenuItem
                            key={n}
                            onClick={() => setLimitAndResetPage(n)}
                          >
                            {n} per page
                          </DropdownMenuItem>
                        ))}
                      </DropdownMenuContent>
                    </DropdownMenu>
                    <Pagination>
                      <PaginationContent className="gap-1">
                        <PaginationItem>
                          <PaginationPrevious
                            href="#"
                            className="font-custom focus-visible:ring-primary cursor-pointer rounded-lg focus-visible:ring-2 focus-visible:ring-offset-2"
                            aria-disabled={!hasPrev}
                            onClick={(e) => {
                              e.preventDefault();
                              if (hasPrev) setPage((p) => Math.max(1, p - 1));
                            }}
                            style={
                              !hasPrev
                                ? { pointerEvents: 'none', opacity: 0.5 }
                                : undefined
                            }
                          />
                        </PaginationItem>
                        <PaginationItem>
                          <PaginationLink
                            isActive
                            href="#"
                            className="font-custom cursor-default"
                            onClick={(e) => e.preventDefault()}
                          >
                            {page} / {totalPages}
                          </PaginationLink>
                        </PaginationItem>
                        <PaginationItem>
                          <PaginationNext
                            href="#"
                            className="font-custom focus-visible:ring-primary cursor-pointer rounded-lg focus-visible:ring-2 focus-visible:ring-offset-2"
                            aria-disabled={!hasNext}
                            onClick={(e) => {
                              e.preventDefault();
                              if (hasNext)
                                setPage((p) => Math.min(totalPages, p + 1));
                            }}
                            style={
                              !hasNext
                                ? { pointerEvents: 'none', opacity: 0.5 }
                                : undefined
                            }
                          />
                        </PaginationItem>
                      </PaginationContent>
                    </Pagination>
                  </Item>
                )}
              </div>
            </TabsContent>

            <TabsContent
              value="grading"
              className="mt-0 flex flex-col gap-4 outline-none"
            >
              <TabSummaryBar
                count={gradingFilteredEntries.length}
                icon={<ClipboardList className="text-primary h-5 w-5" />}
              />
              <Item
                variant="outline"
                size="sm"
                className="flex-col items-stretch gap-4 rounded-xl"
              >
                <div className="relative w-full">
                  <Search className="text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
                  <Input
                    placeholder="Search by gate pass number"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="font-custom focus-visible:ring-primary w-full pl-10 focus-visible:ring-2 focus-visible:ring-offset-2"
                  />
                </div>
                <ItemFooter className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="outline"
                        className="font-custom focus-visible:ring-primary w-full min-w-0 rounded-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 sm:w-auto sm:min-w-40"
                      >
                        Sort Order:{' '}
                        {sortOrder === 'desc' ? 'Latest first' : 'Oldest first'}
                        <ChevronDown className="ml-2 h-4 w-4 shrink-0" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start" className="font-custom">
                      <DropdownMenuItem
                        onClick={() => {
                          setSortOrder('asc');
                          setPage(1);
                        }}
                      >
                        Oldest first
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => {
                          setSortOrder('desc');
                          setPage(1);
                        }}
                      >
                        Latest first
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                  <Button
                    className="font-custom h-10 w-full shrink-0 gap-2 sm:w-auto"
                    asChild
                  >
                    <Link to="/store-admin/grading">
                      <ClipboardList className="h-4 w-4 shrink-0" />
                      Add Grading
                    </Link>
                  </Button>
                </ItemFooter>
              </Item>

              {/* List: one tabbed card per daybook entry */}
              <div className="mt-4 sm:mt-6">
                {gradingFilteredEntries.length === 0 ? (
                  <Card>
                    <CardContent className="py-8 pt-6">
                      <Empty className="font-custom">
                        <EmptyHeader>
                          <EmptyMedia variant="icon">
                            <ClipboardList className="size-6" />
                          </EmptyMedia>
                          <EmptyTitle>No grading vouchers yet</EmptyTitle>
                        </EmptyHeader>
                        <EmptyContent>
                          <Button
                            className="font-custom focus-visible:ring-primary focus-visible:ring-2 focus-visible:ring-offset-2"
                            asChild
                          >
                            <Link to="/store-admin/grading">
                              Add Grading voucher
                            </Link>
                          </Button>
                        </EmptyContent>
                      </Empty>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="space-y-6">
                    {gradingFilteredEntries.map((entry, idx) => (
                      <DaybookEntryCard
                        key={
                          (entry.incoming as { _id?: string })?._id ??
                          entry.farmer?._id ??
                          `entry-${idx}`
                        }
                        entry={entry}
                        defaultSubTab="grading"
                      />
                    ))}
                  </div>
                )}

                {/* Pagination footer */}
                {gradingFilteredEntries.length > 0 && (
                  <Item
                    variant="outline"
                    size="sm"
                    className="flex flex-wrap items-center justify-between gap-3 rounded-xl px-4 py-3"
                  >
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="outline"
                          size="sm"
                          className="font-custom focus-visible:ring-primary rounded-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
                        >
                          {limit} per page
                          <ChevronDown className="ml-1.5 h-4 w-4 shrink-0" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="start">
                        {LIMIT_OPTIONS.map((n) => (
                          <DropdownMenuItem
                            key={n}
                            onClick={() => setLimitAndResetPage(n)}
                          >
                            {n} per page
                          </DropdownMenuItem>
                        ))}
                      </DropdownMenuContent>
                    </DropdownMenu>
                    <Pagination>
                      <PaginationContent className="gap-1">
                        <PaginationItem>
                          <PaginationPrevious
                            href="#"
                            className="font-custom focus-visible:ring-primary cursor-pointer rounded-lg focus-visible:ring-2 focus-visible:ring-offset-2"
                            aria-disabled={!hasPrev}
                            onClick={(e) => {
                              e.preventDefault();
                              if (hasPrev) setPage((p) => Math.max(1, p - 1));
                            }}
                            style={
                              !hasPrev
                                ? { pointerEvents: 'none', opacity: 0.5 }
                                : undefined
                            }
                          />
                        </PaginationItem>
                        <PaginationItem>
                          <PaginationLink
                            isActive
                            href="#"
                            className="font-custom cursor-default"
                            onClick={(e) => e.preventDefault()}
                          >
                            {page} / {totalPages}
                          </PaginationLink>
                        </PaginationItem>
                        <PaginationItem>
                          <PaginationNext
                            href="#"
                            className="font-custom focus-visible:ring-primary cursor-pointer rounded-lg focus-visible:ring-2 focus-visible:ring-offset-2"
                            aria-disabled={!hasNext}
                            onClick={(e) => {
                              e.preventDefault();
                              if (hasNext)
                                setPage((p) => Math.min(totalPages, p + 1));
                            }}
                            style={
                              !hasNext
                                ? { pointerEvents: 'none', opacity: 0.5 }
                                : undefined
                            }
                          />
                        </PaginationItem>
                      </PaginationContent>
                    </Pagination>
                  </Item>
                )}
              </div>
            </TabsContent>

            <TabsContent
              value="storage"
              className="mt-0 flex flex-col gap-4 outline-none"
            >
              <TabSummaryBar
                count={0}
                icon={<Package className="text-primary h-5 w-5" />}
              />
              <div className="space-y-4">
                <TabToolbarSimple
                  addButtonLabel="Add Storage"
                  addButtonTo="/store-admin/storage"
                  addButtonIcon={<Package className="h-4 w-4 shrink-0" />}
                />
                <StorageTabContent />
              </div>
            </TabsContent>

            <TabsContent
              value="dispatch"
              className="mt-0 flex flex-col gap-4 outline-none"
            >
              <TabSummaryBar
                count={0}
                icon={<Truck className="text-primary h-5 w-5" />}
              />
              <div className="space-y-4">
                <TabToolbarSimple
                  addButtonLabel="Add Dispatch"
                  addButtonTo="/store-admin/nikasi"
                  addButtonIcon={<Truck className="h-4 w-4 shrink-0" />}
                />
                <DispatchTabContent />
              </div>
            </TabsContent>

            <TabsContent
              value="outgoing"
              className="mt-0 flex flex-col gap-4 outline-none"
            >
              <TabSummaryBar
                count={0}
                icon={<ArrowRightFromLine className="text-primary h-5 w-5" />}
              />
              <div className="space-y-4">
                <TabToolbarSimple
                  addButtonLabel="Add Outgoing"
                  addButtonTo="/store-admin/outgoing"
                  addButtonIcon={
                    <ArrowRightFromLine className="h-4 w-4 shrink-0" />
                  }
                />
                <Card>
                  <CardContent className="py-8 pt-6">
                    <Empty className="font-custom">
                      <EmptyHeader>
                        <EmptyMedia variant="icon">
                          <ArrowRightFromLine className="size-6" />
                        </EmptyMedia>
                        <EmptyTitle>No outgoing vouchers yet</EmptyTitle>
                      </EmptyHeader>
                      <EmptyContent>
                        <Button
                          className="font-custom focus-visible:ring-primary focus-visible:ring-2 focus-visible:ring-offset-2"
                          asChild
                        >
                          <Link to="/store-admin/outgoing">
                            Add Outgoing voucher
                          </Link>
                        </Button>
                      </EmptyContent>
                    </Empty>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </main>
  );
});

export default DaybookPage;
