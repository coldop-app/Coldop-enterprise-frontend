import { memo, useMemo } from 'react';
import FarmerSeedTable from '../farmer-seed-table';
import GradingTable from '@/components/people/reports/grading-table';
import IncomingTable from '@/components/people/reports/incoming-table';
import SummaryTable from '@/components/people/reports/summary-table';
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
import { prepareDataForFarmerSeedTable } from '../helpers/seed-prepare';

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
  const { data: farmerSeedList } = gatePassesResponse.farmerSeeds;

  const incomingTableData = useMemo(
    () => prepareDataForIncomingTable(incomingList),
    [incomingList]
  );

  const gradingTableData = useMemo(
    () => prepareDataForGradingTable(gradingList),
    [gradingList]
  );
  const farmerSeedTableData = useMemo(
    () => prepareDataForFarmerSeedTable(farmerSeedList),
    [farmerSeedList]
  );

  const incomingFetchErrorDescription = useMemo(
    () => incomingErrorMessage(error),
    [error]
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
                      {incomingFetchErrorDescription}
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
                      {incomingFetchErrorDescription}
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

        <Card className="border-border/40 ring-primary/5 overflow-hidden rounded-2xl border py-0 shadow-[0_1px_2px_rgba(0,0,0,0.05),0_8px_24px_rgba(0,0,0,0.04)] ring-1">
          <CardHeader className="border-border/40 bg-secondary/50 space-y-1.5 border-b px-3 py-3 sm:px-4 sm:py-4">
            <CardTitle className="font-custom text-lg font-semibold text-[#333] sm:text-xl">
              Summary
            </CardTitle>
            <CardDescription className="font-custom leading-relaxed text-gray-600">
              Rows follow bag-size column order (like the PDF summary): lines
              that share a size are grouped together; different weights stay on
              separate lines. Wt/Bag shows the bucket weight; size totals are in
              the footer.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="space-y-4 p-4">
                <Skeleton className="font-custom text-muted-foreground h-[200px] w-full rounded-2xl" />
              </div>
            ) : isError ? (
              <div className="p-4">
                <Empty className="border-border/50 rounded-xl border py-12">
                  <EmptyHeader>
                    <EmptyTitle className="font-custom">
                      Could not load summary (grading gate passes)
                    </EmptyTitle>
                    <EmptyDescription className="font-custom">
                      {incomingFetchErrorDescription}
                    </EmptyDescription>
                  </EmptyHeader>
                </Empty>
              </div>
            ) : (
              <div className="w-full">
                <SummaryTable gradingGatePasses={gradingList} />
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border-border/40 ring-primary/5 overflow-hidden rounded-2xl border py-0 shadow-[0_1px_2px_rgba(0,0,0,0.05),0_8px_24px_rgba(0,0,0,0.04)] ring-1">
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
              <FarmerSeedTable rows={farmerSeedTableData} />
            </div>
          </CardContent>
        </Card>
      </div>
    </main>
  );
};

export default memo(AccountingReportTable);
