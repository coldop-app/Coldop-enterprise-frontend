import { useMutation } from '@tanstack/react-query';
import { AxiosError } from 'axios';
import { toast } from 'sonner';
import storeAdminAxiosClient from '@/lib/axios';
import { queryClient } from '@/lib/queryClient';
import type {
  EditNikasiGatePassApiResponse,
  EditNikasiGatePassInput,
} from '@/types/nikasi-gate-pass';
import { daybookKeys } from '../grading-gate-pass/useGetDaybook';
import { gradingGatePassKeys } from '../grading-gate-pass/useGetGradingGatePasses';
import { groupedNikasiGatePassKeys } from './useGetGroupedNikasiGatePasses';
import { nikasiGatePassKeys } from './useGetNikasiGatePasses';

/** API error shape (400, 404, 409): { success, error: { code, message } } */
type NikasiGatePassApiError = {
  message?: string;
  error?: { code?: string; message?: string };
};

function getEditErrorMessage(data: NikasiGatePassApiError | undefined): string {
  return (
    data?.error?.message ?? data?.message ?? 'Failed to update nikasi gate pass'
  );
}

/** Params for the edit mutation: nikasi gate pass id + payload */
export type EditNikasiGatePassParams = EditNikasiGatePassInput & {
  id: string;
};

/**
 * Hook to update a nikasi (dispatch) gate pass.
 *
 * API: PATCH /api/v1/nikasi-gate-pass/:id
 * Payload supports dispatchLedgerId to update destination ledger.
 * Headers: Authorization: Bearer <token>, Content-Type: application/json
 */
export function useEditNikasiGatePass() {
  return useMutation<
    EditNikasiGatePassApiResponse,
    AxiosError<NikasiGatePassApiError>,
    EditNikasiGatePassParams
  >({
    mutationKey: [...nikasiGatePassKeys.all, 'edit'],

    mutationFn: async ({ id, ...payload }) => {
      const { data } =
        await storeAdminAxiosClient.patch<EditNikasiGatePassApiResponse>(
          `/nikasi-gate-pass/${id}`,
          payload
        );
      return data;
    },

    onSuccess: (data) => {
      if (data.success) {
        toast.success(data.message ?? 'Nikasi gate pass updated successfully');
        queryClient.invalidateQueries({ queryKey: daybookKeys.all });
        queryClient.invalidateQueries({ queryKey: nikasiGatePassKeys.all });
        queryClient.invalidateQueries({
          queryKey: groupedNikasiGatePassKeys.all,
        });
        queryClient.invalidateQueries({ queryKey: gradingGatePassKeys.all });
      } else {
        toast.error(data.message ?? 'Failed to update nikasi gate pass');
      }
    },

    onError: (error) => {
      const errMsg = error.response?.data
        ? getEditErrorMessage(error.response.data)
        : error.message || 'Failed to update nikasi gate pass';
      toast.error(errMsg);
    },
  });
}
