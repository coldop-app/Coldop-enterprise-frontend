/** Format date string for voucher display (e.g. "01 Feb 2026") */
export function formatVoucherDate(dateString: string | undefined): string {
  if (!dateString) return '—';
  try {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return dateString;
  }
}
