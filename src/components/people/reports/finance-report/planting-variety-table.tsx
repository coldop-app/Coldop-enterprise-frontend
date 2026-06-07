import { type ReactNode, memo } from 'react';

import {
  plantingColumns,
  renderPlantingColumnHeaders,
  renderPlantingDataCells,
} from './columns';
import type { FinancePlantingVarietyGroup } from './finance-calculations';
import { formatAmount, formatIndianNumber, MDASH } from './format-utils';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

const PLANTING_COLUMN_COUNT = plantingColumns.length;
const PLANTING_HEADERS = renderPlantingColumnHeaders();

function PlantingTableShell({ children }: { children: ReactNode }) {
  return (
    <div className="subtle-scrollbar border-primary/15 bg-card/95 ring-primary/5 relative max-h-[560px] overflow-x-auto overflow-y-auto rounded-2xl border shadow-[0_1px_2px_rgba(0,0,0,0.05),0_8px_24px_rgba(0,0,0,0.06)] ring-1">
      {children}
    </div>
  );
}

function PlantingTableHeader() {
  return (
    <TableHeader className="bg-secondary border-border/60 sticky top-0 z-10 border-b">
      <TableRow className="hover:bg-transparent">
        {PLANTING_HEADERS.map((header, index) => (
          <TableHead
            key={plantingColumns[index]?.id ?? index}
            className="font-custom border-border/50 text-foreground/75 h-10 border-r px-3 py-2.5 text-left text-[11px] font-semibold tracking-[0.08em] uppercase last:border-r-0"
          >
            {header}
          </TableHead>
        ))}
      </TableRow>
    </TableHeader>
  );
}

function PlantingDataRow({
  row,
  serial,
  stripeClassName,
}: {
  row: FinancePlantingVarietyGroup['seedRows'][number];
  serial: number;
  stripeClassName: string;
}) {
  const dataCells = renderPlantingDataCells(row);

  return (
    <TableRow
      className={`border-border/50 hover:bg-accent/40 border-b transition-colors ${stripeClassName}`}
    >
      <TableCell className="font-custom border-border/40 text-muted-foreground border-r px-3 py-2.5 align-middle tabular-nums">
        {serial}
      </TableCell>
      {dataCells.map((cell, index) => (
        <TableCell
          key={plantingColumns[index + 1]?.id ?? index}
          className="font-custom border-border/40 border-r px-3 py-2.5 text-sm last:border-r-0"
        >
          {cell}
        </TableCell>
      ))}
    </TableRow>
  );
}

export interface PlantingVarietyTableProps {
  varietyGroups: FinancePlantingVarietyGroup[];
}

function PlantingVarietyTable({ varietyGroups }: PlantingVarietyTableProps) {
  const hasAnyGroups = varietyGroups.length > 0;

  return (
    <PlantingTableShell>
      <Table className="font-custom min-w-max">
        <PlantingTableHeader />
        <TableBody>
          {!hasAnyGroups ? (
            <TableRow>
              <TableCell
                colSpan={PLANTING_COLUMN_COUNT}
                className="font-custom text-muted-foreground px-3 py-8 text-center"
              >
                No planting data to show.
              </TableCell>
            </TableRow>
          ) : (
            varietyGroups.flatMap((group) => {
              const block: ReactNode[] = [
                <TableRow
                  key={`vh-${group.varietyKey}`}
                  className="bg-muted/60 border-border/50 border-b hover:bg-transparent"
                >
                  <TableCell
                    colSpan={PLANTING_COLUMN_COUNT}
                    className="font-custom text-foreground border-border/40 px-3 py-2.5 text-sm font-semibold tracking-wide"
                  >
                    Variety: {group.varietyLabel}
                  </TableCell>
                </TableRow>,
              ];

              let serial = 0;
              let zebra = 0;
              const allDataRows = [...group.seedRows, ...group.particularsRows];
              for (const row of allDataRows) {
                serial += 1;
                const stripe =
                  zebra % 2 === 0 ? 'bg-background' : 'bg-muted/25';
                zebra += 1;
                block.push(
                  <PlantingDataRow
                    key={row.id}
                    row={row}
                    serial={serial}
                    stripeClassName={stripe}
                  />
                );
              }

              const bagSum = group.seedRows.reduce(
                (s, r) => s + (Number(r.numberOfBags) || 0),
                0
              );
              const hasAnyAmount = allDataRows.some(
                (r) => r.amount != null && Number.isFinite(Number(r.amount))
              );

              block.push(
                <TableRow
                  key={`ft-${group.varietyKey}`}
                  className="bg-secondary/70 border-border/50 border-b hover:bg-transparent"
                >
                  <TableCell className="font-custom border-border/50 text-foreground h-10 border-r px-3 py-2.5 text-sm font-semibold whitespace-nowrap">
                    Net Amount
                  </TableCell>
                  <TableCell className="font-custom border-border/50 text-muted-foreground h-10 border-r px-3 py-2.5 text-center text-sm font-semibold">
                    {MDASH}
                  </TableCell>
                  <TableCell className="font-custom border-border/50 text-muted-foreground h-10 border-r px-3 py-2.5 text-center text-sm font-semibold">
                    {MDASH}
                  </TableCell>
                  <TableCell className="font-custom border-border/50 text-foreground h-10 border-r px-3 py-2.5 text-right text-sm font-semibold whitespace-nowrap tabular-nums">
                    {bagSum === 0 ? MDASH : formatIndianNumber(bagSum, 0)}
                  </TableCell>
                  <TableCell className="font-custom border-border/50 text-muted-foreground h-10 border-r px-3 py-2.5 text-center text-sm font-semibold">
                    {MDASH}
                  </TableCell>
                  <TableCell className="font-custom border-border/50 text-muted-foreground h-10 border-r px-3 py-2.5 text-center text-sm font-semibold">
                    {MDASH}
                  </TableCell>
                  <TableCell className="font-custom border-border/50 text-foreground h-10 border-r px-3 py-2.5 text-right text-sm font-semibold whitespace-nowrap tabular-nums last:border-r-0">
                    {!hasAnyAmount ? MDASH : formatAmount(group.netAmount)}
                  </TableCell>
                </TableRow>
              );

              return block;
            })
          )}
        </TableBody>
      </Table>
    </PlantingTableShell>
  );
}

export default memo(PlantingVarietyTable);
