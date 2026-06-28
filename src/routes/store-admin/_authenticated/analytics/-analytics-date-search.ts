import { useMemo, useState } from 'react';
import { getRouteApi, useLocation, useRouter } from '@tanstack/react-router';
import { parseContractFarmingGroupFamiliesSearch } from '@/components/analytics/contract-farming/report/contract-farming-report-search';

export type AnalyticsDateSearch = {
  fromDate?: string;
  toDate?: string;
  /** Contract farming report: Group Families toolbar toggle. */
  groupFamilies?: boolean;
};

export interface AnalyticsDateRange {
  fromDate: string;
  toDate: string;
}

const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

function isValidIsoDate(value: string): boolean {
  if (!ISO_DATE_PATTERN.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(parsed.getTime())) return false;
  return parsed.toISOString().slice(0, 10) === value;
}

function parseOptionalIsoDate(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  if (!trimmed || !isValidIsoDate(trimmed)) return undefined;
  return trimmed;
}

export function validateAnalyticsDateSearch(
  search: Record<string, unknown>
): AnalyticsDateSearch {
  return {
    fromDate: parseOptionalIsoDate(search.fromDate),
    toDate: parseOptionalIsoDate(search.toDate),
    groupFamilies: parseContractFarmingGroupFamiliesSearch(
      search.groupFamilies
    ),
  };
}

export function toApiDateFromPicker(value: string): string {
  const trimmed = value.trim();
  if (trimmed === '') return '';

  const [day, month, year] = trimmed.split('.');
  if (!day || !month || !year) return '';

  const normalizedDay = day.padStart(2, '0');
  const normalizedMonth = month.padStart(2, '0');
  const normalizedYear = year.padStart(4, '0');

  return `${normalizedYear}-${normalizedMonth}-${normalizedDay}`;
}

export function toPickerDateFromApi(value?: string): string {
  if (!value) return '';

  const isoDateMatch = /^(\d{4})-(\d{2})-(\d{2})/.exec(value.trim());
  if (!isoDateMatch) return '';

  const year = Number(isoDateMatch[1]);
  const month = Number(isoDateMatch[2]);
  const day = Number(isoDateMatch[3]);
  if (!day || !month || !year) return '';

  return `${String(day).padStart(2, '0')}.${String(month).padStart(2, '0')}.${year}`;
}

export const analyticsLayoutRouteId =
  '/store-admin/_authenticated/analytics' as const;

const analyticsRouteApi = getRouteApi(analyticsLayoutRouteId);

export function toAnalyticsDateSearch(
  dateRange: AnalyticsDateRange
): AnalyticsDateSearch {
  if (!dateRange.fromDate || !dateRange.toDate) {
    return {};
  }

  return {
    fromDate: dateRange.fromDate,
    toDate: dateRange.toDate,
  };
}

export function useAnalyticsDateFilters() {
  const search = analyticsRouteApi.useSearch();
  const router = useRouter();
  const pathname = useLocation({ select: (location) => location.pathname });
  const urlFromDate = toPickerDateFromApi(search.fromDate);
  const urlToDate = toPickerDateFromApi(search.toDate);
  const [draftFromDate, setDraftFromDate] = useState<string | null>(null);
  const [draftToDate, setDraftToDate] = useState<string | null>(null);
  const [trackedSearch, setTrackedSearch] = useState({
    fromDate: search.fromDate,
    toDate: search.toDate,
  });

  if (
    trackedSearch.fromDate !== search.fromDate ||
    trackedSearch.toDate !== search.toDate
  ) {
    setTrackedSearch({
      fromDate: search.fromDate,
      toDate: search.toDate,
    });
    setDraftFromDate(null);
    setDraftToDate(null);
  }

  const fromDate = draftFromDate ?? urlFromDate;
  const toDate = draftToDate ?? urlToDate;

  const appliedDateRange = useMemo<AnalyticsDateRange>(
    () => ({
      fromDate: search.fromDate ?? '',
      toDate: search.toDate ?? '',
    }),
    [search.fromDate, search.toDate]
  );

  const hasAppliedFilters = Boolean(search.fromDate && search.toDate);

  const apply = () => {
    const nextFromDate = toApiDateFromPicker(fromDate);
    const nextToDate = toApiDateFromPicker(toDate);
    if (!nextFromDate || !nextToDate) return;

    setDraftFromDate(null);
    setDraftToDate(null);

    void router.navigate({
      to: pathname,
      search: (prev) => ({
        ...prev,
        fromDate: nextFromDate,
        toDate: nextToDate,
      }),
    });
  };

  const reset = () => {
    setDraftFromDate(null);
    setDraftToDate(null);

    void router.navigate({
      to: pathname,
      search: (prev) => ({
        ...prev,
        fromDate: undefined,
        toDate: undefined,
      }),
    });
  };

  return {
    fromDate,
    toDate,
    setFromDate: setDraftFromDate,
    setToDate: setDraftToDate,
    appliedDateRange,
    appliedFromDate: search.fromDate ?? '',
    appliedToDate: search.toDate ?? '',
    hasAppliedFilters,
    apply,
    reset,
  };
}
