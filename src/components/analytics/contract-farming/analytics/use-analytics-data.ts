import * as React from 'react';

import {
  AVG_QUINTAL_PER_ACRE_COLUMN_ID,
  BUY_BACK_AMOUNT_COLUMN_ID,
  NET_AMOUNT_COLUMN_ID,
  NET_AMOUNT_PER_ACRE_COLUMN_ID,
  OUTPUT_PERCENTAGE_COLUMN_ID,
  SEED_AMOUNT_COLUMN_ID,
  TOTAL_GRADED_BAGS_COLUMN_ID,
  VARIETY_LEVEL_COLUMN_PREFIX,
  VARIETY_LEVEL_PERCENT_COLUMN_PREFIX,
  WASTAGE_KG_COLUMN_ID,
} from '../report/columns';

function num(v: unknown, fallback = 0): number {
  const n = Number(v ?? fallback);
  return Number.isFinite(n) ? n : fallback;
}

function parseGradeKeysFromRow(
  row: Record<string, string | number | null>
): string[] {
  const labels: string[] = [];
  const seen = new Set<string>();
  for (const k of Object.keys(row)) {
    if (!k.startsWith('grade_weight_pct_')) continue;
    const label = k.slice('grade_weight_pct_'.length);
    if (!label || seen.has(label)) continue;
    seen.add(label);
    labels.push(label);
  }
  return labels;
}

export function findBelow40Label(
  gradeKeys: readonly string[]
): string | undefined {
  return gradeKeys.find(
    (l) =>
      l.toLowerCase().includes('below') && l.replace(/\s/g, '').includes('40')
  );
}

function findAbove50Label(gradeKeys: readonly string[]): string | undefined {
  return gradeKeys.find(
    (l) =>
      l.toLowerCase().includes('above') && l.replace(/\s/g, '').includes('50')
  );
}

export interface DedupedFarmerRow {
  farmerMobile: string;
  farmer: string;
  farmerLabel14: string;
  address: string;
  variety: string;
  generation: string;
  familyKey: number;
  qty: number;
  acres: number;
  amount: number;
  totalAfterGrading: number;
  totalWastageKg: number;
  avgQuintalPerAcre: number;
  avgOutputPct: number;
  buyBackAmount: number | null;
  netAmount: number | null;
  netAmountPerAcre: number | null;
  /** Normalised grade weight % (sum 100). */
  gradePcts: Record<string, number>;
}

export interface VarietyGroup {
  variety: string;
  avgQuintalPerAcre: number;
  avgOutputPct: number;
  avgWastageKg: number;
  avgBelow40Pct: number;
  avgAbove50Pct: number;
}

export interface AnalyticsKpis {
  totalFarmers: number;
  totalAcres: number;
  totalQty: number;
  avgOutputPct: number;
  totalWastageKg: number;
  totalAmount: number;
}

export function useAnalyticsData(
  rows: Record<string, string | number | null>[]
) {
  const gradeKeys = React.useMemo(() => {
    for (const row of rows) {
      const fromRow = parseGradeKeysFromRow(row);
      if (fromRow.length > 0) return fromRow;
    }
    return [] as string[];
  }, [rows]);

  const farmerRows = React.useMemo((): DedupedFarmerRow[] => {
    if (rows.length === 0) return [];

    const byMobile = new Map<
      string,
      {
        rows: Record<string, string | number | null>[];
      }
    >();

    for (const row of rows) {
      const mobile = String(row.farmerMobile ?? '');
      if (!byMobile.has(mobile)) {
        byMobile.set(mobile, { rows: [] });
      }
      byMobile.get(mobile)!.rows.push(row);
    }

    const pctPrefix = VARIETY_LEVEL_PERCENT_COLUMN_PREFIX;

    const out: DedupedFarmerRow[] = [];

    for (const [farmerMobile, { rows: group }] of byMobile) {
      const first = group[0]!;
      const nRows = group.length;
      let qty = 0;
      let acres = 0;
      let amount = 0;
      let totalAfterGrading = 0;
      let totalWastageKg = 0;
      let sumAvgQuintal = 0;
      let sumOutputPct = 0;
      let buyBackSum = 0;
      let buyBackAny = false;
      let netSum = 0;
      let netCount = 0;
      let netPerAcreSum = 0;
      let netPerAcreCount = 0;

      const summedPcts: Record<string, number> = {};
      for (const label of gradeKeys) {
        summedPcts[label] = 0;
      }

      for (const r of group) {
        qty += num(r.qty);
        acres += num(r.acres);
        amount += num(r[SEED_AMOUNT_COLUMN_ID]);
        totalAfterGrading += num(r[TOTAL_GRADED_BAGS_COLUMN_ID]);
        totalWastageKg += num(r[WASTAGE_KG_COLUMN_ID]);
        sumAvgQuintal += num(r[AVG_QUINTAL_PER_ACRE_COLUMN_ID]);
        sumOutputPct += num(r[OUTPUT_PERCENTAGE_COLUMN_ID]);

        const bb = r[BUY_BACK_AMOUNT_COLUMN_ID];
        if (bb !== null && bb !== undefined && bb !== '') {
          buyBackSum += num(bb);
          buyBackAny = true;
        }

        const net = r[NET_AMOUNT_COLUMN_ID];
        if (net !== null && net !== undefined && net !== '') {
          netSum += num(net);
          netCount += 1;
        }

        const npa = r[NET_AMOUNT_PER_ACRE_COLUMN_ID];
        if (npa !== null && npa !== undefined && npa !== '') {
          netPerAcreSum += num(npa);
          netPerAcreCount += 1;
        }

        for (const label of gradeKeys) {
          summedPcts[label] =
            (summedPcts[label] ?? 0) + num(r[`${pctPrefix}${label}`]);
        }
      }

      const pctTotal = gradeKeys.reduce((s, l) => s + (summedPcts[l] ?? 0), 0);
      const gradePcts: Record<string, number> = {};
      for (const label of gradeKeys) {
        const raw = summedPcts[label] ?? 0;
        gradePcts[label] = pctTotal > 0 ? (raw / pctTotal) * 100 : 0;
      }

      const farmer = String(first.farmer ?? '');
      const farmerLabel14 =
        farmer.length > 14 ? `${farmer.slice(0, 14)}…` : farmer;

      out.push({
        farmerMobile,
        farmer,
        farmerLabel14,
        address: String(first.address ?? ''),
        variety: String(first.variety ?? ''),
        generation: String(first.generation ?? ''),
        familyKey: num(first.familyKey),
        qty,
        acres,
        amount,
        totalAfterGrading,
        totalWastageKg,
        avgQuintalPerAcre: nRows > 0 ? sumAvgQuintal / nRows : 0,
        avgOutputPct: nRows > 0 ? sumOutputPct / nRows : 0,
        buyBackAmount: buyBackAny ? buyBackSum : null,
        netAmount: netCount > 0 ? netSum : null,
        netAmountPerAcre:
          netPerAcreCount > 0 ? netPerAcreSum / netPerAcreCount : null,
        gradePcts,
      });
    }

    return out;
  }, [rows, gradeKeys]);

  const varietyGroups = React.useMemo((): VarietyGroup[] => {
    if (rows.length === 0) return [];

    const belowLabel = findBelow40Label(gradeKeys);
    const aboveLabel = findAbove50Label(gradeKeys);
    const pctPrefix = VARIETY_LEVEL_PERCENT_COLUMN_PREFIX;

    const byVariety = new Map<
      string,
      {
        sumQuintal: number;
        sumOutput: number;
        sumWastage: number;
        sumBelow: number;
        sumAbove: number;
        nBelow: number;
        nAbove: number;
        n: number;
      }
    >();

    for (const row of rows) {
      const v = String(row.variety ?? '');
      if (!byVariety.has(v)) {
        byVariety.set(v, {
          sumQuintal: 0,
          sumOutput: 0,
          sumWastage: 0,
          sumBelow: 0,
          sumAbove: 0,
          nBelow: 0,
          nAbove: 0,
          n: 0,
        });
      }
      const acc = byVariety.get(v)!;
      acc.n += 1;
      acc.sumQuintal += num(row[AVG_QUINTAL_PER_ACRE_COLUMN_ID]);
      acc.sumOutput += num(row[OUTPUT_PERCENTAGE_COLUMN_ID]);
      acc.sumWastage += num(row[WASTAGE_KG_COLUMN_ID]);
      if (belowLabel) {
        const b = num(row[`${pctPrefix}${belowLabel}`]);
        acc.sumBelow += b;
        acc.nBelow += 1;
      }
      if (aboveLabel) {
        const a = num(row[`${pctPrefix}${aboveLabel}`]);
        acc.sumAbove += a;
        acc.nAbove += 1;
      }
    }

    return Array.from(byVariety.entries()).map(([variety, acc]) => ({
      variety,
      avgQuintalPerAcre: acc.n > 0 ? acc.sumQuintal / acc.n : 0,
      avgOutputPct: acc.n > 0 ? acc.sumOutput / acc.n : 0,
      avgWastageKg: acc.n > 0 ? acc.sumWastage / acc.n : 0,
      avgBelow40Pct: acc.nBelow > 0 ? acc.sumBelow / acc.nBelow : 0,
      avgAbove50Pct: acc.nAbove > 0 ? acc.sumAbove / acc.nAbove : 0,
    }));
  }, [rows, gradeKeys]);

  const aggregateGradeDistribution = React.useMemo(() => {
    const bagPrefix = VARIETY_LEVEL_COLUMN_PREFIX;
    const sums: Record<string, number> = {};
    for (const label of gradeKeys) {
      sums[label] = 0;
    }
    for (const row of rows) {
      for (const label of gradeKeys) {
        const key = `${bagPrefix}${label}`;
        sums[label] = (sums[label] ?? 0) + num(row[key]);
      }
    }
    const total = Object.values(sums).reduce((a, b) => a + b, 0);
    return gradeKeys.map((label) => ({
      label,
      value: total > 0 ? ((sums[label] ?? 0) / total) * 100 : 0,
    }));
  }, [rows, gradeKeys]);

  const kpis = React.useMemo((): AnalyticsKpis => {
    const mobiles = new Set(rows.map((r) => String(r.farmerMobile ?? '')));
    let totalAcres = 0;
    let totalQty = 0;
    let sumOutput = 0;
    let totalWastageKg = 0;
    let totalAmount = 0;
    for (const row of rows) {
      totalAcres += num(row.acres);
      totalQty += num(row.qty);
      sumOutput += num(row[OUTPUT_PERCENTAGE_COLUMN_ID]);
      totalWastageKg += num(row[WASTAGE_KG_COLUMN_ID]);
      totalAmount += num(row[SEED_AMOUNT_COLUMN_ID]);
    }
    return {
      totalFarmers: mobiles.size,
      totalAcres,
      totalQty,
      avgOutputPct: rows.length > 0 ? sumOutput / rows.length : 0,
      totalWastageKg,
      totalAmount,
    };
  }, [rows]);

  return {
    gradeKeys,
    farmerRows,
    varietyGroups,
    aggregateGradeDistribution,
    kpis,
  } as const;
}
