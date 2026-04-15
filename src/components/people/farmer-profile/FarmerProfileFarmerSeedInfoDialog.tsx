import { memo } from 'react';
import { useNavigate } from '@tanstack/react-router';
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Pencil, Sprout } from 'lucide-react';
import { formatFarmerSeedAmount } from '@/components/forms/farmer-seed/format-farmer-seed-amount';
import type { FarmerSeedEntryByStorageLink } from '@/types/farmer-seed';
import { formatDisplayDate } from '@/lib/helpers';
import { Button } from '@/components/ui/button';

export interface FarmerProfileFarmerSeedInfoDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  data?: FarmerSeedEntryByStorageLink[];
  isPending?: boolean;
  isFetching?: boolean;
  isError?: boolean;
  error?: unknown;
}

export const FarmerProfileFarmerSeedInfoDialog = memo(
  function FarmerProfileFarmerSeedInfoDialog({
    open,
    onOpenChange,
    data = [],
    isPending = false,
    isFetching = false,
    isError = false,
    error,
  }: FarmerProfileFarmerSeedInfoDialogProps) {
    const navigate = useNavigate();
    const loading = isPending || (isFetching && data === undefined);

    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="font-custom flex max-h-[min(72vh,32rem)] w-[calc(100%-2rem)] max-w-md flex-col gap-0 overflow-hidden p-0 sm:max-w-md">
          <div className="border-border shrink-0 space-y-2 border-b px-6 pt-6 pr-14 pb-4">
            <DialogHeader className="text-left">
              <DialogTitle className="font-custom text-base font-semibold">
                Farmer seed details
              </DialogTitle>
              <DialogDescription className="font-custom text-muted-foreground text-sm">
                Variety, generation, and bag sizes on file for this account.
              </DialogDescription>
            </DialogHeader>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-6 py-4">
            {loading ? (
              <div className="flex min-h-32 flex-col items-center justify-center gap-3 py-8">
                <Spinner className="text-primary h-7 w-7" />
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
            ) : data.length === 0 ? (
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
                    There are no farmer seed records for this account yet. Add
                    seed details from the Farmer seed page when you have them.
                  </p>
                </EmptyContent>
              </Empty>
            ) : (
              <div className="space-y-4">
                {data.map((entry) => (
                  <div
                    key={entry._id}
                    className="bg-muted/30 space-y-3 rounded-lg border p-3"
                  >
                    <div className="flex justify-end">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="font-custom h-8"
                        onClick={() => {
                          navigate({
                            to: '/store-admin/farmer-seed/edit',
                            state: { farmerSeedEntry: entry } as never,
                          });
                          onOpenChange(false);
                        }}
                      >
                        <Pencil className="mr-2 h-3.5 w-3.5" />
                        Edit
                      </Button>
                    </div>

                    <div className="bg-background overflow-x-auto rounded-md border">
                      <Table>
                        <TableHeader>
                          <TableRow className="hover:bg-transparent">
                            <TableHead className="font-custom text-muted-foreground h-9 text-xs font-medium whitespace-nowrap">
                              Gate pass
                            </TableHead>
                            <TableHead className="font-custom text-muted-foreground h-9 text-xs font-medium whitespace-nowrap">
                              Invoice
                            </TableHead>
                            <TableHead className="font-custom text-muted-foreground h-9 text-xs font-medium whitespace-nowrap">
                              Date
                            </TableHead>
                            <TableHead className="font-custom text-muted-foreground h-9 text-xs font-medium whitespace-nowrap">
                              Variety
                            </TableHead>
                            <TableHead className="font-custom text-muted-foreground h-9 text-xs font-medium whitespace-nowrap">
                              Gen.
                            </TableHead>
                            <TableHead className="font-custom text-muted-foreground h-9 text-xs font-medium">
                              Remarks
                            </TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          <TableRow className="hover:bg-muted/40">
                            <TableCell className="font-custom text-sm font-medium whitespace-nowrap text-[#333]">
                              {entry.gatePassNo > 0 ? entry.gatePassNo : '—'}
                            </TableCell>
                            <TableCell className="font-custom max-w-22 text-sm whitespace-nowrap text-[#333]">
                              {entry.invoiceNumber?.trim() || '—'}
                            </TableCell>
                            <TableCell className="font-custom text-sm whitespace-nowrap text-[#333]">
                              {formatDisplayDate(entry.date)}
                            </TableCell>
                            <TableCell className="font-custom max-w-24 text-sm wrap-break-word text-[#333]">
                              {entry.variety}
                            </TableCell>
                            <TableCell className="font-custom max-w-16 text-sm wrap-break-word text-[#333]">
                              {entry.generation}
                            </TableCell>
                            <TableCell className="font-custom text-muted-foreground max-w-36 text-sm wrap-break-word">
                              {entry.remarks?.trim() || '—'}
                            </TableCell>
                          </TableRow>
                        </TableBody>
                      </Table>
                    </div>

                    <div>
                      <p className="font-custom mb-1.5 text-xs font-semibold tracking-wide text-[#333] uppercase">
                        Bag sizes
                      </p>
                      {entry.bagSizes.length === 0 ? (
                        <p className="font-custom text-muted-foreground text-sm">
                          No bag sizes recorded.
                        </p>
                      ) : (
                        <div className="bg-background overflow-x-auto rounded-md border">
                          <Table>
                            <TableHeader>
                              <TableRow className="hover:bg-transparent">
                                <TableHead className="font-custom text-muted-foreground h-9 text-xs font-medium">
                                  Size
                                </TableHead>
                                <TableHead className="font-custom text-muted-foreground h-9 text-right text-xs font-medium">
                                  Qty
                                </TableHead>
                                <TableHead className="font-custom text-muted-foreground h-9 text-right text-xs font-medium">
                                  Rate
                                </TableHead>
                                <TableHead className="font-custom text-muted-foreground h-9 text-right text-xs font-medium">
                                  Acres
                                </TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {entry.bagSizes.map((row, rowIndex) => (
                                <TableRow
                                  key={`${entry._id}-${row.name}-${rowIndex}`}
                                  className="hover:bg-muted/40"
                                >
                                  <TableCell className="font-custom py-2 text-sm font-medium">
                                    {row.name}
                                  </TableCell>
                                  <TableCell className="font-custom py-2 text-right text-sm tabular-nums">
                                    {formatFarmerSeedAmount(row.quantity)}
                                  </TableCell>
                                  <TableCell className="font-custom py-2 text-right text-sm tabular-nums">
                                    {formatFarmerSeedAmount(row.rate)}
                                  </TableCell>
                                  <TableCell className="font-custom py-2 text-right text-sm tabular-nums">
                                    {formatFarmerSeedAmount(row.acres ?? 0)}
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    );
  }
);
