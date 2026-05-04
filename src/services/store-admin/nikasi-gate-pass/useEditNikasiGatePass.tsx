import { useMutation } from '@tanstack/react-query';
import { useNavigate } from '@tanstack/react-router';
import { AxiosError } from 'axios';
import { toast } from 'sonner';
import storeAdminAxiosClient from '@/lib/axios';
import { queryClient } from '@/lib/queryClient';

export interface NikasiBagSizeInput {
  size: string;
  variety: string;
  quantityIssued: number;
}

/** PATCH body for /nikasi-gate-pass/:nikasiGatePassId */
export interface EditNikasiGatePassInput {
  gatePassNo?: number;
  manualGatePassNumber?: number;
  isInternalTransfer?: boolean;
  date?: string;
  from?: string;
  /** Destination label; omitted when empty after trim. */
  to?: string;
  dispatchLedgerId?: string;
  bagSizes?: NikasiBagSizeInput[];
  remarks?: string;
  netWeight?: number;
  averageWeightPerBag?: number;
}

/** Params for edit mutation: nikasi gate pass id + payload */
export type EditNikasiGatePassParams = EditNikasiGatePassInput & {
  nikasiGatePassId: string;
};

export interface EditNikasiGatePassApiResponse {
  status?: string;
  success?: boolean;
  message?: string;
  data?: Record<string, unknown> | null;
}

type NikasiGatePassApiError = {
  status?: string;
  statusCode?: number;
  errorCode?: string;
  message?: string;
  error?: { code?: string; message?: string };
};

const nikasiGatePassKeys = {
  all: ['store-admin', 'nikasi-gate-pass'] as const,
};

const DEFAULT_ERROR_MESSAGE = 'Failed to update nikasi gate pass';
const DAYBOOK_ROUTE = '/store-admin/daybook';

const STATUS_ERROR_MESSAGES: Record<number, string> = {
  400: 'Invalid nikasi gate pass payload',
  401: 'Unauthorized request',
  404: 'Nikasi gate pass not found',
  409: 'Nikasi gate pass number already exists',
};

function isSuccessResponse(data: EditNikasiGatePassApiResponse): boolean {
  if (typeof data.success === 'boolean') return data.success;
  return data.status?.toLowerCase() === 'success';
}

function getEditNikasiGatePassErrorMessage(
  data: NikasiGatePassApiError | undefined,
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

function normalizeEditNikasiGatePassPayload(
  payload: EditNikasiGatePassInput
): EditNikasiGatePassInput {
  return {
    ...(payload.gatePassNo !== undefined && {
      gatePassNo: payload.gatePassNo,
    }),
    ...(payload.manualGatePassNumber !== undefined && {
      manualGatePassNumber: payload.manualGatePassNumber,
    }),
    ...(payload.isInternalTransfer !== undefined && {
      isInternalTransfer: payload.isInternalTransfer,
    }),
    ...(payload.date !== undefined && {
      date: payload.date,
    }),
    ...(payload.from !== undefined && {
      from: payload.from.trim(),
    }),
    ...(payload.to !== undefined &&
      payload.to.trim() !== '' && {
        to: payload.to.trim(),
      }),
    ...(payload.dispatchLedgerId !== undefined && {
      dispatchLedgerId: payload.dispatchLedgerId.trim(),
    }),
    ...(payload.bagSizes !== undefined && {
      bagSizes: payload.bagSizes.map((bag) => ({
        size: bag.size.trim(),
        variety: bag.variety.trim(),
        quantityIssued: bag.quantityIssued,
      })),
    }),
    ...(payload.remarks !== undefined && {
      remarks: payload.remarks.trim(),
    }),
    ...(payload.netWeight !== undefined && {
      netWeight: payload.netWeight,
    }),
    ...(payload.averageWeightPerBag !== undefined && {
      averageWeightPerBag: payload.averageWeightPerBag,
    }),
  };
}

/** Hook to edit a nikasi gate pass. PATCH /nikasi-gate-pass/:nikasiGatePassId */
export function useEditNikasiGatePass() {
  const navigate = useNavigate();

  return useMutation<
    EditNikasiGatePassApiResponse,
    AxiosError<NikasiGatePassApiError>,
    EditNikasiGatePassParams
  >({
    mutationKey: [...nikasiGatePassKeys.all, 'edit'],
    mutationFn: async ({ nikasiGatePassId, ...payload }) => {
      const safeNikasiGatePassId = encodeURIComponent(nikasiGatePassId);
      const normalizedPayload = normalizeEditNikasiGatePassPayload(payload);

      const { data } =
        await storeAdminAxiosClient.patch<EditNikasiGatePassApiResponse>(
          `/nikasi-gate-pass/${safeNikasiGatePassId}`,
          normalizedPayload
        );

      return data;
    },
    onSuccess: async (data) => {
      if (isSuccessResponse(data)) {
        toast.success(data.message ?? 'Nikasi gate pass updated successfully');
        await queryClient.invalidateQueries({
          queryKey: nikasiGatePassKeys.all,
        });
        await navigate({ to: DAYBOOK_ROUTE });
      } else {
        toast.error(data.message ?? DEFAULT_ERROR_MESSAGE);
      }
    },
    onError: (error) => {
      const status = error.response?.status;
      const errMsg = error.response?.data
        ? getEditNikasiGatePassErrorMessage(error.response.data, status)
        : status !== undefined && status in STATUS_ERROR_MESSAGES
          ? STATUS_ERROR_MESSAGES[status]
          : error.message || DEFAULT_ERROR_MESSAGE;

      toast.error(errMsg);
    },
  });
}
