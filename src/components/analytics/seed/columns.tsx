/* eslint-disable react-refresh/only-export-components */
import type { ColumnDef } from '@tanstack/react-table';
import type { ContractFarmingColumnVisibility } from './contractFarmingColumns';

export type ContractFarmingTableRow = {
  id: string;
  sNo: number;
  variety: string;
  name: string;
  accountNumber: string;
  address: string;
  acresPlanted: number;
  generation: string;
  sizeName: string;
  seedBags: number;
  buyBackBags: number;
  wtWithoutBardana: number;
  totalGradingBags: number;
  below40Percent: number;
  range40To50Percent: number;
  above50Percent: number;
  cutPercent: number;
  netWeightAfterGrading: number;
  buyBackAmount: number;
  totalSeedAmount: number;
  netAmountPayable: number;
  netAmountPerAcre: number;
  yieldPerAcreQuintals: number;
  gradingByHeader: Record<string, number>;
};

function formatNumber(value: unknown, digits = 2): string {
  const numericValue =
    typeof value === 'number'
      ? value
      : typeof value === 'string'
        ? Number(value)
        : NaN;
  const safeValue = Number.isFinite(numericValue) ? numericValue : 0;
  return safeValue.toLocaleString('en-IN', {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
}

function formatPercent(value: unknown): string {
  return `${formatNumber(value, 2)}%`;
}

export const RIGHT_ALIGNED_COLUMN_IDS = new Set<string>([
  'sNo',
  'acresPlanted',
  'seedBags',
  'buyBackBags',
  'wtWithoutBardana',
  'totalGradingBags',
  'below40Percent',
  'range40To50Percent',
  'above50Percent',
  'cutPercent',
  'netWeightAfterGrading',
  'buyBackAmount',
  'totalSeedAmount',
  'netAmountPayable',
  'netAmountPerAcre',
  'yieldPerAcreQuintals',
]);

export const TOTAL_COLUMN_IDS: readonly string[] = [
  'acresPlanted',
  'seedBags',
  'buyBackBags',
  'wtWithoutBardana',
  'totalGradingBags',
  'netWeightAfterGrading',
  'buyBackAmount',
  'totalSeedAmount',
  'netAmountPayable',
];

export const TWO_DECIMAL_TOTAL_COLUMN_IDS = new Set<string>([
  'acresPlanted',
  'wtWithoutBardana',
  'netWeightAfterGrading',
  'buyBackAmount',
  'totalSeedAmount',
  'netAmountPayable',
]);

const numericCell =
  (key: keyof ContractFarmingTableRow, digits = 2) =>
  ({ row }: { row: { original: ContractFarmingTableRow } }) => (
    <div className="text-right font-medium">
      {formatNumber(row.original[key] as number, digits)}
    </div>
  );

const percentCell =
  (key: keyof ContractFarmingTableRow) =>
  ({ row }: { row: { original: ContractFarmingTableRow } }) => (
    <div className="text-right font-medium">
      {formatPercent(row.original[key] as number)}
    </div>
  );

export function createContractFarmingColumns(
  gradingHeaders: string[]
): ColumnDef<ContractFarmingTableRow>[] {
  return [
    {
      accessorKey: 'sNo',
      header: () => <div className="text-right">S. No.</div>,
      cell: numericCell('sNo', 0),
      size: 90,
      minSize: 70,
      maxSize: 120,
    },
    {
      accessorKey: 'variety',
      header: 'Variety',
      size: 160,
      minSize: 120,
      maxSize: 240,
    },
    {
      accessorKey: 'name',
      header: 'Name',
      cell: ({ row }) => (
        <span>
          {row.original.name}
          {row.original.accountNumber && row.original.accountNumber !== '—' ? (
            <span className="text-muted-foreground font-normal">
              {` #${row.original.accountNumber}`}
            </span>
          ) : null}
        </span>
      ),
      size: 260,
      minSize: 180,
      maxSize: 400,
    },
    {
      accessorKey: 'address',
      header: 'Address',
      size: 220,
      minSize: 140,
      maxSize: 360,
    },
    { accessorKey: 'generation', header: 'Generation' },
    { accessorKey: 'sizeName', header: 'Size name' },
    {
      accessorKey: 'acresPlanted',
      header: () => <div className="text-right">Acres planted</div>,
      cell: numericCell('acresPlanted', 2),
    },
    {
      accessorKey: 'seedBags',
      header: () => <div className="text-right">Seed bags</div>,
      cell: numericCell('seedBags', 2),
    },
    {
      accessorKey: 'buyBackBags',
      header: () => <div className="text-right">Buy back bags</div>,
      cell: numericCell('buyBackBags', 2),
    },
    {
      accessorKey: 'wtWithoutBardana',
      header: () => <div className="text-right">Wt. without bardana</div>,
      cell: numericCell('wtWithoutBardana', 2),
    },
    ...gradingHeaders.map<ColumnDef<ContractFarmingTableRow>>((header) => ({
      id: `grading:${header}`,
      header: () => <div className="text-right">{header}</div>,
      accessorFn: (row) => row.gradingByHeader[header] ?? 0,
      cell: ({ row }) => (
        <div className="text-right font-medium">
          {formatNumber(row.original.gradingByHeader[header] ?? 0)}
        </div>
      ),
    })),
    {
      accessorKey: 'totalGradingBags',
      header: () => <div className="text-right">Total grading bags</div>,
      cell: numericCell('totalGradingBags', 2),
    },
    {
      accessorKey: 'below40Percent',
      header: () => <div className="text-right">Below 40 %</div>,
      cell: percentCell('below40Percent'),
    },
    {
      accessorKey: 'range40To50Percent',
      header: () => <div className="text-right">40-50 %</div>,
      cell: percentCell('range40To50Percent'),
    },
    {
      accessorKey: 'above50Percent',
      header: () => <div className="text-right">Above 50 %</div>,
      cell: percentCell('above50Percent'),
    },
    {
      accessorKey: 'cutPercent',
      header: () => <div className="text-right">Cut %</div>,
      cell: percentCell('cutPercent'),
    },
    {
      accessorKey: 'netWeightAfterGrading',
      header: () => <div className="text-right">Net wt after grading (kg)</div>,
      cell: numericCell('netWeightAfterGrading', 2),
    },
    {
      accessorKey: 'buyBackAmount',
      header: () => <div className="text-right">Buy back amount</div>,
      cell: numericCell('buyBackAmount', 2),
    },
    {
      accessorKey: 'totalSeedAmount',
      header: () => <div className="text-right">Total seed amount</div>,
      cell: numericCell('totalSeedAmount', 2),
    },
    {
      accessorKey: 'netAmountPayable',
      header: () => <div className="text-right">Net amount payable</div>,
      cell: numericCell('netAmountPayable', 2),
    },
    {
      accessorKey: 'netAmountPerAcre',
      header: () => <div className="text-right">Net amount / acre</div>,
      cell: numericCell('netAmountPerAcre', 2),
    },
    {
      accessorKey: 'yieldPerAcreQuintals',
      header: () => <div className="text-right">Yield/acre (qtl)</div>,
      cell: numericCell('yieldPerAcreQuintals', 2),
    },
  ];
}

export function toColumnVisibilityState(
  visibility: ContractFarmingColumnVisibility
): Record<string, boolean> {
  return { ...visibility, accountNumber: false };
}
