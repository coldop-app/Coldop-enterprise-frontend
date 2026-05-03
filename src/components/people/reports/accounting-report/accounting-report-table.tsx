import { memo, useMemo } from 'react';
// import FarmerSeedTable from '@/components/people/reports/farmer-seed-table';
import GradingTable from '@/components/people/reports/grading-table';
import IncomingTable from '@/components/people/reports/incoming-table';
// import SummaryTable from '@/components/people/reports/summary-table';
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from '@/components/ui/empty';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useGetAllGatePassesOfFarmer } from '@/services/store-admin/people/useGetAllGatePassesOfFarmer';
import { prepareDataForGradingTable } from '../helpers/grading-prepare';
import { prepareDataForIncomingTable } from '../helpers/incoming-prepare';

export interface AccountingReportTableProps {
  farmerStorageLinkId: string;
}

function incomingErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Something went wrong';
}

const AccountingReportTable = ({
  farmerStorageLinkId,
}: AccountingReportTableProps) => {
  const gatePassesResponse = useGetAllGatePassesOfFarmer(farmerStorageLinkId);
  const {
    data: incomingList,
    isLoading,
    isError,
    error,
  } = gatePassesResponse.incoming;
  const { data: gradingList } = gatePassesResponse.grading;

  const incomingTableData = useMemo(
    () => prepareDataForIncomingTable(incomingList),
    [incomingList]
  );

  const gradingTableData = useMemo(
    () => prepareDataForGradingTable(gradingList),
    [gradingList]
  );

  return (
    <main className="from-background via-muted/20 to-background mx-auto max-w-7xl bg-linear-to-b p-3 sm:p-4 lg:p-6">
      <div className="space-y-4">
        <Card className="border-border/40 ring-primary/5 overflow-hidden rounded-2xl border py-0 shadow-[0_1px_2px_rgba(0,0,0,0.05),0_8px_24px_rgba(0,0,0,0.04)] ring-1">
          <CardHeader className="border-border/40 bg-secondary/50 space-y-1.5 border-b px-3 py-3 sm:px-4 sm:py-4">
            <CardTitle className="font-custom text-lg font-semibold text-[#333] sm:text-xl">
              Incoming
            </CardTitle>
            <CardDescription className="font-custom leading-relaxed text-gray-600">
              Manual gate passes, store, truck, variety, bags, weight slip,
              gross, tare, net, bardana, and actual weight.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="space-y-4 p-4">
                <Skeleton className="font-custom text-muted-foreground h-[280px] w-full rounded-2xl" />
              </div>
            ) : isError ? (
              <div className="p-4">
                <Empty className="border-border/50 rounded-xl border py-12">
                  <EmptyHeader>
                    <EmptyTitle className="font-custom">
                      Could not load incoming gate passes
                    </EmptyTitle>
                    <EmptyDescription className="font-custom">
                      {incomingErrorMessage(error)}
                    </EmptyDescription>
                  </EmptyHeader>
                </Empty>
              </div>
            ) : (
              <div className="w-full">
                <IncomingTable rows={incomingTableData} />
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border-border/40 ring-primary/5 overflow-hidden rounded-2xl border py-0 shadow-[0_1px_2px_rgba(0,0,0,0.05),0_8px_24px_rgba(0,0,0,0.04)] ring-1">
          <CardHeader className="border-border/40 bg-secondary/50 space-y-1.5 border-b px-3 py-3 sm:px-4 sm:py-4">
            <CardTitle className="font-custom text-lg font-semibold text-[#333] sm:text-xl">
              Grading
            </CardTitle>
            <CardDescription className="font-custom leading-relaxed text-gray-600">
              Grading gate passes: incoming reference, manual numbers, variety,
              date, all bag-size lines (bags, gross weight, bag type), and total
              kg.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="space-y-4 p-4">
                <Skeleton className="font-custom text-muted-foreground h-[280px] w-full rounded-2xl" />
              </div>
            ) : isError ? (
              <div className="p-4">
                <Empty className="border-border/50 rounded-xl border py-12">
                  <EmptyHeader>
                    <EmptyTitle className="font-custom">
                      Could not load grading gate passes
                    </EmptyTitle>
                    <EmptyDescription className="font-custom">
                      {incomingErrorMessage(error)}
                    </EmptyDescription>
                  </EmptyHeader>
                </Empty>
              </div>
            ) : (
              <div className="w-full">
                <GradingTable rows={gradingTableData} />
              </div>
            )}
          </CardContent>
        </Card>

        {/* <Card className="border-border/40 ring-primary/5 overflow-hidden rounded-2xl border py-0 shadow-[0_1px_2px_rgba(0,0,0,0.05),0_8px_24px_rgba(0,0,0,0.04)] ring-1">
          <CardHeader className="border-border/40 bg-secondary/50 space-y-1.5 border-b px-3 py-3 sm:px-4 sm:py-4">
            <CardTitle className="font-custom text-lg font-semibold text-[#333] sm:text-xl">
              Summary
            </CardTitle>
            <CardDescription className="font-custom leading-relaxed text-gray-600">
              Rolled-up line by type: size columns, weight per bag, received and
              bardana weights, actual weight, rate, amount payable, and
              graded-size share.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <div className="w-full">
              <SummaryTable />
            </div>
          </CardContent>
        </Card> */}

        {/* <Card className="border-border/40 ring-primary/5 overflow-hidden rounded-2xl border py-0 shadow-[0_1px_2px_rgba(0,0,0,0.05),0_8px_24px_rgba(0,0,0,0.04)] ring-1">
          <CardHeader className="border-border/40 bg-secondary/50 space-y-1.5 border-b px-3 py-3 sm:px-4 sm:py-4">
            <CardTitle className="font-custom text-lg font-semibold text-[#333] sm:text-xl">
              Farmer seed
            </CardTitle>
            <CardDescription className="font-custom leading-relaxed text-gray-600">
              Seed dispatch dates, size issued, bags per acre, rate per bag, and
              total seed amount.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <div className="w-full">
              <FarmerSeedTable />
            </div>
          </CardContent>
        </Card> */}
      </div>
    </main>
  );
};

export default memo(AccountingReportTable);
