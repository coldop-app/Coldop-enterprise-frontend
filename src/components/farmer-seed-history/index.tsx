import { memo } from 'react';
import { useGetFarmerSeedEditHistory } from '@/services/store-admin/farmer-seed/useGetFarmerSeedEditHistory';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

function formatDateTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat('en-IN', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date);
}

function formatFieldValue(value: string | number | boolean | null) {
  if (value === null) return 'N/A';
  return String(value);
}

const FarmerSeedHistory = memo(function FarmerSeedHistory() {
  const {
    data: auditEntries,
    isLoading,
    isError,
    error,
  } = useGetFarmerSeedEditHistory();

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-10">
          <p className="font-custom text-center text-sm text-gray-600">
            Loading farmer seed history...
          </p>
        </CardContent>
      </Card>
    );
  }

  if (isError) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="font-custom text-base text-red-600">
            Failed to load history
          </CardTitle>
          <CardDescription className="font-custom text-sm">
            {error instanceof Error ? error.message : 'Something went wrong.'}
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  if (!auditEntries?.length) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="font-custom text-base">
            No edit history found
          </CardTitle>
          <CardDescription className="font-custom text-sm">
            Farmer seed audit entries will appear here after changes are made.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <section className="space-y-4">
      {auditEntries.map((entry) => (
        <Card key={entry._id} className="rounded-xl">
          <CardHeader className="space-y-2 pb-3">
            <CardTitle className="font-custom text-base">
              {entry.editedById?.name ?? 'Unknown User'} edited{' '}
              <span className="text-primary">{entry.field}</span>
            </CardTitle>
            <CardDescription className="font-custom text-sm">
              {formatDateTime(entry.createdAt)}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 pt-0">
            <div className="grid gap-2 rounded-lg bg-gray-50 p-3 sm:grid-cols-2">
              <p className="font-custom text-sm">
                <span className="font-semibold text-gray-700">Old Value:</span>{' '}
                {formatFieldValue(entry.oldValue)}
              </p>
              <p className="font-custom text-sm">
                <span className="font-semibold text-gray-700">New Value:</span>{' '}
                {formatFieldValue(entry.newValue)}
              </p>
            </div>
            <div className="grid gap-2 text-sm text-gray-600 sm:grid-cols-2">
              <p className="font-custom">
                <span className="font-semibold text-gray-700">Mobile:</span>{' '}
                {entry.editedById?.mobileNumber ?? 'N/A'}
              </p>
              <p className="font-custom">
                <span className="font-semibold text-gray-700">Role:</span>{' '}
                {entry.editedById?.role ?? 'N/A'}
              </p>
              <p className="font-custom break-all sm:col-span-2">
                <span className="font-semibold text-gray-700">IP:</span>{' '}
                {entry.ipAddress || 'N/A'}
              </p>
              <p className="font-custom break-all sm:col-span-2">
                <span className="font-semibold text-gray-700">User Agent:</span>{' '}
                {entry.userAgent || 'N/A'}
              </p>
            </div>
          </CardContent>
        </Card>
      ))}
    </section>
  );
});

export default FarmerSeedHistory;
