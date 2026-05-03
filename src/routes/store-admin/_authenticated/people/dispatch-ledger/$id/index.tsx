/* eslint-disable react-refresh/only-export-components */
import { createFileRoute, useLocation } from '@tanstack/react-router';
import { useState } from 'react';
import { Search, ChevronDown } from 'lucide-react';
import { EditDispatchLedgerModal } from '@/components/forms/edit-dispatch-ledger-modal';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Item, ItemFooter } from '@/components/ui/item';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { FarmerProfileOverview } from '@/components/people/FarmerProfileOverview';
import type { DispatchLedger } from '@/types/dispatch-ledger';

export const Route = createFileRoute(
  '/store-admin/_authenticated/people/dispatch-ledger/$id/'
)({
  component: RouteComponent,
});

function RouteComponent() {
  const { id } = Route.useParams();
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const location = useLocation();
  const state = location.state as
    | { dispatchLedger?: DispatchLedger }
    | undefined;
  const dispatchLedgerFromState = state?.dispatchLedger;

  // Static mock data for UI visualization purposes
  const staticGatePassesResponse = {
    status: 'success',
    data: [
      { id: 'GP-001', type: 'Incoming', date: '2026-05-01', bags: 120 },
      { id: 'GP-002', type: 'Outgoing', date: '2026-05-02', bags: 50 },
    ],
    message: 'Static mock data loaded successfully.',
  };

  return (
    <main className="mx-auto max-w-7xl p-3 sm:p-4 lg:p-6">
      {/* Elegant Heading */}
      <div className="mb-6 border-b pb-4">
        <h1 className="text-foreground text-2xl font-semibold tracking-tight sm:text-3xl">
          Dispatch Ledger Screen
        </h1>
      </div>

      <div className="space-y-6">
        <EditDispatchLedgerModal
          dispatchLedgerId={id}
          initialValues={{
            name: dispatchLedgerFromState?.name ?? '',
            address: dispatchLedgerFromState?.address ?? '',
            mobileNumber: dispatchLedgerFromState?.mobileNumber ?? '',
          }}
          isOpen={isEditModalOpen}
          onOpenChange={setIsEditModalOpen}
        />

        <Card className="overflow-hidden rounded-xl shadow-sm">
          <CardContent className="p-4 sm:p-5">
            <FarmerProfileOverview
              name={dispatchLedgerFromState?.name ?? 'Dispatch Ledger'}
              accountNumber={dispatchLedgerFromState?._id ?? id}
              onEdit={() => setIsEditModalOpen(true)}
              editAriaLabel="Edit dispatch ledger"
              aggregates={{
                totalBagsSeed: 0,
                totalBagsIncoming: 1200,
                totalBagsUngraded: 0,
                totalBagsGraded: 1000,
                totalBagsStored: 600,
                totalBagsNikasi: 400,
                totalBagsOutgoing: 0,
              }}
            />
          </CardContent>
        </Card>

        <div className="font-custom space-y-4">
          <div className="flex flex-wrap gap-2 sm:gap-3">
            <span> chart1</span>
            <span> chart2</span>
          </div>
          <Card className="overflow-hidden rounded-xl shadow-sm">
            <CardContent className="p-4 sm:p-5">
              <pre className="font-custom bg-muted/20 max-h-112 overflow-auto rounded-lg p-3 text-xs sm:text-sm">
                {JSON.stringify(staticGatePassesResponse, null, 2)}
              </pre>
            </CardContent>
          </Card>
          <Card className="overflow-hidden rounded-xl shadow-sm">
            <CardContent className="p-4 sm:p-5">
              <pre className="font-custom bg-muted/20 max-h-112 overflow-auto rounded-lg p-3 text-xs sm:text-sm">
                {JSON.stringify(
                  dispatchLedgerFromState ?? {
                    _id: id,
                    message:
                      'Dispatch ledger details not found in router state',
                  },
                  null,
                  2
                )}
              </pre>
            </CardContent>
          </Card>
        </div>

        <Item
          variant="outline"
          size="sm"
          className="flex-col items-stretch gap-4 rounded-xl"
        >
          {/* Search Input */}
          <div className="relative w-full">
            <Search className="text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
            <Input
              placeholder="Search by name, mobile, account number, or address..."
              className="font-custom focus-visible:ring-primary w-full pl-10 focus-visible:ring-2 focus-visible:ring-offset-2"
            />
          </div>

          {/* Footer */}
          <ItemFooter className="flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            {/* Sort Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  className="font-custom focus-visible:ring-primary w-full rounded-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 sm:w-auto"
                >
                  Sort by: Name
                  <ChevronDown className="ml-2 h-4 w-4 shrink-0" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem>Name</DropdownMenuItem>
                <DropdownMenuItem>Account Number</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Action Button */}
            <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:justify-end sm:gap-2">
              {/* <AddFarmerModal /> */}
              <Button variant="default">Add farmer (placeholder)</Button>
            </div>
          </ItemFooter>
        </Item>
      </div>
    </main>
  );
}
