/** Weight slip (incoming) */
export interface WeightSlipData {
  slipNumber?: string;
  grossWeightKg?: number;
  tareWeightKg?: number;
}

/** Shape of incoming voucher from daybook API */
export interface IncomingVoucherData {
  _id?: string;
  gatePassNo?: number;
  manualGatePassNumber?: number;
  date?: string;
  variety?: string;
  location?: string;
  truckNumber?: string;
  bagsReceived?: number;
  status?: string;
  weightSlip?: WeightSlipData;
  remarks?: string;
  gradingSummary?: { totalGradedBags?: number };
  createdBy?: { name?: string };
}

/** Order detail row for grading (size, bagType, qty, weightPerBagKg) */
export interface GradingOrderDetailRow {
  size?: string;
  bagType?: string;
  currentQuantity?: number;
  initialQuantity?: number;
  weightPerBagKg?: number;
}

/** Order detail row for storage (chamber, floor, row, etc.) */
export interface StorageOrderDetailRow {
  size?: string;
  bagType?: string;
  currentQuantity?: number;
  initialQuantity?: number;
  weightPerBag?: number;
  chamber?: string;
  floor?: string;
  row?: string;
}

/** Incoming bag size row within a grading gate pass snapshot */
export interface IncomingBagSizeRow {
  size?: string;
  currentQuantity?: number;
  initialQuantity?: number;
}

/** Snapshot of a grading gate pass (material source for storage/nikasi) */
export interface GradingGatePassSnapshot {
  _id?: string;
  gatePassNo?: number;
  incomingBagSizes?: IncomingBagSizeRow[];
}

/** Order detail row for nikasi (quantityAvailable, quantityIssued) */
export interface NikasiOrderDetailRow {
  size?: string;
  gradingGatePassId?: string;
  quantityAvailable?: number;
  quantityIssued?: number;
}

/** Generic order detail for bag counts */
export interface OrderDetailRow {
  size?: string;
  currentQuantity?: number;
  initialQuantity?: number;
  quantityIssued?: number;
  quantityAvailable?: number;
}

/** One bag size row from GET /nikasi-gate-pass (new list API shape) */
export interface NikasiBagSizeRow {
  size?: string;
  variety?: string;
  quantityIssued?: number;
}

/** Shape of grading/storage/nikasi/outgoing pass from daybook API */
export interface PassVoucherData {
  _id?: string;
  gatePassNo?: number;
  manualGatePassNumber?: number;
  date?: string;
  variety?: string;
  orderDetails?: OrderDetailRow[];
  /** Nikasi list API: size/variety/quantityIssued per row */
  bagSize?: NikasiBagSizeRow[];
  from?: string;
  toField?: string;
  allocationStatus?: string;
  remarks?: string;
  /** Grading: createdBy/gradedBy; grader name when from list API */
  createdBy?: string | { name?: string };
  /** Grading list API: grader name (e.g. "Rama Jandu") */
  grader?: string;
  /** Storage/Nikasi: linked grading pass refs (IDs as string[] from bulk API or objects from list API) */
  gradingGatePassIds?: Array<string | { _id?: string; gatePassNo?: number }>;
  /** Storage/Nikasi: full snapshots of grading passes material was taken from */
  gradingGatePassSnapshots?: GradingGatePassSnapshot[];
}

export interface VoucherFarmerInfo {
  farmerName?: string;
  farmerAccount?: number;
}

/** Sum bags from orderDetails (currentQuantity or quantityIssued) */
export function totalBagsFromOrderDetails(
  orderDetails: OrderDetailRow[] | undefined
): number {
  if (!orderDetails?.length) return 0;
  return orderDetails.reduce(
    (sum, o) => sum + (o.currentQuantity ?? o.quantityIssued ?? 0),
    0
  );
}

/** Bag size row shape (e.g. storage gate pass bagSizes from API) */
export interface StorageBagSizeRow {
  size?: string;
  currentQuantity?: number;
  initialQuantity?: number;
  bagType?: string;
  chamber?: string;
  floor?: string;
  row?: string;
}

/** Sum bags from bagSizes (currentQuantity) */
export function totalBagsFromBagSizes(
  bagSizes: StorageBagSizeRow[] | undefined
): number {
  if (!bagSizes?.length) return 0;
  return bagSizes.reduce((sum, b) => sum + (b.currentQuantity ?? 0), 0);
}

/** Sum bags from nikasi bagSize (quantityIssued) – new GET /nikasi-gate-pass list shape */
export function totalBagsFromNikasiBagSizes(
  bagSize: NikasiBagSizeRow[] | undefined
): number {
  if (!bagSize?.length) return 0;
  return bagSize.reduce((sum, b) => sum + (b.quantityIssued ?? 0), 0);
}
