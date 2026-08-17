/* eslint-disable react-refresh/only-export-components */
import { createFileRoute, Link } from '@tanstack/react-router';
import { useState } from 'react';

import { Button } from '@/components/ui/button';
import { formatDate } from '@/lib/helpers';
import { useStore } from '@/stores/store';
import { EditDispatchPostStorageSheet } from '../-EditDispatchPostStorageSheet';
import { type MockDispatchPostStorageGatePass } from '../-form-schema';

const MOCK_GATE_PASS: MockDispatchPostStorageGatePass = {
  _id: 'mock-dispatch-post-storage',
  gatePassNo: 42,
  values: {
    date: formatDate(new Date()),
    manualGatePassNumber: 101,
    from: 'Chamber A',
    to: 'Market Yard',
    truckNumber: 'HR-12-3456',
    remarks: 'Mock voucher for UI preview.',
  },
};

export const Route = createFileRoute(
  '/store-admin/_authenticated/dispatch-post-storage/edit/'
)({
  component: RouteComponent,
});

function RouteComponent() {
  const setDaybookTab = useStore((state) => state.setDaybookActiveTab);
  const [editOpen, setEditOpen] = useState(false);

  return (
    <main className="font-custom mx-auto max-w-2xl px-4 py-6 sm:px-8 sm:py-12">
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <h1 className="font-custom text-foreground text-3xl font-bold sm:text-4xl">
          Edit Dispatch (Post Storage)
        </h1>
        <Button
          variant="outline"
          className="font-custom focus-visible:ring-primary shrink-0"
          asChild
        >
          <Link
            to="/store-admin/daybook"
            className="focus-visible:ring-primary focus-visible:ring-offset-background rounded-md focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
            onClick={() => setDaybookTab('dispatch-outgoing')}
          >
            Back to daybook
          </Link>
        </Button>
      </div>

      <div className="flex flex-col gap-4">
        <p className="text-muted-foreground font-custom text-sm leading-relaxed">
          Preview the edit sheet with mock voucher #{MOCK_GATE_PASS.gatePassNo}.
          Save is not wired to the API.
        </p>
        <Button
          type="button"
          className="font-custom w-full font-bold sm:w-auto"
          onClick={() => setEditOpen(true)}
        >
          Open edit sheet
        </Button>
      </div>

      <EditDispatchPostStorageSheet
        open={editOpen}
        onOpenChange={setEditOpen}
        gatePass={MOCK_GATE_PASS}
      />
    </main>
  );
}
