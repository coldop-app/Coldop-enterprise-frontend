import { memo } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Spinner } from '@/components/ui/spinner';
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@/components/ui/empty';
import { Separator } from '@/components/ui/separator';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Sprout } from 'lucide-react';
import { useGetFarmerSeed } from '@/services/store-admin/farmer-seed/useGetFarmerSeed';
import { formatFarmerSeedAmount } from '@/components/forms/farmer-seed/format-farmer-seed-amount';

export interface FarmerProfileFarmerSeedInfoDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  farmerStorageLinkId: string;
}

export const FarmerProfileFarmerSeedInfoDialog = memo(
  function FarmerProfileFarmerSeedInfoDialog({
    open,
    onOpenChange,
    farmerStorageLinkId,
  }: FarmerProfileFarmerSeedInfoDialogProps) {
    const { data, isPending, isError, error, isFetching } = useGetFarmerSeed(
      farmerStorageLinkId,
      { enabled: open && Boolean(farmerStorageLinkId) }
    );

    const loading = isPending || (isFetching && data === undefined);

    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="font-custom sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-custom text-lg font-semibold">
              Farmer seed details
            </DialogTitle>
            <DialogDescription className="font-custom text-muted-foreground text-sm">
              Variety, generation, and bag sizes on file for this account.
            </DialogDescription>
          </DialogHeader>

          <div className="min-h-32">
            {loading ? (
              <div className="flex flex-col items-center justify-center gap-3 py-10">
                <Spinner className="text-primary h-8 w-8" />
                <p className="font-custom text-muted-foreground text-sm">
                  Loading seed info…
                </p>
              </div>
            ) : isError ? (
              <Empty className="border-border rounded-xl border py-8">
                <EmptyHeader>
                  <EmptyMedia variant="icon">
                    <Sprout className="size-6" />
                  </EmptyMedia>
                  <EmptyTitle className="font-custom">
                    Could not load seed information
                  </EmptyTitle>
                  <EmptyDescription className="font-custom">
                    {error instanceof Error
                      ? error.message
                      : 'Something went wrong. Please try again.'}
                  </EmptyDescription>
                </EmptyHeader>
              </Empty>
            ) : data == null ? (
              <Empty className="border-border rounded-xl border py-8">
                <EmptyHeader>
                  <EmptyMedia variant="icon">
                    <Sprout className="size-6" />
                  </EmptyMedia>
                  <EmptyTitle className="font-custom">
                    No seed information available
                  </EmptyTitle>
                </EmptyHeader>
                <EmptyContent>
                  <p className="font-custom text-muted-foreground text-center text-sm leading-relaxed">
                    There is no farmer seed record for this account yet. Add
                    seed details from the Farmer seed page when you have them.
                  </p>
                </EmptyContent>
              </Empty>
            ) : (
              <div className="space-y-4">
                <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div>
                    <dt className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
                      Variety
                    </dt>
                    <dd className="font-custom mt-0.5 text-base font-medium text-[#333]">
                      {data.variety}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
                      Generation
                    </dt>
                    <dd className="font-custom mt-0.5 text-base font-medium text-[#333]">
                      {data.generation}
                    </dd>
                  </div>
                  <div className="sm:col-span-2">
                    <dt className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
                      Account number
                    </dt>
                    <dd className="font-custom mt-0.5 text-base font-medium text-[#333]">
                      #{data.farmerStorageLinkId.accountNumber}
                    </dd>
                  </div>
                </dl>

                <Separator />

                <div>
                  <p className="font-custom mb-2 text-sm font-medium text-[#333]">
                    Bag sizes
                  </p>
                  {data.bagSizes.length === 0 ? (
                    <p className="font-custom text-muted-foreground text-sm">
                      No bag sizes recorded.
                    </p>
                  ) : (
                    <div className="rounded-lg border">
                      <Table>
                        <TableHeader>
                          <TableRow className="hover:bg-transparent">
                            <TableHead className="font-custom">Size</TableHead>
                            <TableHead className="font-custom text-right">
                              Qty
                            </TableHead>
                            <TableHead className="font-custom text-right">
                              Rate
                            </TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {data.bagSizes.map((row) => (
                            <TableRow key={row.name}>
                              <TableCell className="font-custom font-medium">
                                {row.name}
                              </TableCell>
                              <TableCell className="font-custom text-right tabular-nums">
                                {formatFarmerSeedAmount(row.quantity)}
                              </TableCell>
                              <TableCell className="font-custom text-right tabular-nums">
                                {formatFarmerSeedAmount(row.rate)}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    );
  }
);
