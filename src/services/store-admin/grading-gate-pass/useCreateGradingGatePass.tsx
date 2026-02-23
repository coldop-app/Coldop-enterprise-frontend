import { useMutation } from '@tanstack/react-query';
import { AxiosError } from 'axios';
import { toast } from 'sonner';
import storeAdminAxiosClient from '@/lib/axios';
import { queryClient } from '@/lib/queryClient';
import type {
  CreateGradingGatePassInput,
  CreateGradingGatePassApiResponse,
} from '@/types/grading-gate-pass';
import { gradingGatePassReportKeys } from '@/services/store-admin/analytics/grading/useGetGradingGatePassReports';
import { gradingGatePassKeys } from './useGetGradingGatePasses';
import { daybookKeys } from './useGetDaybook';

/** API error shape (400, 404, 409): { success, error: { code, message } } */
type GradingGatePassApiError = {
  message?: string;
  error?: { code?: string; message?: string };
};

function getGradingGatePassErrorMessage(
  data: GradingGatePassApiError | undefined
): string {
  return (
    data?.error?.message ??
    data?.message ??
    'Failed to create grading gate pass'
  );
}

/**
 * Hook to create a grading gate pass.
 * POST /grading-gate-pass
 * Payload may include optional manualGatePassNumber (number).
 */
export function useCreateGradingGatePass() {
  return useMutation<
    CreateGradingGatePassApiResponse,
    AxiosError<GradingGatePassApiError>,
    CreateGradingGatePassInput
  >({
    mutationKey: [...gradingGatePassKeys.all, 'create'],

    mutationFn: async (payload) => {
      const { data } =
        await storeAdminAxiosClient.post<CreateGradingGatePassApiResponse>(
          '/grading-gate-pass',
          payload
        );
      return data;
    },

    onSuccess: (data) => {
      if (data.success) {
        toast.success(data.message ?? 'Grading gate pass created successfully');
        queryClient.invalidateQueries({ queryKey: daybookKeys.all });
        queryClient.invalidateQueries({ queryKey: gradingGatePassKeys.all });
        queryClient.invalidateQueries({ queryKey: gradingGatePassReportKeys.all });
      } else {
        toast.error(data.message ?? 'Failed to create grading gate pass');
      }
    },

    onError: (error) => {
      const errMsg = error.response?.data
        ? getGradingGatePassErrorMessage(error.response.data)
        : error.message || 'Failed to create grading gate pass';
      toast.error(errMsg);
    },
  });
}
