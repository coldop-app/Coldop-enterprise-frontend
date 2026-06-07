import * as z from 'zod';
import { formatDate } from '@/lib/helpers';

export const stationNameSchema = z.string().trim().min(1, 'Name is required');

export const requiredRateSchema = z
  .string()
  .transform((value) => value.trim())
  .refine(
    (value) =>
      value !== '' && !Number.isNaN(Number(value)) && Number(value) >= 0,
    'Must be a valid non-negative number'
  );

export const localityRowSchema = z.object({
  _id: z.string().optional(),
  name: z.string().trim().min(1, 'Locality name is required'),
  seedDispatchRatePerBag: requiredRateSchema,
  seedBuyBackRatePerQuintal: requiredRateSchema,
});

export const stationFormSchema = z.object({
  name: stationNameSchema,
  localities: z.array(localityRowSchema).min(1, 'Add at least one locality'),
});

export type StationFormValues = z.infer<typeof stationFormSchema>;

export const defaultStationFormValues: StationFormValues = {
  name: '',
  localities: [
    {
      name: '',
      seedDispatchRatePerBag: '',
      seedBuyBackRatePerQuintal: '',
    },
  ],
};

export function parseRequiredNumberInput(value: string): number {
  return Number(value.trim());
}

export function formatStationDate(value: string): string {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return '—';
  return formatDate(parsed);
}

export function formatNumberValue(value?: number | null): string {
  if (value === undefined || value === null) return '—';
  return String(value);
}

export function getStationSearchableText(
  stationName: string,
  localities: Array<{
    name: string;
    seedDispatchRatePerBag: number;
    seedBuyBackRatePerQuintal: number;
  }>
): string {
  return [
    stationName,
    ...localities.flatMap((locality) => [
      locality.name,
      formatNumberValue(locality.seedDispatchRatePerBag),
      formatNumberValue(locality.seedBuyBackRatePerQuintal),
    ]),
  ]
    .join(' ')
    .toLowerCase();
}
