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
  DropdownMenuCheckboxItem,
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
import { Skeleton } from '@/components/ui/skeleton';
import {
  Empty,
  EmptyHeader,
  EmptyTitle,
  EmptyContent,
  EmptyMedia,
} from '@/components/ui/empty';
import { useGetDaybook } from '@/services/store-admin/grading-gate-pass/useGetDaybook';
import type { DaybookEntry, DaybookGatePassType } from '@/types/daybook';
import EntrySummariesBar from './EntrySummariesBar';
import {
  IncomingVoucher,
  GradingVoucher,
  StorageVoucher,
  NikasiVoucher,
  OutgoingVoucher,
  type IncomingVoucherData,
  type PassVoucherData,
} from './vouchers';

interface DaybookEntryCardProps {
  entry: DaybookEntry;
}

const PIPELINE_STAGES = 5; // Incoming → Grading → Storage → Nikasi → Outgoing

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

function getPipelineProgress(entry: DaybookEntry): number {
  let completedStages = 1; // Incoming is always present when we have an entry
  if ((entry.gradingPasses?.length ?? 0) > 0) completedStages = 2;
  if ((entry.storagePasses?.length ?? 0) > 0) completedStages = 3;
  if ((entry.nikasiPasses?.length ?? 0) > 0) completedStages = 4;
  if ((entry.outgoingPasses?.length ?? 0) > 0) completedStages = 5;
  return Math.round((completedStages / PIPELINE_STAGES) * 100);
}

const DaybookEntryCard = memo(function DaybookEntryCard({
  entry,
}: DaybookEntryCardProps) {
  const incoming = entry.incoming as IncomingVoucherData | undefined;
  const farmer = entry.farmer;
  const farmerName = farmer?.name;
  const farmerAccount = farmer?.accountNumber;
  const farmerAddress = farmer?.address;
  const farmerMobile = farmer?.mobileNumber;
  const progressValue = getPipelineProgress(entry);

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
  const storageSearch = farmerStorageLinkId
    ? { farmerStorageLinkId }
    : undefined;
  const nikasiSearch = farmerStorageLinkId
    ? { farmerStorageLinkId }
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
      <EntrySummariesBar summaries={entry.summaries} />
      <Tabs defaultValue="incoming" className="w-full">
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
          <TabsTrigger
            value="storage"
            className="min-w-0 flex-1 shrink-0 px-3 sm:px-4"
          >
            <span className="sm:hidden">Sto</span>
            <span className="hidden sm:inline">Storage</span>
          </TabsTrigger>
          <TabsTrigger
            value="nikasi"
            className="min-w-0 flex-1 shrink-0 px-3 sm:px-4"
          >
            <span className="sm:hidden">Dis</span>
            <span className="hidden sm:inline">Dispatch</span>
          </TabsTrigger>
          <TabsTrigger
            value="outgoing"
            className="min-w-0 flex-1 shrink-0 px-3 sm:px-4"
          >
            <span className="sm:hidden">Out</span>
            <span className="hidden sm:inline">Outgoing</span>
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
          <TabsContent value="storage" className="mt-0 outline-none">
            {entry.storagePasses.length > 0 ? (
              <div className="space-y-4">
                {(entry.storagePasses as PassVoucherData[]).map((pass) => (
                  <StorageVoucher
                    key={pass._id ?? String(pass.gatePassNo)}
                    voucher={pass}
                    farmerName={farmerName}
                    farmerAccount={farmerAccount}
                  />
                ))}
              </div>
            ) : (
              <Empty className="font-custom py-6">
                <EmptyHeader>
                  <EmptyMedia variant="icon">
                    <Package className="size-6" />
                  </EmptyMedia>
                  <EmptyTitle>No Storage voucher is present</EmptyTitle>
                </EmptyHeader>
                <EmptyContent>
                  <Button
                    className="font-custom focus-visible:ring-primary focus-visible:ring-2 focus-visible:ring-offset-2"
                    asChild
                  >
                    <Link to="/store-admin/storage" search={storageSearch}>
                      Add Storage voucher
                    </Link>
                  </Button>
                </EmptyContent>
              </Empty>
            )}
          </TabsContent>
          <TabsContent value="nikasi" className="mt-0 outline-none">
            {entry.nikasiPasses.length > 0 ? (
              <div className="space-y-4">
                {(entry.nikasiPasses as PassVoucherData[]).map((pass) => (
                  <NikasiVoucher
                    key={pass._id ?? String(pass.gatePassNo)}
                    voucher={pass}
                    farmerName={farmerName}
                    farmerAccount={farmerAccount}
                  />
                ))}
              </div>
            ) : (
              <Empty className="font-custom py-6">
                <EmptyHeader>
                  <EmptyMedia variant="icon">
                    <Truck className="size-6" />
                  </EmptyMedia>
                  <EmptyTitle>No Dispatch voucher is present</EmptyTitle>
                </EmptyHeader>
                <EmptyContent>
                  <Button
                    className="font-custom focus-visible:ring-primary focus-visible:ring-2 focus-visible:ring-offset-2"
                    asChild
                  >
                    <Link to="/store-admin/nikasi" search={nikasiSearch}>
                      Add Dispatch voucher
                    </Link>
                  </Button>
                </EmptyContent>
              </Empty>
            )}
          </TabsContent>
          <TabsContent value="outgoing" className="mt-0 outline-none">
            {entry.outgoingPasses.length > 0 ? (
              <div className="space-y-4">
                {(entry.outgoingPasses as PassVoucherData[]).map((pass) => (
                  <OutgoingVoucher
                    key={pass._id ?? String(pass.gatePassNo)}
                    voucher={pass}
                    farmerName={farmerName}
                    farmerAccount={farmerAccount}
                  />
                ))}
              </div>
            ) : (
              <Empty className="font-custom py-6">
                <EmptyHeader>
                  <EmptyMedia variant="icon">
                    <ArrowRightFromLine className="size-6" />
                  </EmptyMedia>
                  <EmptyTitle>No Outgoing voucher is present</EmptyTitle>
                </EmptyHeader>
                <EmptyContent>
                  <Button
                    className="font-custom focus-visible:ring-primary focus-visible:ring-2 focus-visible:ring-offset-2"
                    asChild
                  >
                    <Link to="/store-admin/outgoing">Add Outgoing voucher</Link>
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

const LIMIT_OPTIONS = [10, 25, 50, 100] as const;

const GATE_PASS_TYPE_OPTIONS: {
  value: DaybookGatePassType;
  label: string;
  shortLabel: string;
}[] = [
  { value: 'incoming', label: 'Incoming', shortLabel: 'Inc' },
  { value: 'grading', label: 'Grading', shortLabel: 'Gra' },
  { value: 'storage', label: 'Storage', shortLabel: 'Sto' },
  { value: 'nikasi', label: 'Dispatch', shortLabel: 'Dis' },
  { value: 'outgoing', label: 'Outgoing', shortLabel: 'Out' },
];

const DaybookPage = memo(function DaybookPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [sortBy, setSortBy] = useState<'Date' | 'Voucher Number'>('Date');
  const [gatePassType, setGatePassType] = useState<DaybookGatePassType[]>([]);

  const toggleGatePassType = useCallback((type: DaybookGatePassType) => {
    setGatePassType((prev) => {
      const next = prev.includes(type)
        ? prev.filter((t) => t !== type)
        : [...prev, type].sort(
            (a, b) =>
              GATE_PASS_TYPE_OPTIONS.findIndex((o) => o.value === a) -
              GATE_PASS_TYPE_OPTIONS.findIndex((o) => o.value === b)
          );
      return next;
    });
    setPage(1);
  }, []);

  const queryParams = useMemo(
    () => ({
      page,
      limit,
      sortOrder,
      gatePassType: gatePassType.length > 0 ? gatePassType : undefined,
    }),
    [page, limit, sortOrder, gatePassType]
  );

  const {
    data: daybookData,
    isLoading,
    isFetching,
    refetch,
  } = useGetDaybook(queryParams);

  const daybook = useMemo(
    () => daybookData?.daybook ?? [],
    [daybookData?.daybook]
  );
  const pagination = daybookData?.pagination;

  const setLimitAndResetPage = useCallback((newLimit: number) => {
    setLimit(newLimit);
    setPage(1);
  }, []);

  const filteredAndSortedEntries: DaybookEntry[] = useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLowerCase();
    if (!normalizedQuery) return daybook;
    return daybook.filter((entry) => {
      const inc = entry.incoming as {
        gatePassNo?: number;
        date?: string;
        farmerStorageLinkId?: { farmerId?: { name?: string } };
      };
      const farmerName =
        inc.farmerStorageLinkId?.farmerId?.name?.toLowerCase() ?? '';
      const voucherNo = String(inc.gatePassNo ?? '');
      const date = inc.date
        ? new Date(inc.date).toLocaleDateString('en-IN')
        : '';
      return (
        farmerName.includes(normalizedQuery) ||
        voucherNo.includes(normalizedQuery) ||
        date.includes(normalizedQuery)
      );
    });
  }, [daybook, searchQuery]);

  const totalCount = pagination?.total ?? filteredAndSortedEntries.length;
  const totalPages = pagination?.totalPages ?? 1;
  const hasPrev = page > 1;
  const hasNext = page < totalPages;

  return (
    <main className="mx-auto max-w-7xl p-3 sm:p-4 lg:p-6">
      <div className="space-y-4 sm:space-y-6">
        {/* Header: voucher count + refresh, then search + sort + add */}
        <div className="flex flex-col gap-4">
          <Item variant="outline" size="sm" className="rounded-xl shadow-sm">
            <ItemHeader className="h-full">
              <div className="flex items-center gap-3">
                <ItemMedia variant="icon" className="rounded-lg">
                  <Receipt className="text-primary h-5 w-5" />
                </ItemMedia>
                <ItemTitle className="font-custom text-sm font-semibold sm:text-base">
                  {totalCount} {totalCount === 1 ? 'voucher' : 'vouchers'}
                </ItemTitle>
              </div>
              <ItemActions>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={isFetching}
                  onClick={() => refetch()}
                  className="font-custom h-8 gap-2 rounded-lg px-3"
                >
                  <RefreshCw
                    className={`h-4 w-4 shrink-0 ${
                      isFetching ? 'animate-spin' : ''
                    }`}
                  />
                  <span className="hidden sm:inline">Refresh</span>
                </Button>
              </ItemActions>
            </ItemHeader>
          </Item>

          {/* Search + sort + add */}
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
              <div className="flex w-full flex-col gap-3 sm:flex-1 sm:flex-row sm:flex-nowrap sm:items-center sm:gap-4">
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
                    <DropdownMenuItem
                      onClick={() => setSortBy('Voucher Number')}
                    >
                      Voucher Number
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => {
                        setSortOrder('asc');
                        setPage(1);
                      }}
                    >
                      Ascending
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => {
                        setSortOrder('desc');
                        setPage(1);
                      }}
                    >
                      Descending
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="outline"
                      className="font-custom focus-visible:ring-primary w-full min-w-0 rounded-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 sm:w-auto sm:min-w-40"
                    >
                      <span className="hidden sm:inline">Filter: </span>
                      <span className="sm:hidden">Type: </span>
                      {gatePassType.length === 0 ? (
                        'All'
                      ) : gatePassType.length === 1 ? (
                        (GATE_PASS_TYPE_OPTIONS.find(
                          (o) => o.value === gatePassType[0]
                        )?.label ?? 'All')
                      ) : (
                        <span className="truncate">
                          {gatePassType.length} types
                        </span>
                      )}
                      <ChevronDown className="ml-2 h-4 w-4 shrink-0" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start" className="font-custom">
                    {GATE_PASS_TYPE_OPTIONS.map((opt) => (
                      <DropdownMenuCheckboxItem
                        key={opt.value}
                        checked={gatePassType.includes(opt.value)}
                        onCheckedChange={() => toggleGatePassType(opt.value)}
                      >
                        {opt.label}
                      </DropdownMenuCheckboxItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
              <Button
                className="font-custom h-10 w-full shrink-0 sm:w-auto"
                asChild
              >
                <Link to="/store-admin/incoming">
                  <ArrowUpFromLine className="h-4 w-4 shrink-0" />
                  Add Incoming
                </Link>
              </Button>
            </ItemFooter>
          </Item>
        </div>

        {/* List: one tabbed card per daybook entry */}
        {isLoading ? (
          <div className="space-y-6">
            {[...Array(3)].map((_, i) => (
              <Card key={i} className="overflow-hidden p-0">
                <div className="border-border bg-muted/30 px-3 py-2 sm:px-4 sm:py-2.5">
                  <div className="flex items-center justify-between gap-2">
                    <Skeleton className="h-4 w-16" />
                    <Skeleton className="h-4 w-8" />
                  </div>
                  <Skeleton className="mt-1.5 h-2 w-full rounded-full" />
                </div>
                <div className="space-y-2 border-b px-4 py-3">
                  <div className="flex gap-4">
                    {[...Array(4)].map((__, j) => (
                      <Skeleton key={j} className="h-4 w-14" />
                    ))}
                  </div>
                </div>
                <div className="p-4">
                  <div className="flex gap-2">
                    {[...Array(5)].map((__, j) => (
                      <Skeleton key={j} className="h-9 flex-1 rounded-lg" />
                    ))}
                  </div>
                  <div className="mt-4 space-y-3">
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-[80%]" />
                    <Skeleton className="h-4 w-3/4" />
                  </div>
                </div>
              </Card>
            ))}
          </div>
        ) : filteredAndSortedEntries.length === 0 ? (
          <Card>
            <CardContent className="py-8 pt-6 text-center">
              <p className="font-custom text-muted-foreground">
                No vouchers yet.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            {filteredAndSortedEntries.map((entry, idx) => (
              <DaybookEntryCard
                key={
                  (entry.incoming as { _id?: string })?._id ??
                  entry.farmer?._id ??
                  `entry-${idx}`
                }
                entry={entry}
              />
            ))}
          </div>
        )}

        {/* Pagination footer */}
        {!isLoading && daybookData != null && (
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
                      if (hasNext) setPage((p) => Math.min(totalPages, p + 1));
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
    </main>
  );
});

export default DaybookPage;
