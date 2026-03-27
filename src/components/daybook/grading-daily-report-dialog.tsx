import { memo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { GetReportsDialog } from '@/components/analytics/get-reports-dialog';

const GradingDailyReportDialog = memo(function GradingDailyReportDialog() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button
        variant="secondary"
        className="font-custom h-10 w-full sm:w-auto"
        onClick={() => setOpen(true)}
      >
        View Daily Report
      </Button>

      <GetReportsDialog
        open={open}
        onOpenChange={setOpen}
        reportType="grading"
      />
    </>
  );
});

export default GradingDailyReportDialog;
