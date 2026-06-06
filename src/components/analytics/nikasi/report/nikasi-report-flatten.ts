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

export function flattenNikasiReportRows(
  rows: NikasiGatePassReportDataRow[]
): NikasiReportDisplayRow[] {
  const flattened: NikasiReportDisplayRow[] = [];

  for (const row of rows) {
    const groups = varietyGroupsFromRow(row);
    const span = groups.length;

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
    block.forEach((row, index) => {
      adjusted.push({
        ...row,
        varietyRowIndex: index,
        varietyRowSpan: span,
      });
    });
  }

  return adjusted;
}

export function getNikasiBagSizeQuantity(
  row: NikasiReportDisplayRow,
  columnId: string
): number {
  return row.bagSizeFields[columnId]?.quantity ?? 0;
}
