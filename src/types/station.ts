export interface Station {
  _id: string;
  coldStorageId: string;
  name: string;
  rate?: number;
  createdAt: string;
  updatedAt: string;
}

/** Request body for POST /station */
export interface CreateStationInput {
  coldStorageId: string;
  name: string;
  rate?: number;
}

/** API response for POST /station */
export interface CreateStationApiResponse {
  success: boolean;
  data?: Station | null;
  message?: string;
}

/** Request body for PUT /station/:id */
export interface EditStationInput {
  coldStorageId: string;
  name?: string;
  rate?: number | null;
}

export type EditStationParams = EditStationInput & {
  id: string;
};

/** API response for PUT /station/:id */
export interface EditStationApiResponse {
  success: boolean;
  data?: Station | null;
  message?: string;
}

/** Query params for GET /station */
export interface GetStationsParams {
  coldStorageId: string;
}

/** API response for GET /station */
export interface GetStationsApiResponse {
  success: boolean;
  data?: Station[] | null;
  message?: string;
}

export interface GetStationsResult {
  data: Station[];
}

export interface DeleteStationParams {
  id: string;
}

/** API response for DELETE /station/:id */
export interface DeleteStationApiResponse {
  success: boolean;
  data?: Station | null;
  message?: string;
}
