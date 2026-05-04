import { memo } from 'react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import type { GradingGatePass } from '@/types/grading-gate-pass';

function formatDisplayDate(isoDate: string): string {
  const date = new Date(isoDate);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function getGradingManualNo(pass: GradingGatePass): string {
  if (pass.manualGatePassNumber != null) {
    return String(pass.manualGatePassNumber);
  }
  return String(pass.gatePassNo ?? '');
}

export interface AccountingGradingPassSelectionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  gradingPasses: GradingGatePass[];
  sortedGradingPasses: GradingGatePass[];
  draftSelectedGradingIds: Set<string>;
  selectedGradingIdSet: Set<string>;
  hasDraftChanges: boolean;
  onSelectAll: () => void;
  onDeselectAll: () => void;
  onToggleDraftSelection: (gradingId: string) => void;
  onResetDraftSelection: () => void;
  onApplyDraftSelection: () => void;
}

const AccountingGradingPassSelectionDialog = ({
  open,
  onOpenChange,
  gradingPasses,
  sortedGradingPasses,
  draftSelectedGradingIds,
  selectedGradingIdSet: _selectedGradingIdSet,
  hasDraftChanges,
  onSelectAll,
  onDeselectAll,
  onToggleDraftSelection,
  onResetDraftSelection,
  onApplyDraftSelection,
}: AccountingGradingPassSelectionDialogProps) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="font-custom flex max-h-[90vh] flex-col gap-0 overflow-hidden rounded-2xl p-0 sm:max-w-5xl">
        <DialogHeader className="from-primary/10 via-primary/5 to-background border-border/50 border-b bg-linear-to-r px-6 pt-6 pb-4">
          <DialogTitle className="font-custom text-xl font-semibold tracking-tight">
            Select grading gate passes for Accounting Report
          </DialogTitle>
          <DialogDescription className="font-custom text-muted-foreground text-sm leading-relaxed">
            Choose which grading gate passes to include in the report. Incoming
            and summary rows are automatically filtered from your selected
            grading passes.
          </DialogDescription>
        </DialogHeader>

        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-6 py-4">
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="font-custom"
              onClick={onSelectAll}
            >
              Select all
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="font-custom"
              onClick={onDeselectAll}
            >
              Deselect all
            </Button>
          </div>

          <div className="border-border/60 bg-card/80 overflow-hidden rounded-xl border">
            <div className="max-h-[min(65vh,34rem)] overflow-auto">
              <table className="font-custom w-full text-sm">
                <thead className="bg-secondary sticky top-0 z-10">
                  <tr>
                    <th className="w-16 px-4 py-3 text-left">Select</th>
                    <th className="px-4 py-3 text-left">Date</th>
                    <th className="px-4 py-3 text-left">Grading no.</th>
                    <th className="px-4 py-3 text-left">Manual grading no.</th>
                    <th className="px-4 py-3 text-left">Variety</th>
                    <th className="px-4 py-3 text-right">Incoming linked</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedGradingPasses.length === 0 ? (
                    <tr>
                      <td
                        className="text-muted-foreground px-4 py-6 text-center"
                        colSpan={6}
                      >
                        No grading gate passes found.
                      </td>
                    </tr>
                  ) : (
                    sortedGradingPasses.map((pass) => {
                      const isChecked = draftSelectedGradingIds.has(pass._id);
                      return (
                        <tr
                          key={pass._id}
                          className="border-border/40 hover:bg-muted/30 cursor-pointer border-b transition-colors last:border-b-0"
                          onClick={() => onToggleDraftSelection(pass._id)}
                        >
                          <td
                            className="px-4 py-2.5"
                            onClick={(event) => event.stopPropagation()}
                          >
                            <Checkbox
                              checked={isChecked}
                              onCheckedChange={() =>
                                onToggleDraftSelection(pass._id)
                              }
                              aria-label={`Select grading pass ${pass.gatePassNo}`}
                            />
                          </td>
                          <td className="px-4 py-2.5">
                            {formatDisplayDate(pass.date)}
                          </td>
                          <td className="px-4 py-2.5">{pass.gatePassNo}</td>
                          <td className="px-4 py-2.5">
                            {getGradingManualNo(pass)}
                          </td>
                          <td className="px-4 py-2.5">{pass.variety}</td>
                          <td className="px-4 py-2.5 text-right tabular-nums">
                            {pass.incomingGatePassIds?.length ?? 0}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <DialogFooter className="bg-background border-border/50 flex-row items-center justify-between border-t px-6 py-4">
          <p className="font-custom text-muted-foreground text-sm">
            Selected: {draftSelectedGradingIds.size} / {gradingPasses.length}
          </p>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="ghost"
              className="font-custom"
              disabled={!hasDraftChanges}
              onClick={onResetDraftSelection}
            >
              Reset
            </Button>
            <Button
              type="button"
              variant="outline"
              className="font-custom"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              className="font-custom font-semibold"
              disabled={!hasDraftChanges}
              onClick={onApplyDraftSelection}
            >
              Apply changes
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default memo(AccountingGradingPassSelectionDialog);
