import { useMutation } from '@tanstack/react-query';
import { AxiosError } from 'axios';
import { toast } from 'sonner';
import storeAdminAxiosClient from '@/lib/axios';

/** Request body for POST /dispatch-ledger */
export interface CreateNikasiLedgerInput {
  name: string;
  address: string;
  mobileNumber: string;
}

/** Created dispatch ledger entry */
export interface CreatedNikasiLedger {
  _id: string;
  coldStorageId: string;
  name: string;
  address: string;
  mobileNumber: string;
  createdAt: string;
  updatedAt: string;
  __v: number;
}

/** API response for POST /dispatch-ledger */
export interface CreateNikasiLedgerApiResponse {
  success: boolean;
  data?: CreatedNikasiLedger;
  message?: string;
  error?: { code?: string; message?: string };
}

/** API error shape (400, 404, 409): { success, error: { code, message } } */
type NikasiLedgerApiError = {
  message?: string;
  error?: { code?: string; message?: string };
};

/** Query key prefix for dispatch ledger mutations/queries */
export const nikasiLedgerKeys = {
  all: ['store-admin', 'dispatch-ledger'] as const,
};

function getCreateNikasiLedgerErrorMessage(
  data: NikasiLedgerApiError | undefined
): string {
  return (
    data?.error?.message ?? data?.message ?? 'Failed to create dispatch ledger'
  );
}

/**
 * Hook to create a dispatch ledger (nikasi ledger).
 * POST /dispatch-ledger
 */
export function useCreateNikasiLedger() {
  return useMutation<
    CreateNikasiLedgerApiResponse,
    AxiosError<NikasiLedgerApiError>,
    CreateNikasiLedgerInput
  >({
    mutationKey: [...nikasiLedgerKeys.all, 'create'],

    mutationFn: async (payload) => {
      const { data } =
        await storeAdminAxiosClient.post<CreateNikasiLedgerApiResponse>(
          '/dispatch-ledger',
          payload
        );
      return data;
    },

    onSuccess: (data) => {
      if (data.success) {
        toast.success(data.message ?? 'Dispatch ledger created successfully');
      } else {
        toast.error(getCreateNikasiLedgerErrorMessage(data));
      }
    },

    onError: (error) => {
      const errMsg = error.response?.data
        ? getCreateNikasiLedgerErrorMessage(error.response.data)
        : error.message || 'Failed to create dispatch ledger';
      toast.error(errMsg);
    },
  });
}
