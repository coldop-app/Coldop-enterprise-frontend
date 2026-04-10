import { memo, useMemo, useState } from 'react';
import { Link } from '@tanstack/react-router';
import {
  AlertCircle,
  History,
  MapPin,
  RefreshCw,
  Search,
  Sprout,
  User,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Item,
  ItemActions,
  ItemHeader,
  ItemMedia,
  ItemTitle,
} from '@/components/ui/item';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { useGetAllFarmerSeedEntries } from '@/services/store-admin/farmer-seed/useGetAllFarmerSeedEntries';
import type { FarmerSeedEntryListItem } from '@/types/farmer-seed';
import { cn } from '@/lib/utils';

function formatDate(dateStr: string) {
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return dateStr;
  }
}

function formatNumber(n: number) {
  return new Intl.NumberFormat('en-IN', { maximumFractionDigits: 2 }).format(n);
}

function formatAccountNumber(n: number) {
  return Number.isInteger(n) ? String(n) : formatNumber(n);
}

function getListFarmer(entry: FarmerSeedEntryListItem) {
  const link = entry.farmerStorageLinkId;
  const farmer = link?.farmerId;
  const name =
    farmer && typeof farmer.name === 'string' ? farmer.name.trim() : '';
  const address =
    farmer && typeof farmer.address === 'string' ? farmer.address.trim() : '';
  const account =
    link != null &&
    typeof link === 'object' &&
    'accountNumber' in link &&
    typeof link.accountNumber === 'number'
      ? link.accountNumber
      : null;
  return { name, address, account };
}

function compareAccountAsc(
  a: number | null | undefined,
  b: number | null | undefined
): number {
  const na = a ?? Number.POSITIVE_INFINITY;
  const nb = b ?? Number.POSITIVE_INFINITY;
  return na - nb;
}

type FarmerSeedGroup = {
  farmerStorageLinkId: string;
  entries: FarmerSeedEntryListItem[];
  account: number | null;
};

function groupEntriesByFarmerSorted(
  list: FarmerSeedEntryListItem[]
): FarmerSeedGroup[] {
  if (list.length === 0) return [];

  const grouped = Object.groupBy(
    list,
    (e) => e.farmerStorageLinkId._id
  ) as Record<string, FarmerSeedEntryListItem[]>;

  const groups: FarmerSeedGroup[] = Object.entries(grouped).map(
    ([farmerStorageLinkId, groupList]) => {
      const entries = [...groupList].sort(
        (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
      );
      const account = getListFarmer(entries[0]).account;
      return { farmerStorageLinkId, entries, account };
    }
  );

  groups.sort((a, b) => compareAccountAsc(a.account, b.account));
  return groups;
}

function FarmerGroupSectionHeader({
  entry,
  headingId,
}: {
  entry: FarmerSeedEntryListItem;
  headingId: string;
}) {
  const { name, address, account } = getListFarmer(entry);
  return (
    <div className="border-border bg-muted/30 flex flex-col gap-1 rounded-xl border px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
      <div className="flex min-w-0 gap-2">
        <User className="text-primary mt-0.5 h-5 w-5 shrink-0" />
        <div className="min-w-0">
          <h2
            id={headingId}
            className="font-custom text-base leading-snug font-semibold text-[#333] dark:text-white"
          >
            {name || 'Farmer'}
          </h2>
          {address ? (
            <p className="font-custom text-muted-foreground mt-0.5 flex items-start gap-1.5 text-sm">
              <MapPin className="mt-0.5 h-4 w-4 shrink-0" />
              <span className="leading-snug">{address}</span>
            </p>
          ) : null}
        </div>
      </div>
      {account != null ? (
        <Badge
          variant="outline"
          className="font-custom w-fit shrink-0 font-medium"
        >
          A/c {formatAccountNumber(account)}
        </Badge>
      ) : null}
    </div>
  );
}

function FarmerSeedEntryCard({
  entry,
  showFarmerBanner = true,
}: {
  entry: FarmerSeedEntryListItem;
  showFarmerBanner?: boolean;
}) {
  const gateLabel =
    entry.gatePassNo != null && Number.isFinite(Number(entry.gatePassNo))
      ? String(entry.gatePassNo)
      : '—';
  const {
    name: farmerName,
    address: farmerAddress,
    account: accountNo,
  } = getListFarmer(entry);

  return (
    <Card className="font-custom border-border flex h-full flex-col overflow-hidden rounded-xl shadow-sm">
      {showFarmerBanner ? (
        <div className="bg-muted/40 border-border border-b px-4 py-3">
          <div className="flex gap-2">
            <User className="text-primary mt-0.5 h-4 w-4 shrink-0" />
            <div className="min-w-0 flex-1 space-y-1">
              <p className="font-custom text-sm leading-snug font-semibold text-[#333] dark:text-white">
                {farmerName || 'Farmer'}
              </p>
              <div className="text-muted-foreground flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs">
                {accountNo != null ? (
                  <span className="font-custom font-medium">
                    A/c {formatAccountNumber(accountNo)}
                  </span>
                ) : null}
                {farmerAddress ? (
                  <span className="flex min-w-0 items-start gap-1">
                    <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                    <span className="leading-snug">{farmerAddress}</span>
                  </span>
                ) : null}
              </div>
            </div>
          </div>
        </div>
      ) : null}
      <CardHeader className="space-y-2 pb-3">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <CardTitle className="font-custom text-lg leading-tight font-semibold text-[#333] dark:text-white">
            {entry.variety}{' '}
            <span className="text-muted-foreground font-normal">·</span>{' '}
            {entry.generation}
          </CardTitle>
          <Badge
            variant="secondary"
            className="font-custom shrink-0 font-medium"
          >
            {formatDate(entry.date)}
          </Badge>
        </div>
        <div className="text-muted-foreground flex flex-wrap gap-x-3 gap-y-1 text-sm">
          <span>
            <span className="font-medium text-[#333] dark:text-white">
              Gate pass
            </span>
            : {gateLabel}
          </span>
          <span className="text-border hidden sm:inline">|</span>
          <span>
            <span className="font-medium text-[#333] dark:text-white">
              Invoice
            </span>
            : {entry.invoiceNumber || '—'}
          </span>
        </div>
      </CardHeader>
      <CardContent className="space-y-3 pt-0">
        <div className="overflow-x-auto rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="font-custom h-9 py-2 text-xs font-semibold">
                  Size (mm)
                </TableHead>
                <TableHead className="font-custom h-9 py-2 text-right text-xs font-semibold">
                  Bags
                </TableHead>
                <TableHead className="font-custom h-9 py-2 text-right text-xs font-semibold">
                  Rate
                </TableHead>
                <TableHead className="font-custom h-9 py-2 text-right text-xs font-semibold">
                  Acres
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(entry.bagSizes ?? []).map((bag, idx) => (
                <TableRow key={`${entry._id}-bag-${idx}`}>
                  <TableCell className="font-custom py-2 text-sm font-medium">
                    {bag.name}
                  </TableCell>
                  <TableCell className="font-custom py-2 text-right text-sm font-medium">
                    {formatNumber(bag.quantity)}
                  </TableCell>
                  <TableCell className="text-muted-foreground py-2 text-right text-sm">
                    ₹{formatNumber(bag.rate)}
                  </TableCell>
                  <TableCell className="text-muted-foreground py-2 text-right text-sm">
                    {bag.acres != null ? formatNumber(bag.acres) : '—'}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
        {entry.remarks?.trim() ? (
          <p className="font-custom text-muted-foreground border-t pt-3 text-sm leading-relaxed">
            {entry.remarks.trim()}
          </p>
        ) : null}
      </CardContent>
    </Card>
  );
}

const FarmerSeedScreen = memo(function FarmerSeedScreen() {
  const { data, isLoading, isError, error, refetch, isFetching } =
    useGetAllFarmerSeedEntries();
  const [searchQuery, setSearchQuery] = useState('');

  const entries = useMemo(() => data ?? [], [data]);

  const filtered = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return entries;
    return entries.filter((e) => {
      const { name, address, account } = getListFarmer(e);
      const hay = [
        e.variety,
        e.generation,
        e.invoiceNumber,
        e.remarks ?? '',
        String(e.gatePassNo ?? ''),
        name,
        address,
        account != null ? formatAccountNumber(account) : '',
        ...(e.bagSizes ?? []).map((b) => b.name),
      ]
        .join(' ')
        .toLowerCase();
      return hay.includes(q);
    });
  }, [entries, searchQuery]);

  const farmerGroups = useMemo(
    () => groupEntriesByFarmerSorted(filtered),
    [filtered]
  );

  return (
    <main className="mx-auto max-w-7xl p-2 sm:p-4 lg:p-6">
      <div className="space-y-6">
        <Item variant="outline" size="sm" className="rounded-xl shadow-sm">
          <ItemHeader className="h-full">
            <div className="flex items-center gap-3">
              <ItemMedia variant="icon" className="rounded-lg">
                <History className="text-primary h-5 w-5" />
              </ItemMedia>
              <ItemTitle className="font-custom text-sm font-semibold sm:text-base">
                Farmer seed history
              </ItemTitle>
            </div>
            <ItemActions className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={isFetching}
                onClick={() => refetch()}
                className="font-custom focus-visible:ring-primary h-8 gap-2 rounded-lg px-3 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
              >
                <RefreshCw
                  className={cn(
                    'h-4 w-4 shrink-0',
                    isFetching && 'animate-spin'
                  )}
                />
                <span className="hidden sm:inline">Refresh</span>
              </Button>
              <Button
                variant="default"
                size="sm"
                className="font-custom focus-visible:ring-primary h-8 gap-2 rounded-lg px-3 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
                asChild
              >
                <Link to="/store-admin/farmer-seed">
                  <Sprout className="h-4 w-4 shrink-0" />
                  Add seed
                </Link>
              </Button>
            </ItemActions>
          </ItemHeader>
        </Item>

        <Item variant="outline" size="sm" className="rounded-xl">
          <div className="relative w-full p-3 sm:p-4">
            <Search className="text-muted-foreground absolute top-1/2 left-6 h-4 w-4 -translate-y-1/2 sm:left-8" />
            <Input
              placeholder="Search by farmer, account, variety, invoice, gate pass…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="font-custom focus-visible:ring-primary pl-10 focus-visible:ring-2 focus-visible:ring-offset-2 sm:pl-11"
            />
          </div>
        </Item>

        {isLoading ? (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <Card key={i} className="overflow-hidden rounded-xl">
                <div className="bg-muted/40 border-border border-b px-4 py-3">
                  <Skeleton className="h-4 w-2/3" />
                  <Skeleton className="mt-2 h-3 w-1/2" />
                </div>
                <CardHeader className="space-y-2">
                  <Skeleton className="h-6 w-3/4" />
                  <Skeleton className="h-4 w-1/2" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-28 w-full rounded-lg" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : isError ? (
          <div className="border-destructive/30 bg-destructive/5 flex flex-col items-center justify-center rounded-xl border py-12 text-center">
            <AlertCircle className="text-destructive mb-3 h-10 w-10" />
            <p className="font-custom text-base font-medium text-[#333] dark:text-white">
              Failed to load farmer seed entries
            </p>
            <p className="font-custom text-muted-foreground mt-1 max-w-md text-sm">
              {error?.message ?? 'Something went wrong.'}
            </p>
            <Button
              variant="outline"
              size="default"
              onClick={() => refetch()}
              className="font-custom focus-visible:ring-primary mt-4 gap-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
            >
              <RefreshCw className="h-4 w-4" />
              Try again
            </Button>
          </div>
        ) : filtered.length === 0 ? (
          <div className="border-border bg-muted/30 flex flex-col items-center justify-center rounded-xl border py-16 text-center">
            <Sprout className="text-muted-foreground mb-4 h-12 w-12" />
            <p className="font-custom text-base font-medium text-[#333] dark:text-white">
              {searchQuery.trim()
                ? 'No entries match your search.'
                : 'No farmer seed entries yet.'}
            </p>
            <p className="font-custom text-muted-foreground mt-1 max-w-sm text-sm">
              {searchQuery.trim()
                ? 'Try a different search term.'
                : 'Entries you add from Add seed will appear here.'}
            </p>
            {!searchQuery.trim() ? (
              <Button
                variant="default"
                className="font-custom focus-visible:ring-primary mt-6 gap-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
                asChild
              >
                <Link to="/store-admin/farmer-seed">
                  <Sprout className="h-4 w-4 shrink-0" />
                  Add seed
                </Link>
              </Button>
            ) : null}
          </div>
        ) : (
          <>
            <p className="font-custom text-muted-foreground text-sm">
              Showing {filtered.length} of {entries.length}{' '}
              {entries.length === 1 ? 'entry' : 'entries'}
              {farmerGroups.length > 0 ? (
                <>
                  {' '}
                  · {farmerGroups.length}{' '}
                  {farmerGroups.length === 1 ? 'farmer' : 'farmers'}
                </>
              ) : null}
            </p>
            <div className="space-y-10">
              {farmerGroups.map((group) => {
                const headingId = `farmer-seed-group-${group.farmerStorageLinkId}`;
                return (
                  <section
                    key={group.farmerStorageLinkId}
                    className="space-y-4"
                    aria-labelledby={headingId}
                  >
                    <FarmerGroupSectionHeader
                      entry={group.entries[0]}
                      headingId={headingId}
                    />
                    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                      {group.entries.map((entry) => (
                        <FarmerSeedEntryCard
                          key={entry._id}
                          entry={entry}
                          showFarmerBanner={false}
                        />
                      ))}
                    </div>
                  </section>
                );
              })}
            </div>
          </>
        )}
      </div>
    </main>
  );
});

export default FarmerSeedScreen;
