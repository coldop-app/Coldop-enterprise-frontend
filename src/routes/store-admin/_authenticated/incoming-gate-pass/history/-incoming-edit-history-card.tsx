import { Clock3, Globe, Monitor, UserPen, GitCompare } from 'lucide-react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import type { IncomingGatePassAuditItem } from '@/types/incoming-gate-pass';

interface IncomingEditHistoryCardProps {
  audit: IncomingGatePassAuditItem;
}

const TRACKED_FIELDS: { key: string; label: string }[] = [
  { key: 'manualGatePassNumber', label: 'Manual GP No.' },
  { key: 'variety', label: 'Variety' },
  { key: 'location', label: 'Location' },
  { key: 'truckNumber', label: 'Truck No.' },
  { key: 'bagsReceived', label: 'Bags Received' },
  { key: 'date', label: 'Date' },
  { key: 'remarks', label: 'Remarks' },
];

const WEIGHT_SLIP_FIELDS: { key: string; label: string }[] = [
  { key: 'slipNumber', label: 'Slip No.' },
  { key: 'grossWeightKg', label: 'Gross Weight (kg)' },
  { key: 'tareWeightKg', label: 'Tare Weight (kg)' },
];

type StateSnapshot = NonNullable<IncomingGatePassAuditItem['previousState']>;

function getFieldValue(state: StateSnapshot, key: string): unknown {
  return (state as unknown as Record<string, unknown>)[key];
}

function getWeightSlipValue(state: StateSnapshot, key: string): unknown {
  const ws = state.weightSlip as unknown as Record<string, unknown> | undefined;
  return ws?.[key];
}

function formatFieldValue(value: unknown, key: string): string {
  if (value == null) return '—';
  if (key === 'date' && typeof value === 'string') {
    const d = new Date(value);
    if (!isNaN(d.getTime())) {
      return new Intl.DateTimeFormat('en-IN', { dateStyle: 'medium' }).format(
        d
      );
    }
  }
  const str = String(value).trim();
  return str === '' ? '—' : str;
}

interface ChangedField {
  label: string;
  prev: string;
  updated: string;
}

function getChangedFields(
  prev: StateSnapshot,
  updated: StateSnapshot
): ChangedField[] {
  const changes: ChangedField[] = [];

  for (const { key, label } of TRACKED_FIELDS) {
    const prevVal = getFieldValue(prev, key);
    const updVal = getFieldValue(updated, key);
    if (String(prevVal ?? '') !== String(updVal ?? '')) {
      changes.push({
        label,
        prev: formatFieldValue(prevVal, key),
        updated: formatFieldValue(updVal, key),
      });
    }
  }

  for (const { key, label } of WEIGHT_SLIP_FIELDS) {
    const prevVal = getWeightSlipValue(prev, key);
    const updVal = getWeightSlipValue(updated, key);
    if (String(prevVal ?? '') !== String(updVal ?? '')) {
      changes.push({
        label,
        prev: formatFieldValue(prevVal, key),
        updated: formatFieldValue(updVal, key),
      });
    }
  }

  return changes;
}

function formatDateTime(value: string | undefined): string {
  if (!value) return 'N/A';
  const d = new Date(value);
  if (isNaN(d.getTime())) return 'N/A';
  return new Intl.DateTimeFormat('en-IN', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(d);
}

function renderFieldValue(value: unknown): string {
  if (value == null) return 'N/A';
  if (typeof value === 'string') return value.trim() || 'N/A';
  if (typeof value === 'number' || typeof value === 'boolean')
    return String(value);
  return 'N/A';
}

function parseUserAgent(ua: string): string {
  const browserMatch = ua.match(/(Chrome|Firefox|Safari|Edge|OPR)\/[\d.]+/);
  const osMatch = ua.match(/\(([^)]+)\)/);
  const browser = browserMatch ? browserMatch[0] : 'Unknown browser';
  const os = osMatch ? osMatch[1].split(';')[0].trim() : 'Unknown OS';
  return `${browser} · ${os}`;
}

export function IncomingEditHistoryCard({
  audit,
}: IncomingEditHistoryCardProps) {
  const { previousState, updatedState } = audit;

  const changedFields: ChangedField[] =
    previousState && updatedState
      ? getChangedFields(previousState, updatedState)
      : [];

  const status = audit.incomingGatePassId?.status;
  const isGraded = status === 'GRADED';

  return (
    <Card className="overflow-hidden rounded-xl border shadow-sm">
      {/* Header */}
      <CardHeader className="bg-background space-y-3 border-b pb-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="font-custom text-foreground text-base font-semibold">
            Gate Pass #{audit.incomingGatePassId?.gatePassNo ?? 'N/A'}
          </span>
          <div className="flex items-center gap-2">
            <Badge
              variant="secondary"
              className={
                isGraded
                  ? 'border-green-200 bg-green-50 text-green-700 hover:bg-green-50'
                  : 'border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-50'
              }
            >
              {renderFieldValue(status).replace('_', ' ')}
            </Badge>
            {changedFields.length > 0 && (
              <Badge
                variant="outline"
                className="text-muted-foreground text-xs font-normal"
              >
                <GitCompare className="mr-1 h-3 w-3" />
                {changedFields.length} field
                {changedFields.length !== 1 ? 's' : ''} changed
              </Badge>
            )}
          </div>
        </div>

        <div className="flex flex-wrap gap-x-4 gap-y-1">
          <span className="font-custom text-muted-foreground inline-flex items-center gap-1.5 text-sm">
            <UserPen className="h-3.5 w-3.5" />
            {renderFieldValue(audit.editedById?.name)}
          </span>
          <span className="font-custom text-muted-foreground inline-flex items-center gap-1.5 text-sm">
            <Clock3 className="h-3.5 w-3.5" />
            {formatDateTime(audit.createdAt)}
          </span>
        </div>
      </CardHeader>

      <CardContent className="space-y-4 pt-4">
        {/* Reason */}
        <div className="bg-muted/50 rounded-lg border px-3 py-2.5">
          <p className="font-custom text-foreground text-sm">
            <span className="font-semibold">Reason: </span>
            <span className="text-muted-foreground">
              {renderFieldValue(audit.reason)}
            </span>
          </p>
        </div>

        {/* Changed fields diff */}
        {changedFields.length > 0 ? (
          <div className="grid grid-cols-2 gap-2">
            {/* Previous */}
            <div className="overflow-hidden rounded-lg border">
              <p className="font-custom border-b border-red-100 bg-red-50 px-3 py-2 text-xs font-semibold tracking-wide text-red-700 uppercase">
                Previous
              </p>
              <div className="space-y-2.5 px-3 py-2.5">
                {changedFields.map(({ label, prev }) => (
                  <div key={label}>
                    <p className="font-custom text-muted-foreground mb-0.5 text-[10px] tracking-wide uppercase">
                      {label}
                    </p>
                    <p className="font-custom text-sm text-red-600 line-through decoration-red-400">
                      {prev}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {/* Updated */}
            <div className="overflow-hidden rounded-lg border">
              <p className="font-custom border-b border-green-100 bg-green-50 px-3 py-2 text-xs font-semibold tracking-wide text-green-700 uppercase">
                Updated
              </p>
              <div className="space-y-2.5 px-3 py-2.5">
                {changedFields.map(({ label, updated }) => (
                  <div key={label}>
                    <p className="font-custom text-muted-foreground mb-0.5 text-[10px] tracking-wide uppercase">
                      {label}
                    </p>
                    <p className="font-custom text-sm font-medium text-green-700">
                      {updated}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <p className="font-custom text-muted-foreground text-sm italic">
            No field changes detected.
          </p>
        )}

        {/* System info */}
        <div className="space-y-1 border-t pt-1">
          <p className="font-custom text-muted-foreground inline-flex w-full items-start gap-2 text-xs break-all">
            <Globe className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            <span>
              <span className="text-foreground font-semibold">IP: </span>
              {renderFieldValue(audit.ipAddress)}
            </span>
          </p>
          <p className="font-custom text-muted-foreground inline-flex w-full items-start gap-2 text-xs break-all">
            <Monitor className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            <span>
              <span className="text-foreground font-semibold">Browser: </span>
              {audit.userAgent ? parseUserAgent(audit.userAgent) : 'N/A'}
            </span>
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
