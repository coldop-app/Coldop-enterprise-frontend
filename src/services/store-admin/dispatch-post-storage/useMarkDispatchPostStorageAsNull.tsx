import { useMutation } from '@tanstack/react-query';
import { AxiosError } from 'axios';
import { toast } from 'sonner';

import storeAdminAxiosClient from '@/lib/axios';
import { queryClient } from '@/lib/queryClient';
import { dispatchPostStorageKeys } from '@/services/store-admin/dispatch-post-storage/useGetDispatchPostStorage';
import { storageGatePassKeys } from '@/services/store-admin/storage-gate-pass/useGetStorageGatePasses';
import type {
  MarkDispatchPostStorageAsNullApiResponse,
  MarkDispatchPostStorageAsNullInput,
} from '@/types/dispatch-post-storage';

type DispatchPostStorageApiError = {
  status?: string;
  statusCode?: number;
  errorCode?: string;
  message?: string;
  error?: { code?: string; message?: string };
};

const DEFAULT_ERROR_MESSAGE = 'Failed to mark dispatch (post storage) as null';

const STATUS_ERROR_MESSAGES: Record<number, string> = {
  400: 'Invalid mark as null payload',
  404: 'Dispatch (post storage) not found',
  409: 'Dispatch (post storage) is already marked as null',
};

export type MarkDispatchPostStorageAsNullParams =
  MarkDispatchPostStorageAsNullInput & {
    id: string;
  };

export function isMarkDispatchPostStorageAsNullSuccess(
  data: MarkDispatchPostStorageAsNullApiResponse
): boolean {
  if (typeof data.success === 'boolean') return data.success;
  return data.status?.toLowerCase() === 'success';
}

function getMarkAsNullErrorMessage(
  data: DispatchPostStorageApiError | undefined,
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

/** Hook to mark a dispatch (post storage) as null. POST /dispatch-post-storage/:id/mark-as-null */
export function useMarkDispatchPostStorageAsNull() {
  return useMutation<
    MarkDispatchPostStorageAsNullApiResponse,
    AxiosError<DispatchPostStorageApiError>,
    MarkDispatchPostStorageAsNullParams
  >({
    mutationKey: [...dispatchPostStorageKeys.all, 'mark-as-null'],
    mutationFn: async ({ id, markAsNullRemarks }) => {
      const safeId = encodeURIComponent(id);
      const { data } =
        await storeAdminAxiosClient.post<MarkDispatchPostStorageAsNullApiResponse>(
          `/dispatch-post-storage/${safeId}/mark-as-null`,
          { markAsNullRemarks: markAsNullRemarks.trim() }
        );

      return data;
    },
    onSuccess: async (data) => {
      if (!isMarkDispatchPostStorageAsNullSuccess(data)) {
        toast.error(data.message ?? DEFAULT_ERROR_MESSAGE);
        return;
      }

      toast.success(data.message ?? 'Dispatch (post storage) marked as null');

      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: dispatchPostStorageKeys.all,
        }),
        queryClient.invalidateQueries({
          queryKey: storageGatePassKeys.all,
        }),
      ]);
    },
    onError: (error) => {
      const status = error.response?.status;
      const errMsg = error.response?.data
        ? getMarkAsNullErrorMessage(error.response.data, status)
        : status !== undefined && status in STATUS_ERROR_MESSAGES
          ? STATUS_ERROR_MESSAGES[status]
          : error.message || DEFAULT_ERROR_MESSAGE;

      toast.error(errMsg);
    },
  });
}
