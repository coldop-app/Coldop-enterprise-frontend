import { useMutation } from '@tanstack/react-query';
import { AxiosError } from 'axios';
import { toast } from 'sonner';
import storeAdminAxiosClient from '@/lib/axios';
import { nikasiLedgerKeys } from './useCreateNikasiLedger';

/** Request body for PUT /dispatch-ledger/:id */
export interface UpdateNikasiLedgerInput {
  name?: string;
  address?: string;
  mobileNumber?: string;
}

/** Params for the update mutation: dispatch ledger id + payload */
export type UpdateNikasiLedgerParams = UpdateNikasiLedgerInput & {
  id: string;
};

/** Updated dispatch ledger entry */
export interface UpdatedNikasiLedger {
  _id: string;
  coldStorageId: string;
  name: string;
  address: string;
  mobileNumber: string;
  createdAt: string;
  updatedAt: string;
  __v: number;
}

/** API response for PUT /dispatch-ledger/:id */
export interface UpdateNikasiLedgerApiResponse {
  success: boolean;
  data?: UpdatedNikasiLedger;
  message?: string;
  error?: { code?: string; message?: string };
}

/** API error shape (400, 404, 409): { success, error: { code, message } } */
type NikasiLedgerApiError = {
  message?: string;
  error?: { code?: string; message?: string };
};

function getUpdateNikasiLedgerErrorMessage(
  data: NikasiLedgerApiError | undefined
): string {
  return (
    data?.error?.message ?? data?.message ?? 'Failed to update dispatch ledger'
  );
}

/**
 * Hook to update a dispatch ledger (nikasi ledger).
 * PUT /dispatch-ledger/:id
 */
export function useUpdateNikasiLedger() {
  return useMutation<
    UpdateNikasiLedgerApiResponse,
    AxiosError<NikasiLedgerApiError>,
    UpdateNikasiLedgerParams
  >({
    mutationKey: [...nikasiLedgerKeys.all, 'update'],

    mutationFn: async ({ id, ...payload }) => {
      const { data } =
        await storeAdminAxiosClient.put<UpdateNikasiLedgerApiResponse>(
          `/dispatch-ledger/${id}`,
          payload
        );
      return data;
    },

    onSuccess: (data) => {
      if (data.success) {
        toast.success(data.message ?? 'Dispatch ledger updated successfully');
      } else {
        toast.error(getUpdateNikasiLedgerErrorMessage(data));
      }
    },

    onError: (error) => {
      const errMsg = error.response?.data
        ? getUpdateNikasiLedgerErrorMessage(error.response.data)
        : error.message || 'Failed to update dispatch ledger';
      toast.error(errMsg);
    },
  });
}
