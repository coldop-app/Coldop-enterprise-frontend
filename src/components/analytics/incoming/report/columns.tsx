import type { ColumnDef } from '@tanstack/react-table';

export type IncomingReportRow = {
  id: string;
  farmerId: string;
  farmerName: string;
  farmerAddress: string;
  farmerMobileNumber: string;
  createdByName: string;
  location: string;
  gatePassNo: number;
  manualGatePassNumber: number;
  date: string;
  variety: string;
  truckNumber: string;
  bagsReceived: number;
  grossWeightKg: number;
  tareWeightKg: number;
  netWeightKg: number;
  status: string;
  remarks: string;
  createdByMobileNumber: string;
  slipNumber: string;
  createdAt: string;
  updatedAt: string;
};

export const columns: ColumnDef<IncomingReportRow>[] = [
  {
    accessorKey: 'farmerName',
    header: 'Farmer',
  },
  {
    accessorKey: 'farmerAddress',
    header: 'Address',
  },
  {
    accessorKey: 'farmerMobileNumber',
    header: 'Mobile Number',
  },
  {
    accessorKey: 'createdByName',
    header: 'Created By',
  },
  {
    accessorKey: 'location',
    header: 'Location',
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
    accessorKey: 'truckNumber',
    header: 'Truck Number',
  },
  {
    accessorKey: 'bagsReceived',
    header: 'Bags',
  },
  {
    accessorKey: 'grossWeightKg',
    header: 'Gross (kg)',
  },
  {
    accessorKey: 'tareWeightKg',
    header: 'Tare (kg)',
  },
  {
    accessorKey: 'netWeightKg',
    header: 'Net (kg)',
  },
  {
    accessorKey: 'status',
    header: 'Status',
  },
  {
    accessorKey: 'remarks',
    header: 'Remarks',
  },
];
