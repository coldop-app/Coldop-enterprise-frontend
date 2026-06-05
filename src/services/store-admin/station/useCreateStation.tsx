import { useMutation } from '@tanstack/react-query';
import { AxiosError } from 'axios';
import { toast } from 'sonner';
import storeAdminAxiosClient from '@/lib/axios';
import { queryClient } from '@/lib/queryClient';
import type {
  CreateStationApiResponse,
  CreateStationInput,
} from '@/types/station';
import { stationKeys } from './keys';

/** API error shape: { success, error: { code, message } } */
type CreateStationApiError = {
  success?: boolean;
  message?: string;
  error?: { code?: string; message?: string };
};

const DEFAULT_ERROR_MESSAGE = 'Failed to create station';

const STATUS_ERROR_MESSAGES: Record<number, string> = {
  400: 'Invalid station payload',
  401: 'Authentication token is required',
};

function getCreateStationErrorMessage(
  data: CreateStationApiError | undefined,
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

function normalizeCreateStationPayload(
  payload: CreateStationInput
): CreateStationInput {
  const normalizedPayload: CreateStationInput = {
    name: payload.name.trim(),
  };

  if (payload.rate !== undefined && payload.rate !== null) {
    normalizedPayload.rate = Number(payload.rate);
  }

  return normalizedPayload;
}

/** Hook to create a station. POST /station */
export function useCreateStation() {
  return useMutation<
    CreateStationApiResponse,
    AxiosError<CreateStationApiError>,
    CreateStationInput
  >({
    mutationKey: [...stationKeys.all, 'create'],
    mutationFn: async (payload) => {
      const normalizedPayload = normalizeCreateStationPayload(payload);

      const { data } =
        await storeAdminAxiosClient.post<CreateStationApiResponse>(
          '/station/',
          normalizedPayload
        );

      return data;
    },
    onSuccess: async (data) => {
      if (!data.success) {
        toast.error(data.message ?? DEFAULT_ERROR_MESSAGE);
        return;
      }

      toast.success(data.message ?? 'Station created successfully');
      await queryClient.invalidateQueries({
        queryKey: stationKeys.all,
      });
    },
    onError: (error) => {
      const status = error.response?.status;
      const errMsg = error.response?.data
        ? getCreateStationErrorMessage(error.response.data, status)
        : status !== undefined && status in STATUS_ERROR_MESSAGES
          ? STATUS_ERROR_MESSAGES[status]
          : error.message || DEFAULT_ERROR_MESSAGE;

      toast.error(errMsg);
    },
  });
}
