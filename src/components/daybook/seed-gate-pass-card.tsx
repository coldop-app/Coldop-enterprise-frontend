import { memo, useState } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import type { FarmerSeedEntryListItem } from '@/types/farmer-seed';
import { cn } from '@/lib/utils';
import {
  Ban,
  ChevronDown,
  ChevronUp,
  FileText,
  Pencil,
  Printer,
  ReceiptText,
  Sprout,
  User,
  type LucideIcon,
} from 'lucide-react';

/* -------------------------------------------------------------------------- */
/* Inline Sub-components                                                     */
/* -------------------------------------------------------------------------- */

interface InfoBlockProps {
  label: string;
  value: string | number;
  icon?: LucideIcon;
  valueClassName?: string;
}

const InfoBlock = memo(
  ({ label, value, icon: Icon, valueClassName }: InfoBlockProps) => (
    <div className="flex flex-col gap-1">
      <span className="text-muted-foreground font-custom flex items-center gap-1 text-[10px] font-medium tracking-wide uppercase">
        {Icon && <Icon className="h-3 w-3" />}
        {label}
      </span>
      <span
        className={`text-foreground font-custom truncate text-xs font-semibold sm:text-sm ${valueClassName ?? ''}`}
      >
        {value}
      </span>
    </div>
  )
);

interface SeedBagSizeRow {
  name: string;
  quantity: number;
  rate: number;
  acres: number;
  amount: number;
  received: number | null;
}

interface SeedCardViewModel {
  gatePassNo: string;
  invoiceNumber: string;
  date: string;
  variety: string;
  generation: string;
  remarks: string;
  farmer: {
    name: string;
    account: string;
    address: string;
  };
  bagSizes: SeedBagSizeRow[];
  totals: {
    totalBags: number;
    totalAcres: number;
    totalAmount: number;
    totalReceived: number;
  };
}

interface FarmerSeedVoucherCardProps {
  entry: FarmerSeedEntryListItem;
}

const FALLBACK_TEXT = '—';

function toNumber(value: unknown): number {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string') {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
}

function toDateLabel(value: unknown): string {
  if (typeof value !== 'string' || value.trim() === '') return FALLBACK_TEXT;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function toNumberOrNull(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string') {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function toStringValue(value: unknown, fallback = FALLBACK_TEXT): string {
  if (typeof value === 'string') {
    const next = value.trim();
    return next.length > 0 ? next : fallback;
  }
  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }
  return fallback;
}

function getFromObject(
  source: Record<string, unknown>,
  keys: readonly string[],
  fallback = FALLBACK_TEXT
): string {
  for (const key of keys) {
    const value = source[key];
    const asString = toStringValue(value, '');
    if (asString) return asString;
  }
  return fallback;
}

function mapBagSizes(entry: FarmerSeedEntryListItem): SeedBagSizeRow[] {
  const rawBagSizes = entry.bagSizes;
  if (!Array.isArray(rawBagSizes)) return [];

  return rawBagSizes.map((row, index) => {
    const rowObj = (row ?? {}) as Record<string, unknown>;
    const quantity = toNumber(rowObj.quantity);
    const rate = toNumber(rowObj.rate);
    const acres = toNumber(rowObj.acres);
    const amountValue = rowObj.amount;
    const receivedValue = toNumberOrNull(rowObj.received);

    return {
      name: getFromObject(rowObj, ['name', 'bagSize'], `Bag ${index + 1}`),
      quantity,
      rate,
      acres,
      amount:
        amountValue === undefined ? quantity * rate : toNumber(amountValue),
      received: receivedValue,
    };
  });
}

function buildViewModel(entry: FarmerSeedEntryListItem): SeedCardViewModel {
  const farmerStorageLink = (entry.farmerStorageLinkId ?? {}) as Record<
    string,
    unknown
  >;
  const farmer = (farmerStorageLink.farmerId ?? {}) as Record<string, unknown>;
  const bagSizes = mapBagSizes(entry);

  const totals = {
    totalBags:
      toNumber(entry.totalBags) ||
      bagSizes.reduce((sum, row) => sum + row.quantity, 0),
    totalAcres:
      toNumber(entry.totalAcres) ||
      bagSizes.reduce((sum, row) => sum + row.acres, 0),
    totalAmount:
      toNumber(entry.totalAmount) ||
      bagSizes.reduce((sum, row) => sum + row.amount, 0),
    totalReceived:
      toNumber(entry.totalReceived) ||
      bagSizes.reduce((sum, row) => sum + (row.received ?? 0), 0),
  };

  return {
    gatePassNo: toStringValue(entry.gatePassNo, ''),
    invoiceNumber: toStringValue(entry.invoiceNumber, ''),
    date: toDateLabel(entry.date ?? entry.createdAt),
    variety: toStringValue(entry.variety),
    generation: toStringValue(entry.generation),
    remarks: toStringValue(entry.remarks),
    farmer: {
      name: getFromObject(farmer, ['name', 'farmerName']),
      account: getFromObject(farmerStorageLink, ['accountNumber', 'accountNo']),
      address: getFromObject(farmer, ['address']),
    },
    bagSizes,
    totals,
  };
}

/* -------------------------------------------------------------------------- */
/* Main Component                                                            */
/* -------------------------------------------------------------------------- */

export const FarmerSeedVoucherCard = memo(function FarmerSeedVoucher({
  entry,
}: FarmerSeedVoucherCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const navigate = useNavigate();

  const seedData = buildViewModel(entry);
  const isCancelledGatePass = seedData.totals.totalBags === 0;

  const handleEditClick = () => {
    const id = toStringValue(entry._id, '');
    if (!id) return;

    const dateForEdit =
      typeof entry.date === 'string' && entry.date.trim().length > 0
        ? entry.date
        : typeof entry.createdAt === 'string' &&
            entry.createdAt.trim().length > 0
          ? entry.createdAt
          : '';

    const farmerStorageLink = (entry.farmerStorageLinkId ?? {}) as Record<
      string,
      unknown
    >;
    const farmer = (farmerStorageLink.farmerId ?? {}) as Record<
      string,
      unknown
    >;

    const bagSizesJson = JSON.stringify(
      seedData.bagSizes.map((row) => ({
        name: row.name,
        quantity: row.quantity,
        rate: row.rate,
        acres: row.acres,
      }))
    );

    void navigate({
      to: '/store-admin/farmer-seed-gate-pass/edit',
      search: {
        id,
        farmerLinkId: getFromObject(farmerStorageLink, ['_id'], ''),
        farmerName: getFromObject(farmer, ['name'], ''),
        farmerAccountNumber: getFromObject(
          farmerStorageLink,
          ['accountNumber', 'accountNo'],
          ''
        ),
        gatePassNo: seedData.gatePassNo,
        invoiceNumber: seedData.invoiceNumber,
        date: dateForEdit,
        variety: seedData.variety === FALLBACK_TEXT ? '' : seedData.variety,
        generation:
          seedData.generation === FALLBACK_TEXT ? '' : seedData.generation,
        remarks: seedData.remarks === FALLBACK_TEXT ? '' : seedData.remarks,
        bagSizesJson,
      },
    });
  };

  return (
    <Card
      className={cn(
        'border-border/40 bg-card hover:border-primary/40 relative w-full overflow-hidden rounded-xl pt-0 shadow-sm transition-all duration-200 ease-in-out hover:shadow-md',
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
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2 sm:gap-2.5">
            <div className="bg-primary h-1.5 w-1.5 shrink-0 rounded-full" />
            <h3 className="text-foreground font-custom text-sm font-bold tracking-tight sm:text-base">
              FSP{' '}
              <span
                className={cn(
                  'text-primary',
                  isCancelledGatePass && 'text-muted-foreground'
                )}
              >
                #{seedData.gatePassNo || '—'}
              </span>
            </h3>
            {seedData.invoiceNumber ? (
              <Badge
                variant="secondary"
                className="font-custom px-2 py-0.5 text-[10px] font-medium"
              >
                Inv #{seedData.invoiceNumber}
              </Badge>
            ) : null}
          </div>
          <p className="text-muted-foreground font-custom mt-1 text-[11px] sm:text-xs">
            {seedData.date}
          </p>
        </div>

        <div className="flex shrink-0 flex-wrap items-center gap-1.5">
          <Badge
            variant="outline"
            className={cn(
              'bg-background font-custom px-2 py-0.5 text-[10px] font-medium',
              isCancelledGatePass &&
                'border-border/50 bg-muted/40 text-muted-foreground'
            )}
          >
            {seedData.totals.totalBags.toLocaleString('en-IN')} Bags
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
        <div className="grid grid-cols-2 gap-x-3 gap-y-3 sm:grid-cols-2 lg:grid-cols-4">
          <InfoBlock label="Farmer" value={seedData.farmer.name} icon={User} />
          <InfoBlock label="Account" value={seedData.farmer.account} />
          <InfoBlock label="Variety" value={seedData.variety} icon={Sprout} />
          <InfoBlock
            label="Stage"
            value={seedData.generation}
            icon={ReceiptText}
          />
        </div>
      </div>

      {/* --- Action Bar --- */}
      <div className="bg-muted/10 border-border/50 flex items-center justify-between border-t px-3 py-2.5 sm:px-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setIsExpanded((p) => !p)}
          className="text-muted-foreground font-custom hover:text-foreground h-8 px-2 text-xs font-medium"
        >
          {isExpanded ? (
            <>
              <ChevronUp className="mr-1.5 h-3.5 w-3.5" /> Less
            </>
          ) : (
            <>
              <ChevronDown className="mr-1.5 h-3.5 w-3.5" /> More
            </>
          )}
        </Button>

        <div className="flex shrink-0 items-center gap-1.5">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="font-custom focus-visible:ring-primary h-8 w-8 p-0 focus-visible:ring-2 focus-visible:ring-offset-2"
            aria-label="Edit seed voucher"
            onClick={handleEditClick}
          >
            <Pencil className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="font-custom h-8 w-8 p-0"
            aria-label={`Print farmer seed voucher ${seedData.gatePassNo || ''}`}
          >
            <Printer className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      {/* --- Expanded Details --- */}
      {isExpanded && (
        <div className="border-border/50 animate-in slide-in-from-top-2 fade-in border-t p-3 duration-200 sm:p-4">
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <div className="space-y-4">
              <section>
                <h4 className="text-foreground font-custom flex items-center gap-2 text-xs font-semibold">
                  <User className="text-primary h-4 w-4" />
                  Farmer Information
                </h4>
                <div className="bg-muted/30 mt-2.5 grid grid-cols-1 gap-3 rounded-lg p-3 sm:grid-cols-2">
                  <InfoBlock label="Name" value={seedData.farmer.name} />
                  <InfoBlock label="Account" value={seedData.farmer.account} />
                  <div className="col-span-full sm:col-span-2">
                    <InfoBlock
                      label="Address"
                      value={seedData.farmer.address}
                    />
                  </div>
                </div>
              </section>

              <section>
                <h4 className="text-foreground font-custom flex items-center gap-2 text-xs font-semibold">
                  <FileText className="text-primary h-4 w-4" />
                  Remarks
                </h4>
                <div className="bg-muted/30 mt-2.5 rounded-lg p-3">
                  <p className="text-muted-foreground font-custom text-xs leading-relaxed">
                    {seedData.remarks}
                  </p>
                </div>
              </section>
            </div>

            <div className="space-y-4">
              <section>
                <h4 className="text-foreground font-custom flex items-center gap-2 text-xs font-semibold">
                  <Sprout className="text-primary h-4 w-4" />
                  Itemized seed details
                </h4>
                <div className="bg-muted/30 border-border/50 mt-2.5 overflow-hidden rounded-lg border">
                  <div className="overflow-x-auto">
                    <table className="font-custom w-full min-w-[560px] text-xs">
                      <thead className="bg-muted/50">
                        <tr className="text-muted-foreground border-b text-left text-[10px] font-semibold tracking-wide uppercase">
                          <th className="px-3 py-2.5">Bag Size</th>
                          <th className="px-3 py-2.5 text-right">Qty</th>
                          <th className="px-3 py-2.5 text-right">Rate (₹)</th>
                          <th className="px-3 py-2.5 text-right">Acres</th>
                          <th className="px-3 py-2.5 text-right">Amount (₹)</th>
                        </tr>
                      </thead>
                      <tbody className="divide-border/50 divide-y">
                        {seedData.bagSizes.map((row, idx) => (
                          <tr
                            key={idx}
                            className="hover:bg-muted/20 transition-colors duration-200"
                          >
                            <td className="px-3 py-2.5 font-medium">
                              {row.name}
                            </td>
                            <td className="px-3 py-2.5 text-right">
                              {row.quantity.toLocaleString('en-IN')}
                            </td>
                            <td className="px-3 py-2.5 text-right">
                              {row.rate.toLocaleString('en-IN')}
                            </td>
                            <td className="px-3 py-2.5 text-right">
                              {row.acres.toLocaleString('en-IN')}
                            </td>
                            <td className="px-3 py-2.5 text-right">
                              {row.amount.toLocaleString('en-IN')}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot>
                        <tr className="bg-muted/50 border-border/80 text-foreground border-t-2 font-bold">
                          <td className="px-3 py-2.5">Total</td>
                          <td className="px-3 py-2.5 text-right">
                            {seedData.totals.totalBags.toLocaleString('en-IN')}
                          </td>
                          <td className="px-3 py-2.5 text-right">—</td>
                          <td className="px-3 py-2.5 text-right">
                            {seedData.totals.totalAcres.toLocaleString('en-IN')}
                          </td>
                          <td className="px-3 py-2.5 text-right">
                            {seedData.totals.totalAmount.toLocaleString(
                              'en-IN'
                            )}
                          </td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </div>
              </section>
            </div>
          </div>
        </div>
      )}
    </Card>
  );
});

export default FarmerSeedVoucherCard;
