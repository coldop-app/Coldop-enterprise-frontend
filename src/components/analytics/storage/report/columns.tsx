import type { ColumnDef } from '@tanstack/react-table';

export type IncomingReportRow = {
  id: string;
  farmerId: string;
  farmerMobileNumber: string;
  accountNumber: number | null;
  gatePassNo: number;
  manualGatePassNumber?: number;
  date: string;
  variety: string;
  bagBelow25: number;
  bag25to30: number;
  bagBelow30: number;
  bag30to35: number;
  bag30to40: number;
  bag35to40: number;
  bag40to45: number;
  bag45to50: number;
  bag50to55: number;
  bagAbove50: number;
  bagAbove55: number;
  bagCut: number;
  totalBags: number;
  remarks: string;
  createdAt: string;
  updatedAt: string;
};

export const columns: ColumnDef<IncomingReportRow>[] = [
  {
    accessorKey: 'farmerMobileNumber',
    header: 'Mobile Number',
  },
  {
    accessorKey: 'accountNumber',
    header: 'Account Number',
  },
  {
    accessorKey: 'gatePassNo',
    header: 'System Generated Gate Pass No',
  },
  {
    accessorKey: 'manualGatePassNumber',
    header: 'Manual Gate Pass No',
  },
  {
    accessorKey: 'date',
    header: 'Date',
  },
  {
    accessorKey: 'variety',
    header: 'Variety',
  },
  {
    accessorKey: 'bagBelow25',
    header: 'Below 25 (mm)',
  },
  {
    accessorKey: 'bag25to30',
    header: '25-30 (mm)',
  },
  {
    accessorKey: 'bagBelow30',
    header: 'Below 30 (mm)',
  },
  {
    accessorKey: 'bag30to35',
    header: '30-35 (mm)',
  },
  {
    accessorKey: 'bag30to40',
    header: '30-40 (mm)',
  },
  {
    accessorKey: 'bag35to40',
    header: '35-40 (mm)',
  },
  {
    accessorKey: 'bag40to45',
    header: '40-45 (mm)',
  },
  {
    accessorKey: 'bag45to50',
    header: '45-50 (mm)',
  },
  {
    accessorKey: 'bag50to55',
    header: '50-55 (mm)',
  },
  {
    accessorKey: 'bagAbove50',
    header: 'Above 50 (mm)',
  },
  {
    accessorKey: 'bagAbove55',
    header: 'Above 55 (mm)',
  },
  {
    accessorKey: 'bagCut',
    header: 'Cut',
  },
  {
    accessorKey: 'totalBags',
    header: 'Total Bags',
  },
  {
    accessorKey: 'remarks',
    header: 'Remarks',
  },
];
