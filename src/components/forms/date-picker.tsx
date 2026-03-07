import * as React from 'react';
import { CalendarIcon } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Label } from '@/components/ui/label';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { formatDate } from '@/lib/helpers';

interface DatePickerProps {
  value?: string; // dd.mm.yyyy format
  onChange?: (value: string) => void; // Called with dd.mm.yyyy format
  label?: string; // Optional label override
  id?: string; // Optional id override
}

export const DatePicker: React.FC<DatePickerProps> = ({
  value,
  onChange,
  label = 'Select Order Date',
  id = 'date',
}) => {
  const [open, setOpen] = React.useState(false);

  // Parse the date string to Date object for the calendar
  const parseDate = (str: string): Date | undefined => {
    const [day, month, year] = str.split('.').map(Number);
    if (!day || !month || !year) return undefined;
    const parsed = new Date(year, month - 1, day);
    return isNaN(parsed.getTime()) ? undefined : parsed;
  };

  // Default to today's date
  const today = new Date();
  const defaultDateString = formatDate(today);

  // Use controlled value if provided, otherwise use default
  const dateString = value ?? defaultDateString;

  const [date, setDate] = React.useState<Date | undefined>(() =>
    parseDate(dateString)
  );
  const [inputValue, setInputValue] = React.useState(dateString);

  // Sync internal state when controlled value changes
  React.useEffect(() => {
    if (value !== undefined) {
      setInputValue(value);
      const parsed = parseDate(value);
      setDate(parsed ?? undefined);
    }
  }, [value]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setInputValue(newValue);
    const parsed = parseDate(newValue);
    if (parsed) {
      setDate(parsed);
      // Call onChange with formatted date string
      onChange?.(formatDate(parsed));
    }
  };

  const handleSelect = (selectedDate?: Date) => {
    if (selectedDate) {
      setDate(selectedDate);
      const formatted = formatDate(selectedDate);
      setInputValue(formatted);
      onChange?.(formatted);
      setOpen(false);
    }
  };

  const hasLabel = label != null && label !== '';

  return (
    <div className={hasLabel ? 'space-y-3' : undefined}>
      {hasLabel && (
        <Label htmlFor={id} className="text-base font-medium">
          {label}
        </Label>
      )}
      <div className="flex h-10 items-center gap-2">
        {/* Manual input field */}
        <input
          id={id}
          type="text"
          placeholder="dd.mm.yyyy"
          value={inputValue}
          onChange={handleInputChange}
          className={cn(
            'border-input bg-background h-10 w-44 shrink-0 rounded-md border px-3 py-2 text-sm shadow-sm transition-colors',
            'focus-visible:ring-ring focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none'
          )}
        />
        {/* Calendar popover */}
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              size="icon"
              className="h-10 w-10 shrink-0"
            >
              <CalendarIcon className="h-4 w-4" />
            </Button>
          </PopoverTrigger>
          <PopoverContent
            side="bottom"
            className="w-auto overflow-hidden p-0"
            align="start"
            sideOffset={10}
          >
            <Calendar
              mode="single"
              selected={date}
              onSelect={handleSelect}
              captionLayout="dropdown"
            />
          </PopoverContent>
        </Popover>
      </div>
    </div>
  );
};
