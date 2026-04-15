import { AccountingStockLedgerPdf } from '@/components/pdf/AccountingStockLedgerPdf';
import { prepareAccountingStockLedgerPdfData } from '@/components/pdf/accountingStockLedgerPdfPrepare';
import type { FarmerReportPdfSnapshot } from '@/components/pdf/farmer-report/farmer-report-pdf-types';
import type { StockLedgerRow } from '@/components/pdf/stockLedgerTypes';
import type { FarmerSeedEntryByStorageLink } from '@/types/farmer-seed';

export type FarmerStockLedgerPdfProps = {
  snapshot: FarmerReportPdfSnapshot;
  stockLedgerRows: StockLedgerRow[];
  farmerSeedEntries?: FarmerSeedEntryByStorageLink[] | null;
};

/**
 * Farmer Stock Ledger PDF: incoming details and summary by variety only
 * (no grading gate pass table).
 */
export function FarmerStockLedgerPdf({
  snapshot,
  stockLedgerRows,
  farmerSeedEntries = null,
}: FarmerStockLedgerPdfProps) {
  const prepared = prepareAccountingStockLedgerPdfData({
    snapshot: {
      ...snapshot,
      reportTitle: snapshot.reportTitle ?? 'Farmer Report',
    },
    stockLedgerRows,
    hideGradingPage: true,
    farmerSeedEntries,
  });
  return <AccountingStockLedgerPdf prepared={prepared} />;
}

export default FarmerStockLedgerPdf;
