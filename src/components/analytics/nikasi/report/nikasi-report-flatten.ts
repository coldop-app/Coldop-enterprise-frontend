import { resolveBagSizeColumnId } from '@/lib/bag-size-columns';
import type { NikasiGatePassReportRow } from '@/services/store-admin/nikasi-gate-pass/analytics/useGetNikasiGatePassReport';
import type { NikasiGatePassBagSize } from '@/services/store-admin/nikasi-gate-pass/useGetNikasiGatePasses';
import {
  createEmptyNikasiBagFields,
  getDecimalPlaces,
  type NikasiReportBagFields,
  type NikasiReportRow,
} from './columns';

function totalBagsIssued(bagSize?: NikasiGatePassBagSize[]): number {
  if (!bagSize?.length) return 0;
  return bagSize.reduce((sum, b) => sum + (Number(b.quantityIssued) || 0), 0);
}

/** Varieties in first-seen order within `bagSize`. */
function orderedVarietyGroups(
  bags: NikasiGatePassBagSize[]
): Array<{ variety: string; lines: NikasiGatePassBagSize[] }> {
  const order: string[] = [];
  const map = new Map<string, NikasiGatePassBagSize[]>();
  for (const b of bags) {
    const variety = (b.variety ?? '').trim() || '-';
    if (!map.has(variety)) {
      order.push(variety);
      map.set(variety, []);
    }
    map.get(variety)!.push(b);
  }
  return order.map((variety) => ({
    variety,
    lines: map.get(variety) ?? [],
  }));
}

function accumulateBagFields(
  lines: NikasiGatePassBagSize[]
): NikasiReportBagFields {
  const acc = createEmptyNikasiBagFields();
  for (const line of lines) {
    const col = resolveBagSizeColumnId(String(line.size || ''));
    if (!col) continue;
    const q = Number(line.quantityIssued) || 0;
    acc[col as keyof NikasiReportBagFields] += q;
  }
  return acc;
}

export type NikasiReportTableRowContext = {
  toDisplayDate: (value?: string) => string;
  toSortableDateValue: (value?: string) => number;
};

export function flattenNikasiGatePassToRows(
  item: NikasiGatePassReportRow,
  ctx: NikasiReportTableRowContext
): NikasiReportRow[] {
  const fsl = item.farmerStorageLinkId;
  const farmer = fsl?.farmerId;
  const dispatch = item.dispatchLedgerId;
  const manual = item.manualGatePassNumber;
  const manualStr =
    manual !== undefined && manual !== null && String(manual) !== ''
      ? String(manual)
      : '-';

  const net = Number(item.netWeight ?? 0);
  const netPrecision = getDecimalPlaces(net);
  const avg = Number(item.averageWeightPerBag ?? 0);
  const avgPrecision = getDecimalPlaces(avg);

  const storageLabel =
    fsl?.accountNumber !== undefined && fsl?.accountNumber !== null
      ? String(fsl.accountNumber)
      : '-';

  const bagsTotal = totalBagsIssued(item.bagSize);
  const bags = item.bagSize ?? [];

  const base = {
    gatePassNo: item.gatePassNo,
    manualGatePassNumber: manualStr,
    date: ctx.toDisplayDate(item.date),
    dateSortValue: ctx.toSortableDateValue(item.date),
    farmerMobile: farmer?.mobileNumber ?? '-',
    storageAccountLabel: storageLabel,
    linkedByName: fsl?.linkedById?.name ?? '-',
    location: dispatch?.name ?? '-',
    dispatchLedgerMobile: dispatch?.mobileNumber ?? '-',
    createdByName: item.createdBy?.name ?? '-',
    nikasiFrom: item.from ?? '-',
    nikasiTo: item.to ?? '-',
    truckNumber: item.truckNumber ?? '-',
    bagsReceived: bagsTotal,
    netWeightKg: net,
    netWeightPrecision: netPrecision,
    averageWeightPerBag: avg,
    averageWeightPrecision: avgPrecision,
    remarks: item.remarks ?? '-',
    isInternalTransferLabel: item.isInternalTransfer ? 'Yes' : 'No',
    createdAt: ctx.toDisplayDate(item.createdAt),
    updatedAt: ctx.toDisplayDate(item.updatedAt),
  };

  if (!bags.length) {
    return [
      {
        ...base,
        ...createEmptyNikasiBagFields(),
        id: `${item._id}::`,
        gatePassId: item._id,
        variety: '-',
        varietyRowIndex: 0,
        varietyRowSpan: 1,
      },
    ];
  }

  const groups = orderedVarietyGroups(bags);
  const span = groups.length;

  return groups.map(({ variety, lines }, index) => ({
    ...base,
    ...accumulateBagFields(lines),
    id: `${item._id}::${variety}`,
    gatePassId: item._id,
    variety,
    varietyRowIndex: index,
    varietyRowSpan: span,
  }));
}
