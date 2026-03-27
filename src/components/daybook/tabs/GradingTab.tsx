import { memo, useMemo, useState } from 'react';
import { Link } from '@tanstack/react-router';
import { Card, CardContent } from '@/components/ui/card';
import { Item, ItemFooter } from '@/components/ui/item';
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
import { Search, ChevronDown, ClipboardList } from 'lucide-react';
import {
  Empty,
  EmptyHeader,
  EmptyTitle,
  EmptyContent,
  EmptyMedia,
} from '@/components/ui/empty';
import { GradingVoucher } from '../vouchers';
import type { GradingVoucherProps } from '../vouchers';
import type { GradingGatePass } from '@/types/grading-gate-pass';
import { TabSummaryBar, LIMIT_OPTIONS } from './shared';
import { GetReportsDialog } from '@/components/analytics/get-reports-dialog';

/** Map API grading gate pass to GradingVoucher props */
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

export interface GradingTabProps {
  searchQuery: string;
  onSearchQueryChange: (value: string) => void;
  sortOrder: 'asc' | 'desc';
  onSortOrderChange: (value: 'asc' | 'desc') => void;
  page: number;
  onPageChange: (page: number) => void;
  limit: number;
  onLimitChange: (limit: number) => void;
  data: GradingGatePass[] | undefined;
  total: number;
  isLoading: boolean;
  isError: boolean;
  error: unknown;
  totalPages: number;
  hasPrev: boolean;
  hasNext: boolean;
}

const GradingTab = memo(function GradingTab({
  searchQuery,
  onSearchQueryChange,
  sortOrder,
  onSortOrderChange,
  page,
  onPageChange,
  limit,
  onLimitChange,
  data: gradingGatePassData,
  total,
  isLoading: gradingLoading,
  isError: gradingError,
  error: gradingErrorDetail,
  totalPages,
  hasPrev,
  hasNext,
}: GradingTabProps) {
  const [dailyReportDialogOpen, setDailyReportDialogOpen] = useState(false);

  const filteredBySearch = useMemo(() => {
    if (!gradingGatePassData?.length) return gradingGatePassData ?? [];
    const q = searchQuery.trim().toLowerCase();
    if (!q) return gradingGatePassData;
    return gradingGatePassData.filter((pass) => {
      const no = String(pass.gatePassNo ?? '');
      const dateStr = pass.date
        ? new Date(pass.date).toLocaleDateString('en-IN')
        : '';
      return no.toLowerCase().includes(q) || dateStr.toLowerCase().includes(q);
    });
  }, [gradingGatePassData, searchQuery]);

  return (
    <>
      <TabSummaryBar
        count={gradingLoading ? 0 : total}
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
            onChange={(e) => onSearchQueryChange(e.target.value)}
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
              <DropdownMenuItem onClick={() => onSortOrderChange('asc')}>
                Oldest first
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onSortOrderChange('desc')}>
                Latest first
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <div className="flex w-full shrink-0 flex-col gap-2 sm:w-auto sm:flex-row">
            <Button
              variant="secondary"
              className="font-custom h-10 w-full sm:w-auto"
              onClick={() => setDailyReportDialogOpen(true)}
            >
              View Daily Report
            </Button>
            <Button className="font-custom h-10 w-full gap-2 sm:w-auto" asChild>
              <Link to="/store-admin/grading">
                <ClipboardList className="h-4 w-4 shrink-0" />
                Add Grading
              </Link>
            </Button>
          </div>
        </ItemFooter>
      </Item>

      <GetReportsDialog
        open={dailyReportDialogOpen}
        onOpenChange={setDailyReportDialogOpen}
        reportType="grading"
      />

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
                  <EmptyTitle>Failed to load grading gate passes</EmptyTitle>
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
        ) : !filteredBySearch?.length ? (
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
                    <Link to="/store-admin/grading">Add Grading voucher</Link>
                  </Button>
                </EmptyContent>
              </Empty>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            {filteredBySearch.map((pass) => {
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

        {(filteredBySearch?.length ?? 0) > 0 && (
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
                  <DropdownMenuItem key={n} onClick={() => onLimitChange(n)}>
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
                      if (hasPrev) onPageChange(Math.max(1, page - 1));
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
                      if (hasNext) onPageChange(Math.min(totalPages, page + 1));
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
    </>
  );
});

export default GradingTab;
