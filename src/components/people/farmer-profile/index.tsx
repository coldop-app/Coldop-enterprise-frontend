import { memo, useEffect, useMemo, useRef, useState } from 'react';
import {
  useRouterState,
  Link,
  useNavigate,
  useParams,
} from '@tanstack/react-router';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Item, ItemFooter } from '@/components/ui/item';
import { Input } from '@/components/ui/input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  TabSummaryBar,
  type IncomingStatusFilter,
} from '@/components/daybook/tabs/shared';
import {
  Empty,
  EmptyHeader,
  EmptyTitle,
  EmptyContent,
  EmptyMedia,
} from '@/components/ui/empty';
import { Separator } from '@/components/ui/separator';
import { Spinner } from '@/components/ui/spinner';
import { Search, ChevronDown } from 'lucide-react';
import type { FarmerStorageLink } from '@/types/farmer';
import { useGetAllGatePassesOfFarmer } from '@/services/store-admin/people/useGetAllGatePassesOfFarmer';
import {
  IncomingVoucher,
  GradingVoucher,
  StorageVoucher,
  NikasiVoucher,
} from '@/components/daybook/vouchers';
import {
  Receipt,
  ClipboardList,
  Package,
  Truck,
  ArrowUpFromLine,
  ArrowRightFromLine,
} from 'lucide-react';
import { FarmerProfileHeaderCard } from './FarmerProfileHeaderCard';
import { FarmerProfileFarmerSeedInfoDialog } from './FarmerProfileFarmerSeedInfoDialog';
import FarmerProfileCharts from './FarmerProfileCharts';
import {
  FarmerProfileGradingGatePassTable,
  type FarmerProfileGradingGatePassTableHandle,
} from './FarmerProfileGradingGatePassTable';
import { FarmerProfileMetricsGrid } from './FarmerProfileMetricsGrid';
import { formatDataForReport } from '@/utils/format-data-for-report';
import { EditFarmerModal } from '@/components/forms/edit-farmer-modal';
import { useStore } from '@/stores/store';
import { toast } from 'sonner';
import { buildFarmerStockLedgerReportPayload } from './FarmerProfileGradingGatePassTable';
import { useGetFarmerSeed } from '@/services/store-admin/farmer-seed/useGetFarmerSeed';
import {
  buildFarmerAggregates,
  filterIncomingPasses,
  filterSortablePasses,
  nikasiToPassVoucherData,
  toGradingVoucherProps,
  toIncomingVoucherProps,
} from './farmerProfileReportHelpers';

export const FarmerProfilePage = memo(function FarmerProfilePage() {
  const navigate = useNavigate();
  const { farmerStorageLinkId } = useParams({ strict: false });
  const routerLink = useRouterState({
    select: (state) =>
      (state.location.state as { link?: FarmerStorageLink } | undefined)?.link,
  });

  const [link, setLink] = useState<FarmerStorageLink | undefined>(routerLink);
  useEffect(() => {
    setLink(routerLink);
  }, [routerLink]);

  const [activeTab, setActiveTab] = useState('incoming');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [statusFilter, setStatusFilter] = useState<IncomingStatusFilter>('all');
  const [_editModalOpen, setEditModalOpen] = useState(false);
  const [isGeneratingFarmerReportPdf, setIsGeneratingFarmerReportPdf] =
    useState(false);
  const [detailsInfoDialogOpen, setDetailsInfoDialogOpen] = useState(false);
  const gradingGatePassTableRef =
    useRef<FarmerProfileGradingGatePassTableHandle>(null);

  const coldStorage = useStore((s) => s.coldStorage);
  const companyName = coldStorage?.name ?? 'Cold Storage';

  const effectiveFarmerStorageLinkId = (link?._id ??
    farmerStorageLinkId ??
    '') as string;
  const gatePasses = useGetAllGatePassesOfFarmer(effectiveFarmerStorageLinkId);
  const farmerSeedQuery = useGetFarmerSeed(effectiveFarmerStorageLinkId, {
    enabled: Boolean(effectiveFarmerStorageLinkId),
  });

  const reportData = useMemo(() => {
    const fetchedData = {
      incoming: gatePasses.incoming.data ?? [],
      grading: gatePasses.grading.data ?? [],
      storage: gatePasses.storage.data ?? [],
      nikasi: gatePasses.nikasi.data ?? [],
      totals: gatePasses.totals ?? null,
    };
    return formatDataForReport(fetchedData);
  }, [
    gatePasses.incoming.data,
    gatePasses.grading.data,
    gatePasses.storage.data,
    gatePasses.nikasi.data,
    gatePasses.totals,
  ]);
  void reportData; // consumed by formatDataForReport; available for future report UI

  const incomingFiltered = useMemo(() => {
    return filterIncomingPasses(gatePasses.incoming.data ?? [], {
      statusFilter,
      searchQuery,
      sortOrder,
    });
  }, [gatePasses.incoming.data, searchQuery, sortOrder, statusFilter]);

  const gradingFiltered = useMemo(() => {
    return filterSortablePasses(
      gatePasses.grading.data ?? [],
      searchQuery,
      sortOrder
    );
  }, [gatePasses.grading.data, searchQuery, sortOrder]);

  const storageFiltered = useMemo(() => {
    return filterSortablePasses(
      gatePasses.storage.data ?? [],
      searchQuery,
      sortOrder
    );
  }, [gatePasses.storage.data, searchQuery, sortOrder]);

  const nikasiFiltered = useMemo(() => {
    return filterSortablePasses(
      gatePasses.nikasi.data ?? [],
      searchQuery,
      sortOrder
    );
  }, [gatePasses.nikasi.data, searchQuery, sortOrder]);

  const aggregates = useMemo(() => {
    return buildFarmerAggregates(gatePasses.totals ?? null);
  }, [gatePasses.totals]);

  const handleViewFarmerReport = async () => {
    if (!link) return;
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(
        '<html><body style="font-family:sans-serif;padding:2rem;text-align:center;color:#666;">Generating PDF…</body></html>'
      );
    }
    setIsGeneratingFarmerReportPdf(true);
    try {
      const { snapshot, stockLedgerRows } = buildFarmerStockLedgerReportPayload(
        gatePasses.grading.data ?? [],
        {
          companyName,
          farmerName: link.farmerId?.name ?? '',
          dateRangeLabel: 'All dates',
        }
      );
      const [{ pdf }, { FarmerStockLedgerPdf }] = await Promise.all([
        import('@react-pdf/renderer'),
        import('@/components/pdf/FarmerStockLedgerPdf'),
      ]);
      const blob = await pdf(
        <FarmerStockLedgerPdf
          snapshot={snapshot}
          stockLedgerRows={stockLedgerRows}
        />
      ).toBlob();
      const url = URL.createObjectURL(blob);
      if (printWindow) {
        printWindow.location.href = url;
      } else {
        window.location.href = url;
      }
      setTimeout(() => URL.revokeObjectURL(url), 60_000);
      toast.success('Farmer report opened in new tab', {
        description: 'Report is ready to view or print.',
      });
    } catch {
      printWindow?.close();
      toast.error('Could not generate farmer report', {
        description: 'Please try again.',
      });
    } finally {
      setIsGeneratingFarmerReportPdf(false);
    }
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
        <Card className="overflow-hidden rounded-xl shadow-sm">
          <CardContent className="p-4 sm:p-5">
            <div className="space-y-6">
              <FarmerProfileHeaderCard
                link={link}
                onEditClick={() => setEditModalOpen(true)}
                onInfoClick={() => setDetailsInfoDialogOpen(true)}
                onViewFarmerReport={handleViewFarmerReport}
                onAddSeedClick={() => {
                  if (!effectiveFarmerStorageLinkId) return;
                  navigate({
                    to: '/store-admin/farmer-seed',
                    search: {
                      farmerStorageLinkId: effectiveFarmerStorageLinkId,
                    },
                  });
                }}
                onOpenAccountingReport={() =>
                  gradingGatePassTableRef.current?.openAccountingReportDialog()
                }
                isViewFarmerReportLoading={isGeneratingFarmerReportPdf}
              />
              <Separator />
              <FarmerProfileMetricsGrid aggregates={aggregates} />
            </div>
          </CardContent>
        </Card>

        <FarmerProfileCharts
          gradingPasses={gatePasses.grading.data ?? []}
          isLoading={gatePasses.grading.isLoading}
        />

        <FarmerProfileGradingGatePassTable
          ref={gradingGatePassTableRef}
          gradingPasses={gatePasses.grading.data ?? []}
          isLoading={gatePasses.grading.isLoading}
          farmerName={link?.farmerId?.name}
          farmerSeedEntries={farmerSeedQuery.data ?? []}
        />

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
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

          {/* Incoming tab */}
          <TabsContent
            value="incoming"
            className="mt-0 flex flex-col gap-4 outline-none"
          >
            <TabSummaryBar
              count={
                gatePasses.incoming.isLoading ? 0 : incomingFiltered.length
              }
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
                        {sortOrder === 'desc' ? 'Latest first' : 'Oldest first'}
                        <ChevronDown className="ml-2 h-4 w-4 shrink-0" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start" className="font-custom">
                      <DropdownMenuItem onClick={() => setSortOrder('asc')}>
                        Oldest first
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => setSortOrder('desc')}>
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
                    <DropdownMenuContent align="start" className="font-custom">
                      <DropdownMenuItem onClick={() => setStatusFilter('all')}>
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
                  className="font-custom bg-primary text-primary-foreground hover:bg-primary/90 h-10 w-full shrink-0 gap-2 sm:w-auto"
                  asChild
                >
                  <Link to="/store-admin/incoming">
                    <ArrowUpFromLine className="h-4 w-4 shrink-0" />
                    Add Incoming
                  </Link>
                </Button>
              </ItemFooter>
            </Item>

            <div className="mt-2 sm:mt-4">
              {gatePasses.incoming.isLoading ? (
                <Card>
                  <CardContent className="py-12">
                    <p className="font-custom text-center text-sm text-gray-600">
                      Loading incoming gate passes…
                    </p>
                    <div className="mt-4 flex justify-center">
                      <Spinner className="h-6 w-6" />
                    </div>
                  </CardContent>
                </Card>
              ) : gatePasses.incoming.isError ? (
                <Card>
                  <CardContent className="py-8 pt-6">
                    <Empty className="font-custom">
                      <EmptyHeader>
                        <EmptyTitle>
                          Failed to load incoming gate passes
                        </EmptyTitle>
                      </EmptyHeader>
                      <EmptyContent>
                        <p className="font-custom text-sm text-red-600">
                          {gatePasses.incoming.error instanceof Error
                            ? gatePasses.incoming.error.message
                            : 'Something went wrong.'}
                        </p>
                      </EmptyContent>
                    </Empty>
                  </CardContent>
                </Card>
              ) : !incomingFiltered.length ? (
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
                  {incomingFiltered.map((pass) => {
                    const props = toIncomingVoucherProps(pass, link);
                    return (
                      <IncomingVoucher
                        key={pass._id}
                        voucher={props.voucher}
                        farmerName={props.farmerName}
                        farmerAccount={props.farmerAccount}
                        farmerAddress={props.farmerAddress}
                        farmerMobile={props.farmerMobile}
                      />
                    );
                  })}
                </div>
              )}
            </div>
          </TabsContent>

          {/* Grading tab */}
          <TabsContent
            value="grading"
            className="mt-0 flex flex-col gap-4 outline-none"
          >
            <TabSummaryBar
              count={gatePasses.grading.isLoading ? 0 : gradingFiltered.length}
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
                    <DropdownMenuItem onClick={() => setSortOrder('asc')}>
                      Oldest first
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setSortOrder('desc')}>
                      Latest first
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
                <Button
                  className="font-custom bg-primary text-primary-foreground hover:bg-primary/90 h-10 w-full shrink-0 gap-2 sm:w-auto"
                  asChild
                >
                  <Link to="/store-admin/grading">
                    <ClipboardList className="h-4 w-4 shrink-0" />
                    Add Grading
                  </Link>
                </Button>
              </ItemFooter>
            </Item>

            <div className="mt-2 sm:mt-4">
              {gatePasses.grading.isLoading ? (
                <Card>
                  <CardContent className="py-12">
                    <p className="font-custom text-center text-sm text-gray-600">
                      Loading grading gate passes…
                    </p>
                    <div className="mt-4 flex justify-center">
                      <Spinner className="h-6 w-6" />
                    </div>
                  </CardContent>
                </Card>
              ) : gatePasses.grading.isError ? (
                <Card>
                  <CardContent className="py-8 pt-6">
                    <Empty className="font-custom">
                      <EmptyHeader>
                        <EmptyTitle>
                          Failed to load grading gate passes
                        </EmptyTitle>
                      </EmptyHeader>
                      <EmptyContent>
                        <p className="font-custom text-sm text-red-600">
                          {gatePasses.grading.error instanceof Error
                            ? gatePasses.grading.error.message
                            : 'Something went wrong.'}
                        </p>
                      </EmptyContent>
                    </Empty>
                  </CardContent>
                </Card>
              ) : !gradingFiltered.length ? (
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
                  {gradingFiltered.map((pass) => {
                    const props = toGradingVoucherProps(pass, link);
                    return (
                      <GradingVoucher
                        key={pass._id}
                        voucher={props.voucher}
                        farmerName={props.farmerName}
                        farmerAccount={props.farmerAccount}
                        farmerStorageLinkId={props.farmerStorageLinkId}
                        incomingNetKg={props.incomingNetKg}
                        incomingBagsCount={props.incomingBagsCount}
                        incomingGatePassIds={props.incomingGatePassIds}
                      />
                    );
                  })}
                </div>
              )}
            </div>
          </TabsContent>

          {/* Storage tab */}
          <TabsContent
            value="storage"
            className="mt-0 flex flex-col gap-4 outline-none"
          >
            <TabSummaryBar
              count={gatePasses.storage.isLoading ? 0 : storageFiltered.length}
              icon={<Package className="text-primary h-5 w-5" />}
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
                    <DropdownMenuItem onClick={() => setSortOrder('asc')}>
                      Oldest first
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setSortOrder('desc')}>
                      Latest first
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
                <Button
                  className="font-custom bg-primary text-primary-foreground hover:bg-primary/90 h-10 w-full shrink-0 gap-2 sm:w-auto"
                  asChild
                >
                  <Link to="/store-admin/storage">
                    <Package className="h-4 w-4 shrink-0" />
                    Add Storage
                  </Link>
                </Button>
              </ItemFooter>
            </Item>
            <div className="mt-2 sm:mt-4">
              {gatePasses.storage.isLoading ? (
                <Card>
                  <CardContent className="py-12">
                    <p className="font-custom text-center text-sm text-gray-600">
                      Loading storage gate passes…
                    </p>
                    <div className="mt-4 flex justify-center">
                      <Spinner className="h-6 w-6" />
                    </div>
                  </CardContent>
                </Card>
              ) : gatePasses.storage.isError ? (
                <Card>
                  <CardContent className="py-8 pt-6">
                    <Empty className="font-custom">
                      <EmptyHeader>
                        <EmptyTitle>
                          Failed to load storage gate passes
                        </EmptyTitle>
                      </EmptyHeader>
                      <EmptyContent>
                        <p className="font-custom text-sm text-red-600">
                          {gatePasses.storage.error instanceof Error
                            ? gatePasses.storage.error.message
                            : 'Something went wrong.'}
                        </p>
                      </EmptyContent>
                    </Empty>
                  </CardContent>
                </Card>
              ) : !storageFiltered.length ? (
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
                          <Link to="/store-admin/storage">
                            Add Storage voucher
                          </Link>
                        </Button>
                      </EmptyContent>
                    </Empty>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-6">
                  {storageFiltered.map((pass) => (
                    <StorageVoucher
                      key={pass._id}
                      voucher={pass}
                      farmerName={link?.farmerId?.name}
                      farmerAccount={link?.accountNumber}
                    />
                  ))}
                </div>
              )}
            </div>
          </TabsContent>

          {/* Dispatch tab */}
          <TabsContent
            value="dispatch"
            className="mt-0 flex flex-col gap-4 outline-none"
          >
            <TabSummaryBar
              count={gatePasses.nikasi.isLoading ? 0 : nikasiFiltered.length}
              icon={<Truck className="text-primary h-5 w-5" />}
            />
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
                      Sort Order:{' '}
                      {sortOrder === 'desc' ? 'Latest first' : 'Oldest first'}
                      <ChevronDown className="ml-2 h-4 w-4 shrink-0" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start" className="font-custom">
                    <DropdownMenuItem onClick={() => setSortOrder('asc')}>
                      Oldest first
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setSortOrder('desc')}>
                      Latest first
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
                <Button
                  className="font-custom bg-primary text-primary-foreground hover:bg-primary/90 h-10 w-full shrink-0 gap-2 sm:w-auto"
                  asChild
                >
                  <Link to="/store-admin/nikasi">
                    <Truck className="h-4 w-4 shrink-0" />
                    Add Dispatch
                  </Link>
                </Button>
              </ItemFooter>
            </Item>
            <div className="mt-2 sm:mt-4">
              {gatePasses.nikasi.isLoading ? (
                <Card>
                  <CardContent className="py-12">
                    <p className="font-custom text-center text-sm text-gray-600">
                      Loading dispatch gate passes…
                    </p>
                    <div className="mt-4 flex justify-center">
                      <Spinner className="h-6 w-6" />
                    </div>
                  </CardContent>
                </Card>
              ) : gatePasses.nikasi.isError ? (
                <Card>
                  <CardContent className="py-8 pt-6">
                    <Empty className="font-custom">
                      <EmptyHeader>
                        <EmptyTitle>
                          Failed to load dispatch gate passes
                        </EmptyTitle>
                      </EmptyHeader>
                      <EmptyContent>
                        <p className="font-custom text-sm text-red-600">
                          {gatePasses.nikasi.error instanceof Error
                            ? gatePasses.nikasi.error.message
                            : 'Something went wrong.'}
                        </p>
                      </EmptyContent>
                    </Empty>
                  </CardContent>
                </Card>
              ) : !nikasiFiltered.length ? (
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
                          <Link to="/store-admin/nikasi">
                            Add Dispatch voucher
                          </Link>
                        </Button>
                      </EmptyContent>
                    </Empty>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-6">
                  {nikasiFiltered.map((pass) => (
                    <NikasiVoucher
                      key={pass._id}
                      voucher={nikasiToPassVoucherData(pass)}
                      farmerName={link?.farmerId?.name}
                      farmerAccount={link?.accountNumber}
                      variant="dispatch"
                    />
                  ))}
                </div>
              )}
            </div>
          </TabsContent>

          {/* Outgoing tab */}
          <TabsContent
            value="outgoing"
            className="mt-0 flex flex-col gap-4 outline-none"
          >
            <TabSummaryBar
              count={0}
              icon={<ArrowRightFromLine className="text-primary h-5 w-5" />}
            />
            <Item
              variant="outline"
              size="sm"
              className="flex-col items-stretch gap-4 rounded-xl"
            >
              <div className="relative w-full">
                <Search className="text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
                <Input
                  placeholder="Search by voucher number, date..."
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
                      Sort Order: Latest first
                      <ChevronDown className="ml-2 h-4 w-4 shrink-0" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start" className="font-custom">
                    <DropdownMenuItem>Oldest first</DropdownMenuItem>
                    <DropdownMenuItem>Latest first</DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
                <Button
                  className="font-custom bg-primary text-primary-foreground hover:bg-primary/90 h-10 w-full shrink-0 gap-2 sm:w-auto"
                  asChild
                >
                  <Link to="/store-admin/outgoing">
                    <ArrowRightFromLine className="h-4 w-4 shrink-0" />
                    Add Outgoing
                  </Link>
                </Button>
              </ItemFooter>
            </Item>
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
          </TabsContent>
        </Tabs>

        {link && (
          <>
            <FarmerProfileFarmerSeedInfoDialog
              open={detailsInfoDialogOpen}
              onOpenChange={setDetailsInfoDialogOpen}
              data={farmerSeedQuery.data}
              isPending={farmerSeedQuery.isPending}
              isFetching={farmerSeedQuery.isFetching}
              isError={farmerSeedQuery.isError}
              error={farmerSeedQuery.error}
            />
            <EditFarmerModal
              link={link}
              open={_editModalOpen}
              onOpenChange={setEditModalOpen}
              onUpdated={({ name, address, mobileNumber, accountNumber }) => {
                setLink((prev) => {
                  if (!prev) return prev;
                  return {
                    ...prev,
                    farmerId: {
                      ...prev.farmerId,
                      name,
                      address,
                      mobileNumber,
                    },
                    accountNumber,
                  };
                });
              }}
            />
          </>
        )}
      </div>
    </main>
  );
});

export default FarmerProfilePage;
