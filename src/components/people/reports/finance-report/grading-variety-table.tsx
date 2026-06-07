import { type ReactNode, memo } from 'react';

import {
  gradingColumns,
  renderGradingColumnHeaders,
  renderGradingDataCells,
} from './columns';
import type {
  FinanceGradingVarietyGroup,
  FinanceGradingVarietyTotals,
} from './finance-calculations';
import { formatAmount, formatIndianNumber, MDASH } from './format-utils';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

const GRADING_COLUMN_COUNT = gradingColumns.length;
const GRADING_HEADERS = renderGradingColumnHeaders();

function formatTotalNumber(value: number, precision: number): string {
  return value === 0 ? MDASH : formatIndianNumber(value, precision);
}

function formatTotalAmount(value: number): string {
  return value === 0 ? MDASH : formatAmount(value);
}

function GradingTableShell({ children }: { children: ReactNode }) {
  return (
    <div className="subtle-scrollbar border-primary/15 bg-card/95 ring-primary/5 relative max-h-[560px] overflow-x-auto overflow-y-auto rounded-2xl border shadow-[0_1px_2px_rgba(0,0,0,0.05),0_8px_24px_rgba(0,0,0,0.06)] ring-1">
      {children}
    </div>
  );
}

function GradingTableHeader() {
  return (
    <TableHeader className="bg-secondary border-border/60 sticky top-0 z-10 border-b">
      <TableRow className="hover:bg-transparent">
        {GRADING_HEADERS.map((header, index) => (
          <TableHead
            key={gradingColumns[index]?.id ?? index}
            className="font-custom border-border/50 text-foreground/75 h-10 border-r px-3 py-2.5 text-left text-[11px] font-semibold tracking-[0.08em] uppercase last:border-r-0"
          >
            {header}
          </TableHead>
        ))}
      </TableRow>
    </TableHeader>
  );
}

function GradingVarietyFooterRow({
  varietyKey,
  totals,
}: {
  varietyKey: string;
  totals: FinanceGradingVarietyTotals;
}) {
  return (
    <TableRow
      key={`ft-${varietyKey}`}
      className="bg-secondary/70 border-border/50 border-b hover:bg-transparent"
    >
      <TableCell className="font-custom border-border/50 text-foreground h-10 border-r px-3 py-2.5 text-sm font-semibold whitespace-nowrap">
        Total
      </TableCell>
      <TableCell className="font-custom border-border/50 text-foreground h-10 border-r px-3 py-2.5 text-right text-sm font-semibold whitespace-nowrap tabular-nums">
        {formatTotalNumber(totals.bagsAfterGrading, 0)}
      </TableCell>
      <TableCell className="font-custom border-border/50 text-foreground h-10 border-r px-3 py-2.5 text-right text-sm font-semibold whitespace-nowrap tabular-nums">
        {formatTotalNumber(totals.weightStoredOrDispatchedKg, 2)}
      </TableCell>
      <TableCell className="font-custom border-border/50 text-foreground h-10 border-r px-3 py-2.5 text-right text-sm font-semibold whitespace-nowrap tabular-nums">
        {formatTotalNumber(totals.readyBagsPostStorage50kg, 0)}
      </TableCell>
      <TableCell className="font-custom border-border/50 text-foreground h-10 border-r px-3 py-2.5 text-right text-sm font-semibold whitespace-nowrap tabular-nums">
        {formatTotalNumber(totals.shortageAtSixPercent, 0)}
      </TableCell>
      <TableCell className="font-custom border-border/50 text-foreground h-10 border-r px-3 py-2.5 text-right text-sm font-semibold whitespace-nowrap tabular-nums">
        {formatTotalNumber(totals.afterShortageBag, 0)}
      </TableCell>
      <TableCell className="font-custom border-border/50 text-muted-foreground h-10 border-r px-3 py-2.5 text-center text-sm font-semibold">
        {MDASH}
      </TableCell>
      <TableCell className="font-custom border-border/50 text-foreground h-10 border-r px-3 py-2.5 text-right text-sm font-semibold whitespace-nowrap tabular-nums last:border-r-0">
        {formatTotalAmount(totals.saleAmount)}
      </TableCell>
    </TableRow>
  );
}

function GradingDataRow({
  row,
  stripeClassName,
}: {
  row: FinanceGradingVarietyGroup['gradingRows'][number];
  stripeClassName: string;
}) {
  const dataCells = renderGradingDataCells(row);

  return (
    <TableRow
      className={`border-border/50 hover:bg-accent/40 border-b transition-colors ${stripeClassName}`}
    >
      {dataCells.map((cell, index) => (
        <TableCell
          key={gradingColumns[index]?.id ?? index}
          className="font-custom border-border/40 border-r px-3 py-2.5 text-sm last:border-r-0"
        >
          {cell}
        </TableCell>
      ))}
    </TableRow>
  );
}

export interface GradingVarietyTableProps {
  varietyGroups: FinanceGradingVarietyGroup[];
}

function GradingVarietyTable({ varietyGroups }: GradingVarietyTableProps) {
  const hasAnyGroups = varietyGroups.length > 0;

  return (
    <GradingTableShell>
      <Table className="font-custom min-w-max">
        <GradingTableHeader />
        <TableBody>
          {!hasAnyGroups ? (
            <TableRow>
              <TableCell
                colSpan={GRADING_COLUMN_COUNT}
                className="font-custom text-muted-foreground px-3 py-8 text-center"
              >
                No grading data to show.
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
                    colSpan={GRADING_COLUMN_COUNT}
                    className="font-custom text-foreground border-border/40 px-3 py-2.5 text-sm font-semibold tracking-wide"
                  >
                    Variety: {group.varietyLabel}
                  </TableCell>
                </TableRow>,
              ];

              let zebra = 0;
              if (group.gradingRows.length === 0) {
                block.push(
                  <TableRow
                    key={`empty-${group.varietyKey}`}
                    className="border-border/50 border-b hover:bg-transparent"
                  >
                    <TableCell
                      colSpan={GRADING_COLUMN_COUNT}
                      className="font-custom text-muted-foreground px-3 py-6 text-center text-sm"
                    >
                      No grading data to show.
                    </TableCell>
                  </TableRow>
                );
              } else {
                for (const row of group.gradingRows) {
                  const stripe =
                    zebra % 2 === 0 ? 'bg-background' : 'bg-muted/25';
                  zebra += 1;
                  block.push(
                    <GradingDataRow
                      key={row.id}
                      row={row}
                      stripeClassName={stripe}
                    />
                  );
                }

                block.push(
                  <GradingVarietyFooterRow
                    key={`ft-${group.varietyKey}`}
                    varietyKey={group.varietyKey}
                    totals={group.totals}
                  />
                );
              }

              return block;
            })
          )}
        </TableBody>
      </Table>
    </GradingTableShell>
  );
}

export default memo(GradingVarietyTable);
