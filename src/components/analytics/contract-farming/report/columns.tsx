import type { ColumnDef } from '@tanstack/react-table';

export type ContractFarmingReportRow = {
  id: string;
  rowKind?: 'data' | 'family-total';
  familyKey?: string;
  serialNumber?: number;
  farmerId: string;
  farmerName: string;
  farmerAddress: string;
  farmerMobileNumber: string;
  createdByName: string; // size name
  location: string; // acres planted (formatted)
  gatePassNo: number;
  manualGatePassNumber: number; // seed bags
  date: string; // generation
  variety: string;
  truckNumber: string; // buy-back varieties
  bagsReceived: number; // buy-back bags
  grossWeightKg: number; // size acres (numeric)
  tareWeightKg: number; // seed amount payable
  netWeightKg: number; // buy-back net weight
  netWeightPrecision: number;
  totalGradingBags?: number;
  below40Percent?: number | null;
  range40To50Percent?: number | null;
  above50Percent?: number | null;
  cutPercent?: number | null;
  netWeightAfterGradingKg?: number;
  buyBackAmount?: number;
  totalSeedAmount?: number | null;
  netAmountPayable?: number | null;
  netAmountPerAcre?: number | null;
  yieldPerAcreQuintals?: number | null;
  gradingBuckets?: Record<string, number>;
  status: string;
  remarks: string;
  createdByMobileNumber: string;
  slipNumber: string;
  createdAt: string;
  updatedAt: string;
};

export const columns: ColumnDef<ContractFarmingReportRow>[] = [
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
    header: 'Planted Acres',
  },
  {
    accessorKey: 'gatePassNo',
    header: 'Account No.',
  },
  {
    accessorKey: 'manualGatePassNumber',
    header: 'Size Qty',
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
