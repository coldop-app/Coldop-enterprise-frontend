import * as z from 'zod';

import { formatDate, toDatePickerDisplayValue } from '@/lib/helpers';
import type {
  DispatchPostStorage,
  DispatchPostStorageFormValues,
  EditDispatchPostStorageFormValues,
} from '@/types/dispatch-post-storage';

const optionalNonNegativeNumber = z.union([
  z.number().nonnegative(),
  z.undefined(),
]);

export const createDispatchPostStorageFormSchema = z.object({
  farmerStorageLinkId: z.string().min(1, 'Please select a farmer account'),
  date: z.string().trim().min(1, 'Date is required'),
  manualGatePassNumber: optionalNonNegativeNumber,
  from: z.string().trim().min(1, 'From is required'),
  to: z.string().trim().min(1, 'To is required'),
  truckNumber: z.string().max(120).default(''),
  remarks: z.string().max(500).default(''),
  allocations: z.record(z.string(), z.number().min(0)).default({}),
});

export const editDispatchPostStorageFormSchema =
  createDispatchPostStorageFormSchema.omit({
    farmerStorageLinkId: true,
    allocations: true,
  });

export type CreateDispatchPostStorageFormInput = z.infer<
  typeof createDispatchPostStorageFormSchema
>;
export type EditDispatchPostStorageFormInput = z.infer<
  typeof editDispatchPostStorageFormSchema
>;

export function getCreateDispatchPostStorageDefaults(): DispatchPostStorageFormValues {
  return {
    farmerStorageLinkId: '',
    date: formatDate(new Date()),
    manualGatePassNumber: undefined,
    from: '',
    to: '',
    truckNumber: '',
    remarks: '',
    allocations: {},
  };
}

export function getEditDispatchPostStorageDefaults(
  values?: Partial<EditDispatchPostStorageFormValues>
): EditDispatchPostStorageFormValues {
  return {
    date: values?.date ?? formatDate(new Date()),
    manualGatePassNumber: values?.manualGatePassNumber,
    from: values?.from ?? '',
    to: values?.to ?? '',
    truckNumber: values?.truckNumber ?? '',
    remarks: values?.remarks ?? '',
  };
}

export function parseOptionalPositiveNumber(value: string): number | undefined {
  if (value === '') return undefined;
  const parsed = Number(value);
  return Number.isNaN(parsed) ? undefined : parsed;
}

export function isFieldInvalid(meta: {
  isTouched: boolean;
  isValid: boolean;
}): boolean {
  return meta.isTouched && !meta.isValid;
}

export type FieldErrors = Array<{ message?: string } | undefined>;

export interface MockDispatchPostStorageGatePass {
  _id: string;
  gatePassNo: number;
  values: EditDispatchPostStorageFormValues;
}

export function toEditDispatchPostStorageGatePass(
  gatePass: DispatchPostStorage
): MockDispatchPostStorageGatePass {
  return {
    _id: gatePass._id,
    gatePassNo: gatePass.gatePassNo,
    values: getEditDispatchPostStorageDefaults({
      date: toDatePickerDisplayValue(gatePass.date),
      manualGatePassNumber: gatePass.manualGatePassNumber,
      from: gatePass.from,
      to: gatePass.to,
      truckNumber: gatePass.truckNumber ?? '',
      remarks: gatePass.remarks ?? '',
    }),
  };
}
