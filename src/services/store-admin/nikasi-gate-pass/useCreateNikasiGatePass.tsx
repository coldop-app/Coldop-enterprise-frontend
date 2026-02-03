import { useMutation } from '@tanstack/react-query';
import { AxiosError } from 'axios';
import { toast } from 'sonner';
import storeAdminAxiosClient from '@/lib/axios';
import { queryClient } from '@/lib/queryClient';
import type {
  CreateNikasiGatePassInput,
  CreateNikasiGatePassApiResponse,
} from '@/types/nikasi-gate-pass';
import { nikasiGatePassKeys } from './useGetNikasiGatePasses';
import { daybookKeys } from '../grading-gate-pass/useGetDaybook';
import { gradingGatePassKeys } from '../grading-gate-pass/useGetGradingGatePasses';
import { gradingGatePassesByFarmerKey } from '../grading-gate-pass/useGetGradingPassesOfSingleFarmer';

/** API error shape (400, 404, 409): { success, error: { code, message } } */
type NikasiGatePassApiError = {
  message?: string;
  error?: { code?: string; message?: string };
};

function getNikasiGatePassErrorMessage(
  data: NikasiGatePassApiError | undefined
): string {
  return (
    data?.error?.message ?? data?.message ?? 'Failed to create nikasi gate pass'
  );
}

/**
 * Hook to create a nikasi gate pass.
 * POST /nikasi-gate-pass
 * Payload may include optional manualGatePassNumber (number).
 */
export function useCreateNikasiGatePass() {
  return useMutation<
    CreateNikasiGatePassApiResponse,
    AxiosError<NikasiGatePassApiError>,
    CreateNikasiGatePassInput
  >({
    mutationKey: [...nikasiGatePassKeys.all, 'create'],

    mutationFn: async (payload) => {
      const { data } =
        await storeAdminAxiosClient.post<CreateNikasiGatePassApiResponse>(
          '/nikasi-gate-pass',
          payload
        );
      return data;
    },

    onSuccess: (data, variables) => {
      if (data.status === 'Success') {
        toast.success(data.message ?? 'Nikasi gate pass created successfully');
        queryClient.invalidateQueries({ queryKey: daybookKeys.all });
        queryClient.invalidateQueries({ queryKey: nikasiGatePassKeys.all });
        queryClient.invalidateQueries({ queryKey: gradingGatePassKeys.all });
        queryClient.invalidateQueries({
          queryKey: gradingGatePassesByFarmerKey(variables.farmerStorageLinkId),
        });
      } else {
        toast.error(data.message ?? 'Failed to create nikasi gate pass');
      }
    },

    onError: (error) => {
      const errMsg = error.response?.data
        ? getNikasiGatePassErrorMessage(error.response.data)
        : error.message || 'Failed to create nikasi gate pass';
      toast.error(errMsg);
    },
  });
}
