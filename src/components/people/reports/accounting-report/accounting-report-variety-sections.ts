import type { FarmerSeedGatePass } from '@/services/store-admin/people/useGetAllGatePassesOfFarmer';
import type { PreferencesData } from '@/services/store-admin/preferences/useGetPreferences';
import type { IncomingGatePassByFarmerStorageLinkItem } from '@/types/incoming-gate-pass';
import type { GradingGatePass } from '@/types/grading-gate-pass';
import { prepareDataForGradingTable } from '@/components/people/reports/helpers/grading-prepare';
import { prepareDataForIncomingTable } from '@/components/people/reports/helpers/incoming-prepare';
import { prepareAccountingGradingSummary } from '@/components/people/reports/helpers/summary-prepare';
import { prepareDataForFarmerSeedTable } from '@/components/people/reports/helpers/seed-prepare';
import type { AccountingGradingRow } from '@/components/people/reports/grading-table';
import type { AccountingIncomingRow } from '@/components/people/reports/incoming-table';
import type { GradingBagTypeQtySummaryRow } from '@/components/people/reports/summary-table';
import type { FarmerSeedRow } from '@/components/people/reports/helpers/seed-prepare';

export type AccountingReportVarietySection = {
  /** Normalized key (trimmed); empty string when missing. */
  varietyKey: string;
  /** Human-readable heading for this block. */
  varietyLabel: string;
  /** Raw passes for this variety (summary table recomputes from these). */
  gradingGatePassesForSummary: GradingGatePass[];
  incomingRows: AccountingIncomingRow[];
  gradingRows: AccountingGradingRow[];
  summaryRows: GradingBagTypeQtySummaryRow[];
  farmerSeedRows: FarmerSeedRow[];
};

export function normalizeAccountingVarietyKey(
  raw: string | null | undefined
): string {
  return (raw ?? '').trim();
}

export function displayAccountingVarietyLabel(key: string): string {
  return key === '' ? 'No variety' : key;
}

function sortVarietyKeys(keys: string[]): string[] {
  return [...keys].sort((a, b) => {
    if (a === '' && b !== '') return 1;
    if (b === '' && a !== '') return -1;
    return a.localeCompare(b, 'en-IN');
  });
}

function incomingIdsLinkedFromGradings(passes: GradingGatePass[]): Set<string> {
  const ids = new Set<string>();
  for (const pass of passes) {
    for (const ref of pass.incomingGatePassIds ?? []) {
      if (ref?._id) ids.add(ref._id);
    }
  }
  return ids;
}

/**
 * Splits accounting data by variety: incoming rows are those linked from grading
 * passes of that variety; grading / summary use passes of that variety; farmer
 * seed uses gate-pass-level variety.
 */
export function buildAccountingReportVarietySections(
  filteredGradingPasses: GradingGatePass[],
  filteredIncomingPasses: IncomingGatePassByFarmerStorageLinkItem[],
  farmerSeedPasses: FarmerSeedGatePass[] | null | undefined,
  preferences: PreferencesData | null | undefined
): AccountingReportVarietySection[] {
  const seeds = farmerSeedPasses ?? [];
  const keySet = new Set<string>();
  for (const p of filteredGradingPasses) {
    keySet.add(normalizeAccountingVarietyKey(p.variety));
  }
  for (const p of filteredIncomingPasses) {
    keySet.add(normalizeAccountingVarietyKey(p.variety));
  }
  for (const p of seeds) {
    keySet.add(normalizeAccountingVarietyKey(p.variety));
  }

  const orderedKeys = sortVarietyKeys([...keySet]);
  const keysToRender = orderedKeys.length > 0 ? orderedKeys : [''];

  return keysToRender.map((varietyKey) => {
    const gradingForVariety = filteredGradingPasses.filter(
      (p) => normalizeAccountingVarietyKey(p.variety) === varietyKey
    );
    const linkedIncomingIds = incomingIdsLinkedFromGradings(gradingForVariety);
    const incomingForVariety = filteredIncomingPasses.filter((inc) =>
      linkedIncomingIds.has(inc._id)
    );
    const seedsForVariety = seeds.filter(
      (p) => normalizeAccountingVarietyKey(p.variety) === varietyKey
    );

    return {
      varietyKey,
      varietyLabel: displayAccountingVarietyLabel(varietyKey),
      gradingGatePassesForSummary: gradingForVariety,
      incomingRows: prepareDataForIncomingTable(incomingForVariety),
      gradingRows: prepareDataForGradingTable(gradingForVariety),
      summaryRows: prepareAccountingGradingSummary(
        gradingForVariety,
        preferences
      ).rows,
      farmerSeedRows: prepareDataForFarmerSeedTable(seedsForVariety),
    };
  });
}
