import * as React from 'react';
import { FileText, RefreshCw, Search, SlidersHorizontal } from 'lucide-react';
import { Item } from '@/components/ui/item';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import {
  useGetContractFarmingReport,
  type ContractFarmingReportData,
  type ContractFarmingReportFarmer,
} from '@/services/store-admin/general/useGetContractFarmingReport';

type FlattenedRow = {
  rowId: string;
  isFirstFarmerRow: boolean;
  isFirstVarietyRow: boolean;
  isFarmerBlockStart: boolean;
  isVarietyBlockStart: boolean;
  farmerRowSpan: number;
  varietyRowSpan: number;
  farmerName: string;
  farmerMobile: string;
  farmerAccount: number;
  farmerAddress: string;
  varietyName: string;
  generation: string;
  sizeName: string;
  sizeQuantity: number;
  sizeAcres: number;
  sizeAmount: number;
  buyBackBags: number | null;
  buyBackNetWeightKg: number | null;
  gradeData: Record<string, { bags: number; netWeightKg: number }>;
};

function formatNumber(value: number | null | undefined, decimals = 2) {
  if (value === null || value === undefined || Number.isNaN(value)) return '-';
  return Number(value).toLocaleString('en-IN', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

function normalizeReportData(data: ContractFarmingReportData | undefined) {
  return (
    data ?? {
      farmers: [],
      meta: { allGrades: [], allVarieties: [] },
    }
  );
}

function flattenRows(farmers: ContractFarmingReportFarmer[]): FlattenedRow[] {
  const rows: FlattenedRow[] = [];

  farmers.forEach((farmer, farmerIndex) => {
    const farmerVarieties = farmer.varieties ?? [];
    const varietyRowCounts = farmerVarieties.map((variety) => {
      const sizes = variety.seed?.sizes ?? [];
      return Math.max(sizes.length, 1);
    });
    const farmerTotalRows = varietyRowCounts.reduce(
      (acc, count) => acc + count,
      0
    );

    farmerVarieties.forEach((variety, varietyIndex) => {
      const sizes = variety.seed?.sizes ?? [];
      const normalizedSizes =
        sizes.length > 0
          ? sizes
          : [{ name: '-', quantity: 0, acres: 0, amountPayable: 0 }];
      const varietyRowSpan = normalizedSizes.length;

      normalizedSizes.forEach((size, sizeIndex) => {
        const isFirstFarmerRow = varietyIndex === 0 && sizeIndex === 0;
        const isFirstVarietyRow = sizeIndex === 0;

        rows.push({
          rowId: `${farmer.id}-${variety.name}-${sizeIndex}-${farmerIndex}-${varietyIndex}`,
          isFirstFarmerRow,
          isFirstVarietyRow,
          isFarmerBlockStart: isFirstFarmerRow,
          isVarietyBlockStart: !isFirstFarmerRow && isFirstVarietyRow,
          farmerRowSpan: farmerTotalRows,
          varietyRowSpan,
          farmerName: farmer.name,
          farmerMobile: farmer.mobileNumber,
          farmerAccount: farmer.accountNumber,
          farmerAddress: farmer.address,
          varietyName: variety.name,
          generation: variety.seed?.generation ?? '-',
          sizeName: size.name,
          sizeQuantity: size.quantity,
          sizeAcres: size.acres,
          sizeAmount: size.amountPayable,
          buyBackBags: variety.buyBack?.bags ?? null,
          buyBackNetWeightKg: variety.buyBack?.netWeightKg ?? null,
          gradeData: variety.grading ?? {},
        });
      });
    });
  });

  return rows;
}

const ContractFarmingReportTable = () => {
  const [search, setSearch] = React.useState('');
  const { data, isLoading, isFetching, isError, error, refetch } =
    useGetContractFarmingReport();

  const report = React.useMemo(() => normalizeReportData(data), [data]);
  const gradeHeaders = report.meta.allGrades;
  const flattenedRows = React.useMemo(
    () => flattenRows(report.farmers),
    [report.farmers]
  );

  const filteredRows = React.useMemo<FlattenedRow[]>(() => {
    const query = search.trim().toLowerCase();
    if (!query) return flattenedRows;

    return flattenedRows.filter(
      (row) =>
        row.farmerName.toLowerCase().includes(query) ||
        row.farmerAddress.toLowerCase().includes(query) ||
        row.farmerMobile.toLowerCase().includes(query) ||
        row.varietyName.toLowerCase().includes(query) ||
        row.generation.toLowerCase().includes(query) ||
        row.sizeName.toLowerCase().includes(query) ||
        String(row.farmerAccount).includes(query)
    );
  }, [flattenedRows, search]);

  const totalColumns =
    11 + (gradeHeaders.length > 0 ? gradeHeaders.length * 2 : 1);

  return (
    <main className="from-background via-muted/20 to-background mx-auto max-w-7xl bg-linear-to-b p-3 sm:p-4 lg:p-6">
      <div className="space-y-4">
        <Item
          variant="outline"
          size="sm"
          className="border-border/30 bg-background rounded-2xl border p-3 shadow-sm"
        >
          <div className="flex w-full flex-wrap items-end gap-3 lg:flex-nowrap">
            <div className="ml-auto flex items-center gap-2 self-end">
              <div className="relative min-w-[160px] lg:w-[220px]">
                <Search className="text-muted-foreground pointer-events-none absolute top-1/2 left-2.5 h-3.5 w-3.5 -translate-y-1/2" />
                <Input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search table..."
                  className="h-8 pl-8 text-sm"
                />
              </div>
              <Button
                variant="outline"
                className="border-primary text-primary hover:bg-primary/5 h-8 rounded-lg px-4 text-sm leading-none"
              >
                <SlidersHorizontal className="h-3.5 w-3.5" />
                View Filters
              </Button>
              <Button
                variant="default"
                className="h-8 rounded-lg px-4 text-sm leading-none"
              >
                <FileText className="h-3.5 w-3.5" />
                Pdf
              </Button>
              <Button
                variant="ghost"
                className="text-muted-foreground h-8 rounded-lg px-2 leading-none"
                aria-label="Refresh"
                onClick={() => void refetch()}
              >
                <RefreshCw
                  className={`h-3.5 w-3.5 ${isFetching ? 'animate-spin' : ''}`}
                />
              </Button>
            </div>
          </div>
        </Item>

        {isError ? (
          <p className="mb-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {(error as Error)?.message || 'Failed to fetch report data.'}
          </p>
        ) : (
          <p className="text-muted-foreground text-sm">
            Showing farmer, variety, seed, buy-back and grading details from the
            contract-farming report API.
          </p>
        )}

        <div className="subtle-scrollbar border-primary/15 bg-card/95 ring-primary/5 relative overflow-x-auto overflow-y-auto rounded-2xl border shadow-[0_1px_2px_rgba(0,0,0,0.05),0_8px_24px_rgba(0,0,0,0.06)] ring-1">
          {isLoading ? (
            <div className="space-y-4 p-4">
              <div className="grid grid-cols-8 gap-2">
                {Array.from({ length: 8 }).map((_, index) => (
                  <Skeleton
                    key={`contract-farming-header-skeleton-${index}`}
                    className="h-8 w-full rounded-md"
                  />
                ))}
              </div>
              <div className="space-y-2">
                {Array.from({ length: 10 }).map((_, rowIndex) => (
                  <div
                    key={`contract-farming-row-skeleton-${rowIndex}`}
                    className="grid grid-cols-8 gap-2"
                  >
                    {Array.from({ length: 8 }).map((_, columnIndex) => (
                      <Skeleton
                        key={`contract-farming-cell-skeleton-${rowIndex}-${columnIndex}`}
                        className="h-7 w-full rounded-md"
                      />
                    ))}
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <table className="font-custom min-w-full border-collapse text-sm">
              <thead className="bg-secondary border-border/60 text-secondary-foreground sticky top-0 z-10 border-b backdrop-blur-sm">
                <tr>
                  {[
                    'Farmer',
                    'Acc #',
                    'Address',
                    'Variety',
                    'Gen',
                    'Size',
                    'Qty (bags)',
                    'Acres',
                    'Seed amt (₹)',
                  ].map((label) => (
                    <th
                      key={label}
                      rowSpan={2}
                      className="font-custom border-border/50 text-foreground/75 h-10 border-r px-3 py-2.5 text-left text-[11px] font-semibold tracking-[0.08em] whitespace-nowrap uppercase"
                    >
                      {label}
                    </th>
                  ))}
                  <th
                    colSpan={2}
                    className="font-custom border-border/50 h-10 border-r bg-green-50 px-3 py-2.5 text-left text-[11px] font-semibold tracking-[0.08em] whitespace-nowrap uppercase"
                  >
                    Buy back
                  </th>
                  <th
                    colSpan={Math.max(gradeHeaders.length * 2, 1)}
                    className="font-custom border-border/50 h-10 border-r px-3 py-2.5 text-left text-[11px] font-semibold tracking-[0.08em] whitespace-nowrap uppercase"
                  >
                    Grading
                  </th>
                </tr>
                <tr>
                  <th className="font-custom border-border/50 h-10 border-r bg-green-50 px-3 py-2.5 text-left text-[11px] font-semibold tracking-[0.08em] whitespace-nowrap uppercase">
                    Bags
                  </th>
                  <th className="font-custom border-border/50 h-10 border-r bg-green-50 px-3 py-2.5 text-left text-[11px] font-semibold tracking-[0.08em] whitespace-nowrap uppercase">
                    Net wt (kg)
                  </th>
                  {gradeHeaders.length > 0 ? (
                    gradeHeaders.flatMap((grade) => [
                      <th
                        key={`bags-${grade}`}
                        className="font-custom border-border/50 h-10 border-r px-3 py-2.5 text-left text-[11px] font-semibold tracking-[0.08em] whitespace-nowrap uppercase"
                      >
                        {grade}
                        <br />
                        <span className="text-muted-foreground text-[10px] font-normal">
                          Bags
                        </span>
                      </th>,
                      <th
                        key={`wt-${grade}`}
                        className="font-custom border-border/50 h-10 border-r px-3 py-2.5 text-left text-[11px] font-semibold tracking-[0.08em] whitespace-nowrap uppercase"
                      >
                        {grade}
                        <br />
                        <span className="text-muted-foreground text-[10px] font-normal">
                          Wt (kg)
                        </span>
                      </th>,
                    ])
                  ) : (
                    <th className="font-custom border-border/50 h-10 border-r px-3 py-2.5 text-left text-[11px] font-semibold tracking-[0.08em] whitespace-nowrap uppercase">
                      No grades
                    </th>
                  )}
                </tr>
              </thead>
              <tbody>
                {filteredRows.length > 0 ? (
                  filteredRows.map((row) => {
                    const rowClass = row.isFarmerBlockStart
                      ? 'border-border/70 border-t-2'
                      : row.isVarietyBlockStart
                        ? 'border-border/60 border-t'
                        : 'border-border/40 border-t border-dashed';
                    const stripingClass =
                      Number(row.rowId.split('-').pop() ?? 0) % 2 === 0
                        ? 'bg-background'
                        : 'bg-muted/25';

                    return (
                      <tr
                        key={row.rowId}
                        className={`hover:bg-accent/40 ${rowClass} ${stripingClass}`}
                      >
                        {row.isFirstFarmerRow && (
                          <>
                            <td
                              rowSpan={row.farmerRowSpan}
                              className="font-custom border-border/40 text-foreground/85 max-w-56 border-r px-3 py-2.5 align-top"
                            >
                              <div className="font-medium">
                                {row.farmerName}
                              </div>
                              <div className="text-muted-foreground text-xs">
                                {row.farmerMobile}
                              </div>
                            </td>
                            <td
                              rowSpan={row.farmerRowSpan}
                              className="font-custom border-border/40 text-foreground/85 border-r px-3 py-2.5 align-top"
                            >
                              {row.farmerAccount}
                            </td>
                            <td
                              rowSpan={row.farmerRowSpan}
                              className="font-custom border-border/40 text-foreground/85 border-r px-3 py-2.5 align-top"
                            >
                              {row.farmerAddress}
                            </td>
                          </>
                        )}

                        {row.isFirstVarietyRow && (
                          <td
                            rowSpan={row.varietyRowSpan}
                            className="font-custom border-border/40 text-foreground/85 border-r px-3 py-2.5 align-top"
                          >
                            <span className="inline-block rounded-full bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700">
                              {row.varietyName}
                            </span>
                          </td>
                        )}

                        <td className="font-custom border-border/40 text-foreground/85 border-r px-3 py-2.5">
                          <span className="inline-block rounded-full bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700">
                            {row.generation}
                          </span>
                        </td>
                        <td className="font-custom border-border/40 text-foreground/85 border-r px-3 py-2.5">
                          {row.sizeName}
                        </td>
                        <td className="font-custom border-border/40 text-foreground/85 border-r px-3 py-2.5 text-right tabular-nums">
                          {formatNumber(row.sizeQuantity, 0)}
                        </td>
                        <td className="font-custom border-border/40 text-foreground/85 border-r px-3 py-2.5 text-right tabular-nums">
                          {formatNumber(row.sizeAcres)}
                        </td>
                        <td className="font-custom border-border/40 text-foreground/85 border-r px-3 py-2.5 text-right tabular-nums">
                          {row.sizeAmount > 0
                            ? `₹${formatNumber(row.sizeAmount)}`
                            : '-'}
                        </td>

                        {row.isFirstVarietyRow && (
                          <>
                            <td
                              rowSpan={row.varietyRowSpan}
                              className="font-custom border-border/40 border-r bg-green-50 px-3 py-2.5 text-right align-top tabular-nums"
                            >
                              {formatNumber(row.buyBackBags, 0)}
                            </td>
                            <td
                              rowSpan={row.varietyRowSpan}
                              className="font-custom border-border/40 border-r bg-green-50 px-3 py-2.5 text-right align-top tabular-nums"
                            >
                              {formatNumber(row.buyBackNetWeightKg)}
                            </td>
                            {gradeHeaders.length > 0 ? (
                              gradeHeaders.flatMap((grade) => {
                                const gradeEntry = row.gradeData[grade];
                                return [
                                  <td
                                    key={`${row.rowId}-grade-bags-${grade}`}
                                    rowSpan={row.varietyRowSpan}
                                    className="font-custom border-border/40 text-foreground/85 border-r px-3 py-2.5 text-right align-top tabular-nums"
                                  >
                                    {gradeEntry
                                      ? formatNumber(gradeEntry.bags, 0)
                                      : '-'}
                                  </td>,
                                  <td
                                    key={`${row.rowId}-grade-wt-${grade}`}
                                    rowSpan={row.varietyRowSpan}
                                    className="font-custom border-border/40 text-foreground/85 border-r px-3 py-2.5 text-right align-top tabular-nums"
                                  >
                                    {gradeEntry
                                      ? formatNumber(gradeEntry.netWeightKg)
                                      : '-'}
                                  </td>,
                                ];
                              })
                            ) : (
                              <td
                                rowSpan={row.varietyRowSpan}
                                className="font-custom border-border/40 text-foreground/85 border-r px-3 py-2.5 text-center align-top"
                              >
                                -
                              </td>
                            )}
                          </>
                        )}
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td
                      colSpan={totalColumns}
                      className="text-muted-foreground h-24 text-center"
                    >
                      No records found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </main>
  );
};

export default ContractFarmingReportTable;
