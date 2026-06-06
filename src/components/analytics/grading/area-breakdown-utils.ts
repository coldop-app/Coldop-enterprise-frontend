import {
  canonicalSizeLabel,
  normalizeSizeKey,
  sortSizeLabels,
} from '@/components/analytics/shed/shed-report-utils';
import type { AreaBreakdownFarmerEntry } from '@/types/analytics';

export type FarmerBreakdownRow = {
  id: string;
  name: string;
  mobileNumber: string;
  accountNumber: number;
  address: string;
  sizeValues: Record<string, number>;
  total: number;
};

export type SizeDistributionSlice = {
  name: string;
  value: number;
  fill: string;
  percentage: number;
};

export function formatBreakdownNumber(value: number): string {
  return value.toLocaleString('en-IN');
}

export function formatAccountNumber(value: number): string {
  if (!Number.isFinite(value)) return '-';
  if (Number.isInteger(value)) return String(value);
  return value.toLocaleString('en-IN', { maximumFractionDigits: 1 });
}

export function resolveSizeFilterKey(
  sizeKeys: string[],
  sizeFilter?: string
): string | undefined {
  const normalizedFilter = sizeFilter ? normalizeSizeKey(sizeFilter) : '';
  if (!normalizedFilter) return undefined;

  return sizeKeys.find((key) => normalizeSizeKey(key) === normalizedFilter);
}

export function collectSizeKeys(farmers: AreaBreakdownFarmerEntry[]): string[] {
  const rawLabels: string[] = [];

  for (const entry of farmers) {
    for (const variety of entry.varieties ?? []) {
      for (const size of variety.sizes ?? []) {
        if (size.size) rawLabels.push(size.size);
      }
    }
  }

  return sortSizeLabels(rawLabels);
}

export function getFarmerSizeValues(
  entry: AreaBreakdownFarmerEntry,
  sizeKeys: string[]
): Record<string, number> {
  const values = Object.fromEntries(sizeKeys.map((key) => [key, 0]));

  for (const variety of entry.varieties ?? []) {
    for (const size of variety.sizes ?? []) {
      const key = canonicalSizeLabel(size.size);
      if (!(key in values)) continue;
      values[key] += Number(size.stock ?? 0);
    }
  }

  return values;
}

export function buildFarmerRows(
  farmers: AreaBreakdownFarmerEntry[],
  sizeKeys: string[]
): FarmerBreakdownRow[] {
  return farmers
    .map((entry) => {
      const sizeValues = getFarmerSizeValues(entry, sizeKeys);
      const total = sizeKeys.reduce(
        (sum, key) => sum + Number(sizeValues[key] ?? 0),
        0
      );

      return {
        id: entry.farmer.id,
        name: entry.farmer.name,
        mobileNumber: entry.farmer.mobileNumber,
        accountNumber: entry.farmer.accountNumber,
        address: entry.farmer.address,
        sizeValues,
        total,
      };
    })
    .sort((a, b) => {
      if (a.accountNumber !== b.accountNumber) {
        return a.accountNumber - b.accountNumber;
      }
      return a.name.localeCompare(b.name);
    });
}

export function aggregateSizeTotals(
  farmerRows: FarmerBreakdownRow[],
  sizeKeys: string[]
): Record<string, number> {
  const totals = Object.fromEntries(sizeKeys.map((key) => [key, 0]));

  for (const row of farmerRows) {
    for (const key of sizeKeys) {
      totals[key] += Number(row.sizeValues[key] ?? 0);
    }
  }

  return totals;
}

export function buildSizeDistributionSlices(
  sizeTotals: Record<string, number>,
  sizeKeys: string[],
  palette: readonly string[]
): SizeDistributionSlice[] {
  const slices: SizeDistributionSlice[] = [];
  let total = 0;

  for (const key of sizeKeys) {
    const value = Number(sizeTotals[key] ?? 0);
    if (value <= 0) continue;
    total += value;
    slices.push({
      name: key,
      value,
      fill: palette[slices.length % palette.length],
      percentage: 0,
    });
  }

  return slices.map((slice) => ({
    ...slice,
    percentage: total > 0 ? (slice.value / total) * 100 : 0,
  }));
}
