import { memo } from 'react';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { FarmerSeedEditForm } from '@/components/forms/farmer-seed/edit';
import type { FarmerSeedEntryListItem } from '@/types/farmer-seed';

export interface FarmerSeedEditSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  entry: FarmerSeedEntryListItem | null;
}

export const FarmerSeedEditSheet = memo(function FarmerSeedEditSheet({
  open,
  onOpenChange,
  entry,
}: FarmerSeedEditSheetProps) {
  if (!entry) return null;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="flex w-full flex-col gap-0 overflow-hidden p-0 sm:max-w-2xl"
      >
        <SheetHeader className="border-b px-4 py-4 sm:px-6">
          <SheetTitle className="font-custom text-left">
            Edit farmer seed voucher
          </SheetTitle>
          <SheetDescription className="font-custom text-left">
            Update seed details, then use Next to review and save.
          </SheetDescription>
        </SheetHeader>

        <div
          key={entry._id}
          className="flex min-h-0 flex-1 flex-col overflow-y-auto px-4 py-4 sm:px-6"
        >
          <FarmerSeedEditForm
            entry={entry}
            onSuccess={() => onOpenChange(false)}
            onCancel={() => onOpenChange(false)}
          />
        </div>
      </SheetContent>
    </Sheet>
  );
});
