import { memo, useMemo, useState } from 'react';
import { useRouterState, Link, useParams } from '@tanstack/react-router';
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
  type IncomingVoucherData,
  type PassVoucherData,
} from '@/components/daybook/vouchers';
import type { IncomingGatePassByFarmerStorageLinkItem } from '@/types/incoming-gate-pass';
import type { GradingGatePass } from '@/types/grading-gate-pass';
import type { NikasiGatePass } from '@/types/nikasi-gate-pass';
import {
  Receipt,
  ClipboardList,
  Package,
  Truck,
  ArrowUpFromLine,
  ArrowRightFromLine,
} from 'lucide-react';
import { FarmerProfileHeaderCard } from './FarmerProfileHeaderCard';
import { FarmerProfileGradingGatePassTable } from './FarmerProfileGradingGatePassTable';
import { FarmerProfileMetricsGrid } from './FarmerProfileMetricsGrid';
import { formatDataForReport } from '@/utils/format-data-for-report';

/** Map incoming gate pass (by farmer) to IncomingVoucher props. Uses fallbackLink when API returns unpopulated refs. */
function toIncomingVoucherProps(
  pass: IncomingGatePassByFarmerStorageLinkItem & {
    farmerStorageLinkId?:
      | string
      | {
          farmerId?: { name?: string; address?: string; mobileNumber?: string };
          accountNumber?: number;
        };
    createdBy?: string | { name?: string };
  },
  fallbackLink?: {
    farmerId?: { name?: string; address?: string; mobileNumber?: string };
    accountNumber?: number;
  } | null
) {
  const link =
    pass.farmerStorageLinkId != null &&
    typeof pass.farmerStorageLinkId === 'object'
      ? pass.farmerStorageLinkId
      : (fallbackLink ?? null);
  const voucher: IncomingVoucherData = {
    _id: pass._id,
    gatePassNo: pass.gatePassNo,
    manualGatePassNumber: pass.manualGatePassNumber,
    date: pass.date,
    variety: pass.variety,
    location: pass.location,
    truckNumber: pass.truckNumber,
    bagsReceived: pass.bagsReceived,
    status: pass.status,
    weightSlip: pass.weightSlip,
    remarks: pass.remarks,
    createdBy:
      pass.createdBy != null && typeof pass.createdBy === 'object'
        ? { name: (pass.createdBy as { name?: string }).name }
        : undefined,
  };
  return {
    voucher,
    farmerName: link?.farmerId?.name,
    farmerAccount: link?.accountNumber,
    farmerAddress: link?.farmerId?.address,
    farmerMobile: link?.farmerId?.mobileNumber,
  };
}

/** Map grading gate pass to GradingVoucher props. Uses fallbackLink when API returns unpopulated refs. */
function toGradingVoucherProps(
  pass: GradingGatePass & {
    incomingGatePassIds?: Array<{
      farmerStorageLinkId?: unknown;
      bagsReceived?: number;
      weightSlip?: { grossWeightKg?: number; tareWeightKg?: number };
    }>;
  },
  fallbackLink?: { farmerId?: { name?: string }; accountNumber?: number } | null
) {
  const firstIncoming = pass.incomingGatePassIds?.[0];
  const link =
    firstIncoming &&
    typeof firstIncoming.farmerStorageLinkId === 'object' &&
    firstIncoming.farmerStorageLinkId != null
      ? (firstIncoming.farmerStorageLinkId as {
          farmerId?: { name?: string };
          accountNumber?: number;
        })
      : (fallbackLink ?? null);
  const incomingBagsCount =
    pass.incomingGatePassIds?.reduce(
      (sum, inc) =>
        sum +
        (typeof inc === 'object' && inc && 'bagsReceived' in inc
          ? (inc.bagsReceived ?? 0)
          : 0),
      0
    ) ?? 0;
  let incomingNetKg: number | undefined;
  const firstWithSlip = pass.incomingGatePassIds?.find(
    (inc) =>
      typeof inc === 'object' &&
      inc != null &&
      'weightSlip' in inc &&
      (inc as { weightSlip?: unknown }).weightSlip != null
  ) as
    | { weightSlip?: { grossWeightKg?: number; tareWeightKg?: number } }
    | undefined;
  if (firstWithSlip?.weightSlip) {
    const { grossWeightKg = 0, tareWeightKg = 0 } = firstWithSlip.weightSlip;
    incomingNetKg = grossWeightKg - tareWeightKg;
  }
  const voucher: PassVoucherData = {
    _id: pass._id,
    gatePassNo: pass.gatePassNo,
    manualGatePassNumber: pass.manualGatePassNumber,
    date: pass.date,
    variety: pass.variety,
    orderDetails: pass.orderDetails,
    allocationStatus: pass.allocationStatus,
    grader: pass.grader,
    remarks: pass.remarks,
    createdBy:
      pass.createdBy != null && typeof pass.createdBy === 'object'
        ? { name: (pass.createdBy as { name?: string }).name }
        : undefined,
  };
  return {
    voucher,
    farmerName: link?.farmerId?.name,
    farmerAccount: link?.accountNumber,
    farmerStorageLinkId: pass.farmerStorageLinkId,
    incomingNetKg,
    incomingBagsCount,
    incomingGatePassIds: pass.incomingGatePassIds ?? [],
  };
}

/** Map nikasi gate pass to PassVoucherData for NikasiVoucher */
function nikasiToPassVoucherData(pass: NikasiGatePass): PassVoucherData {
  return {
    _id: pass._id,
    gatePassNo: pass.gatePassNo,
    manualGatePassNumber: pass.manualGatePassNumber,
    date: pass.date,
    variety: pass.variety,
    from: pass.from,
    toField: pass.toField,
    orderDetails: pass.orderDetails,
    bagSize: pass.bagSize,
    remarks: pass.remarks,
    gradingGatePassIds:
      pass.gradingGatePassIds as PassVoucherData['gradingGatePassIds'],
    gradingGatePassSnapshots:
      pass.gradingGatePassSnapshots as PassVoucherData['gradingGatePassSnapshots'],
  };
}

export const FarmerProfilePage = memo(function FarmerProfilePage() {
  const { farmerStorageLinkId } = useParams({ strict: false });
  const link = useRouterState({
    select: (state) =>
      (state.location.state as { link?: FarmerStorageLink } | undefined)?.link,
  });

  const [activeTab, setActiveTab] = useState('incoming');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [statusFilter, setStatusFilter] = useState<IncomingStatusFilter>('all');
  const [_editModalOpen, setEditModalOpen] = useState(false);

  const effectiveFarmerStorageLinkId = (link?._id ??
    farmerStorageLinkId ??
    '') as string;
  const gatePasses = useGetAllGatePassesOfFarmer(effectiveFarmerStorageLinkId);

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
    let list = gatePasses.incoming.data ?? [];
    if (statusFilter === 'graded')
      list = list.filter((p) => p.status === 'CLOSED');
    if (statusFilter === 'ungraded')
      list = list.filter((p) => p.status !== 'CLOSED');
    const q = searchQuery.trim().toLowerCase();
    if (q) {
      list = list.filter((p) => {
        const no = String(p.gatePassNo ?? p.manualGatePassNumber ?? '');
        const dateStr = p.date
          ? new Date(p.date).toLocaleDateString('en-IN')
          : '';
        return (
          no.toLowerCase().includes(q) || dateStr.toLowerCase().includes(q)
        );
      });
    }
    return [...list].sort((a, b) => {
      const d = new Date(a.date).getTime() - new Date(b.date).getTime();
      return sortOrder === 'desc' ? -d : d;
    });
  }, [gatePasses.incoming.data, searchQuery, sortOrder, statusFilter]);

  const gradingFiltered = useMemo(() => {
    let list = gatePasses.grading.data ?? [];
    const q = searchQuery.trim().toLowerCase();
    if (q) {
      list = list.filter((p) => {
        const no = String(p.gatePassNo ?? p.manualGatePassNumber ?? '');
        const dateStr = p.date
          ? new Date(p.date).toLocaleDateString('en-IN')
          : '';
        return (
          no.toLowerCase().includes(q) || dateStr.toLowerCase().includes(q)
        );
      });
    }
    return [...list].sort((a, b) => {
      const d = new Date(a.date).getTime() - new Date(b.date).getTime();
      return sortOrder === 'desc' ? -d : d;
    });
  }, [gatePasses.grading.data, searchQuery, sortOrder]);

  const storageFiltered = useMemo(() => {
    let list = gatePasses.storage.data ?? [];
    const q = searchQuery.trim().toLowerCase();
    if (q) {
      list = list.filter((p) => {
        const no = String(p.gatePassNo ?? p.manualGatePassNumber ?? '');
        const dateStr = p.date
          ? new Date(p.date).toLocaleDateString('en-IN')
          : '';
        return (
          no.toLowerCase().includes(q) || dateStr.toLowerCase().includes(q)
        );
      });
    }
    return [...list].sort((a, b) => {
      const d = new Date(a.date).getTime() - new Date(b.date).getTime();
      return sortOrder === 'desc' ? -d : d;
    });
  }, [gatePasses.storage.data, searchQuery, sortOrder]);

  const nikasiFiltered = useMemo(() => {
    let list = gatePasses.nikasi.data ?? [];
    const q = searchQuery.trim().toLowerCase();
    if (q) {
      list = list.filter((p) => {
        const no = String(p.gatePassNo ?? p.manualGatePassNumber ?? '');
        const dateStr = p.date
          ? new Date(p.date).toLocaleDateString('en-IN')
          : '';
        return (
          no.toLowerCase().includes(q) || dateStr.toLowerCase().includes(q)
        );
      });
    }
    return [...list].sort((a, b) => {
      const d = new Date(a.date).getTime() - new Date(b.date).getTime();
      return sortOrder === 'desc' ? -d : d;
    });
  }, [gatePasses.nikasi.data, searchQuery, sortOrder]);

  const aggregates = useMemo(() => {
    const t = gatePasses.totals;
    return {
      totalBagsIncoming: t?.incoming ?? 0,
      totalBagsUngraded: t?.totalUngraded ?? 0,
      totalBagsGraded: t?.grading ?? 0,
      totalBagsStored: t?.storage ?? 0,
      totalBagsNikasi: t?.dispatch ?? 0,
      totalBagsOutgoing: t?.outgoing ?? 0,
    };
  }, [gatePasses.totals]);

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
        <Card className="overflow-hidden rounded-2xl shadow-lg">
          <CardContent className="p-6 sm:p-8">
            <div className="space-y-8">
              <FarmerProfileHeaderCard
                link={link}
                onEditClick={() => setEditModalOpen(true)}
              />
              <Separator />
              <FarmerProfileMetricsGrid aggregates={aggregates} />
            </div>
          </CardContent>
        </Card>

        <FarmerProfileGradingGatePassTable
          gradingPasses={gatePasses.grading.data ?? []}
          isLoading={gatePasses.grading.isLoading}
          farmerName={link?.farmerId?.name}
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
      </div>
    </main>
  );
});

export default FarmerProfilePage;
