import type {
  ContractFarmingFarmerRow,
  ContractFarmingReportData,
} from '@/types/analytics';
import { formatAccountNumberField } from '@/utils/contractFarmingReportShared';

const moneyFmt = new Intl.NumberFormat('en-IN', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const qtyFmt = new Intl.NumberFormat('en-IN', {
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});

function formatMoney(n: number): string {
  return moneyFmt.format(n);
}

function formatQty(n: number): string {
  return qtyFmt.format(n);
}

/** One line in the overview summary table */
export interface ContractFarmingPdfOverviewRow {
  label: string;
  value: string;
}

/** Aggregate for a single top-level variety (key in `byVariety`) */
export interface ContractFarmingPdfVarietyAggregate {
  varietyName: string;
  farmerCount: number;
  totalAcres: number;
  totalSeedAmountPayable: number;
}

/** Flattened farmer row for PDF tables */
export interface ContractFarmingPdfFarmerRow {
  serial: number;
  accountNumber: string;
  name: string;
  address: string;
  mobileNumber: string;
  acresPlanted: string;
  totalSeedAmountPayable: string;
  generations: string;
  sizesText: string;
  buyBackText: string;
  gradingText: string;
}

export interface ContractFarmingPdfVarietySection {
  varietyName: string;
  farmers: ContractFarmingPdfFarmerRow[];
  /** Section subtotals (same sums as aggregate for this variety) */
  sectionTotalAcres: number;
  sectionTotalSeedPayable: number;
}

/** Everything the PDF needs — produced from API `data` only */
export interface PreparedContractFarmingReportPdf {
  /** Top-level variety keys from API, sorted alphabetically */
  varietyNames: string[];
  /** Grand totals across all rows in `byVariety` */
  grandTotalFarmerRows: number;
  grandTotalAcres: number;
  grandTotalSeedAmountPayable: number;
  /** Key-value rows for the “Overview” block */
  overviewRows: ContractFarmingPdfOverviewRow[];
  /** Per–top-level variety aggregates (same order as `varietyNames`) */
  varietyAggregates: ContractFarmingPdfVarietyAggregate[];
  /** Detailed tables, one section per top-level variety */
  varietySections: ContractFarmingPdfVarietySection[];
}

function formatSizes(sizes: ContractFarmingFarmerRow['sizes']): string {
  if (!sizes?.length) return '—';
  return sizes
    .map(
      (s) =>
        `${s.name}: ${formatQty(s.quantity)} bags, ${formatQty(s.acres)} ac, ₹${formatMoney(s.amountPayable)}`
    )
    .join('; ');
}

function formatBuyBack(
  buyBack: ContractFarmingFarmerRow['buy-back-bags']
): string {
  const entries = Object.entries(buyBack ?? {});
  if (entries.length === 0) return '—';
  return entries
    .map(
      ([variety, v]) =>
        `${variety}: ${formatQty(v.bags)} bags, ${formatQty(v.netWeightKg)} kg`
    )
    .join('; ');
}

function formatGrading(grading: ContractFarmingFarmerRow['grading']): string {
  if (!grading || Object.keys(grading).length === 0) return '—';
  const parts: string[] = [];
  for (const [productVariety, buckets] of Object.entries(grading)) {
    const bucketParts = Object.entries(buckets ?? {}).map(
      ([bucket, b]) =>
        `${bucket}: ${formatQty(b.initialBags)} bags / ${formatQty(b.netWeightKg)} kg`
    );
    parts.push(`${productVariety}: ${bucketParts.join('; ')}`);
  }
  return parts.join(' | ');
}

function sumBuyBackBags(row: ContractFarmingFarmerRow): number {
  return Object.values(row['buy-back-bags'] ?? {}).reduce(
    (acc, v) => acc + (v?.bags ?? 0),
    0
  );
}

/**
 * Maps GET /analytics/contract-farming-report `data` into PDF-ready props.
 * Aggregates acres and seed payable per top-level variety and overall.
 */
export function prepareContractFarmingReportPdf(
  data: ContractFarmingReportData
): PreparedContractFarmingReportPdf {
  const byVariety = data?.byVariety ?? {};
  const varietyNames = Object.keys(byVariety).sort((a, b) =>
    a.localeCompare(b)
  );

  let grandTotalFarmerRows = 0;
  let grandTotalAcres = 0;
  let grandTotalSeedAmountPayable = 0;
  let grandTotalBuyBackBags = 0;

  const varietyAggregates: ContractFarmingPdfVarietyAggregate[] = [];
  const varietySections: ContractFarmingPdfVarietySection[] = [];

  for (const varietyName of varietyNames) {
    const farmers = byVariety[varietyName] ?? [];
    grandTotalFarmerRows += farmers.length;

    let totalAcres = 0;
    let totalSeed = 0;
    let totalBuyBack = 0;
    const pdfRows: ContractFarmingPdfFarmerRow[] = [];

    farmers.forEach((row, idx) => {
      totalAcres += row.acresPlanted ?? 0;
      totalSeed += row.totalSeedAmountPayable ?? 0;
      totalBuyBack += sumBuyBackBags(row);

      pdfRows.push({
        serial: idx + 1,
        accountNumber: formatAccountNumberField(row.accountNumber),
        name: row.name ?? '—',
        address: row.address ?? '—',
        mobileNumber: row.mobileNumber ?? '—',
        acresPlanted: formatQty(row.acresPlanted ?? 0),
        totalSeedAmountPayable: formatMoney(row.totalSeedAmountPayable ?? 0),
        generations: (row.generations ?? []).join(', ') || '—',
        sizesText: formatSizes(row.sizes),
        buyBackText: formatBuyBack(row['buy-back-bags']),
        gradingText: formatGrading(row.grading),
      });
    });

    grandTotalAcres += totalAcres;
    grandTotalSeedAmountPayable += totalSeed;
    grandTotalBuyBackBags += totalBuyBack;

    varietyAggregates.push({
      varietyName,
      farmerCount: farmers.length,
      totalAcres,
      totalSeedAmountPayable: totalSeed,
    });

    varietySections.push({
      varietyName,
      farmers: pdfRows,
      sectionTotalAcres: totalAcres,
      sectionTotalSeedPayable: totalSeed,
    });
  }

  const overviewRows: ContractFarmingPdfOverviewRow[] = [
    {
      label: 'Varieties (report groups)',
      value: String(varietyNames.length),
    },
    {
      label: 'Total farmer rows (all groups)',
      value: String(grandTotalFarmerRows),
    },
    {
      label: 'Total acres (summed across groups)',
      value: formatQty(grandTotalAcres),
    },
    {
      label: 'Total seed amount payable (₹)',
      value: formatMoney(grandTotalSeedAmountPayable),
    },
    {
      label: 'Total buy-back bags (all groups)',
      value: formatQty(grandTotalBuyBackBags),
    },
  ];

  return {
    varietyNames,
    grandTotalFarmerRows,
    grandTotalAcres,
    grandTotalSeedAmountPayable,
    overviewRows,
    varietyAggregates,
    varietySections,
  };
}
