import { useMutation } from '@tanstack/react-query';
import { AxiosError } from 'axios';
import { toast } from 'sonner';
import storeAdminAxiosClient from '@/lib/axios';
import { queryClient } from '@/lib/queryClient';
import type {
  CreateFarmerSeedApiResponse,
  CreateFarmerSeedInput,
} from '@/types/farmer-seed';

/** Query key prefix for farmer seed inventory. */
export const farmerSeedKeys = {
  all: ['store-admin', 'farmer-seed'] as const,
};

/** API error shape: { success, error: { code, message } } */
type FarmerSeedApiError = {
  message?: string;
  error?: { code?: string; message?: string };
};

function getCreateFarmerSeedErrorMessage(
  data: FarmerSeedApiError | undefined
): string {
  return (
    data?.error?.message ?? data?.message ?? 'Failed to create farmer seed'
  );
}

/** Hook to create a farmer seed entry. POST /farmer-seed */
export function useCreateFarmerSeedEntry() {
  return useMutation<
    CreateFarmerSeedApiResponse,
    AxiosError<FarmerSeedApiError>,
    CreateFarmerSeedInput
  >({
    mutationKey: [...farmerSeedKeys.all, 'create'],

    mutationFn: async (payload) => {
      const normalizedPayload: CreateFarmerSeedInput = {
        ...payload,
        bagSizes: payload.bagSizes.map((item) => ({
          ...item,
          acres: Number(item.acres ?? 0),
        })),
      };
      const { data } =
        await storeAdminAxiosClient.post<CreateFarmerSeedApiResponse>(
          '/farmer-seed',
          normalizedPayload
        );
      return data;
    },

    onSuccess: (data) => {
      if (data.success) {
        toast.success(data.message ?? 'Farmer seed created successfully');
        queryClient.invalidateQueries({ queryKey: farmerSeedKeys.all });
      } else {
        toast.error(data.message ?? 'Failed to create farmer seed');
      }
    },

    onError: (error) => {
      const errMsg = error.response?.data
        ? getCreateFarmerSeedErrorMessage(error.response.data)
        : error.message || 'Failed to create farmer seed';
      toast.error(errMsg);
    },
  });
}
