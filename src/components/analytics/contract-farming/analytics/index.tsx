import * as React from 'react';

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

import { FarmerPerformanceTab } from './tabs/farmer-performance-tab';
import { FinancialTab } from './tabs/financial-tab';
import { GradeQualityTab } from './tabs/grade-quality-tab';
import { OverviewTab } from './tabs/overview-tab';
import { VarietyComparisonTab } from './tabs/variety-comparison-tab';
import { useAnalyticsData } from './use-analytics-data';

export interface ContractFarmingAnalyticsProps {
  rows: Record<string, string | number | null>[];
  nullNetAmountRatio: number;
}

function ContractFarmingAnalytics({
  rows,
  nullNetAmountRatio,
}: ContractFarmingAnalyticsProps) {
  const {
    gradeKeys,
    farmerRows,
    varietyGroups,
    aggregateGradeDistribution,
    kpis,
  } = useAnalyticsData(rows);

  return (
    <Tabs defaultValue="overview" className="font-custom w-full space-y-4">
      <TabsList
        variant="line"
        className="font-custom bg-muted/40 flex h-auto w-full max-w-full flex-wrap justify-start gap-1 rounded-lg p-1"
      >
        <TabsTrigger
          value="overview"
          className="font-custom focus-visible:ring-primary rounded-md px-3 py-2 text-xs sm:text-sm"
        >
          Overview
        </TabsTrigger>
        <TabsTrigger
          value="grade-quality"
          className="font-custom focus-visible:ring-primary rounded-md px-3 py-2 text-xs sm:text-sm"
        >
          Grade Quality
        </TabsTrigger>
        <TabsTrigger
          value="farmer-performance"
          className="font-custom focus-visible:ring-primary rounded-md px-3 py-2 text-xs sm:text-sm"
        >
          Farmer Performance
        </TabsTrigger>
        <TabsTrigger
          value="variety-comparison"
          className="font-custom focus-visible:ring-primary rounded-md px-3 py-2 text-xs sm:text-sm"
        >
          Variety Comparison
        </TabsTrigger>
        <TabsTrigger
          value="financial"
          className="font-custom focus-visible:ring-primary rounded-md px-3 py-2 text-xs sm:text-sm"
        >
          Financial
        </TabsTrigger>
      </TabsList>

      <TabsContent value="overview" className="mt-4 space-y-6">
        <OverviewTab
          kpis={kpis}
          farmerRows={farmerRows}
          gradeKeys={gradeKeys}
        />
      </TabsContent>

      <TabsContent value="grade-quality" className="mt-4 space-y-6">
        <GradeQualityTab
          farmerRows={farmerRows}
          gradeKeys={gradeKeys}
          aggregateGradeDistribution={aggregateGradeDistribution}
        />
      </TabsContent>

      <TabsContent value="farmer-performance" className="mt-4 space-y-6">
        <FarmerPerformanceTab farmerRows={farmerRows} gradeKeys={gradeKeys} />
      </TabsContent>

      <TabsContent value="variety-comparison" className="mt-4 space-y-6">
        <VarietyComparisonTab varietyGroups={varietyGroups} />
      </TabsContent>

      <TabsContent value="financial" className="mt-4 space-y-6">
        <FinancialTab
          farmerRows={farmerRows}
          nullNetAmountRatio={nullNetAmountRatio}
        />
      </TabsContent>
    </Tabs>
  );
}

export default React.memo(ContractFarmingAnalytics);
