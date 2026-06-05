import type { NikasiGatePassReportDataRow } from '@/services/store-admin/nikasi-gate-pass/analytics/useGetNikasiGatePassReport';
import {
  getNikasiBagSizeQuantity,
  type NikasiReportDisplayRow,
} from './nikasi-report-flatten';

const AVERAGE_WEIGHT_TOTALS_DECIMALS = 2;

export type NikasiReportTotals = {
  bagColumnTotals: Record<string, number>;
  totalBagsIssued: number;
  netWeight: number;
  netPrecision: number;
  averageWeightPerBag: number | null;
  averagePrecision: number;
};

export function getDecimalPlaces(value: number): number {
  if (!Number.isFinite(value)) return 0;

  const asString = value.toString().toLowerCase();
  if (!asString.includes('e')) {
    return asString.includes('.') ? (asString.split('.')[1]?.length ?? 0) : 0;
  }

  const [base, exponentPart] = asString.split('e');
  const exponent = Number(exponentPart);
  const baseDecimals = base.includes('.')
    ? (base.split('.')[1]?.length ?? 0)
    : 0;

  if (!Number.isFinite(exponent)) return baseDecimals;
  if (exponent >= 0) return Math.max(0, baseDecimals - exponent);
  return baseDecimals + Math.abs(exponent);
}

export function formatIndianNumber(value: number, precision = 0): string {
  return value.toLocaleString('en-IN', {
    minimumFractionDigits: precision,
    maximumFractionDigits: precision,
  });
}

export function computeNikasiReportTotals(
  sourceRows: NikasiGatePassReportDataRow[],
  displayRows: NikasiReportDisplayRow[],
  bagSizeColumnIds: Iterable<string>
): NikasiReportTotals {
  const bagColumnTotals: Record<string, number> = {};

  for (const id of bagSizeColumnIds) {
    bagColumnTotals[id] = 0;
  }

  for (const row of displayRows) {
    for (const id of bagSizeColumnIds) {
      bagColumnTotals[id] += getNikasiBagSizeQuantity(row, id);
    }
  }

  let totalBagsIssued = 0;
  let netPrecision = 0;

  for (const row of sourceRows) {
    totalBagsIssued += Number(row.totalBagsIssued ?? 0);
    netPrecision = Math.max(
      netPrecision,
      getDecimalPlaces(Number(row.netWeight ?? 0))
    );
  }

  const factor = 10 ** netPrecision;
  let scaledNetSum = 0;

  for (const row of sourceRows) {
    const value = Number(row.netWeight ?? 0);
    scaledNetSum += Math.round(value * factor);
  }

  const netWeight = scaledNetSum / factor;
  const averageWeightPerBag =
    totalBagsIssued > 0
      ? Math.round(
          (netWeight / totalBagsIssued) * 10 ** AVERAGE_WEIGHT_TOTALS_DECIMALS
        ) /
        10 ** AVERAGE_WEIGHT_TOTALS_DECIMALS
      : null;
  const averagePrecision = AVERAGE_WEIGHT_TOTALS_DECIMALS;

  return {
    bagColumnTotals,
    totalBagsIssued,
    netWeight,
    netPrecision,
    averageWeightPerBag,
    averagePrecision,
  };
}

export function getNikasiTotalsCellValue(
  columnId: string,
  totals: NikasiReportTotals,
  bagSizeColumnIds: ReadonlySet<string>
): string {
  if (bagSizeColumnIds.has(columnId)) {
    const value = totals.bagColumnTotals[columnId] ?? 0;
    return value === 0 ? '' : formatIndianNumber(value, 0);
  }

  if (columnId === 'totalBagsIssued') {
    return formatIndianNumber(totals.totalBagsIssued, 0);
  }

  if (columnId === 'netWeight') {
    return formatIndianNumber(totals.netWeight, totals.netPrecision);
  }

  if (columnId === 'averageWeightPerBag') {
    return totals.averageWeightPerBag != null
      ? formatIndianNumber(totals.averageWeightPerBag, totals.averagePrecision)
      : '';
  }

  return '';
}
