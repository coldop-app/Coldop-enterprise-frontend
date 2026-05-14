/* eslint-disable react-refresh/only-export-components */
import { createFileRoute, Link } from '@tanstack/react-router';
import { FileText, Sprout } from 'lucide-react';
import { useMemo, useState } from 'react';
import { EditDispatchLedgerModal } from '@/components/forms/edit-dispatch-ledger-modal';
import { FarmerProfileOverview } from '@/components/people/FarmerProfileOverview';
import type { FarmerProfileAggregates } from '@/components/people/FarmerProfileOverview';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@/components/ui/empty';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { usePermissionsStore } from '@/stores/usePermissionsStore';
import { useGetAllGatePassesOfDispatchLedger } from '@/services/store-admin/dispatch-ledger/useGetAllGatePassesOfDispatchLedger';
import DispatchLedgerNikasiSection from './-DispatchLedgerNikasiSection';

const DISPATCH_LEDGER_REPORT_LINK_CLASS =
  'font-custom focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 rounded-md';

const DISPATCH_LEDGER_AGGREGATE_PLACEHOLDER: FarmerProfileAggregates = {
  totalBagsSeed: 0,
  totalBagsIncoming: 0,
  totalBagsUngraded: 0,
  totalBagsGraded: 0,
  totalBagsStored: 0,
  totalBagsNikasi: 0,
  totalBagsOutgoing: 0,
};

export const Route = createFileRoute(
  '/store-admin/_authenticated/people/dispatch-ledger/$id/'
)({
  component: RouteComponent,
});

function getLedgerErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  return 'Something went wrong';
}

function RouteComponent() {
  const { id } = Route.useParams();
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const hasPermission = usePermissionsStore((state) => state.hasPermission);
  const canReadFarmerProfile = hasPermission('farmer-profile', 'read');
  const canReadFarmerProfileReports = hasPermission(
    'farmer-profile',
    'reports'
  );
  const canUpdateFarmerProfile = hasPermission('farmer-profile', 'update');

  const ledgerQuery = useGetAllGatePassesOfDispatchLedger({
    dispatchLedgerId: id,
    enabled: canReadFarmerProfile,
  });

  const { data, isLoading, isError, error, refetch, isFetching } = ledgerQuery;

  const isRefetching = isFetching && !isLoading;
  const ledger = data?.dispatchLedger ?? null;
  const gatePasses = data?.nikasiGatePasses ?? [];
  const totalDispatched = data?.summary.totalBagsDispatched ?? 0;

  const editInitialValues = useMemo(
    () => ({
      name: ledger?.name ?? '',
      address: ledger?.address ?? '',
      mobileNumber: ledger?.mobileNumber ?? '',
    }),
    [ledger]
  );

  const handleRefresh = () => {
    void refetch();
  };

  return (
    <main className="mx-auto max-w-7xl p-3 sm:p-4 lg:p-6">
      <div className="space-y-6">
        {canReadFarmerProfile ? (
          <>
            <EditDispatchLedgerModal
              dispatchLedgerId={id}
              initialValues={editInitialValues}
              isOpen={isEditModalOpen}
              onOpenChange={setIsEditModalOpen}
            />

            <Card className="overflow-hidden rounded-xl shadow-sm">
              <CardContent className="p-4 sm:p-5">
                {isLoading ? (
                  <div className="space-y-6">
                    <div className="space-y-3">
                      <Skeleton className="h-6 w-44" />
                      <Skeleton className="h-4 w-60" />
                    </div>
                    <Skeleton className="h-24 max-w-xs rounded-lg" />
                  </div>
                ) : isError ? (
                  <Empty className="border-border/50 rounded-xl border py-10">
                    <EmptyHeader>
                      <EmptyTitle className="font-custom">
                        Could not load dispatch ledger
                      </EmptyTitle>
                      <EmptyDescription className="font-custom">
                        {getLedgerErrorMessage(error)}
                      </EmptyDescription>
                    </EmptyHeader>
                  </Empty>
                ) : (
                  <div className="space-y-4">
                    <FarmerProfileOverview
                      name={ledger?.name}
                      accountNumber={ledger?._id ?? id}
                      address={ledger?.address}
                      mobileNumber={ledger?.mobileNumber}
                      onEdit={() => setIsEditModalOpen(true)}
                      editAriaLabel="Edit dispatch ledger"
                      aggregates={DISPATCH_LEDGER_AGGREGATE_PLACEHOLDER}
                      primaryMetric={{
                        label: 'Total dispatched',
                        value: totalDispatched,
                      }}
                      hideFarmerReportLinks
                      canShowEditButton={canUpdateFarmerProfile}
                    />
                    {canReadFarmerProfileReports ? (
                      <>
                        <Separator />
                        <div className="flex flex-wrap gap-2">
                          <Button
                            type="button"
                            size="sm"
                            className="gap-1.5"
                            asChild
                          >
                            <Link
                              to="/store-admin/people/dispatch-ledger/$id/dispatch-ledger-report"
                              params={{ id }}
                              preload="intent"
                              className={DISPATCH_LEDGER_REPORT_LINK_CLASS}
                            >
                              <FileText className="h-3.5 w-3.5" />
                              Report
                            </Link>
                          </Button>
                        </div>
                      </>
                    ) : null}
                  </div>
                )}
              </CardContent>
            </Card>

            <DispatchLedgerNikasiSection
              gatePasses={gatePasses}
              dispatchLedger={ledger}
              isLoading={isLoading}
              isError={isError}
              error={error}
              onRefresh={handleRefresh}
              isRefetching={isRefetching}
            />
          </>
        ) : (
          <Card className="overflow-hidden rounded-xl shadow-sm">
            <CardContent className="p-4 sm:p-5">
              <Empty className="bg-muted/10 rounded-xl border">
                <EmptyHeader>
                  <EmptyMedia variant="icon">
                    <Sprout />
                  </EmptyMedia>
                  <EmptyTitle className="font-custom">
                    Access restricted
                  </EmptyTitle>
                  <EmptyDescription className="font-custom">
                    You do not have read permission for this dispatch ledger.
                  </EmptyDescription>
                </EmptyHeader>
              </Empty>
            </CardContent>
          </Card>
        )}
      </div>
    </main>
  );
}
