import {
  AccountingStockLedgerPdf,
  type AccountingStockLedgerPdfProps,
} from '@/components/pdf/AccountingStockLedgerPdf';

export type FarmerStockLedgerPdfProps = AccountingStockLedgerPdfProps;

/**
 * Farmer Stock Ledger PDF: incoming details and summary by variety only
 * (no grading gate pass table).
 */
export function FarmerStockLedgerPdf({
  snapshot,
  stockLedgerRows,
}: FarmerStockLedgerPdfProps) {
  return (
    <AccountingStockLedgerPdf
      snapshot={{
        ...snapshot,
        reportTitle: snapshot.reportTitle ?? 'Farmer Report',
      }}
      stockLedgerRows={stockLedgerRows}
      hideGradingPage
    />
  );
}

export default FarmerStockLedgerPdf;
