import { useCallback, useMemo, useState } from 'react';
import {
  createFileRoute,
  useParams,
  useRouterState,
} from '@tanstack/react-router';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
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
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Search,
  ChevronDown,
  RefreshCw,
  Receipt,
  ArrowUpFromLine,
  Layers,
  Warehouse,
  Truck,
  ArrowDownToLine,
  Hash,
  Package,
  Edit,
} from 'lucide-react';
import type { FarmerStorageLink } from '@/types/farmer';
import type {
  DaybookEntry,
  DaybookGatePassType,
  DaybookEntrySummaries,
} from '@/types/daybook';
import { useGetFarmerStorageLinkVouchers } from '@/services/store-admin/people/useGetFarmerStorageLinkVouchers';
import { DaybookEntryCard } from '@/components/daybook';
import {
  totalBagsFromOrderDetails,
  type PassVoucherData,
} from '@/components/daybook/vouchers';

export const Route = createFileRoute(
  '/store-admin/_authenticated/people/$farmerStorageLinkId/'
)({
  component: PeopleDetailPage,
});

const GATE_PASS_TYPE_OPTIONS_PAGE: {
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

function PeopleDetailPage() {
  const { farmerStorageLinkId } = useParams({ from: Route.id });
  const link = useRouterState({
    select: (state) =>
      (state.location.state as { link?: FarmerStorageLink } | undefined)?.link,
  });

  const [searchQuery, setSearchQuery] = useState('');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [sortBy, setSortBy] = useState<'Date' | 'Voucher Number'>('Date');
  const [gatePassType, setGatePassType] = useState<DaybookGatePassType[]>([]);

  const toggleGatePassType = useCallback((type: DaybookGatePassType) => {
    setGatePassType((prev) => {
      const next = prev.includes(type)
        ? prev.filter((t) => t !== type)
        : [...prev, type].sort(
            (a, b) =>
              GATE_PASS_TYPE_OPTIONS_PAGE.findIndex((o) => o.value === a) -
              GATE_PASS_TYPE_OPTIONS_PAGE.findIndex((o) => o.value === b)
          );
      return next;
    });
  }, []);

  const {
    data: vouchersData,
    isLoading,
    isFetching,
    refetch,
  } = useGetFarmerStorageLinkVouchers(farmerStorageLinkId);

  const daybook = useMemo(
    () => vouchersData?.daybook ?? [],
    [vouchersData?.daybook]
  );

  const filteredAndSortedEntries: DaybookEntry[] = useMemo(() => {
    let list = daybook;

    if (gatePassType.length > 0) {
      list = list.filter((entry) => {
        if (gatePassType.includes('incoming')) return true;
        if (
          gatePassType.includes('grading') &&
          (entry.gradingPasses?.length ?? 0) > 0
        )
          return true;
        if (
          gatePassType.includes('storage') &&
          (entry.storagePasses?.length ?? 0) > 0
        )
          return true;
        if (
          gatePassType.includes('nikasi') &&
          (entry.nikasiPasses?.length ?? 0) > 0
        )
          return true;
        if (
          gatePassType.includes('outgoing') &&
          (entry.outgoingPasses?.length ?? 0) > 0
        )
          return true;
        return false;
      });
    }

    const normalizedQuery = searchQuery.trim().toLowerCase();
    if (normalizedQuery) {
      list = list.filter((entry) => {
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
    }

    list = [...list].sort((a, b) => {
      const incA = a.incoming as { date?: string; gatePassNo?: number };
      const incB = b.incoming as { date?: string; gatePassNo?: number };
      if (sortBy === 'Date') {
        const dateA = incA.date ? new Date(incA.date).getTime() : 0;
        const dateB = incB.date ? new Date(incB.date).getTime() : 0;
        return sortOrder === 'asc' ? dateA - dateB : dateB - dateA;
      }
      const noA = incA.gatePassNo ?? 0;
      const noB = incB.gatePassNo ?? 0;
      return sortOrder === 'asc' ? noA - noB : noB - noA;
    });

    return list;
  }, [daybook, searchQuery, sortBy, sortOrder, gatePassType]);

  const totalCount = filteredAndSortedEntries.length;

  const aggregateBags = useMemo(() => {
    const acc: DaybookEntrySummaries = {
      totalBagsIncoming: 0,
      totalBagsGraded: 0,
      totalBagsStored: 0,
      totalBagsNikasi: 0,
      totalBagsOutgoing: 0,
    };
    for (const entry of daybook) {
      const s = entry.summaries ?? ({} as DaybookEntrySummaries);
      acc.totalBagsIncoming += s.totalBagsIncoming ?? 0;
      acc.totalBagsGraded += s.totalBagsGraded ?? 0;
      acc.totalBagsStored += s.totalBagsStored ?? 0;
      // API may not populate summaries.totalBagsNikasi; compute from nikasi passes (Dispatch)
      const nikasiBags = (entry.nikasiPasses ?? []).reduce<number>(
        (sum, pass) =>
          sum +
          totalBagsFromOrderDetails((pass as PassVoucherData).orderDetails),
        0
      );
      acc.totalBagsNikasi += nikasiBags;
      // API may not populate summaries.totalBagsOutgoing; compute from outgoing passes
      const outgoingBags = (entry.outgoingPasses ?? []).reduce<number>(
        (sum, pass) =>
          sum +
          totalBagsFromOrderDetails((pass as PassVoucherData).orderDetails),
        0
      );
      acc.totalBagsOutgoing += outgoingBags;
    }
    return acc;
  }, [daybook]);

  // Get initials for avatar
  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  if (!link) {
    return (
      <main className="mx-auto max-w-300 px-4 pt-6 pb-16 sm:px-8 sm:py-24">
        <p className="font-custom text-muted-foreground">Farmer not found.</p>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-7xl p-3 sm:p-4 lg:p-6">
      <div className="space-y-4 sm:space-y-6">
        {/* Enhanced Farmer info card */}
        <Card className="overflow-hidden rounded-2xl shadow-lg">
          <CardContent className="p-6 sm:p-8">
            <div className="space-y-8">
              {/* Header with Avatar and Name */}
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-4">
                  <Avatar className="h-20 w-20 shadow-lg sm:h-24 sm:w-24">
                    <AvatarFallback className="bg-primary text-primary-foreground text-2xl font-bold sm:text-3xl">
                      {getInitials(link.farmerId.name)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="space-y-2">
                    <h1 className="font-custom text-2xl font-bold tracking-tight sm:text-3xl">
                      {link.farmerId.name}
                    </h1>
                    {/* {link.isActive && (
                      <Badge variant="secondary" className="w-fit">
                        Active
                      </Badge>
                    )} */}
                    <Badge variant="secondary" className="w-fit">
                      <Hash />
                      {link.accountNumber}
                    </Badge>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-10 w-10 rounded-full"
                >
                  <Edit className="h-4 w-4" />
                </Button>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap gap-3">
                <Button variant="default" className="gap-2 rounded-xl">
                  <Package className="h-4 w-4" />
                  View Stock Ledger
                </Button>
              </div>

              <Separator />

              {/* Info Grid */}
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
                {/* Total Bags (Incoming) */}
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="bg-primary/10 dark:bg-primary/20 flex h-12 w-12 items-center justify-center rounded-xl">
                      <ArrowUpFromLine className="text-primary h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
                        Incoming
                      </p>
                      <p className="font-custom text-xl font-bold">
                        {aggregateBags.totalBagsIncoming.toLocaleString(
                          'en-IN'
                        )}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Total Bags (Graded) */}
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="bg-primary/10 dark:bg-primary/20 flex h-12 w-12 items-center justify-center rounded-xl">
                      <Layers className="text-primary h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
                        Grading
                      </p>
                      <p className="font-custom text-xl font-bold">
                        {aggregateBags.totalBagsGraded.toLocaleString('en-IN')}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Total Bags (Stored) */}
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="bg-primary/10 dark:bg-primary/20 flex h-12 w-12 items-center justify-center rounded-xl">
                      <Warehouse className="text-primary h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
                        Storage
                      </p>
                      <p className="font-custom text-xl font-bold">
                        {aggregateBags.totalBagsStored.toLocaleString('en-IN')}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Total Bags (Dispatch) – Dispatch is the display name for nikasi; value is totalBagsNikasi */}
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="bg-primary/10 dark:bg-primary/20 flex h-12 w-12 items-center justify-center rounded-xl">
                      <Truck className="text-primary h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
                        Dispatch
                      </p>
                      <p className="font-custom text-xl font-bold">
                        {aggregateBags.totalBagsNikasi.toLocaleString('en-IN')}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Total Bags (Outgoing) */}
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="bg-primary/10 dark:bg-primary/20 flex h-12 w-12 items-center justify-center rounded-xl">
                      <ArrowDownToLine className="text-primary h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
                        Outgoing
                      </p>
                      <p className="font-custom text-xl font-bold">
                        {aggregateBags.totalBagsOutgoing.toLocaleString(
                          'en-IN'
                        )}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Total Bags Combined - Highlighted */}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Header: voucher count + refresh */}
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

          {/* Search + sort + filter */}
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
                    <DropdownMenuItem onClick={() => setSortOrder('asc')}>
                      Ascending
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setSortOrder('desc')}>
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
                        (GATE_PASS_TYPE_OPTIONS_PAGE.find(
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
                    {GATE_PASS_TYPE_OPTIONS_PAGE.map((opt) => (
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
      </div>
    </main>
  );
}
