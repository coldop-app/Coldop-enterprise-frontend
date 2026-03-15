import { useMutation } from '@tanstack/react-query';
import { AxiosError } from 'axios';
import { toast } from 'sonner';
import storeAdminAxiosClient from '@/lib/axios';
import { queryClient } from '@/lib/queryClient';
import type {
  EditStorageGatePassInput,
  EditStorageGatePassApiResponse,
} from '@/types/storage-gate-pass';
import { storageGatePassKeys } from '../../storage-gate-pass/useGetStorageGatePasses';
import { daybookKeys } from '../../grading-gate-pass/useGetDaybook';
import { gradingGatePassKeys } from '../../grading-gate-pass/useGetGradingGatePasses';
import { storageSummaryKeys } from './useGetStorageSummary';
import { storageTrendKeys } from './useGetStorageTrendAnalysis';

/** API error shape (400, 404, 409): { success, error: { code, message } } */
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

/** Params for the edit mutation: storage gate pass id + payload */
export type EditStorageGatePassParams = EditStorageGatePassInput & {
  id: string;
};

/**
 * Hook to update a storage gate pass.
 *
 * API: PUT /api/v1/storage-gate-pass/:id
 * Headers: Authorization: Bearer <token>, Content-Type: application/json
 * Body: { date?, manualGatePassNumber?, reason? }
 * Response: { success: true, data: {}, message: "Storage gate pass updated successfully" }
 *
 * @example
 * mutate({
 *   id: 'STORAGE_GATE_PASS_ID',
 *   date: '2025-03-15',
 *   manualGatePassNumber: 42,
 *   reason: 'Correcting date and manual gate pass number',
 * });
 */
export function useEditStorageGatePass() {
  return useMutation<
    EditStorageGatePassApiResponse,
    AxiosError<StorageGatePassApiError>,
    EditStorageGatePassParams
  >({
    mutationKey: [...storageGatePassKeys.all, 'edit'],

    mutationFn: async ({ id, ...payload }) => {
      const { data } =
        await storeAdminAxiosClient.put<EditStorageGatePassApiResponse>(
          `/storage-gate-pass/${id}`,
          payload
        );
      return data;
    },

    onSuccess: (data) => {
      if (data.success) {
        toast.success(data.message ?? 'Storage gate pass updated successfully');
        queryClient.invalidateQueries({ queryKey: daybookKeys.all });
        queryClient.invalidateQueries({ queryKey: storageGatePassKeys.all });
        queryClient.invalidateQueries({ queryKey: gradingGatePassKeys.all });
        queryClient.invalidateQueries({ queryKey: storageSummaryKeys.all });
        queryClient.invalidateQueries({ queryKey: storageTrendKeys.all });
      } else {
        toast.error(data.message ?? 'Failed to update storage gate pass');
      }
    },

    onError: (error) => {
      const errMsg = error.response?.data
        ? getEditErrorMessage(error.response.data)
        : error.message || 'Failed to update storage gate pass';
      toast.error(errMsg);
    },
  });
}
