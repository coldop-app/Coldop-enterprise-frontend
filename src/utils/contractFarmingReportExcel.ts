import * as XLSX from 'xlsx';
import type {
  ContractFarmingFarmerRow,
  ContractFarmingSizeRow,
} from '@/types/analytics';
import type { ContractFarmingReportDigitalVarietyGroup } from '@/utils/contractFarmingReportShared';
import {
  CONTRACT_FARMING_GRADING_COLUMNS,
  CONTRACT_FARMING_IN_LOCALE,
  acresPlantedForSeedLine,
  generationLabelForSeedLine,
  expandFarmerRowsForSizes,
  mergeGradingSizeMapsForReportVariety,
  findGradingBucket,
  formatGradingBagsQty,
  formatTotalGradingBags,
  computeGradingRangePercentages,
  formatGradingRangePercentage,
  formatNetWeightAfterGrading,
  formatBuyBackAmount,
  formatTotalSeedAmount,
  formatNetAmountPayable,
  formatNetAmountPerAcre,
  computeYieldPerAcreQuintals,
  formatYieldPerAcreQuintals,
  resolveAcresForNetPerAcre,
  aggregateBuyBackBagsForReportVariety,
  formatAccountNumberField,
  hasBuyBackBagsEntryForReportVariety,
} from '@/utils/contractFarmingReportShared';

/** Columns 0–8: S.No. … Seed bags. Column 9+ merged per farmer when multiple seed lines. */
const EXCEL_MERGE_COL_START = 9;

function buildHeaderRow(): string[] {
  return [
    'S. No.',
    'Variety',
    'Name',
    'Account no.',
    'Address',
    'Acres planted',
    'Generation',
    'Size name',
    'Seed bags',
    'Buy back bags',
    'Wt. without bardana',
    ...CONTRACT_FARMING_GRADING_COLUMNS.map((c) => c.header),
    'Total grading bags',
    'Below 40 %',
    '40-50 %',
    'Above 50 %',
    'Net weight after grading (kg)',
    'Buy back amount',
    'Total seed amount',
    'Net amount payable',
    'Net amount / acre',
    'Yield per acre (in quintals)',
  ];
}

function buildPostSeedSectionRow(
  farmer: ContractFarmingFarmerRow,
  variety: string
): (string | number)[] {
  const buyBack = aggregateBuyBackBagsForReportVariety(farmer, variety);
  const hasBuyBack = hasBuyBackBagsEntryForReportVariety(farmer, variety);
  const gradingBySize = mergeGradingSizeMapsForReportVariety(farmer, variety);

  const gradingCells = CONTRACT_FARMING_GRADING_COLUMNS.map((col) =>
    formatGradingBagsQty(findGradingBucket(gradingBySize, col.matchKeys))
  );
  const percentages = computeGradingRangePercentages(gradingBySize);
  const yieldPerAcreQuintals = computeYieldPerAcreQuintals(
    gradingBySize,
    resolveAcresForNetPerAcre(farmer)
  );

  return [
    hasBuyBack
      ? buyBack.totalBags.toLocaleString(CONTRACT_FARMING_IN_LOCALE, {
          maximumFractionDigits: 0,
        })
      : '—',
    hasBuyBack
      ? buyBack.totalNetWeightKg.toLocaleString(CONTRACT_FARMING_IN_LOCALE, {
          maximumFractionDigits: 2,
        })
      : '—',
    ...gradingCells,
    formatTotalGradingBags(gradingBySize),
    formatGradingRangePercentage(percentages.below40),
    formatGradingRangePercentage(percentages.range40To50),
    formatGradingRangePercentage(percentages.above50),
    formatNetWeightAfterGrading(gradingBySize),
    formatBuyBackAmount(farmer, variety),
    formatTotalSeedAmount(farmer),
    formatNetAmountPayable(farmer, variety),
    formatNetAmountPerAcre(farmer, variety),
    formatYieldPerAcreQuintals(yieldPerAcreQuintals),
  ];
}

function buildSeedColumns(
  serial: number,
  variety: string,
  farmer: ContractFarmingFarmerRow,
  size: ContractFarmingSizeRow | null,
  sizeLineIndex: number
): (string | number)[] {
  return [
    serial,
    variety,
    farmer.name,
    formatAccountNumberField(farmer.accountNumber),
    farmer.address,
    acresPlantedForSeedLine(farmer, size).toLocaleString(
      CONTRACT_FARMING_IN_LOCALE,
      {
        maximumFractionDigits: 2,
      }
    ),
    generationLabelForSeedLine(farmer, sizeLineIndex),
    size?.name ?? '—',
    size != null
      ? size.quantity.toLocaleString(CONTRACT_FARMING_IN_LOCALE, {
          maximumFractionDigits: 0,
        })
      : '—',
  ];
}

/**
 * Download contract farming report as Excel. All rows are sorted alphabetically by farmer name,
 * then variety, then seed size line. From "Buy back bags" onward, cells merge vertically per farmer
 * when there are multiple seed size rows (same as on-screen table).
 */
export function downloadContractFarmingReportExcel(
  groups: ContractFarmingReportDigitalVarietyGroup[],
  options?: { companyName?: string }
): void {
  const companyName = options?.companyName?.trim() ?? '';
  const dateLabel = new Date().toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  type Flat = {
    variety: string;
    farmer: ContractFarmingFarmerRow;
    size: ContractFarmingSizeRow | null;
    sizeLineIndex: number;
  };

  const flat: Flat[] = groups.flatMap((g) =>
    expandFarmerRowsForSizes(g.rows).map(({ farmer, size, sizeLineIndex }) => ({
      variety: g.variety,
      farmer,
      size,
      sizeLineIndex,
    }))
  );

  flat.sort((a, b) => {
    const byName = a.farmer.name.localeCompare(b.farmer.name);
    if (byName !== 0) return byName;
    const byVar = a.variety.localeCompare(b.variety);
    if (byVar !== 0) return byVar;
    return (a.size?.name ?? '').localeCompare(b.size?.name ?? '');
  });

  const header = buildHeaderRow();
  const numCols = header.length;
  const postSeedColCount = numCols - EXCEL_MERGE_COL_START;

  const sheetRows: (string | number)[][] = [];
  if (companyName) {
    sheetRows.push([companyName]);
  }
  sheetRows.push(['Contract farming report']);
  sheetRows.push([`As of ${dateLabel}`]);
  sheetRows.push([]);
  sheetRows.push(header);

  const merges: XLSX.Range[] = [];

  let serial = 1;
  let i = 0;
  while (i < flat.length) {
    let j = i + 1;
    while (
      j < flat.length &&
      flat[j].farmer.id === flat[i].farmer.id &&
      flat[j].variety === flat[i].variety
    ) {
      j += 1;
    }
    const span = j - i;
    const r0 = sheetRows.length;

    for (let k = i; k < j; k++) {
      const row = flat[k];
      const seedPart = buildSeedColumns(
        serial++,
        row.variety,
        row.farmer,
        row.size,
        row.sizeLineIndex
      );
      if (k === i) {
        const post = buildPostSeedSectionRow(row.farmer, row.variety);
        sheetRows.push([...seedPart, ...post]);
      } else {
        const emptyPost = Array.from({ length: postSeedColCount }, () => '');
        sheetRows.push([...seedPart, ...emptyPost]);
      }
    }

    if (span > 1) {
      const r1 = r0 + span - 1;
      for (let c = EXCEL_MERGE_COL_START; c < numCols; c++) {
        merges.push({ s: { r: r0, c }, e: { r: r1, c } });
      }
    }

    i = j;
  }

  const maxCols = sheetRows.reduce((max, row) => Math.max(max, row.length), 0);
  const colWidth = 18;
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet(sheetRows);
  if (merges.length > 0) {
    ws['!merges'] = merges;
  }
  if (maxCols > 0) {
    ws['!cols'] = Array.from({ length: maxCols }, () => ({ wch: colWidth }));
  }
  XLSX.utils.book_append_sheet(wb, ws, 'Contract farming');

  const safeSlug = companyName
    ? companyName.replace(/[/\\?*[\]:]/g, '-').slice(0, 24)
    : 'Contract_farming';
  const filename = `${safeSlug}_Contract_Farming_Report.xlsx`;
  XLSX.writeFile(wb, filename);
}
