import { memo } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { cn } from '@/lib/utils';
import {
  formatAccountNumber,
  formatBreakdownNumber,
  type FarmerBreakdownRow,
} from './area-breakdown-utils';

type AreaBreakdownFarmersTableProps = {
  farmers: FarmerBreakdownRow[];
  sizeKeys: string[];
  sizeTotals: Record<string, number>;
  selectedSizeKey?: string;
  area: string;
  variety?: string;
};

const AreaBreakdownFarmersTable = ({
  farmers,
  sizeKeys,
  sizeTotals,
  selectedSizeKey,
  area,
  variety,
}: AreaBreakdownFarmersTableProps) => {
  const grandTotal = farmers.reduce((sum, row) => sum + row.total, 0);

  return (
    <Card className="border-border w-full min-w-0 overflow-hidden rounded-xl shadow-sm">
      <CardHeader className="pb-2">
        <h2 className="font-custom text-foreground text-base font-semibold sm:text-lg">
          Farmer Breakdown
        </h2>
        <p className="font-custom text-muted-foreground text-xs sm:text-sm">
          {formatBreakdownNumber(farmers.length)} farmer
          {farmers.length === 1 ? '' : 's'} in {area}
          {variety ? ` · ${variety}` : ''}.
        </p>
      </CardHeader>
      <CardContent>
        <div className="border-border overflow-x-auto rounded-lg border">
          <Table className="border-collapse">
            <TableHeader>
              <TableRow className="border-border bg-muted hover:bg-muted">
                <TableHead className="font-custom border-border border px-3 py-2 font-bold whitespace-nowrap">
                  Account
                </TableHead>
                <TableHead className="font-custom border-border min-w-[220px] border px-3 py-2 font-bold">
                  Farmer
                </TableHead>
                <TableHead className="font-custom border-border border px-3 py-2 font-bold whitespace-nowrap">
                  Mobile
                </TableHead>
                {sizeKeys.map((sizeKey) => (
                  <TableHead
                    key={`head-${sizeKey}`}
                    className={cn(
                      'font-custom border-border border px-3 py-2 text-right font-bold whitespace-nowrap',
                      selectedSizeKey === sizeKey &&
                        'bg-primary/10 text-primary'
                    )}
                  >
                    {sizeKey}
                  </TableHead>
                ))}
                <TableHead className="font-custom border-border border px-3 py-2 text-right font-bold whitespace-nowrap">
                  Total
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {farmers.map((row) => (
                <TableRow
                  key={row.id}
                  className="border-border hover:bg-transparent"
                >
                  <TableCell className="font-custom border-border border px-3 py-2 tabular-nums">
                    {formatAccountNumber(row.accountNumber)}
                  </TableCell>
                  <TableCell className="font-custom border-border border px-3 py-2 font-medium">
                    <span className="line-clamp-2">{row.name}</span>
                  </TableCell>
                  <TableCell className="font-custom border-border border px-3 py-2 whitespace-nowrap tabular-nums">
                    {row.mobileNumber || '-'}
                  </TableCell>
                  {sizeKeys.map((sizeKey) => {
                    const value = Number(row.sizeValues[sizeKey] ?? 0);
                    return (
                      <TableCell
                        key={`${row.id}-${sizeKey}`}
                        className={cn(
                          'font-custom border-border border px-3 py-2 text-right tabular-nums',
                          selectedSizeKey === sizeKey && 'bg-primary/5',
                          value > 0 && 'font-medium'
                        )}
                      >
                        {formatBreakdownNumber(value)}
                      </TableCell>
                    );
                  })}
                  <TableCell className="font-custom text-primary bg-primary/10 border-border border px-3 py-2 text-right font-bold tabular-nums">
                    {formatBreakdownNumber(row.total)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
            <TableFooter>
              <TableRow className="border-border hover:bg-transparent">
                <TableHead
                  colSpan={3}
                  className="font-custom bg-muted/50 border-border border px-3 py-2 font-bold"
                >
                  Bag Total
                </TableHead>
                {sizeKeys.map((sizeKey) => (
                  <TableCell
                    key={`footer-${sizeKey}`}
                    className={cn(
                      'font-custom bg-muted/50 border-border border px-3 py-2 text-right font-bold tabular-nums',
                      selectedSizeKey === sizeKey &&
                        'bg-primary/10 text-primary'
                    )}
                  >
                    {formatBreakdownNumber(sizeTotals[sizeKey] ?? 0)}
                  </TableCell>
                ))}
                <TableCell className="font-custom text-primary bg-primary/10 border-border border px-3 py-2 text-right font-bold tabular-nums">
                  {formatBreakdownNumber(grandTotal)}
                </TableCell>
              </TableRow>
            </TableFooter>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
};

export default memo(AreaBreakdownFarmersTable);
