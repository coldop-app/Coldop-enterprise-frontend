import { useMutation } from '@tanstack/react-query';
import { AxiosError } from 'axios';
import { toast } from 'sonner';
import storeAdminAxiosClient from '@/lib/axios';
import { queryClient } from '@/lib/queryClient';
import type {
  EditIncomingGatePassApiResponse,
  EditIncomingGatePassInput,
} from '@/types/incoming-gate-pass';
import { incomingGatePassKeys } from './useGetIncomingGatePasses';

/** API error shape (e.g. 400/404/409): { success, error: { code, message } } */
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
 * API: PUT /incoming-gate-pass/:id
 * Body: supports full edit payload (farmer, gate pass, date, variety, location,
 * truck, bags, weightSlip, status, remarks, reason, etc.)
 */
export function useEditIncomingGatePass() {
  return useMutation<
    EditIncomingGatePassApiResponse,
    AxiosError<IncomingGatePassApiError>,
    EditIncomingGatePassParams
  >({
    mutationKey: [...incomingGatePassKeys.all, 'edit'],

    mutationFn: async ({ id, ...payload }) => {
      const safeId = encodeURIComponent(id);
      const { data } =
        await storeAdminAxiosClient.put<EditIncomingGatePassApiResponse>(
          `/incoming-gate-pass/${safeId}`,
          payload
        );
      return data;
    },

    onSuccess: async (data) => {
      if (!data.success) {
        toast.error(data.message ?? 'Failed to update incoming gate pass');
        return;
      }

      toast.success(data.message ?? 'Incoming gate pass updated successfully');

      await Promise.all([
        queryClient.invalidateQueries({ queryKey: incomingGatePassKeys.all }),
      ]);
    },

    onError: (error) => {
      const errMsg = error.response?.data
        ? getEditErrorMessage(error.response.data)
        : error.message || 'Failed to update incoming gate pass';
      toast.error(errMsg);
    },
  });
}
