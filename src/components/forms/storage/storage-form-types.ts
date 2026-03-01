import { formatDate } from '@/lib/helpers';

export type SizeLocation = { chamber: string; floor: string; row: string };

export type RemovedQuantities = Record<string, Record<string, number>>;

/** State for one storage pass in the bulk form */
export interface StoragePassState {
  id: string;
  date: string;
  remarks: string;
  removedQuantities: RemovedQuantities;
  sizeLocations: Record<string, SizeLocation>;
}

export function createDefaultPass(id: string): StoragePassState {
  return {
    id,
    date: formatDate(new Date()),
    remarks: '',
    removedQuantities: {},
    sizeLocations: {},
  };
}

export interface StorageGatePassFormProps {
  /** Optional initial farmer; when not provided, user selects in the form. */
  farmerStorageLinkId?: string;
  /** When set, show only this grading pass. Kept for route compatibility. */
  gradingPassId?: string;
}
