import {
  Document,
  Image,
  Page,
  StyleSheet,
  Text,
  View,
} from '@react-pdf/renderer';
import type { ContractFarmingFarmerRow } from '@/types/analytics';
import type { ContractFarmingReportDigitalVarietyGroup } from '@/utils/contractFarmingReportShared';
import {
  CONTRACT_FARMING_GRADING_COLUMNS,
  CONTRACT_FARMING_IN_LOCALE,
  acresPlantedForSeedLine,
  aggregateBuyBackBagsForReportVariety,
  computeGradingRangePercentages,
  computeVarietyTableTotals,
  computeYieldPerAcreQuintals,
  expandFarmerRowsForSizes,
  findGradingBucket,
  formatAccountNumberField,
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
  resolveAcresForNetPerAcre,
} from '@/utils/contractFarmingReportShared';
import {
  CONTRACT_FARMING_COLUMN_OPTIONS,
  type ContractFarmingColumnVisibility,
} from '@/components/analytics/seed/contractFarmingColumns';

const styles = StyleSheet.create({
  page: {
    backgroundColor: '#FEFDF8',
    padding: 16,
    paddingBottom: 80,
    fontFamily: 'Helvetica',
    fontSize: 9,
  },
  header: {
    borderBottomWidth: 2,
    borderBottomColor: '#000',
    paddingBottom: 6,
    marginBottom: 12,
    textAlign: 'center',
  },
  company: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 3,
  },
  title: {
    fontSize: 15,
    fontWeight: 'bold',
    marginBottom: 6,
  },
  date: {
    fontSize: 10,
    marginBottom: 6,
  },
  varietyTitle: {
    fontSize: 11,
    fontWeight: 'bold',
    marginTop: 10,
    marginBottom: 6,
  },
  table: {
    borderWidth: 1,
    borderColor: '#000',
    width: '100%',
  },
  row: {
    flexDirection: 'row',
    borderBottomWidth: 0.5,
    borderBottomColor: '#666',
    paddingVertical: 2,
  },
  rowHeader: {
    backgroundColor: '#E8E8E8',
    fontWeight: 'bold',
    borderBottomWidth: 1,
    borderBottomColor: '#000',
    paddingVertical: 3,
  },
  rowFooter: {
    backgroundColor: '#D0D0D0',
    fontWeight: 'bold',
    borderTopWidth: 1,
    borderTopColor: '#000',
    paddingVertical: 3,
  },
  cell: {
    borderRightWidth: 0.5,
    borderRightColor: '#666',
    paddingHorizontal: 2,
    justifyContent: 'center',
  },
  cellLast: { borderRightWidth: 0 },
  text: { fontSize: 8, width: '100%' },
  textBold: { fontSize: 8, fontWeight: 'bold', width: '100%' },
  left: { textAlign: 'left' },
  center: { textAlign: 'center' },
  right: { textAlign: 'right' },
  footer: {
    position: 'absolute',
    left: 16,
    right: 16,
    bottom: 0,
    borderTopWidth: 1,
    borderTopColor: '#222',
    paddingTop: 6,
  },
  footerBrandWrap: {
    backgroundColor: '#E7E7E7',
    borderRadius: 5,
    minHeight: 34,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  footerLogo: {
    width: 22,
    height: 22,
  },
  poweredBy: {
    fontSize: 9,
    fontWeight: 'bold',
    color: '#2D2D2D',
  },
});

interface ContractFarmingReportTablePdfProps {
  companyName?: string;
  dateRangeLabel?: string;
  reportTitle?: string;
  groups: ContractFarmingReportDigitalVarietyGroup[];
  columnVisibility: ContractFarmingColumnVisibility;
}

type PdfColumn = {
  key: string;
  label: string;
  align: 'left' | 'center' | 'right';
  width: number;
};

const SIZE_LINE_REPEAT_COLUMNS = new Set<string>([
  'sNo',
  'acresPlanted',
  'generation',
  'sizeName',
  'seedBags',
]);

const PDF_ENTRIES_PER_PAGE = 18;
const PDF_ROW_HEIGHT = 18;

function formatNameWithAccount(farmer: ContractFarmingFarmerRow): string {
  const account = formatAccountNumberField(farmer.accountNumber);
  return account && account !== '—'
    ? `${farmer.name ?? '—'} #${account}`
    : (farmer.name ?? '—');
}

function visibleColumns(
  columnVisibility: ContractFarmingColumnVisibility
): PdfColumn[] {
  const cols = CONTRACT_FARMING_COLUMN_OPTIONS.filter(
    (c) => columnVisibility[c.key]
  ).map((c) => {
    const align: PdfColumn['align'] =
      c.key === 'name' ||
      c.key === 'address' ||
      c.key === 'generation' ||
      c.key === 'sizeName'
        ? 'left'
        : c.key === 'sNo'
          ? 'center'
          : 'right';
    return { key: c.key, label: c.label, align, width: 1 };
  });
  if (cols.length === 0) {
    return [{ key: 'name', label: 'Name', align: 'left', width: 1 }];
  }
  const width = 100 / cols.length;
  return cols.map((c) => ({ ...c, width }));
}

function rowValue(
  farmer: ContractFarmingFarmerRow,
  variety: string,
  sizeLineIndex: number
): Record<string, string> {
  const expandedRows = expandFarmerRowsForSizes([farmer]);
  const expanded = expandedRows[sizeLineIndex] ?? expandedRows[0];
  if (!expanded) {
    return {
      sNo: String(sizeLineIndex + 1),
      name: formatNameWithAccount(farmer),
      accountNumber: '—',
      address: farmer.address ?? '—',
      acresPlanted: '—',
      generation: '—',
      sizeName: '—',
      seedBags: '—',
      buyBackBags: '—',
      wtWithoutBardana: '—',
      totalGradingBags: '—',
      below40Percent: '—',
      range40To50Percent: '—',
      above50Percent: '—',
      cutPercent: '—',
      netWeightAfterGrading: '—',
      buyBackAmount: '—',
      totalSeedAmount: '—',
      netAmountPayable: '—',
      netAmountPerAcre: '—',
      yieldPerAcreQuintals: '—',
    };
  }
  const buyBack = aggregateBuyBackBagsForReportVariety(farmer, variety);
  const hasBuyBack = hasBuyBackBagsEntryForReportVariety(farmer, variety);
  const gradingBySize = mergeGradingSizeMapsForReportVariety(farmer, variety);
  const percentages = computeGradingRangePercentages(gradingBySize);
  const yieldQuintalsPerAcre = computeYieldPerAcreQuintals(
    gradingBySize,
    resolveAcresForNetPerAcre(farmer)
  );
  const out: Record<string, string> = {
    sNo: String(sizeLineIndex + 1),
    name: formatNameWithAccount(farmer),
    accountNumber: formatAccountNumberField(farmer.accountNumber),
    address: farmer.address,
    acresPlanted: acresPlantedForSeedLine(farmer, expanded.size).toLocaleString(
      CONTRACT_FARMING_IN_LOCALE,
      {
        maximumFractionDigits: 2,
      }
    ),
    generation: generationLabelForSeedLine(farmer, expanded.sizeLineIndex),
    sizeName: expanded.size?.name ?? '—',
    seedBags:
      expanded.size != null
        ? expanded.size.quantity.toLocaleString(CONTRACT_FARMING_IN_LOCALE, {
            maximumFractionDigits: 0,
          })
        : '—',
    buyBackBags: hasBuyBack
      ? buyBack.totalBags.toLocaleString(CONTRACT_FARMING_IN_LOCALE, {
          maximumFractionDigits: 0,
        })
      : '—',
    wtWithoutBardana: hasBuyBack
      ? buyBack.totalNetWeightKg.toLocaleString(CONTRACT_FARMING_IN_LOCALE, {
          maximumFractionDigits: 2,
        })
      : '—',
    totalGradingBags: formatTotalGradingBags(gradingBySize),
    below40Percent: formatGradingRangePercentage(percentages.below40),
    range40To50Percent: formatGradingRangePercentage(percentages.range40To50),
    above50Percent: formatGradingRangePercentage(percentages.above50),
    cutPercent: formatGradingRangePercentage(percentages.cut),
    netWeightAfterGrading: formatNetWeightAfterGrading(gradingBySize),
    buyBackAmount: formatBuyBackAmount(farmer, variety),
    totalSeedAmount: formatTotalSeedAmount(farmer),
    netAmountPayable: formatNetAmountPayable(farmer, variety),
    netAmountPerAcre: formatNetAmountPerAcre(farmer, variety),
    yieldPerAcreQuintals: formatYieldPerAcreQuintals(yieldQuintalsPerAcre),
  };
  for (const col of CONTRACT_FARMING_GRADING_COLUMNS) {
    out[`grading:${col.header}`] = formatGradingBagsQty(
      findGradingBucket(gradingBySize, col.matchKeys)
    );
  }
  return out;
}

function totalsValue(
  rows: ContractFarmingFarmerRow[],
  variety: string
): Record<string, string> {
  const totals = computeVarietyTableTotals(rows, variety);
  const out: Record<string, string> = {
    sNo: '',
    name: 'Total',
    accountNumber: '—',
    address: '—',
    acresPlanted: totals.acresPlanted.toLocaleString(
      CONTRACT_FARMING_IN_LOCALE,
      { maximumFractionDigits: 2 }
    ),
    generation: '—',
    sizeName: '—',
    seedBags: totals.seedBags.toLocaleString(CONTRACT_FARMING_IN_LOCALE, {
      maximumFractionDigits: 0,
    }),
    buyBackBags: totals.buyBackBags.toLocaleString(CONTRACT_FARMING_IN_LOCALE, {
      maximumFractionDigits: 0,
    }),
    wtWithoutBardana: totals.buyBackNetWeightKg.toLocaleString(
      CONTRACT_FARMING_IN_LOCALE,
      {
        maximumFractionDigits: 2,
      }
    ),
    totalGradingBags: totals.totalGradingBags.toLocaleString(
      CONTRACT_FARMING_IN_LOCALE,
      {
        maximumFractionDigits: 0,
      }
    ),
    below40Percent: formatGradingRangePercentage(totals.below40Percent),
    range40To50Percent: formatGradingRangePercentage(totals.range40To50Percent),
    above50Percent: formatGradingRangePercentage(totals.above50Percent),
    cutPercent: formatGradingRangePercentage(totals.cutPercent),
    netWeightAfterGrading: totals.netWeightAfterGrading.toLocaleString(
      CONTRACT_FARMING_IN_LOCALE,
      {
        maximumFractionDigits: 2,
      }
    ),
    buyBackAmount: totals.buyBackAmount.toLocaleString(
      CONTRACT_FARMING_IN_LOCALE,
      {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }
    ),
    totalSeedAmount: totals.totalSeedAmount.toLocaleString(
      CONTRACT_FARMING_IN_LOCALE,
      {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }
    ),
    netAmountPayable: totals.netAmountPayable.toLocaleString(
      CONTRACT_FARMING_IN_LOCALE,
      {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }
    ),
    netAmountPerAcre: totals.netAmountPerAcre.toLocaleString(
      CONTRACT_FARMING_IN_LOCALE,
      {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }
    ),
    yieldPerAcreQuintals: formatYieldPerAcreQuintals(
      totals.yieldPerAcreQuintals
    ),
  };
  for (const [i, col] of CONTRACT_FARMING_GRADING_COLUMNS.entries()) {
    out[`grading:${col.header}`] = (
      totals.gradingByColumn[i] ?? 0
    ).toLocaleString(CONTRACT_FARMING_IN_LOCALE, {
      maximumFractionDigits: 0,
    });
  }
  return out;
}

export function ContractFarmingReportTablePdf({
  companyName = 'Cold Storage',
  dateRangeLabel,
  reportTitle = 'Contract Farming Report',
  groups,
  columnVisibility,
}: ContractFarmingReportTablePdfProps) {
  const cols = visibleColumns(columnVisibility);
  const alignStyle = (align: PdfColumn['align']) =>
    align === 'left'
      ? styles.left
      : align === 'center'
        ? styles.center
        : styles.right;

  const FooterSection = () => (
    <View style={styles.footer}>
      <View style={styles.footerBrandWrap}>
        <Image
          src="https://res.cloudinary.com/dakh64xhy/image/upload/v1753172868/profile_pictures/lhdlzskpe2gj8dq8jvzl.png"
          style={styles.footerLogo}
        />
        <Text style={styles.poweredBy}>Powered by Coldop</Text>
      </View>
    </View>
  );

  return (
    <Document>
      {groups.flatMap((group, groupIndex) => {
        const totals = totalsValue(group.rows, group.variety);
        let serialNumber = 1;
        const farmerGroups = group.rows.map((farmer, farmerIndex) => {
          const expandedLines = expandFarmerRowsForSizes([farmer]);
          const lines = expandedLines.map((entry) => ({
            ...rowValue(entry.farmer, group.variety, entry.sizeLineIndex),
            sNo: String(serialNumber++),
          }));
          return {
            key: `${group.variety}-farmer-${farmerIndex}`,
            lines,
            lineCount: lines.length,
          };
        });

        type FarmerGroupChunk = {
          key: string;
          lines: Record<string, string>[];
        };
        const chunks: FarmerGroupChunk[][] = [];
        let currentChunk: FarmerGroupChunk[] = [];
        let currentEntries = 0;

        for (const farmerGroup of farmerGroups) {
          if (farmerGroup.lineCount <= PDF_ENTRIES_PER_PAGE - currentEntries) {
            currentChunk.push({
              key: farmerGroup.key,
              lines: farmerGroup.lines,
            });
            currentEntries += farmerGroup.lineCount;
            continue;
          }

          if (currentChunk.length > 0) {
            chunks.push(currentChunk);
            currentChunk = [];
            currentEntries = 0;
          }

          if (farmerGroup.lineCount <= PDF_ENTRIES_PER_PAGE) {
            currentChunk.push({
              key: farmerGroup.key,
              lines: farmerGroup.lines,
            });
            currentEntries = farmerGroup.lineCount;
            continue;
          }

          for (
            let start = 0;
            start < farmerGroup.lineCount;
            start += PDF_ENTRIES_PER_PAGE
          ) {
            const end = start + PDF_ENTRIES_PER_PAGE;
            chunks.push([
              {
                key: `${farmerGroup.key}-part-${start}`,
                lines: farmerGroup.lines.slice(start, end),
              },
            ]);
          }
        }

        if (currentChunk.length > 0) {
          chunks.push(currentChunk);
        }
        const pagedChunks = chunks.length > 0 ? chunks : [[]];

        return pagedChunks.map((chunkGroups, chunkIndex) => {
          const isFirstDocumentPage = groupIndex === 0 && chunkIndex === 0;
          const isLastChunkForVariety = chunkIndex === pagedChunks.length - 1;
          return (
            <Page
              key={`${group.variety}-${groupIndex}-${chunkIndex}`}
              size="A4"
              orientation="landscape"
              style={styles.page}
            >
              {isFirstDocumentPage ? (
                <View style={styles.header}>
                  <Text style={styles.company}>{companyName}</Text>
                  <Text style={styles.title}>{reportTitle}</Text>
                  {dateRangeLabel ? (
                    <Text style={styles.date}>{dateRangeLabel}</Text>
                  ) : null}
                </View>
              ) : null}
              <Text style={styles.varietyTitle}>Variety: {group.variety}</Text>
              <View style={styles.table}>
                <View style={[styles.row, styles.rowHeader]}>
                  {cols.map((col, index) => (
                    <View
                      key={col.key}
                      style={[
                        styles.cell,
                        ...(index === cols.length - 1 ? [styles.cellLast] : []),
                        { width: `${col.width}%` },
                      ]}
                    >
                      <Text style={[styles.textBold, alignStyle(col.align)]}>
                        {col.label}
                      </Text>
                    </View>
                  ))}
                </View>
                {chunkGroups.map((groupChunk) => {
                  const firstLine = groupChunk.lines[0];
                  if (!firstLine) return null;
                  const groupHeight = groupChunk.lines.length * PDF_ROW_HEIGHT;
                  return (
                    <View
                      key={groupChunk.key}
                      style={[styles.row, { minHeight: groupHeight }]}
                    >
                      {cols.map((col, index) => (
                        <View
                          key={col.key}
                          style={[
                            styles.cell,
                            ...(index === cols.length - 1
                              ? [styles.cellLast]
                              : []),
                            {
                              width: `${col.width}%`,
                              minHeight: groupHeight,
                              justifyContent: 'center',
                            },
                          ]}
                        >
                          {SIZE_LINE_REPEAT_COLUMNS.has(col.key) ? (
                            <View style={{ flexDirection: 'column' }}>
                              {groupChunk.lines.map((line, lineIndex) => (
                                <View
                                  key={`${groupChunk.key}-${col.key}-${lineIndex}`}
                                  style={[
                                    {
                                      minHeight: PDF_ROW_HEIGHT,
                                      justifyContent: 'center',
                                    },
                                    ...(lineIndex < groupChunk.lines.length - 1
                                      ? [
                                          {
                                            borderBottomWidth: 0.5,
                                            borderBottomColor: '#999',
                                          },
                                        ]
                                      : []),
                                  ]}
                                >
                                  <Text
                                    style={[styles.text, alignStyle(col.align)]}
                                  >
                                    {line[col.key] ?? '—'}
                                  </Text>
                                </View>
                              ))}
                            </View>
                          ) : (
                            <Text style={[styles.text, alignStyle(col.align)]}>
                              {firstLine[col.key] ?? '—'}
                            </Text>
                          )}
                        </View>
                      ))}
                    </View>
                  );
                })}
                {isLastChunkForVariety ? (
                  <View style={[styles.row, styles.rowFooter]}>
                    {cols.map((col, index) => (
                      <View
                        key={col.key}
                        style={[
                          styles.cell,
                          ...(index === cols.length - 1
                            ? [styles.cellLast]
                            : []),
                          { width: `${col.width}%` },
                        ]}
                      >
                        <Text style={[styles.textBold, alignStyle(col.align)]}>
                          {totals[col.key] ?? '—'}
                        </Text>
                      </View>
                    ))}
                  </View>
                ) : null}
              </View>
              <FooterSection />
            </Page>
          );
        });
      })}
    </Document>
  );
}
