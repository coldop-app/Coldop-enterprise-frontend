import { memo, useCallback } from 'react';
import { toast } from 'sonner';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { FileSpreadsheet } from 'lucide-react';
import { downloadContractFarmingReportExcel } from '@/utils/contractFarmingReportExcel';
import type {
  ContractFarmingFarmerRow,
  ContractFarmingSizeRow,
} from '@/types/analytics';
import type { ContractFarmingReportDigitalVarietyGroup } from '@/utils/contractFarmingReportShared';
import {
  CONTRACT_FARMING_GRADING_COLUMNS,
  CONTRACT_FARMING_IN_LOCALE,
  expandFarmerRowsForSizes,
  acresPlantedForSeedLine,
  generationLabelForSeedLine,
  findGradingBucket,
  formatGradingBagsQty,
  formatTotalGradingBags,
  formatNetWeightAfterGrading,
  formatBuyBackAmount,
  formatTotalSeedAmount,
  formatNetAmountPayable,
  formatNetAmountPerAcre,
  aggregateBuyBackBagsForReportVariety,
  hasBuyBackBagsEntryForReportVariety,
  mergeGradingSizeMapsForReportVariety,
  computeVarietyTableTotals,
} from '@/utils/contractFarmingReportShared';

export type { ContractFarmingReportDigitalVarietyGroup };

export interface ContractFarmingReportDigitalTableProps {
  isLoading: boolean;
  isError: boolean;
  error: unknown;
  /** One group per variety; each group renders its own table. */
  groups: ContractFarmingReportDigitalVarietyGroup[];
  companyName?: string;
}

/** One row per seed size line; post-seed columns merge vertically per farmer (`rowSpan`). */
function buildVarietyBodyRows(rows: ContractFarmingFarmerRow[]) {
  const out: {
    farmer: ContractFarmingFarmerRow;
    size: ContractFarmingSizeRow | null;
    sizeLineIndex: number;
    postSeedRowSpan: number;
    showPostSeedCells: boolean;
  }[] = [];
  for (const farmer of rows) {
    const expanded = expandFarmerRowsForSizes([farmer]);
    const span = expanded.length;
    expanded.forEach((e, i) => {
      out.push({
        farmer: e.farmer,
        size: e.size,
        sizeLineIndex: e.sizeLineIndex,
        postSeedRowSpan: span,
        showPostSeedCells: i === 0,
      });
    });
  }
  return out;
}

/** Left edge of post-seed block (partition after Seed bags). */
const postSeedSectionFirstCol = 'border-primary/50 border-l-2 align-middle';
const postSeedMergedCol = 'align-middle';

const varietyTableHead = (
  <>
    <TableHead className="font-custom bg-muted/95 sticky top-0 z-10 w-10 text-center text-xs font-semibold whitespace-nowrap backdrop-blur-sm">
      S. No.
    </TableHead>
    <TableHead className="font-custom bg-muted/95 sticky top-0 z-10 text-xs font-semibold whitespace-nowrap backdrop-blur-sm">
      Name
    </TableHead>
    <TableHead className="font-custom bg-muted/95 sticky top-0 z-10 min-w-32 text-xs font-semibold backdrop-blur-sm">
      Address
    </TableHead>
    <TableHead className="font-custom bg-muted/95 sticky top-0 z-10 text-right text-xs font-semibold backdrop-blur-sm">
      Acres planted
    </TableHead>
    <TableHead className="font-custom bg-muted/95 sticky top-0 z-10 text-xs font-semibold backdrop-blur-sm">
      Generation
    </TableHead>
    <TableHead className="font-custom bg-muted/95 sticky top-0 z-10 text-xs font-semibold whitespace-nowrap backdrop-blur-sm">
      Size name
    </TableHead>
    <TableHead className="font-custom bg-muted/95 sticky top-0 z-10 text-right text-xs font-semibold backdrop-blur-sm">
      Seed bags
    </TableHead>
    <TableHead
      className="font-custom bg-muted/95 border-primary/50 sticky top-0 z-10 border-l-2 text-right text-xs font-semibold backdrop-blur-sm"
      title="Buy-back and grading (merged per farmer when multiple seed lines)"
    >
      Buy back bags
    </TableHead>
    <TableHead className="font-custom bg-muted/95 sticky top-0 z-10 text-right text-xs font-semibold backdrop-blur-sm">
      Wt. without bardana
    </TableHead>
    {CONTRACT_FARMING_GRADING_COLUMNS.map((col) => (
      <TableHead
        key={col.header}
        className="font-custom bg-muted/95 sticky top-0 z-10 min-w-18 text-right text-xs font-semibold backdrop-blur-sm"
      >
        {col.header}
      </TableHead>
    ))}
    <TableHead className="font-custom bg-muted/95 sticky top-0 z-10 text-right text-xs font-semibold whitespace-nowrap backdrop-blur-sm">
      Total grading bags
    </TableHead>
    <TableHead className="font-custom bg-muted/95 sticky top-0 z-10 text-right text-xs font-semibold whitespace-nowrap backdrop-blur-sm">
      Net weight after grading (kg)
    </TableHead>
    <TableHead className="font-custom bg-muted/95 sticky top-0 z-10 text-right text-xs font-semibold whitespace-nowrap backdrop-blur-sm">
      Buy back amount
    </TableHead>
    <TableHead className="font-custom bg-muted/95 sticky top-0 z-10 text-right text-xs font-semibold whitespace-nowrap backdrop-blur-sm">
      Total seed amount
    </TableHead>
    <TableHead className="font-custom bg-muted/95 sticky top-0 z-10 text-right text-xs font-semibold whitespace-nowrap backdrop-blur-sm">
      Net amount payable
    </TableHead>
    <TableHead className="font-custom bg-muted/95 sticky top-0 z-10 text-right text-xs font-semibold whitespace-nowrap backdrop-blur-sm">
      Net amount / acre
    </TableHead>
  </>
);

export const ContractFarmingReportDigitalTable = memo(
  function ContractFarmingReportDigitalTable({
    isLoading,
    isError,
    error,
    groups,
    companyName,
  }: ContractFarmingReportDigitalTableProps) {
    const totalRows = groups.reduce(
      (n, g) => n + expandFarmerRowsForSizes(g.rows).length,
      0
    );

    const handleDownloadExcel = useCallback(() => {
      downloadContractFarmingReportExcel(groups, { companyName });
      toast.success('Excel downloaded', {
        description:
          'Farmers are listed A–Z; buy-back and grading columns merge per farmer when there are multiple seed lines.',
      });
    }, [groups, companyName]);

    return (
      <Card className="overflow-hidden rounded-xl border-dashed">
        <CardHeader className="flex flex-col gap-3 pb-2 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
          <div className="min-w-0 space-y-1.5">
            <CardTitle className="font-custom text-base font-semibold">
              Contract farming report
            </CardTitle>
            <CardDescription className="font-custom">
              Temporary Preview For Contract Farming Report Before Generating
              Pdf report
            </CardDescription>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={isLoading || isError || groups.length === 0}
            onClick={handleDownloadExcel}
            className="font-custom focus-visible:ring-primary h-9 shrink-0 gap-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
          >
            <FileSpreadsheet className="h-4 w-4 shrink-0" />
            Download Excel
          </Button>
        </CardHeader>
        <CardContent className="pt-0">
          {isLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-8 w-full rounded-md" />
              <Skeleton className="h-8 w-full rounded-md" />
              <Skeleton className="h-8 w-3/4 rounded-md" />
            </div>
          ) : isError ? (
            <p className="font-custom text-destructive text-sm">
              {error instanceof Error
                ? error.message
                : 'Could not load contract farming report.'}
            </p>
          ) : groups.length === 0 ? (
            <p className="font-custom text-muted-foreground text-sm">
              No contract farming rows returned.
            </p>
          ) : (
            <div className="max-h-[min(28rem,50vh)] space-y-6 overflow-auto pr-1">
              {groups.map(({ variety, rows }, groupIndex) => {
                const varietyTotals = computeVarietyTableTotals(rows, variety);
                return (
                  <section
                    key={variety}
                    className="space-y-2"
                    aria-labelledby={`cf-digital-variety-${groupIndex}`}
                  >
                    <h3
                      id={`cf-digital-variety-${groupIndex}`}
                      className="font-custom text-sm font-semibold text-[#333]"
                    >
                      {variety}
                    </h3>
                    <div className="overflow-auto rounded-lg border">
                      <Table>
                        <TableHeader>
                          <TableRow className="hover:bg-transparent">
                            {varietyTableHead}
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {buildVarietyBodyRows(rows).map(
                            (
                              {
                                farmer,
                                size,
                                sizeLineIndex,
                                postSeedRowSpan,
                                showPostSeedCells,
                              },
                              idx
                            ) => {
                              const buyBack =
                                aggregateBuyBackBagsForReportVariety(
                                  farmer,
                                  variety
                                );
                              const hasBuyBack =
                                hasBuyBackBagsEntryForReportVariety(
                                  farmer,
                                  variety
                                );
                              const gradingBySize =
                                mergeGradingSizeMapsForReportVariety(
                                  farmer,
                                  variety
                                );
                              return (
                                <TableRow
                                  key={`${variety}-${farmer.id}-${size?.name ?? 'no-size'}-${idx}`}
                                >
                                  <TableCell className="font-custom text-muted-foreground text-center text-xs tabular-nums">
                                    {idx + 1}
                                  </TableCell>
                                  <TableCell className="font-custom max-w-48 truncate text-xs">
                                    {farmer.name}
                                  </TableCell>
                                  <TableCell className="font-custom max-w-40 text-xs wrap-break-word sm:max-w-56">
                                    {farmer.address}
                                  </TableCell>
                                  <TableCell className="font-custom text-right text-xs tabular-nums">
                                    {acresPlantedForSeedLine(
                                      farmer,
                                      size
                                    ).toLocaleString(
                                      CONTRACT_FARMING_IN_LOCALE,
                                      {
                                        maximumFractionDigits: 2,
                                      }
                                    )}
                                  </TableCell>
                                  <TableCell className="font-custom text-xs whitespace-nowrap">
                                    {generationLabelForSeedLine(
                                      farmer,
                                      sizeLineIndex
                                    )}
                                  </TableCell>
                                  <TableCell className="font-custom text-xs whitespace-nowrap">
                                    {size?.name ?? '—'}
                                  </TableCell>
                                  <TableCell className="font-custom text-right text-xs tabular-nums">
                                    {size != null
                                      ? size.quantity.toLocaleString(
                                          CONTRACT_FARMING_IN_LOCALE,
                                          {
                                            maximumFractionDigits: 0,
                                          }
                                        )
                                      : '—'}
                                  </TableCell>
                                  {showPostSeedCells ? (
                                    <>
                                      <TableCell
                                        rowSpan={postSeedRowSpan}
                                        className={`font-custom text-right text-xs tabular-nums ${postSeedSectionFirstCol}`}
                                      >
                                        {hasBuyBack
                                          ? buyBack.totalBags.toLocaleString(
                                              CONTRACT_FARMING_IN_LOCALE,
                                              { maximumFractionDigits: 0 }
                                            )
                                          : '—'}
                                      </TableCell>
                                      <TableCell
                                        rowSpan={postSeedRowSpan}
                                        className={`font-custom text-right text-xs tabular-nums ${postSeedMergedCol}`}
                                      >
                                        {hasBuyBack
                                          ? buyBack.totalNetWeightKg.toLocaleString(
                                              CONTRACT_FARMING_IN_LOCALE,
                                              { maximumFractionDigits: 2 }
                                            )
                                          : '—'}
                                      </TableCell>
                                      {CONTRACT_FARMING_GRADING_COLUMNS.map(
                                        (col) => (
                                          <TableCell
                                            key={col.header}
                                            rowSpan={postSeedRowSpan}
                                            className={`font-custom text-right text-xs tabular-nums ${postSeedMergedCol}`}
                                          >
                                            {formatGradingBagsQty(
                                              findGradingBucket(
                                                gradingBySize,
                                                col.matchKeys
                                              )
                                            )}
                                          </TableCell>
                                        )
                                      )}
                                      <TableCell
                                        rowSpan={postSeedRowSpan}
                                        className={`font-custom text-right text-xs font-semibold tabular-nums ${postSeedMergedCol}`}
                                      >
                                        {formatTotalGradingBags(gradingBySize)}
                                      </TableCell>
                                      <TableCell
                                        rowSpan={postSeedRowSpan}
                                        className={`font-custom text-right text-xs font-semibold tabular-nums ${postSeedMergedCol}`}
                                      >
                                        {formatNetWeightAfterGrading(
                                          gradingBySize
                                        )}
                                      </TableCell>
                                      <TableCell
                                        rowSpan={postSeedRowSpan}
                                        className={`font-custom text-right text-xs font-semibold tabular-nums ${postSeedMergedCol}`}
                                      >
                                        {formatBuyBackAmount(farmer, variety)}
                                      </TableCell>
                                      <TableCell
                                        rowSpan={postSeedRowSpan}
                                        className={`font-custom text-right text-xs font-semibold tabular-nums ${postSeedMergedCol}`}
                                      >
                                        {formatTotalSeedAmount(farmer)}
                                      </TableCell>
                                      <TableCell
                                        rowSpan={postSeedRowSpan}
                                        className={`font-custom text-right text-xs font-semibold tabular-nums ${postSeedMergedCol}`}
                                      >
                                        {formatNetAmountPayable(
                                          farmer,
                                          variety
                                        )}
                                      </TableCell>
                                      <TableCell
                                        rowSpan={postSeedRowSpan}
                                        className={`font-custom text-right text-xs font-semibold tabular-nums ${postSeedMergedCol}`}
                                      >
                                        {formatNetAmountPerAcre(
                                          farmer,
                                          variety
                                        )}
                                      </TableCell>
                                    </>
                                  ) : null}
                                </TableRow>
                              );
                            }
                          )}
                        </TableBody>
                        <TableFooter className="border-border bg-muted/70 text-foreground border-t font-bold!">
                          <TableRow className="hover:bg-muted/80 font-custom text-foreground border-0 font-bold [&_td]:px-1.5 [&_td]:font-bold!">
                            <TableCell
                              className="font-custom text-center text-xs font-bold"
                              aria-hidden
                            />
                            <TableCell className="font-custom max-w-48 truncate text-xs font-bold">
                              Total
                            </TableCell>
                            <TableCell className="font-custom text-xs font-bold">
                              —
                            </TableCell>
                            <TableCell className="font-custom text-right text-xs font-bold tabular-nums">
                              {varietyTotals.acresPlanted.toLocaleString(
                                CONTRACT_FARMING_IN_LOCALE,
                                {
                                  maximumFractionDigits: 2,
                                }
                              )}
                            </TableCell>
                            <TableCell className="font-custom text-xs font-bold">
                              —
                            </TableCell>
                            <TableCell className="font-custom text-xs font-bold">
                              —
                            </TableCell>
                            <TableCell className="font-custom text-right text-xs font-bold tabular-nums">
                              {varietyTotals.seedBags.toLocaleString(
                                CONTRACT_FARMING_IN_LOCALE,
                                {
                                  maximumFractionDigits: 0,
                                }
                              )}
                            </TableCell>
                            <TableCell
                              className={`font-custom text-right text-xs font-bold tabular-nums ${postSeedSectionFirstCol}`}
                            >
                              {varietyTotals.buyBackBags.toLocaleString(
                                CONTRACT_FARMING_IN_LOCALE,
                                {
                                  maximumFractionDigits: 0,
                                }
                              )}
                            </TableCell>
                            <TableCell className="font-custom text-right text-xs font-bold tabular-nums">
                              {varietyTotals.buyBackNetWeightKg.toLocaleString(
                                CONTRACT_FARMING_IN_LOCALE,
                                { maximumFractionDigits: 2 }
                              )}
                            </TableCell>
                            {varietyTotals.gradingByColumn.map((qty, gi) => (
                              <TableCell
                                key={
                                  CONTRACT_FARMING_GRADING_COLUMNS[gi].header
                                }
                                className="font-custom text-right text-xs font-bold tabular-nums"
                              >
                                {qty.toLocaleString(
                                  CONTRACT_FARMING_IN_LOCALE,
                                  {
                                    maximumFractionDigits: 0,
                                  }
                                )}
                              </TableCell>
                            ))}
                            <TableCell className="font-custom text-right text-xs font-bold tabular-nums">
                              {varietyTotals.totalGradingBags.toLocaleString(
                                CONTRACT_FARMING_IN_LOCALE,
                                { maximumFractionDigits: 0 }
                              )}
                            </TableCell>
                            <TableCell className="font-custom text-right text-xs font-bold tabular-nums">
                              {varietyTotals.netWeightAfterGrading.toLocaleString(
                                CONTRACT_FARMING_IN_LOCALE,
                                { maximumFractionDigits: 2 }
                              )}
                            </TableCell>
                            <TableCell className="font-custom text-right text-xs font-bold tabular-nums">
                              {varietyTotals.buyBackAmount.toLocaleString(
                                CONTRACT_FARMING_IN_LOCALE,
                                {
                                  minimumFractionDigits: 2,
                                  maximumFractionDigits: 2,
                                }
                              )}
                            </TableCell>
                            <TableCell className="font-custom text-right text-xs font-bold tabular-nums">
                              {varietyTotals.totalSeedAmount.toLocaleString(
                                CONTRACT_FARMING_IN_LOCALE,
                                {
                                  minimumFractionDigits: 2,
                                  maximumFractionDigits: 2,
                                }
                              )}
                            </TableCell>
                            <TableCell className="font-custom text-right text-xs font-bold tabular-nums">
                              {varietyTotals.netAmountPayable.toLocaleString(
                                CONTRACT_FARMING_IN_LOCALE,
                                {
                                  minimumFractionDigits: 2,
                                  maximumFractionDigits: 2,
                                }
                              )}
                            </TableCell>
                            <TableCell className="font-custom text-right text-xs font-bold tabular-nums">
                              {varietyTotals.netAmountPerAcre.toLocaleString(
                                CONTRACT_FARMING_IN_LOCALE,
                                {
                                  minimumFractionDigits: 2,
                                  maximumFractionDigits: 2,
                                }
                              )}
                            </TableCell>
                          </TableRow>
                        </TableFooter>
                      </Table>
                    </div>
                  </section>
                );
              })}
            </div>
          )}
          {!isLoading && totalRows > 0 ? (
            <p className="font-custom text-muted-foreground mt-3 text-xs">
              {totalRows} row{totalRows === 1 ? '' : 's'} across {groups.length}{' '}
              variet{groups.length === 1 ? 'y' : 'ies'}.
            </p>
          ) : null}
        </CardContent>
      </Card>
    );
  }
);
