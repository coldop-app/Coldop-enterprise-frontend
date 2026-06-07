import { useMutation } from '@tanstack/react-query';
import { AxiosError } from 'axios';
import { toast } from 'sonner';
import storeAdminAxiosClient from '@/lib/axios';
import { queryClient } from '@/lib/queryClient';
import type {
  EditLocalityApiResponse,
  EditLocalityInput,
  EditLocalityParams,
} from '@/types/locality';
import { stationKeys } from '../station/keys';
import { localityKeys } from './keys';

type EditLocalityApiError = {
  success?: boolean;
  message?: string;
  error?: { code?: string; message?: string };
};

const DEFAULT_ERROR_MESSAGE = 'Failed to update locality';

const STATUS_ERROR_MESSAGES: Record<number, string> = {
  400: 'Invalid locality update payload',
  401: 'Authentication token is required',
  404: 'Locality not found',
  409: 'A locality with this name already exists under this station',
};

function getEditLocalityErrorMessage(
  data: EditLocalityApiError | undefined,
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

function normalizeEditLocalityPayload(payload: EditLocalityInput) {
  return {
    name: payload.name.trim(),
    seedDispatchRatePerBag: Number(payload.seedDispatchRatePerBag),
    seedBuyBackRatePerQuintal: Number(payload.seedBuyBackRatePerQuintal),
  };
}

/** Hook to update a locality. PUT /locality/:id */
export function useEditLocality() {
  return useMutation<
    EditLocalityApiResponse,
    AxiosError<EditLocalityApiError>,
    EditLocalityParams
  >({
    mutationKey: [...localityKeys.all, 'edit'],
    mutationFn: async ({ id, ...payload }) => {
      const safeId = encodeURIComponent(id);
      const normalizedPayload = normalizeEditLocalityPayload(payload);

      const { data } = await storeAdminAxiosClient.put<EditLocalityApiResponse>(
        `/locality/${safeId}`,
        normalizedPayload
      );

      return data;
    },
    onSuccess: async (data) => {
      if (!data.success) {
        toast.error(data.message ?? DEFAULT_ERROR_MESSAGE);
        return;
      }

      const stationId = data.data?.stationId;
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
        ? getEditLocalityErrorMessage(error.response.data, status)
        : status !== undefined && status in STATUS_ERROR_MESSAGES
          ? STATUS_ERROR_MESSAGES[status]
          : error.message || DEFAULT_ERROR_MESSAGE;

      toast.error(errMsg);
    },
  });
}
