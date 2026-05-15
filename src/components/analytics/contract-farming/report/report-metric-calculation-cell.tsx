import { useState } from 'react';

import { ContractFarmingMetricCalculationDialog } from './contract-farming-metric-calculation-dialog';
import type { ContractFarmingMetricCalculation } from './contract-farming-metric-types';
import type { FlattenedRow } from './types';
import { Button } from '@/components/ui/button';

interface ReportMetricCalculationCellProps {
  row: FlattenedRow;
  metric: ContractFarmingMetricCalculation;
  displayValue: string;
  ariaLabel: string;
}

export function ReportMetricCalculationCell({
  row,
  metric,
  displayValue,
  ariaLabel,
}: ReportMetricCalculationCellProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button
        type="button"
        variant="ghost"
        className="font-custom text-foreground hover:text-primary focus-visible:ring-primary h-auto w-full justify-end px-1 py-0.5 text-right font-normal tabular-nums underline-offset-2 hover:underline focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
        onClick={() => setOpen(true)}
        aria-label={ariaLabel}
      >
        {displayValue}
      </Button>
      <ContractFarmingMetricCalculationDialog
        open={open}
        onOpenChange={setOpen}
        row={row}
        metric={metric}
      />
    </>
  );
}
