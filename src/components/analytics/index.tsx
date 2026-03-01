import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  Item,
  ItemHeader,
  ItemMedia,
  ItemTitle,
  ItemActions,
} from '@/components/ui/item';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { BarChart3, RefreshCw, Download } from 'lucide-react';
import { DatePicker } from '@/components/forms/date-picker';
import { formatDateToYYYYMMDD } from '@/lib/helpers';
import { queryClient } from '@/lib/queryClient';
import {
  useGetOverview,
  analyticsOverviewQueryOptions,
} from '@/services/store-admin/analytics/useGetOverview';
import { incomingGatePassesQueryOptions } from '@/services/store-admin/incoming-gate-pass/useGetIncomingGatePasses';
import { useGetGradingGatePasses } from '@/services/store-admin/grading-gate-pass/useGetGradingGatePasses';
import Overview from './overview';
import IncomingGatePassAnalyticsScreen from './incoming';
import GradingGatePassAnalyticsScreen from './grading';

const AnalyticsPage = () => {
  const [fromDate, setFromDate] = useState<string | undefined>();
  const [toDate, setToDate] = useState<string | undefined>();
  const [appliedDateParams, setAppliedDateParams] = useState<
    { dateFrom: string; dateTo: string } | Record<string, never>
  >({});

  const handleApply = async () => {
    if (!fromDate || !toDate) return;
    const newParams = {
      dateFrom: formatDateToYYYYMMDD(fromDate),
      dateTo: formatDateToYYYYMMDD(toDate),
    };
    const fetchPromise = Promise.all([
      queryClient.fetchQuery(analyticsOverviewQueryOptions(newParams)),
      queryClient.fetchQuery(incomingGatePassesQueryOptions(newParams)),
    ]);
    toast.promise(fetchPromise, {
      loading: 'Applying date filters…',
      success: 'Date filters applied. Data updated.',
      error: 'Failed to load data for the selected range.',
    });
    try {
      await fetchPromise;
      setAppliedDateParams(newParams);
    } catch {
      // Toast already shown by toast.promise
    }
  };

  const { refetch, isFetching } = useGetOverview(appliedDateParams);
  const incomingQuery = useQuery(
    incomingGatePassesQueryOptions(appliedDateParams)
  );
  const gradingQuery = useGetGradingGatePasses();

  const handleResetDates = async () => {
    const fetchPromise = Promise.all([
      queryClient.fetchQuery(analyticsOverviewQueryOptions({})),
      queryClient.fetchQuery(incomingGatePassesQueryOptions({})),
    ]);
    toast.promise(fetchPromise, {
      loading: 'Clearing date filters…',
      success: 'Date filters cleared. Data updated.',
      error: 'Failed to refetch data.',
    });
    try {
      await fetchPromise;
      setFromDate(undefined);
      setToDate(undefined);
      setAppliedDateParams({});
    } catch {
      // Toast already shown by toast.promise
    }
  };

  return (
    <main className="mx-auto max-w-7xl p-3 sm:p-4 lg:p-6">
      <div className="space-y-4 sm:space-y-6">
        {/* Header: title + refresh */}
        <Item variant="outline" size="sm" className="rounded-xl shadow-sm">
          <ItemHeader className="h-full">
            <div className="flex items-center gap-3">
              <ItemMedia variant="icon" className="rounded-lg">
                <BarChart3 className="text-primary h-5 w-5" />
              </ItemMedia>
              <ItemTitle className="font-custom text-sm font-semibold sm:text-base">
                Analytics
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

        {/* Date range + export */}
        <Item variant="outline" size="sm" className="rounded-xl">
          <div className="flex w-full flex-wrap items-end justify-between gap-4 sm:gap-6">
            <div className="flex flex-wrap items-end gap-4 sm:gap-6">
              <DatePicker
                id="analytics-from"
                label="From"
                value={fromDate ?? ''}
                onChange={setFromDate}
              />
              <DatePicker
                id="analytics-to"
                label="To"
                value={toDate ?? ''}
                onChange={setToDate}
              />
              <Button
                variant="default"
                size="default"
                disabled={!fromDate || !toDate}
                onClick={handleApply}
                className="font-custom shrink-0"
              >
                Apply
              </Button>
              <Button
                variant="outline"
                size="default"
                disabled={
                  Object.keys(appliedDateParams).length === 0 &&
                  !fromDate &&
                  !toDate
                }
                onClick={handleResetDates}
                className="font-custom shrink-0"
              >
                Reset
              </Button>
            </div>
            <Button
              variant="default"
              className="font-custom ml-auto shrink-0 gap-2 rounded-lg"
            >
              <Download className="h-4 w-4 shrink-0" />
              Export report
            </Button>
          </div>
        </Item>

        <Overview dateParams={appliedDateParams} />
        <Tabs defaultValue="incoming" className="font-custom w-full">
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
              value="dispatch"
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
          <div className="p-4">
            <TabsContent value="incoming" className="mt-0 outline-none">
              <IncomingGatePassAnalyticsScreen
                queryResult={incomingQuery}
                dateParams={appliedDateParams}
              />
            </TabsContent>
            <TabsContent value="grading" className="mt-0 outline-none">
              <GradingGatePassAnalyticsScreen queryResult={gradingQuery} />
            </TabsContent>
            <TabsContent value="storage" className="mt-0 outline-none">
              <p className="font-custom text-sm leading-relaxed text-gray-600">
                Storage analytics content will appear here. This section will
                show warehouse and storage movement data.
              </p>
            </TabsContent>
            <TabsContent value="dispatch" className="mt-0 outline-none">
              <p className="font-custom text-sm leading-relaxed text-gray-600">
                Dispatch (nikasi) analytics content will appear here. This
                section will show gate pass and dispatch summaries.
              </p>
            </TabsContent>
            <TabsContent value="outgoing" className="mt-0 outline-none">
              <p className="font-custom text-sm leading-relaxed text-gray-600">
                Outgoing analytics content will appear here. This section will
                show final delivery and outward movement data.
              </p>
            </TabsContent>
          </div>
        </Tabs>
      </div>
    </main>
  );
};

export default AnalyticsPage;
