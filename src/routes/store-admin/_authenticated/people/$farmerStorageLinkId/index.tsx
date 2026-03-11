import { memo, useCallback, useMemo, useState } from 'react';
import {
  createFileRoute,
  useParams,
  useRouterState,
  Link,
} from '@tanstack/react-router';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
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
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationPrevious,
  PaginationNext,
} from '@/components/ui/pagination';
import {
  Empty,
  EmptyHeader,
  EmptyTitle,
  EmptyContent,
  EmptyMedia,
} from '@/components/ui/empty';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';
import { Spinner } from '@/components/ui/spinner';
import { Hash, Edit, Search, ChevronDown } from 'lucide-react';
import type { FarmerStorageLink } from '@/types/farmer';
import { useGetIncomingGatePassesOfSingleFarmer } from '@/services/store-admin/incoming-gate-pass/useGetIncomingGatePassesOfSingleFarmer';
import { useGetGradingPassesOfSingleFarmer } from '@/services/store-admin/grading-gate-pass/useGetGradingPassesOfSingleFarmer';
import { useGetFarmerStorageLinkVouchers } from '@/services/store-admin/people/useGetFarmerStorageLinkVouchers';
import type { DaybookEntry } from '@/types/daybook';
import type { IncomingGatePassByFarmerStorageLinkItem } from '@/types/incoming-gate-pass';
import type { GradingGatePass } from '@/types/grading-gate-pass';
import {
  TabSummaryBar,
  LIMIT_OPTIONS,
  type IncomingStatusFilter,
} from '@/components/daybook/tabs/shared';
import { IncomingVoucher, GradingVoucher } from '@/components/daybook/vouchers';
import type { IncomingVoucherData } from '@/components/daybook/vouchers/types';
import type { GradingVoucherProps } from '@/components/daybook/vouchers';
import {
  Receipt,
  ClipboardList,
  Package,
  Truck,
  ArrowUpFromLine,
  ArrowRightFromLine,
  ArrowDownToLine,
  Clock,
  Layers,
  Warehouse,
  FileText,
  FileSpreadsheet,
} from 'lucide-react';
import type { StockLedgerRow } from '@/components/pdf/stockLedgerTypes';
import { downloadStockLedgerExcel } from '@/utils/stockLedgerExcel';
import type { PassVoucherData } from '@/components/daybook/vouchers';
import type { GradingOrderDetailRow } from '@/components/daybook/vouchers/types';

/** Map API incoming gate pass (by farmer) to IncomingVoucher props */
function toIncomingVoucherProps(
  pass: IncomingGatePassByFarmerStorageLinkItem,
  link: FarmerStorageLink
) {
  const farmer = link.farmerId ?? pass.farmerStorageLinkId?.farmerId;
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
    farmerName: farmer?.name,
    farmerAccount:
      pass.farmerStorageLinkId?.accountNumber ?? link.accountNumber,
    farmerAddress:
      (typeof farmer === 'object' && farmer && 'address' in farmer
        ? (farmer as { address?: string }).address
        : undefined) ?? undefined,
    farmerMobile:
      (typeof farmer === 'object' && farmer && 'mobileNumber' in farmer
        ? (farmer as { mobileNumber?: string }).mobileNumber
        : undefined) ?? undefined,
  };
}

/** Map API grading gate pass to GradingVoucher props (same as daybook GradingTab) */
function toGradingVoucherProps(pass: GradingGatePass): GradingVoucherProps {
  const firstIncoming = pass.incomingGatePassIds?.[0];
  const link =
    firstIncoming &&
    typeof firstIncoming.farmerStorageLinkId === 'object' &&
    firstIncoming.farmerStorageLinkId != null
      ? firstIncoming.farmerStorageLinkId
      : null;
  const farmerName = link?.farmerId?.name;
  const farmerAccount = link?.accountNumber;
  const incomingBagsCount =
    pass.incomingGatePassIds?.reduce(
      (sum, inc) => sum + (inc.bagsReceived ?? 0),
      0
    ) ?? 0;
  let incomingNetKg: number | undefined;
  const firstWithSlip = pass.incomingGatePassIds?.find(
    (inc) => inc.weightSlip != null
  );
  if (firstWithSlip?.weightSlip) {
    const { grossWeightKg = 0, tareWeightKg = 0 } = firstWithSlip.weightSlip;
    incomingNetKg = grossWeightKg - tareWeightKg;
  }
  const voucher = {
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
    farmerName,
    farmerAccount,
    farmerStorageLinkId: pass.farmerStorageLinkId,
    incomingNetKg,
    incomingBagsCount,
    incomingGatePassIds: pass.incomingGatePassIds ?? [],
  };
}

/** Build stock ledger rows from daybook for PDF/Excel */
function daybookToStockLedgerRows(daybook: DaybookEntry[]): StockLedgerRow[] {
  return daybook.map((entry, index) => {
    const inc = entry.incoming as IncomingVoucherData & { date?: string };
    const bags = entry.summaries?.totalBagsIncoming ?? inc.bagsReceived ?? 0;
    const ws = inc.weightSlip;
    const gross = ws?.grossWeightKg;
    const tare = ws?.tareWeightKg;
    const net =
      gross != null && tare != null && !Number.isNaN(gross - tare)
        ? gross - tare
        : undefined;
    const gradingPasses = (entry.gradingPasses ?? []) as PassVoucherData[];
    const postGradingBags = gradingPasses.reduce(
      (sum, pass) =>
        sum +
        (pass.orderDetails ?? []).reduce(
          (s: number, o: GradingOrderDetailRow) => s + (o.initialQuantity ?? 0),
          0
        ),
      0
    );
    const bagType = (() => {
      for (const pass of gradingPasses) {
        const details = (pass.orderDetails ?? []) as GradingOrderDetailRow[];
        const withQty = details.find((d) => (d.initialQuantity ?? 0) > 0);
        if (withQty?.bagType) return withQty.bagType;
        if (details[0]?.bagType) return details[0].bagType;
      }
      return undefined;
    })();
    const sizeBagsJute: Record<string, number> = {};
    const sizeBagsLeno: Record<string, number> = {};
    const sizeWeightPerBagJute: Record<string, number> = {};
    const sizeWeightPerBagLeno: Record<string, number> = {};
    for (const pass of gradingPasses) {
      const details = (pass.orderDetails ?? []) as GradingOrderDetailRow[];
      for (const d of details) {
        if (d.size == null || (d.initialQuantity ?? 0) <= 0) continue;
        const typeKey = d.bagType?.toUpperCase();
        const qty = d.initialQuantity ?? 0;
        const weightKg = d.weightPerBagKg;
        if (typeKey === 'JUTE') {
          sizeBagsJute[d.size] = (sizeBagsJute[d.size] ?? 0) + qty;
          if (
            weightKg != null &&
            !Number.isNaN(weightKg) &&
            sizeWeightPerBagJute[d.size] == null
          ) {
            sizeWeightPerBagJute[d.size] = weightKg;
          }
        } else if (typeKey === 'LENO') {
          sizeBagsLeno[d.size] = (sizeBagsLeno[d.size] ?? 0) + qty;
          if (
            weightKg != null &&
            !Number.isNaN(weightKg) &&
            sizeWeightPerBagLeno[d.size] == null
          ) {
            sizeWeightPerBagLeno[d.size] = weightKg;
          }
        }
      }
    }
    const hasJute = Object.keys(sizeBagsJute).length > 0;
    const hasLeno = Object.keys(sizeBagsLeno).length > 0;
    const variety = gradingPasses
      .find((p) => (p as { variety?: string }).variety?.trim())
      ?.variety?.trim();
    const gradingGatePassNo =
      gradingPasses.length > 0
        ? gradingPasses
            .map((p) => (p as { gatePassNo?: number }).gatePassNo)
            .filter((n) => n != null && !Number.isNaN(Number(n)))
            .join(', ')
        : undefined;
    const manualGradingGatePassNo =
      gradingPasses.length > 0
        ? gradingPasses
            .map(
              (p) =>
                (p as { manualGatePassNumber?: number }).manualGatePassNumber
            )
            .filter((n) => n != null && !Number.isNaN(Number(n)))
            .join(', ')
        : undefined;
    const gradingGatePassDate = gradingPasses[0]?.date;
    return {
      serialNo: index + 1,
      date: inc.date,
      incomingGatePassNo: inc.gatePassNo ?? '—',
      manualIncomingVoucherNo: inc.manualGatePassNumber,
      gradingGatePassNo,
      manualGradingGatePassNo,
      gradingGatePassDate,
      store: 'JICSPL- Bazpur',
      truckNumber: inc.truckNumber,
      bagsReceived: bags,
      weightSlipNumber: ws?.slipNumber,
      grossWeightKg: gross,
      tareWeightKg: tare,
      netWeightKg: net,
      postGradingBags: gradingPasses.length > 0 ? postGradingBags : undefined,
      bagType,
      sizeBagsJute: hasJute ? sizeBagsJute : undefined,
      sizeBagsLeno: hasLeno ? sizeBagsLeno : undefined,
      sizeWeightPerBagJute:
        hasJute && Object.keys(sizeWeightPerBagJute).length > 0
          ? sizeWeightPerBagJute
          : undefined,
      sizeWeightPerBagLeno:
        hasLeno && Object.keys(sizeWeightPerBagLeno).length > 0
          ? sizeWeightPerBagLeno
          : undefined,
      variety,
    };
  });
}

const PeopleDetailPage = memo(function PeopleDetailPage() {
  const { farmerStorageLinkId } = useParams({ from: Route.id });
  const link = useRouterState({
    select: (state) =>
      (state.location.state as { link?: FarmerStorageLink } | undefined)?.link,
  });

  const [activeTab, setActiveTab] = useState('incoming');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [statusFilter, setStatusFilter] = useState<IncomingStatusFilter>('all');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [_editModalOpen, setEditModalOpen] = useState(false);
  const [stockLedgerDialogOpen, setStockLedgerDialogOpen] = useState(false);
  const [isPdfOpening, setIsPdfOpening] = useState(false);

  const {
    data: incomingResult,
    isLoading: incomingLoading,
    isError: incomingError,
    error: incomingErrorDetail,
    refetch: refetchIncoming,
    isFetching: incomingFetching,
  } = useGetIncomingGatePassesOfSingleFarmer(farmerStorageLinkId);

  const {
    data: gradingData,
    isLoading: gradingLoading,
    isError: gradingError,
    error: gradingErrorDetail,
    refetch: refetchGrading,
    isFetching: gradingFetching,
  } = useGetGradingPassesOfSingleFarmer(farmerStorageLinkId);

  const { data: vouchersData } =
    useGetFarmerStorageLinkVouchers(farmerStorageLinkId);
  const daybook = vouchersData?.daybook ?? [];

  const aggregates = useMemo(() => {
    let totalBagsIncoming = 0;
    let totalBagsUngraded = 0;
    let totalBagsGraded = 0;
    let totalBagsStored = 0;
    let totalBagsNikasi = 0;
    let totalBagsOutgoing = 0;
    for (const entry of daybook as DaybookEntry[]) {
      const s = entry.summaries;
      if (!s) continue;
      const inc = s.totalBagsIncoming ?? 0;
      const grad = s.totalBagsGraded ?? 0;
      totalBagsIncoming += inc;
      totalBagsGraded += grad;
      // Ungraded = bags only from incoming gate passes with status NOT_GRADED
      const incomingStatus =
        entry.incoming != null && typeof entry.incoming === 'object'
          ? (entry.incoming as { status?: string }).status
          : undefined;
      if (incomingStatus === 'NOT_GRADED') {
        totalBagsUngraded += inc;
      }
      totalBagsStored += s.totalBagsStored ?? 0;
      totalBagsNikasi += s.totalBagsNikasi ?? 0;
      totalBagsOutgoing += s.totalBagsOutgoing ?? 0;
    }
    // Wastage = difference of incoming and graded (incoming - graded)
    const wastage = Math.max(0, totalBagsIncoming - totalBagsGraded);
    return {
      totalBagsIncoming,
      totalBagsUngraded,
      totalBagsGraded,
      totalBagsStored,
      totalBagsNikasi,
      totalBagsOutgoing,
      wastage,
    };
  }, [daybook]);

  const stockLedgerRows = useMemo(
    () => daybookToStockLedgerRows(daybook as DaybookEntry[]),
    [daybook]
  );

  const openStockLedgerPdf = useCallback(() => {
    if (!link) return;
    const farmerName = link.farmerId?.name ?? '—';
    const win = window.open('', '_blank');
    if (win) {
      win.document.write(
        '<html><body style="font-family:sans-serif;padding:2rem;text-align:center;color:#666;">Generating PDF…</body></html>'
      );
    }
    setIsPdfOpening(true);
    Promise.all([
      import('@react-pdf/renderer'),
      import('@/components/pdf/StockLedgerPdf'),
    ])
      .then(([{ pdf }, { StockLedgerPdf: StockLedgerPdfComponent }]) =>
        pdf(
          <StockLedgerPdfComponent
            farmerName={farmerName}
            rows={stockLedgerRows}
          />
        ).toBlob()
      )
      .then((blob) => {
        const url = URL.createObjectURL(blob);
        if (win) win.location.href = url;
        else window.location.href = url;
        setTimeout(() => URL.revokeObjectURL(url), 60_000);
      })
      .finally(() => setIsPdfOpening(false));
  }, [link, stockLedgerRows]);

  const incomingList = incomingResult?.data ?? [];
  const incomingTotal =
    incomingResult?.pagination?.total ?? incomingList.length;

  const filteredAndSortedIncoming = useMemo(() => {
    let list = [...incomingList];
    const q = searchQuery.trim().toLowerCase();
    if (q) {
      list = list.filter((p) => {
        const no = String(p.gatePassNo ?? '').toLowerCase();
        const manual = String(p.manualGatePassNumber ?? '').toLowerCase();
        return no.includes(q) || manual.includes(q);
      });
    }
    if (statusFilter === 'graded') {
      list = list.filter((p) => p.status === 'GRADED');
    } else if (statusFilter === 'ungraded') {
      list = list.filter((p) => p.status === 'NOT_GRADED');
    }
    list.sort((a, b) => {
      const da = new Date(a.date).getTime();
      const db = new Date(b.date).getTime();
      return sortOrder === 'desc' ? db - da : da - db;
    });
    return list;
  }, [incomingList, searchQuery, statusFilter, sortOrder]);

  const incomingTotalPages = Math.max(
    1,
    Math.ceil(filteredAndSortedIncoming.length / limit)
  );
  const paginatedIncoming = useMemo(() => {
    const start = (page - 1) * limit;
    return filteredAndSortedIncoming.slice(start, start + limit);
  }, [filteredAndSortedIncoming, page, limit]);

  const filteredAndSortedGrading = useMemo(() => {
    let list = [...(gradingData ?? [])];
    const q = searchQuery.trim().toLowerCase();
    if (q) {
      list = list.filter((p) => {
        const no = String(p.gatePassNo ?? '').toLowerCase();
        const dateStr = p.date
          ? new Date(p.date).toLocaleDateString('en-IN').toLowerCase()
          : '';
        return no.includes(q) || dateStr.includes(q);
      });
    }
    list.sort((a, b) => {
      const da = new Date(a.date).getTime();
      const db = new Date(b.date).getTime();
      return sortOrder === 'desc' ? db - da : da - db;
    });
    return list;
  }, [gradingData, searchQuery, sortOrder]);

  const gradingTotal = gradingData?.length ?? 0;
  const gradingTotalPages = Math.max(
    1,
    Math.ceil(filteredAndSortedGrading.length / limit)
  );
  const gradingHasPrev = page > 1;
  const gradingHasNext = page < gradingTotalPages;
  const paginatedGrading = useMemo(() => {
    const start = (page - 1) * limit;
    return filteredAndSortedGrading.slice(start, start + limit);
  }, [filteredAndSortedGrading, page, limit]);

  const setLimitAndResetPage = useCallback((newLimit: number) => {
    setLimit(newLimit);
    setPage(1);
  }, []);

  const getInitials = (name: string) =>
    name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);

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
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-4">
                  <Avatar className="h-20 w-20 shadow-lg sm:h-24 sm:w-24">
                    <AvatarFallback className="bg-primary text-primary-foreground text-2xl font-bold sm:text-3xl">
                      {getInitials(link.farmerId?.name ?? '')}
                    </AvatarFallback>
                  </Avatar>
                  <div className="space-y-2">
                    <h1 className="font-custom text-2xl font-bold tracking-tight sm:text-3xl">
                      {link.farmerId?.name ?? '—'}
                    </h1>
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
                  onClick={() => setEditModalOpen(true)}
                  aria-label="Edit farmer"
                >
                  <Edit className="h-4 w-4" />
                </Button>
              </div>

              <div className="flex flex-wrap gap-3">
                <Button
                  variant="default"
                  className="font-custom gap-2 rounded-xl"
                  disabled={isPdfOpening}
                  onClick={() => setStockLedgerDialogOpen(true)}
                >
                  {isPdfOpening ? (
                    <>
                      <Spinner className="h-4 w-4" />
                      Generating PDF…
                    </>
                  ) : (
                    <>
                      <Package className="h-4 w-4" />
                      View Stock Ledger
                    </>
                  )}
                </Button>
              </div>

              <Dialog
                open={stockLedgerDialogOpen}
                onOpenChange={setStockLedgerDialogOpen}
              >
                <DialogContent
                  className="font-custom sm:max-w-md"
                  showCloseButton={true}
                >
                  <DialogHeader>
                    <DialogTitle>Stock Ledger</DialogTitle>
                  </DialogHeader>
                  <p className="font-custom text-muted-foreground text-sm">
                    Choose how you want to view or download the stock ledger.
                  </p>
                  <DialogFooter className="gap-2 sm:gap-0">
                    <Button
                      variant="default"
                      className="font-custom gap-2"
                      disabled={isPdfOpening}
                      onClick={() => {
                        setStockLedgerDialogOpen(false);
                        openStockLedgerPdf();
                      }}
                    >
                      {isPdfOpening ? (
                        <>
                          <Spinner className="h-4 w-4" />
                          Generating…
                        </>
                      ) : (
                        <>
                          <FileText className="h-4 w-4" />
                          View PDF
                        </>
                      )}
                    </Button>
                    <Button
                      variant="outline"
                      className="font-custom gap-2"
                      onClick={() => {
                        setStockLedgerDialogOpen(false);
                        downloadStockLedgerExcel(
                          link.farmerId?.name ?? 'Farmer',
                          stockLedgerRows
                        );
                      }}
                    >
                      <FileSpreadsheet className="h-4 w-4" />
                      Download Excel
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>

              <Separator />

              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="bg-primary/10 dark:bg-primary/20 flex h-12 w-12 shrink-0 items-center justify-center rounded-xl">
                      <ArrowUpFromLine className="text-primary h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-muted-foreground font-custom text-xs font-medium tracking-wide uppercase">
                        Incoming
                      </p>
                      <p className="font-custom text-xl font-bold tabular-nums">
                        {aggregates.totalBagsIncoming.toLocaleString('en-IN')}
                      </p>
                    </div>
                  </div>
                </div>
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="bg-primary/10 dark:bg-primary/20 flex h-12 w-12 shrink-0 items-center justify-center rounded-xl">
                      <Clock className="text-primary h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-muted-foreground font-custom text-xs font-medium tracking-wide uppercase">
                        Ungraded
                      </p>
                      <p className="font-custom text-xl font-bold tabular-nums">
                        {aggregates.totalBagsUngraded.toLocaleString('en-IN')}
                      </p>
                    </div>
                  </div>
                </div>
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="bg-primary/10 dark:bg-primary/20 flex h-12 w-12 shrink-0 items-center justify-center rounded-xl">
                      <Layers className="text-primary h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-muted-foreground font-custom text-xs font-medium tracking-wide uppercase">
                        Grading
                      </p>
                      <p className="font-custom text-xl font-bold tabular-nums">
                        {aggregates.totalBagsGraded.toLocaleString('en-IN')}
                      </p>
                    </div>
                  </div>
                </div>
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="bg-primary/10 dark:bg-primary/20 flex h-12 w-12 shrink-0 items-center justify-center rounded-xl">
                      <Warehouse className="text-primary h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-muted-foreground font-custom text-xs font-medium tracking-wide uppercase">
                        Storage
                      </p>
                      <p className="font-custom text-xl font-bold tabular-nums">
                        {aggregates.totalBagsStored.toLocaleString('en-IN')}
                      </p>
                    </div>
                  </div>
                </div>
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="bg-primary/10 dark:bg-primary/20 flex h-12 w-12 shrink-0 items-center justify-center rounded-xl">
                      <Truck className="text-primary h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-muted-foreground font-custom text-xs font-medium tracking-wide uppercase">
                        Dispatch
                      </p>
                      <p className="font-custom text-xl font-bold tabular-nums">
                        {aggregates.totalBagsNikasi.toLocaleString('en-IN')}
                      </p>
                    </div>
                  </div>
                </div>
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="bg-primary/10 dark:bg-primary/20 flex h-12 w-12 shrink-0 items-center justify-center rounded-xl">
                      <ArrowDownToLine className="text-primary h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-muted-foreground font-custom text-xs font-medium tracking-wide uppercase">
                        Outgoing
                      </p>
                      <p className="font-custom text-xl font-bold tabular-nums">
                        {aggregates.totalBagsOutgoing.toLocaleString('en-IN')}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

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
              count={incomingLoading ? 0 : incomingTotal}
              icon={<Receipt className="text-primary h-5 w-5" />}
              onRefresh={() => refetchIncoming()}
              isRefreshing={incomingFetching}
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
              {incomingLoading ? (
                <Card>
                  <CardContent className="py-12">
                    <p className="font-custom text-center text-sm text-gray-600">
                      Loading incoming gate passes…
                    </p>
                  </CardContent>
                </Card>
              ) : incomingError ? (
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
                          {incomingErrorDetail instanceof Error
                            ? incomingErrorDetail.message
                            : 'Something went wrong.'}
                        </p>
                      </EmptyContent>
                    </Empty>
                  </CardContent>
                </Card>
              ) : !paginatedIncoming.length ? (
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
                  {paginatedIncoming.map((pass) => {
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

              {paginatedIncoming.length > 0 && (
                <Item
                  variant="outline"
                  size="sm"
                  className="mt-6 flex flex-wrap items-center justify-between gap-3 rounded-xl px-4 py-3 sm:mt-8"
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
                          aria-disabled={page <= 1}
                          onClick={(e) => {
                            e.preventDefault();
                            if (page > 1) setPage(page - 1);
                          }}
                          style={
                            page <= 1
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
                          {page} / {incomingTotalPages}
                        </PaginationLink>
                      </PaginationItem>
                      <PaginationItem>
                        <PaginationNext
                          href="#"
                          className="font-custom focus-visible:ring-primary cursor-pointer rounded-lg focus-visible:ring-2 focus-visible:ring-offset-2"
                          aria-disabled={page >= incomingTotalPages}
                          onClick={(e) => {
                            e.preventDefault();
                            if (page < incomingTotalPages) setPage(page + 1);
                          }}
                          style={
                            page >= incomingTotalPages
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

          {/* Grading tab */}
          <TabsContent
            value="grading"
            className="mt-0 flex flex-col gap-4 outline-none"
          >
            <TabSummaryBar
              count={gradingLoading ? 0 : gradingTotal}
              icon={<ClipboardList className="text-primary h-5 w-5" />}
              onRefresh={() => refetchGrading()}
              isRefreshing={gradingFetching}
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
              {gradingLoading ? (
                <Card>
                  <CardContent className="py-12">
                    <p className="font-custom text-center text-sm text-gray-600">
                      Loading grading gate passes…
                    </p>
                  </CardContent>
                </Card>
              ) : gradingError ? (
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
                          {gradingErrorDetail instanceof Error
                            ? gradingErrorDetail.message
                            : 'Something went wrong.'}
                        </p>
                      </EmptyContent>
                    </Empty>
                  </CardContent>
                </Card>
              ) : !paginatedGrading.length ? (
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
                  {paginatedGrading.map((pass) => {
                    const props = toGradingVoucherProps(pass);
                    return (
                      <GradingVoucher
                        key={pass._id}
                        voucher={props.voucher}
                        farmerName={props.farmerName}
                        farmerAccount={props.farmerAccount}
                        farmerStorageLinkId={props.farmerStorageLinkId}
                        wastageKg={props.wastageKg}
                        wastagePercent={props.wastagePercent}
                        incomingNetKg={props.incomingNetKg}
                        incomingBagsCount={props.incomingBagsCount}
                        incomingGatePassIds={props.incomingGatePassIds}
                      />
                    );
                  })}
                </div>
              )}

              {paginatedGrading.length > 0 && (
                <Item
                  variant="outline"
                  size="sm"
                  className="mt-6 flex flex-wrap items-center justify-between gap-3 rounded-xl px-4 py-3 sm:mt-8"
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
                          aria-disabled={!gradingHasPrev}
                          onClick={(e) => {
                            e.preventDefault();
                            if (gradingHasPrev) setPage(Math.max(1, page - 1));
                          }}
                          style={
                            !gradingHasPrev
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
                          {page} / {gradingTotalPages}
                        </PaginationLink>
                      </PaginationItem>
                      <PaginationItem>
                        <PaginationNext
                          href="#"
                          className="font-custom focus-visible:ring-primary cursor-pointer rounded-lg focus-visible:ring-2 focus-visible:ring-offset-2"
                          aria-disabled={!gradingHasNext}
                          onClick={(e) => {
                            e.preventDefault();
                            if (gradingHasNext)
                              setPage(Math.min(gradingTotalPages, page + 1));
                          }}
                          style={
                            !gradingHasNext
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

          {/* Storage tab */}
          <TabsContent
            value="storage"
            className="mt-0 flex flex-col gap-4 outline-none"
          >
            <TabSummaryBar
              count={0}
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
                  <Link to="/store-admin/storage">
                    <Package className="h-4 w-4 shrink-0" />
                    Add Storage
                  </Link>
                </Button>
              </ItemFooter>
            </Item>
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
          </TabsContent>

          {/* Dispatch tab */}
          <TabsContent
            value="dispatch"
            className="mt-0 flex flex-col gap-4 outline-none"
          >
            <TabSummaryBar
              count={0}
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
                  <Link to="/store-admin/nikasi">
                    <Truck className="h-4 w-4 shrink-0" />
                    Add Dispatch
                  </Link>
                </Button>
              </ItemFooter>
            </Item>
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

export const Route = createFileRoute(
  '/store-admin/_authenticated/people/$farmerStorageLinkId/'
)({
  component: PeopleDetailPage,
});
