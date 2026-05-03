/* eslint-disable react-refresh/only-export-components */
import { useState } from 'react';
import { createFileRoute, Link } from '@tanstack/react-router';

import {
  IncomingSelectionCreateStep,
  type GradingCreateIncomingSelection,
} from './-IncomingSelectionCreateStep';
import { GradingCreateForm } from './-GradingCreateForm';
import { Button } from '@/components/ui/button';
import { useGetReceiptVoucherNumber } from '@/services/store-admin/general/useGetVoucherNumber';
import { useStore } from '@/stores/store';

export const Route = createFileRoute(
  '/store-admin/_authenticated/grading-gate-pass/'
)({
  component: RouteComponent,
});

function RouteComponent() {
  const setDaybookTab = useStore((s) => s.setDaybookActiveTab);
  const {
    data: nextGradingVoucherNumber,
    isFetching: isGradingVoucherLoading,
  } = useGetReceiptVoucherNumber('grading-gate-pass');
  const [selection, setSelection] =
    useState<GradingCreateIncomingSelection | null>(null);

  if (!selection) {
    return (
      <>
        <div className="font-custom mx-auto max-w-5xl px-4 pt-6 sm:px-6 sm:pt-10">
          <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="font-custom text-2xl font-bold tracking-tighter text-[#333] sm:text-3xl">
                Create grading voucher
              </h1>
              <p className="text-muted-foreground font-custom mt-1 text-sm leading-relaxed">
                Choose farmer, variety and incoming passes, then complete the
                new voucher.
              </p>
            </div>
            <Button
              variant="outline"
              className="font-custom focus-visible:ring-primary shrink-0"
              asChild
            >
              <Link
                to="/store-admin/daybook"
                className="focus-visible:ring-primary focus-visible:ring-offset-background rounded-md focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
                onClick={() => setDaybookTab('grading')}
              >
                Back to daybook
              </Link>
            </Button>
          </div>
        </div>
        <main className="font-custom mx-auto max-w-5xl px-4 pb-10 sm:px-6">
          <IncomingSelectionCreateStep onNext={setSelection} />
        </main>
      </>
    );
  }

  return (
    <GradingCreateForm
      key={`grading-create-${selection.farmerStorageLinkId}-${selection.variety}-${selection.selectedIncomingGatePassIds.join(',')}`}
      selection={selection}
      gatePassNo={nextGradingVoucherNumber}
      isVoucherNumberLoading={isGradingVoucherLoading}
    />
  );
}
