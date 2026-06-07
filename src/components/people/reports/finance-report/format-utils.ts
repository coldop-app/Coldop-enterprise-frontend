export const MDASH = '\u2014';

export function formatIndianNumber(value: number, precision = 0): string {
  return value.toLocaleString('en-IN', {
    minimumFractionDigits: precision,
    maximumFractionDigits: precision,
  });
}

export function formatAmount(value: number): string {
  return `\u20B9${formatIndianNumber(value, 2)}`;
}

export function formatNullableNumber(
  value: number | null | undefined,
  precision = 2
): string {
  if (value == null || !Number.isFinite(value)) return MDASH;
  return formatIndianNumber(value, precision);
}

export function formatNullableAmount(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) return MDASH;
  return formatAmount(value);
}

export function formatPerAcre(value: number | null): string {
  if (value == null || !Number.isFinite(value)) return MDASH;
  return formatAmount(value);
}
