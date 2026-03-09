import { memo } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export interface FarmerQuantityRow {
  farmerName: string;
  quantity: number;
  percentage: number;
}

export interface FarmerQuantityRowAllSizes {
  farmerName: string;
  quantitiesBySize: Record<string, number>;
  total: number;
  percentage: number;
}

export interface FarmerQuantityTableProps {
  rows: FarmerQuantityRow[];
  sizeLabel: string;
  sizeColumns?: string[];
  rowsAllSizes?: FarmerQuantityRowAllSizes[];
  quantityColumnLabel?: string;
}

const FarmerQuantityTable = memo(function FarmerQuantityTable({
  rows,
  sizeLabel,
  sizeColumns = [],
  rowsAllSizes = [],
  quantityColumnLabel,
}: FarmerQuantityTableProps) {
  const hasAllSizes = sizeColumns.length > 0 && rowsAllSizes.length > 0;

  if (rows.length === 0) {
    return (
      <Card className="border-border rounded-xl shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="font-custom text-foreground text-base font-semibold sm:text-lg">
            Farmer-wise quantity
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="font-custom text-muted-foreground text-sm">
            No farmer data for this selection.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-border rounded-xl shadow-sm">
      <CardHeader className="pb-2">
        <CardTitle className="font-custom text-foreground text-base font-semibold sm:text-lg">
          Farmer-wise quantity · {sizeLabel}
        </CardTitle>
      </CardHeader>
      <CardContent className="min-w-0 overflow-x-auto">
        {hasAllSizes ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="font-custom font-medium">
                  Farmer
                </TableHead>
                {sizeColumns.map((size) => (
                  <TableHead
                    key={size}
                    className="font-custom text-right font-medium tabular-nums"
                  >
                    {size}
                  </TableHead>
                ))}
                <TableHead className="font-custom text-right font-medium tabular-nums">
                  Total
                </TableHead>
                <TableHead className="font-custom text-right font-medium tabular-nums">
                  %
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rowsAllSizes.map((row) => (
                <TableRow key={row.farmerName}>
                  <TableCell className="font-custom font-medium">
                    {row.farmerName}
                  </TableCell>
                  {sizeColumns.map((size) => (
                    <TableCell
                      key={size}
                      className="font-custom text-right tabular-nums"
                    >
                      {(row.quantitiesBySize[size] ?? 0).toLocaleString(
                        'en-IN'
                      )}
                    </TableCell>
                  ))}
                  <TableCell className="font-custom text-right font-medium tabular-nums">
                    {row.total.toLocaleString('en-IN')}
                  </TableCell>
                  <TableCell className="font-custom text-right tabular-nums">
                    {row.percentage.toFixed(1)}%
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="font-custom font-medium">
                  Farmer
                </TableHead>
                <TableHead className="font-custom text-right font-medium tabular-nums">
                  {quantityColumnLabel ?? 'Quantity'}
                </TableHead>
                <TableHead className="font-custom text-right font-medium tabular-nums">
                  %
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row) => (
                <TableRow key={row.farmerName}>
                  <TableCell className="font-custom font-medium">
                    {row.farmerName}
                  </TableCell>
                  <TableCell className="font-custom text-right tabular-nums">
                    {row.quantity.toLocaleString('en-IN')}
                  </TableCell>
                  <TableCell className="font-custom text-right tabular-nums">
                    {row.percentage.toFixed(1)}%
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
});

export default FarmerQuantityTable;
