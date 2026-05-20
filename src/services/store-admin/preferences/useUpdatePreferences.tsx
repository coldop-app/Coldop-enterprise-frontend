import { useMutation } from '@tanstack/react-query';
import { AxiosError } from 'axios';
import { toast } from 'sonner';
import storeAdminAxiosClient from '@/lib/axios';
import { queryClient } from '@/lib/queryClient';
import type { PreferencesData } from './useGetPreferences';
import { preferencesKeys } from './useGetPreferences';

type UpdatePreferencesApiError = {
  success?: boolean;
  message?: string;
  error?: { code?: string; message?: string };
};

const DEFAULT_ERROR_MESSAGE = 'Failed to update preferences';

export interface UpdatePreferencesInput {
  bagSizes?: Array<string | number>;
  reportFormat?: string;
  custom?: Record<string, unknown>;
}

export type UpdatePreferencesParams = UpdatePreferencesInput & {
  coldStorageId: string;
};

export interface UpdatePreferencesApiResponse {
  success: boolean;
  message?: string;
  data?: PreferencesData | null;
}

function getUpdatePreferencesErrorMessage(
  data: UpdatePreferencesApiError | undefined
): string {
  return data?.error?.message ?? data?.message ?? DEFAULT_ERROR_MESSAGE;
}

function normalizeUpdatePreferencesPayload(
  payload: UpdatePreferencesInput
): UpdatePreferencesInput {
  return {
    ...(payload.bagSizes !== undefined && { bagSizes: payload.bagSizes }),
    ...(payload.reportFormat !== undefined && {
      reportFormat: payload.reportFormat.trim(),
    }),
    ...(payload.custom !== undefined && { custom: payload.custom }),
  };
}

/** PATCH /preferences/:coldStorageId */
export function useUpdatePreferences() {
  return useMutation<
    UpdatePreferencesApiResponse,
    AxiosError<UpdatePreferencesApiError>,
    UpdatePreferencesParams
  >({
    mutationKey: [...preferencesKeys.all, 'update'],
    mutationFn: async ({ coldStorageId, ...payload }) => {
      const safeColdStorageId = encodeURIComponent(coldStorageId);
      const normalizedPayload = normalizeUpdatePreferencesPayload(payload);

      const { data } =
        await storeAdminAxiosClient.patch<UpdatePreferencesApiResponse>(
          `/preferences/${safeColdStorageId}`,
          normalizedPayload
        );

      return data;
    },
    onSuccess: async (data) => {
      if (!data.success) {
        toast.error(data.message ?? DEFAULT_ERROR_MESSAGE);
        return;
      }

      toast.success(data.message ?? 'Preferences updated successfully');
      await queryClient.invalidateQueries({
        queryKey: preferencesKeys.all,
      });
    },
    onError: (error) => {
      const errMsg = error.response?.data
        ? getUpdatePreferencesErrorMessage(error.response.data)
        : error.message || DEFAULT_ERROR_MESSAGE;
      toast.error(errMsg);
    },
  });
}
