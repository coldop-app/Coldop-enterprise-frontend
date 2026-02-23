import { Document, Page } from '@react-pdf/renderer';
import type {
  GradingGatePassReportDataFlat,
  GradingGatePassReportDataGrouped,
  GradingGatePassReportItem,
  GradingGatePassReportIncomingSummary,
} from '@/types/analytics';
import type { GradingGatePassIncomingGatePass } from '@/types/grading-gate-pass';
import type { StockLedgerRow } from '@/components/pdf/stockLedgerTypes';
import {
  StockLedgerMainTableOnly,
  sortRowsByGatePassNo,
  stockLedgerPageStyle,
} from '@/components/pdf/StockLedgerPdf';
import { GRADING_SIZES } from '@/components/forms/grading/constants';

export interface GradingGatePassReportPdfProps {
  companyName?: string;
  dateRangeLabel: string;
  data: GradingGatePassReportDataGrouped | GradingGatePassReportDataFlat;
}

function isGrouped(
  data: GradingGatePassReportDataGrouped | GradingGatePassReportDataFlat
): data is GradingGatePassReportDataGrouped {
  return Array.isArray(data) && data.length > 0 && 'gatePasses' in data[0];
}

function getFarmerName(pass: GradingGatePassReportItem): string {
  if (pass.farmerStorageLink?.farmerId?.name) {
    return pass.farmerStorageLink.farmerId.name;
  }
  const inc = pass.incomingGatePassId;
  if (inc && 'farmerStorageLinkId' in inc) {
    return (
      (inc as GradingGatePassIncomingGatePass).farmerStorageLinkId?.farmerId
        ?.name ?? '—'
    );
  }
  return '—';
}

function getIncomingGatePassNo(
  pass: GradingGatePassReportItem
): number | string {
  const inc = pass.incomingGatePassId;
  if (inc && 'gatePassNo' in inc) {
    return (inc as GradingGatePassReportIncomingSummary).gatePassNo ?? '—';
  }
  if (inc && 'gatePassNo' in inc) {
    return (inc as GradingGatePassIncomingGatePass).gatePassNo ?? '—';
  }
  return '—';
}

function getManualIncomingNo(
  pass: GradingGatePassReportItem
): number | string | undefined {
  const inc = pass.incomingGatePassId;
  if (inc && 'manualGatePassNumber' in inc) {
    return (inc as GradingGatePassReportIncomingSummary).manualGatePassNumber;
  }
  return undefined;
}

function getTruckNumber(pass: GradingGatePassReportItem): string {
  const inc = pass.incomingGatePassId;
  if (inc && 'truckNumber' in inc) {
    return (inc as GradingGatePassReportIncomingSummary).truckNumber ?? '—';
  }
  if (inc && 'truckNumber' in inc) {
    return (inc as GradingGatePassIncomingGatePass).truckNumber ?? '—';
  }
  return '—';
}

function getBagsReceived(pass: GradingGatePassReportItem): number {
  const inc = pass.incomingGatePassId;
  if (inc && 'bagsReceived' in inc) {
    return (inc as GradingGatePassReportIncomingSummary).bagsReceived ?? 0;
  }
  if (pass.orderDetails?.length) {
    return pass.orderDetails.reduce(
      (sum, d) => sum + (d.initialQuantity ?? d.currentQuantity ?? 0),
      0
    );
  }
  return 0;
}

function getGrossTareNet(pass: GradingGatePassReportItem): {
  grossWeightKg?: number;
  tareWeightKg?: number;
  netWeightKg?: number;
} {
  const inc = pass.incomingGatePassId;
  if (inc && 'grossWeightKg' in inc) {
    const s = inc as GradingGatePassReportIncomingSummary;
    return {
      grossWeightKg: s.grossWeightKg,
      netWeightKg: s.netWeightKg,
    };
  }
  return {};
}

/** Convert a grading report item to StockLedgerRow for the main table. */
function gradingReportItemToStockLedgerRow(
  pass: GradingGatePassReportItem,
  serialNo: number
): StockLedgerRow {
  const { grossWeightKg, tareWeightKg, netWeightKg } = getGrossTareNet(pass);
  const bagsReceived = getBagsReceived(pass);
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
    date: pass.date,
    incomingGatePassNo: getIncomingGatePassNo(pass),
    manualIncomingVoucherNo: getManualIncomingNo(pass),
    gradingGatePassNo: pass.gatePassNo,
    manualGradingGatePassNo: pass.manualGatePassNumber,
    store: getFarmerName(pass),
    truckNumber: getTruckNumber(pass),
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
  };
}

export function GradingGatePassReportPdf({
  companyName = 'Cold Storage',
  dateRangeLabel,
  data,
}: GradingGatePassReportPdfProps) {
  const pageStyle = stockLedgerPageStyle;

  if (isGrouped(data)) {
    return (
      <Document>
        {data.length === 0 ? (
          <Page size="A4" orientation="landscape" style={pageStyle}>
            <StockLedgerMainTableOnly
              title={`${companyName} — Grading (Initial) Gate Pass Report — ${dateRangeLabel}`}
              rows={[]}
              includeAmountPayable={false}
            />
          </Page>
        ) : (
          data.map((group) => {
            const rows: StockLedgerRow[] = group.gatePasses.map((pass, i) =>
              gradingReportItemToStockLedgerRow(pass, i + 1)
            );
            const sortedRows = sortRowsByGatePassNo(rows);
            return (
              <Page
                key={group.farmer._id}
                size="A4"
                orientation="landscape"
                style={pageStyle}
              >
                <StockLedgerMainTableOnly
                  title={group.farmer.name}
                  rows={sortedRows}
                  includeAmountPayable={false}
                />
              </Page>
            );
          })
        )}
      </Document>
    );
  }

  const flatRows: StockLedgerRow[] = (
    data as GradingGatePassReportDataFlat
  ).map((pass, i) => gradingReportItemToStockLedgerRow(pass, i + 1));
  const sortedRows = sortRowsByGatePassNo(flatRows);
  const title = `${companyName} — Grading (Initial) Gate Pass Report — ${dateRangeLabel}`;

  return (
    <Document>
      <Page size="A4" orientation="landscape" style={pageStyle}>
        <StockLedgerMainTableOnly
          title={title}
          rows={sortedRows}
          includeAmountPayable={false}
        />
      </Page>
    </Document>
  );
}
