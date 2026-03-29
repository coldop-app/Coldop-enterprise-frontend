/** Formats currency-style totals with thousands separators (e.g. 1,250,000.5). */
export function formatFarmerSeedAmount(value: number): string {
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(value);
}
