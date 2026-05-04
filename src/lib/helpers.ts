export const capitalizeFirstLetter = (value: string) => {
  if (!value) return value;
  return value.charAt(0).toUpperCase() + value.slice(1).toLowerCase();
};

// Helper to format date → dd.mm.yyyy
export const formatDate = (d: Date) =>
  `${String(d.getDate()).padStart(2, '0')}.${String(d.getMonth() + 1).padStart(2, '0')}.${d.getFullYear()}`;

/** Maps API / ISO date strings to `dd.mm.yyyy` for the shared DatePicker (`dd.mm.yyyy`). */
export function toDatePickerDisplayValue(
  value: string | undefined | null
): string {
  if (value == null || !String(value).trim()) {
    return formatDate(new Date());
  }
  const s = String(value).trim();

  if (/^\d{1,2}\.\d{1,2}\.\d{4}$/.test(s)) {
    const [d, m, y] = s.split('.');
    const day = Number(d);
    const month = Number(m);
    const year = Number(y);
    if (day && month && year) {
      return `${String(day).padStart(2, '0')}.${String(month).padStart(2, '0')}.${year}`;
    }
  }

  const isoDateMatch = /^(\d{4})-(\d{2})-(\d{2})/.exec(s);
  if (isoDateMatch) {
    const year = Number(isoDateMatch[1]);
    const month = Number(isoDateMatch[2]);
    const day = Number(isoDateMatch[3]);
    return `${String(day).padStart(2, '0')}.${String(month).padStart(2, '0')}.${year}`;
  }

  const parsed = new Date(s);
  if (!Number.isNaN(parsed.getTime())) {
    return formatDate(parsed);
  }

  return formatDate(new Date());
}

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
