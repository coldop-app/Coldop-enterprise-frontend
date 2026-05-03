import { useMutation } from '@tanstack/react-query';
import { useNavigate } from '@tanstack/react-router';
import { AxiosError } from 'axios';
import { toast } from 'sonner';
import storeAdminAxiosClient from '@/lib/axios';
import { queryClient } from '@/lib/queryClient';
import type {
  CreateGradingGatePassApiResponse,
  CreateGradingGatePassInput,
} from '@/types/grading-gate-pass';
import { gradingGatePassKeys } from './useGetGradingGatePasses';

type GradingGatePassApiError = {
  success?: boolean;
  message?: string;
  error?: { code?: string; message?: string };
};

const DEFAULT_ERROR = 'Failed to create grading gate pass';
const DAYBOOK_ROUTE = '/store-admin/daybook' as const;

const STATUS_ERROR_MESSAGES: Record<number, string> = {
  400: 'Invalid grading gate pass payload',
  401: 'Unauthorized request',
  403: 'You do not have permission to create this grading gate pass',
  404: 'Resource not found',
  409: 'Grading gate pass number conflict',
};

function getCreateGradingGatePassErrorMessage(
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

function normalizeCreatePayload(
  payload: CreateGradingGatePassInput
): CreateGradingGatePassInput {
  return {
    farmerStorageLinkId: payload.farmerStorageLinkId.trim(),
    incomingGatePassIds: payload.incomingGatePassIds.map((id) => id.trim()),
    gatePassNo: Math.floor(Number(payload.gatePassNo)),
    date: payload.date.trim(),
    variety: payload.variety.trim(),
    allocationStatus: payload.allocationStatus.trim(),
    orderDetails: payload.orderDetails.map((row) => ({
      size: row.size.trim(),
      bagType: row.bagType.trim(),
      currentQuantity: row.currentQuantity,
      initialQuantity: row.initialQuantity,
      weightPerBagKg: row.weightPerBagKg,
    })),
    ...(payload.manualGatePassNumber !== undefined && {
      manualGatePassNumber: payload.manualGatePassNumber,
    }),
    ...(payload.grader !== undefined && {
      grader: payload.grader.trim(),
    }),
    ...(payload.remarks !== undefined && {
      remarks: payload.remarks.trim(),
    }),
  };
}

/** POST /grading-gate-pass */
export function useCreateGradingGatePass() {
  const navigate = useNavigate();

  return useMutation<
    CreateGradingGatePassApiResponse,
    AxiosError<GradingGatePassApiError>,
    CreateGradingGatePassInput
  >({
    mutationKey: [...gradingGatePassKeys.all, 'create'],
    mutationFn: async (payload) => {
      const body = normalizeCreatePayload(payload);
      const { data } =
        await storeAdminAxiosClient.post<CreateGradingGatePassApiResponse>(
          '/grading-gate-pass',
          body
        );
      return data;
    },
    onSuccess: async (data) => {
      if (data.success) {
        toast.success(data.message ?? 'Grading gate pass created');
        await queryClient.invalidateQueries({
          queryKey: gradingGatePassKeys.all,
        });
        await navigate({ to: DAYBOOK_ROUTE });
      } else {
        toast.error(data.message ?? DEFAULT_ERROR);
      }
    },
    onError: (error) => {
      const errMsg = getCreateGradingGatePassErrorMessage(
        error.response?.data,
        error.response?.status,
        error.message || DEFAULT_ERROR
      );
      toast.error(errMsg);
    },
  });
}
