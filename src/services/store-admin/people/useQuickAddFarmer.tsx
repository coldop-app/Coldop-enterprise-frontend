import { useMutation } from '@tanstack/react-query';
import { AxiosError } from 'axios';
import { toast } from 'sonner';
import storeAdminAxiosClient from '@/lib/axios';
import { queryClient } from '@/lib/queryClient';
import type {
  QuickRegisterFarmerApiResponse,
  QuickRegisterFarmerInput,
} from '@/types/farmer';
import { farmerStorageLinksKeys } from './useGetAllFarmers';

/** API error shape (400, 404, 409): { success, error: { code, message } } */
type QuickAddFarmerApiError = {
  success?: boolean;
  message?: string;
  error?: { code?: string; message?: string };
};

const DEFAULT_ERROR_MESSAGE = 'Failed to register farmer';

const STATUS_ERROR_MESSAGES: Record<number, string> = {
  400: 'Bad request',
  404: 'Cold storage or store admin not found',
  409: 'Farmer or link already exists',
};

function getQuickAddFarmerErrorMessage(
  data: QuickAddFarmerApiError | undefined,
  status?: number
): string {
  const fromBody =
    data?.error?.message ??
    data?.message ??
    (status !== undefined && status in STATUS_ERROR_MESSAGES
      ? STATUS_ERROR_MESSAGES[status]
      : null);
  return fromBody ?? DEFAULT_ERROR_MESSAGE;
}

/**
 * Hook to quick-register a farmer and create a farmer-storage link in one call.
 * POST /store-admin/quick-register-farmer
 * On success invalidates farmer-storage-links so the list refetches.
 * Handles 400, 404, 409 and shows API error message in toast.
 */
export function useQuickAddFarmer() {
  return useMutation<
    QuickRegisterFarmerApiResponse,
    AxiosError<QuickAddFarmerApiError>,
    QuickRegisterFarmerInput
  >({
    mutationKey: ['store-admin', 'quick-register-farmer'],
    mutationFn: async (payload) => {
      const { data } =
        await storeAdminAxiosClient.post<QuickRegisterFarmerApiResponse>(
          '/store-admin/quick-register-farmer',
          payload
        );
      return data;
    },
    onSuccess: async (data) => {
      if (!data.success) {
        toast.error(data.message ?? DEFAULT_ERROR_MESSAGE);
        return;
      }

      toast.success(data.message ?? 'Farmer registered successfully');
      await queryClient.invalidateQueries({
        queryKey: farmerStorageLinksKeys.all,
      });
    },
    onError: (error) => {
      const status = error.response?.status;
      const errorMessage =
        error.response?.data !== undefined
          ? getQuickAddFarmerErrorMessage(
              error.response.data as QuickAddFarmerApiError,
              status
            )
          : status !== undefined && status in STATUS_ERROR_MESSAGES
            ? STATUS_ERROR_MESSAGES[status]
            : error.message || DEFAULT_ERROR_MESSAGE;

      toast.error(errorMessage);
    },
  });
}
