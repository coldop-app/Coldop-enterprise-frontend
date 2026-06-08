import { useEffect, useRef, useState } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  ChevronDown,
  ChevronUp,
  Printer,
  User,
  Package,
  Pencil,
  Hash,
  MapPin,
  Phone,
  FileText,
  LayoutGrid,
  Ban,
  type LucideIcon,
} from 'lucide-react';
import type { StorageGatePassWithLink } from '@/types/storage-gate-pass';
import { cn } from '@/lib/utils';
import { useStore } from '@/stores/store';
import { usePermissionsStore } from '@/stores/usePermissionsStore';

function formatDateTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '--';

  return new Intl.DateTimeFormat('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

// Internal helper for elegant, consistent data display
const InfoBlock = ({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: string | number;
  icon?: LucideIcon;
}) => (
  <div className="flex flex-col gap-1">
    <span className="text-muted-foreground flex items-center gap-1 text-[10px] font-medium tracking-wide uppercase">
      {Icon && <Icon className="h-3 w-3 shrink-0" />}
      {label}
    </span>
    <span className="text-foreground truncate text-xs font-semibold sm:text-sm">
      {value}
    </span>
  </div>
);

interface StorageVoucherCardProps {
  gatePass: StorageGatePassWithLink;
}

export function StorageVoucherCard({ gatePass }: StorageVoucherCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const objectUrlRef = useRef<string | null>(null);
  const navigate = useNavigate();
  const coldStorageName = useStore(
    (state) => state.coldStorage?.name?.trim() || 'Cold Storage'
  );
  const canUpdateStorageGatePass = usePermissionsStore((state) =>
    state.hasPermission('storage-gate-pass', 'update')
  );

  const totalBags = gatePass.bagSizes.reduce(
    (sum, bag) => sum + bag.currentQuantity,
    0
  );
  const totalInitial = gatePass.bagSizes.reduce(
    (sum, bag) => sum + bag.initialQuantity,
    0
  );
  const isCancelledGatePass = totalBags === 0;

  const farmer = gatePass.farmerStorageLinkId.farmerId;
  const account = gatePass.farmerStorageLinkId.accountNumber;

  const handleEditClick = () => {
    if (!canUpdateStorageGatePass) return;

    navigate({
      to: '/store-admin/storage-gate-pass/edit',
      state: ((prev: Record<string, unknown>) => ({
        ...prev,
        storageGatePass: gatePass,
      })) as never,
    });
  };

  useEffect(() => {
    return () => {
      if (objectUrlRef.current) {
        URL.revokeObjectURL(objectUrlRef.current);
        objectUrlRef.current = null;
      }
    };
  }, []);

  const handlePrint = async () => {
    if (isGeneratingPdf) return;

    const previewTab = window.open('', '_blank');
    if (!previewTab) {
      window.alert(
        'Popup blocked by your browser. Please allow popups and try again.'
      );
      return;
    }

    previewTab.opener = null;
    previewTab.document.write(
      '<!doctype html><html><head><meta charset="utf-8" /><title>Generating PDF...</title></head><body style="font-family:Inter,system-ui,sans-serif;display:grid;place-items:center;min-height:100vh;background:#f8fafc">Generating PDF...</body></html>'
    );
    previewTab.document.close();
    setIsGeneratingPdf(true);

    try {
      await new Promise((resolve) => setTimeout(resolve, 50));
      const generatedAt = new Date().toLocaleString('en-IN');

      const [{ pdf }, ReactModule, { default: StorageGatePassPdf }] =
        await Promise.all([
          import('@react-pdf/renderer'),
          import('react'),
          import('./pdfs/storage-gate-pass-pdf'),
        ]);

      const document = ReactModule.createElement(StorageGatePassPdf, {
        coldStorageName,
        generatedAt,
        data: {
          gatePassNo: gatePass.gatePassNo,
          manualGatePassNumber: gatePass.manualGatePassNumber,
          date: gatePass.date,
          variety: gatePass.variety,
          farmerName: farmer?.name ?? '--',
          accountNumber:
            account != null && String(account).trim().length > 0
              ? `#${account}`
              : '--',
          remarks: gatePass.remarks ?? '',
          totalCurrent: totalBags,
          totalInitial,
          isCancelled: isCancelledGatePass,
          rows: gatePass.bagSizes,
        },
      });

      const blob = await pdf(document as Parameters<typeof pdf>[0]).toBlob();
      const nextUrl = URL.createObjectURL(blob);

      if (objectUrlRef.current) {
        URL.revokeObjectURL(objectUrlRef.current);
      }
      objectUrlRef.current = nextUrl;

      if (!previewTab.closed) {
        previewTab.location.replace(nextUrl);
      } else {
        window.open(nextUrl, '_blank');
      }
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Unknown error occurred';
      window.alert(`Failed to generate PDF: ${message}`);
      if (!previewTab.closed) {
        previewTab.close();
      }
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  return (
    <Card
      className={cn(
        'border-border/40 bg-card hover:border-primary/40 relative overflow-hidden rounded-xl pt-0 shadow-sm transition-all duration-200 ease-in-out hover:shadow-md',
        isCancelledGatePass &&
          'border-border/20 bg-muted/30 opacity-55 saturate-0'
      )}
    >
      {isCancelledGatePass ? (
        <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center">
          <div className="flex flex-col items-center gap-1">
            <div className="border-border/30 bg-background/40 rounded-full border p-3">
              <Ban className="text-muted-foreground/50 h-7 w-7" />
            </div>
            <span className="font-custom text-muted-foreground/60 text-[10px] tracking-[0.18em] uppercase">
              Null
            </span>
          </div>
        </div>
      ) : null}

      {/* --- Card Header --- */}
      <div
        className={cn(
          'bg-muted/15 border-border/50 flex flex-col justify-between gap-3 border-b px-3 pt-2 pb-3 sm:flex-row sm:items-start sm:px-4 sm:pt-3 sm:pb-4',
          isCancelledGatePass && 'bg-muted/30 border-border/30'
        )}
      >
        <div>
          <div className="flex flex-wrap items-center gap-2.5">
            <div className="bg-primary h-1.5 w-1.5 shrink-0 rounded-full" />
            <h3 className="text-foreground font-custom text-sm font-bold tracking-tight sm:text-base">
              SGP{' '}
              <span
                className={cn(
                  'text-primary',
                  isCancelledGatePass && 'text-muted-foreground'
                )}
              >
                #{gatePass.gatePassNo}
              </span>
            </h3>
            {gatePass.manualGatePassNumber != null && (
              <Badge
                variant="secondary"
                className="font-custom px-2 py-0.5 text-[10px] font-medium"
              >
                Manual #{gatePass.manualGatePassNumber}
              </Badge>
            )}
          </div>
          <p className="text-muted-foreground mt-1 text-[11px] sm:text-xs">
            {formatDateTime(gatePass.date)}
          </p>
        </div>

        <div className="flex shrink-0 items-center gap-1.5">
          <Badge
            variant="outline"
            className={cn(
              'bg-background font-custom px-2 py-0.5 text-[10px] font-medium',
              isCancelledGatePass &&
                'border-border/50 bg-muted/40 text-muted-foreground'
            )}
          >
            {totalBags.toLocaleString('en-IN')} Bags Total
          </Badge>
          {isCancelledGatePass ? (
            <Badge
              variant="secondary"
              className="font-custom border-border/60 bg-muted/40 text-muted-foreground px-2 py-0.5 text-[10px] font-medium"
            >
              Cancelled Gate Pass
            </Badge>
          ) : null}
        </div>
      </div>

      {/* --- Primary Info Grid --- */}
      <div className="px-3 py-3 sm:px-4 sm:py-4">
        <div className="grid grid-cols-2 gap-x-3 gap-y-3 sm:grid-cols-4 lg:grid-cols-5">
          <InfoBlock label="Farmer" value={farmer?.name ?? '--'} icon={User} />
          <InfoBlock
            label="Account"
            value={`#${account ?? '--'}`}
            icon={Hash}
          />
          <InfoBlock label="Variety" value={gatePass.variety} icon={Package} />
        </div>
      </div>

      {/* --- Action Bar --- */}
      <div className="bg-muted/10 border-border/50 flex items-center justify-between border-t px-3 py-2.5 sm:px-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setIsExpanded((prev: boolean) => !prev)}
          className="text-muted-foreground hover:text-foreground h-8 px-2 text-xs font-medium"
        >
          {isExpanded ? (
            <>
              <ChevronUp className="mr-1.5 h-3.5 w-3.5" /> Hide Details
            </>
          ) : (
            <>
              <ChevronDown className="mr-1.5 h-3.5 w-3.5" /> View Details
            </>
          )}
        </Button>

        <div className="flex items-center gap-1.5">
          {canUpdateStorageGatePass && (
            <Button
              variant="outline"
              size="sm"
              className="h-8 w-8 p-0"
              aria-label="Edit"
              onClick={handleEditClick}
            >
              <Pencil className="h-3.5 w-3.5" />
            </Button>
          )}
          <Button
            variant="outline"
            size="sm"
            className="h-8 w-8 p-0"
            onClick={handlePrint}
            disabled={isGeneratingPdf}
            aria-label={`Print storage gate pass ${gatePass.gatePassNo}`}
          >
            <Printer className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      {/* --- Expanded Details --- */}
      {isExpanded && (
        <div className="border-border/50 animate-in slide-in-from-top-2 fade-in border-t p-3 duration-200 sm:p-4">
          <div className="space-y-4">
            {/* Farmer Details Section */}
            <section>
              <h4 className="text-foreground flex items-center gap-2 text-xs font-semibold">
                <User className="text-primary h-4 w-4" />
                Farmer Information
              </h4>
              <div className="bg-muted/30 mt-2.5 grid grid-cols-1 gap-3 rounded-lg p-3 sm:grid-cols-2 lg:grid-cols-3">
                <InfoBlock label="Name" value={farmer?.name ?? '--'} />
                <InfoBlock label="Account Number" value={account ?? '--'} />
                <InfoBlock
                  label="Mobile"
                  value={farmer?.mobileNumber ?? '--'}
                  icon={Phone}
                />
                <div className="sm:col-span-2 lg:col-span-3">
                  <InfoBlock
                    label="Address"
                    value={farmer?.address ?? '--'}
                    icon={MapPin}
                  />
                </div>
              </div>
            </section>

            {/* Bag Details Table Section */}
            <section>
              <h4 className="text-foreground flex items-center gap-2 text-xs font-semibold">
                <LayoutGrid className="text-primary h-4 w-4" />
                Storage Bag Distribution
              </h4>
              <div className="border-border/50 mt-2.5 overflow-hidden rounded-lg border">
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[500px] text-left text-xs">
                    <thead className="bg-muted/50 text-muted-foreground text-[10px] font-semibold tracking-wide uppercase">
                      <tr>
                        <th className="px-3 py-2.5">Size</th>
                        <th className="px-3 py-2.5">Bag Type</th>
                        <th className="px-3 py-2.5">Location (Ch/Fl/Row)</th>
                        <th className="px-3 py-2.5 text-right">Current Qty</th>
                        <th className="px-3 py-2.5 text-right">Initial Qty</th>
                      </tr>
                    </thead>
                    <tbody className="divide-border/40 divide-y">
                      {gatePass.bagSizes.map((row, idx) => (
                        <tr
                          key={idx}
                          className="hover:bg-muted/20 transition-colors"
                        >
                          <td className="text-foreground px-3 py-2.5 font-medium">
                            {row.size}
                          </td>
                          <td className="text-muted-foreground px-3 py-2.5">
                            {row.bagType}
                          </td>
                          <td className="text-muted-foreground px-3 py-2.5">
                            {row.chamber} / {row.floor} / {row.row}
                          </td>
                          <td className="px-3 py-2.5 text-right font-medium">
                            {row.currentQuantity.toLocaleString('en-IN')}
                          </td>
                          <td className="text-muted-foreground px-3 py-2.5 text-right">
                            {row.initialQuantity.toLocaleString('en-IN')}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot className="bg-primary/5 border-primary/20 border-t-2">
                      <tr>
                        <td
                          className="text-primary px-3 py-2.5 font-bold"
                          colSpan={3}
                        >
                          Total Inventory
                        </td>
                        <td className="text-primary px-3 py-2.5 text-right font-bold">
                          {totalBags.toLocaleString('en-IN')}
                        </td>
                        <td className="text-primary px-3 py-2.5 text-right font-bold">
                          {totalInitial.toLocaleString('en-IN')}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>
            </section>

            {/* Remarks Section */}
            <section>
              <h4 className="text-foreground flex items-center gap-2 text-xs font-semibold">
                <FileText className="text-primary h-4 w-4" />
                Remarks
              </h4>
              <div className="bg-muted/30 mt-2.5 rounded-lg p-3">
                <p className="text-muted-foreground text-xs leading-relaxed">
                  {gatePass.remarks || '--'}
                </p>
              </div>
            </section>
          </div>
        </div>
      )}
    </Card>
  );
}

export default StorageVoucherCard;
