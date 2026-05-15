import * as React from 'react';
import {
  AVG_QUINTAL_PER_ACRE_COLUMN_ID,
  BUY_BACK_AMOUNT_COLUMN_ID,
  NET_AMOUNT_COLUMN_ID,
  NET_AMOUNT_PER_ACRE_COLUMN_ID,
  OUTPUT_PERCENTAGE_COLUMN_ID,
  SEED_AMOUNT_COLUMN_ID,
  TOTAL_GRADED_BAGS_COLUMN_ID,
  TOTAL_GRADED_NET_WEIGHT_COLUMN_ID,
  VARIETY_LEVEL_COLUMN_PREFIX,
  VARIETY_LEVEL_NET_WEIGHT_COLUMN_PREFIX,
  VARIETY_LEVEL_PERCENT_COLUMN_PREFIX,
  WASTAGE_KG_COLUMN_ID,
} from '@/components/analytics/contract-farming/report/columns';
import {
  buildGradeHeaders,
  flattenRows,
  getAverageQuintalPerAcre,
  getBuyBackAmountFromGradeData,
  getGradeBagCount,
  getGradeNetWeightKg,
  getGradeWeightPercent,
  getNetAmountPerAcreRupee,
  getNetAmountRupee,
  getOutputPercentage,
  getTotalGradeBags,
  getTotalGradeNetWeightKg,
  getWastageKg,
  normalizeReportData,
  orderContractFarmingGradeHeaders,
} from '@/components/analytics/contract-farming/report/contract-farming-report-calculations';
import type { FlattenedRow } from '@/components/analytics/contract-farming/report/types';
import ContractFarmingAnalytics from './analytics/index';
import { Button } from '@/components/ui/button';
import type { PreferencesData } from '@/services/store-admin/preferences/useGetPreferences';
import {
  type ContractFarmingReportFarmer,
  useGetContractFarmingReport,
} from '@/services/store-admin/general/useGetContractFarmingReport';
import { usePreferencesStore } from '@/stores/store';

const EMPTY_FARMERS: ContractFarmingReportFarmer[] = [];

function collectGradesFromFarmers(
  farmers: ContractFarmingReportFarmer[]
): string[] {
  const gradeSet = new Set<string>();
  farmers.forEach((farmer) => {
    farmer.varieties.forEach((variety) => {
      Object.keys(variety.grading ?? {}).forEach((grade) =>
        gradeSet.add(grade)
      );
    });
  });
  return Array.from(gradeSet).sort((a, b) =>
    a.localeCompare(b, undefined, { numeric: true })
  );
}

function normalizePreferenceBagSize(value: string): string {
  return value
    .replace(/\bmm\b/gi, '')
    .replace(/[()]/g, ' ')
    .replace(/[–—−-]/g, '-')
    .replace(/\s*-\s*/g, '-')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

function orderGradeHeadersByPreferences(
  allGradeHeaders: string[],
  preferenceBagSizes: string[] | undefined
): string[] {
  if (allGradeHeaders.length === 0) return [];
  const gradeByNormalized = new Map(
    allGradeHeaders.map((grade) => [normalizePreferenceBagSize(grade), grade])
  );
  const preferred = (preferenceBagSizes ?? [])
    .map((size) => gradeByNormalized.get(normalizePreferenceBagSize(size)))
    .filter((value): value is string => Boolean(value));

  const dedupedPreferred = Array.from(new Set(preferred));
  if (dedupedPreferred.length === 0) return allGradeHeaders;

  const preferredSet = new Set(dedupedPreferred);
  const remaining = allGradeHeaders.filter((grade) => !preferredSet.has(grade));
  return [...dedupedPreferred, ...remaining];
}

function buildFamilyKeyByAccountBase(
  farmers: ContractFarmingReportFarmer[]
): Map<number, number> {
  const uniqueAccountNumbers = Array.from(
    new Set(farmers.map((farmer) => Number(farmer.accountNumber)))
  );
  const familiesByBase = new Map<
    number,
    { hasWhole: boolean; hasDecimal: boolean }
  >();

  uniqueAccountNumbers.forEach((accountNumber) => {
    const base = Math.trunc(accountNumber);
    const current = familiesByBase.get(base) ?? {
      hasWhole: false,
      hasDecimal: false,
    };
    const isWhole = Number.isInteger(accountNumber);
    familiesByBase.set(base, {
      hasWhole: current.hasWhole || isWhole,
      hasDecimal: current.hasDecimal || !isWhole,
    });
  });

  const groupedBases = Array.from(familiesByBase.entries())
    .filter(([, stats]) => stats.hasWhole && stats.hasDecimal)
    .map(([base]) => base)
    .sort((a, b) => a - b);

  const familyKeyByBase = new Map<number, number>();
  groupedBases.forEach((base, index) => {
    familyKeyByBase.set(base, index + 1);
  });
  return familyKeyByBase;
}

function withFamilyKeys(
  rows: FlattenedRow[],
  farmers: ContractFarmingReportFarmer[]
): FlattenedRow[] {
  const familyKeyByBase = buildFamilyKeyByAccountBase(farmers);
  return rows.map((row) => ({
    ...row,
    familyKey: familyKeyByBase.get(Math.trunc(Number(row.accountNumber))) ?? 0,
  }));
}

/**
 * Raw accessor values keyed by TanStack column id — matches
 * {@link buildColumns} / default report table column order.
 */
function buildContractFarmingRowColumnFields(
  row: FlattenedRow,
  gradeHeaders: readonly string[],
  preferences: PreferencesData | null | undefined
): Record<string, string | number | null> {
  const columns: Record<string, string | number | null> = {
    familyKey: row.familyKey ?? 0,
    farmer: row.farmerName,
    farmerMobile: row.mobileNumber,
    address: row.address,
    variety: row.varietyName,
    generation: row.generation,
    size: row.sizeName,
    qty: row.sizeQuantity,
    acres: row.sizeAcres,
    bbBags: row.buyBackBags,
    bbNetWeight: row.buyBackNetWeightKg,
  };

  for (const grade of gradeHeaders) {
    columns[`${VARIETY_LEVEL_COLUMN_PREFIX}${grade}`] = getGradeBagCount(
      row,
      grade
    );
    columns[`${VARIETY_LEVEL_NET_WEIGHT_COLUMN_PREFIX}${grade}`] =
      getGradeNetWeightKg(row, grade);
    columns[`${VARIETY_LEVEL_PERCENT_COLUMN_PREFIX}${grade}`] =
      getGradeWeightPercent(row, grade);
  }
  columns[TOTAL_GRADED_BAGS_COLUMN_ID] = getTotalGradeBags(row);
  columns[TOTAL_GRADED_NET_WEIGHT_COLUMN_ID] = getTotalGradeNetWeightKg(row);
  columns[AVG_QUINTAL_PER_ACRE_COLUMN_ID] = getAverageQuintalPerAcre(row);
  columns[WASTAGE_KG_COLUMN_ID] = getWastageKg(row);
  columns[OUTPUT_PERCENTAGE_COLUMN_ID] = getOutputPercentage(row);
  columns[BUY_BACK_AMOUNT_COLUMN_ID] = getBuyBackAmountFromGradeData(
    row,
    preferences
  );

  columns[SEED_AMOUNT_COLUMN_ID] = row.sizeAmountPayable;
  columns[NET_AMOUNT_COLUMN_ID] = getNetAmountRupee(row, preferences);
  columns[NET_AMOUNT_PER_ACRE_COLUMN_ID] = getNetAmountPerAcreRupee(
    row,
    preferences
  );

  return columns;
}

const ContractFarmingAnalyticsPage = () => {
  const preferences = usePreferencesStore((s) => s.preferences);
  const preferenceBagSizes = usePreferencesStore(
    (s) => s.preferences?.bagSizes
  );

  const { data, isFetching, refetch } = useGetContractFarmingReport();

  const report = React.useMemo(() => normalizeReportData(data), [data]);
  const farmers = React.useMemo(
    () => report.farmers ?? EMPTY_FARMERS,
    [report.farmers]
  );

  const gradeHeaders = React.useMemo(() => {
    const fromApi = data?.meta?.allGrades ?? [];
    const fromRows = collectGradesFromFarmers(farmers);
    const all = new Set<string>([...fromApi, ...fromRows]);
    const grouped = buildGradeHeaders(Array.from(all));
    const preferenceOrdered = orderGradeHeadersByPreferences(
      grouped,
      preferenceBagSizes
    );
    return orderContractFarmingGradeHeaders(preferenceOrdered);
  }, [data?.meta?.allGrades, farmers, preferenceBagSizes]);

  const flattenedRows = React.useMemo(() => {
    const base = flattenRows(farmers, gradeHeaders);
    return withFamilyKeys(base, farmers);
  }, [farmers, gradeHeaders]);

  const rowsWithColumnFields = React.useMemo(
    () =>
      flattenedRows.map((row) => ({
        row,
        columns: buildContractFarmingRowColumnFields(
          row,
          gradeHeaders,
          preferences
        ),
      })),
    [flattenedRows, gradeHeaders, preferences]
  );

  const nullNetAmountRatio = React.useMemo(() => {
    const total = rowsWithColumnFields.length;
    if (total === 0) return 0;
    const nulls = rowsWithColumnFields.filter(
      ({ columns }) => columns.netAmount === null
    ).length;
    return nulls / total;
  }, [rowsWithColumnFields]);

  return (
    <section className="font-custom px-4 py-6 sm:px-8">
      <div className="mx-auto max-w-[75rem] space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-xl font-bold tracking-tight text-[#333] sm:text-2xl">
            Contract farming analytics
          </h1>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="font-custom transition-colors duration-200"
            disabled={isFetching}
            onClick={() => void refetch()}
          >
            {isFetching ? 'Refreshing…' : 'Refresh'}
          </Button>
        </div>
        <ContractFarmingAnalytics
          rows={rowsWithColumnFields.map(({ columns }) => columns)}
          nullNetAmountRatio={nullNetAmountRatio}
        />
      </div>
    </section>
  );
};

export default React.memo(ContractFarmingAnalyticsPage);
