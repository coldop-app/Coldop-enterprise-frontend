import { useMutation } from '@tanstack/react-query';
import { AxiosError } from 'axios';
import { toast } from 'sonner';
import storeAdminAxiosClient from '@/lib/axios';
import { queryClient } from '@/lib/queryClient';
import type {
  CreateLocalityApiResponse,
  CreateLocalityInput,
} from '@/types/locality';
import { stationKeys } from '../station/keys';
import { localityKeys } from './keys';

type CreateLocalityApiError = {
  success?: boolean;
  message?: string;
  error?: { code?: string; message?: string };
};

const DEFAULT_ERROR_MESSAGE = 'Failed to create locality';

const STATUS_ERROR_MESSAGES: Record<number, string> = {
  400: 'Invalid locality payload',
  401: 'Authentication token is required',
  404: 'Station not found',
  409: 'A locality with this name already exists under this station',
};

function getCreateLocalityErrorMessage(
  data: CreateLocalityApiError | undefined,
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

function normalizeCreateLocalityPayload(payload: CreateLocalityInput) {
  return {
    stationId: payload.stationId.trim(),
    name: payload.name.trim(),
    seedDispatchRatePerBag: Number(payload.seedDispatchRatePerBag),
    seedBuyBackRatePerQuintal: Number(payload.seedBuyBackRatePerQuintal),
  };
}

/** Hook to create a locality. POST /locality */
export function useCreateLocality() {
  return useMutation<
    CreateLocalityApiResponse,
    AxiosError<CreateLocalityApiError>,
    CreateLocalityInput
  >({
    mutationKey: [...localityKeys.all, 'create'],
    mutationFn: async (payload) => {
      const normalizedPayload = normalizeCreateLocalityPayload(payload);

      const { data } =
        await storeAdminAxiosClient.post<CreateLocalityApiResponse>(
          '/locality/',
          normalizedPayload
        );

      return data;
    },
    onSuccess: async (data, variables) => {
      if (!data.success) {
        toast.error(data.message ?? DEFAULT_ERROR_MESSAGE);
        return;
      }

      await queryClient.invalidateQueries({
        queryKey: localityKeys.lists(variables.stationId),
      });
      await queryClient.invalidateQueries({
        queryKey: stationKeys.all,
      });
    },
    onError: (error) => {
      const status = error.response?.status;
      const errMsg = error.response?.data
        ? getCreateLocalityErrorMessage(error.response.data, status)
        : status !== undefined && status in STATUS_ERROR_MESSAGES
          ? STATUS_ERROR_MESSAGES[status]
          : error.message || DEFAULT_ERROR_MESSAGE;

      toast.error(errMsg);
    },
  });
}
