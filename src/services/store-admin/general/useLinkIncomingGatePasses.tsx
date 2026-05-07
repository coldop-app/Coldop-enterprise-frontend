import { useMutation } from '@tanstack/react-query';
import { AxiosError } from 'axios';
import { toast } from 'sonner';
import storeAdminAxiosClient from '@/lib/axios';
import { queryClient } from '@/lib/queryClient';
import { gradingGatePassKeys } from '../grading-gate-pass/useGetGradingGatePasses';
import { incomingGatePassesOfFarmerKeys } from './useGetIncomingGatePassesOfFarmer';

type LinkIncomingGatePassesApiResponse = {
  success: boolean;
  message?: string;
};

type LinkIncomingGatePassesApiError = {
  success?: boolean;
  message?: string;
  error?: { code?: string; message?: string };
};

export type LinkIncomingGatePassesParams = {
  gradingGatePassId: string;
  incomingGatePassIds: string[];
};

const DEFAULT_ERROR = 'Failed to link incoming gate pass';

function getLinkErrorMessage(
  data: LinkIncomingGatePassesApiError | undefined
): string {
  return data?.error?.message ?? data?.message ?? DEFAULT_ERROR;
}

/** POST /grading-gate-pass/:gradingGatePassId/link-incoming-gate-pass */
export function useLinkIncomingGatePasses() {
  return useMutation<
    LinkIncomingGatePassesApiResponse,
    AxiosError<LinkIncomingGatePassesApiError>,
    LinkIncomingGatePassesParams
  >({
    mutationKey: [...gradingGatePassKeys.all, 'link-incoming-gate-pass'],
    mutationFn: async ({ gradingGatePassId, incomingGatePassIds }) => {
      const safeGradingGatePassId = encodeURIComponent(
        gradingGatePassId.trim()
      );
      const payload = {
        incomingGatePassIds: incomingGatePassIds
          .map((id) => id.trim())
          .filter(Boolean),
      };

      const { data } =
        await storeAdminAxiosClient.post<LinkIncomingGatePassesApiResponse>(
          `/grading-gate-pass/${safeGradingGatePassId}/link-incoming-gate-pass`,
          payload
        );

      if (data.success) {
        await Promise.all([
          queryClient.invalidateQueries({
            queryKey: gradingGatePassKeys.all,
          }),
          queryClient.invalidateQueries({
            queryKey: incomingGatePassesOfFarmerKeys.all,
          }),
        ]);
      }

      return data;
    },
    onSuccess: (data) => {
      if (data.success) {
        toast.success(data.message ?? 'Incoming gate pass linked');
      } else {
        toast.error(data.message ?? DEFAULT_ERROR);
      }
    },
    onError: (error) => {
      const errMsg = error.response?.data
        ? getLinkErrorMessage(error.response.data)
        : error.message || DEFAULT_ERROR;
      toast.error(errMsg);
    },
  });
}
