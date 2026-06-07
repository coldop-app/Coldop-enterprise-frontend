import type { ReactNode } from 'react';
import type { ColumnDef } from '@tanstack/react-table';

import { formatNullableAmount, formatNullableNumber } from './format-utils';

const MDASH = '\u2014';

export type FinancePlantingRow = {
  id: string;
  particulars: string;
  areaPlantedAcres: number | null;
  numberOfBags: number | null;
  bagWeight: number | null;
  ratePerAcreOrBag: number | null;
  amount: number | null;
};

export type FinanceGradingRow = {
  id: string;
  particulars: string;
  gradingSizes: string | null;
  bagsAfterGrading: number | null;
  weightStoredOrDispatchedKg: number | null;
  readyBagsPostStorage50kg: number | null;
  shortageAtSixPercent: number | null;
  afterShortageBag: number | null;
  salePricePerBag: number | null;
  saleAmount: number | null;
};

function formatNullableText(value: string | null | undefined): string {
  const trimmed = value?.trim();
  return trimmed ? trimmed : MDASH;
}

const rightAlignedHeader = (label: string) => (
  <div className="font-custom w-full text-right">{label}</div>
);

const leftAlignedHeader = (label: string) => (
  <span className="font-custom">{label}</span>
);

export function renderPlantingColumnHeaders(): ReactNode[] {
  return plantingColumns.map((col, index) => {
    const header = col.header;
    if (typeof header === 'function') {
      return header({
        column: { id: col.id ?? String(index) },
      } as Parameters<NonNullable<typeof header>>[0]);
    }
    return header ?? null;
  });
}

export function renderGradingColumnHeaders(): ReactNode[] {
  return gradingColumns.map((col, index) => {
    const header = col.header;
    if (typeof header === 'function') {
      return header({
        column: { id: col.id ?? String(index) },
      } as Parameters<NonNullable<typeof header>>[0]);
    }
    return header ?? null;
  });
}

export function renderPlantingDataCells(row: FinancePlantingRow): ReactNode[] {
  return [
    <span key="particulars" className="font-custom text-foreground">
      {row.particulars}
    </span>,
    numericCell(row.areaPlantedAcres, 2),
    numericCell(row.numberOfBags, 0),
    numericCell(row.bagWeight, 2),
    numericCell(row.ratePerAcreOrBag, 2),
    amountCell(row.amount),
  ];
}

export function renderGradingDataCells(row: FinanceGradingRow): ReactNode[] {
  return [
    <span key="gradingSizes" className="font-custom text-foreground">
      {formatNullableText(row.gradingSizes)}
    </span>,
    numericCell(row.bagsAfterGrading, 0),
    numericCell(row.weightStoredOrDispatchedKg, 2),
    numericCell(row.readyBagsPostStorage50kg, 0),
    numericCell(row.shortageAtSixPercent, 0),
    numericCell(row.afterShortageBag, 0),
    amountCell(row.salePricePerBag),
    amountCell(row.saleAmount),
  ];
}

function numericCell(
  value: number | null | undefined,
  precision = 2
): ReactNode {
  return (
    <div className="font-custom text-right font-medium tabular-nums">
      {formatNullableNumber(value, precision)}
    </div>
  );
}

function amountCell(value: number | null | undefined): ReactNode {
  return (
    <div className="font-custom text-right font-medium tabular-nums">
      {formatNullableAmount(value)}
    </div>
  );
}

function serialNumberColumn<T>(): ColumnDef<T> {
  return {
    id: 'serialNumber',
    header: () => leftAlignedHeader('S No.'),
    cell: ({ row }) => (
      <span className="font-custom text-muted-foreground tabular-nums">
        {row.index + 1}
      </span>
    ),
    enableSorting: false,
  };
}

export const plantingColumns: ColumnDef<FinancePlantingRow>[] = [
  serialNumberColumn<FinancePlantingRow>(),
  {
    accessorKey: 'particulars',
    header: () => leftAlignedHeader('Particulars'),
    cell: ({ row }) => (
      <span className="font-custom text-foreground">
        {row.getValue<string>('particulars')}
      </span>
    ),
  },
  {
    accessorKey: 'areaPlantedAcres',
    header: () => rightAlignedHeader('Area Planted (acres)'),
    cell: ({ row }) => numericCell(row.getValue('areaPlantedAcres'), 2),
  },
  {
    accessorKey: 'numberOfBags',
    header: () => rightAlignedHeader('Number of Bags'),
    cell: ({ row }) => numericCell(row.getValue('numberOfBags'), 0),
  },
  {
    accessorKey: 'bagWeight',
    header: () => rightAlignedHeader('Bag Weight'),
    cell: ({ row }) => numericCell(row.getValue('bagWeight'), 2),
  },
  {
    accessorKey: 'ratePerAcreOrBag',
    header: () => rightAlignedHeader('Rate per acre/ bag'),
    cell: ({ row }) => numericCell(row.getValue('ratePerAcreOrBag'), 2),
  },
  {
    accessorKey: 'amount',
    header: () => rightAlignedHeader('Amount'),
    cell: ({ row }) => amountCell(row.getValue('amount')),
  },
];

export const gradingColumns: ColumnDef<FinanceGradingRow>[] = [
  {
    accessorKey: 'gradingSizes',
    header: () => leftAlignedHeader('Grading sizes'),
    cell: ({ row }) => (
      <span className="font-custom text-foreground">
        {formatNullableText(row.getValue('gradingSizes'))}
      </span>
    ),
  },
  {
    accessorKey: 'bagsAfterGrading',
    header: () => rightAlignedHeader('Number of bags after grading'),
    cell: ({ row }) => numericCell(row.getValue('bagsAfterGrading'), 0),
  },
  {
    accessorKey: 'weightStoredOrDispatchedKg',
    header: () => rightAlignedHeader('Weight stored / dispatched (kgs)'),
    cell: ({ row }) =>
      numericCell(row.getValue('weightStoredOrDispatchedKg'), 2),
  },
  {
    accessorKey: 'readyBagsPostStorage50kg',
    header: () => rightAlignedHeader('# of ready bags (Post Storage 50kg)'),
    cell: ({ row }) => numericCell(row.getValue('readyBagsPostStorage50kg'), 0),
  },
  {
    accessorKey: 'shortageAtSixPercent',
    header: () => rightAlignedHeader('Shortage 6%'),
    cell: ({ row }) => numericCell(row.getValue('shortageAtSixPercent'), 0),
  },
  {
    accessorKey: 'afterShortageBag',
    header: () => rightAlignedHeader('After Shortage Bag'),
    cell: ({ row }) => numericCell(row.getValue('afterShortageBag'), 0),
  },
  {
    accessorKey: 'salePricePerBag',
    header: () => rightAlignedHeader('Sale Price (per bag)'),
    cell: ({ row }) => amountCell(row.getValue('salePricePerBag')),
  },
  {
    accessorKey: 'saleAmount',
    header: () => rightAlignedHeader('Amount'),
    cell: ({ row }) => amountCell(row.getValue('saleAmount')),
  },
];
