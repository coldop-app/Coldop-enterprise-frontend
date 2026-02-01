export const capitalizeFirstLetter = (value: string) => {
  if (!value) return value;
  return value.charAt(0).toUpperCase() + value.slice(1).toLowerCase();
};

// Helper to format date → dd.mm.yyyy
export const formatDate = (d: Date) =>
  `${String(d.getDate()).padStart(2, '0')}.${String(d.getMonth() + 1).padStart(2, '0')}.${d.getFullYear()}`;

/** Format ISO date string for display (e.g. "29 Jan 2026") */
export const formatDisplayDate = (dateStr: string | undefined): string => {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  return isNaN(d.getTime())
    ? '—'
    : d.toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      });
};

// Helper to convert dd.mm.yyyy format to ISO format (2025-12-19T00:00:00.000Z)
export const formatDateToISO = (dateString: string): string => {
  const [day, month, year] = dateString.split('.').map(Number);
  if (!day || !month || !year) {
    // If parsing fails, return current date in ISO format
    return new Date().toISOString();
  }
  // Construct ISO string directly to avoid timezone issues
  const monthStr = String(month).padStart(2, '0');
  const dayStr = String(day).padStart(2, '0');
  return `${year}-${monthStr}-${dayStr}T00:00:00.000Z`;
};

/** Parse date string (ISO or dd.mm.yyyy) to start-of-day timestamp for comparison. Returns NaN if invalid. */
export function parseDateToTimestamp(dateString: string): number {
  if (!dateString || typeof dateString !== 'string') return NaN;
  const trimmed = dateString.trim();
  if (trimmed.includes('-')) {
    const d = new Date(trimmed);
    return isNaN(d.getTime())
      ? NaN
      : new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  }
  const [day, month, year] = trimmed.split('.').map(Number);
  if (!day || !month || !year) return NaN;
  const d = new Date(year, month - 1, day);
  return isNaN(d.getTime()) ? NaN : d.getTime();
}
