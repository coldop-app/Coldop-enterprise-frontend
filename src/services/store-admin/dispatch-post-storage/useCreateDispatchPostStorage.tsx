import { useMutation } from '@tanstack/react-query';
import { useRouter } from '@tanstack/react-router';
import { AxiosError } from 'axios';
import { toast } from 'sonner';

import storeAdminAxiosClient from '@/lib/axios';
import { queryClient } from '@/lib/queryClient';
import { dispatchPostStorageKeys } from '@/services/store-admin/dispatch-post-storage/useGetDispatchPostStorage';
import { voucherNumberKeys } from '@/services/store-admin/general/useGetVoucherNumber';
import { storageGatePassKeys } from '@/services/store-admin/storage-gate-pass/useGetStorageGatePasses';
import { useStore } from '@/stores/store';
import type {
  CreateDispatchPostStorageApiResponse,
  CreateDispatchPostStorageInput,
} from '@/types/dispatch-post-storage';

type DispatchPostStorageApiError = {
  status?: string;
  statusCode?: number;
  errorCode?: string;
  message?: string;
  error?: { code?: string; message?: string };
};

const DEFAULT_ERROR_MESSAGE = 'Failed to create dispatch (post storage)';

const STATUS_ERROR_MESSAGES: Record<number, string> = {
  400: 'Invalid dispatch (post storage) payload',
  404: 'Farmer storage link or storage gate pass not found',
  409: 'Dispatch (post storage) number already exists',
};

export function isCreateDispatchPostStorageSuccess(
  data: CreateDispatchPostStorageApiResponse
): boolean {
  if (typeof data.success === 'boolean') return data.success;
  return data.status?.toLowerCase() === 'success';
}

function getCreateDispatchPostStorageErrorMessage(
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

function normalizeCreateDispatchPostStoragePayload(
  payload: CreateDispatchPostStorageInput
): CreateDispatchPostStorageInput {
  return {
    farmerStorageLinkId: payload.farmerStorageLinkId.trim(),
    gatePassNo: payload.gatePassNo,
    date: payload.date,
    variety: payload.variety.trim(),
    from: payload.from.trim(),
    to: payload.to.trim(),
    storageGatePasses: payload.storageGatePasses.map((entry) => ({
      storageGatePassId: entry.storageGatePassId.trim(),
      allocations: entry.allocations.map((allocation) => ({
        size: allocation.size.trim(),
        quantityToAllocate: allocation.quantityToAllocate,
        chamber: allocation.chamber.trim(),
        floor: allocation.floor.trim(),
        row: allocation.row.trim(),
      })),
    })),
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
    ...(payload.idempotencyKey !== undefined && {
      idempotencyKey: payload.idempotencyKey.trim(),
    }),
  };
}

/** Hook to create a dispatch (post storage). POST /dispatch-post-storage */
export function useCreateDispatchPostStorage() {
  const router = useRouter();
  const setDaybookActiveTab = useStore((state) => state.setDaybookActiveTab);

  return useMutation<
    CreateDispatchPostStorageApiResponse,
    AxiosError<DispatchPostStorageApiError>,
    CreateDispatchPostStorageInput
  >({
    mutationKey: [...dispatchPostStorageKeys.all, 'create'],
    mutationFn: async (payload) => {
      const normalizedPayload =
        normalizeCreateDispatchPostStoragePayload(payload);
      const { data } =
        await storeAdminAxiosClient.post<CreateDispatchPostStorageApiResponse>(
          '/dispatch-post-storage',
          normalizedPayload
        );

      return data;
    },
    onSuccess: async (data) => {
      if (!isCreateDispatchPostStorageSuccess(data)) {
        toast.error(data.message ?? DEFAULT_ERROR_MESSAGE);
        return;
      }

      toast.success(
        data.message ?? 'Dispatch (post storage) created successfully'
      );

      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: dispatchPostStorageKeys.all,
        }),
        queryClient.invalidateQueries({
          queryKey: storageGatePassKeys.all,
        }),
        queryClient.invalidateQueries({
          queryKey: voucherNumberKeys.detail('dispatch-post-storage'),
        }),
      ]);

      setDaybookActiveTab('dispatch-outgoing');
      await router.navigate({ to: '/store-admin/daybook' });
    },
    onError: (error) => {
      const status = error.response?.status;
      const errMsg = error.response?.data
        ? getCreateDispatchPostStorageErrorMessage(error.response.data, status)
        : status !== undefined && status in STATUS_ERROR_MESSAGES
          ? STATUS_ERROR_MESSAGES[status]
          : error.message || DEFAULT_ERROR_MESSAGE;

      toast.error(errMsg);
    },
  });
}
