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
  /** When true, reduces vertical gap between label and input (e.g. for filter rows). */
  compact?: boolean;
}

export const DatePicker: React.FC<DatePickerProps> = ({
  value,
  onChange,
  label = 'Select Order Date',
  id = 'date',
  compact = false,
}) => {
  const [open, setOpen] = React.useState(false);
  const isControlled = value !== undefined;

  // Parse the date string to Date object for the calendar
  const parseDate = (str: string): Date | undefined => {
    const [day, month, year] = str.split('.').map(Number);
    if (!day || !month || !year) return undefined;
    const parsed = new Date(year, month - 1, day);
    return isNaN(parsed.getTime()) ? undefined : parsed;
  };

  const today = React.useMemo(() => new Date(), []);
  const defaultDateString = React.useMemo(() => formatDate(today), [today]);
  const initialInputValue = value ?? defaultDateString;

  const [uncontrolledInputValue, setUncontrolledInputValue] =
    React.useState(initialInputValue);
  const [uncontrolledDate, setUncontrolledDate] = React.useState<
    Date | undefined
  >(() => parseDate(initialInputValue));

  const inputValue = isControlled ? value : uncontrolledInputValue;
  const date = isControlled ? parseDate(value) : uncontrolledDate;

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    if (!isControlled) {
      setUncontrolledInputValue(newValue);
    }
    const parsed = parseDate(newValue);
    if (parsed) {
      if (!isControlled) {
        setUncontrolledDate(parsed);
      }
      // Call onChange with formatted date string
      onChange?.(formatDate(parsed));
    }
  };

  const handleSelect = (selectedDate?: Date) => {
    if (selectedDate) {
      const formatted = formatDate(selectedDate);
      if (!isControlled) {
        setUncontrolledDate(selectedDate);
        setUncontrolledInputValue(formatted);
      }
      onChange?.(formatted);
      setOpen(false);
    }
  };

  const hasLabel = label != null && label !== '';

  return (
    <div
      className={hasLabel ? (compact ? 'space-y-1.5' : 'space-y-3') : undefined}
    >
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
