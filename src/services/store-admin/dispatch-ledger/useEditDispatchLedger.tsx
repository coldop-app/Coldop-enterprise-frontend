import { useMutation } from '@tanstack/react-query';
import { AxiosError } from 'axios';
import { toast } from 'sonner';
import storeAdminAxiosClient from '@/lib/axios';
import { queryClient } from '@/lib/queryClient';
import type {
  EditDispatchLedgerApiResponse,
  EditDispatchLedgerInput,
} from '@/types/dispatch-ledger';
import { dispatchLedgerKeys } from './useGetDispatchLedgers';

/** API error shape: { success, message, error: { code, message } } */
type DispatchLedgerApiError = {
  success?: boolean;
  message?: string;
  error?: { code?: string; message?: string };
};

const DEFAULT_ERROR_MESSAGE = 'Failed to update dispatch ledger';

function getEditDispatchLedgerErrorMessage(
  data: DispatchLedgerApiError | undefined
): string {
  return data?.error?.message ?? data?.message ?? DEFAULT_ERROR_MESSAGE;
}

/** Params for edit mutation: dispatch ledger id + payload */
export type EditDispatchLedgerParams = EditDispatchLedgerInput & {
  id: string;
};

/** Hook to update a dispatch ledger entry. PUT /dispatch-ledger/:id */
export function useEditDispatchLedger() {
  return useMutation<
    EditDispatchLedgerApiResponse,
    AxiosError<DispatchLedgerApiError>,
    EditDispatchLedgerParams
  >({
    mutationKey: [...dispatchLedgerKeys.all, 'edit'],
    mutationFn: async ({ id, ...payload }) => {
      const safeId = encodeURIComponent(id);
      const normalizedPayload: EditDispatchLedgerInput = {
        ...(payload.name !== undefined && { name: payload.name.trim() }),
        ...(payload.address !== undefined && {
          address: payload.address.trim(),
        }),
        ...(payload.mobileNumber !== undefined && {
          mobileNumber: payload.mobileNumber.trim(),
        }),
      };

      const { data } =
        await storeAdminAxiosClient.put<EditDispatchLedgerApiResponse>(
          `/dispatch-ledger/${safeId}`,
          normalizedPayload
        );

      return data;
    },
    onSuccess: async (data) => {
      if (data.success) {
        toast.success(data.message ?? 'Dispatch ledger updated successfully');
        await queryClient.invalidateQueries({
          queryKey: dispatchLedgerKeys.all,
        });
      } else {
        toast.error(data.message ?? DEFAULT_ERROR_MESSAGE);
      }
    },
    onError: (error) => {
      const errMsg = error.response?.data
        ? getEditDispatchLedgerErrorMessage(error.response.data)
        : error.message || DEFAULT_ERROR_MESSAGE;

      toast.error(errMsg);
    },
  });
}
