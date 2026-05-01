import { useMutation } from '@tanstack/react-query';
import { AxiosError } from 'axios';
import { toast } from 'sonner';
import storeAdminAxiosClient from '@/lib/axios';
import { queryClient } from '@/lib/queryClient';
import type {
  CreateDispatchLedgerApiResponse,
  CreateDispatchLedgerInput,
} from '@/types/dispatch-ledger';
import { dispatchLedgerKeys } from './useGetDispatchLedgers';

/** API error shape: { success, message, error: { code, message } } */
type DispatchLedgerApiError = {
  success?: boolean;
  message?: string;
  error?: { code?: string; message?: string };
};

const DEFAULT_ERROR_MESSAGE = 'Failed to create dispatch ledger';

const STATUS_ERROR_MESSAGES: Record<number, string> = {
  400: 'Invalid dispatch ledger payload',
  401: 'Unauthorized request',
  409: 'Dispatch ledger already exists',
};

function getCreateDispatchLedgerErrorMessage(
  data: DispatchLedgerApiError | undefined,
  status?: number
): string {
  return (
    data?.error?.message ??
    data?.message ??
    (status !== undefined && status in STATUS_ERROR_MESSAGES
      ? STATUS_ERROR_MESSAGES[status]
      : null) ??
    DEFAULT_ERROR_MESSAGE
  );
}

/** Hook to create a dispatch ledger entry. POST /dispatch-ledger */
export function useCreateDispatchLedger() {
  return useMutation<
    CreateDispatchLedgerApiResponse,
    AxiosError<DispatchLedgerApiError>,
    CreateDispatchLedgerInput
  >({
    mutationKey: [...dispatchLedgerKeys.all, 'create'],
    mutationFn: async (payload) => {
      const normalizedPayload: CreateDispatchLedgerInput = {
        name: payload.name.trim(),
        address: payload.address.trim(),
        mobileNumber: payload.mobileNumber.trim(),
      };

      const { data } =
        await storeAdminAxiosClient.post<CreateDispatchLedgerApiResponse>(
          '/dispatch-ledger',
          normalizedPayload
        );

      return data;
    },
    onSuccess: async (data) => {
      if (data.success) {
        toast.success(data.message ?? 'Dispatch ledger created successfully');
        await queryClient.invalidateQueries({
          queryKey: dispatchLedgerKeys.all,
        });
      } else {
        toast.error(data.message ?? DEFAULT_ERROR_MESSAGE);
      }
    },
    onError: (error) => {
      const status = error.response?.status;
      const errMsg = error.response?.data
        ? getCreateDispatchLedgerErrorMessage(error.response.data, status)
        : status !== undefined && status in STATUS_ERROR_MESSAGES
          ? STATUS_ERROR_MESSAGES[status]
          : error.message || DEFAULT_ERROR_MESSAGE;

      toast.error(errMsg);
    },
  });
}
