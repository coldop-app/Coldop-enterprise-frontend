import type { ReactNode } from 'react';
import { ChevronDown, NotebookText, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Item,
  ItemActions,
  ItemFooter,
  ItemHeader,
  ItemMedia,
  ItemTitle,
} from '@/components/ui/item';
import {
  PROFILE_INCOMING_STATUS_OPTIONS,
  PROFILE_SORT_ORDER_OPTIONS,
  type ProfileIncomingStatusFilter,
  type ProfileSortOrder,
} from './-calculations';

export interface ProfileGatePassesSummaryBarProps {
  count: number;
  label: string;
  onRefresh: () => void;
  isRefetching: boolean;
}

export function ProfileGatePassesSummaryBar({
  count,
  label,
  onRefresh,
  isRefetching,
}: ProfileGatePassesSummaryBarProps) {
  return (
    <Item variant="outline" size="sm" className="rounded-xl shadow-sm">
      <ItemHeader className="h-full">
        <div className="flex items-center gap-3">
          <ItemMedia variant="icon" className="rounded-lg">
            <NotebookText className="text-primary h-5 w-5" />
          </ItemMedia>
          <ItemTitle className="font-custom text-sm font-semibold sm:text-base">
            {count} {label}
          </ItemTitle>
        </div>
        <ItemActions>
          <Button
            variant="outline"
            size="sm"
            className="font-custom focus-visible:ring-primary gap-2 focus-visible:ring-2 focus-visible:ring-offset-2"
            type="button"
            onClick={onRefresh}
            disabled={isRefetching}
          >
            <RefreshCw
              className={`h-4 w-4 ${isRefetching ? 'animate-spin' : ''}`}
              aria-hidden
            />
            <span className="hidden sm:inline">Refresh</span>
          </Button>
        </ItemActions>
      </ItemHeader>
    </Item>
  );
}

export interface ProfileSortOrderDropdownProps {
  value: ProfileSortOrder;
  onChange: (value: ProfileSortOrder) => void;
}

export function ProfileSortOrderDropdown({
  value,
  onChange,
}: ProfileSortOrderDropdownProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          className="font-custom focus-visible:ring-primary w-full rounded-lg sm:w-auto"
          type="button"
        >
          Sort Order: {value}
          <ChevronDown className="ml-2 h-4 w-4 shrink-0" aria-hidden />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start">
        {PROFILE_SORT_ORDER_OPTIONS.map((option) => (
          <DropdownMenuItem key={option} onClick={() => onChange(option)}>
            {option}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export interface ProfileIncomingStatusDropdownProps {
  value: ProfileIncomingStatusFilter;
  onChange: (value: ProfileIncomingStatusFilter) => void;
}

export function ProfileIncomingStatusDropdown({
  value,
  onChange,
}: ProfileIncomingStatusDropdownProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          className="font-custom focus-visible:ring-primary w-full rounded-lg sm:w-auto"
          type="button"
        >
          Status: {value}
          <ChevronDown className="ml-2 h-4 w-4 shrink-0" aria-hidden />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start">
        {PROFILE_INCOMING_STATUS_OPTIONS.map((option) => (
          <DropdownMenuItem key={option} onClick={() => onChange(option)}>
            {option}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export interface ProfileTabFiltersFooterProps {
  children: ReactNode;
}

/** Footer row for search card: sort (+ optional status) controls. */
export function ProfileTabFiltersFooter({
  children,
}: ProfileTabFiltersFooterProps) {
  return (
    <ItemFooter className="flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:flex-wrap sm:items-center">
        {children}
      </div>
    </ItemFooter>
  );
}
