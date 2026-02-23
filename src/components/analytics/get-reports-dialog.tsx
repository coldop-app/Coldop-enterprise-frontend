import { useState, useRef, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';

import { DatePicker } from '@/components/forms/date-picker';
import { FileText } from 'lucide-react';
import { formatDate } from '@/lib/helpers';
import { formatDateToYYYYMMDD } from '@/lib/helpers';
import {
  incomingGatePassReportQueryOptions,
  type GetIncomingGatePassReportParams,
} from '@/services/store-admin/analytics/incoming/useGetIncomingGatePassReports';
import {
  gradingGatePassReportQueryOptions,
  type GetGradingGatePassReportParams,
} from '@/services/store-admin/analytics/grading/useGetGradingGatePassReports';
import {
  storageGatePassReportQueryOptions,
  type GetStorageGatePassReportParams,
} from '@/services/store-admin/analytics/storage/useGetStorageGatePassReports';
import {
  addGradingStatusToIncomingReport,
  filterIncomingReportToUngraded,
} from '@/components/analytics/incoming/format-data';
import { useStore } from '@/stores/store';
import { toast } from 'sonner';

/** Report type used when opening Get Reports dialog from a specific overview card */
export type OverviewReportType =
  | 'incoming'
  | 'ungraded'
  | 'grading'
  | 'stored'
  | 'dispatch'
  | 'outgoing';

export interface GetReportsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  reportType: OverviewReportType;
}

function formatDateRangeLabel(from: string, to: string): string {
  if (!from || !to) return '';
  const formatPart = (s: string) => {
    const [y, m, d] = s.split('-');
    return `${d ?? ''}/${m ?? ''}/${String(y ?? '').slice(2)}`;
  };
  return `${formatPart(from)} – ${formatPart(to)}`;
}

const defaultDateString = formatDate(new Date());

export function GetReportsDialog({
  open,
  onOpenChange,
  reportType,
}: GetReportsDialogProps) {
  const [fromDate, setFromDate] = useState(defaultDateString);
  const [toDate, setToDate] = useState(defaultDateString);
  const [groupByFarmer, setGroupByFarmer] = useState(false);
  const [submittedParams, setSubmittedParams] = useState<
    | GetIncomingGatePassReportParams
    | GetGradingGatePassReportParams
    | GetStorageGatePassReportParams
    | null
  >(null);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const userTriggeredFetchRef = useRef(false);

  const coldStorage = useStore((s) => s.coldStorage);

  const isIncoming = reportType === 'incoming';
  const isUngraded = reportType === 'ungraded';
  const isGrading = reportType === 'grading';
  const isStored = reportType === 'stored';
  const queryParams =
    submittedParams ?? ({} as GetIncomingGatePassReportParams);
  const gradingQueryParams =
    submittedParams ?? ({} as GetGradingGatePassReportParams);
  const storageQueryParams =
    submittedParams ?? ({} as GetStorageGatePassReportParams);

  const incomingQuery = useQuery({
    ...incomingGatePassReportQueryOptions(queryParams),
    enabled:
      (isIncoming || isUngraded) &&
      submittedParams != null &&
      submittedParams.dateFrom != null &&
      submittedParams.dateTo != null,
    staleTime: 0,
    gcTime: 0,
  });

  const gradingQuery = useQuery({
    ...gradingGatePassReportQueryOptions(gradingQueryParams),
    enabled:
      (isIncoming || isUngraded || isGrading) &&
      submittedParams != null &&
      submittedParams.dateFrom != null &&
      submittedParams.dateTo != null,
    staleTime: 0,
    gcTime: 0,
  });

  const storageQuery = useQuery({
    ...storageGatePassReportQueryOptions(storageQueryParams),
    enabled:
      isStored &&
      submittedParams != null &&
      submittedParams.dateFrom != null &&
      submittedParams.dateTo != null,
    staleTime: 0,
    gcTime: 0,
  });

  useEffect(() => {
    if (!userTriggeredFetchRef.current) return;
    const incomingDone =
      (isIncoming || isUngraded) &&
      incomingQuery.isSuccess &&
      incomingQuery.data != null &&
      gradingQuery.isSuccess &&
      gradingQuery.data != null;
    const gradingDone =
      isGrading && gradingQuery.isSuccess && gradingQuery.data != null;
    const storageDone =
      isStored && storageQuery.isSuccess && storageQuery.data != null;
    if (incomingDone || gradingDone || storageDone) {
      toast.success('Reports refreshed', {
        id: 'get-reports',
        description: 'Report data is ready. You can view the PDF.',
      });
      userTriggeredFetchRef.current = false;
    }
    if (incomingQuery.isError || gradingQuery.isError || storageQuery.isError) {
      toast.dismiss('get-reports');
      userTriggeredFetchRef.current = false;
    }
  }, [
    isIncoming,
    isUngraded,
    isGrading,
    isStored,
    incomingQuery.isSuccess,
    incomingQuery.isError,
    incomingQuery.data,
    gradingQuery.isSuccess,
    gradingQuery.isError,
    gradingQuery.data,
    storageQuery.isSuccess,
    storageQuery.isError,
    storageQuery.data,
  ]);

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) setSubmittedParams(null);
    onOpenChange(nextOpen);
  };

  const handleGetReports = () => {
    if (
      reportType !== 'incoming' &&
      reportType !== 'ungraded' &&
      reportType !== 'grading' &&
      reportType !== 'stored'
    )
      return;

    const dateFrom = fromDate.trim() ? formatDateToYYYYMMDD(fromDate) : '';
    const dateTo = toDate.trim() ? formatDateToYYYYMMDD(toDate) : '';

    if (!dateFrom || !dateTo) {
      toast.error('Please select both From and To dates.');
      return;
    }

    const newParams: GetIncomingGatePassReportParams = {
      dateFrom,
      dateTo,
      groupByFarmer,
    };

    const sameParams =
      submittedParams?.dateFrom === dateFrom &&
      submittedParams?.dateTo === dateTo &&
      submittedParams?.groupByFarmer === groupByFarmer;

    userTriggeredFetchRef.current = true;
    toast.loading('Fetching reports…', { id: 'get-reports' });
    setSubmittedParams(newParams);

    if (sameParams) {
      if (reportType === 'incoming' || reportType === 'ungraded') {
        void Promise.all([incomingQuery.refetch(), gradingQuery.refetch()]);
      } else if (reportType === 'grading') {
        void gradingQuery.refetch();
      } else if (reportType === 'stored') {
        void storageQuery.refetch();
      }
    }
  };

  const handleReset = () => {
    setFromDate(defaultDateString);
    setToDate(defaultDateString);
    setGroupByFarmer(false);
    setSubmittedParams(null);
  };

  const handleViewPdf = async () => {
    const companyName = coldStorage?.name ?? 'Cold Storage';
    const dateRangeLabel = formatDateRangeLabel(
      submittedParams?.dateFrom ?? '',
      submittedParams?.dateTo ?? ''
    );

    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(
        '<html><body style="font-family:sans-serif;padding:2rem;text-align:center;color:#666;">Generating PDF…</body></html>'
      );
    }

    setIsGeneratingPdf(true);
    try {
      if (reportType === 'grading') {
        const gradingData = gradingQuery.data;
        if (!gradingData) return;
        const [{ pdf }, { GradingGatePassReportPdf }] = await Promise.all([
          import('@react-pdf/renderer'),
          import('@/components/pdf/analytics/grading-gate-pass-report.pdf'),
        ]);
        const blob = await pdf(
          <GradingGatePassReportPdf
            companyName={companyName}
            dateRangeLabel={dateRangeLabel}
            data={gradingData}
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
          duration: 3000,
          description: 'Grading gate pass report is ready to view or print.',
        });
        return;
      }

      if (reportType === 'stored') {
        const storageData = storageQuery.data;
        if (!storageData) return;
        const [{ pdf }, { StorageGatePassReportPdf }] = await Promise.all([
          import('@react-pdf/renderer'),
          import('@/components/pdf/analytics/storage-gate-pass-report.pdf'),
        ]);
        const blob = await pdf(
          <StorageGatePassReportPdf
            companyName={companyName}
            dateRangeLabel={dateRangeLabel}
            data={storageData}
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
          duration: 3000,
          description: 'Storage gate pass report is ready to view or print.',
        });
        return;
      }

      const incomingData = incomingQuery.data;
      const gradingData = gradingQuery.data;
      if (!incomingData || !gradingData) return;

      const dataWithStatus = addGradingStatusToIncomingReport(
        incomingData,
        gradingData
      );

      const dataToRender =
        reportType === 'ungraded'
          ? filterIncomingReportToUngraded(dataWithStatus)
          : dataWithStatus;

      const [{ pdf }, { IncomingGatePassReportPdf }] = await Promise.all([
        import('@react-pdf/renderer'),
        import('@/components/pdf/analytics/incoming-gate-pass-report-pdf'),
      ]);
      const blob = await pdf(
        <IncomingGatePassReportPdf
          companyName={companyName}
          dateRangeLabel={dateRangeLabel}
          data={dataToRender}
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
        duration: 3000,
        description:
          reportType === 'ungraded'
            ? 'Ungraded bags gate pass report is ready to view or print.'
            : 'Incoming gate pass report is ready to view or print.',
      });
    } catch {
      if (printWindow) printWindow.close();
      toast.error('Could not generate PDF', {
        description: 'Please try again.',
      });
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  const isLoading =
    ((isIncoming || isUngraded) &&
      (incomingQuery.isFetching || gradingQuery.isFetching)) ||
    (isGrading && gradingQuery.isFetching) ||
    (isStored && storageQuery.isFetching);
  const isError =
    ((isIncoming || isUngraded) &&
      (incomingQuery.isError || gradingQuery.isError)) ||
    (isGrading && gradingQuery.isError) ||
    (isStored && storageQuery.isError);
  const errorMessage =
    (isIncoming || isUngraded) && incomingQuery.error instanceof Error
      ? incomingQuery.error.message
      : (isIncoming || isUngraded || isGrading) &&
          gradingQuery.error instanceof Error
        ? gradingQuery.error.message
        : isStored && storageQuery.error instanceof Error
          ? storageQuery.error.message
          : null;
  const reportReady =
    ((isIncoming || isUngraded) &&
      incomingQuery.isSuccess &&
      incomingQuery.data != null &&
      gradingQuery.isSuccess &&
      gradingQuery.data != null) ||
    (isGrading && gradingQuery.isSuccess && gradingQuery.data != null) ||
    (isStored && storageQuery.isSuccess && storageQuery.data != null);

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="font-custom sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Get Reports</DialogTitle>
        </DialogHeader>

        <div className="grid gap-4 py-2">
          <DatePicker
            id="reports-from-date"
            label="From"
            value={fromDate}
            onChange={setFromDate}
          />

          <DatePicker
            id="reports-to-date"
            label="To"
            value={toDate}
            onChange={setToDate}
          />

          <div className="flex items-center gap-2 pt-1">
            <Checkbox
              id="reports-group-by-farmers"
              checked={groupByFarmer}
              onCheckedChange={(checked) => setGroupByFarmer(checked === true)}
            />
            <Label
              htmlFor="reports-group-by-farmers"
              className="font-custom cursor-pointer text-sm font-normal"
            >
              Group by farmers
            </Label>
          </div>

          {reportType !== 'incoming' &&
            reportType !== 'ungraded' &&
            reportType !== 'grading' &&
            reportType !== 'stored' && (
              <p className="text-muted-foreground font-custom text-sm">
                Report for this section is not available yet.
              </p>
            )}

          {(isIncoming || isUngraded || isGrading || isStored) && isLoading && (
            <p className="text-muted-foreground font-custom text-sm">
              Loading report…
            </p>
          )}
          {(isIncoming || isUngraded || isGrading || isStored) &&
            isError &&
            errorMessage && (
              <p className="font-custom text-destructive text-sm">
                {errorMessage}
              </p>
            )}
        </div>

        <DialogFooter className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:justify-end sm:gap-4">
          <DialogClose asChild>
            <Button variant="outline" className="font-custom w-full sm:w-auto">
              Cancel
            </Button>
          </DialogClose>

          <Button
            variant="outline"
            className="font-custom w-full sm:w-auto"
            onClick={handleReset}
          >
            Reset
          </Button>

          <Button
            className="font-custom w-full sm:w-auto"
            onClick={handleGetReports}
            disabled={
              (isIncoming || isUngraded || isGrading || isStored) && isLoading
            }
          >
            Get Reports
          </Button>

          {reportReady && (
            <Button
              onClick={handleViewPdf}
              disabled={isGeneratingPdf}
              className="font-custom w-full gap-2 sm:w-auto"
            >
              <FileText className="h-4 w-4" />
              {isGeneratingPdf ? 'Generating…' : 'View PDF'}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
