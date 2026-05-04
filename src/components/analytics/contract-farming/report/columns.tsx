/* eslint-disable react-refresh/only-export-components -- column defs, IDs, and helpers colocated for the report table */
import type { ColumnDef } from '@tanstack/react-table';
import { createColumnHelper } from '@tanstack/react-table';

import {
  aggregateAvgQuintalPerAcre,
  aggregateNetAmountPerAcre,
  formatNumber,
  getAverageQuintalPerAcre,
  getBuyBackAmountFromGradeData,
  getGradeBagCount,
  getGradeWeightPercent,
  getNetAmountPerAcreRupee,
  getNetAmountRupee,
  getOutputPercentage,
  getTotalGradeBags,
  getTotalGradeNetWeightKg,
  getWastageKg,
  sumVarietyMetrics,
} from './contract-farming-report-calculations';
import type { FlattenedRow } from './types';
import {
  FILTER_VARIETY_LEVEL_PREFIX,
  formatContractFarmingGradeColumnLabel,
} from './view-filters-sheet/constants';

/** Column filter — multi-select or substring match against stringified cell values. */
const multiValueFilterFn = (
  row: { getValue: (columnId: string) => unknown },
  columnId: string,
  filterValue: string[] | string
) => {
  const raw = row.getValue(columnId);
  const cellValue = raw === null || raw === undefined ? '' : String(raw);
  if (typeof filterValue === 'string') {
    const normalized = filterValue.trim().toLowerCase();
    if (!normalized) return true;
    return cellValue.toLowerCase().includes(normalized);
  }
  if (!Array.isArray(filterValue)) return true;
  if (filterValue.length === 0) return true;
  return filterValue.includes(cellValue);
};

const columnHelper = createColumnHelper<FlattenedRow>();

export const VARIETY_LEVEL_COLUMN_PREFIX = FILTER_VARIETY_LEVEL_PREFIX;
export const VARIETY_LEVEL_PERCENT_COLUMN_PREFIX = 'grade_weight_pct_';
export const TOTAL_GRADED_BAGS_COLUMN_ID = `${VARIETY_LEVEL_COLUMN_PREFIX}__totalAfterGrading`;
export const TOTAL_GRADED_NET_WEIGHT_COLUMN_ID = `${VARIETY_LEVEL_COLUMN_PREFIX}__netWeightAfterGrading`;
export const AVG_QUINTAL_PER_ACRE_COLUMN_ID = `${VARIETY_LEVEL_COLUMN_PREFIX}__avgQuintalPerAcre`;
export const WASTAGE_KG_COLUMN_ID = `${VARIETY_LEVEL_COLUMN_PREFIX}__wastageKg`;
export const OUTPUT_PERCENTAGE_COLUMN_ID = `${VARIETY_LEVEL_COLUMN_PREFIX}__outputPercentage`;
export const BUY_BACK_AMOUNT_COLUMN_ID = `${VARIETY_LEVEL_COLUMN_PREFIX}__buyBackAmount`;

/** Seed amount column (`sizeAmountPayable`), rendered after grading / buy-back amount in column order */
export const SEED_AMOUNT_COLUMN_ID = 'amount';

/** ₹ net after seed: Buy Back Amount − total seed amt for farmer × variety (variety rowspan). */
export const NET_AMOUNT_COLUMN_ID = 'netAmount';

/** ₹ net divided by variety total acres (variety rowspan). */
export const NET_AMOUNT_PER_ACRE_COLUMN_ID = 'netAmountPerAcre';

/** Headers with `rowSpan={2}` after the Grading group (preserve table column order here). */
export const TRAILING_TWO_ROW_HEADER_COLUMN_IDS = [
  SEED_AMOUNT_COLUMN_ID,
  NET_AMOUNT_COLUMN_ID,
  NET_AMOUNT_PER_ACRE_COLUMN_ID,
] as const;

export const TRAILING_TWO_ROW_HEADER_ID_SET = new Set<string>(
  TRAILING_TWO_ROW_HEADER_COLUMN_IDS
);

/** Bump when grading leaf column semantics/order change — busts defaultColumnOrder memo on same gradeHeaders. */
export const CONTRACT_FARMING_GRADING_COLUMN_LAYOUT_VERSION = 10;

/**
 * Default leaf order inside the grading section (after buy-back bags / net weight):
 * all bag quantities by grade → all weight‑% by grade → totals and metrics → grading buy‑back ₹.
 */
export function buildContractFarmingGradingLeafColumnIds(
  gradeHeaders: readonly string[]
): string[] {
  return [
    ...gradeHeaders.map((grade) => `${VARIETY_LEVEL_COLUMN_PREFIX}${grade}`),
    ...gradeHeaders.map(
      (grade) => `${VARIETY_LEVEL_PERCENT_COLUMN_PREFIX}${grade}`
    ),
    TOTAL_GRADED_BAGS_COLUMN_ID,
    TOTAL_GRADED_NET_WEIGHT_COLUMN_ID,
    AVG_QUINTAL_PER_ACRE_COLUMN_ID,
    WASTAGE_KG_COLUMN_ID,
    OUTPUT_PERCENTAGE_COLUMN_ID,
    BUY_BACK_AMOUNT_COLUMN_ID,
  ];
}

export const VARIETY_LEVEL_COLUMN_IDS = new Set([
  'variety',
  'bbBags',
  'bbNetWeight',
]);
export const BUY_BACK_COLUMN_IDS = new Set(['bbBags', 'bbNetWeight']);

function StrongNum({
  value,
  decimals,
}: {
  value: number | null | undefined;
  decimals: number;
}) {
  return (
    <strong className="font-custom font-semibold tabular-nums">
      {formatNumber(value ?? null, decimals)}
    </strong>
  );
}

function StrongPct({ value }: { value: number | null | undefined }) {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return (
      <strong className="font-custom font-semibold tabular-nums">-</strong>
    );
  }
  return (
    <strong className="font-custom font-semibold tabular-nums">
      {formatNumber(value, 2)}%
    </strong>
  );
}

function StrongRupee({ value }: { value: number | null | undefined }) {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return (
      <strong className="font-custom font-semibold tabular-nums">-</strong>
    );
  }
  return (
    <strong className="font-custom font-semibold tabular-nums">
      ₹{formatNumber(value)}
    </strong>
  );
}

export function isNumericSortColumnId(columnId: string) {
  return (
    columnId === 'qty' ||
    columnId === 'acres' ||
    columnId === SEED_AMOUNT_COLUMN_ID ||
    columnId === NET_AMOUNT_COLUMN_ID ||
    columnId === NET_AMOUNT_PER_ACRE_COLUMN_ID ||
    BUY_BACK_COLUMN_IDS.has(columnId) ||
    columnId.startsWith(VARIETY_LEVEL_COLUMN_PREFIX) ||
    columnId.startsWith(VARIETY_LEVEL_PERCENT_COLUMN_PREFIX)
  );
}

export function buildColumns(
  gradeHeaders: string[]
): ColumnDef<FlattenedRow, unknown>[] {
  const baseColumns = [
    columnHelper.accessor('farmerName', {
      id: 'farmer',
      header: 'Farmer',
      sortingFn: 'text',
      size: 240,
      minSize: 180,
      maxSize: 550,
      enableGrouping: true,
      filterFn: multiValueFilterFn,
      aggregationFn: 'count',
      aggregatedCell: () => null,
      cell: ({ row }) => {
        const groupedNames = row.original.clubbedFarmerNames ?? [];
        const hasGroupedNames = groupedNames.length > 0;
        return (
          <div className="font-custom font-medium">
            {row.original.farmerName}
            <span className="text-muted-foreground ml-1 text-sm font-normal">
              (#{row.original.accountNumber})
            </span>
            {hasGroupedNames ? (
              <p className="text-muted-foreground mt-0.5 text-xs font-normal">
                {groupedNames.join(', ')}
              </p>
            ) : null}
          </div>
        );
      },
    }),
    columnHelper.accessor('mobileNumber', {
      id: 'farmerMobile',
      header: 'Mobile',
      sortingFn: 'text',
      size: 150,
      minSize: 120,
      maxSize: 320,
      enableGrouping: false,
      filterFn: multiValueFilterFn,
      aggregationFn: 'count',
      aggregatedCell: () => (
        <span className="text-muted-foreground/50 font-custom text-sm">-</span>
      ),
    }),
    columnHelper.accessor('address', {
      id: 'address',
      header: 'Address',
      sortingFn: 'text',
      size: 230,
      minSize: 160,
      maxSize: 550,
      enableGrouping: true,
      filterFn: multiValueFilterFn,
      aggregationFn: 'count',
      aggregatedCell: () => (
        <span className="text-muted-foreground/50 font-custom text-sm">-</span>
      ),
    }),
    columnHelper.accessor('varietyName', {
      id: 'variety',
      header: 'Variety',
      sortingFn: 'text',
      size: 150,
      minSize: 120,
      maxSize: 260,
      enableGrouping: true,
      filterFn: multiValueFilterFn,
      aggregationFn: 'count',
      aggregatedCell: () => null,
      cell: ({ row }) => (
        <span className="font-custom inline-block rounded-full bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700">
          {row.original.varietyName}
        </span>
      ),
    }),
    columnHelper.accessor('generation', {
      id: 'generation',
      header: 'Stage',
      sortingFn: 'text',
      size: 110,
      minSize: 90,
      maxSize: 180,
      enableGrouping: true,
      filterFn: multiValueFilterFn,
      aggregationFn: 'count',
      aggregatedCell: () => (
        <span className="text-muted-foreground/50 font-custom text-sm">-</span>
      ),
      cell: ({ row }) => (
        <span className="font-custom inline-block rounded-full bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700">
          {row.original.generation}
        </span>
      ),
    }),
    columnHelper.accessor('sizeName', {
      id: 'size',
      header: 'Size',
      sortingFn: 'text',
      size: 120,
      minSize: 90,
      maxSize: 220,
      enableGrouping: false,
      filterFn: multiValueFilterFn,
      aggregationFn: 'count',
      aggregatedCell: () => (
        <span className="text-muted-foreground/50 font-custom text-sm">-</span>
      ),
    }),
    columnHelper.accessor('sizeQuantity', {
      id: 'qty',
      header: 'Qty (bags)',
      sortingFn: 'basic',
      size: 120,
      minSize: 100,
      maxSize: 220,
      enableGrouping: false,
      filterFn: multiValueFilterFn,
      aggregationFn: 'sum',
      aggregatedCell: ({ getValue }) => (
        <StrongNum decimals={0} value={getValue() as number | null} />
      ),
      cell: ({ getValue }) => (
        <span className="font-custom text-right tabular-nums">
          {formatNumber(getValue() as number, 0)}
        </span>
      ),
    }),
    columnHelper.accessor('sizeAcres', {
      id: 'acres',
      header: 'Acres',
      sortingFn: 'basic',
      size: 120,
      minSize: 100,
      maxSize: 220,
      enableGrouping: false,
      filterFn: multiValueFilterFn,
      aggregationFn: 'sum',
      aggregatedCell: ({ getValue }) => (
        <StrongNum decimals={2} value={getValue() as number | null} />
      ),
      cell: ({ getValue }) => (
        <span className="font-custom text-right tabular-nums">
          {formatNumber(getValue() as number)}
        </span>
      ),
    }),
    columnHelper.group({
      id: 'buyBackGroup',
      header: 'Buy back',
      columns: [
        columnHelper.accessor('buyBackBags', {
          id: 'bbBags',
          header: 'Bags',
          sortingFn: 'basic',
          size: 120,
          minSize: 100,
          maxSize: 220,
          enableGrouping: false,
          filterFn: multiValueFilterFn,
          aggregationFn: sumVarietyMetrics,
          aggregatedCell: ({ getValue }) => (
            <StrongNum decimals={0} value={getValue() as number | null} />
          ),
          cell: ({ getValue }) => (
            <span className="font-custom text-right tabular-nums">
              {formatNumber(getValue() as number | null, 0)}
            </span>
          ),
        }),
        columnHelper.accessor('buyBackNetWeightKg', {
          id: 'bbNetWeight',
          header: 'Net wt (kg)',
          sortingFn: 'basic',
          size: 140,
          minSize: 120,
          maxSize: 260,
          enableGrouping: false,
          filterFn: multiValueFilterFn,
          aggregationFn: sumVarietyMetrics,
          aggregatedCell: ({ getValue }) => (
            <StrongNum decimals={2} value={getValue() as number | null} />
          ),
          cell: ({ getValue }) => (
            <span className="font-custom text-right tabular-nums">
              {formatNumber(getValue() as number | null)}
            </span>
          ),
        }),
      ],
    }),
  ];

  const seedAmountColumn = columnHelper.accessor('sizeAmountPayable', {
    id: SEED_AMOUNT_COLUMN_ID,
    header: 'Seed amt (₹)',
    sortingFn: 'basic',
    size: 145,
    minSize: 120,
    maxSize: 260,
    enableGrouping: false,
    filterFn: multiValueFilterFn,
    aggregationFn: 'sum',
    aggregatedCell: ({ getValue }) => {
      const v = getValue() as number;
      if (!v || v <= 0) {
        return (
          <strong className="font-custom font-semibold tabular-nums">-</strong>
        );
      }
      return (
        <strong className="font-custom font-semibold tabular-nums">
          ₹{formatNumber(v)}
        </strong>
      );
    },
    cell: ({ getValue }) => {
      const v = getValue() as number;
      return (
        <span className="font-custom text-right tabular-nums">
          {v > 0 ? `₹${formatNumber(v)}` : '-'}
        </span>
      );
    },
  });

  const netAmountColumn = columnHelper.accessor(
    (row) => getNetAmountRupee(row),
    {
      id: NET_AMOUNT_COLUMN_ID,
      header: 'Net Amount',
      sortingFn: 'basic',
      size: 150,
      minSize: 120,
      maxSize: 280,
      enableGrouping: false,
      filterFn: multiValueFilterFn,
      aggregationFn: sumVarietyMetrics,
      aggregatedCell: ({ getValue }) => (
        <StrongRupee value={getValue() as number | null} />
      ),
      cell: ({ getValue }) => {
        const v = getValue() as number | null;
        return (
          <span className="font-custom text-right tabular-nums">
            {v !== null ? `₹${formatNumber(v)}` : '-'}
          </span>
        );
      },
    }
  );

  const netAmountPerAcreColumn = columnHelper.accessor(
    (row) => getNetAmountPerAcreRupee(row),
    {
      id: NET_AMOUNT_PER_ACRE_COLUMN_ID,
      header: 'Net Amount Per Acre',
      sortingFn: 'basic',
      size: 165,
      minSize: 120,
      maxSize: 300,
      enableGrouping: false,
      filterFn: multiValueFilterFn,
      aggregationFn: aggregateNetAmountPerAcre,
      aggregatedCell: ({ getValue }) => (
        <StrongRupee value={getValue() as number | null} />
      ),
      cell: ({ getValue }) => {
        const v = getValue() as number | null;
        return (
          <span className="font-custom text-right tabular-nums">
            {v !== null ? `₹${formatNumber(v)}` : '-'}
          </span>
        );
      },
    }
  );

  const gradingColumns = gradeHeaders.length
    ? [
        ...gradeHeaders.map((grade) =>
          columnHelper.accessor((row) => getGradeBagCount(row, grade), {
            id: `${VARIETY_LEVEL_COLUMN_PREFIX}${grade}`,
            header: formatContractFarmingGradeColumnLabel(grade),
            sortingFn: 'basic',
            size: 130,
            minSize: 110,
            maxSize: 260,
            enableGrouping: false,
            filterFn: multiValueFilterFn,
            aggregationFn: sumVarietyMetrics,
            aggregatedCell: ({ getValue }) => {
              const v = getValue() as number | null;
              return (
                <strong className="font-custom font-semibold tabular-nums">
                  {v !== null ? formatNumber(v, 0) : '-'}
                </strong>
              );
            },
            cell: ({ getValue }) => {
              const v = getValue() as number | null;
              return (
                <span className="font-custom text-right tabular-nums">
                  {v !== null ? formatNumber(v, 0) : '-'}
                </span>
              );
            },
          })
        ),
        ...gradeHeaders.map((grade) =>
          columnHelper.accessor((row) => getGradeWeightPercent(row, grade), {
            id: `${VARIETY_LEVEL_PERCENT_COLUMN_PREFIX}${grade}`,
            header: `${formatContractFarmingGradeColumnLabel(grade)} %`,
            sortingFn: 'basic',
            size: 130,
            minSize: 110,
            maxSize: 260,
            enableGrouping: false,
            filterFn: multiValueFilterFn,
            aggregationFn: sumVarietyMetrics,
            aggregatedCell: ({ getValue }) => (
              <StrongPct value={getValue() as number | null} />
            ),
            cell: ({ getValue }) => {
              const v = getValue() as number | null;
              return (
                <span className="font-custom text-right tabular-nums">
                  {v !== null ? `${formatNumber(v, 2)}%` : '-'}
                </span>
              );
            },
          })
        ),
        columnHelper.accessor((row) => getTotalGradeBags(row), {
          id: TOTAL_GRADED_BAGS_COLUMN_ID,
          header: 'Total Bags After Grading',
          sortingFn: 'basic',
          size: 170,
          minSize: 130,
          maxSize: 280,
          enableGrouping: false,
          filterFn: multiValueFilterFn,
          aggregationFn: sumVarietyMetrics,
          aggregatedCell: ({ getValue }) => {
            const v = getValue() as number | null;
            return (
              <strong className="font-custom font-semibold tabular-nums">
                {v !== null ? formatNumber(v, 0) : '-'}
              </strong>
            );
          },
          cell: ({ getValue }) => {
            const v = getValue() as number | null;
            return (
              <span className="font-custom text-right tabular-nums">
                {v !== null ? formatNumber(v, 0) : '-'}
              </span>
            );
          },
        }),
        columnHelper.accessor((row) => getTotalGradeNetWeightKg(row), {
          id: TOTAL_GRADED_NET_WEIGHT_COLUMN_ID,
          header: 'Net Weight After Grading',
          sortingFn: 'basic',
          size: 170,
          minSize: 130,
          maxSize: 280,
          enableGrouping: false,
          filterFn: multiValueFilterFn,
          aggregationFn: sumVarietyMetrics,
          aggregatedCell: ({ getValue }) => (
            <StrongNum decimals={2} value={getValue() as number | null} />
          ),
          cell: ({ getValue }) => {
            const v = getValue() as number | null;
            return (
              <span className="font-custom text-right tabular-nums">
                {v !== null ? formatNumber(v) : '-'}
              </span>
            );
          },
        }),
        columnHelper.accessor((row) => getAverageQuintalPerAcre(row), {
          id: AVG_QUINTAL_PER_ACRE_COLUMN_ID,
          header: 'Average Quintal Per Acre',
          sortingFn: 'basic',
          size: 175,
          minSize: 130,
          maxSize: 280,
          enableGrouping: false,
          filterFn: multiValueFilterFn,
          aggregationFn: aggregateAvgQuintalPerAcre,
          aggregatedCell: ({ getValue }) => (
            <StrongNum decimals={2} value={getValue() as number | null} />
          ),
          cell: ({ getValue }) => {
            const v = getValue() as number | null;
            return (
              <span className="font-custom text-right tabular-nums">
                {v !== null ? formatNumber(v) : '-'}
              </span>
            );
          },
        }),
        columnHelper.accessor((row) => getWastageKg(row), {
          id: WASTAGE_KG_COLUMN_ID,
          header: 'Wastage (kg)',
          sortingFn: 'basic',
          size: 150,
          minSize: 120,
          maxSize: 260,
          enableGrouping: false,
          filterFn: multiValueFilterFn,
          aggregationFn: sumVarietyMetrics,
          aggregatedCell: ({ getValue }) => (
            <StrongNum decimals={2} value={getValue() as number | null} />
          ),
          cell: ({ getValue }) => {
            const v = getValue() as number | null;
            return (
              <span className="font-custom text-right tabular-nums">
                {v !== null ? formatNumber(v) : '-'}
              </span>
            );
          },
        }),
        columnHelper.accessor((row) => getOutputPercentage(row), {
          id: OUTPUT_PERCENTAGE_COLUMN_ID,
          header: 'Output Percentage',
          sortingFn: 'basic',
          size: 155,
          minSize: 120,
          maxSize: 260,
          enableGrouping: false,
          filterFn: multiValueFilterFn,
          aggregationFn: sumVarietyMetrics,
          aggregatedCell: ({ getValue }) => (
            <StrongPct value={getValue() as number | null} />
          ),
          cell: ({ getValue }) => {
            const v = getValue() as number | null;
            return (
              <span className="font-custom text-right tabular-nums">
                {v !== null ? `${formatNumber(v, 2)}%` : '-'}
              </span>
            );
          },
        }),
        columnHelper.accessor((row) => getBuyBackAmountFromGradeData(row), {
          id: BUY_BACK_AMOUNT_COLUMN_ID,
          header: 'Buy Back Amount',
          sortingFn: 'basic',
          size: 160,
          minSize: 120,
          maxSize: 280,
          enableGrouping: false,
          filterFn: multiValueFilterFn,
          aggregationFn: sumVarietyMetrics,
          aggregatedCell: ({ getValue }) => (
            <StrongRupee value={getValue() as number | null} />
          ),
          cell: ({ getValue }) => {
            const v = getValue() as number | null;
            return (
              <span className="font-custom text-right tabular-nums">
                {v !== null ? `₹${formatNumber(v)}` : '-'}
              </span>
            );
          },
        }),
      ]
    : [
        columnHelper.display({
          id: 'noGrades',
          header: 'No grades',
          enableSorting: false,
          enableGrouping: false,
          size: 130,
          minSize: 110,
          maxSize: 260,
          cell: () => (
            <span className="font-custom text-muted-foreground text-center text-sm">
              -
            </span>
          ),
        }),
      ];

  return [
    ...baseColumns,
    columnHelper.group({
      id: 'gradingGroup',
      header: 'Grading',
      columns: gradingColumns,
    }),
    seedAmountColumn,
    netAmountColumn,
    netAmountPerAcreColumn,
  ] as ColumnDef<FlattenedRow, unknown>[];
}
