export function formatDisplayDate(date: Date): string {
  return date.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

export function formatDateRangeLabel(dates: string[]): string {
  const parsed = dates
    .map((date) => new Date(date))
    .filter((date) => Number.isFinite(date.getTime()))
    .sort((a, b) => a.getTime() - b.getTime());

  if (parsed.length === 0) return 'N/A';
  if (parsed.length === 1) return formatDisplayDate(parsed[0]);

  return `${formatDisplayDate(parsed[0])} - ${formatDisplayDate(parsed[parsed.length - 1])}`;
}
