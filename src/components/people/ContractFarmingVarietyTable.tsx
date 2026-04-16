import { memo, useMemo } from 'react';
import {
  type ColumnDef,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from '@tanstack/react-table';
import { cn } from '@/lib/utils';
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import type { ContractFarmingFarmerRow } from '@/types/analytics';
import {
  CONTRACT_FARMING_GRADING_COLUMNS,
  CONTRACT_FARMING_IN_LOCALE,
  acresPlantedForSeedLine,
  computeGradingRangePercentages,
  computeVarietyTableTotals,
  computeYieldPerAcreQuintals,
  expandFarmerRowsForSizes,
  findGradingBucket,
  formatBuyBackAmount,
  formatGradingBagsQty,
  formatGradingRangePercentage,
  formatNetAmountPayable,
  formatNetAmountPerAcre,
  formatNetWeightAfterGrading,
  formatTotalGradingBags,
  formatTotalSeedAmount,
  formatYieldPerAcreQuintals,
  generationLabelForSeedLine,
  hasBuyBackBagsEntryForReportVariety,
  mergeGradingSizeMapsForReportVariety,
  aggregateBuyBackBagsForReportVariety,
  accountFamilyBaseKey,
  familyGroupHasDecimalAccountMember,
  formatAccountNumberField,
  formatAccountNumberForDisplay,
  formatVarietyTableTotalsForFooterColumns,
  groupFarmersByAccountFamily,
  resolveAcresForNetPerAcre,
} from '@/utils/contractFarmingReportShared';

const POST_SEED_COLUMN_IDS = new Set<string>([
  'buyBackBags',
  'wtWithoutBardana',
  ...CONTRACT_FARMING_GRADING_COLUMNS.map((col) => `grading:${col.header}`),
  'totalGradingBags',
  'below40Percent',
  'range40To50Percent',
  'above50Percent',
  'netWeightAfterGrading',
  'buyBackAmount',
  'totalSeedAmount',
  'netAmountPayable',
  'netAmountPerAcre',
  'yieldPerAcreQuintals',
]);

interface VarietyRowData {
  id: string;
  serial: string;
  name: string;
  accountNumber: string;
  address: string;
  acresPlanted: string;
  generation: string;
  sizeName: string;
  seedBags: string;
  buyBackBags: string;
  wtWithoutBardana: string;
  gradingByHeader: Record<string, string>;
  totalGradingBags: string;
  below40Percent: string;
  range40To50Percent: string;
  above50Percent: string;
  netWeightAfterGrading: string;
  buyBackAmount: string;
  totalSeedAmount: string;
  netAmountPayable: string;
  netAmountPerAcre: string;
  yieldPerAcreQuintals: string;
  postSeedRowSpan: number;
  showPostSeedCells: boolean;
  rowKind?: 'data' | 'familyTotal';
}

interface ContractFarmingVarietyTableProps {
  variety: string;
  rows: ContractFarmingFarmerRow[];
  columnVisibility: Record<string, boolean>;
}

const ContractFarmingVarietyTable = memo(function ContractFarmingVarietyTable({
  variety,
  rows,
  columnVisibility,
}: ContractFarmingVarietyTableProps) {
  const varietyTotals = useMemo(
    () => computeVarietyTableTotals(rows, variety),
    [rows, variety]
  );

  const data: VarietyRowData[] = useMemo(() => {
    const families = groupFarmersByAccountFamily(rows);
    const out: VarietyRowData[] = [];
    let serialCounter = 0;

    families.forEach((familyFarmers, familyIndex) => {
      const familyExpanded = expandFarmerRowsForSizes(familyFarmers);
      familyExpanded.forEach(({ farmer, size, sizeLineIndex }, idx, arr) => {
        serialCounter += 1;
        const id = `${variety}-${farmer.id}-${size?.name ?? 'no-size'}-${idx}`;
        const span = arr.filter((r) => r.farmer.id === farmer.id).length;
        const rowIndexForFarmer = arr
          .slice(0, idx + 1)
          .filter((r) => r.farmer.id === farmer.id).length;
        const showPostSeedCells = rowIndexForFarmer === 1;

        const buyBack = aggregateBuyBackBagsForReportVariety(farmer, variety);
        const hasBuyBack = hasBuyBackBagsEntryForReportVariety(farmer, variety);
        const gradingBySize = mergeGradingSizeMapsForReportVariety(
          farmer,
          variety
        );
        const gradingPercentages =
          computeGradingRangePercentages(gradingBySize);
        const yieldQuintalsPerAcre = computeYieldPerAcreQuintals(
          gradingBySize,
          resolveAcresForNetPerAcre(farmer)
        );

        const gradingByHeader = CONTRACT_FARMING_GRADING_COLUMNS.reduce<
          Record<string, string>
        >((acc, col) => {
          acc[col.header] = formatGradingBagsQty(
            findGradingBucket(gradingBySize, col.matchKeys)
          );
          return acc;
        }, {});

        out.push({
          id,
          serial: String(serialCounter),
          name: farmer.name,
          accountNumber: formatAccountNumberField(farmer.accountNumber),
          address: farmer.address,
          acresPlanted: acresPlantedForSeedLine(farmer, size).toLocaleString(
            CONTRACT_FARMING_IN_LOCALE,
            { maximumFractionDigits: 2 }
          ),
          generation: generationLabelForSeedLine(farmer, sizeLineIndex),
          sizeName: size?.name ?? '—',
          seedBags:
            size != null
              ? size.quantity.toLocaleString(CONTRACT_FARMING_IN_LOCALE, {
                  maximumFractionDigits: 0,
                })
              : '—',
          buyBackBags: hasBuyBack
            ? buyBack.totalBags.toLocaleString(CONTRACT_FARMING_IN_LOCALE, {
                maximumFractionDigits: 0,
              })
            : '—',
          wtWithoutBardana: hasBuyBack
            ? buyBack.totalNetWeightKg.toLocaleString(
                CONTRACT_FARMING_IN_LOCALE,
                {
                  maximumFractionDigits: 2,
                }
              )
            : '—',
          gradingByHeader,
          totalGradingBags: formatTotalGradingBags(gradingBySize),
          below40Percent: formatGradingRangePercentage(
            gradingPercentages.below40
          ),
          range40To50Percent: formatGradingRangePercentage(
            gradingPercentages.range40To50
          ),
          above50Percent: formatGradingRangePercentage(
            gradingPercentages.above50
          ),
          netWeightAfterGrading: formatNetWeightAfterGrading(gradingBySize),
          buyBackAmount: formatBuyBackAmount(farmer, variety),
          totalSeedAmount: formatTotalSeedAmount(farmer),
          netAmountPayable: formatNetAmountPayable(farmer, variety),
          netAmountPerAcre: formatNetAmountPerAcre(farmer, variety),
          yieldPerAcreQuintals:
            formatYieldPerAcreQuintals(yieldQuintalsPerAcre),
          postSeedRowSpan: span,
          showPostSeedCells,
          rowKind: 'data',
        });
      });

      const baseKey = accountFamilyBaseKey(familyFarmers[0].accountNumber);
      if (
        baseKey !== null &&
        familyGroupHasDecimalAccountMember(familyFarmers)
      ) {
        const familyTotals = computeVarietyTableTotals(familyFarmers, variety);
        const colMap = formatVarietyTableTotalsForFooterColumns(familyTotals, {
          nameLabel: 'Family total',
          accountLabel: formatAccountNumberForDisplay(baseKey),
        });
        const gradingByHeader = CONTRACT_FARMING_GRADING_COLUMNS.reduce<
          Record<string, string>
        >((acc, col) => {
          acc[col.header] = colMap[`grading:${col.header}`] ?? '—';
          return acc;
        }, {});

        out.push({
          id: `family-total-${variety}-${familyIndex}`,
          serial: '',
          name: colMap.name ?? 'Family total',
          accountNumber: colMap.accountNumber ?? '—',
          address: colMap.address ?? '—',
          acresPlanted: colMap.acresPlanted ?? '—',
          generation: colMap.generation ?? '—',
          sizeName: colMap.sizeName ?? '—',
          seedBags: colMap.seedBags ?? '—',
          buyBackBags: colMap.buyBackBags ?? '—',
          wtWithoutBardana: colMap.wtWithoutBardana ?? '—',
          gradingByHeader,
          totalGradingBags: colMap.totalGradingBags ?? '—',
          below40Percent: colMap.below40Percent ?? '—',
          range40To50Percent: colMap.range40To50Percent ?? '—',
          above50Percent: colMap.above50Percent ?? '—',
          netWeightAfterGrading: colMap.netWeightAfterGrading ?? '—',
          buyBackAmount: colMap.buyBackAmount ?? '—',
          totalSeedAmount: colMap.totalSeedAmount ?? '—',
          netAmountPayable: colMap.netAmountPayable ?? '—',
          netAmountPerAcre: colMap.netAmountPerAcre ?? '—',
          yieldPerAcreQuintals: colMap.yieldPerAcreQuintals ?? '—',
          postSeedRowSpan: 1,
          showPostSeedCells: true,
          rowKind: 'familyTotal',
        });
      }
    });

    return out;
  }, [rows, variety]);

  const columns: ColumnDef<VarietyRowData>[] = useMemo(
    () => [
      { id: 'sNo', accessorKey: 'serial', header: 'S. No.' },
      { id: 'name', accessorKey: 'name', header: 'Name' },
      {
        id: 'accountNumber',
        accessorKey: 'accountNumber',
        header: 'Account no.',
      },
      { id: 'address', accessorKey: 'address', header: 'Address' },
      {
        id: 'acresPlanted',
        accessorKey: 'acresPlanted',
        header: 'Acres planted',
      },
      { id: 'generation', accessorKey: 'generation', header: 'Generation' },
      { id: 'sizeName', accessorKey: 'sizeName', header: 'Size name' },
      { id: 'seedBags', accessorKey: 'seedBags', header: 'Seed bags' },
      {
        id: 'buyBackBags',
        accessorKey: 'buyBackBags',
        header: 'Buy back bags',
      },
      {
        id: 'wtWithoutBardana',
        accessorKey: 'wtWithoutBardana',
        header: 'Wt. without bardana',
      },
      ...CONTRACT_FARMING_GRADING_COLUMNS.map<ColumnDef<VarietyRowData>>(
        (col) => ({
          id: `grading:${col.header}`,
          accessorFn: (row) => row.gradingByHeader[col.header] ?? '—',
          header: col.header,
        })
      ),
      {
        id: 'totalGradingBags',
        accessorKey: 'totalGradingBags',
        header: 'Total grading bags',
      },
      {
        id: 'below40Percent',
        accessorKey: 'below40Percent',
        header: 'Below 40 %',
      },
      {
        id: 'range40To50Percent',
        accessorKey: 'range40To50Percent',
        header: '40-50 %',
      },
      {
        id: 'above50Percent',
        accessorKey: 'above50Percent',
        header: 'Above 50 %',
      },
      {
        id: 'netWeightAfterGrading',
        accessorKey: 'netWeightAfterGrading',
        header: 'Net weight after grading (kg)',
      },
      {
        id: 'buyBackAmount',
        accessorKey: 'buyBackAmount',
        header: 'Buy back amount',
      },
      {
        id: 'totalSeedAmount',
        accessorKey: 'totalSeedAmount',
        header: 'Total seed amount',
      },
      {
        id: 'netAmountPayable',
        accessorKey: 'netAmountPayable',
        header: 'Net amount payable',
      },
      {
        id: 'netAmountPerAcre',
        accessorKey: 'netAmountPerAcre',
        header: 'Net amount / acre',
      },
      {
        id: 'yieldPerAcreQuintals',
        accessorKey: 'yieldPerAcreQuintals',
        header: 'Yield per acre (in quintals)',
      },
    ],
    []
  );

  const table = useReactTable({
    data,
    columns,
    state: { columnVisibility },
    getCoreRowModel: getCoreRowModel(),
  });

  const totalsByColumnId = formatVarietyTableTotalsForFooterColumns(
    varietyTotals,
    { nameLabel: 'Total' }
  );

  return (
    <section className="space-y-2">
      <h3 className="font-custom text-sm font-semibold text-[#333]">
        {variety}
      </h3>
      <div className="border-border overflow-auto rounded-lg border">
        <Table className="border-collapse">
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow
                key={headerGroup.id}
                className="border-border bg-muted hover:bg-muted"
              >
                {headerGroup.headers.map((header) => (
                  <TableHead
                    key={header.id}
                    className="font-custom border-border border px-4 py-2 text-xs font-bold whitespace-nowrap"
                  >
                    {header.isPlaceholder
                      ? null
                      : flexRender(
                          header.column.columnDef.header,
                          header.getContext()
                        )}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>

          <TableBody>
            {table.getRowModel().rows.map((row) => (
              <TableRow
                key={row.id}
                className={cn(
                  'border-border hover:bg-transparent',
                  row.original.rowKind === 'familyTotal' &&
                    'bg-muted/40 font-semibold'
                )}
              >
                {row.getVisibleCells().map((cell) => {
                  const colId = cell.column.id;
                  const isMergedCol = POST_SEED_COLUMN_IDS.has(colId);
                  if (isMergedCol && !row.original.showPostSeedCells)
                    return null;
                  return (
                    <TableCell
                      key={cell.id}
                      rowSpan={
                        isMergedCol ? row.original.postSeedRowSpan : undefined
                      }
                      className={cn(
                        'font-custom border-border border px-4 py-2 text-xs',
                        colId === 'sNo' &&
                          'text-muted-foreground text-center tabular-nums',
                        colId === 'accountNumber' && 'text-center tabular-nums',
                        colId === 'name' && 'max-w-48 truncate',
                        colId === 'address' &&
                          'max-w-40 wrap-break-word sm:max-w-56',
                        (colId === 'acresPlanted' ||
                          colId === 'seedBags' ||
                          colId === 'buyBackBags' ||
                          colId === 'wtWithoutBardana' ||
                          colId.startsWith('grading:') ||
                          colId === 'totalGradingBags' ||
                          colId === 'below40Percent' ||
                          colId === 'range40To50Percent' ||
                          colId === 'above50Percent' ||
                          colId === 'netWeightAfterGrading' ||
                          colId === 'buyBackAmount' ||
                          colId === 'totalSeedAmount' ||
                          colId === 'netAmountPayable' ||
                          colId === 'netAmountPerAcre' ||
                          colId === 'yieldPerAcreQuintals') &&
                          'text-right tabular-nums',
                        isMergedCol && 'align-middle font-semibold',
                        colId === 'buyBackBags' &&
                          'border-primary/50 border-l-2'
                      )}
                    >
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext()
                      )}
                    </TableCell>
                  );
                })}
              </TableRow>
            ))}
          </TableBody>

          <TableFooter>
            <TableRow className="border-border hover:bg-transparent">
              {table.getVisibleFlatColumns().map((column) => (
                <TableCell
                  key={column.id}
                  className={cn(
                    'font-custom bg-muted/50 border-border border px-4 py-2 text-xs font-bold',
                    column.id === 'sNo' && 'text-center',
                    column.id === 'accountNumber' && 'text-center tabular-nums',
                    column.id === 'name' && 'max-w-48 truncate',
                    column.id === 'yieldPerAcreQuintals'
                      ? 'text-primary bg-primary/10 text-right tabular-nums'
                      : (column.id === 'acresPlanted' ||
                          column.id === 'seedBags' ||
                          column.id === 'buyBackBags' ||
                          column.id === 'wtWithoutBardana' ||
                          column.id.startsWith('grading:') ||
                          column.id === 'totalGradingBags' ||
                          column.id === 'below40Percent' ||
                          column.id === 'range40To50Percent' ||
                          column.id === 'above50Percent' ||
                          column.id === 'netWeightAfterGrading' ||
                          column.id === 'buyBackAmount' ||
                          column.id === 'totalSeedAmount' ||
                          column.id === 'netAmountPayable' ||
                          column.id === 'netAmountPerAcre' ||
                          column.id === 'yieldPerAcreQuintals') &&
                          'text-right tabular-nums',
                    column.id === 'buyBackBags' &&
                      'border-primary/50 border-l-2'
                  )}
                >
                  {totalsByColumnId[column.id] ?? '—'}
                </TableCell>
              ))}
            </TableRow>
          </TableFooter>
        </Table>
      </div>
    </section>
  );
});

export default ContractFarmingVarietyTable;
