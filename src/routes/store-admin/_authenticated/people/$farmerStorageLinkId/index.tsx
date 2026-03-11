import { useCallback, useMemo, useState } from 'react';
import type { IncomingVoucherData } from '@/components/daybook/vouchers/types';
import {
  createFileRoute,
  useParams,
  useRouterState,
} from '@tanstack/react-router';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Hash, Package, Edit, FileSpreadsheet, FileText } from 'lucide-react';
import type { FarmerStorageLink } from '@/types/farmer';
import { useGetFarmerStorageLinkVouchers } from '@/services/store-admin/people/useGetFarmerStorageLinkVouchers';
import type { PassVoucherData } from '@/components/daybook/vouchers';
import type { GradingOrderDetailRow } from '@/components/daybook/vouchers/types';
import type { StockLedgerRow } from '@/components/pdf/StockLedgerPdf';
import { Spinner } from '@/components/ui/spinner';
import { downloadStockLedgerExcel } from '@/utils/stockLedgerExcel';

export const Route = createFileRoute(
  '/store-admin/_authenticated/people/$farmerStorageLinkId/'
)({
  component: PeopleDetailPage,
});

function PeopleDetailPage() {
  const { farmerStorageLinkId } = useParams({ from: Route.id });
  const link = useRouterState({
    select: (state) =>
      (state.location.state as { link?: FarmerStorageLink } | undefined)?.link,
  });

  const { data: vouchersData } =
    useGetFarmerStorageLinkVouchers(farmerStorageLinkId);

  const daybook = useMemo(
    () => vouchersData?.daybook ?? [],
    [vouchersData?.daybook]
  );

  const stockLedgerRows: StockLedgerRow[] = useMemo(() => {
    return daybook.map((entry, index) => {
      const inc = entry.incoming as IncomingVoucherData & { date?: string };
      const bags = entry.summaries?.totalBagsIncoming ?? inc.bagsReceived ?? 0;
      const ws = inc.weightSlip;
      const gross = ws?.grossWeightKg;
      const tare = ws?.tareWeightKg;
      const net =
        gross != null && tare != null && !Number.isNaN(gross - tare)
          ? gross - tare
          : undefined;

      const gradingPasses = (entry.gradingPasses ?? []) as PassVoucherData[];
      /** Use initial quantity for report (at time of grading), not current quantity. */
      const postGradingBags = gradingPasses.reduce(
        (sum, pass) =>
          sum +
          (pass.orderDetails ?? []).reduce(
            (s, o) => s + (o.initialQuantity ?? 0),
            0
          ),
        0
      );
      const bagType = (() => {
        for (const pass of gradingPasses) {
          const details = (pass.orderDetails ?? []) as GradingOrderDetailRow[];
          const withQty = details.find((d) => (d.initialQuantity ?? 0) > 0);
          if (withQty?.bagType) return withQty.bagType;
          if (details[0]?.bagType) return details[0].bagType;
        }
        return undefined;
      })();

      const sizeBagsJute: Record<string, number> = {};
      const sizeBagsLeno: Record<string, number> = {};
      const sizeWeightPerBagJute: Record<string, number> = {};
      const sizeWeightPerBagLeno: Record<string, number> = {};
      for (const pass of gradingPasses) {
        const details = (pass.orderDetails ?? []) as GradingOrderDetailRow[];
        for (const d of details) {
          if (d.size == null || (d.initialQuantity ?? 0) <= 0) continue;
          const typeKey = d.bagType?.toUpperCase();
          const qty = d.initialQuantity ?? 0;
          const weightKg = d.weightPerBagKg;
          if (typeKey === 'JUTE') {
            sizeBagsJute[d.size] = (sizeBagsJute[d.size] ?? 0) + qty;
            if (
              weightKg != null &&
              !Number.isNaN(weightKg) &&
              sizeWeightPerBagJute[d.size] == null
            ) {
              sizeWeightPerBagJute[d.size] = weightKg;
            }
          } else if (typeKey === 'LENO') {
            sizeBagsLeno[d.size] = (sizeBagsLeno[d.size] ?? 0) + qty;
            if (
              weightKg != null &&
              !Number.isNaN(weightKg) &&
              sizeWeightPerBagLeno[d.size] == null
            ) {
              sizeWeightPerBagLeno[d.size] = weightKg;
            }
          }
        }
      }

      const hasJute = Object.keys(sizeBagsJute).length > 0;
      const hasLeno = Object.keys(sizeBagsLeno).length > 0;

      /** Variety from first grading pass (for Amount Payable buy-back rate). */
      const variety = gradingPasses
        .find((p) => p.variety?.trim())
        ?.variety?.trim();

      /** Grading gate pass number(s) for PDF table (comma-separated if multiple). */
      const gradingGatePassNo =
        gradingPasses.length > 0
          ? gradingPasses
              .map((p) => p.gatePassNo)
              .filter((n) => n != null && !Number.isNaN(Number(n)))
              .join(', ')
          : undefined;

      /** Manual gate pass number(s) for grading voucher(s) (comma-separated if multiple). */
      const manualGradingGatePassNo =
        gradingPasses.length > 0
          ? gradingPasses
              .map((p) => p.manualGatePassNumber)
              .filter((n) => n != null && !Number.isNaN(Number(n)))
              .join(', ')
          : undefined;

      /** Grading gate pass date from first grading pass (when available). */
      const gradingGatePassDate = gradingPasses[0]?.date;

      return {
        serialNo: index + 1,
        date: inc.date,
        incomingGatePassNo: inc.gatePassNo ?? '—',
        manualIncomingVoucherNo: inc.manualGatePassNumber,
        gradingGatePassNo,
        manualGradingGatePassNo,
        gradingGatePassDate,
        store: 'JICSPL- Bazpur',
        truckNumber: inc.truckNumber,
        bagsReceived: bags,
        weightSlipNumber: ws?.slipNumber,
        grossWeightKg: gross,
        tareWeightKg: tare,
        netWeightKg: net,
        postGradingBags: gradingPasses.length > 0 ? postGradingBags : undefined,
        bagType,
        sizeBagsJute: hasJute ? sizeBagsJute : undefined,
        sizeBagsLeno: hasLeno ? sizeBagsLeno : undefined,
        sizeWeightPerBagJute:
          hasJute && Object.keys(sizeWeightPerBagJute).length > 0
            ? sizeWeightPerBagJute
            : undefined,
        sizeWeightPerBagLeno:
          hasLeno && Object.keys(sizeWeightPerBagLeno).length > 0
            ? sizeWeightPerBagLeno
            : undefined,
        variety,
      };
    });
  }, [daybook]);

  const [isPdfOpening, setIsPdfOpening] = useState(false);
  const [stockLedgerDialogOpen, setStockLedgerDialogOpen] = useState(false);
  const openStockLedgerPdf = useCallback(() => {
    if (!link) return;
    const win = window.open('', '_blank');
    if (win) {
      win.document.write(
        '<html><body style="font-family:sans-serif;padding:2rem;text-align:center;color:#666;">Generating PDF…</body></html>'
      );
    }
    setIsPdfOpening(true);
    const farmerName = link.farmerId.name;
    Promise.all([
      import('@react-pdf/renderer'),
      import('@/components/pdf/StockLedgerPdf'),
    ])
      .then(([{ pdf }, { StockLedgerPdf: StockLedgerPdfComponent }]) => {
        return pdf(
          <StockLedgerPdfComponent
            farmerName={farmerName}
            rows={stockLedgerRows}
          />
        ).toBlob();
      })
      .then((blob) => {
        const url = URL.createObjectURL(blob);
        if (win) win.location.href = url;
        else window.location.href = url;
        setTimeout(() => URL.revokeObjectURL(url), 60_000);
      })
      .finally(() => setIsPdfOpening(false));
  }, [link, stockLedgerRows]);

  // Get initials for avatar
  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  if (!link) {
    return (
      <main className="mx-auto max-w-300 px-4 pt-6 pb-16 sm:px-8 sm:py-24">
        <p className="font-custom text-muted-foreground">Farmer not found.</p>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-7xl p-3 sm:p-4 lg:p-6">
      <div className="space-y-4 sm:space-y-6">
        {/* Enhanced Farmer info card */}
        <Card className="overflow-hidden rounded-2xl shadow-lg">
          <CardContent className="p-6 sm:p-8">
            <div className="space-y-8">
              {/* Header with Avatar and Name */}
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-4">
                  <Avatar className="h-20 w-20 shadow-lg sm:h-24 sm:w-24">
                    <AvatarFallback className="bg-primary text-primary-foreground text-2xl font-bold sm:text-3xl">
                      {getInitials(link.farmerId.name)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="space-y-2">
                    <h1 className="font-custom text-2xl font-bold tracking-tight sm:text-3xl">
                      {link.farmerId.name}
                    </h1>
                    {/* {link.isActive && (
                      <Badge variant="secondary" className="w-fit">
                        Active
                      </Badge>
                    )} */}
                    <Badge variant="secondary" className="w-fit">
                      <Hash />
                      {link.accountNumber}
                    </Badge>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-10 w-10 rounded-full"
                >
                  <Edit className="h-4 w-4" />
                </Button>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap gap-3">
                <Button
                  variant="default"
                  className="gap-2 rounded-xl"
                  disabled={isPdfOpening}
                  onClick={() => setStockLedgerDialogOpen(true)}
                >
                  {isPdfOpening ? (
                    <>
                      <Spinner className="h-4 w-4" />
                      Generating PDF…
                    </>
                  ) : (
                    <>
                      <Package className="h-4 w-4" />
                      View Stock Ledger
                    </>
                  )}
                </Button>
              </div>

              {/* Stock Ledger export dialog */}
              <Dialog
                open={stockLedgerDialogOpen}
                onOpenChange={setStockLedgerDialogOpen}
              >
                <DialogContent
                  className="font-custom sm:max-w-md"
                  showCloseButton={true}
                >
                  <DialogHeader>
                    <DialogTitle>Stock Ledger</DialogTitle>
                  </DialogHeader>
                  <p className="font-custom text-muted-foreground text-sm">
                    Choose how you want to view or download the stock ledger.
                  </p>
                  <DialogFooter className="gap-2 sm:gap-0">
                    <Button
                      variant="default"
                      className="gap-2"
                      disabled={isPdfOpening}
                      onClick={() => {
                        setStockLedgerDialogOpen(false);
                        openStockLedgerPdf();
                      }}
                    >
                      {isPdfOpening ? (
                        <>
                          <Spinner className="h-4 w-4" />
                          Generating…
                        </>
                      ) : (
                        <>
                          <FileText className="h-4 w-4" />
                          View PDF
                        </>
                      )}
                    </Button>
                    <Button
                      variant="outline"
                      className="gap-2"
                      onClick={() => {
                        if (!link) return;
                        setStockLedgerDialogOpen(false);
                        downloadStockLedgerExcel(
                          link.farmerId.name,
                          stockLedgerRows
                        );
                      }}
                    >
                      <FileSpreadsheet className="h-4 w-4" />
                      Download Excel
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
