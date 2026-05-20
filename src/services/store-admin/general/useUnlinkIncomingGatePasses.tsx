import { useMutation } from '@tanstack/react-query';
import { AxiosError } from 'axios';
import { toast } from 'sonner';
import storeAdminAxiosClient from '@/lib/axios';
import { queryClient } from '@/lib/queryClient';
import { gradingGatePassKeys } from '../grading-gate-pass/useGetGradingGatePasses';
import { incomingGatePassesOfFarmerKeys } from './useGetIncomingGatePassesOfFarmer';

type UnlinkIncomingGatePassesApiResponse = {
  success: boolean;
  message?: string;
};

type UnlinkIncomingGatePassesApiError = {
  success?: boolean;
  message?: string;
  error?: { code?: string; message?: string };
};

export type UnlinkIncomingGatePassesParams = {
  gradingGatePassId?: string;
  incomingGatePassIds: string[];
};

const DEFAULT_ERROR = 'Failed to unlink incoming gate passes';

function getUnlinkErrorMessage(
  data: UnlinkIncomingGatePassesApiError | undefined
): string {
  return data?.error?.message ?? data?.message ?? DEFAULT_ERROR;
}

/** POST /grading-gate-pass/unlink-incoming-gate-pass */
export function useUnlinkIncomingGatePasses() {
  return useMutation<
    UnlinkIncomingGatePassesApiResponse,
    AxiosError<UnlinkIncomingGatePassesApiError>,
    UnlinkIncomingGatePassesParams
  >({
    mutationKey: [...gradingGatePassKeys.all, 'unlink-incoming-gate-passes'],
    mutationFn: async ({ incomingGatePassIds }) => {
      const payload = {
        incomingGatePassIds: incomingGatePassIds
          .map((id) => id.trim())
          .filter(Boolean),
      };

      const { data } =
        await storeAdminAxiosClient.post<UnlinkIncomingGatePassesApiResponse>(
          '/grading-gate-pass/unlink-incoming-gate-pass',
          payload
        );

      return data;
    },
    onSuccess: async (data, variables) => {
      if (data.success) {
        await Promise.all([
          queryClient.invalidateQueries({
            queryKey: variables.gradingGatePassId
              ? gradingGatePassKeys.detail(variables.gradingGatePassId)
              : gradingGatePassKeys.all,
          }),
          queryClient.invalidateQueries({
            queryKey: incomingGatePassesOfFarmerKeys.all,
          }),
        ]);
        toast.success(data.message ?? 'Incoming gate passes unlinked');
      } else {
        toast.error(data.message ?? DEFAULT_ERROR);
      }
    },
    onError: (error) => {
      const errMsg = error.response?.data
        ? getUnlinkErrorMessage(error.response.data)
        : error.message || DEFAULT_ERROR;
      toast.error(errMsg);
    },
  });
}
