/** Shared Dispatch (Post Storage) form fields (create includes farmer). */
export interface DispatchPostStorageFormValues {
  farmerStorageLinkId: string;
  date: string;
  manualGatePassNumber?: number;
  from: string;
  to: string;
  truckNumber: string;
  remarks: string;
  allocations: Record<string, number>;
}

export type EditDispatchPostStorageFormValues = Omit<
  DispatchPostStorageFormValues,
  'farmerStorageLinkId' | 'allocations'
>;

/** One bag allocation on a storage gate pass when creating a dispatch. */
export interface CreateDispatchPostStorageAllocation {
  size: string;
  quantityToAllocate: number;
  chamber: string;
  floor: string;
  row: string;
}

/** Storage gate pass entry in the create dispatch request body. */
export interface CreateDispatchPostStorageStorageGatePass {
  storageGatePassId: string;
  allocations: CreateDispatchPostStorageAllocation[];
}

/** Request body for POST /dispatch-post-storage */
export interface CreateDispatchPostStorageInput {
  farmerStorageLinkId: string;
  gatePassNo: number;
  date: string;
  variety: string;
  from: string;
  to: string;
  storageGatePasses: CreateDispatchPostStorageStorageGatePass[];
  truckNumber?: string;
  remarks?: string;
  manualGatePassNumber?: number;
  idempotencyKey?: string;
}

/** API response for POST /dispatch-post-storage */
export interface CreateDispatchPostStorageApiResponse {
  status?: string;
  success?: boolean;
  message?: string;
  data?: DispatchPostStorage | Record<string, unknown> | null;
}

/** Request body for PUT /dispatch-post-storage/:id */
export interface EditDispatchPostStorageInput {
  date: string;
  from: string;
  to: string;
  truckNumber?: string;
  remarks?: string;
  manualGatePassNumber?: number;
}

/** API response for PUT /dispatch-post-storage/:id */
export interface EditDispatchPostStorageApiResponse {
  status?: string;
  success?: boolean;
  message?: string;
  data?: DispatchPostStorage | Record<string, unknown> | null;
}

/** Request body for POST /dispatch-post-storage/:id/mark-as-null */
export interface MarkDispatchPostStorageAsNullInput {
  markAsNullRemarks: string;
}

/** API response for POST /dispatch-post-storage/:id/mark-as-null */
export interface MarkDispatchPostStorageAsNullApiResponse {
  status?: string;
  success?: boolean;
  message?: string;
  data?: DispatchPostStorage | Record<string, unknown> | null;
}

export interface DispatchPostStorageFarmer {
  _id: string;
  name: string;
  mobileNumber?: string;
  address?: string;
}

export interface DispatchPostStorageLinkedBy {
  _id: string;
  name: string;
}

export interface DispatchPostStorageFarmerStorageLink {
  _id: string;
  accountNumber?: number;
  farmerId?: DispatchPostStorageFarmer;
  linkedById?: DispatchPostStorageLinkedBy;
}

export interface DispatchPostStorageCreatedBy {
  _id: string;
  name: string;
}

export interface DispatchPostStorageOrderDetail {
  size: string;
  bagType: string;
  quantityIssued: number;
  quantityAvailable: number;
  chamber: string;
  floor: string;
  row: string;
}

export interface DispatchPostStorageSnapshotBagSize {
  size: string;
  bagType: string;
  chamber: string;
  floor: string;
  row: string;
  initialQuantity: number;
  currentQuantity: number;
  quantityIssued: number;
}

export interface DispatchPostStorageSnapshot {
  _id: string;
  gatePassNo: number;
  variety: string;
  bagSizes: DispatchPostStorageSnapshotBagSize[];
}

/** Dispatch (Post Storage) as returned by GET /dispatch-post-storage */
export interface DispatchPostStorage {
  _id: string;
  farmerStorageLinkId: DispatchPostStorageFarmerStorageLink | string;
  createdBy?: DispatchPostStorageCreatedBy | string;
  gatePassNo: number;
  manualGatePassNumber?: number;
  date: string;
  variety: string;
  from: string;
  to: string;
  truckNumber?: string;
  orderDetails: DispatchPostStorageOrderDetail[];
  storageGatePassSnapshots?: DispatchPostStorageSnapshot[];
  remarks?: string;
  markAsNullRemarks?: string;
  status?: string;
  idempotencyKey?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface DispatchPostStoragePagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

export interface GetDispatchPostStorageListParams {
  page?: number;
  limit?: number;
  sortOrder?: 'asc' | 'desc';
}

export interface GetDispatchPostStorageListApiResponse {
  success: boolean;
  data?: DispatchPostStorage[] | null;
  pagination?: DispatchPostStoragePagination;
  message?: string;
}

export interface GetDispatchPostStorageListResult {
  data: DispatchPostStorage[];
  pagination: DispatchPostStoragePagination;
}
