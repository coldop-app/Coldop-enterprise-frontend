import { useMutation } from '@tanstack/react-query';
import { AxiosError } from 'axios';
import { toast } from 'sonner';
import storeAdminAxiosClient from '@/lib/axios';
import { queryClient } from '@/lib/queryClient';
import type {
  EditIncomingGatePassInput,
  EditIncomingGatePassApiResponse,
} from '@/types/incoming-gate-pass';
import { daybookKeys } from '../grading-gate-pass/useGetDaybook';
import { incomingGatePassKeys } from './useCreateIncomingGatePass';

/** API error shape (400, 404, 409): { success, error: { code, message } } */
type IncomingGatePassApiError = {
  message?: string;
  error?: { code?: string; message?: string };
};

function getEditErrorMessage(
  data: IncomingGatePassApiError | undefined
): string {
  return (
    data?.error?.message ??
    data?.message ??
    'Failed to update incoming gate pass'
  );
}

/** Params for the edit mutation: gate pass id + payload */
export type EditIncomingGatePassParams = EditIncomingGatePassInput & {
  id: string;
};

/**
 * Hook to update an incoming gate pass.
 *
 * API: PUT /api/v1/incoming-gate-pass/:id
 * Headers: Authorization: Bearer <token>, Content-Type: application/json
 * Body: { manualGatePassNumber?, weightSlip?: { grossWeightKg, tareWeightKg }, reason? }
 * Response: { success: true, data: {}, message: "Incoming gate pass updated successfully" }
 *
 * @example
 * mutate({
 *   id: '69b290b6952285098e02091e',
 *   manualGatePassNumber: 400,
 *   weightSlip: { grossWeightKg: 620.5, tareWeightKg: 520.2 },
 *   reason: 'Corrected weights from weighbridge slip',
 * });
 */
export function useEditIncomingGatePass() {
  return useMutation<
    EditIncomingGatePassApiResponse,
    AxiosError<IncomingGatePassApiError>,
    EditIncomingGatePassParams
  >({
    mutationKey: [...incomingGatePassKeys.all, 'edit'],

    mutationFn: async ({ id, ...payload }) => {
      const { data } =
        await storeAdminAxiosClient.put<EditIncomingGatePassApiResponse>(
          `/incoming-gate-pass/${id}`,
          payload
        );
      return data;
    },

    onSuccess: (data) => {
      if (data.success) {
        toast.success(
          data.message ?? 'Incoming gate pass updated successfully'
        );
        queryClient.invalidateQueries({ queryKey: daybookKeys.all });
        queryClient.invalidateQueries({ queryKey: incomingGatePassKeys.all });
      } else {
        toast.error(data.message ?? 'Failed to update incoming gate pass');
      }
    },

    onError: (error) => {
      const errMsg = error.response?.data
        ? getEditErrorMessage(error.response.data)
        : error.message || 'Failed to update incoming gate pass';
      toast.error(errMsg);
    },
  });
}
