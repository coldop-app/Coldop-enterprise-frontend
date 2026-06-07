export interface Locality {
  _id: string;
  stationId: string;
  name: string;
  seedDispatchRatePerBag: number;
  seedBuyBackRatePerQuintal: number;
  createdAt: string;
  updatedAt: string;
}

/** Request body for POST /locality */
export interface CreateLocalityInput {
  stationId: string;
  name: string;
  seedDispatchRatePerBag: number;
  seedBuyBackRatePerQuintal: number;
}

/** API response for POST /locality */
export interface CreateLocalityApiResponse {
  success: boolean;
  data?: Locality | null;
  message?: string;
}

/** Request body for PUT /locality/:id */
export interface EditLocalityInput {
  name: string;
  seedDispatchRatePerBag: number;
  seedBuyBackRatePerQuintal: number;
}

export type EditLocalityParams = EditLocalityInput & {
  id: string;
};

/** API response for PUT /locality/:id */
export interface EditLocalityApiResponse {
  success: boolean;
  data?: Locality | null;
  message?: string;
}

/** Query params for GET /locality */
export interface GetLocalitiesParams {
  stationId: string;
}

/** API response for GET /locality */
export interface GetLocalitiesApiResponse {
  success: boolean;
  data?: Locality[] | null;
  message?: string;
}

export interface GetLocalitiesResult {
  data: Locality[];
}

export interface DeleteLocalityParams {
  id: string;
}

/** API response for DELETE /locality/:id */
export interface DeleteLocalityApiResponse {
  success: boolean;
  data?: Locality | null;
  message?: string;
}
