import { useMutation } from '@tanstack/react-query';
import { AxiosError } from 'axios';
import { toast } from 'sonner';
import storeAdminAxiosClient from '@/lib/axios';
import { queryClient } from '@/lib/queryClient';
import type {
  EditFarmerStorageLinkApiResponse,
  EditFarmerStorageLinkInput,
} from '@/types/farmer';
import { farmerStorageLinksKeys } from './useGetAllFarmers';
import { allGatePassesOfFarmerKeys } from './useGetAllGatePassesOfFarmer';

/** API error shape (e.g. 400/404): { success, error: { code, message } } */
type EditFarmerStorageLinkApiError = {
  success?: boolean;
  message?: string;
  error?: { code?: string; message?: string };
};

const DEFAULT_ERROR_MESSAGE = 'Failed to update farmer';

function getEditFarmerErrorMessage(
  data: EditFarmerStorageLinkApiError | undefined
): string {
  return data?.error?.message ?? data?.message ?? DEFAULT_ERROR_MESSAGE;
}

/** Params: farmer-storage-link id + PUT body */
export type EditFarmerParams = EditFarmerStorageLinkInput & {
  farmerStorageLinkId: string;
};

/**
 * Updates farmer details on a farmer–storage link.
 *
 * API: PUT /farmer-storage-link/:farmerStorageLinkId
 */
export function useEditFarmer() {
  return useMutation<
    EditFarmerStorageLinkApiResponse,
    AxiosError<EditFarmerStorageLinkApiError>,
    EditFarmerParams
  >({
    mutationKey: [...farmerStorageLinksKeys.all, 'edit'],
    mutationFn: async ({ farmerStorageLinkId, ...payload }) => {
      const safeId = encodeURIComponent(farmerStorageLinkId);
      const { data } =
        await storeAdminAxiosClient.put<EditFarmerStorageLinkApiResponse>(
          `/farmer-storage-link/${safeId}`,
          payload
        );
      return data;
    },
    onSuccess: async (data, variables) => {
      if (!data.success) {
        toast.error(data.message ?? DEFAULT_ERROR_MESSAGE);
        return;
      }

      toast.success(data.message ?? 'Farmer updated successfully');
      await queryClient.invalidateQueries({
        queryKey: farmerStorageLinksKeys.all,
      });
      await queryClient.invalidateQueries({
        queryKey: allGatePassesOfFarmerKeys.detail(
          variables.farmerStorageLinkId
        ),
      });
    },
    onError: (error) => {
      const errMsg = error.response?.data
        ? getEditFarmerErrorMessage(error.response.data)
        : error.message || DEFAULT_ERROR_MESSAGE;
      toast.error(errMsg);
    },
  });
}
