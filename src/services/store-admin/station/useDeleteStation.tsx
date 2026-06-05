import { useMutation } from '@tanstack/react-query';
import { AxiosError } from 'axios';
import { toast } from 'sonner';
import storeAdminAxiosClient from '@/lib/axios';
import { queryClient } from '@/lib/queryClient';
import type {
  DeleteStationApiResponse,
  DeleteStationParams,
} from '@/types/station';
import { stationKeys } from './keys';

/** API error shape: { success, error: { code, message } } */
type DeleteStationApiError = {
  success?: boolean;
  message?: string;
  error?: { code?: string; message?: string };
};

const DEFAULT_ERROR_MESSAGE = 'Failed to delete station';

const STATUS_ERROR_MESSAGES: Record<number, string> = {
  401: 'Authentication token is required',
  404: 'Station not found',
  409: 'Station is assigned to one or more farmer storage links and cannot be deleted',
};

function getDeleteStationErrorMessage(
  data: DeleteStationApiError | undefined,
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

/** Hook to delete a station. DELETE /station/:id */
export function useDeleteStation() {
  return useMutation<
    DeleteStationApiResponse,
    AxiosError<DeleteStationApiError>,
    DeleteStationParams
  >({
    mutationKey: [...stationKeys.all, 'delete'],
    mutationFn: async ({ id }) => {
      const safeId = encodeURIComponent(id);

      const { data } =
        await storeAdminAxiosClient.delete<DeleteStationApiResponse>(
          `/station/${safeId}`
        );

      return data;
    },
    onSuccess: async (data) => {
      if (!data.success) {
        toast.error(data.message ?? DEFAULT_ERROR_MESSAGE);
        return;
      }

      toast.success(data.message ?? 'Station deleted successfully');
      await queryClient.invalidateQueries({
        queryKey: stationKeys.all,
      });
    },
    onError: (error) => {
      const status = error.response?.status;
      const errMsg = error.response?.data
        ? getDeleteStationErrorMessage(error.response.data, status)
        : status !== undefined && status in STATUS_ERROR_MESSAGES
          ? STATUS_ERROR_MESSAGES[status]
          : error.message || DEFAULT_ERROR_MESSAGE;

      toast.error(errMsg);
    },
  });
}
