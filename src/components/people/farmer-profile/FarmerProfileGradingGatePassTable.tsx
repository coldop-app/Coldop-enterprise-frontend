import React, { memo, useMemo, useState } from 'react';
import { format, parseISO } from 'date-fns';
import type {
  GradingGatePass,
  GradingGatePassIncomingRef,
} from '@/types/grading-gate-pass';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Empty,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@/components/ui/empty';
import { ClipboardList } from 'lucide-react';
import {
  BAG_TYPES,
  BUY_BACK_COST,
  JUTE_BAG_WEIGHT,
  LENO_BAG_WEIGHT,
} from '@/components/forms/grading/constants';
import type { GradingSize } from '@/components/forms/grading/constants';
import { DatePicker } from '@/components/forms/date-picker';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { downloadAccountingReportExcel } from '@/utils/accountingReportExcel';
import {
  AccountingReportGatePassDialog,
  type AccountingReportGatePassRow,
} from './AccountingReportGatePassDialog';
import { formatDateToYYYYMMDD, parseDateToTimestamp } from '@/lib/helpers';
import { toast } from 'sonner';
import { FileDown, MoreVertical, Settings2 } from 'lucide-react';
import { useStore } from '@/stores/store';
import type {
  FarmerReportPdfRow,
  FarmerReportPdfSnapshot,
} from '@/components/pdf/farmer-report/farmer-report-pdf-types';
import type { StockLedgerRow } from '@/components/pdf/stockLedgerTypes';
import { GRADING_SIZES } from '@/components/forms/grading/constants';

const DEFAULT_STORE = 'JICSPL-Bazpur';

/** Bag size column order: 30, 30-40, 35-40, 40-45, 45-50, 50-55, above 50, above 55, cut. */
const BAG_SIZE_ORDER: string[] = [
  'Below 30',
  '30–40',
  '35–40',
  '40–45',
  '45–50',
  '50–55',
  'Above 50',
  'Above 55',
  'Cut',
];

/** Short labels for bag size columns in BAG_SIZE_ORDER (e.g. B25, B30, A50). */
const BAG_SIZE_ORDER_LABELS: Record<string, string> = {
  'Below 30': 'B30',
  '30–40': '30-40',
  '35–40': '35-40',
  '40–45': '40-45',
  '45–50': '45-50',
  '50–55': '50-55',
  'Above 50': 'A50',
  'Above 55': 'A55',
  Cut: 'CUT',
};

/** Column ids for visibility toggle (incoming block, then grading block, then bag sizes, then last). */
const INCOMING_COLUMN_IDS = [
  'systemIncomingNo',
  'manualIncomingNo',
  'incomingDate',
  'store',
  'truckNumber',
  'variety',
  'bagsReceived',
  'totalBagsReceived',
  'weightSlipNo',
  'grossWeightKg',
  'totalGrossKg',
  'tareWeightKg',
  'totalTareKg',
  'netWeightKg',
  'totalNetKg',
  'lessBardanaKg',
  'totalLessBardanaKg',
  'actualWeightKg',
] as const;

const GRADING_FIXED_COLUMN_IDS = [
  'gradingGatePassNo',
  'gradingManualNo',
  'gradingDate',
  'postGradingBags',
  'type',
] as const;

const LAST_COLUMN_IDS = [
  'weightReceivedAfterGrading',
  'lessBardanaForGrading',
  'actualWeightOfPotato',
  'wastage',
  'wastagePercent',
  'amountPayable',
] as const;

/** All possible bag size column ids (for dropdown). */
const BAG_SIZE_COLUMN_IDS = BAG_SIZE_ORDER.map(
  (size) => BAG_SIZE_ORDER_LABELS[size] ?? size
);

const FARMER_GRADING_COLUMN_LABELS: Record<string, string> = {
  systemIncomingNo: 'System incoming no.',
  manualIncomingNo: 'Manual incoming no.',
  incomingDate: 'Incoming date',
  store: 'Store',
  truckNumber: 'Truck number',
  variety: 'Variety',
  bagsReceived: 'Bags received',
  totalBagsReceived: 'Total bags received',
  weightSlipNo: 'Weight slip no.',
  grossWeightKg: 'Gross weight (kg)',
  totalGrossKg: 'Total gross (kg)',
  tareWeightKg: 'Tare weight (kg)',
  totalTareKg: 'Total tare (kg)',
  netWeightKg: 'Net weight (kg)',
  totalNetKg: 'Total net (kg)',
  lessBardanaKg: 'Less bardana (kg)',
  totalLessBardanaKg: 'Total less bardana (kg)',
  actualWeightKg: 'Actual weight (kg)',
  gradingGatePassNo: 'Grading GP no.',
  gradingManualNo: 'Grading manual no.',
  gradingDate: 'Grading date',
  postGradingBags: 'Post grading bags',
  type: 'Type',
  weightReceivedAfterGrading: 'Weight Received After Grading',
  lessBardanaForGrading: 'Less bardana for grading',
  actualWeightOfPotato: 'Actual weight of potato',
  wastage: 'Wastage',
  amountPayable: 'Amount Payable',
  wastagePercent: 'Wastage %',
  ...Object.fromEntries(
    BAG_SIZE_ORDER.map((size) => [
      BAG_SIZE_ORDER_LABELS[size] ?? size,
      BAG_SIZE_ORDER_LABELS[size] ?? size,
    ])
  ),
};

/** Sortable column ids for incoming and grading block (used for SortColumnId type). */
const _SORTABLE_COLUMN_IDS = [
  'systemIncomingNo',
  'manualIncomingNo',
  'incomingDate',
  'gradingGatePassNo',
  'gradingManualNo',
  'gradingDate',
] as const;

type SortColumnId = (typeof _SORTABLE_COLUMN_IDS)[number];

/** Comparable value for a pass for the given sort column (used for sorting). */
function getSortValue(
  pass: GradingGatePass,
  column: SortColumnId,
  getRefs: (
    pass: GradingGatePass
  ) => Array<GradingGatePassIncomingRef & { _id: string }>
): number | string {
  const refs = getRefs(pass);
  const firstRef = refs[0];
  switch (column) {
    case 'systemIncomingNo':
      return firstRef?.gatePassNo ?? 0;
    case 'manualIncomingNo': {
      const v = firstRef?.manualGatePassNumber ?? pass.manualGatePassNumber;
      return typeof v === 'number' ? v : v != null ? String(v) : '';
    }
    case 'incomingDate':
      return firstRef?.date ?? '';
    case 'gradingGatePassNo':
      return pass.gatePassNo ?? 0;
    case 'gradingManualNo': {
      const v = pass.manualGatePassNumber;
      return typeof v === 'number' ? v : v != null ? String(v) : '';
    }
    case 'gradingDate':
      return pass.date ?? '';
    default:
      return '';
  }
}

function compareSortValues(
  a: number | string,
  b: number | string,
  direction: 'asc' | 'desc'
): number {
  const mult = direction === 'asc' ? 1 : -1;
  if (typeof a === 'number' && typeof b === 'number') {
    return mult * (a - b);
  }
  const sa = String(a);
  const sb = String(b);
  return mult * sa.localeCompare(sb, undefined, { numeric: true });
}

/** Sizes that have at least one non-zero quantity across all passes. */
function getVisibleBagSizes(gradingPasses: GradingGatePass[]): string[] {
  const hasQty = new Set<string>();
  for (const pass of gradingPasses) {
    for (const d of pass.orderDetails ?? []) {
      if ((d.initialQuantity ?? 0) > 0 && d.size) hasQty.add(d.size);
    }
  }
  return BAG_SIZE_ORDER.filter((size) => hasQty.has(size));
}

/** Unique bag types present in orderDetails, in BAG_TYPES order. */
function getBagTypesForPass(
  orderDetails: GradingGatePass['orderDetails'] | undefined
): string[] {
  if (!orderDetails?.length) return [];
  const set = new Set(orderDetails.map((d) => d.bagType).filter(Boolean));
  return BAG_TYPES.filter((t) => set.has(t));
}

/** Per-size qty and weight for a given bag type from orderDetails. */
function getSizeMapForBagType(
  orderDetails: GradingGatePass['orderDetails'] | undefined,
  bagType: string
): Map<string, { qty: number; weight: number }> {
  const map = new Map<string, { qty: number; weight: number }>();
  for (const d of orderDetails ?? []) {
    if (d.bagType !== bagType) continue;
    const size = d.size;
    const qty = d.initialQuantity ?? 0;
    const weight = d.weightPerBagKg ?? 0;
    const existing = map.get(size);
    if (existing) {
      existing.qty += qty;
      if (d.weightPerBagKg != null) existing.weight = d.weightPerBagKg;
    } else {
      map.set(size, { qty, weight });
    }
  }
  return map;
}

/** Sum of (qty × weight) for all bag sizes in the map = weight received after grading (kg). */
function getWeightReceivedAfterGrading(
  sizeMap: Map<string, { qty: number; weight: number }>
): number {
  let total = 0;
  for (const { qty, weight } of sizeMap.values()) {
    total += qty * weight;
  }
  return total;
}

/** Bardana weight for grading: total bags for this type × weight per bag (JUTE or LENO). */
function getLessBardanaForGrading(
  sizeMap: Map<string, { qty: number; weight: number }>,
  bagType: string | null | undefined
): number {
  let totalBags = 0;
  for (const { qty } of sizeMap.values()) {
    totalBags += qty;
  }
  const weightPerBag = bagType === 'LENO' ? LENO_BAG_WEIGHT : JUTE_BAG_WEIGHT;
  return Math.round(totalBags * weightPerBag * 10) / 10;
}

/** Sum over all bag types of (Weight Received After Grading − Less bardana for grading). */
function getActualWeightOfPotato(
  orderDetails: GradingGatePass['orderDetails'] | undefined
): number {
  const bagTypes = getBagTypesForPass(orderDetails);
  let total = 0;
  for (const bagType of bagTypes) {
    const sizeMap = getSizeMapForBagType(orderDetails, bagType);
    total +=
      getWeightReceivedAfterGrading(sizeMap) -
      getLessBardanaForGrading(sizeMap, bagType);
  }
  return Math.round(total * 10) / 10;
}

function formatDate(iso: string | undefined): string {
  if (!iso) return '—';
  try {
    const d = parseISO(iso);
    return format(d, 'do MMM yyyy');
  } catch {
    return iso;
  }
}

/** Compact single-line date for PDF (reduces row height). */
function formatDateForPdf(iso: string | undefined): string {
  if (!iso) return '—';
  try {
    const d = parseISO(iso);
    return format(d, 'd MMM yy');
  } catch {
    return iso;
  }
}

function formatWeightKg(value: number | undefined): string {
  if (value == null) return '—';
  return String(Math.round(value * 10) / 10);
}

function formatAmountPayable(value: number | undefined): string {
  if (value == null) return '—';
  return `₹${value.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

/** Same as formatAmountPayable but with "Rs." for PDF (₹ often does not render in react-pdf). */
function formatAmountPayableForPdf(value: number | undefined): string {
  if (value == null) return '—';
  return `Rs. ${value.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function getNetWeightKg(
  weightSlip: GradingGatePassIncomingRef['weightSlip'] | undefined
): number | undefined {
  if (!weightSlip) return undefined;
  const gross = weightSlip.grossWeightKg;
  const tare = weightSlip.tareWeightKg;
  if (gross != null && tare != null) return gross - tare;
  return undefined;
}

/** Less bardana = bags received × JUTE bag weight (kg). */
function getBardanaWeightKg(
  bagsReceived: number | undefined
): number | undefined {
  if (bagsReceived == null) return undefined;
  return Math.round(bagsReceived * JUTE_BAG_WEIGHT * 10) / 10;
}

/** Actual weight = net weight − bardana weight. */
function getActualWeightKg(
  netWeightKg: number | undefined,
  bardanaWeightKg: number | undefined
): number | undefined {
  if (netWeightKg == null || bardanaWeightKg == null) return undefined;
  return Math.round((netWeightKg - bardanaWeightKg) * 10) / 10;
}

/** Totals across all incoming refs for one grading pass. */
function getIncomingTotals(
  refs: Array<GradingGatePassIncomingRef & { _id: string }>
): {
  totalBags: number;
  totalGrossKg: number;
  totalTareKg: number;
  totalNetKg: number;
  totalBardanaKg: number;
} {
  let totalBags = 0;
  let totalGrossKg = 0;
  let totalTareKg = 0;
  let totalNetKg = 0;
  let totalBardanaKg = 0;
  for (const ref of refs) {
    totalBags += ref.bagsReceived ?? 0;
    const gross = ref.weightSlip?.grossWeightKg ?? 0;
    const tare = ref.weightSlip?.tareWeightKg ?? 0;
    totalGrossKg += gross;
    totalTareKg += tare;
    const net = getNetWeightKg(ref.weightSlip) ?? 0;
    totalNetKg += net;
    const bardana = getBardanaWeightKg(ref.bagsReceived) ?? 0;
    totalBardanaKg += bardana;
  }
  return {
    totalBags,
    totalGrossKg,
    totalTareKg,
    totalNetKg,
    totalBardanaKg,
  };
}

/** Sum of actual weight (net − bardana) across all incoming refs for a pass. */
function getIncomingActualWeightTotal(
  refs: Array<GradingGatePassIncomingRef & { _id: string }>
): number {
  let total = 0;
  for (const ref of refs) {
    const netKg = getNetWeightKg(ref.weightSlip);
    const bardanaKg = getBardanaWeightKg(ref.bagsReceived);
    const actual = getActualWeightKg(netKg, bardanaKg);
    if (actual != null) total += actual;
  }
  return Math.round(total * 10) / 10;
}

/** Wastage = actual weight of potato (incoming) − actual weight of potato (grading). */
function getWastage(
  refs: Array<GradingGatePassIncomingRef & { _id: string }>,
  orderDetails: GradingGatePass['orderDetails'] | undefined
): number {
  const incoming = getIncomingActualWeightTotal(refs);
  const grading = getActualWeightOfPotato(orderDetails);
  return Math.round((incoming - grading) * 10) / 10;
}

/** Wastage as percentage of actual weight of potato (incoming). Returns undefined when incoming is 0. */
function getWastagePercent(
  refs: Array<GradingGatePassIncomingRef & { _id: string }>,
  orderDetails: GradingGatePass['orderDetails'] | undefined
): number | undefined {
  const incoming = getIncomingActualWeightTotal(refs);
  if (incoming === 0) return undefined;
  const wastage = getWastage(refs, orderDetails);
  return Math.round((wastage / incoming) * 1000) / 10;
}

/** Rate (₹/kg) for a variety and bag size from BUY_BACK_COST. Returns 0 if not found. */
function getRateForVarietyAndSize(
  variety: string | undefined,
  size: string | undefined
): number {
  if (!variety || !size) return 0;
  const config = BUY_BACK_COST.find(
    (c) => c.variety.toLowerCase() === variety.toLowerCase()
  );
  if (!config) return 0;
  const rate = config.sizeRates[size as GradingSize];
  return typeof rate === 'number' ? rate : 0;
}

/** Bardana (bag) weight per bag in kg for JUTE or LENO. */
function getBardanaWeightPerBagKg(bagType: string | undefined): number {
  return bagType === 'LENO' ? LENO_BAG_WEIGHT : JUTE_BAG_WEIGHT;
}

/** Amount payable = sum over orderDetails of (net potato kg × rate). Net potato kg = (qty × weightPerBagKg) − (qty × bardana kg per bag). */
function getAmountPayable(
  orderDetails: GradingGatePass['orderDetails'] | undefined,
  variety: string | undefined
): number {
  if (!orderDetails?.length) return 0;
  let total = 0;
  for (const d of orderDetails) {
    const qty = d.initialQuantity ?? 0;
    const weightPerBagKg = d.weightPerBagKg ?? 0;
    const bardanaPerBagKg = getBardanaWeightPerBagKg(d.bagType);
    const netPotatoKg = qty * Math.max(0, weightPerBagKg - bardanaPerBagKg);
    const rate = getRateForVarietyAndSize(variety, d.size);
    total += netPotatoKg * rate;
  }
  return Math.round(total * 100) / 100;
}

/** Total bags across all order details (sizes) for a grading gate pass. */
function getPostGradingBags(
  orderDetails: GradingGatePass['orderDetails'] | undefined
): number {
  if (!orderDetails?.length) return 0;
  return orderDetails.reduce((sum, d) => sum + (d.initialQuantity ?? 0), 0);
}

/** Normalize to array of ref objects; legacy string IDs become a minimal ref. */
function getIncomingRefs(
  ids: GradingGatePass['incomingGatePassIds'] | undefined
): Array<GradingGatePassIncomingRef & { _id: string }> {
  if (!ids?.length) return [];
  return ids.map((item) =>
    typeof item === 'string'
      ? { _id: item, gatePassNo: 0, date: '', manualGatePassNumber: undefined }
      : { ...item, _id: item._id ?? '' }
  ) as Array<GradingGatePassIncomingRef & { _id: string }>;
}

/** Convert one grading pass to StockLedgerRow for accounting report (grading + summary tables). */
function gradingPassToStockLedgerRow(
  pass: GradingGatePass,
  serialNo: number
): StockLedgerRow {
  const refs = getIncomingRefs(pass.incomingGatePassIds);
  const firstRef = refs[0] ?? null;
  const netKg = firstRef ? getNetWeightKg(firstRef.weightSlip) : undefined;
  const bagsReceived = firstRef?.bagsReceived ?? 0;
  const postGradingBags = getPostGradingBags(pass.orderDetails);

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
    date: firstRef?.date,
    incomingGatePassNo:
      firstRef?.gatePassNo != null ? firstRef.gatePassNo : '—',
    manualIncomingVoucherNo: firstRef?.manualGatePassNumber,
    gradingGatePassNo: pass.gatePassNo,
    manualGradingGatePassNo: pass.manualGatePassNumber,
    gradingGatePassDate: pass.date,
    store: DEFAULT_STORE,
    truckNumber: firstRef?.truckNumber,
    bagsReceived,
    weightSlipNumber: firstRef?.weightSlip?.slipNumber,
    grossWeightKg: firstRef?.weightSlip?.grossWeightKg,
    tareWeightKg: firstRef?.weightSlip?.tareWeightKg,
    netWeightKg: netKg,
    postGradingBags: postGradingBags > 0 ? postGradingBags : undefined,
    variety: pass.variety ?? undefined,
    sizeBagsJute: hasJute ? sizeBagsJute : undefined,
    sizeBagsLeno: hasLeno ? sizeBagsLeno : undefined,
    sizeWeightPerBagJute: hasJute ? sizeWeightPerBagJute : undefined,
    sizeWeightPerBagLeno: hasLeno ? sizeWeightPerBagLeno : undefined,
  };
}

/** All column ids in table order (for PDF row cells). */
const ALL_PDF_COLUMN_IDS = [
  ...INCOMING_COLUMN_IDS,
  ...GRADING_FIXED_COLUMN_IDS,
  ...BAG_SIZE_ORDER.map((s) => BAG_SIZE_ORDER_LABELS[s] ?? s),
  ...LAST_COLUMN_IDS,
];

/** Build a flat cell record for one data row (for PDF). Repeats pass-level values on every row. */
function buildCellsForPdfRow(
  pass: GradingGatePass,
  ref: (GradingGatePassIncomingRef & { _id: string }) | null,
  bagType: string | null,
  sizeMap: Map<string, { qty: number; weight: number }>,
  refs: Array<GradingGatePassIncomingRef & { _id: string }>,
  totals: ReturnType<typeof getIncomingTotals>,
  firstRowOfPass: boolean
): Record<string, string | number> {
  const netKg = ref ? getNetWeightKg(ref.weightSlip) : undefined;
  const bardanaKg = ref ? getBardanaWeightKg(ref.bagsReceived) : undefined;
  const actualKg = getActualWeightKg(netKg, bardanaKg);
  const cells: Record<string, string | number> = {};
  for (const id of ALL_PDF_COLUMN_IDS) {
    if (id === 'systemIncomingNo')
      cells[id] = ref?.gatePassNo != null ? String(ref.gatePassNo) : '—';
    else if (id === 'manualIncomingNo')
      cells[id] =
        ref?.manualGatePassNumber != null
          ? String(ref.manualGatePassNumber)
          : '—';
    else if (id === 'incomingDate')
      cells[id] = ref?.date ? formatDateForPdf(ref.date) : '—';
    else if (id === 'store') cells[id] = DEFAULT_STORE;
    else if (id === 'truckNumber') cells[id] = ref?.truckNumber ?? '—';
    else if (id === 'variety') cells[id] = ref?.variety ?? pass.variety ?? '—';
    else if (id === 'bagsReceived')
      cells[id] = ref?.bagsReceived != null ? String(ref.bagsReceived) : '—';
    else if (id === 'totalBagsReceived')
      cells[id] =
        firstRowOfPass && refs.length > 1 ? String(totals.totalBags) : '—';
    else if (id === 'weightSlipNo')
      cells[id] = ref?.weightSlip?.slipNumber ?? '—';
    else if (id === 'grossWeightKg')
      cells[id] = formatWeightKg(ref?.weightSlip?.grossWeightKg);
    else if (id === 'totalGrossKg')
      cells[id] =
        firstRowOfPass && refs.length > 1
          ? formatWeightKg(totals.totalGrossKg)
          : '—';
    else if (id === 'tareWeightKg')
      cells[id] = formatWeightKg(ref?.weightSlip?.tareWeightKg);
    else if (id === 'totalTareKg')
      cells[id] =
        firstRowOfPass && refs.length > 1
          ? formatWeightKg(totals.totalTareKg)
          : '—';
    else if (id === 'netWeightKg') cells[id] = formatWeightKg(netKg);
    else if (id === 'totalNetKg')
      cells[id] =
        firstRowOfPass && refs.length > 1
          ? formatWeightKg(totals.totalNetKg)
          : '—';
    else if (id === 'lessBardanaKg') cells[id] = formatWeightKg(bardanaKg);
    else if (id === 'totalLessBardanaKg')
      cells[id] =
        firstRowOfPass && refs.length > 1
          ? formatWeightKg(totals.totalBardanaKg)
          : '—';
    else if (id === 'actualWeightKg') cells[id] = formatWeightKg(actualKg);
    else if (id === 'gradingGatePassNo') cells[id] = pass.gatePassNo ?? '—';
    else if (id === 'gradingManualNo')
      cells[id] =
        pass.manualGatePassNumber != null
          ? String(pass.manualGatePassNumber)
          : '—';
    else if (id === 'gradingDate') cells[id] = formatDateForPdf(pass.date);
    else if (id === 'postGradingBags')
      cells[id] = String(getPostGradingBags(pass.orderDetails));
    else if (id === 'type') cells[id] = bagType ?? '—';
    else if (id === 'weightReceivedAfterGrading')
      cells[id] = formatWeightKg(getWeightReceivedAfterGrading(sizeMap));
    else if (id === 'lessBardanaForGrading')
      cells[id] = formatWeightKg(getLessBardanaForGrading(sizeMap, bagType));
    else if (id === 'actualWeightOfPotato')
      cells[id] = formatWeightKg(getActualWeightOfPotato(pass.orderDetails));
    else if (id === 'wastage')
      cells[id] = formatWeightKg(getWastage(refs, pass.orderDetails));
    else if (id === 'wastagePercent') {
      const pct = getWastagePercent(refs, pass.orderDetails);
      cells[id] = pct !== undefined ? `${pct}%` : '—';
    } else if (id === 'amountPayable')
      cells[id] = formatAmountPayableForPdf(
        getAmountPayable(pass.orderDetails, pass.variety)
      );
    else if (
      BAG_SIZE_ORDER.some((s) => (BAG_SIZE_ORDER_LABELS[s] ?? s) === id)
    ) {
      const data = sizeMap.get(
        BAG_SIZE_ORDER.find((s) => (BAG_SIZE_ORDER_LABELS[s] ?? s) === id) ?? ''
      );
      if (data && data.qty > 0)
        cells[id] = `${data.qty} (${formatWeightKg(data.weight)})`;
      else cells[id] = '';
    } else cells[id] = '—';
  }
  return cells;
}

/** Build flat PDF rows from grouped passes (used for accounting report so incoming/summary honour selected passes). */
function buildFlatRowsFromGroupedPasses(
  groupedPasses: Array<{ variety: string | null; passes: GradingGatePass[] }>,
  groupByVariety: boolean
): FarmerReportPdfRow[] {
  const result: FarmerReportPdfRow[] = [];
  for (const { variety, passes } of groupedPasses) {
    if (groupByVariety && variety != null) {
      result.push({ type: 'variety', variety });
    }
    for (const pass of passes) {
      const refs = getIncomingRefs(pass.incomingGatePassIds);
      if (refs.length === 0) {
        const bagTypes = getBagTypesForPass(pass.orderDetails);
        const rowsCount = Math.max(1, bagTypes.length);
        const totals = getIncomingTotals(refs);
        for (let typeIndex = 0; typeIndex < rowsCount; typeIndex++) {
          const bagType = bagTypes[typeIndex] ?? null;
          const sizeMap =
            bagType != null
              ? getSizeMapForBagType(pass.orderDetails, bagType)
              : new Map<string, { qty: number; weight: number }>();
          const cells = buildCellsForPdfRow(
            pass,
            null,
            bagType,
            sizeMap,
            refs,
            totals,
            typeIndex === 0
          );
          result.push({
            type: 'data',
            cells,
            passRowIndex: typeIndex,
            passGroupSize: rowsCount,
          });
        }
        continue;
      }
      const totals = getIncomingTotals(refs);
      const bagTypes = getBagTypesForPass(pass.orderDetails);
      const rowsPerPass = Math.max(refs.length, bagTypes.length);
      for (let rowIndex = 0; rowIndex < rowsPerPass; rowIndex++) {
        const ref = refs[rowIndex] ?? null;
        const bagType = bagTypes[rowIndex] ?? null;
        const sizeMap =
          bagType != null
            ? getSizeMapForBagType(pass.orderDetails, bagType)
            : new Map<string, { qty: number; weight: number }>();
        const cells = buildCellsForPdfRow(
          pass,
          ref,
          bagType,
          sizeMap,
          refs,
          totals,
          rowIndex === 0
        );
        result.push({
          type: 'data',
          cells,
          passRowIndex: rowIndex,
          passGroupSize: rowsPerPass,
        });
      }
    }
  }
  return result;
}

/** Build snapshot + stock ledger rows for Farmer Stock Ledger PDF (all grading passes, variety-grouped). Shared with farmer profile parent for PDF generation. */
// eslint-disable-next-line react-refresh/only-export-components -- non-component export for index.tsx PDF payload
export function buildFarmerStockLedgerReportPayload(
  gradingPasses: GradingGatePass[],
  params: {
    companyName: string;
    farmerName: string;
    dateRangeLabel: string;
  }
): { snapshot: FarmerReportPdfSnapshot; stockLedgerRows: StockLedgerRow[] } {
  const sortedSelected = [...gradingPasses].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  );
  const getRefsForSort = (p: GradingGatePass) =>
    getIncomingRefs(p.incomingGatePassIds);
  const groupedSelected: Array<{
    variety: string | null;
    passes: GradingGatePass[];
  }> = (() => {
    const byVariety = new Map<string, GradingGatePass[]>();
    for (const pass of sortedSelected) {
      const variety = pass.variety ?? getRefsForSort(pass)[0]?.variety ?? '';
      const list = byVariety.get(variety) ?? [];
      list.push(pass);
      byVariety.set(variety, list);
    }
    return Array.from(byVariety.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([variety, passes]) => ({ variety, passes }));
  })();
  const flatRowsForSelected = buildFlatRowsFromGroupedPasses(
    groupedSelected,
    true
  );
  let serial = 1;
  const stockLedgerRowsSelected: StockLedgerRow[] = [];
  for (const { passes } of groupedSelected) {
    for (const pass of passes) {
      stockLedgerRowsSelected.push(gradingPassToStockLedgerRow(pass, serial));
      serial += 1;
    }
  }
  const visibleBagSizes = getVisibleBagSizes(gradingPasses);
  const visibleColumnIdsForPdf = [
    ...INCOMING_COLUMN_IDS,
    ...GRADING_FIXED_COLUMN_IDS,
    ...visibleBagSizes.map((s) => BAG_SIZE_ORDER_LABELS[s] ?? s),
    ...LAST_COLUMN_IDS,
  ];
  const snapshot: FarmerReportPdfSnapshot = {
    companyName: params.companyName,
    farmerName: params.farmerName || undefined,
    dateRangeLabel: params.dateRangeLabel,
    reportTitle: 'Farmer Report',
    visibleColumnIds: visibleColumnIdsForPdf,
    groupByVariety: true,
    rows: flatRowsForSelected,
  };
  return { snapshot, stockLedgerRows: stockLedgerRowsSelected };
}

export interface FarmerProfileGradingGatePassTableProps {
  gradingPasses: GradingGatePass[];
  isLoading?: boolean;
  farmerName?: string;
  companyName?: string;
}

export const FarmerProfileGradingGatePassTable = memo(
  function FarmerProfileGradingGatePassTable({
    gradingPasses,
    isLoading = false,
    farmerName: farmerNameProp,
    companyName: companyNameProp,
  }: FarmerProfileGradingGatePassTableProps) {
    const [fromDate, setFromDate] = useState<string | undefined>();
    const [toDate, setToDate] = useState<string | undefined>();
    const [appliedRange, setAppliedRange] = useState<{
      dateFrom?: string;
      dateTo?: string;
    }>({});
    const [columnVisibility, setColumnVisibility] = useState<
      Record<string, boolean>
    >({});
    const [sortColumn, setSortColumn] = useState<SortColumnId | null>(null);
    const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
    const [groupByVariety, setGroupByVariety] = useState(false);
    const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
    const [accountingReportDialogOpen, setAccountingReportDialogOpen] =
      useState(false);
    const [
      selectedGradingPassIdsForAccounting,
      setSelectedGradingPassIdsForAccounting,
    ] = useState<Set<string>>(new Set());

    const coldStorage = useStore((s) => s.coldStorage);
    const companyName = companyNameProp ?? coldStorage?.name ?? 'Cold Storage';
    const farmerName = farmerNameProp ?? '';

    const isColVisible = (id: string) => columnVisibility[id] !== false;
    const visibleIncomingCount = INCOMING_COLUMN_IDS.filter((id) =>
      isColVisible(id)
    ).length;
    const visibleFirstSevenCount = INCOMING_COLUMN_IDS.slice(0, 7).filter(
      (id) => isColVisible(id)
    ).length;
    const visibleSpannedTotalColsCount = [
      'totalBagsReceived',
      'totalGrossKg',
      'totalTareKg',
      'totalNetKg',
      'totalLessBardanaKg',
    ].filter((id) => isColVisible(id)).length;

    const handleApplyDates = () => {
      if (!fromDate && !toDate) {
        setAppliedRange({});
        return;
      }
      if (fromDate && toDate) {
        const fromStr = formatDateToYYYYMMDD(fromDate);
        const toStr = formatDateToYYYYMMDD(toDate);
        if (toStr < fromStr) {
          toast.error('Invalid date range', {
            description: '"To" date must not be before "From" date.',
          });
          return;
        }
        setAppliedRange({ dateFrom: fromStr, dateTo: toStr });
        toast.success('Date filter applied.', {
          description: `${fromDate} to ${toDate}`,
        });
        return;
      }
      setAppliedRange({
        dateFrom: fromDate ? formatDateToYYYYMMDD(fromDate) : undefined,
        dateTo: toDate ? formatDateToYYYYMMDD(toDate) : undefined,
      });
      const rangeDesc = fromDate
        ? `From ${fromDate}`
        : toDate
          ? `To ${toDate}`
          : '';
      toast.success('Date filter applied.', {
        description: rangeDesc || undefined,
      });
    };

    const handleClearDates = () => {
      setFromDate(undefined);
      setToDate(undefined);
      setAppliedRange({});
      toast.success('Date filters cleared.');
    };

    const getDateRangeLabel = () => {
      if (appliedRange.dateFrom && appliedRange.dateTo) {
        return `${appliedRange.dateFrom} to ${appliedRange.dateTo}`;
      }
      if (appliedRange.dateFrom) return `From ${appliedRange.dateFrom}`;
      if (appliedRange.dateTo) return `To ${appliedRange.dateTo}`;
      return 'All dates';
    };

    const handleViewReport = async () => {
      const printWindow = window.open('', '_blank');
      if (printWindow) {
        printWindow.document.write(
          '<html><body style="font-family:sans-serif;padding:2rem;text-align:center;color:#666;">Generating PDF…</body></html>'
        );
      }
      setIsGeneratingPdf(true);
      try {
        const snapshot: FarmerReportPdfSnapshot = {
          companyName,
          farmerName: farmerName || undefined,
          dateRangeLabel: getDateRangeLabel(),
          reportTitle: 'Grading Gate Pass Report',
          visibleColumnIds: visibleColumnIdsForPdf,
          groupByVariety,
          rows: flatRowsForPdf,
        };
        const [{ pdf }, { FarmerReportPdf }] = await Promise.all([
          import('@react-pdf/renderer'),
          import('@/components/pdf/farmer-report/farmer-report-pdf'),
        ]);
        const blob = await pdf(
          <FarmerReportPdf
            snapshot={snapshot}
            stockLedgerRows={stockLedgerRowsForAccountingReport}
          />
        ).toBlob();
        const url = URL.createObjectURL(blob);
        if (printWindow) {
          printWindow.location.href = url;
        } else {
          window.location.href = url;
        }
        setTimeout(() => URL.revokeObjectURL(url), 60_000);
        toast.success('PDF opened in new tab', {
          description: 'Report is ready to view or print.',
        });
      } catch {
        toast.error('Could not generate PDF', {
          description: 'Please try again.',
        });
      } finally {
        setIsGeneratingPdf(false);
      }
    };

    const handleOpenAccountingReportDialog = () => {
      setSelectedGradingPassIdsForAccounting(
        new Set(filteredGradingPasses.map((p) => p._id))
      );
      setAccountingReportDialogOpen(true);
    };

    const handleAccountingReportGenerate = async (selectedIds: Set<string>) => {
      const data = buildAccountingReportDataForSelection(selectedIds);
      if (!data) {
        toast.error('No gate passes selected', {
          description: 'Select at least one grading gate pass.',
        });
        return;
      }
      setAccountingReportDialogOpen(false);
      const printWindow = window.open('', '_blank');
      if (printWindow) {
        printWindow.document.write(
          '<html><body style="font-family:sans-serif;padding:2rem;text-align:center;color:#666;">Generating PDF…</body></html>'
        );
      }
      setIsGeneratingPdf(true);
      try {
        const { snapshot, stockLedgerRowsSelected } = data;
        const [{ pdf }, { AccountingStockLedgerPdf }] = await Promise.all([
          import('@react-pdf/renderer'),
          import('@/components/pdf/AccountingStockLedgerPdf'),
        ]);
        const blob = await pdf(
          <AccountingStockLedgerPdf
            snapshot={snapshot}
            stockLedgerRows={stockLedgerRowsSelected}
          />
        ).toBlob();
        const url = URL.createObjectURL(blob);
        if (printWindow) {
          printWindow.location.href = url;
        } else {
          window.location.href = url;
        }
        setTimeout(() => URL.revokeObjectURL(url), 60_000);
        toast.success('Accounting report opened in new tab', {
          description: 'Report is ready to view or print.',
        });
      } catch {
        toast.error('Could not generate PDF', {
          description: 'Please try again.',
        });
      } finally {
        setIsGeneratingPdf(false);
      }
    };

    const buildAccountingReportDataForSelection = (
      selectedIds: Set<string>
    ) => {
      const selectedPasses = filteredGradingPasses.filter((p) =>
        selectedIds.has(p._id)
      );
      if (selectedPasses.length === 0) return null;
      const getRefsForSort = (p: GradingGatePass) =>
        getIncomingRefs(p.incomingGatePassIds);
      const sortedSelected =
        sortColumn == null
          ? [...selectedPasses]
          : [...selectedPasses].sort((a, b) =>
              compareSortValues(
                getSortValue(a, sortColumn, getRefsForSort),
                getSortValue(b, sortColumn, getRefsForSort),
                sortDirection
              )
            );
      /** Accounting report is always grouped variety-wise (incoming + grading + summary). */
      const groupedSelected: Array<{
        variety: string | null;
        passes: GradingGatePass[];
      }> = (() => {
        const byVariety = new Map<string, GradingGatePass[]>();
        for (const pass of sortedSelected) {
          const variety =
            pass.variety ?? getRefsForSort(pass)[0]?.variety ?? '';
          const list = byVariety.get(variety) ?? [];
          list.push(pass);
          byVariety.set(variety, list);
        }
        return Array.from(byVariety.entries())
          .sort(([a], [b]) => a.localeCompare(b))
          .map(([variety, passes]) => ({ variety, passes }));
      })();
      const flatRowsForSelected = buildFlatRowsFromGroupedPasses(
        groupedSelected,
        true
      );
      let serial = 1;
      const stockLedgerRowsSelected: StockLedgerRow[] = [];
      for (const { passes } of groupedSelected) {
        for (const pass of passes) {
          stockLedgerRowsSelected.push(
            gradingPassToStockLedgerRow(pass, serial)
          );
          serial += 1;
        }
      }
      const snapshot: FarmerReportPdfSnapshot = {
        companyName,
        farmerName: farmerName || undefined,
        dateRangeLabel: getDateRangeLabel(),
        reportTitle: 'Accounting Report',
        visibleColumnIds: visibleColumnIdsForPdf,
        groupByVariety: true,
        rows: flatRowsForSelected,
      };
      return { snapshot, stockLedgerRowsSelected };
    };

    const handleAccountingReportDownloadExcel = () => {
      const data = buildAccountingReportDataForSelection(
        selectedGradingPassIdsForAccounting
      );
      if (!data) {
        toast.error('No gate passes selected', {
          description: 'Select at least one grading gate pass.',
        });
        return;
      }
      downloadAccountingReportExcel(
        data.snapshot,
        data.stockLedgerRowsSelected
      );
      toast.success('Excel downloaded', {
        description: 'Accounting report saved to your device.',
      });
    };

    const filteredGradingPasses = useMemo(() => {
      if (!appliedRange.dateFrom && !appliedRange.dateTo) return gradingPasses;

      const fromTs =
        appliedRange.dateFrom != null
          ? parseDateToTimestamp(appliedRange.dateFrom)
          : undefined;
      const toTs =
        appliedRange.dateTo != null
          ? parseDateToTimestamp(appliedRange.dateTo)
          : undefined;

      return gradingPasses.filter((pass) => {
        if (!pass.date) return false;
        const ts = parseDateToTimestamp(pass.date);
        if (Number.isNaN(ts)) return false;
        if (fromTs != null && !Number.isNaN(fromTs) && ts < fromTs) {
          return false;
        }
        if (toTs != null && !Number.isNaN(toTs) && ts > toTs) {
          return false;
        }
        return true;
      });
    }, [appliedRange.dateFrom, appliedRange.dateTo, gradingPasses]);

    const sortedAndGroupedPasses = useMemo(() => {
      const getRefs = (p: GradingGatePass) =>
        getIncomingRefs(p.incomingGatePassIds);
      const sorted =
        sortColumn == null
          ? [...filteredGradingPasses]
          : [...filteredGradingPasses].sort((a, b) =>
              compareSortValues(
                getSortValue(a, sortColumn, getRefs),
                getSortValue(b, sortColumn, getRefs),
                sortDirection
              )
            );
      if (!groupByVariety) {
        return [{ variety: null as string | null, passes: sorted }];
      }
      const byVariety = new Map<string, GradingGatePass[]>();
      for (const pass of sorted) {
        const variety = pass.variety ?? getRefs(pass)[0]?.variety ?? '';
        const list = byVariety.get(variety) ?? [];
        list.push(pass);
        byVariety.set(variety, list);
      }
      const groups = Array.from(byVariety.entries())
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([variety, passes]) => ({ variety, passes }));
      return groups;
    }, [filteredGradingPasses, sortColumn, sortDirection, groupByVariety]);

    const visibleBagSizes = getVisibleBagSizes(filteredGradingPasses);

    const visibleColumnIdsForPdf = useMemo(() => {
      const colVisible = (id: string) => columnVisibility[id] !== false;
      const incoming = INCOMING_COLUMN_IDS.filter((id) => colVisible(id));
      const grading = GRADING_FIXED_COLUMN_IDS.filter((id) => colVisible(id));
      const sizes = visibleBagSizes
        .map((s) => BAG_SIZE_ORDER_LABELS[s] ?? s)
        .filter((id) => colVisible(id));
      const last = LAST_COLUMN_IDS.filter((id) => colVisible(id));
      return [...incoming, ...grading, ...sizes, ...last];
    }, [columnVisibility, visibleBagSizes]);

    const flatRowsForPdf = useMemo((): FarmerReportPdfRow[] => {
      const result: FarmerReportPdfRow[] = [];
      for (const { variety, passes } of sortedAndGroupedPasses) {
        if (groupByVariety && variety != null) {
          result.push({ type: 'variety', variety });
        }
        for (const pass of passes) {
          const refs = getIncomingRefs(pass.incomingGatePassIds);
          if (refs.length === 0) {
            const bagTypes = getBagTypesForPass(pass.orderDetails);
            const rowsCount = Math.max(1, bagTypes.length);
            const totals = getIncomingTotals(refs);
            for (let typeIndex = 0; typeIndex < rowsCount; typeIndex++) {
              const bagType = bagTypes[typeIndex] ?? null;
              const sizeMap =
                bagType != null
                  ? getSizeMapForBagType(pass.orderDetails, bagType)
                  : new Map<string, { qty: number; weight: number }>();
              const cells = buildCellsForPdfRow(
                pass,
                null,
                bagType,
                sizeMap,
                refs,
                totals,
                typeIndex === 0
              );
              result.push({
                type: 'data',
                cells,
                passRowIndex: typeIndex,
                passGroupSize: rowsCount,
              });
            }
            continue;
          }
          const totals = getIncomingTotals(refs);
          const bagTypes = getBagTypesForPass(pass.orderDetails);
          const rowsPerPass = Math.max(refs.length, bagTypes.length);
          for (let rowIndex = 0; rowIndex < rowsPerPass; rowIndex++) {
            const ref = refs[rowIndex] ?? null;
            const bagType = bagTypes[rowIndex] ?? null;
            const sizeMap =
              bagType != null
                ? getSizeMapForBagType(pass.orderDetails, bagType)
                : new Map<string, { qty: number; weight: number }>();
            const cells = buildCellsForPdfRow(
              pass,
              ref,
              bagType,
              sizeMap,
              refs,
              totals,
              rowIndex === 0
            );
            result.push({
              type: 'data',
              cells,
              passRowIndex: rowIndex,
              passGroupSize: rowsPerPass,
            });
          }
        }
      }
      return result;
    }, [sortedAndGroupedPasses, groupByVariety]);

    const stockLedgerRowsForAccountingReport = useMemo((): StockLedgerRow[] => {
      return filteredGradingPasses.map((pass, index) =>
        gradingPassToStockLedgerRow(pass, index + 1)
      );
    }, [filteredGradingPasses]);

    const accountingReportDialogRows =
      useMemo((): AccountingReportGatePassRow[] => {
        return filteredGradingPasses.map((pass) => {
          const refs = getIncomingRefs(pass.incomingGatePassIds);
          const totals = getIncomingTotals(refs);
          const firstRef = refs[0];
          return {
            pass,
            truckNumber: firstRef?.truckNumber ?? '—',
            incomingBags: totals.totalBags,
            totalGradingBags: getPostGradingBags(pass.orderDetails),
          };
        });
      }, [filteredGradingPasses]);

    const totalVisibleCols =
      INCOMING_COLUMN_IDS.filter((id) => isColVisible(id)).length +
      GRADING_FIXED_COLUMN_IDS.filter((id) => isColVisible(id)).length +
      visibleBagSizes.filter((s) => isColVisible(BAG_SIZE_ORDER_LABELS[s] ?? s))
        .length +
      LAST_COLUMN_IDS.filter((id) => isColVisible(id)).length;

    const {
      totalIncomingBags,
      totalIncomingGrossKg,
      totalIncomingTareKg,
      totalIncomingNetKg,
      totalIncomingBardanaKg,
      totalIncomingActualKg,
      totalPostGradingBags,
      totalWeightReceivedAfterGradingKg,
      totalLessBardanaForGradingKg,
      totalActualPotatoKg,
      totalWastageKg,
      totalAmountPayable,
      perSizeTotals,
    } = filteredGradingPasses.reduce(
      (acc, pass) => {
        const refs = getIncomingRefs(pass.incomingGatePassIds);
        const incomingTotals = getIncomingTotals(refs);

        acc.totalIncomingBags += incomingTotals.totalBags;
        acc.totalIncomingGrossKg += incomingTotals.totalGrossKg;
        acc.totalIncomingTareKg += incomingTotals.totalTareKg;
        acc.totalIncomingNetKg += incomingTotals.totalNetKg;
        acc.totalIncomingBardanaKg += incomingTotals.totalBardanaKg;
        acc.totalIncomingActualKg += getIncomingActualWeightTotal(refs);

        acc.totalPostGradingBags += getPostGradingBags(pass.orderDetails);

        const bagTypes = getBagTypesForPass(pass.orderDetails);
        for (const bagType of bagTypes) {
          const sizeMap = getSizeMapForBagType(pass.orderDetails, bagType);
          for (const size of visibleBagSizes) {
            const data = sizeMap.get(size);
            if (data && data.qty > 0) {
              acc.perSizeTotals.set(
                size,
                (acc.perSizeTotals.get(size) ?? 0) + data.qty
              );
            }
          }

          acc.totalWeightReceivedAfterGradingKg +=
            getWeightReceivedAfterGrading(sizeMap);
          acc.totalLessBardanaForGradingKg += getLessBardanaForGrading(
            sizeMap,
            bagType
          );
        }

        const actualPotato = getActualWeightOfPotato(pass.orderDetails);
        acc.totalActualPotatoKg += actualPotato;

        const wastage = getWastage(refs, pass.orderDetails);
        acc.totalWastageKg += wastage;

        acc.totalAmountPayable += getAmountPayable(
          pass.orderDetails,
          pass.variety
        );

        return acc;
      },
      {
        totalIncomingBags: 0,
        totalIncomingGrossKg: 0,
        totalIncomingTareKg: 0,
        totalIncomingNetKg: 0,
        totalIncomingBardanaKg: 0,
        totalIncomingActualKg: 0,
        totalPostGradingBags: 0,
        totalWeightReceivedAfterGradingKg: 0,
        totalLessBardanaForGradingKg: 0,
        totalActualPotatoKg: 0,
        totalWastageKg: 0,
        totalAmountPayable: 0,
        perSizeTotals: new Map<string, number>(),
      }
    );

    const totalWastagePercent =
      totalIncomingActualKg === 0
        ? undefined
        : Math.round((totalWastageKg / totalIncomingActualKg) * 1000) / 10;

    const tableBodyRows = useMemo(() => {
      const visibleBagSizesInner = getVisibleBagSizes(filteredGradingPasses);
      const isColVisibleInner = (id: string) => columnVisibility[id] !== false;
      const rows: React.ReactNode[] = [];
      for (const { variety, passes } of sortedAndGroupedPasses) {
        if (groupByVariety && variety != null) {
          rows.push(
            <TableRow
              key={`variety-${variety}`}
              className="border-border bg-muted/50 font-custom font-semibold"
            >
              <TableCell
                className="font-custom border-border border-b px-4 py-2"
                colSpan={totalVisibleCols}
              >
                Variety: {variety || '—'}
              </TableCell>
            </TableRow>
          );
        }
        for (const pass of passes) {
          const refs = getIncomingRefs(pass.incomingGatePassIds);
          if (refs.length === 0) {
            const bagTypes = getBagTypesForPass(pass.orderDetails);
            const rowsCount = Math.max(1, bagTypes.length);
            for (let typeIndex = 0; typeIndex < rowsCount; typeIndex++) {
              const bagType = bagTypes[typeIndex];
              const sizeMap =
                bagType != null
                  ? getSizeMapForBagType(pass.orderDetails, bagType)
                  : new Map<string, { qty: number; weight: number }>();
              rows.push(
                <TableRow
                  key={`${pass._id}-empty-${typeIndex}`}
                  className="border-border hover:bg-muted/50 transition-colors"
                >
                  {visibleIncomingCount > 0 && (
                    <TableCell
                      className="font-custom border-border border-r-primary/70 border-r-2 border-dotted px-4 py-3"
                      colSpan={visibleIncomingCount}
                    >
                      —
                    </TableCell>
                  )}
                  {typeIndex === 0 && (
                    <>
                      {isColVisibleInner('gradingGatePassNo') && (
                        <TableCell
                          className="font-custom border-border border-r px-4 py-3 text-right font-medium"
                          rowSpan={rowsCount}
                        >
                          {pass.gatePassNo ?? '—'}
                        </TableCell>
                      )}
                      {isColVisibleInner('gradingManualNo') && (
                        <TableCell
                          className="font-custom border-border border-r px-4 py-3 text-right font-medium"
                          rowSpan={rowsCount}
                        >
                          {pass.manualGatePassNumber != null
                            ? String(pass.manualGatePassNumber)
                            : '—'}
                        </TableCell>
                      )}
                      {isColVisibleInner('gradingDate') && (
                        <TableCell
                          className="font-custom border-border border-r px-4 py-3"
                          rowSpan={rowsCount}
                        >
                          {formatDate(pass.date)}
                        </TableCell>
                      )}
                      {isColVisibleInner('postGradingBags') && (
                        <TableCell
                          className="font-custom border-border border-r px-4 py-3 text-right font-medium"
                          rowSpan={rowsCount}
                        >
                          {getPostGradingBags(pass.orderDetails)}
                        </TableCell>
                      )}
                    </>
                  )}
                  {isColVisibleInner('type') && (
                    <TableCell className="font-custom border-border border-r px-4 py-3">
                      {bagType ?? '—'}
                    </TableCell>
                  )}
                  {visibleBagSizesInner.map((size) => {
                    const sizeId = BAG_SIZE_ORDER_LABELS[size] ?? size;
                    if (!isColVisibleInner(sizeId)) return null;
                    const data = sizeMap.get(size);
                    const isEmpty = !data || data.qty === 0;
                    return (
                      <TableCell
                        key={size}
                        className="font-custom border-border border-r px-4 py-3 text-right"
                      >
                        {isEmpty ? (
                          ''
                        ) : (
                          <span className="flex flex-col items-end">
                            <span className="font-medium">{data.qty}</span>
                            <span className="text-muted-foreground text-xs">
                              ({formatWeightKg(data.weight)})
                            </span>
                          </span>
                        )}
                      </TableCell>
                    );
                  })}
                  {isColVisibleInner('weightReceivedAfterGrading') && (
                    <TableCell className="font-custom border-border border-r px-4 py-3 text-right font-medium">
                      {formatWeightKg(getWeightReceivedAfterGrading(sizeMap))}
                    </TableCell>
                  )}
                  {isColVisibleInner('lessBardanaForGrading') && (
                    <TableCell className="font-custom border-border border-r px-4 py-3 text-right font-medium">
                      {formatWeightKg(
                        getLessBardanaForGrading(sizeMap, bagType)
                      )}
                    </TableCell>
                  )}
                  {typeIndex === 0 && (
                    <>
                      {isColVisibleInner('actualWeightOfPotato') && (
                        <TableCell
                          className="font-custom border-border border-r px-4 py-3 text-right align-top font-medium"
                          rowSpan={rowsCount}
                        >
                          {formatWeightKg(
                            getActualWeightOfPotato(pass.orderDetails)
                          )}
                        </TableCell>
                      )}
                      {isColVisibleInner('wastage') && (
                        <TableCell
                          className="font-custom border-border border-r px-4 py-3 text-right align-top font-medium"
                          rowSpan={rowsCount}
                        >
                          {formatWeightKg(getWastage(refs, pass.orderDetails))}
                        </TableCell>
                      )}
                      {isColVisibleInner('wastagePercent') && (
                        <TableCell
                          className="font-custom border-border border-r px-4 py-3 text-right align-top font-medium"
                          rowSpan={rowsCount}
                        >
                          {(() => {
                            const pct = getWastagePercent(
                              refs,
                              pass.orderDetails
                            );
                            return pct !== undefined ? `${pct}%` : '—';
                          })()}
                        </TableCell>
                      )}
                      {isColVisibleInner('amountPayable') && (
                        <TableCell
                          className="font-custom border-border border-r px-4 py-3 text-right align-top font-medium last:border-r-0"
                          rowSpan={rowsCount}
                        >
                          {formatAmountPayable(
                            getAmountPayable(pass.orderDetails, pass.variety)
                          )}
                        </TableCell>
                      )}
                    </>
                  )}
                </TableRow>
              );
            }
            continue;
          }
          const totals = getIncomingTotals(refs);
          const bagTypes = getBagTypesForPass(pass.orderDetails);
          const rowsPerPass = Math.max(refs.length, bagTypes.length);
          const incomingRowSpan =
            refs.length === 1 && rowsPerPass > 1 ? rowsPerPass : 1;
          for (let rowIndex = 0; rowIndex < rowsPerPass; rowIndex++) {
            const ref = refs[rowIndex] ?? null;
            const bagType = bagTypes[rowIndex] ?? null;
            const sizeMap =
              bagType != null
                ? getSizeMapForBagType(pass.orderDetails, bagType)
                : new Map<string, { qty: number; weight: number }>();
            const netKg = ref ? getNetWeightKg(ref.weightSlip) : undefined;
            const bardanaKg = ref
              ? getBardanaWeightKg(ref.bagsReceived)
              : undefined;
            const actualKg = getActualWeightKg(netKg, bardanaKg);
            const isIncomingSpannedRow = incomingRowSpan > 1 && rowIndex > 0;
            const showIncomingCells =
              ref != null ? !isIncomingSpannedRow : incomingRowSpan === 1;
            rows.push(
              <TableRow
                key={`${pass._id}-${rowIndex}`}
                className="border-border hover:bg-muted/50 transition-colors"
              >
                {showIncomingCells && ref ? (
                  <>
                    {isColVisibleInner('systemIncomingNo') && (
                      <TableCell
                        className="font-custom border-border border-r px-4 py-3 text-right align-top font-medium"
                        rowSpan={incomingRowSpan}
                      >
                        {ref.gatePassNo ? String(ref.gatePassNo) : '—'}
                      </TableCell>
                    )}
                    {isColVisibleInner('manualIncomingNo') && (
                      <TableCell
                        className="font-custom border-border border-r px-4 py-3 text-right align-top"
                        rowSpan={incomingRowSpan}
                      >
                        {ref.manualGatePassNumber != null
                          ? String(ref.manualGatePassNumber)
                          : '—'}
                      </TableCell>
                    )}
                    {isColVisibleInner('incomingDate') && (
                      <TableCell
                        className="font-custom border-border border-r px-4 py-3 align-top"
                        rowSpan={incomingRowSpan}
                      >
                        {ref.date ? formatDate(ref.date) : '—'}
                      </TableCell>
                    )}
                    {isColVisibleInner('store') && (
                      <TableCell
                        className="font-custom border-border border-r px-4 py-3 align-top"
                        rowSpan={incomingRowSpan}
                      >
                        {DEFAULT_STORE}
                      </TableCell>
                    )}
                    {isColVisibleInner('truckNumber') && (
                      <TableCell
                        className="font-custom border-border border-r px-4 py-3 align-top"
                        rowSpan={incomingRowSpan}
                      >
                        {ref.truckNumber ?? '—'}
                      </TableCell>
                    )}
                    {isColVisibleInner('variety') && (
                      <TableCell
                        className="font-custom border-border border-r px-4 py-3 align-top"
                        rowSpan={incomingRowSpan}
                      >
                        {ref.variety ?? '—'}
                      </TableCell>
                    )}
                    {isColVisibleInner('bagsReceived') && (
                      <TableCell
                        className="font-custom border-border border-r px-4 py-3 text-right align-top"
                        rowSpan={incomingRowSpan}
                      >
                        {ref.bagsReceived != null
                          ? String(ref.bagsReceived)
                          : '—'}
                      </TableCell>
                    )}
                    {rowIndex === 0 &&
                      isColVisibleInner('totalBagsReceived') && (
                        <TableCell
                          className="font-custom border-border border-r px-4 py-3 text-right align-top font-medium"
                          rowSpan={refs.length}
                        >
                          {refs.length > 1 ? totals.totalBags : '—'}
                        </TableCell>
                      )}
                    {isColVisibleInner('weightSlipNo') && (
                      <TableCell
                        className="font-custom border-border border-r px-4 py-3 align-top"
                        rowSpan={incomingRowSpan}
                      >
                        {ref.weightSlip?.slipNumber ?? '—'}
                      </TableCell>
                    )}
                    {isColVisibleInner('grossWeightKg') && (
                      <TableCell
                        className="font-custom border-border border-r px-4 py-3 text-right align-top"
                        rowSpan={incomingRowSpan}
                      >
                        {formatWeightKg(ref.weightSlip?.grossWeightKg)}
                      </TableCell>
                    )}
                    {rowIndex === 0 && isColVisibleInner('totalGrossKg') && (
                      <TableCell
                        className="font-custom border-border border-r px-4 py-3 text-right align-top font-medium"
                        rowSpan={refs.length}
                      >
                        {refs.length > 1
                          ? formatWeightKg(totals.totalGrossKg)
                          : '—'}
                      </TableCell>
                    )}
                    {isColVisibleInner('tareWeightKg') && (
                      <TableCell
                        className="font-custom border-border border-r px-4 py-3 text-right align-top"
                        rowSpan={incomingRowSpan}
                      >
                        {formatWeightKg(ref.weightSlip?.tareWeightKg)}
                      </TableCell>
                    )}
                    {rowIndex === 0 && isColVisibleInner('totalTareKg') && (
                      <TableCell
                        className="font-custom border-border border-r px-4 py-3 text-right align-top font-medium"
                        rowSpan={refs.length}
                      >
                        {refs.length > 1
                          ? formatWeightKg(totals.totalTareKg)
                          : '—'}
                      </TableCell>
                    )}
                    {isColVisibleInner('netWeightKg') && (
                      <TableCell
                        className="font-custom border-border border-r px-4 py-3 text-right align-top"
                        rowSpan={incomingRowSpan}
                      >
                        {formatWeightKg(netKg)}
                      </TableCell>
                    )}
                    {rowIndex === 0 && isColVisibleInner('totalNetKg') && (
                      <TableCell
                        className="font-custom border-border border-r px-4 py-3 text-right align-top font-medium"
                        rowSpan={refs.length}
                      >
                        {refs.length > 1
                          ? formatWeightKg(totals.totalNetKg)
                          : '—'}
                      </TableCell>
                    )}
                    {isColVisibleInner('lessBardanaKg') && (
                      <TableCell
                        className="font-custom border-border border-r px-4 py-3 text-right align-top"
                        rowSpan={incomingRowSpan}
                      >
                        {formatWeightKg(bardanaKg)}
                      </TableCell>
                    )}
                    {rowIndex === 0 &&
                      isColVisibleInner('totalLessBardanaKg') && (
                        <TableCell
                          className="font-custom border-border border-r px-4 py-3 text-right align-top font-medium"
                          rowSpan={refs.length}
                        >
                          {refs.length > 1
                            ? formatWeightKg(totals.totalBardanaKg)
                            : '—'}
                        </TableCell>
                      )}
                    {isColVisibleInner('actualWeightKg') && (
                      <TableCell
                        className="font-custom border-border border-r-primary border-r-2 border-dashed px-4 py-3 text-right align-top"
                        rowSpan={incomingRowSpan}
                      >
                        {formatWeightKg(actualKg)}
                      </TableCell>
                    )}
                  </>
                ) : showIncomingCells &&
                  ref == null &&
                  visibleIncomingCount > 0 ? (
                  <TableCell
                    className="font-custom border-border border-r-primary/70 border-r-2 border-dotted px-4 py-3"
                    colSpan={visibleIncomingCount}
                  >
                    —
                  </TableCell>
                ) : null}
                {isIncomingSpannedRow &&
                  visibleSpannedTotalColsCount > 0 &&
                  Array.from(
                    { length: visibleSpannedTotalColsCount },
                    (_, i) => (
                      <TableCell
                        key={`placeholder-total-${i}`}
                        className="font-custom border-border border-r px-4 py-3 text-right align-top"
                      >
                        —
                      </TableCell>
                    )
                  )}
                {rowIndex === 0 && (
                  <>
                    {isColVisibleInner('gradingGatePassNo') && (
                      <TableCell
                        className="font-custom border-border border-r px-4 py-3 text-right align-top font-medium"
                        rowSpan={rowsPerPass}
                      >
                        {pass.gatePassNo ?? '—'}
                      </TableCell>
                    )}
                    {isColVisibleInner('gradingManualNo') && (
                      <TableCell
                        className="font-custom border-border border-r px-4 py-3 text-right align-top font-medium"
                        rowSpan={rowsPerPass}
                      >
                        {pass.manualGatePassNumber != null
                          ? String(pass.manualGatePassNumber)
                          : '—'}
                      </TableCell>
                    )}
                    {isColVisibleInner('gradingDate') && (
                      <TableCell
                        className="font-custom border-border border-r px-4 py-3 align-top"
                        rowSpan={rowsPerPass}
                      >
                        {formatDate(pass.date)}
                      </TableCell>
                    )}
                    {isColVisibleInner('postGradingBags') && (
                      <TableCell
                        className="font-custom border-border border-r px-4 py-3 text-right align-top font-medium"
                        rowSpan={rowsPerPass}
                      >
                        {getPostGradingBags(pass.orderDetails)}
                      </TableCell>
                    )}
                  </>
                )}
                {isColVisibleInner('type') && (
                  <TableCell className="font-custom border-border border-r px-4 py-3">
                    {bagType ?? '—'}
                  </TableCell>
                )}
                {visibleBagSizesInner.map((size) => {
                  const sizeId = BAG_SIZE_ORDER_LABELS[size] ?? size;
                  if (!isColVisibleInner(sizeId)) return null;
                  const data = sizeMap.get(size);
                  const isEmpty = !data || data.qty === 0;
                  return (
                    <TableCell
                      key={size}
                      className="font-custom border-border border-r px-4 py-3 text-right"
                    >
                      {isEmpty ? (
                        ''
                      ) : (
                        <span className="flex flex-col items-end">
                          <span className="font-medium">{data.qty}</span>
                          <span className="text-muted-foreground text-xs">
                            ({formatWeightKg(data.weight)})
                          </span>
                        </span>
                      )}
                    </TableCell>
                  );
                })}
                {isColVisibleInner('weightReceivedAfterGrading') && (
                  <TableCell className="font-custom border-border border-r px-4 py-3 text-right font-medium">
                    {formatWeightKg(getWeightReceivedAfterGrading(sizeMap))}
                  </TableCell>
                )}
                {isColVisibleInner('lessBardanaForGrading') && (
                  <TableCell className="font-custom border-border border-r px-4 py-3 text-right font-medium">
                    {formatWeightKg(getLessBardanaForGrading(sizeMap, bagType))}
                  </TableCell>
                )}
                {rowIndex === 0 && (
                  <>
                    {isColVisibleInner('actualWeightOfPotato') && (
                      <TableCell
                        className="font-custom border-border border-r px-4 py-3 text-right align-top font-medium"
                        rowSpan={rowsPerPass}
                      >
                        {formatWeightKg(
                          getActualWeightOfPotato(pass.orderDetails)
                        )}
                      </TableCell>
                    )}
                    {isColVisibleInner('wastage') && (
                      <TableCell
                        className="font-custom border-border border-r px-4 py-3 text-right align-top font-medium"
                        rowSpan={rowsPerPass}
                      >
                        {formatWeightKg(getWastage(refs, pass.orderDetails))}
                      </TableCell>
                    )}
                    {isColVisibleInner('wastagePercent') && (
                      <TableCell
                        className="font-custom border-border border-r px-4 py-3 text-right align-top font-medium"
                        rowSpan={rowsPerPass}
                      >
                        {(() => {
                          const pct = getWastagePercent(
                            refs,
                            pass.orderDetails
                          );
                          return pct !== undefined ? `${pct}%` : '—';
                        })()}
                      </TableCell>
                    )}
                    {isColVisibleInner('amountPayable') && (
                      <TableCell
                        className="font-custom border-border border-r px-4 py-3 text-right align-top font-medium last:border-r-0"
                        rowSpan={rowsPerPass}
                      >
                        {formatAmountPayable(
                          getAmountPayable(pass.orderDetails, pass.variety)
                        )}
                      </TableCell>
                    )}
                  </>
                )}
              </TableRow>
            );
          }
        }
      }
      return rows;
    }, [
      sortedAndGroupedPasses,
      groupByVariety,
      totalVisibleCols,
      visibleIncomingCount,
      visibleSpannedTotalColsCount,
      filteredGradingPasses,
      columnVisibility,
    ]);

    if (isLoading) {
      return (
        <Card className="overflow-hidden rounded-xl border shadow-sm">
          <CardHeader className="bg-muted/30 border-b py-4">
            <CardTitle className="font-custom text-lg font-semibold">
              Grading Gate Pass Details
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4">
            <p className="font-custom text-muted-foreground py-8 text-center text-sm">
              Loading…
            </p>
          </CardContent>
        </Card>
      );
    }

    if (!gradingPasses.length) {
      return (
        <Card className="overflow-hidden rounded-xl border shadow-sm">
          <CardHeader className="bg-muted/30 border-b py-4">
            <CardTitle className="font-custom text-lg font-semibold">
              Grading Gate Pass Details
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4">
            <Empty className="font-custom">
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <ClipboardList className="size-6" />
                </EmptyMedia>
                <EmptyTitle>No grading gate passes</EmptyTitle>
              </EmptyHeader>
            </Empty>
          </CardContent>
        </Card>
      );
    }

    return (
      <>
        <Card className="overflow-hidden rounded-xl border shadow-sm">
          <CardHeader className="bg-muted/30 border-b py-4">
            <div className="flex flex-wrap items-end justify-between gap-x-4 gap-y-3">
              <div className="flex flex-wrap items-end gap-x-4 gap-y-3">
                <DatePicker
                  id="farmer-profile-grading-from"
                  label="From"
                  value={fromDate}
                  onChange={setFromDate}
                  compact
                />
                <DatePicker
                  id="farmer-profile-grading-to"
                  label="To"
                  value={toDate}
                  onChange={setToDate}
                  compact
                />
                <div className="flex h-10 items-center gap-2">
                  <Button
                    variant="default"
                    size="sm"
                    className="font-custom focus-visible:ring-primary h-10 min-h-10 rounded-lg px-4 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
                    onClick={handleApplyDates}
                    disabled={!fromDate && !toDate}
                  >
                    Apply
                  </Button>
                  {(fromDate ||
                    toDate ||
                    appliedRange.dateFrom ||
                    appliedRange.dateTo) && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="font-custom focus-visible:ring-primary h-10 min-h-10 rounded-lg px-4 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
                      onClick={handleClearDates}
                    >
                      Clear
                    </Button>
                  )}
                </div>
                <Button
                  variant={groupByVariety ? 'default' : 'outline'}
                  size="sm"
                  className="font-custom focus-visible:ring-primary h-10 min-h-10 rounded-lg px-4 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
                  onClick={() => setGroupByVariety((v) => !v)}
                >
                  Group by variety
                </Button>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      className="font-custom border-border text-muted-foreground hover:border-primary/40 hover:text-primary focus-visible:ring-primary h-10 min-h-10 rounded-lg transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
                    >
                      <Settings2 className="mr-2 h-4 w-4" />
                      Columns
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent
                    align="end"
                    className="max-h-[min(70vh,24rem)] w-[220px] overflow-y-auto"
                  >
                    {[
                      ...INCOMING_COLUMN_IDS,
                      ...GRADING_FIXED_COLUMN_IDS,
                      ...BAG_SIZE_COLUMN_IDS,
                      ...LAST_COLUMN_IDS,
                    ].map((id) => (
                      <DropdownMenuCheckboxItem
                        key={id}
                        className="font-custom capitalize"
                        checked={isColVisible(id)}
                        onCheckedChange={(checked) =>
                          setColumnVisibility((prev) => ({
                            ...prev,
                            [id]: checked,
                          }))
                        }
                        onSelect={(e) => e.preventDefault()}
                      >
                        {FARMER_GRADING_COLUMN_LABELS[id] ?? id}
                      </DropdownMenuCheckboxItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
              <Button
                variant="default"
                size="sm"
                className="font-custom focus-visible:ring-primary h-10 min-h-10 w-full shrink-0 gap-2 rounded-lg px-4 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 sm:w-auto"
                onClick={handleViewReport}
                disabled={isGeneratingPdf}
                aria-label="View report"
              >
                <FileDown className="h-4 w-4 shrink-0" />
                {isGeneratingPdf ? 'Generating…' : 'View Report'}
              </Button>
              <Button
                variant="default"
                size="sm"
                className="font-custom h-10 min-h-10 w-full shrink-0 gap-2 rounded-lg bg-blue-600 px-4 text-white hover:bg-blue-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2 sm:w-auto"
                onClick={handleOpenAccountingReportDialog}
                disabled={isGeneratingPdf}
                aria-label="Accounting report"
              >
                <FileDown className="h-4 w-4 shrink-0" />
                Accounting Report
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="border-border bg-card font-custom overflow-x-auto text-sm shadow-sm">
              <Table className="border-collapse">
                <TableHeader>
                  <TableRow className="border-border bg-muted/60 hover:bg-muted/60 border-b-2">
                    {isColVisible('systemIncomingNo') && (
                      <TableHead className="font-custom border-border border-r px-4 py-3 text-right font-semibold">
                        <div className="flex items-center justify-end gap-1">
                          <span className="font-custom font-semibold">
                            System incoming no.
                          </span>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="font-custom focus-visible:ring-primary h-8 w-8 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
                                aria-label="System incoming no. column options"
                              >
                                <MoreVertical className="h-4 w-4 text-gray-600" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="start">
                              <DropdownMenuItem
                                onClick={() => {
                                  setSortColumn('systemIncomingNo');
                                  setSortDirection('asc');
                                }}
                              >
                                Sort ascending
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => {
                                  setSortColumn('systemIncomingNo');
                                  setSortDirection('desc');
                                }}
                              >
                                Sort descending
                              </DropdownMenuItem>
                              {sortColumn === 'systemIncomingNo' && (
                                <DropdownMenuItem
                                  onClick={() => setSortColumn(null)}
                                >
                                  Clear sort
                                </DropdownMenuItem>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </TableHead>
                    )}
                    {isColVisible('manualIncomingNo') && (
                      <TableHead className="font-custom border-border border-r px-4 py-3 text-right font-semibold">
                        <div className="flex items-center justify-end gap-1">
                          <span className="font-custom font-semibold">
                            Manual incoming no.
                          </span>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="font-custom focus-visible:ring-primary h-8 w-8 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
                                aria-label="Manual incoming no. column options"
                              >
                                <MoreVertical className="h-4 w-4 text-gray-600" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="start">
                              <DropdownMenuItem
                                onClick={() => {
                                  setSortColumn('manualIncomingNo');
                                  setSortDirection('asc');
                                }}
                              >
                                Sort ascending
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => {
                                  setSortColumn('manualIncomingNo');
                                  setSortDirection('desc');
                                }}
                              >
                                Sort descending
                              </DropdownMenuItem>
                              {sortColumn === 'manualIncomingNo' && (
                                <DropdownMenuItem
                                  onClick={() => setSortColumn(null)}
                                >
                                  Clear sort
                                </DropdownMenuItem>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </TableHead>
                    )}
                    {isColVisible('incomingDate') && (
                      <TableHead className="font-custom border-border border-r px-4 py-3 font-semibold">
                        <div className="flex items-center gap-1">
                          <span className="font-custom font-semibold">
                            Incoming date
                          </span>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="font-custom focus-visible:ring-primary h-8 w-8 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
                                aria-label="Incoming date column options"
                              >
                                <MoreVertical className="h-4 w-4 text-gray-600" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="start">
                              <DropdownMenuItem
                                onClick={() => {
                                  setSortColumn('incomingDate');
                                  setSortDirection('asc');
                                }}
                              >
                                Sort ascending
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => {
                                  setSortColumn('incomingDate');
                                  setSortDirection('desc');
                                }}
                              >
                                Sort descending
                              </DropdownMenuItem>
                              {sortColumn === 'incomingDate' && (
                                <DropdownMenuItem
                                  onClick={() => setSortColumn(null)}
                                >
                                  Clear sort
                                </DropdownMenuItem>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </TableHead>
                    )}
                    {isColVisible('store') && (
                      <TableHead className="font-custom border-border border-r px-4 py-3 font-semibold">
                        Store
                      </TableHead>
                    )}
                    {isColVisible('truckNumber') && (
                      <TableHead className="font-custom border-border border-r px-4 py-3 font-semibold">
                        Truck number
                      </TableHead>
                    )}
                    {isColVisible('variety') && (
                      <TableHead className="font-custom border-border border-r px-4 py-3 font-semibold">
                        <div className="flex items-center gap-1">
                          <span className="font-custom font-semibold">
                            Variety
                          </span>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="font-custom focus-visible:ring-primary h-8 w-8 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
                                aria-label="Variety column options"
                              >
                                <MoreVertical className="h-4 w-4 text-gray-600" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="start">
                              <DropdownMenuItem
                                onClick={() => setGroupByVariety((v) => !v)}
                              >
                                {groupByVariety
                                  ? 'Ungroup by Variety'
                                  : 'Group by Variety'}
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </TableHead>
                    )}
                    {isColVisible('bagsReceived') && (
                      <TableHead className="font-custom border-border border-r px-4 py-3 text-right font-semibold">
                        Bags received
                      </TableHead>
                    )}
                    {isColVisible('totalBagsReceived') && (
                      <TableHead className="font-custom border-border border-r px-4 py-3 text-right font-semibold">
                        Total bags received
                      </TableHead>
                    )}
                    {isColVisible('weightSlipNo') && (
                      <TableHead className="font-custom border-border border-r px-4 py-3 font-semibold">
                        Weight slip no.
                      </TableHead>
                    )}
                    {isColVisible('grossWeightKg') && (
                      <TableHead className="font-custom border-border border-r px-4 py-3 text-right font-semibold">
                        Gross weight (kg)
                      </TableHead>
                    )}
                    {isColVisible('totalGrossKg') && (
                      <TableHead className="font-custom border-border border-r px-4 py-3 text-right font-semibold">
                        Total gross (kg)
                      </TableHead>
                    )}
                    {isColVisible('tareWeightKg') && (
                      <TableHead className="font-custom border-border border-r px-4 py-3 text-right font-semibold">
                        Tare weight (kg)
                      </TableHead>
                    )}
                    {isColVisible('totalTareKg') && (
                      <TableHead className="font-custom border-border border-r px-4 py-3 text-right font-semibold">
                        Total tare (kg)
                      </TableHead>
                    )}
                    {isColVisible('netWeightKg') && (
                      <TableHead className="font-custom border-border border-r px-4 py-3 text-right font-semibold">
                        Net weight (kg)
                      </TableHead>
                    )}
                    {isColVisible('totalNetKg') && (
                      <TableHead className="font-custom border-border border-r px-4 py-3 text-right font-semibold">
                        Total net (kg)
                      </TableHead>
                    )}
                    {isColVisible('lessBardanaKg') && (
                      <TableHead className="font-custom border-border border-r px-4 py-3 text-right font-semibold">
                        Less bardana (kg)
                      </TableHead>
                    )}
                    {isColVisible('totalLessBardanaKg') && (
                      <TableHead className="font-custom border-border border-r px-4 py-3 text-right font-semibold">
                        Total less bardana (kg)
                      </TableHead>
                    )}
                    {isColVisible('actualWeightKg') && (
                      <TableHead className="font-custom border-border border-r-primary border-r-2 border-dashed px-4 py-3 text-right font-semibold">
                        Actual weight (kg)
                      </TableHead>
                    )}
                    {isColVisible('gradingGatePassNo') && (
                      <TableHead className="font-custom border-border border-r px-4 py-3 text-right font-semibold">
                        <div className="flex items-center justify-end gap-1">
                          <span className="font-custom font-semibold">
                            Grading GP no.
                          </span>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="font-custom focus-visible:ring-primary h-8 w-8 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
                                aria-label="Grading GP no. column options"
                              >
                                <MoreVertical className="h-4 w-4 text-gray-600" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="start">
                              <DropdownMenuItem
                                onClick={() => {
                                  setSortColumn('gradingGatePassNo');
                                  setSortDirection('asc');
                                }}
                              >
                                Sort ascending
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => {
                                  setSortColumn('gradingGatePassNo');
                                  setSortDirection('desc');
                                }}
                              >
                                Sort descending
                              </DropdownMenuItem>
                              {sortColumn === 'gradingGatePassNo' && (
                                <DropdownMenuItem
                                  onClick={() => setSortColumn(null)}
                                >
                                  Clear sort
                                </DropdownMenuItem>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </TableHead>
                    )}
                    {isColVisible('gradingManualNo') && (
                      <TableHead className="font-custom border-border border-r px-4 py-3 text-right font-semibold">
                        <div className="flex items-center justify-end gap-1">
                          <span className="font-custom font-semibold">
                            Grading manual no.
                          </span>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="font-custom focus-visible:ring-primary h-8 w-8 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
                                aria-label="Grading manual no. column options"
                              >
                                <MoreVertical className="h-4 w-4 text-gray-600" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="start">
                              <DropdownMenuItem
                                onClick={() => {
                                  setSortColumn('gradingManualNo');
                                  setSortDirection('asc');
                                }}
                              >
                                Sort ascending
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => {
                                  setSortColumn('gradingManualNo');
                                  setSortDirection('desc');
                                }}
                              >
                                Sort descending
                              </DropdownMenuItem>
                              {sortColumn === 'gradingManualNo' && (
                                <DropdownMenuItem
                                  onClick={() => setSortColumn(null)}
                                >
                                  Clear sort
                                </DropdownMenuItem>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </TableHead>
                    )}
                    {isColVisible('gradingDate') && (
                      <TableHead className="font-custom border-border border-r px-4 py-3 font-semibold">
                        <div className="flex items-center gap-1">
                          <span className="font-custom font-semibold">
                            Grading date
                          </span>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="font-custom focus-visible:ring-primary h-8 w-8 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
                                aria-label="Grading date column options"
                              >
                                <MoreVertical className="h-4 w-4 text-gray-600" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="start">
                              <DropdownMenuItem
                                onClick={() => {
                                  setSortColumn('gradingDate');
                                  setSortDirection('asc');
                                }}
                              >
                                Sort ascending
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => {
                                  setSortColumn('gradingDate');
                                  setSortDirection('desc');
                                }}
                              >
                                Sort descending
                              </DropdownMenuItem>
                              {sortColumn === 'gradingDate' && (
                                <DropdownMenuItem
                                  onClick={() => setSortColumn(null)}
                                >
                                  Clear sort
                                </DropdownMenuItem>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </TableHead>
                    )}
                    {isColVisible('postGradingBags') && (
                      <TableHead className="font-custom border-border border-r px-4 py-3 text-right font-semibold">
                        Post grading bags
                      </TableHead>
                    )}
                    {isColVisible('type') && (
                      <TableHead className="font-custom border-border border-r px-4 py-3 font-semibold">
                        Type
                      </TableHead>
                    )}
                    {visibleBagSizes.map((size) => {
                      const sizeId = BAG_SIZE_ORDER_LABELS[size] ?? size;
                      return (
                        isColVisible(sizeId) && (
                          <TableHead
                            key={size}
                            className="font-custom border-border border-r px-4 py-3 text-right font-semibold"
                          >
                            {sizeId}
                          </TableHead>
                        )
                      );
                    })}
                    {isColVisible('weightReceivedAfterGrading') && (
                      <TableHead className="font-custom border-border border-r px-4 py-3 text-right font-semibold">
                        Weight Received After Grading
                      </TableHead>
                    )}
                    {isColVisible('lessBardanaForGrading') && (
                      <TableHead className="font-custom border-border border-r px-4 py-3 text-right font-semibold">
                        Less bardana for grading
                      </TableHead>
                    )}
                    {isColVisible('actualWeightOfPotato') && (
                      <TableHead className="font-custom border-border border-r px-4 py-3 text-right font-semibold">
                        Actual weight of potato
                      </TableHead>
                    )}
                    {isColVisible('wastage') && (
                      <TableHead className="font-custom border-border border-r px-4 py-3 text-right font-semibold">
                        Wastage
                      </TableHead>
                    )}
                    {isColVisible('wastagePercent') && (
                      <TableHead className="font-custom border-border border-r px-4 py-3 text-right font-semibold">
                        Wastage %
                      </TableHead>
                    )}
                    {isColVisible('amountPayable') && (
                      <TableHead className="font-custom border-border border-r px-4 py-3 text-right font-semibold last:border-r-0">
                        Amount Payable
                      </TableHead>
                    )}
                  </TableRow>
                </TableHeader>
                <TableBody className="order [&_tr]:border-b [&_tr:last-child]:border-b">
                  {tableBodyRows}
                  {filteredGradingPasses.length > 0 && (
                    <TableRow className="border-border bg-muted/40 text-primary font-semibold">
                      {visibleFirstSevenCount > 0 && (
                        <TableCell
                          className="font-custom border-border border-r px-4 py-3 text-right font-bold"
                          colSpan={visibleFirstSevenCount}
                        >
                          Total
                        </TableCell>
                      )}
                      {isColVisible('totalBagsReceived') && (
                        <TableCell className="font-custom border-border border-r px-4 py-3 text-right font-bold">
                          {totalIncomingBags}
                        </TableCell>
                      )}
                      {isColVisible('weightSlipNo') && (
                        <TableCell className="font-custom border-border border-r px-4 py-3">
                          —
                        </TableCell>
                      )}
                      {isColVisible('grossWeightKg') && (
                        <TableCell className="font-custom border-border border-r px-4 py-3 text-right">
                          —
                        </TableCell>
                      )}
                      {isColVisible('totalGrossKg') && (
                        <TableCell className="font-custom border-border border-r px-4 py-3 text-right font-bold">
                          {formatWeightKg(totalIncomingGrossKg)}
                        </TableCell>
                      )}
                      {isColVisible('tareWeightKg') && (
                        <TableCell className="font-custom border-border border-r px-4 py-3 text-right">
                          —
                        </TableCell>
                      )}
                      {isColVisible('totalTareKg') && (
                        <TableCell className="font-custom border-border border-r px-4 py-3 text-right font-bold">
                          {formatWeightKg(totalIncomingTareKg)}
                        </TableCell>
                      )}
                      {isColVisible('netWeightKg') && (
                        <TableCell className="font-custom border-border border-r px-4 py-3 text-right">
                          —
                        </TableCell>
                      )}
                      {isColVisible('totalNetKg') && (
                        <TableCell className="font-custom border-border border-r px-4 py-3 text-right font-bold">
                          {formatWeightKg(totalIncomingNetKg)}
                        </TableCell>
                      )}
                      {isColVisible('lessBardanaKg') && (
                        <TableCell className="font-custom border-border border-r px-4 py-3 text-right">
                          —
                        </TableCell>
                      )}
                      {isColVisible('totalLessBardanaKg') && (
                        <TableCell className="font-custom border-border border-r px-4 py-3 text-right font-bold">
                          {formatWeightKg(totalIncomingBardanaKg)}
                        </TableCell>
                      )}
                      {isColVisible('actualWeightKg') && (
                        <TableCell className="font-custom border-border border-r-primary border-r-2 border-dashed px-4 py-3 text-right font-bold">
                          {formatWeightKg(totalIncomingActualKg)}
                        </TableCell>
                      )}
                      {isColVisible('gradingGatePassNo') && (
                        <TableCell className="font-custom border-border border-r px-4 py-3 text-right">
                          —
                        </TableCell>
                      )}
                      {isColVisible('gradingManualNo') && (
                        <TableCell className="font-custom border-border border-r px-4 py-3 text-right">
                          —
                        </TableCell>
                      )}
                      {isColVisible('gradingDate') && (
                        <TableCell className="font-custom border-border border-r px-4 py-3">
                          —
                        </TableCell>
                      )}
                      {isColVisible('postGradingBags') && (
                        <TableCell className="font-custom border-border border-r px-4 py-3 text-right font-bold">
                          {totalPostGradingBags}
                        </TableCell>
                      )}
                      {isColVisible('type') && (
                        <TableCell className="font-custom border-border border-r px-4 py-3">
                          —
                        </TableCell>
                      )}
                      {visibleBagSizes.map((size) => {
                        const sizeId = BAG_SIZE_ORDER_LABELS[size] ?? size;
                        return (
                          isColVisible(sizeId) && (
                            <TableCell
                              key={`total-${size}`}
                              className="font-custom border-border border-r px-4 py-3 text-right font-bold"
                            >
                              {perSizeTotals.get(size) ?? 0}
                            </TableCell>
                          )
                        );
                      })}
                      {isColVisible('weightReceivedAfterGrading') && (
                        <TableCell className="font-custom border-border border-r px-4 py-3 text-right font-bold">
                          {formatWeightKg(totalWeightReceivedAfterGradingKg)}
                        </TableCell>
                      )}
                      {isColVisible('lessBardanaForGrading') && (
                        <TableCell className="font-custom border-border border-r px-4 py-3 text-right font-bold">
                          {formatWeightKg(totalLessBardanaForGradingKg)}
                        </TableCell>
                      )}
                      {isColVisible('actualWeightOfPotato') && (
                        <TableCell className="font-custom border-border border-r px-4 py-3 text-right font-bold">
                          {formatWeightKg(totalActualPotatoKg)}
                        </TableCell>
                      )}
                      {isColVisible('wastage') && (
                        <TableCell className="font-custom border-border border-r px-4 py-3 text-right font-bold">
                          {formatWeightKg(totalWastageKg)}
                        </TableCell>
                      )}
                      {isColVisible('wastagePercent') && (
                        <TableCell className="font-custom border-border border-r px-4 py-3 text-right font-bold">
                          {totalWastagePercent !== undefined
                            ? `${totalWastagePercent}%`
                            : '—'}
                        </TableCell>
                      )}
                      {isColVisible('amountPayable') && (
                        <TableCell className="font-custom border-border border-r px-4 py-3 text-right font-bold last:border-r-0">
                          {formatAmountPayable(totalAmountPayable)}
                        </TableCell>
                      )}
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        <AccountingReportGatePassDialog
          open={accountingReportDialogOpen}
          onOpenChange={setAccountingReportDialogOpen}
          rows={accountingReportDialogRows}
          selectedPassIds={selectedGradingPassIdsForAccounting}
          onSelectionChange={setSelectedGradingPassIdsForAccounting}
          onSelectAll={() =>
            setSelectedGradingPassIdsForAccounting(
              new Set(filteredGradingPasses.map((p) => p._id))
            )
          }
          onDeselectAll={() =>
            setSelectedGradingPassIdsForAccounting(new Set())
          }
          onGenerate={() =>
            handleAccountingReportGenerate(selectedGradingPassIdsForAccounting)
          }
          onDownloadExcel={handleAccountingReportDownloadExcel}
          isGeneratingPdf={isGeneratingPdf}
        />
      </>
    );
  }
);
