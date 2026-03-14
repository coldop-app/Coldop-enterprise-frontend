import { memo } from 'react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Hash, Edit } from 'lucide-react';
import type { FarmerStorageLink } from '@/types/farmer';

function getInitials(name: string) {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

export interface FarmerProfileHeaderCardProps {
  link: FarmerStorageLink;
  onEditClick: () => void;
}

export const FarmerProfileHeaderCard = memo(function FarmerProfileHeaderCard({
  link,
  onEditClick,
}: FarmerProfileHeaderCardProps) {
  return (
    <div className="space-y-8">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-4">
          <Avatar className="h-20 w-20 shadow-lg sm:h-24 sm:w-24">
            <AvatarFallback className="bg-primary text-primary-foreground text-2xl font-bold sm:text-3xl">
              {getInitials(link.farmerId?.name ?? '')}
            </AvatarFallback>
          </Avatar>
          <div className="space-y-2">
            <h1 className="font-custom text-2xl font-bold tracking-tight sm:text-3xl">
              {link.farmerId?.name ?? '—'}
            </h1>
            <Badge variant="secondary" className="w-fit">
              <Hash />
              {link.accountNumber}
            </Badge>
          </div>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="h-10 w-10 rounded-full"
          onClick={onEditClick}
          aria-label="Edit farmer"
        >
          <Edit className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
});
