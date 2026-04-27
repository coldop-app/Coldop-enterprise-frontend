/* eslint-disable react-refresh/only-export-components */
import { createFileRoute } from '@tanstack/react-router';
import { Search, ChevronDown } from 'lucide-react';
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
import { FarmerProfileHeaderCard } from '@/components/people/FarmerProfileHeaderCard';
import { FarmerProfileMetricsGrid } from '@/components/people/FarmerProfileMetricsCard';
import { useGetAllGatePassesOfFarmer } from '@/services/store-admin/people/useGetAllGatePassesOfFarmer';

export const Route = createFileRoute(
  '/store-admin/_authenticated/people/$farmerStorageLinkId/'
)({
  component: RouteComponent,
});

function RouteComponent() {
  const { farmerStorageLinkId } = Route.useParams();
  const gatePassesResponse = useGetAllGatePassesOfFarmer(farmerStorageLinkId);

  return (
    <main className="mx-auto max-w-7xl p-3 sm:p-4 lg:p-6">
      <div className="space-y-6">
        <Card className="overflow-hidden rounded-xl shadow-sm">
          <CardContent className="p-4 sm:p-5">
            <div className="space-y-6">
              <FarmerProfileHeaderCard />
              <FarmerProfileMetricsGrid
                aggregates={{
                  totalBagsIncoming: 1200,
                  totalBagsUngraded: 0,
                  totalBagsGraded: 1000,
                  totalBagsStored: 600,
                  totalBagsNikasi: 400,
                  totalBagsOutgoing: 0,
                }}
              />
            </div>
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
                {JSON.stringify(gatePassesResponse, null, 2)}
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
