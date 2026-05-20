import React, { useEffect, useState } from 'react';
import { Search, ChevronDown } from 'lucide-react';
import { useDebounceValue } from 'usehooks-ts';

// UI components
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from '@/components/ui/dropdown-menu';

// Custom components
import { Item, ItemFooter } from '@/components/ui/item';

interface SortOption {
  label: string;
  value: string;
}

interface FilterBarProps {
  searchPlaceholder?: string;
  searchValue?: string;
  onSearchChange?: (value: string) => void;
  debounceDelay?: number;

  sortOptions?: SortOption[];
  selectedSort?: string;
  onSortChange?: (value: string) => void;

  children?: React.ReactNode;
}

export const FilterBar: React.FC<FilterBarProps> = ({
  searchPlaceholder = 'Search...',
  searchValue = '',
  onSearchChange,
  debounceDelay = 400,

  sortOptions = [],
  selectedSort,
  onSortChange,

  children,
}) => {
  // 🔹 local state for instant typing
  const [localSearch, setLocalSearch] = useState(searchValue);

  // 🔹 debounced value
  const [debouncedSearch] = useDebounceValue(localSearch, debounceDelay);

  // 🔹 send debounced value to parent
  useEffect(() => {
    onSearchChange?.(debouncedSearch);
  }, [debouncedSearch, onSearchChange]);

  const selectedLabel =
    sortOptions.find((opt) => opt.value === selectedSort)?.label || 'Sort';

  return (
    <Item
      variant="outline"
      size="sm"
      className="flex-col items-stretch gap-4 rounded-xl"
    >
      {/* Search Input */}
      <div className="relative w-full">
        <Search className="text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
        <Input
          value={localSearch}
          onChange={(e) => setLocalSearch(e.target.value)}
          placeholder={searchPlaceholder}
          className="font-custom focus-visible:ring-primary w-full pl-10 focus-visible:ring-2 focus-visible:ring-offset-2"
        />
      </div>

      {/* Footer */}
      <ItemFooter className="flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        {/* Sort Dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="outline"
              className="font-custom focus-visible:ring-primary w-full rounded-lg sm:w-auto"
            >
              Sort by: {selectedLabel}
              <ChevronDown className="ml-2 h-4 w-4 shrink-0" />
            </Button>
          </DropdownMenuTrigger>

          <DropdownMenuContent>
            {sortOptions.map((option) => (
              <DropdownMenuItem
                key={option.value}
                onClick={() => onSortChange?.(option.value)}
              >
                {option.label}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Actions */}
        <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:justify-end sm:gap-2">
          {children}
        </div>
      </ItemFooter>
    </Item>
  );
};
