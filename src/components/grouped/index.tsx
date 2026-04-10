import { memo } from 'react';
import { Package, Truck, AlertCircle } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { useGetGroupedStorageGatePasses } from '@/services/store-admin/storage-gate-pass/useGetGroupedStorageGatePasses';
import { useGetGroupedNikasiGatePasses } from '@/services/store-admin/nikasi-gate-pass/useGetGroupedNikasiGatePasses';
import type { GroupedStorageGatePassGroup } from '@/types/storage-gate-pass';
import type { GroupedNikasiGatePassGroup } from '@/types/nikasi-gate-pass';

function formatDate(dateStr: string) {
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return dateStr;
  }
}

function StorageGroupCard({ group }: { group: GroupedStorageGatePassGroup }) {
  const label =
    group.manualGatePassNumber != null
      ? `Manual #${group.manualGatePassNumber}`
      : '—';
  return (
    <Card className="font-custom">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="font-custom text-lg font-semibold text-[#333] dark:text-white">
          {label} <span className="text-muted-foreground font-normal">•</span>{' '}
          {formatDate(group.date)}
        </CardTitle>
        <Badge variant="secondary" className="font-custom font-medium">
          {group.passes.length} pass{group.passes.length !== 1 ? 'es' : ''}
        </Badge>
      </CardHeader>
      <CardContent className="pt-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="font-custom font-medium">
                Gate Pass #
              </TableHead>
              <TableHead className="font-custom font-medium">Variety</TableHead>
              <TableHead className="font-custom font-medium">Date</TableHead>
              <TableHead className="font-custom text-right font-medium">
                Bags
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {group.passes.map((pass) => {
              const totalBags = (pass.orderDetails ?? []).reduce(
                (sum, o) => sum + (o.currentQuantity ?? o.initialQuantity ?? 0),
                0
              );
              return (
                <TableRow key={pass._id}>
                  <TableCell className="font-custom font-medium">
                    {pass.gatePassNo}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {pass.variety}
                  </TableCell>
                  <TableCell>{formatDate(pass.date)}</TableCell>
                  <TableCell className="font-custom text-right font-medium">
                    {totalBags}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

function NikasiGroupCard({ group }: { group: GroupedNikasiGatePassGroup }) {
  const label =
    group.manualGatePassNumber != null
      ? `Manual #${group.manualGatePassNumber}`
      : '—';
  return (
    <Card className="font-custom">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="font-custom text-lg font-semibold text-[#333] dark:text-white">
          {label} <span className="text-muted-foreground font-normal">•</span>{' '}
          {formatDate(group.date)}
        </CardTitle>
        <Badge variant="secondary" className="font-custom font-medium">
          {group.passes.length} pass{group.passes.length !== 1 ? 'es' : ''}
        </Badge>
      </CardHeader>
      <CardContent className="pt-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="font-custom font-medium">
                Gate Pass #
              </TableHead>
              <TableHead className="font-custom font-medium">Variety</TableHead>
              <TableHead className="font-custom font-medium">
                From → To
              </TableHead>
              <TableHead className="font-custom font-medium">Date</TableHead>
              <TableHead className="font-custom text-right font-medium">
                Bags
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {group.passes.map((pass) => {
              const totalBags = (pass.orderDetails ?? []).reduce(
                (sum, o) => sum + (o.quantityIssued ?? 0),
                0
              );
              return (
                <TableRow key={pass._id}>
                  <TableCell className="font-custom font-medium">
                    {pass.gatePassNo}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {pass.variety}
                  </TableCell>
                  <TableCell>
                    {pass.from} → {pass.toField}
                  </TableCell>
                  <TableCell>{formatDate(pass.date)}</TableCell>
                  <TableCell className="font-custom text-right font-medium">
                    {totalBags}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

function StorageTabContent() {
  const { data, isLoading, isError, error } = useGetGroupedStorageGatePasses();

  if (isLoading) {
    return (
      <div className="space-y-6">
        {[1, 2, 3].map((i) => (
          <Card key={i}>
            <CardHeader>
              <Skeleton className="h-6 w-48" />
              <Skeleton className="mt-2 h-4 w-32" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-[200px] w-full rounded-md" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (isError) {
    return (
      <div className="border-destructive/30 bg-destructive/5 flex flex-col items-center justify-center rounded-xl border py-12 text-center">
        <AlertCircle className="text-destructive mb-3 h-10 w-10" />
        <p className="font-custom text-base font-medium text-[#333] dark:text-white">
          Failed to load storage passes
        </p>
        <p className="font-custom text-muted-foreground mt-1 text-sm">
          {error?.message ?? 'Something went wrong.'}
        </p>
      </div>
    );
  }

  const groups = data ?? [];
  if (groups.length === 0) {
    return (
      <div className="border-border bg-muted/30 flex flex-col items-center justify-center rounded-xl border py-16 text-center">
        <Package className="text-muted-foreground mb-4 h-12 w-12" />
        <p className="font-custom text-base font-medium text-[#333] dark:text-white">
          No grouped storage passes
        </p>
        <p className="font-custom text-muted-foreground mt-1 text-sm">
          Grouped storage gate passes will appear here.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {groups.map((group, index) => (
        <StorageGroupCard
          key={`${group.date}-${group.manualGatePassNumber}-${index}`}
          group={group}
        />
      ))}
    </div>
  );
}

function NikasiTabContent() {
  const { data, isLoading, isError, error } = useGetGroupedNikasiGatePasses();

  if (isLoading) {
    return (
      <div className="space-y-6">
        {[1, 2, 3].map((i) => (
          <Card key={i}>
            <CardHeader>
              <Skeleton className="h-6 w-48" />
              <Skeleton className="mt-2 h-4 w-32" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-[200px] w-full rounded-md" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (isError) {
    return (
      <div className="border-destructive/30 bg-destructive/5 flex flex-col items-center justify-center rounded-xl border py-12 text-center">
        <AlertCircle className="text-destructive mb-3 h-10 w-10" />
        <p className="font-custom text-base font-medium text-[#333] dark:text-white">
          Failed to load Dispatch passes
        </p>
        <p className="font-custom text-muted-foreground mt-1 text-sm">
          {error?.message ?? 'Something went wrong.'}
        </p>
      </div>
    );
  }

  const groups = data ?? [];
  if (groups.length === 0) {
    return (
      <div className="border-border bg-muted/30 flex flex-col items-center justify-center rounded-xl border py-16 text-center">
        <Truck className="text-muted-foreground mb-4 h-12 w-12" />
        <p className="font-custom text-base font-medium text-[#333] dark:text-white">
          No grouped Dispatch passes
        </p>
        <p className="font-custom text-muted-foreground mt-1 text-sm">
          Grouped nikasi (Dispatch) gate passes will appear here.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {groups.map((group, index) => (
        <NikasiGroupCard
          key={`${group.date}-${group.manualGatePassNumber}-${index}`}
          group={group}
        />
      ))}
    </div>
  );
}

const GroupedOrdersPageComponent = () => {
  return (
    <main className="font-custom mx-auto max-w-[75rem] px-4 py-6 sm:px-8 sm:py-8">
      <div className="mb-8 space-y-2">
        <h1 className="font-custom text-3xl font-bold tracking-tighter text-[#333] sm:text-4xl dark:text-white">
          Grouped Orders
        </h1>
        <p className="font-custom text-muted-foreground text-base">
          View storage and Dispatch gate passes grouped by manual number and
          date.
        </p>
      </div>

      <Tabs defaultValue="storage" className="w-full">
        <TabsList className="bg-muted font-custom mb-6">
          <TabsTrigger value="storage" className="gap-2 font-medium">
            <Package className="h-4 w-4" />
            Storage passes
          </TabsTrigger>
          <TabsTrigger value="nikasi" className="gap-2 font-medium">
            <Truck className="h-4 w-4" />
            Dispatch passes
          </TabsTrigger>
        </TabsList>
        <TabsContent value="storage" className="mt-0 outline-none">
          <StorageTabContent />
        </TabsContent>
        <TabsContent value="nikasi" className="mt-0 outline-none">
          <NikasiTabContent />
        </TabsContent>
      </Tabs>
    </main>
  );
};

const GroupedOrdersPage = memo(GroupedOrdersPageComponent);
export default GroupedOrdersPage;
