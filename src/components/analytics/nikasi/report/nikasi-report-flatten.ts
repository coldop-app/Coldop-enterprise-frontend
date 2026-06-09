import { resolveBagSizeColumnId } from '@/lib/bag-size-columns';
import type {
  NikasiGatePassReportBagSize,
  NikasiGatePassReportDataRow,
} from '@/services/store-admin/nikasi-gate-pass/analytics/useGetNikasiGatePassReport';

export type NikasiBagSizeCellValue = {
  quantity: number;
  bagType: string;
};

export type NikasiReportBagFields = Record<string, NikasiBagSizeCellValue>;

export interface NikasiReportDisplayRow extends NikasiGatePassReportDataRow {
  gatePassId: string;
  varietyRowIndex: number;
  varietyRowSpan: number;
  bagSizeFields: NikasiReportBagFields;
  gatePassOriginalTotalBags: number;
  gatePassOriginalNetWeight: number;
  gatePassTotalBags: number;
  gatePassNetWeight: number;
  gatePassAverageWeightPerBag: number | null;
}

function orderedVarietyGroups(
  bags: NikasiGatePassReportBagSize[]
): Array<{ variety: string; lines: NikasiGatePassReportBagSize[] }> {
  const order: string[] = [];
  const map = new Map<string, NikasiGatePassReportBagSize[]>();

  for (const bag of bags) {
    const variety = (bag.variety ?? '').trim() || '-';
    if (!map.has(variety)) {
      order.push(variety);
      map.set(variety, []);
    }
    map.get(variety)!.push(bag);
  }

  return order.map((variety) => ({
    variety,
    lines: map.get(variety) ?? [],
  }));
}

function accumulateBagFields(
  lines: NikasiGatePassReportBagSize[]
): NikasiReportBagFields {
  const acc: NikasiReportBagFields = {};

  for (const line of lines) {
    const columnId = resolveBagSizeColumnId(String(line.size || ''));
    const quantity = Number(line.quantityIssued) || 0;
    const bagType = (line.bagType ?? '').trim();

    if (!acc[columnId]) {
      acc[columnId] = { quantity, bagType };
      continue;
    }

    acc[columnId].quantity += quantity;
    if (bagType && acc[columnId].bagType !== bagType) {
      const types = new Set(acc[columnId].bagType.split(' / ').filter(Boolean));
      types.add(bagType);
      acc[columnId].bagType = Array.from(types).join(' / ');
    }
  }

  return acc;
}

function sumBagFieldsQuantity(fields: NikasiReportBagFields): number {
  return Object.values(fields).reduce(
    (sum, cell) => sum + (Number(cell?.quantity) || 0),
    0
  );
}

function varietyGroupsFromRow(
  row: NikasiGatePassReportDataRow
): Array<{ variety: string; lines: NikasiGatePassReportBagSize[] }> {
  const bags = row.bagSizes ?? [];

  if (bags.length > 0) {
    return orderedVarietyGroups(bags);
  }

  if (row.variety) {
    const varieties = row.variety
      .split(',')
      .map((value) => value.trim())
      .filter(Boolean);

    if (varieties.length > 0) {
      return varieties.map((variety) => ({ variety, lines: [] }));
    }
  }

  return [{ variety: '-', lines: [] }];
}

export const NIKASI_WEIGHT_DECIMALS = 2;

export function roundNikasiWeight(value: number): number {
  if (!Number.isFinite(value)) return 0;
  const factor = 10 ** NIKASI_WEIGHT_DECIMALS;
  return Math.round(value * factor) / factor;
}

function computeGatePassAverageWeight(
  netWeight: number,
  totalBags: number,
  apiAverage?: number
): number | null {
  if (totalBags > 0 && netWeight > 0) {
    return roundNikasiWeight(netWeight / totalBags);
  }

  const average = Number(apiAverage ?? 0);
  return average > 0 ? roundNikasiWeight(average) : null;
}

export function flattenNikasiReportRows(
  rows: NikasiGatePassReportDataRow[]
): NikasiReportDisplayRow[] {
  const flattened: NikasiReportDisplayRow[] = [];

  for (const row of rows) {
    const groups = varietyGroupsFromRow(row);
    const span = groups.length;
    const gatePassTotalBags = groups.reduce(
      (sum, { lines }) =>
        sum + sumBagFieldsQuantity(accumulateBagFields(lines)),
      0
    );
    const gatePassOriginalNetWeight = Number(row.netWeight ?? 0);
    const gatePassAverageWeightPerBag = computeGatePassAverageWeight(
      gatePassOriginalNetWeight,
      gatePassTotalBags,
      row.averageWeightPerBag
    );

    groups.forEach(({ variety, lines }, index) => {
      flattened.push({
        ...row,
        id: `${row.id}::${variety}::${index}`,
        gatePassId: row.id,
        variety,
        bagSizes: lines,
        bagSizeFields: accumulateBagFields(lines),
        varietyRowIndex: index,
        varietyRowSpan: span,
        gatePassOriginalTotalBags: gatePassTotalBags,
        gatePassOriginalNetWeight,
        gatePassTotalBags,
        gatePassNetWeight: gatePassOriginalNetWeight,
        gatePassAverageWeightPerBag,
        totalBagsIssued: gatePassTotalBags,
        netWeight: gatePassOriginalNetWeight,
        averageWeightPerBag: gatePassAverageWeightPerBag ?? undefined,
      });
    });
  }

  return flattened;
}

/** Reassigns varietyRowIndex/varietyRowSpan after column filters remove sub-rows. */
export function recomputeNikasiVarietyRowSpans(
  rows: NikasiReportDisplayRow[]
): NikasiReportDisplayRow[] {
  if (rows.length === 0) return rows;

  const blocksByGatePassId = new Map<string, NikasiReportDisplayRow[]>();
  const gatePassOrder: string[] = [];

  for (const row of rows) {
    if (!blocksByGatePassId.has(row.gatePassId)) {
      gatePassOrder.push(row.gatePassId);
      blocksByGatePassId.set(row.gatePassId, []);
    }
    blocksByGatePassId.get(row.gatePassId)!.push(row);
  }

  const adjusted: NikasiReportDisplayRow[] = [];

  for (const gatePassId of gatePassOrder) {
    const block = blocksByGatePassId.get(gatePassId)!;
    block.sort((a, b) => a.varietyRowIndex - b.varietyRowIndex);

    const span = block.length;
    const gatePassTotalBags = block.reduce(
      (sum, row) => sum + getNikasiVarietyRowTotalBags(row),
      0
    );

    block.forEach((row, index) => {
      adjusted.push({
        ...row,
        varietyRowIndex: index,
        varietyRowSpan: span,
        gatePassTotalBags,
      });
    });
  }

  return adjusted;
}

/** Sets gate-pass metrics from filtered/visible sub-rows only (not expanded blocks). */
export function applyVisibleGatePassMetrics(
  rows: NikasiReportDisplayRow[],
  visibleRows: NikasiReportDisplayRow[]
): NikasiReportDisplayRow[] {
  const bagsByGatePassId = new Map<string, number>();
  const netByGatePassId = new Map<string, number>();
  const factor = 10 ** NIKASI_WEIGHT_DECIMALS;

  for (const row of visibleRows) {
    const gatePassId = row.gatePassId;
    bagsByGatePassId.set(
      gatePassId,
      (bagsByGatePassId.get(gatePassId) ?? 0) +
        getNikasiVarietyRowTotalBags(row)
    );

    const scaledNet =
      (netByGatePassId.get(gatePassId) ?? 0) +
      Math.round(getNikasiVarietyRowNetWeight(row) * factor);
    netByGatePassId.set(gatePassId, scaledNet);
  }

  return rows.map((row) => {
    const visibleBags = bagsByGatePassId.get(row.gatePassId) ?? 0;
    const visibleNet = (netByGatePassId.get(row.gatePassId) ?? 0) / factor;
    const visibleAverage =
      visibleBags > 0 ? roundNikasiWeight(visibleNet / visibleBags) : null;

    return {
      ...row,
      gatePassTotalBags: visibleBags,
      totalBagsIssued: visibleBags,
      gatePassNetWeight: visibleNet,
      netWeight: visibleNet,
      gatePassAverageWeightPerBag: visibleAverage,
      averageWeightPerBag: visibleAverage ?? undefined,
    };
  });
}

/** @deprecated Use applyVisibleGatePassMetrics */
export const applyVisibleGatePassTotalBags = applyVisibleGatePassMetrics;

export function getNikasiBagSizeQuantity(
  row: NikasiReportDisplayRow,
  columnId: string
): number {
  return row.bagSizeFields[columnId]?.quantity ?? 0;
}

/** Bags issued for this variety sub-row only (sum of bag-size columns). */
export function getNikasiVarietyRowTotalBags(
  row: NikasiReportDisplayRow
): number {
  return sumBagFieldsQuantity(row.bagSizeFields);
}

/** Total bags issued across all visible variety sub-rows for this gate pass. */
export function getNikasiGatePassTotalBags(
  row: NikasiReportDisplayRow
): number {
  return row.gatePassTotalBags;
}

/** Net weight across all visible variety sub-rows for this gate pass. */
export function getNikasiGatePassNetWeight(
  row: NikasiReportDisplayRow
): number {
  return row.gatePassNetWeight;
}

/** Average weight per bag across all visible variety sub-rows for this gate pass. */
export function getNikasiGatePassAverageWeight(
  row: NikasiReportDisplayRow
): number | null {
  return row.gatePassAverageWeightPerBag;
}

/** Net weight allocated to this variety row (proportional to original gate-pass totals). */
export function getNikasiVarietyRowNetWeight(
  row: NikasiReportDisplayRow
): number {
  const varietyBags = getNikasiVarietyRowTotalBags(row);
  if (varietyBags <= 0) return 0;

  const originalBags = row.gatePassOriginalTotalBags;
  const originalNet = row.gatePassOriginalNetWeight;

  if (originalBags > 0 && originalNet > 0) {
    return roundNikasiWeight((varietyBags / originalBags) * originalNet);
  }

  const average = Number(row.averageWeightPerBag ?? 0);
  return average > 0 ? roundNikasiWeight(varietyBags * average) : 0;
}

export function getNikasiVarietyRowAverageWeight(
  row: NikasiReportDisplayRow
): number | null {
  const varietyBags = getNikasiVarietyRowTotalBags(row);
  if (varietyBags <= 0) return null;

  const varietyNet = getNikasiVarietyRowNetWeight(row);
  return roundNikasiWeight(varietyNet / varietyBags);
}
