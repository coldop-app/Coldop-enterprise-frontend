import { memo, useCallback, useMemo, useState } from 'react';
import { Link } from '@tanstack/react-router';
import { Card, CardContent } from '@/components/ui/card';

import {
  Item,
  ItemMedia,
  ItemTitle,
  ItemHeader,
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
  DropdownMenuCheckboxItem,
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
  Filter,
} from 'lucide-react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { useGetDaybook } from '@/services/store-admin/grading-gate-pass/useGetDaybook';
import type { DaybookEntry, DaybookGatePassType } from '@/types/daybook';
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

const DaybookEntryCard = memo(function DaybookEntryCard({
  entry,
}: DaybookEntryCardProps) {
  const incoming = entry.incoming as IncomingVoucherData | undefined;
  const farmer = entry.farmer;
  const farmerName = farmer?.name;
  const farmerAccount = farmer?.accountNumber;
  const farmerAddress = farmer?.address;
  const farmerMobile = farmer?.mobileNumber;

  return (
    <Card className="overflow-hidden">
      <Tabs defaultValue="incoming" className="w-full">
        <TabsList
          variant="line"
          className="border-border bg-muted/50 flex h-auto w-full flex-nowrap justify-start gap-1 overflow-x-auto rounded-lg border px-1 pt-0.5 pb-1"
        >
          <TabsTrigger
            value="incoming"
            className="font-custom text-muted-foreground data-[state=active]:border-primary data-[state=active]:bg-muted data-[state=active]:text-foreground data-[state=active]:after:bg-primary min-w-0 shrink-0 rounded-md px-2 py-1.5 transition-colors data-[state=active]:font-medium sm:px-4 sm:py-2"
          >
            <span className="sm:hidden">Inc</span>
            <span className="hidden sm:inline">Incoming</span>
          </TabsTrigger>
          <TabsTrigger
            value="grading"
            className="font-custom text-muted-foreground data-[state=active]:border-primary data-[state=active]:bg-muted data-[state=active]:text-foreground data-[state=active]:after:bg-primary min-w-0 shrink-0 rounded-md px-2 py-1.5 transition-colors data-[state=active]:font-medium sm:px-4 sm:py-2"
          >
            <span className="sm:hidden">Gra</span>
            <span className="hidden sm:inline">Grading</span>
          </TabsTrigger>
          <TabsTrigger
            value="storage"
            className="font-custom text-muted-foreground data-[state=active]:border-primary data-[state=active]:bg-muted data-[state=active]:text-foreground data-[state=active]:after:bg-primary min-w-0 shrink-0 rounded-md px-2 py-1.5 transition-colors data-[state=active]:font-medium sm:px-4 sm:py-2"
          >
            <span className="sm:hidden">Sto</span>
            <span className="hidden sm:inline">Storage</span>
          </TabsTrigger>
          <TabsTrigger
            value="nikasi"
            className="font-custom text-muted-foreground data-[state=active]:border-primary data-[state=active]:bg-muted data-[state=active]:text-foreground data-[state=active]:after:bg-primary min-w-0 shrink-0 rounded-md px-2 py-1.5 transition-colors data-[state=active]:font-medium sm:px-4 sm:py-2"
          >
            <span className="sm:hidden">Dis</span>
            <span className="hidden sm:inline">Nikasi</span>
          </TabsTrigger>
          <TabsTrigger
            value="outgoing"
            className="font-custom text-muted-foreground data-[state=active]:border-primary data-[state=active]:bg-muted data-[state=active]:text-foreground data-[state=active]:after:bg-primary min-w-0 shrink-0 rounded-md px-2 py-1.5 transition-colors data-[state=active]:font-medium sm:px-4 sm:py-2"
          >
            <span className="sm:hidden">Out</span>
            <span className="hidden sm:inline">Outgoing</span>
          </TabsTrigger>
        </TabsList>
        <div className="px-3 pt-2 pb-3 sm:p-4">
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
              <p className="text-muted-foreground font-custom py-6 text-center text-sm">
                No grading passes.
              </p>
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
              <p className="text-muted-foreground font-custom py-6 text-center text-sm">
                No storage passes.
              </p>
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
              <p className="text-muted-foreground font-custom py-6 text-center text-sm">
                No dispatch passes.
              </p>
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
              <p className="text-muted-foreground font-custom py-6 text-center text-sm">
                No outgoing passes.
              </p>
            )}
          </TabsContent>
        </div>
      </Tabs>
    </Card>
  );
});

const GATE_PASS_TYPE_LABELS: Record<DaybookGatePassType, string> = {
  incoming: 'Incoming',
  grading: 'Grading',
  storage: 'Storage',
  nikasi: 'Dispatch',
  outgoing: 'Outgoing',
};

const LIMIT_OPTIONS = [10, 25, 50, 100] as const;

const DaybookPage = memo(function DaybookPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [gatePassType, setGatePassType] = useState<DaybookGatePassType[]>([]);

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

  const setSortOrderAndResetPage = useCallback((order: 'asc' | 'desc') => {
    setSortOrder(order);
    setPage(1);
  }, []);

  const toggleGatePassType = useCallback((type: DaybookGatePassType) => {
    setGatePassType((prev) =>
      prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type]
    );
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
        {/* Header: count + page info + refresh */}
        <Item
          variant="outline"
          size="sm"
          className="rounded-xl px-3 shadow-sm sm:px-4"
        >
          <ItemHeader className="h-full flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2 sm:gap-3">
              <ItemMedia variant="icon" className="shrink-0 rounded-lg">
                <Receipt className="text-primary h-5 w-5" />
              </ItemMedia>
              <ItemTitle className="font-custom min-w-0 text-sm font-semibold sm:text-base">
                {totalCount} {totalCount === 1 ? 'voucher' : 'vouchers'}
                {totalPages > 1 && (
                  <span className="font-custom text-muted-foreground font-normal">
                    {' '}
                    · Page {page} of {totalPages}
                  </span>
                )}
              </ItemTitle>
            </div>
            <ItemActions className="w-full shrink-0 sm:w-auto">
              <Button
                variant="outline"
                size="sm"
                disabled={isFetching}
                onClick={() => refetch()}
                className="font-custom h-10 min-h-10 w-full gap-2 rounded-lg px-3 sm:h-8 sm:min-h-0 sm:w-auto"
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

        {/* Search + filters row + Add Incoming */}
        <Item
          variant="outline"
          size="sm"
          className="flex-col items-stretch gap-4 rounded-xl px-3 sm:px-4"
        >
          <div className="relative w-full">
            <Search className="text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
            <Input
              placeholder="Search by voucher number, date..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="font-custom focus-visible:ring-primary min-h-10 w-full pl-10 focus-visible:ring-2 focus-visible:ring-offset-2 sm:min-h-9"
            />
          </div>
          <ItemFooter className="flex flex-col gap-3">
            <div className="flex w-full flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      className="font-custom focus-visible:ring-primary h-10 min-h-10 rounded-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 sm:h-8 sm:min-h-0"
                    >
                      <span className="hidden sm:inline">Date: </span>
                      {sortOrder === 'desc' ? 'Newest first' : 'Oldest first'}
                      <ChevronDown className="ml-1.5 h-4 w-4 shrink-0" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start">
                    <DropdownMenuItem
                      onClick={() => setSortOrderAndResetPage('desc')}
                    >
                      Newest first
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => setSortOrderAndResetPage('asc')}
                    >
                      Oldest first
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      className="font-custom focus-visible:ring-primary h-10 min-h-10 rounded-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 sm:h-8 sm:min-h-0"
                    >
                      <Filter className="mr-1.5 h-4 w-4 shrink-0" />
                      <span className="hidden sm:inline">
                        {gatePassType.length > 0
                          ? `Filter: ${gatePassType.length} type(s)`
                          : 'Filter by type'}
                      </span>
                      <ChevronDown className="ml-1.5 h-4 w-4 shrink-0" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start" className="min-w-40">
                    {(
                      Object.keys(
                        GATE_PASS_TYPE_LABELS
                      ) as DaybookGatePassType[]
                    ).map((type) => (
                      <DropdownMenuCheckboxItem
                        key={type}
                        checked={gatePassType.includes(type)}
                        onCheckedChange={() => toggleGatePassType(type)}
                      >
                        {GATE_PASS_TYPE_LABELS[type]}
                      </DropdownMenuCheckboxItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
              <Button
                className="font-custom h-10 min-h-10 w-full shrink-0 rounded-lg sm:h-9 sm:min-h-0 sm:w-auto"
                asChild
              >
                <Link to="/store-admin/incoming" className="justify-center">
                  <ArrowUpFromLine className="h-4 w-4 shrink-0" />
                  Add Incoming
                </Link>
              </Button>
            </div>
          </ItemFooter>
        </Item>

        {/* List: one tabbed card per daybook entry */}
        {isLoading ? (
          <Card>
            <CardContent className="py-8 pt-6 text-center">
              <p className="font-custom text-muted-foreground">
                Loading vouchers...
              </p>
            </CardContent>
          </Card>
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
