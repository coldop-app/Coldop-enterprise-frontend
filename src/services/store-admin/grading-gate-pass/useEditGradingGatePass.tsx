import { useMutation } from '@tanstack/react-query';
import { useNavigate } from '@tanstack/react-router';
import { AxiosError } from 'axios';
import { toast } from 'sonner';
import storeAdminAxiosClient from '@/lib/axios';
import { queryClient } from '@/lib/queryClient';
import type {
  EditGradingGatePassApiResponse,
  EditGradingGatePassInput,
} from '@/types/grading-gate-pass';
import { gradingGatePassKeys } from './useGetGradingGatePasses';

export type EditGradingGatePassParams = EditGradingGatePassInput & {
  gradingGatePassId: string;
};

type GradingGatePassApiError = {
  success?: boolean;
  message?: string;
  error?: { code?: string; message?: string };
};

const DEFAULT_ERROR = 'Failed to update grading gate pass';
const DAYBOOK_ROUTE = '/store-admin/daybook' as const;

const STATUS_ERROR_MESSAGES: Record<number, string> = {
  400: 'Invalid grading gate pass payload',
  401: 'Unauthorized request',
  403: 'You do not have permission to update this grading gate pass',
  404: 'Grading gate pass not found',
  409: 'Grading gate pass number conflict',
};

function isSuccessResponse(data: EditGradingGatePassApiResponse): boolean {
  if (typeof data.success === 'boolean') return data.success;
  return data.status?.toLowerCase() === 'success';
}

function getEditGradingGatePassErrorMessage(
  data: GradingGatePassApiError | undefined,
  status?: number,
  fallback: string = DEFAULT_ERROR
): string {
  return (
    data?.error?.message ??
    data?.message ??
    (status !== undefined && status in STATUS_ERROR_MESSAGES
      ? STATUS_ERROR_MESSAGES[status]
      : null) ??
    fallback
  );
}

function normalizePayload(
  payload: EditGradingGatePassInput
): EditGradingGatePassInput {
  return {
    ...(payload.manualGatePassNumber !== undefined && {
      manualGatePassNumber: payload.manualGatePassNumber,
    }),
    ...(payload.date !== undefined && { date: payload.date }),
    ...(payload.variety !== undefined && {
      variety: payload.variety.trim(),
    }),
    ...(payload.orderDetails !== undefined && {
      orderDetails: payload.orderDetails.map((row) => ({
        size: row.size.trim(),
        bagType: row.bagType.trim(),
        currentQuantity: row.currentQuantity,
        initialQuantity: row.initialQuantity,
        weightPerBagKg: row.weightPerBagKg,
      })),
    }),
    ...(payload.allocationStatus !== undefined && {
      allocationStatus: payload.allocationStatus.trim(),
    }),
    ...(payload.grader !== undefined && {
      grader: payload.grader.trim(),
    }),
    ...(payload.remarks !== undefined && {
      remarks: payload.remarks.trim(),
    }),
  };
}

/** PATCH /grading-gate-pass/:gradingGatePassId */
export function useEditGradingGatePass() {
  const navigate = useNavigate();

  return useMutation<
    EditGradingGatePassApiResponse,
    AxiosError<GradingGatePassApiError>,
    EditGradingGatePassParams
  >({
    mutationKey: [...gradingGatePassKeys.all, 'edit'],
    mutationFn: async ({ gradingGatePassId, ...payload }) => {
      const safeId = encodeURIComponent(gradingGatePassId);
      const body = normalizePayload(payload);
      const { data } =
        await storeAdminAxiosClient.patch<EditGradingGatePassApiResponse>(
          `/grading-gate-pass/${safeId}`,
          body
        );
      return data;
    },
    onSuccess: async (data) => {
      if (isSuccessResponse(data)) {
        toast.success(data.message ?? 'Grading gate pass updated');
        await queryClient.invalidateQueries({
          queryKey: gradingGatePassKeys.all,
        });
        await navigate({ to: DAYBOOK_ROUTE });
      } else {
        toast.error(data.message ?? DEFAULT_ERROR);
      }
    },
    onError: (error) => {
      const errMsg = getEditGradingGatePassErrorMessage(
        error.response?.data,
        error.response?.status,
        error.message || DEFAULT_ERROR
      );
      toast.error(errMsg);
    },
  });
}
