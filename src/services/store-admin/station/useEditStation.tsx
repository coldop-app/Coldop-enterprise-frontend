import { useMutation } from '@tanstack/react-query';
import { AxiosError } from 'axios';
import { toast } from 'sonner';
import storeAdminAxiosClient from '@/lib/axios';
import { queryClient } from '@/lib/queryClient';
import type {
  EditStationApiResponse,
  EditStationInput,
  EditStationParams,
} from '@/types/station';
import { stationKeys } from './keys';

/** API error shape: { success, error: { code, message } } */
type EditStationApiError = {
  success?: boolean;
  message?: string;
  error?: { code?: string; message?: string };
};

const DEFAULT_ERROR_MESSAGE = 'Failed to update station';

const STATUS_ERROR_MESSAGES: Record<number, string> = {
  400: 'Invalid station update payload',
  401: 'Authentication token is required',
  404: 'Station not found',
};

function getEditStationErrorMessage(
  data: EditStationApiError | undefined,
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

function normalizeEditStationPayload(
  payload: EditStationInput
): EditStationInput {
  const normalizedPayload: EditStationInput = {};

  if (payload.name !== undefined) {
    normalizedPayload.name = payload.name.trim();
  }

  if (payload.rate !== undefined) {
    normalizedPayload.rate =
      payload.rate === null ? null : Number(payload.rate);
  }

  return normalizedPayload;
}

/** Hook to update a station. PUT /station/:id */
export function useEditStation() {
  return useMutation<
    EditStationApiResponse,
    AxiosError<EditStationApiError>,
    EditStationParams
  >({
    mutationKey: [...stationKeys.all, 'edit'],
    mutationFn: async ({ id, ...payload }) => {
      const safeId = encodeURIComponent(id);
      const normalizedPayload = normalizeEditStationPayload(payload);

      const { data } = await storeAdminAxiosClient.put<EditStationApiResponse>(
        `/station/${safeId}`,
        normalizedPayload
      );

      return data;
    },
    onSuccess: async (data) => {
      if (!data.success) {
        toast.error(data.message ?? DEFAULT_ERROR_MESSAGE);
        return;
      }

      toast.success(data.message ?? 'Station updated successfully');
      await queryClient.invalidateQueries({
        queryKey: stationKeys.all,
      });
    },
    onError: (error) => {
      const status = error.response?.status;
      const errMsg = error.response?.data
        ? getEditStationErrorMessage(error.response.data, status)
        : status !== undefined && status in STATUS_ERROR_MESSAGES
          ? STATUS_ERROR_MESSAGES[status]
          : error.message || DEFAULT_ERROR_MESSAGE;

      toast.error(errMsg);
    },
  });
}
