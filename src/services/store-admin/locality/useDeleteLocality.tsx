import { useMutation } from '@tanstack/react-query';
import { AxiosError } from 'axios';
import { toast } from 'sonner';
import storeAdminAxiosClient from '@/lib/axios';
import { queryClient } from '@/lib/queryClient';
import type {
  DeleteLocalityApiResponse,
  DeleteLocalityParams,
} from '@/types/locality';
import { stationKeys } from '../station/keys';
import { localityKeys } from './keys';

type DeleteLocalityApiError = {
  success?: boolean;
  message?: string;
  error?: { code?: string; message?: string };
};

const DEFAULT_ERROR_MESSAGE = 'Failed to delete locality';

const STATUS_ERROR_MESSAGES: Record<number, string> = {
  401: 'Authentication token is required',
  404: 'Locality not found',
  409: 'Locality is assigned to one or more farmer storage links and cannot be deleted',
};

function getDeleteLocalityErrorMessage(
  data: DeleteLocalityApiError | undefined,
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

/** Hook to delete a locality. DELETE /locality/:id */
export function useDeleteLocality() {
  return useMutation<
    DeleteLocalityApiResponse,
    AxiosError<DeleteLocalityApiError>,
    DeleteLocalityParams & { stationId?: string }
  >({
    mutationKey: [...localityKeys.all, 'delete'],
    mutationFn: async ({ id }) => {
      const safeId = encodeURIComponent(id);

      const { data } =
        await storeAdminAxiosClient.delete<DeleteLocalityApiResponse>(
          `/locality/${safeId}`
        );

      return data;
    },
    onSuccess: async (data, variables) => {
      if (!data.success) {
        toast.error(data.message ?? DEFAULT_ERROR_MESSAGE);
        return;
      }

      const stationId = variables.stationId ?? data.data?.stationId;
      if (stationId) {
        await queryClient.invalidateQueries({
          queryKey: localityKeys.lists(stationId),
        });
      }
      await queryClient.invalidateQueries({
        queryKey: stationKeys.all,
      });
    },
    onError: (error) => {
      const status = error.response?.status;
      const errMsg = error.response?.data
        ? getDeleteLocalityErrorMessage(error.response.data, status)
        : status !== undefined && status in STATUS_ERROR_MESSAGES
          ? STATUS_ERROR_MESSAGES[status]
          : error.message || DEFAULT_ERROR_MESSAGE;

      toast.error(errMsg);
    },
  });
}
