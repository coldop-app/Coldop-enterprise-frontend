import { useMutation } from '@tanstack/react-query';
import { AxiosError } from 'axios';
import { toast } from 'sonner';
import storeAdminAxiosClient from '@/lib/axios';
import { queryClient } from '@/lib/queryClient';
import type {
  EditFarmerSeedApiResponse,
  EditFarmerSeedInput,
} from '@/types/farmer-seed.ts';
import { farmerSeedKeys } from './useCreateFarmerSeedEntry';

/** API error shape: { success, error: { code, message } } */
type FarmerSeedApiError = {
  message?: string;
  error?: { code?: string; message?: string };
};

function getEditFarmerSeedErrorMessage(
  data: FarmerSeedApiError | undefined
): string {
  return (
    data?.error?.message ?? data?.message ?? 'Failed to update farmer seed'
  );
}

/** Params for the edit mutation: farmer seed id + payload */
export type EditFarmerSeedParams = EditFarmerSeedInput & {
  id: string;
};

/** Hook to update a farmer seed entry. PUT /farmer-seed/:id */
export function useEditFarmerSeedEntry() {
  return useMutation<
    EditFarmerSeedApiResponse,
    AxiosError<FarmerSeedApiError>,
    EditFarmerSeedParams
  >({
    mutationKey: [...farmerSeedKeys.all, 'edit'],

    mutationFn: async ({ id, ...payload }) => {
      const normalizedPayload: EditFarmerSeedInput = {
        ...payload,
        gatePassNo:
          payload.gatePassNo !== undefined
            ? Number(payload.gatePassNo)
            : undefined,
        bagSizes: payload.bagSizes?.map((item) => ({
          ...item,
          quantity: Number(item.quantity),
          rate: Number(item.rate),
          acres: Number(item.acres ?? 0),
        })),
        remarks:
          payload.remarks !== undefined ? payload.remarks.trim() : undefined,
      };
      const { data } =
        await storeAdminAxiosClient.put<EditFarmerSeedApiResponse>(
          `/farmer-seed/${id}`,
          normalizedPayload
        );
      return data;
    },

    onSuccess: (data) => {
      if (data.success) {
        toast.success(data.message ?? 'Farmer seed updated successfully');
        queryClient.invalidateQueries({ queryKey: farmerSeedKeys.all });
      } else {
        toast.error(data.message ?? 'Failed to update farmer seed');
      }
    },

    onError: (error) => {
      const errMsg = error.response?.data
        ? getEditFarmerSeedErrorMessage(error.response.data)
        : error.message || 'Failed to update farmer seed';
      toast.error(errMsg);
    },
  });
}
