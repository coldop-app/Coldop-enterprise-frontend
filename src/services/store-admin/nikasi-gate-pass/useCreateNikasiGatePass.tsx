import { useMutation } from '@tanstack/react-query';
import { useRouter } from '@tanstack/react-router';
import { AxiosError } from 'axios';
import { toast } from 'sonner';
import storeAdminAxiosClient from '@/lib/axios';
import { queryClient } from '@/lib/queryClient';

export interface NikasiBagSizeInput {
  size: string;
  variety: string;
  quantityIssued: number;
}

export interface CreateNikasiGatePassInput {
  farmerStorageLinkId: string;
  dispatchLedgerId: string;
  gatePassNo: number;
  manualGatePassNumber?: number;
  isInternalTransfer?: boolean;
  date: string;
  from: string;
  /** Optional display / destination label for the gate pass. */
  to?: string;
  bagSizes: NikasiBagSizeInput[];
  remarks?: string;
  netWeight?: number;
  averageWeightPerBag?: number;
  idempotencyKey?: string;
}

export interface CreateNikasiGatePassApiResponse {
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

const DEFAULT_ERROR_MESSAGE = 'Failed to create nikasi gate pass';

const STATUS_ERROR_MESSAGES: Record<number, string> = {
  400: 'Invalid nikasi gate pass payload',
  404: 'Farmer storage link not found',
  409: 'Nikasi gate pass number already exists',
};

export function isCreateNikasiGatePassSuccess(
  data: CreateNikasiGatePassApiResponse
): boolean {
  if (typeof data.success === 'boolean') return data.success;
  return data.status?.toLowerCase() === 'success';
}

function getCreateNikasiGatePassErrorMessage(
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

function normalizeCreateNikasiGatePassPayload(
  payload: CreateNikasiGatePassInput
): CreateNikasiGatePassInput {
  return {
    farmerStorageLinkId: payload.farmerStorageLinkId.trim(),
    dispatchLedgerId: payload.dispatchLedgerId.trim(),
    gatePassNo: payload.gatePassNo,
    ...(payload.manualGatePassNumber !== undefined && {
      manualGatePassNumber: payload.manualGatePassNumber,
    }),
    ...(payload.isInternalTransfer !== undefined && {
      isInternalTransfer: payload.isInternalTransfer,
    }),
    date: payload.date,
    from: payload.from.trim(),
    ...(payload.to !== undefined &&
      payload.to.trim() !== '' && {
        to: payload.to.trim(),
      }),
    bagSizes: payload.bagSizes.map((bag) => ({
      size: bag.size.trim(),
      variety: bag.variety.trim(),
      quantityIssued: bag.quantityIssued,
    })),
    ...(payload.remarks !== undefined && {
      remarks: payload.remarks.trim(),
    }),
    ...(payload.netWeight !== undefined && {
      netWeight: payload.netWeight,
    }),
    ...(payload.averageWeightPerBag !== undefined && {
      averageWeightPerBag: payload.averageWeightPerBag,
    }),
    ...(payload.idempotencyKey !== undefined && {
      idempotencyKey: payload.idempotencyKey.trim(),
    }),
  };
}

/** Hook to create a nikasi gate pass. POST /nikasi-gate-pass */
export function useCreateNikasiGatePass() {
  const router = useRouter();

  return useMutation<
    CreateNikasiGatePassApiResponse,
    AxiosError<NikasiGatePassApiError>,
    CreateNikasiGatePassInput
  >({
    mutationKey: [...nikasiGatePassKeys.all, 'create'],
    mutationFn: async (payload) => {
      const normalizedPayload = normalizeCreateNikasiGatePassPayload(payload);
      const { data } =
        await storeAdminAxiosClient.post<CreateNikasiGatePassApiResponse>(
          '/nikasi-gate-pass',
          normalizedPayload
        );

      return data;
    },
    onSuccess: async (data) => {
      if (isCreateNikasiGatePassSuccess(data)) {
        toast.success(data.message ?? 'Nikasi gate pass created successfully');
        await queryClient.invalidateQueries({
          queryKey: nikasiGatePassKeys.all,
        });
        await router.navigate({ to: '/store-admin/daybook' });
      } else {
        toast.error(data.message ?? DEFAULT_ERROR_MESSAGE);
      }
    },
    onError: (error) => {
      const status = error.response?.status;
      const errMsg = error.response?.data
        ? getCreateNikasiGatePassErrorMessage(error.response.data, status)
        : status !== undefined && status in STATUS_ERROR_MESSAGES
          ? STATUS_ERROR_MESSAGES[status]
          : error.message || DEFAULT_ERROR_MESSAGE;

      toast.error(errMsg);
    },
  });
}
