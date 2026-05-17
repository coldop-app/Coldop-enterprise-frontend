import { memo, useMemo } from 'react';
import { Link } from '@tanstack/react-router';
import { ArrowLeft } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useGetAllGatePassesOfFarmer } from '@/services/store-admin/people/useGetAllGatePassesOfFarmer';
import { usePreferencesStore } from '@/stores/store';
import {
  buildFinanceGradingVarietyGroups,
  buildFinancePlantingVarietyGroups,
} from './finance-calculations';
import GradingVarietyTable from './grading-variety-table';
import PlantingVarietyTable from './planting-variety-table';

export interface FinanceReportProps {
  farmerStorageLinkId: string;
}

const reportLinkClassName =
  'focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 rounded';

function gatePassesErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Something went wrong';
}

function FinanceReport({ farmerStorageLinkId }: FinanceReportProps) {
  const gatePasses = useGetAllGatePassesOfFarmer(farmerStorageLinkId);
  const {
    data: farmerSeedList,
    isLoading: isFarmerSeedsLoading,
    isError: isFarmerSeedsError,
    error: farmerSeedsError,
  } = gatePasses.farmerSeeds;
  const { data: incomingList, isLoading: isIncomingLoading } =
    gatePasses.incoming;
  const { data: gradingList } = gatePasses.grading;
  const preferences = usePreferencesStore((state) => state.preferences);

  const isLoading = isFarmerSeedsLoading || isIncomingLoading;
  const isError = isFarmerSeedsError;
  const error = farmerSeedsError;

  const plantingVarietyGroups = useMemo(
    () =>
      buildFinancePlantingVarietyGroups(
        farmerSeedList,
        incomingList,
        gradingList ?? [],
        preferences
      ),
    [farmerSeedList, incomingList, gradingList, preferences]
  );

  const gradingVarietyGroups = useMemo(
    () =>
      buildFinanceGradingVarietyGroups(
        farmerSeedList,
        incomingList,
        gradingList ?? [],
        preferences
      ),
    [farmerSeedList, incomingList, gradingList, preferences]
  );

  const errorDescription = useMemo(
    () => gatePassesErrorMessage(error),
    [error]
  );

  return (
    <section className="font-custom space-y-8 px-4 py-6 sm:px-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <h1 className="font-custom text-2xl font-bold tracking-tight text-[#333] lg:text-3xl">
            Finance report
          </h1>
          <p className="font-custom text-sm text-gray-600">
            Planting and grading breakdown for this farmer.
          </p>
        </div>
        <Button variant="outline" size="sm" className="gap-1.5" asChild>
          <Link
            to="/store-admin/people/$farmerStorageLinkId"
            params={{ farmerStorageLinkId }}
            preload="intent"
            className={reportLinkClassName}
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Back to profile
          </Link>
        </Button>
      </div>

      {isLoading ? (
        <Skeleton className="font-custom text-muted-foreground h-[280px] w-full rounded-2xl" />
      ) : isError ? (
        <p className="font-custom text-destructive text-sm">
          {errorDescription}
        </p>
      ) : plantingVarietyGroups.length === 0 ? (
        <p className="font-custom text-muted-foreground text-sm">
          No planting or grading data to show.
        </p>
      ) : (
        <div className="space-y-10">
          {plantingVarietyGroups.map((plantingGroup) => {
            const gradingGroup = gradingVarietyGroups.find(
              (g) => g.varietyKey === plantingGroup.varietyKey
            );
            return (
              <div key={plantingGroup.varietyKey} className="space-y-4">
                <PlantingVarietyTable varietyGroups={[plantingGroup]} />
                <GradingVarietyTable
                  varietyGroups={gradingGroup ? [gradingGroup] : []}
                />
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}

export default memo(FinanceReport);
