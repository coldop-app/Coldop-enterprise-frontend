import { useMutation } from '@tanstack/react-query';
import { AxiosError } from 'axios';
import { toast } from 'sonner';

import storeAdminAxiosClient from '@/lib/axios';
import { queryClient } from '@/lib/queryClient';
import { dispatchPostStorageKeys } from '@/services/store-admin/dispatch-post-storage/useGetDispatchPostStorage';
import type {
  EditDispatchPostStorageApiResponse,
  EditDispatchPostStorageInput,
} from '@/types/dispatch-post-storage';

type DispatchPostStorageApiError = {
  status?: string;
  statusCode?: number;
  errorCode?: string;
  message?: string;
  error?: { code?: string; message?: string };
};

const DEFAULT_ERROR_MESSAGE = 'Failed to update dispatch (post storage)';

const STATUS_ERROR_MESSAGES: Record<number, string> = {
  400: 'Invalid dispatch (post storage) payload',
  404: 'Dispatch (post storage) not found',
  409: 'Dispatch (post storage) number already exists',
};

export type EditDispatchPostStorageParams = EditDispatchPostStorageInput & {
  id: string;
};

export function isEditDispatchPostStorageSuccess(
  data: EditDispatchPostStorageApiResponse
): boolean {
  if (typeof data.success === 'boolean') return data.success;
  return data.status?.toLowerCase() === 'success';
}

function getEditDispatchPostStorageErrorMessage(
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

function normalizeEditDispatchPostStoragePayload(
  payload: EditDispatchPostStorageInput
): EditDispatchPostStorageInput {
  return {
    date: payload.date,
    from: payload.from.trim(),
    to: payload.to.trim(),
    ...(payload.manualGatePassNumber !== undefined && {
      manualGatePassNumber: payload.manualGatePassNumber,
    }),
    ...(payload.truckNumber !== undefined &&
      payload.truckNumber.trim() !== '' && {
        truckNumber: payload.truckNumber.trim(),
      }),
    ...(payload.remarks !== undefined &&
      payload.remarks.trim() !== '' && {
        remarks: payload.remarks.trim(),
      }),
  };
}

/** Hook to update a dispatch (post storage). PUT /dispatch-post-storage/:id */
export function useEditDispatchPostStorage() {
  return useMutation<
    EditDispatchPostStorageApiResponse,
    AxiosError<DispatchPostStorageApiError>,
    EditDispatchPostStorageParams
  >({
    mutationKey: [...dispatchPostStorageKeys.all, 'edit'],
    mutationFn: async ({ id, ...payload }) => {
      const safeId = encodeURIComponent(id);
      const normalizedPayload =
        normalizeEditDispatchPostStoragePayload(payload);
      const { data } =
        await storeAdminAxiosClient.put<EditDispatchPostStorageApiResponse>(
          `/dispatch-post-storage/${safeId}`,
          normalizedPayload
        );

      return data;
    },
    onSuccess: async (data) => {
      if (!isEditDispatchPostStorageSuccess(data)) {
        toast.error(data.message ?? DEFAULT_ERROR_MESSAGE);
        return;
      }

      toast.success(
        data.message ?? 'Dispatch (post storage) updated successfully'
      );

      await queryClient.invalidateQueries({
        queryKey: dispatchPostStorageKeys.all,
      });
    },
    onError: (error) => {
      const status = error.response?.status;
      const errMsg = error.response?.data
        ? getEditDispatchPostStorageErrorMessage(error.response.data, status)
        : status !== undefined && status in STATUS_ERROR_MESSAGES
          ? STATUS_ERROR_MESSAGES[status]
          : error.message || DEFAULT_ERROR_MESSAGE;

      toast.error(errMsg);
    },
  });
}
