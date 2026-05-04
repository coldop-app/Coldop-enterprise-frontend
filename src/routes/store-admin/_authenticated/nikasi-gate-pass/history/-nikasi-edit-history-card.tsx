import { Clock3, Globe, Monitor, UserPen, GitCompare } from 'lucide-react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import type { NikasiGatePassAuditItem } from '@/services/store-admin/nikasi-gate-pass/useGetNikasiGatePassEditHistory';

interface NikasiEditHistoryCardProps {
  audit: NikasiGatePassAuditItem;
}

type StateSnapshot = Record<string, unknown> | undefined;

function formatKeyLabel(rawKey: string): string {
  return rawKey
    .replace(/_/g, ' ')
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/^./, (char) => char.toUpperCase());
}

function formatFieldValue(value: unknown): string {
  if (value == null) return '—';

  // Handle nested objects/arrays gracefully in the diff viewer
  if (typeof value === 'object') {
    if (Array.isArray(value) && value.length === 0) return '[]';
    if (Object.keys(value).length === 0) return '{}';
    return JSON.stringify(value);
  }

  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) return '—';

    // Try to format ISO date strings dynamically
    if (/^\d{4}-\d{2}-\d{2}T/.test(trimmed)) {
      const d = new Date(trimmed);
      if (!Number.isNaN(d.getTime())) {
        return new Intl.DateTimeFormat('en-IN', { dateStyle: 'medium' }).format(
          d
        );
      }
    }
    return trimmed;
  }

  return String(value);
}

function formatDateTime(value: unknown): string {
  if (typeof value !== 'string' || !value) return 'N/A';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return 'N/A';
  return new Intl.DateTimeFormat('en-IN', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(d);
}

function renderFieldValue(value: unknown): string {
  if (value == null) return 'N/A';
  if (typeof value === 'string') return value.trim() || 'N/A';
  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }
  return 'N/A';
}

function parseUserAgent(ua: string): string {
  const browserMatch = ua.match(/(Chrome|Firefox|Safari|Edge|OPR)\/[\d.]+/);
  const osMatch = ua.match(/\(([^)]+)\)/);
  const browser = browserMatch ? browserMatch[0] : 'Unknown browser';
  const os = osMatch ? osMatch[1].split(';')[0].trim() : 'Unknown OS';
  return `${browser} · ${os}`;
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
  if (!prev || !updated) return [];

  const changes: ChangedField[] = [];
  const allKeys = Array.from(
    new Set([...Object.keys(prev), ...Object.keys(updated)])
  );

  // Ignore internal metadata fields from the diff
  const ignoredKeys = [
    '_id',
    '__v',
    'createdAt',
    'updatedAt',
    'createdBy',
    'updatedBy',
  ];

  for (const key of allKeys) {
    if (ignoredKeys.includes(key)) continue;

    const prevVal = prev[key];
    const updVal = updated[key];

    // Simple comparison (stringified to catch object/array discrepancies)
    const prevStr =
      typeof prevVal === 'object'
        ? JSON.stringify(prevVal)
        : String(prevVal ?? '');
    const updStr =
      typeof updVal === 'object'
        ? JSON.stringify(updVal)
        : String(updVal ?? '');

    if (prevStr !== updStr) {
      changes.push({
        label: formatKeyLabel(key),
        prev: formatFieldValue(prevVal),
        updated: formatFieldValue(updVal),
      });
    }
  }

  return changes;
}

export function NikasiEditHistoryCard({ audit }: NikasiEditHistoryCardProps) {
  const item = audit as unknown as Record<string, unknown>;
  const previousState = item.previousState as StateSnapshot;
  const updatedState = item.updatedState as StateSnapshot;

  const editedBy = item.editedById as Record<string, unknown> | undefined;
  const nikasiGatePass = item.nikasiGatePassId as
    | Record<string, unknown>
    | undefined;

  const isInternalTransfer =
    updatedState?.isInternalTransfer ?? nikasiGatePass?.isInternalTransfer;
  const gatePassNumber = nikasiGatePass?.gatePassNo ?? updatedState?.gatePassNo;

  const changedFields = getChangedFields(previousState, updatedState);

  return (
    <Card className="overflow-hidden rounded-xl border shadow-sm">
      {/* Header */}
      <CardHeader className="bg-background space-y-3 border-b pb-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="font-custom text-foreground text-base font-semibold">
            Gate Pass #{renderFieldValue(gatePassNumber)}
          </span>
          <div className="flex items-center gap-2">
            <Badge
              variant="secondary"
              className={
                isInternalTransfer
                  ? 'border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-50'
                  : 'border-purple-200 bg-purple-50 text-purple-700 hover:bg-purple-50'
              }
            >
              {isInternalTransfer ? 'Internal Transfer' : 'External Transfer'}
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
            {renderFieldValue(editedBy?.name)}
          </span>
          <span className="font-custom text-muted-foreground inline-flex items-center gap-1.5 text-sm">
            <Clock3 className="h-3.5 w-3.5" />
            {formatDateTime(item.createdAt)}
          </span>
        </div>
      </CardHeader>

      <CardContent className="space-y-4 pt-4">
        {/* Reason */}
        <div className="bg-muted/50 rounded-lg border px-3 py-2.5">
          <p className="font-custom text-foreground text-sm">
            <span className="font-semibold">Reason: </span>
            <span className="text-muted-foreground">
              {renderFieldValue(item.reason)}
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
                  <div key={`prev-${label}`}>
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
                  <div key={`upd-${label}`}>
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
        <div className="space-y-1 border-t pt-4">
          <p className="font-custom text-muted-foreground inline-flex w-full items-start gap-2 text-xs break-all">
            <Globe className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            <span>
              <span className="text-foreground font-semibold">IP: </span>
              {renderFieldValue(item.ipAddress)}
            </span>
          </p>
          <p className="font-custom text-muted-foreground inline-flex w-full items-start gap-2 text-xs break-all">
            <Monitor className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            <span>
              <span className="text-foreground font-semibold">Browser: </span>
              {item.userAgent ? parseUserAgent(String(item.userAgent)) : 'N/A'}
            </span>
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
