import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useMemo } from 'react';
import { GradingGatePassForm } from '@/components/forms/grading';
import { useGetReceiptVoucherNumber } from '@/services/store-admin/functions/useGetVoucherNumber';

export const Route = createFileRoute('/store-admin/_authenticated/grading/')({
  validateSearch: (
    search: Record<string, unknown>
  ): {
    farmerStorageLinkId?: string;
    incomingGatePassId?: string;
    variety?: string;
  } => ({
    farmerStorageLinkId:
      typeof search.farmerStorageLinkId === 'string'
        ? search.farmerStorageLinkId
        : undefined,
    incomingGatePassId:
      typeof search.incomingGatePassId === 'string'
        ? search.incomingGatePassId
        : undefined,
    variety: typeof search.variety === 'string' ? search.variety : undefined,
  }),
  component: GradingFormPage,
});

function GradingFormPage() {
  const { farmerStorageLinkId, incomingGatePassId, variety } =
    Route.useSearch();
  const { data: voucherNumber, isLoading: isLoadingVoucher } =
    useGetReceiptVoucherNumber('grading-gate-pass');

  const voucherNumberDisplay = useMemo(
    () => (voucherNumber != null ? `#${voucherNumber}` : null),
    [voucherNumber]
  );

  const navigate = useNavigate();
  const handleSuccess = () => {
    navigate({ to: '/store-admin/daybook' });
  };

  return (
    <main className="font-custom mx-auto max-w-2xl px-4 py-6 sm:px-8 sm:py-12">
      <div className="mb-8 space-y-4">
        <h1 className="font-custom text-3xl font-bold text-[#333] sm:text-4xl dark:text-white">
          Create Grading Gate Pass
        </h1>

        {isLoadingVoucher ? (
          <div className="bg-primary/20 inline-block rounded-full px-4 py-1.5">
            <span className="font-custom text-primary text-sm font-medium">
              Loading voucher number...
            </span>
          </div>
        ) : voucherNumberDisplay ? (
          <div className="bg-primary/20 inline-block rounded-full px-4 py-1.5">
            <span className="font-custom text-primary text-sm font-medium">
              VOUCHER NO: {voucherNumberDisplay}
            </span>
          </div>
        ) : null}

        {variety && (
          <p className="text-muted-foreground font-custom text-sm">
            Variety:{' '}
            <span className="text-foreground font-medium">{variety}</span>
          </p>
        )}
      </div>

      <GradingGatePassForm
        farmerStorageLinkId={farmerStorageLinkId}
        incomingGatePassId={incomingGatePassId}
        variety={variety}
        onSuccess={handleSuccess}
      />
    </main>
  );
}
