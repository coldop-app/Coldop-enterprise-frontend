import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import {
  Item,
  ItemHeader,
  ItemMedia,
  ItemTitle,
  ItemActions,
  ItemFooter,
} from '@/components/ui/item';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import {
  BarChart3,
  RefreshCw,
  Search,
  ChevronDown,
  Download,
} from 'lucide-react';
import { useGetOverview } from '@/services/store-admin/analytics/useGetOverview';
import Overview from './overview';

const AnalyticsPage = () => {
  const { refetch, isFetching } = useGetOverview();
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'Date' | 'Metric'>('Date');

  return (
    <main className="mx-auto max-w-7xl p-3 sm:p-4 lg:p-6">
      <div className="space-y-4 sm:space-y-6">
        {/* Header: title + refresh */}
        <Item variant="outline" size="sm" className="rounded-xl shadow-sm">
          <ItemHeader className="h-full">
            <div className="flex items-center gap-3">
              <ItemMedia variant="icon" className="rounded-lg">
                <BarChart3 className="text-primary h-5 w-5" />
              </ItemMedia>
              <ItemTitle className="font-custom text-sm font-semibold sm:text-base">
                Analytics
              </ItemTitle>
            </div>
            <ItemActions>
              <Button
                variant="outline"
                size="sm"
                disabled={isFetching}
                onClick={() => refetch()}
                className="font-custom h-8 gap-2 rounded-lg px-3"
              >
                <RefreshCw
                  className={`h-4 w-4 shrink-0 ${
                    isFetching ? 'animate-spin' : ''
                  }`}
                />
                <span className="hidden sm:inline">Refresh</span>
              </Button>
            </ItemActions>
          </ItemHeader>
        </Item>

        {/* Search + sort + export */}
        <Item
          variant="outline"
          size="sm"
          className="flex-col items-stretch gap-4 rounded-xl"
        >
          <div className="relative w-full">
            <Search className="text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
            <Input
              placeholder="Search by date range, metric..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="font-custom focus-visible:ring-primary w-full pl-10 focus-visible:ring-2 focus-visible:ring-offset-2"
            />
          </div>
          <ItemFooter className="flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  className="font-custom focus-visible:ring-primary w-full rounded-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 sm:w-auto"
                >
                  Sort by: {sortBy}
                  <ChevronDown className="ml-2 h-4 w-4 shrink-0" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem onClick={() => setSortBy('Date')}>
                  Date
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setSortBy('Metric')}>
                  Metric
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <Button variant="default" className="font-custom gap-2 rounded-lg">
              <Download className="h-4 w-4 shrink-0" />
              Export report
            </Button>
          </ItemFooter>
        </Item>

        <Overview />
        <Card className="font-custom">
          <CardContent className="p-0 pt-0">
            <Tabs defaultValue="incoming" className="w-full">
              <TabsList className="font-custom flex h-auto w-full flex-nowrap overflow-x-auto">
                <TabsTrigger
                  value="incoming"
                  className="min-w-0 flex-1 shrink-0 px-3 sm:px-4"
                >
                  <span className="sm:hidden">Inc</span>
                  <span className="hidden sm:inline">Incoming</span>
                </TabsTrigger>
                <TabsTrigger
                  value="grading"
                  className="min-w-0 flex-1 shrink-0 px-3 sm:px-4"
                >
                  <span className="sm:hidden">Gra</span>
                  <span className="hidden sm:inline">Grading</span>
                </TabsTrigger>
                <TabsTrigger
                  value="storage"
                  className="min-w-0 flex-1 shrink-0 px-3 sm:px-4"
                >
                  <span className="sm:hidden">Sto</span>
                  <span className="hidden sm:inline">Storage</span>
                </TabsTrigger>
                <TabsTrigger
                  value="dispatch"
                  className="min-w-0 flex-1 shrink-0 px-3 sm:px-4"
                >
                  <span className="sm:hidden">Dis</span>
                  <span className="hidden sm:inline">Dispatch</span>
                </TabsTrigger>
                <TabsTrigger
                  value="outgoing"
                  className="min-w-0 flex-1 shrink-0 px-3 sm:px-4"
                >
                  <span className="sm:hidden">Out</span>
                  <span className="hidden sm:inline">Outgoing</span>
                </TabsTrigger>
              </TabsList>
              <div className="p-4">
                <TabsContent value="incoming" className="mt-0 outline-none">
                  <p className="font-custom text-sm leading-relaxed text-gray-600">
                    Incoming analytics content will appear here. This section
                    will show summaries and trends for material received at the
                    store.
                  </p>
                </TabsContent>
                <TabsContent value="grading" className="mt-0 outline-none">
                  <p className="font-custom text-sm leading-relaxed text-gray-600">
                    Grading analytics content will appear here. This section
                    will display grading pass summaries and quality metrics.
                  </p>
                </TabsContent>
                <TabsContent value="storage" className="mt-0 outline-none">
                  <p className="font-custom text-sm leading-relaxed text-gray-600">
                    Storage analytics content will appear here. This section
                    will show warehouse and storage movement data.
                  </p>
                </TabsContent>
                <TabsContent value="dispatch" className="mt-0 outline-none">
                  <p className="font-custom text-sm leading-relaxed text-gray-600">
                    Dispatch (nikasi) analytics content will appear here. This
                    section will show gate pass and dispatch summaries.
                  </p>
                </TabsContent>
                <TabsContent value="outgoing" className="mt-0 outline-none">
                  <p className="font-custom text-sm leading-relaxed text-gray-600">
                    Outgoing analytics content will appear here. This section
                    will show final delivery and outward movement data.
                  </p>
                </TabsContent>
              </div>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </main>
  );
};

export default AnalyticsPage;
