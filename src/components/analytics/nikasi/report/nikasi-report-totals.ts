import {
  getNikasiBagSizeQuantity,
  getNikasiVarietyRowNetWeight,
  getNikasiVarietyRowTotalBags,
  NIKASI_WEIGHT_DECIMALS,
  roundNikasiWeight,
  type NikasiReportDisplayRow,
} from './nikasi-report-flatten';

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
  displayRows: NikasiReportDisplayRow[],
  bagSizeColumnIds: Iterable<string>
): NikasiReportTotals {
  const bagColumnTotals: Record<string, number> = {};

  for (const id of bagSizeColumnIds) {
    bagColumnTotals[id] = 0;
  }

  let totalBagsIssued = 0;

  for (const row of displayRows) {
    for (const id of bagSizeColumnIds) {
      bagColumnTotals[id] += getNikasiBagSizeQuantity(row, id);
    }

    totalBagsIssued += getNikasiVarietyRowTotalBags(row);
  }

  const factor = 10 ** NIKASI_WEIGHT_DECIMALS;
  let scaledNetSum = 0;

  for (const row of displayRows) {
    const value = getNikasiVarietyRowNetWeight(row);
    scaledNetSum += Math.round(value * factor);
  }

  const netWeight = scaledNetSum / factor;
  const averageWeightPerBag =
    totalBagsIssued > 0 ? roundNikasiWeight(netWeight / totalBagsIssued) : null;
  const netPrecision = NIKASI_WEIGHT_DECIMALS;
  const averagePrecision = NIKASI_WEIGHT_DECIMALS;

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
