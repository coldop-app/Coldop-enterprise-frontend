import { memo, useState } from 'react';
import { Link } from '@tanstack/react-router';
import {
  Item,
  ItemHeader,
  ItemMedia,
  ItemTitle,
  ItemActions,
  ItemFooter,
} from '@/components/ui/item';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Search, ChevronDown, RefreshCw } from 'lucide-react';

export const LIMIT_OPTIONS = [10, 25, 50, 100] as const;

export type IncomingStatusFilter = 'all' | 'graded' | 'ungraded';

interface TabSummaryBarProps {
  count: number;
  icon: React.ReactNode;
  onRefresh?: () => void;
  isRefreshing?: boolean;
}

/** Bar shown below the tab label: "X vouchers" + Refresh button. One per tab. */
export const TabSummaryBar = memo(function TabSummaryBar({
  count,
  icon,
  onRefresh,
  isRefreshing = false,
}: TabSummaryBarProps) {
  return (
    <Item variant="outline" size="sm" className="rounded-xl shadow-sm">
      <ItemHeader className="h-full">
        <div className="flex items-center gap-3">
          <ItemMedia variant="icon" className="rounded-lg">
            {icon}
          </ItemMedia>
          <ItemTitle className="font-custom text-sm font-semibold sm:text-base">
            {count} {count === 1 ? 'voucher' : 'vouchers'}
          </ItemTitle>
        </div>
        <ItemActions>
          <Button
            variant="outline"
            size="sm"
            disabled={isRefreshing}
            onClick={() => onRefresh?.()}
            className="font-custom h-8 gap-2 rounded-lg px-3"
          >
            <RefreshCw
              className={`h-4 w-4 shrink-0 ${
                isRefreshing ? 'animate-spin' : ''
              }`}
            />
            <span className="hidden sm:inline">Refresh</span>
          </Button>
        </ItemActions>
      </ItemHeader>
    </Item>
  );
});

interface TabToolbarSimpleProps {
  addButtonLabel: string;
  addButtonTo: string;
  addButtonIcon: React.ReactNode;
}

/** Toolbar with search + sort. Used for Storage, Dispatch, Outgoing tabs. */
export const TabToolbarSimple = memo(function TabToolbarSimple({
  addButtonLabel,
  addButtonTo,
  addButtonIcon,
}: TabToolbarSimpleProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [sortBy, setSortBy] = useState<'Date' | 'Voucher Number'>('Date');
  return (
    <Item
      variant="outline"
      size="sm"
      className="flex-col items-stretch gap-4 rounded-xl"
    >
      <div className="relative w-full">
        <Search className="text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
        <Input
          placeholder="Search by voucher number, date..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="font-custom focus-visible:ring-primary w-full pl-10 focus-visible:ring-2 focus-visible:ring-offset-2"
        />
      </div>
      <ItemFooter className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="outline"
              className="font-custom focus-visible:ring-primary w-full min-w-0 rounded-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 sm:w-auto sm:min-w-40"
            >
              <span className="hidden sm:inline">Sort by: </span>
              <span className="sm:hidden">Sort: </span>
              {sortBy === 'Voucher Number' ? (
                <span className="truncate">Voucher No.</span>
              ) : (
                sortBy
              )}
              <span className="font-custom text-muted-foreground hidden sm:inline">
                {' '}
                · {sortOrder === 'asc' ? 'Ascending' : 'Descending'}
              </span>
              <ChevronDown className="ml-2 h-4 w-4 shrink-0" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="font-custom">
            <DropdownMenuItem onClick={() => setSortBy('Date')}>
              Date
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setSortBy('Voucher Number')}>
              Voucher Number
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setSortOrder('asc')}>
              Ascending
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setSortOrder('desc')}>
              Descending
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        <Button
          className="font-custom h-10 w-full shrink-0 gap-2 sm:w-auto"
          asChild
        >
          <Link to={addButtonTo}>
            {addButtonIcon}
            {addButtonLabel}
          </Link>
        </Button>
      </ItemFooter>
    </Item>
  );
});
