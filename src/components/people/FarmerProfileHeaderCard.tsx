import { memo } from 'react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Hash, Edit, Sprout, FileText, BookOpen } from 'lucide-react';

const placeholderFarmer = {
  name: 'Ramesh Kumar',
  accountNumber: 'AC-10284',
};

const getInitials = (name: string) =>
  name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('');

export const FarmerProfileHeaderCard = memo(function FarmerProfileHeaderCard() {
  return (
    <TooltipProvider delayDuration={300}>
      <div className="space-y-5">
        {/* Header row */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3.5">
            <Avatar className="ring-border h-14 w-14 shrink-0 ring-1">
              <AvatarFallback className="bg-primary/10 text-primary text-lg font-medium">
                {getInitials(placeholderFarmer.name)}
              </AvatarFallback>
            </Avatar>

            <div className="min-w-0 space-y-1.5">
              <h1 className="text-foreground truncate text-base font-medium tracking-tight">
                {placeholderFarmer.name}
              </h1>
              <Badge
                variant="secondary"
                className="text-muted-foreground gap-1 text-xs font-normal"
              >
                <Hash className="h-3 w-3 opacity-60" />
                {placeholderFarmer.accountNumber}
              </Badge>
            </div>
          </div>

          {/* Icon actions */}
          <div className="flex shrink-0 items-center gap-0.5">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="text-muted-foreground hover:text-foreground h-8 w-8 rounded-full"
                  onClick={() => {}}
                  aria-label="Edit farmer"
                >
                  <Edit className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom">Edit</TooltipContent>
            </Tooltip>
          </div>
        </div>

        <Separator />

        {/* Action buttons */}
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            size="sm"
            className="gap-1.5"
            onClick={() => {}}
          >
            <FileText className="h-3.5 w-3.5" />
            Farmer report
          </Button>

          <Button
            type="button"
            variant="outline"
            size="sm"
            className="gap-1.5"
            onClick={() => {}}
          >
            <BookOpen className="h-3.5 w-3.5" />
            Accounting report
          </Button>

          <Button
            type="button"
            variant="outline"
            size="sm"
            className="gap-1.5"
            onClick={() => {}}
          >
            <Sprout className="h-3.5 w-3.5" />
            Add seed
          </Button>
        </div>
      </div>
    </TooltipProvider>
  );
});
