import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useDeleteStation } from '@/services/store-admin/station/useDeleteStation';
import type { StationWithLocalities } from '@/types/station';

interface DeleteStationDialogProps {
  station: StationWithLocalities | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  canDelete: boolean;
}

export function DeleteStationDialog({
  station,
  open,
  onOpenChange,
  canDelete,
}: DeleteStationDialogProps) {
  const { mutate: deleteStation, isPending } = useDeleteStation();

  const handleDelete = () => {
    if (!station) return;

    deleteStation(
      { id: station._id },
      {
        onSuccess: (data) => {
          if (data.success) {
            onOpenChange(false);
          }
        },
      }
    );
  };

  if (!canDelete) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="font-custom sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Delete Station</DialogTitle>
          <DialogDescription>
            Are you sure you want to delete{' '}
            <span className="text-foreground font-medium">
              {station?.name ?? 'this station'}
            </span>
            ? This action cannot be undone. Delete the station only after all
            localities are removed. Stations assigned to farmer storage links
            cannot be deleted.
          </DialogDescription>
        </DialogHeader>

        <DialogFooter className="mt-6 gap-2 sm:justify-end">
          <DialogClose asChild>
            <Button type="button" variant="outline" disabled={isPending}>
              Cancel
            </Button>
          </DialogClose>
          <Button
            type="button"
            variant="destructive"
            disabled={isPending || !station}
            className="font-bold"
            onClick={handleDelete}
          >
            {isPending ? 'Deleting…' : 'Delete Station'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
