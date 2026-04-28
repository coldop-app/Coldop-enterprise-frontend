import type { ColumnDef } from '@tanstack/react-table';

export type IncomingReportRow = {
  id: string;
  farmerId: string;
  gatePassNo: number;
  manualGatePassNumber: number;
  farmerName: string;
  farmerMobileNumber: string;
  farmerAddress: string;
  createdByName: string;
  createdByMobileNumber: string;
  variety: string;
  location: string;
  truckNumber: string;
  bagsReceived: number;
  slipNumber: string;
  grossWeightKg: number;
  tareWeightKg: number;
  remarks: string;
  date: string;
  createdAt: string;
  updatedAt: string;
  status: string;
};

export const columns: ColumnDef<IncomingReportRow>[] = [
  {
    accessorKey: 'gatePassNo',
    header: 'Gate Pass No',
  },
  {
    accessorKey: 'manualGatePassNumber',
    header: 'Manual Gate Pass No',
  },
  {
    accessorKey: 'farmerName',
    header: 'Farmer',
  },
  {
    accessorKey: 'farmerMobileNumber',
    header: 'Farmer Mobile',
  },
  {
    accessorKey: 'farmerAddress',
    header: 'Farmer Address',
  },
  {
    accessorKey: 'createdByName',
    header: 'Created By',
  },
  {
    accessorKey: 'variety',
    header: 'Variety',
  },
  {
    accessorKey: 'location',
    header: 'Location',
  },
  {
    accessorKey: 'truckNumber',
    header: 'Truck Number',
  },
  {
    accessorKey: 'date',
    header: 'Date',
  },
  {
    accessorKey: 'bagsReceived',
    header: 'Bags',
  },
  {
    accessorKey: 'slipNumber',
    header: 'Weight Slip No',
  },
  {
    accessorKey: 'grossWeightKg',
    header: 'Gross Wt (Kg)',
  },
  {
    accessorKey: 'tareWeightKg',
    header: 'Tare Wt (Kg)',
  },
  {
    accessorKey: 'remarks',
    header: 'Remarks',
  },
  {
    accessorKey: 'status',
    header: 'Status',
  },
];
