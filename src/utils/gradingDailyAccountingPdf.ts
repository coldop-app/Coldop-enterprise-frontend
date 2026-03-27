import { formatVoucherDate } from '@/components/daybook/vouchers/format-date';
import {
  GRADING_SIZES,
  JUTE_BAG_WEIGHT,
} from '@/components/forms/grading/constants';
import type {
  FarmerReportPdfSnapshot,
  FarmerReportPdfRow,
} from '@/components/pdf/people/farmer-report-pdf-types';
import type { StockLedgerRow } from '@/components/pdf/shared/stockLedgerTypes';
import type {
  GradingGatePassReportData,
  GradingGatePassReportItem,
} from '@/types/analytics';

const ACCOUNTING_DAILY_INCOMING_VISIBLE_COLUMN_IDS = [
  'systemIncomingNo',
  'manualIncomingNo',
  'incomingDate',
  'store',
  'truckNumber',
  'variety',
  'bagsReceived',
  'weightSlipNo',
  'grossWeightKg',
  'tareWeightKg',
  'netWeightKg',
  'lessBardanaKg',
  'actualWeightKg',
] as const satisfies readonly string[];

type FlatGradingReportItem = {
  pass: GradingGatePassReportItem;
  farmerNameFallback?: string;
};

function flattenGradingReportData(
  data: GradingGatePassReportData
): FlatGradingReportItem[] {
  const out: FlatGradingReportItem[] = [];
  for (const entry of data as unknown as Array<Record<string, unknown>>) {
    if (
      entry != null &&
      typeof entry === 'object' &&
      'gatePasses' in entry &&
      Array.isArray((entry as { gatePasses: unknown }).gatePasses)
    ) {
      const farmerNameFallback =
        'farmer' in entry &&
        entry.farmer != null &&
        typeof entry.farmer === 'object' &&
        'name' in (entry.farmer as Record<string, unknown>)
          ? String((entry.farmer as Record<string, unknown>).name ?? '')
          : undefined;

      for (const pass of (entry as { gatePasses: GradingGatePassReportItem[] })
        .gatePasses) {
        out.push({ pass, farmerNameFallback: farmerNameFallback || undefined });
      }
      continue;
    }

    if (
      entry != null &&
      typeof entry === 'object' &&
      'farmers' in entry &&
      Array.isArray((entry as { farmers: unknown }).farmers)
    ) {
      const farmerGroups = (entry as { farmers?: unknown }).farmers;
      if (!Array.isArray(farmerGroups)) continue;

      for (const farmerGroup of farmerGroups) {
        const groupObj = farmerGroup as {
          farmer?: { name?: unknown };
          gatePasses?: GradingGatePassReportItem[];
        };

        const farmerNameFallback =
          groupObj.farmer?.name != null
            ? String(groupObj.farmer.name)
            : undefined;

        for (const pass of groupObj.gatePasses ?? []) {
          out.push({
            pass,
            farmerNameFallback: farmerNameFallback || undefined,
          });
        }
      }
      continue;
    }

    out.push({ pass: entry as GradingGatePassReportItem });
  }

  return out;
}

function getFarmerNameFromGradingPass(
  pass: GradingGatePassReportItem,
  farmerNameFallback?: string
): string {
  const directFarmerName =
    pass.farmerStorageLink?.farmerId?.name ??
    (() => {
      const incoming = pass.incomingGatePassId as unknown;
      if (
        incoming != null &&
        typeof incoming === 'object' &&
        'farmerStorageLinkId' in incoming
      ) {
        const typedIncoming = incoming as {
          farmerStorageLinkId?: { farmerId?: { name?: string } };
        };
        return typedIncoming.farmerStorageLinkId?.farmerId?.name ?? '';
      }
      return '';
    })();

  if (directFarmerName && directFarmerName !== '—') return directFarmerName;
  return farmerNameFallback ?? '—';
}

function gradingReportItemToStockLedgerRow(
  pass: GradingGatePassReportItem,
  serialNo: number,
  farmerNameFallback?: string
): StockLedgerRow {
  type Incoming = {
    date?: string;
    gatePassNo?: number | string;
    manualGatePassNumber?: number | string;
    truckNumber?: string | number;
    bagsReceived?: number;
    grossWeightKg?: number;
    tareWeightKg?: number;
    netWeightKg?: number;
    weightSlip?: {
      grossWeightKg?: number;
      tareWeightKg?: number;
      slipNumber?: string;
    };
  };

  const inc = pass.incomingGatePassId as unknown as Incoming;

  const incomingDate = typeof inc.date === 'string' ? inc.date : undefined;

  const grossWeightKg: number | undefined =
    typeof inc.grossWeightKg === 'number'
      ? inc.grossWeightKg
      : inc.weightSlip?.grossWeightKg;

  const tareWeightKg: number | undefined =
    typeof inc.tareWeightKg === 'number'
      ? inc.tareWeightKg
      : inc.weightSlip?.tareWeightKg;

  const netWeightKg: number | undefined =
    typeof inc.netWeightKg === 'number'
      ? inc.netWeightKg
      : grossWeightKg != null && tareWeightKg != null
        ? grossWeightKg - tareWeightKg
        : undefined;

  const bagsReceived: number =
    typeof inc.bagsReceived === 'number'
      ? inc.bagsReceived
      : pass.orderDetails?.length
        ? pass.orderDetails.reduce(
            (sum, d) => sum + (d.initialQuantity ?? d.currentQuantity ?? 0),
            0
          )
        : 0;

  const postGradingBags = pass.orderDetails?.length
    ? pass.orderDetails.reduce(
        (sum, d) => sum + (d.initialQuantity ?? d.currentQuantity ?? 0),
        0
      )
    : 0;

  const sizeBagsJute: Record<string, number> = {};
  const sizeBagsLeno: Record<string, number> = {};
  const sizeWeightPerBagJute: Record<string, number> = {};
  const sizeWeightPerBagLeno: Record<string, number> = {};
  for (const size of GRADING_SIZES) {
    sizeBagsJute[size] = 0;
    sizeBagsLeno[size] = 0;
  }

  if (pass.orderDetails?.length) {
    for (const od of pass.orderDetails) {
      const size = od.size;
      const qty = od.initialQuantity ?? od.currentQuantity ?? 0;
      const wt = od.weightPerBagKg ?? 0;
      const isLeno = od.bagType?.toUpperCase() === 'LENO';
      if (GRADING_SIZES.includes(size as (typeof GRADING_SIZES)[number])) {
        if (isLeno) {
          sizeBagsLeno[size] = (sizeBagsLeno[size] ?? 0) + qty;
          sizeWeightPerBagLeno[size] = wt;
        } else {
          sizeBagsJute[size] = (sizeBagsJute[size] ?? 0) + qty;
          sizeWeightPerBagJute[size] = wt;
        }
      }
    }
  }

  const hasJute = Object.values(sizeBagsJute).some((v) => v > 0);
  const hasLeno = Object.values(sizeBagsLeno).some((v) => v > 0);

  return {
    serialNo,
    date: incomingDate,
    incomingGatePassNo: inc.gatePassNo ?? '—',
    manualIncomingVoucherNo: inc.manualGatePassNumber ?? undefined,
    gradingGatePassNo: pass.gatePassNo,
    manualGradingGatePassNo: pass.manualGatePassNumber,
    gradingGatePassDate: pass.date,
    store: getFarmerNameFromGradingPass(pass, farmerNameFallback),
    truckNumber: inc.truckNumber,
    bagsReceived,
    grossWeightKg,
    tareWeightKg,
    netWeightKg,
    postGradingBags: postGradingBags > 0 ? postGradingBags : undefined,
    variety: pass.variety ?? undefined,
    sizeBagsJute: hasJute ? sizeBagsJute : undefined,
    sizeBagsLeno: hasLeno ? sizeBagsLeno : undefined,
    sizeWeightPerBagJute: hasJute ? sizeWeightPerBagJute : undefined,
    sizeWeightPerBagLeno: hasLeno ? sizeWeightPerBagLeno : undefined,
    weightSlipNumber: inc.weightSlip?.slipNumber,
  };
}

function buildAccountingDailySnapshot(params: {
  companyName: string;
  dateRangeLabel: string;
  reportTitle: string;
  groupByVariety: boolean;
  stockLedgerRows: StockLedgerRow[];
}): FarmerReportPdfSnapshot {
  const { dateRangeLabel, reportTitle, groupByVariety, stockLedgerRows } =
    params;

  const visibleColumnIds = [...ACCOUNTING_DAILY_INCOMING_VISIBLE_COLUMN_IDS];
  const getVarietyValue = (row: StockLedgerRow) => row.variety ?? '—';

  const rows: FarmerReportPdfRow[] = [];

  if (!groupByVariety) {
    for (const row of stockLedgerRows) {
      const variety = getVarietyValue(row);
      const bags = row.bagsReceived ?? 0;
      const lessBardanaKg = Math.round(bags * JUTE_BAG_WEIGHT * 10) / 10;
      const actualWeightKg =
        row.netWeightKg != null
          ? Math.round((row.netWeightKg - lessBardanaKg) * 10) / 10
          : undefined;

      rows.push({
        type: 'data',
        cells: {
          systemIncomingNo: row.incomingGatePassNo,
          manualIncomingNo: row.manualIncomingVoucherNo ?? '—',
          incomingDate: formatVoucherDate(row.date),
          store: row.store,
          truckNumber: row.truckNumber ?? '—',
          variety,
          bagsReceived: row.bagsReceived,
          weightSlipNo: row.weightSlipNumber ?? '—',
          grossWeightKg: row.grossWeightKg ?? '—',
          tareWeightKg: row.tareWeightKg ?? '—',
          netWeightKg: row.netWeightKg ?? '—',
          lessBardanaKg,
          actualWeightKg: actualWeightKg ?? '—',
        },
        passRowIndex: 0,
        passGroupSize: 1,
      });
    }
  } else {
    const rowsByVariety = new Map<string, StockLedgerRow[]>();
    for (const row of stockLedgerRows) {
      const v = getVarietyValue(row);
      const list = rowsByVariety.get(v) ?? [];
      list.push(row);
      rowsByVariety.set(v, list);
    }

    const varietyOrder = Array.from(rowsByVariety.keys()).sort((a, b) =>
      a.localeCompare(b)
    );

    for (const variety of varietyOrder) {
      rows.push({ type: 'variety', variety });
      for (const row of rowsByVariety.get(variety) ?? []) {
        const bags = row.bagsReceived ?? 0;
        const lessBardanaKg = Math.round(bags * JUTE_BAG_WEIGHT * 10) / 10;
        const actualWeightKg =
          row.netWeightKg != null
            ? Math.round((row.netWeightKg - lessBardanaKg) * 10) / 10
            : undefined;

        rows.push({
          type: 'data',
          cells: {
            systemIncomingNo: row.incomingGatePassNo,
            manualIncomingNo: row.manualIncomingVoucherNo ?? '—',
            incomingDate: formatVoucherDate(row.date),
            store: row.store,
            truckNumber: row.truckNumber ?? '—',
            variety,
            bagsReceived: row.bagsReceived,
            weightSlipNo: row.weightSlipNumber ?? '—',
            grossWeightKg: row.grossWeightKg ?? '—',
            tareWeightKg: row.tareWeightKg ?? '—',
            netWeightKg: row.netWeightKg ?? '—',
            lessBardanaKg,
            actualWeightKg: actualWeightKg ?? '—',
          },
          passRowIndex: 0,
          passGroupSize: 1,
        });
      }
    }
  }

  return {
    companyName: params.companyName,
    farmerName: '',
    dateRangeLabel,
    reportTitle,
    visibleColumnIds,
    groupByVariety,
    rows,
  };
}

export function buildGradingDailyAccountingPdfPayload(params: {
  companyName: string;
  dateRangeLabel: string;
  reportTitle: string;
  groupByVariety: boolean;
  gradingReportData: GradingGatePassReportData;
}): { snapshot: FarmerReportPdfSnapshot; stockLedgerRows: StockLedgerRow[] } {
  const flatItems = flattenGradingReportData(params.gradingReportData);
  const stockLedgerRows: StockLedgerRow[] = flatItems.map((x, i) =>
    gradingReportItemToStockLedgerRow(x.pass, i + 1, x.farmerNameFallback)
  );

  const snapshot = buildAccountingDailySnapshot({
    companyName: params.companyName,
    dateRangeLabel: params.dateRangeLabel,
    reportTitle: params.reportTitle,
    groupByVariety: params.groupByVariety,
    stockLedgerRows,
  });

  return { snapshot, stockLedgerRows };
}
