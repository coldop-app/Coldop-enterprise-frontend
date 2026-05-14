import type { NikasiGatePassItem } from '@/services/store-admin/nikasi-gate-pass/useGetNikasiGatePasses';
import type {
  DispatchLedgerNikasiGatePass,
  DispatchLedgerNikasiGatePassesLedger,
} from '@/types/dispatch-ledger';

/** Adapts API gate passes for `NikasiVoucherCard` (daybook shape). */
export function toNikasiGatePassItem(
  gatePass: DispatchLedgerNikasiGatePass,
  ledger: DispatchLedgerNikasiGatePassesLedger | null
): NikasiGatePassItem {
  return {
    _id: gatePass._id,
    farmerStorageLinkId: gatePass.farmerStorageLinkId,
    dispatchLedgerId: ledger
      ? {
          _id: ledger._id,
          name: ledger.name,
          address: ledger.address,
        }
      : gatePass.dispatchLedgerId,
    createdBy: gatePass.createdBy,
    gatePassNo: gatePass.gatePassNo,
    manualGatePassNumber: gatePass.manualGatePassNumber,
    isInternalTransfer: gatePass.isInternalTransfer,
    date: gatePass.date,
    from: gatePass.from,
    to: gatePass.to,
    bagSize: gatePass.bagSize,
    remarks: gatePass.remarks,
    truckNumber: gatePass.truckNumber,
    netWeight: gatePass.netWeight,
    averageWeightPerBag: gatePass.averageWeightPerBag,
    createdAt: gatePass.createdAt,
    updatedAt: gatePass.updatedAt,
    __v: gatePass.__v,
  };
}
