import { useMutation } from '@tanstack/react-query';
import { AxiosError } from 'axios';
import { toast } from 'sonner';
import storeAdminAxiosClient from '@/lib/axios';
import { queryClient } from '@/lib/queryClient';
import { farmerStorageLinksKeys } from '../functions/useGetAllFarmers';

export interface UpdateFarmerInput {
  name: string;
  address: string;
  mobileNumber: string;
  accountNumber: number;
}

export type UpdateFarmerParams = UpdateFarmerInput & {
  /** `farmer-storage-link` document id */
  id: string;
};

type UpdateFarmerApiError = {
  success?: boolean;
  message?: string;
  error?: { code?: string; message?: string };
};

type UpdateFarmerApiResponse = {
  success: boolean;
  data?: Record<string, unknown> | null;
  message?: string;
};

function getUpdateErrorMessage(data: UpdateFarmerApiError | undefined): string {
  return (
    data?.error?.message ??
    data?.message ??
    'Failed to update farmer-storage link'
  );
}

/**
 * Hook to update a single farmer–storage link.
 *
 * Makes:
 * - PUT `/farmer-storage-link/:id` (relative to `src/lib/axios.ts` baseURL)
 * - JSON body: `{ name, address, mobileNumber, accountNumber }`
 * - Auth: `Authorization: Bearer <token>` via Axios interceptor
 */
export function useUpdateFarmer() {
  return useMutation<
    UpdateFarmerApiResponse,
    AxiosError<UpdateFarmerApiError>,
    UpdateFarmerParams
  >({
    mutationKey: [...farmerStorageLinksKeys.all, 'edit'],

    mutationFn: async ({ id, ...payload }) => {
      const { data } = await storeAdminAxiosClient.put<UpdateFarmerApiResponse>(
        `/farmer-storage-link/${encodeURIComponent(id)}`,
        payload
      );
      return data;
    },

    onSuccess: (data) => {
      if (data.success) {
        toast.success(data.message ?? 'Farmer updated successfully');
        queryClient.invalidateQueries({ queryKey: farmerStorageLinksKeys.all });
      } else {
        toast.error(data.message ?? 'Failed to update farmer');
      }
    },

    onError: (error) => {
      const errMsg =
        error.response?.data != null
          ? getUpdateErrorMessage(error.response.data)
          : error.message || 'Failed to update farmer';
      toast.error(errMsg);
    },
  });
}
