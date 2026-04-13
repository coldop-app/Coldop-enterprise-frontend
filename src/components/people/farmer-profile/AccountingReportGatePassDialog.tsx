import { memo } from 'react';
import { format, parseISO } from 'date-fns';
import type { GradingGatePass } from '@/types/grading-gate-pass';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { FileSpreadsheet } from 'lucide-react';

export interface AccountingReportGatePassRow {
  pass: GradingGatePass;
  truckNumber: string;
  incomingBags: number;
  totalGradingBags: number;
}

const DEFAULT_TITLE = 'Select grading gate passes for Accounting Report';
const DEFAULT_DESCRIPTION =
  'Choose which grading gate passes to include in the report. The report will show only the selected passes.';

export interface AccountingReportGatePassDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  rows: AccountingReportGatePassRow[];
  selectedPassIds: Set<string>;
  onSelectionChange: (ids: Set<string>) => void;
  onSelectAll: () => void;
  onDeselectAll: () => void;
  onGenerate: () => void;
  onDownloadExcel: () => void;
  isGeneratingPdf: boolean;
  /** Override dialog title (e.g. Farmer Report). */
  title?: string;
  /** Override description under the title. */
  description?: string;
  /** Stable id for DialogDescription (use unique values when multiple dialogs exist on the page). */
  descriptionId?: string;
  /** When false, hides the Excel download action (e.g. Farmer Report PDF-only). */
  showDownloadExcel?: boolean;
}

export const AccountingReportGatePassDialog = memo(
  function AccountingReportGatePassDialog({
    open,
    onOpenChange,
    rows,
    selectedPassIds,
    onSelectionChange,
    onSelectAll,
    onDeselectAll,
    onGenerate,
    onDownloadExcel,
    isGeneratingPdf,
    title = DEFAULT_TITLE,
    description = DEFAULT_DESCRIPTION,
    descriptionId = 'accounting-report-dialog-description',
    showDownloadExcel = true,
  }: AccountingReportGatePassDialogProps) {
    const togglePass = (passId: string) => {
      onSelectionChange(
        (() => {
          const next = new Set(selectedPassIds);
          if (next.has(passId)) next.delete(passId);
          else next.add(passId);
          return next;
        })()
      );
    };

    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent
          className="font-custom flex max-h-[90vh] max-w-4xl flex-col overflow-hidden"
          aria-describedby={descriptionId}
        >
          <DialogHeader>
            <DialogTitle className="font-custom font-semibold">
              {title}
            </DialogTitle>
            <DialogDescription id={descriptionId}>
              {description}
            </DialogDescription>
          </DialogHeader>
          <div className="flex min-h-0 flex-1 flex-col gap-3">
            <div className="flex gap-2">
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
            <div className="border-border overflow-auto rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow className="border-border bg-muted/60">
                    <TableHead className="font-custom border-border w-12 px-3 py-2 text-center font-semibold">
                      Select
                    </TableHead>
                    <TableHead className="font-custom border-border px-3 py-2 font-semibold">
                      Date
                    </TableHead>
                    <TableHead className="font-custom border-border px-3 py-2 font-semibold">
                      Grading no.
                    </TableHead>
                    <TableHead className="font-custom border-border px-3 py-2 font-semibold">
                      Manual grading no.
                    </TableHead>
                    <TableHead className="font-custom border-border px-3 py-2 font-semibold">
                      Truck number
                    </TableHead>
                    <TableHead className="font-custom border-border px-3 py-2 text-right font-semibold">
                      Incoming bags received
                    </TableHead>
                    <TableHead className="font-custom border-border px-3 py-2 text-right font-semibold">
                      Total grading bags
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map(
                    ({ pass, truckNumber, incomingBags, totalGradingBags }) => {
                      const isSelected = selectedPassIds.has(pass._id);
                      return (
                        <TableRow
                          key={pass._id}
                          className="border-border hover:bg-muted/40 cursor-pointer"
                          onClick={() => togglePass(pass._id)}
                        >
                          <TableCell className="border-border px-3 py-2 text-center">
                            <Checkbox
                              checked={isSelected}
                              onCheckedChange={() => togglePass(pass._id)}
                              onClick={(e) => e.stopPropagation()}
                              aria-label={`Select grading pass ${pass.gatePassNo}`}
                            />
                          </TableCell>
                          <TableCell className="font-custom border-border px-3 py-2">
                            {pass.date
                              ? format(parseISO(pass.date), 'dd MMM yyyy')
                              : '—'}
                          </TableCell>
                          <TableCell className="font-custom border-border px-3 py-2">
                            {pass.gatePassNo ?? '—'}
                          </TableCell>
                          <TableCell className="font-custom border-border px-3 py-2">
                            {pass.manualGatePassNumber != null
                              ? String(pass.manualGatePassNumber)
                              : '—'}
                          </TableCell>
                          <TableCell className="font-custom border-border px-3 py-2">
                            {truckNumber}
                          </TableCell>
                          <TableCell className="font-custom border-border px-3 py-2 text-right">
                            {incomingBags}
                          </TableCell>
                          <TableCell className="font-custom border-border px-3 py-2 text-right">
                            {totalGradingBags}
                          </TableCell>
                        </TableRow>
                      );
                    }
                  )}
                </TableBody>
              </Table>
            </div>
            {rows.length === 0 && (
              <p className="font-custom text-muted-foreground text-sm">
                No grading gate passes in the current filter. Adjust the date
                range or clear filters.
              </p>
            )}
          </div>
          <DialogFooter className="mt-4 shrink-0 flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              className="font-custom"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            {showDownloadExcel ? (
              <Button
                type="button"
                variant="outline"
                className="font-custom"
                disabled={selectedPassIds.size === 0}
                onClick={onDownloadExcel}
                aria-label="Download Excel"
              >
                <FileSpreadsheet className="mr-2 h-4 w-4 shrink-0" />
                Download Excel
              </Button>
            ) : null}
            <Button
              type="button"
              variant="default"
              className="font-custom"
              disabled={selectedPassIds.size === 0 || isGeneratingPdf}
              onClick={onGenerate}
            >
              {isGeneratingPdf ? 'Generating…' : 'Generate Report'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }
);
