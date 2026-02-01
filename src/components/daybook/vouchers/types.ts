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
  date?: string;
  variety?: string;
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

/** Shape of grading/storage/nikasi/outgoing pass from daybook API */
export interface PassVoucherData {
  _id?: string;
  gatePassNo?: number;
  date?: string;
  variety?: string;
  orderDetails?: OrderDetailRow[];
  from?: string;
  toField?: string;
  allocationStatus?: string;
  remarks?: string;
  /** Grading: createdBy/gradedBy */
  createdBy?: { name?: string };
  /** Storage/Nikasi: linked grading pass refs (legacy) */
  gradingGatePassIds?: Array<{ _id?: string; gatePassNo?: number }>;
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
