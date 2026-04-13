import { memo, useState, useMemo, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { Link, useNavigate } from '@tanstack/react-router';
import { toast } from 'sonner';
import { useGetAllFarmers } from '@/services/store-admin/functions/useGetAllFarmers';
import { useGetContractFarmingReport } from '@/services/store-admin/analytics/Contract-farming-report/useGetContractFarmingReport';
import type { FarmerStorageLink } from '@/types/farmer';
import { useStore } from '@/stores/store';

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import {
  Item,
  ItemMedia,
  ItemTitle,
  ItemHeader,
  ItemActions,
  ItemFooter,
} from '@/components/ui/item';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

import { AddFarmerModal } from '@/components/forms/add-farmer-modal';
import {
  ContractFarmingReportDigitalTable,
  type ContractFarmingReportDigitalVarietyGroup,
} from '@/components/people/ContractFarmingReportDigitalTable';
import {
  User,
  Phone,
  MapPin,
  CheckCircle2,
  XCircle,
  Search,
  ChevronDown,
  RefreshCw,
  Sprout,
  FileBarChart,
  Eye,
  EyeOff,
} from 'lucide-react';

const PeoplePage = memo(function PeoplePage() {
  const { data, isLoading, error, refetch, isFetching } = useGetAllFarmers();
  const {
    data: cfReportData,
    isLoading: isCfReportLoading,
    isError: isCfReportError,
    error: cfReportError,
  } = useGetContractFarmingReport();
  const coldStorage = useStore((s) => s.coldStorage);
  const companyName = coldStorage?.name ?? 'Cold Storage';

  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'Name' | 'Account Number'>('Name');
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [isGeneratingCfReportPdf, setIsGeneratingCfReportPdf] = useState(false);
  const [showContractFarmingTable, setShowContractFarmingTable] =
    useState(true);

  const handleSearchFocus = useCallback(() => setIsSearchFocused(true), []);
  const handleSearchBlur = useCallback(() => setIsSearchFocused(false), []);

  const handleOpenContractFarmingReportPdf = useCallback(async () => {
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(
        '<html><body style="font-family:sans-serif;padding:2rem;text-align:center;color:#666;">Generating PDF…</body></html>'
      );
    }
    setIsGeneratingCfReportPdf(true);
    const dateRangeLabel = `As of ${new Date().toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })}`;
    try {
      const [{ pdf }, { ContractFarmingReportPdf }] = await Promise.all([
        import('@react-pdf/renderer'),
        import('@/components/pdf/contract-farming-report/contract-farming-report-pdf'),
      ]);
      const blob = await pdf(
        <ContractFarmingReportPdf
          companyName={companyName}
          dateRangeLabel={dateRangeLabel}
          reportTitle="Contract Farming Report"
        />
      ).toBlob();
      const url = URL.createObjectURL(blob);
      if (printWindow) {
        printWindow.location.href = url;
      } else {
        window.location.href = url;
      }
      setTimeout(() => URL.revokeObjectURL(url), 60_000);
      toast.success('PDF opened in new tab', {
        description: 'Contract farming report is ready to view or print.',
      });
    } catch {
      printWindow?.close();
      toast.error('Could not generate PDF', {
        description: 'Please try again.',
      });
    } finally {
      setIsGeneratingCfReportPdf(false);
    }
  }, [companyName]);

  const links = useMemo(() => data ?? [], [data]);

  const filteredLinks = useMemo(() => {
    let result = links;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (link) =>
          link.farmerId.name.toLowerCase().includes(q) ||
          link.farmerId.mobileNumber.includes(q) ||
          link.accountNumber.toString().includes(q) ||
          link.farmerId.address.toLowerCase().includes(q)
      );
    }

    const sorted = [...result].sort((a, b) => {
      if (sortBy === 'Name')
        return a.farmerId.name.localeCompare(b.farmerId.name);
      return a.accountNumber - b.accountNumber;
    });

    return sorted;
  }, [links, searchQuery, sortBy]);

  const contractFarmingGroups =
    useMemo((): ContractFarmingReportDigitalVarietyGroup[] => {
      const by = cfReportData?.byVariety;
      if (!by) return [];
      return Object.entries(by)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([variety, farmers]) => ({
          variety,
          rows: [...farmers].sort((x, y) => x.name.localeCompare(y.name)),
        }));
    }, [cfReportData]);

  if (isLoading) {
    return (
      <main className="mx-auto max-w-7xl p-2 sm:p-4 lg:p-6">
        <div className="space-y-6">
          <Skeleton className="h-12 w-48 rounded-xl" />
          <Skeleton className="h-24 w-full rounded-xl" />
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[...Array(6)].map((_, i) => (
              <Card key={i} className="overflow-hidden">
                <CardHeader>
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-3">
                      <Skeleton className="h-10 w-10 shrink-0 rounded-full" />
                      <div className="min-w-0 space-y-2">
                        <Skeleton className="h-5 w-32" />
                        <Skeleton className="h-4 w-20" />
                      </div>
                    </div>
                    <Skeleton className="h-6 w-14 rounded-full" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-3/4" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </main>
    );
  }

  if (error) {
    return (
      <main className="mx-auto max-w-300 px-4 pt-6 pb-16 sm:px-8 sm:py-24">
        <Card>
          <CardContent className="pt-6">
            <p className="font-custom text-destructive">
              Error loading farmers. Please try again.
            </p>
          </CardContent>
        </Card>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-7xl p-2 sm:p-4 lg:p-6">
      <div className="space-y-6">
        {/* Header: count + refresh */}
        <Item variant="outline" size="sm" className="rounded-xl shadow-sm">
          <ItemHeader className="h-full">
            <div className="flex items-center gap-3">
              <ItemMedia variant="icon" className="rounded-lg">
                <User className="text-primary h-5 w-5" />
              </ItemMedia>
              <ItemTitle className="font-custom text-sm font-semibold sm:text-base">
                {links.length} farmers
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
              placeholder="Search by name, mobile, account number, or address..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={handleSearchFocus}
              onBlur={handleSearchBlur}
              className="font-custom focus-visible:ring-primary w-full pl-10 focus-visible:ring-2 focus-visible:ring-offset-2"
            />
          </div>
          <ItemFooter
            className={cn(
              'flex-col gap-3 sm:flex-row sm:items-center sm:justify-between',
              isSearchFocused && 'max-sm:hidden'
            )}
          >
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  className="font-custom focus-visible:ring-primary w-full rounded-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 sm:w-auto"
                >
                  Sort by: {sortBy}
                  <ChevronDown className="ml-2 h-4 w-4 shrink-0" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem onClick={() => setSortBy('Name')}>
                  Name
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setSortBy('Account Number')}>
                  Account Number
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:justify-end sm:gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() =>
                  setShowContractFarmingTable((visible) => !visible)
                }
                aria-pressed={showContractFarmingTable}
                aria-label={
                  showContractFarmingTable
                    ? 'Hide contract farming table'
                    : 'Show contract farming table'
                }
                className="font-custom focus-visible:ring-primary h-10 w-full shrink-0 gap-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 sm:w-auto"
              >
                {showContractFarmingTable ? (
                  <EyeOff className="h-4 w-4 shrink-0" />
                ) : (
                  <Eye className="h-4 w-4 shrink-0" />
                )}
                {showContractFarmingTable ? 'Hide' : 'Show'} C.F. table
              </Button>
              <Button
                type="button"
                variant="outline"
                disabled={isGeneratingCfReportPdf}
                onClick={handleOpenContractFarmingReportPdf}
                className="font-custom focus-visible:ring-primary h-10 w-full shrink-0 gap-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 sm:w-auto"
              >
                <FileBarChart className="h-4 w-4 shrink-0" />
                C.F. Report
              </Button>
              <Button
                variant="outline"
                className="font-custom focus-visible:ring-primary h-10 w-full shrink-0 gap-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 sm:w-auto"
                asChild
              >
                <Link to="/store-admin/farmer-seed">
                  <Sprout className="h-4 w-4 shrink-0" />
                  Add Seed
                </Link>
              </Button>
              <AddFarmerModal links={links} />
            </div>
          </ItemFooter>
        </Item>

        {showContractFarmingTable ? (
          <ContractFarmingReportDigitalTable
            isLoading={isCfReportLoading}
            isError={isCfReportError}
            error={cfReportError}
            groups={contractFarmingGroups}
            companyName={companyName}
          />
        ) : null}

        {/* List */}
        {filteredLinks.length === 0 ? (
          <Card>
            <CardContent className="py-8 pt-6 text-center">
              <p className="font-custom text-muted-foreground">
                {searchQuery
                  ? 'No farmers match your search.'
                  : 'No farmers registered yet.'}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filteredLinks.map((link) => (
              <FarmerCard key={link._id} link={link} />
            ))}
          </div>
        )}
      </div>
    </main>
  );
});

interface FarmerCardProps {
  link: FarmerStorageLink;
}

const FarmerCard = memo(function FarmerCard({ link }: FarmerCardProps) {
  const navigate = useNavigate();
  const { farmerId, accountNumber, isActive } = link;

  const handleClick = () => {
    navigate({
      to: '/store-admin/people/$farmerStorageLinkId',
      params: { farmerStorageLinkId: link._id },
      state: { link } as Record<string, unknown>,
    });
  };

  return (
    <div onClick={handleClick} className="block cursor-pointer">
      <Card className="focus-within:ring-primary rounded-xl transition-all duration-200 ease-in-out focus-within:ring-2 focus-within:ring-offset-2 hover:-translate-y-1 hover:shadow-xl">
        <CardHeader>
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-3">
              <div className="bg-primary/10 flex h-10 w-10 shrink-0 items-center justify-center rounded-full">
                <User className="text-primary h-5 w-5" />
              </div>
              <div className="min-w-0">
                <CardTitle className="font-custom text-lg font-semibold">
                  {farmerId.name}
                </CardTitle>
                <CardDescription className="font-custom mt-1">
                  Account #{accountNumber}
                </CardDescription>
              </div>
            </div>
            <div
              className={`font-custom flex shrink-0 items-center gap-1 rounded-full px-2 py-1 text-xs font-medium ${
                isActive
                  ? 'bg-primary/10 text-primary'
                  : 'bg-muted text-muted-foreground'
              }`}
            >
              {isActive ? (
                <CheckCircle2 className="h-3 w-3 shrink-0" />
              ) : (
                <XCircle className="h-3 w-3 shrink-0" />
              )}
              {isActive ? 'Active' : 'Inactive'}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="font-custom text-muted-foreground space-y-3 text-sm">
            <div className="flex items-center gap-2">
              <Phone className="h-4 w-4 shrink-0" />
              <span>{farmerId.mobileNumber}</span>
            </div>
            <div className="flex items-start gap-2">
              <MapPin className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{farmerId.address}</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
});

export default PeoplePage;
