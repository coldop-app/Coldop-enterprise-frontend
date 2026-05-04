import { Clock3, GitCompare, UserPen } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import type { GradingGatePassAuditItem } from '@/types/grading-gate-pass';

interface GradingEditHistoryCardProps {
  audit: GradingGatePassAuditItem;
}

interface ChangedField {
  label: string;
  prev: string;
  updated: string;
}

function formatKeyLabel(rawKey: string): string {
  return rawKey
    .replace(/_/g, ' ')
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/^./, (char) => char.toUpperCase());
}

function formatFieldValue(value: unknown): string {
  if (value == null) return '—';

  if (typeof value === 'object') {
    if (Array.isArray(value) && value.length === 0) return '[]';
    if (!Array.isArray(value) && Object.keys(value).length === 0) return '{}';
    return JSON.stringify(value);
  }

  const text = String(value).trim();
  return text || '—';
}

function getChangedFields(audit: GradingGatePassAuditItem): ChangedField[] {
  const changes = audit.changes ?? {};
  const fields: ChangedField[] = [];

  for (const [key, value] of Object.entries(changes)) {
    fields.push({
      label: formatKeyLabel(key),
      prev: formatFieldValue(value?.old),
      updated: formatFieldValue(value?.new),
    });
  }

  return fields;
}

function formatDateTime(value: string): string {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return 'N/A';
  return new Intl.DateTimeFormat('en-IN', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(d);
}

function getGatePassLabel(gradingGatePassId: unknown): string {
  if (typeof gradingGatePassId === 'string' && gradingGatePassId.trim()) {
    return gradingGatePassId.slice(-6).toUpperCase();
  }

  if (
    gradingGatePassId &&
    typeof gradingGatePassId === 'object' &&
    '_id' in gradingGatePassId
  ) {
    const objectId = (gradingGatePassId as { _id?: unknown })._id;
    if (typeof objectId === 'string' && objectId.trim()) {
      return objectId.slice(-6).toUpperCase();
    }
  }

  return 'N/A';
}

export function GradingEditHistoryCard({ audit }: GradingEditHistoryCardProps) {
  const changedFields = getChangedFields(audit);
  const actionLabel = audit.action?.replace('_', ' ') || 'UPDATE';
  const gatePassLabel = getGatePassLabel(audit.gradingGatePassId);

  return (
    <Card className="overflow-hidden rounded-xl border shadow-sm">
      <CardHeader className="bg-background space-y-3 border-b pb-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="font-custom text-foreground text-base font-semibold">
            Grading GP #{gatePassLabel}
          </span>
          <div className="flex items-center gap-2">
            <Badge
              variant="secondary"
              className="border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-50"
            >
              {actionLabel}
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
            {audit.editedBy?.name || 'N/A'}
          </span>
          <span className="font-custom text-muted-foreground inline-flex items-center gap-1.5 text-sm">
            <Clock3 className="h-3.5 w-3.5" />
            {formatDateTime(audit.createdAt)}
          </span>
        </div>
      </CardHeader>

      <CardContent className="space-y-4 pt-4">
        <div className="bg-muted/50 rounded-lg border px-3 py-2.5">
          <p className="font-custom text-foreground text-sm">
            <span className="font-semibold">Reason: </span>
            <span className="text-muted-foreground">
              {audit.reason || 'N/A'}
            </span>
          </p>
        </div>

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
                      {prev}
                    </p>
                  </div>
                ))}
              </div>
            </div>

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
      </CardContent>
    </Card>
  );
}
