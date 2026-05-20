import { useMutation } from '@tanstack/react-query';
import { AxiosError } from 'axios';
import { toast } from 'sonner';
import storeAdminAxiosClient from '@/lib/axios';
import { queryClient } from '@/lib/queryClient';
import type {
  EditStorageGatePassApiResponse,
  EditStorageGatePassInput,
} from '@/types/storage-gate-pass';
import { storageGatePassKeys } from './useGetStorageGatePasses';

type StorageGatePassApiError = {
  message?: string;
  error?: { code?: string; message?: string };
};

function getEditErrorMessage(
  data: StorageGatePassApiError | undefined
): string {
  return (
    data?.error?.message ??
    data?.message ??
    'Failed to update storage gate pass'
  );
}

export type EditStorageGatePassParams = EditStorageGatePassInput & {
  id: string;
};

export function useEditStorageGatePass() {
  return useMutation<
    EditStorageGatePassApiResponse,
    AxiosError<StorageGatePassApiError>,
    EditStorageGatePassParams
  >({
    mutationKey: [...storageGatePassKeys.all, 'edit'],

    mutationFn: async ({ id, ...payload }) => {
      const safeId = encodeURIComponent(id);
      const { data } =
        await storeAdminAxiosClient.put<EditStorageGatePassApiResponse>(
          `/storage-gate-pass/${safeId}`,
          payload
        );
      return data;
    },

    onSuccess: async (data) => {
      if (!data.success) {
        toast.error(data.message ?? 'Failed to update storage gate pass');
        return;
      }

      toast.success(data.message ?? 'Storage gate pass updated successfully');

      await Promise.all([
        queryClient.invalidateQueries({ queryKey: storageGatePassKeys.all }),
      ]);
    },

    onError: (error) => {
      const errMsg = error.response?.data
        ? getEditErrorMessage(error.response.data)
        : error.message || 'Failed to update storage gate pass';
      toast.error(errMsg);
    },
  });
}
