import { Clock3, GitCompare, Phone, UserPen } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import type {
  DispatchPostStorageAuditItem,
  DispatchPostStorageAuditSnapshot,
  DispatchPostStorageAuditVoucher,
} from '@/types/dispatch-post-storage';

interface DispatchPostStorageEditHistoryCardProps {
  audit: DispatchPostStorageAuditItem;
}

const FIELD_LABELS: Record<string, string> = {
  from: 'From',
  to: 'To',
  truckNumber: 'Truck No.',
  remarks: 'Remarks',
  status: 'Status',
  gatePassNo: 'Gate Pass No.',
  manualGatePassNumber: 'Manual GP No.',
  variety: 'Variety',
  varieties: 'Varieties',
  date: 'Date',
  markAsNullRemarks: 'Mark as Null Remarks',
  markedAsNullAt: 'Marked as Null At',
  farmerStorageLinkId: 'Farmer Storage Link',
};

const DATE_FIELD_KEYS = new Set(['date', 'markedAsNullAt']);

interface ChangedField {
  label: string;
  prev: string;
  updated: string;
}

function getVoucher(
  value: DispatchPostStorageAuditVoucher
): Extract<DispatchPostStorageAuditVoucher, { _id: string }> | undefined {
  if (typeof value === 'object' && value !== null && '_id' in value) {
    return value;
  }
  return undefined;
}

function formatKeyLabel(rawKey: string): string {
  if (FIELD_LABELS[rawKey]) return FIELD_LABELS[rawKey];

  return rawKey
    .replace(/_/g, ' ')
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/^./, (char) => char.toUpperCase());
}

function formatDateValue(value: string): string | undefined {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return undefined;

  return new Intl.DateTimeFormat('en-IN', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(parsed);
}

function formatFieldValue(value: unknown, key: string): string {
  if (value == null) return '—';

  if (DATE_FIELD_KEYS.has(key) && typeof value === 'string') {
    return formatDateValue(value) ?? '—';
  }

  if (typeof value === 'object') {
    if (Array.isArray(value) && value.length === 0) return '[]';
    if (
      Array.isArray(value) &&
      value.every((item) => typeof item === 'string')
    ) {
      const joined = value
        .map((item) => item.trim())
        .filter((item) => item !== '')
        .join(', ');
      return joined === '' ? '—' : joined;
    }
    if (!Array.isArray(value) && Object.keys(value).length === 0) return '{}';
    return JSON.stringify(value);
  }

  const text = String(value).trim();
  return text === '' ? '—' : text;
}

function getChangedFields(
  previousState: DispatchPostStorageAuditSnapshot | undefined,
  modifiedState: DispatchPostStorageAuditSnapshot | undefined
): ChangedField[] {
  const previous = previousState ?? {};
  const modified = modifiedState ?? {};
  const keys = new Set([...Object.keys(previous), ...Object.keys(modified)]);

  return [...keys].map((key) => ({
    label: formatKeyLabel(key),
    prev: formatFieldValue(previous[key], key),
    updated: formatFieldValue(modified[key], key),
  }));
}

function formatDateTime(value: string | undefined): string {
  if (!value) return 'N/A';
  return formatDateValue(value) ?? 'N/A';
}

function formatActionLabel(action: string): string {
  return action.replace(/_/g, ' ');
}

function getActionBadgeClass(action: string): string {
  if (action === 'CREATE') {
    return 'border-green-200 bg-green-50 text-green-700 hover:bg-green-50';
  }
  if (action === 'MARK_AS_NULL') {
    return 'border-red-200 bg-red-50 text-red-700 hover:bg-red-50';
  }
  return 'border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-50';
}

function getStatusBadgeClass(status: string | undefined): string {
  if (status === 'MARKED_AS_NULL') {
    return 'border-red-200 bg-red-50 text-red-700 hover:bg-red-50';
  }
  if (status === 'ACTIVE') {
    return 'border-green-200 bg-green-50 text-green-700 hover:bg-green-50';
  }
  return 'border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-50';
}

export function DispatchPostStorageEditHistoryCard({
  audit,
}: DispatchPostStorageEditHistoryCardProps) {
  const voucher = getVoucher(audit.dispatchPostStorageId);
  const gatePassNo = voucher?.gatePassNo;
  const status =
    typeof voucher?.status === 'string' ? voucher.status : undefined;
  const performer =
    audit.performedById && typeof audit.performedById !== 'string'
      ? audit.performedById
      : undefined;
  const changedFields = getChangedFields(
    audit.previousState,
    audit.modifiedState
  );
  const isCreate = audit.action === 'CREATE';

  return (
    <Card className="overflow-hidden rounded-xl border shadow-sm">
      <CardHeader className="bg-background space-y-3 border-b pb-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="font-custom text-foreground text-base font-semibold">
            Gate Pass #{gatePassNo ?? 'N/A'}
          </span>
          <div className="flex items-center gap-2">
            <Badge
              variant="secondary"
              className={getActionBadgeClass(audit.action)}
            >
              {formatActionLabel(audit.action)}
            </Badge>
            {status ? (
              <Badge
                variant="secondary"
                className={getStatusBadgeClass(status)}
              >
                {status.replace(/_/g, ' ')}
              </Badge>
            ) : null}
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
            {performer?.name ?? 'N/A'}
          </span>
          {performer?.mobileNumber ? (
            <span className="font-custom text-muted-foreground inline-flex items-center gap-1.5 text-sm">
              <Phone className="h-3.5 w-3.5" />
              {performer.mobileNumber}
            </span>
          ) : null}
          <span className="font-custom text-muted-foreground inline-flex items-center gap-1.5 text-sm">
            <Clock3 className="h-3.5 w-3.5" />
            {formatDateTime(audit.createdAt)}
          </span>
        </div>
      </CardHeader>

      <CardContent className="space-y-4 pt-4">
        {changedFields.length > 0 ? (
          <div className="grid grid-cols-2 gap-2">
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
                      {isCreate ? '—' : prev}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            <div className="overflow-hidden rounded-lg border">
              <p className="font-custom border-b border-green-100 bg-green-50 px-3 py-2 text-xs font-semibold tracking-wide text-green-700 uppercase">
                {isCreate ? 'Created' : 'Updated'}
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
      </CardContent>
    </Card>
  );
}
