import { memo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import type { ContractFarmingReportDigitalVarietyGroup } from '@/utils/contractFarmingReportShared';
import {
  accountFamilyBaseKey,
  expandFarmerRowsForSizes,
  familyGroupHasDecimalAccountMember,
  groupFarmersByAccountFamily,
} from '@/utils/contractFarmingReportShared';
import ContractFarmingVarietyTable from './ContractFarmingVarietyTable';
import type { ContractFarmingColumnVisibility } from './contractFarmingColumns';

export type { ContractFarmingReportDigitalVarietyGroup };

export interface ContractFarmingReportDigitalTableProps {
  isLoading: boolean;
  isError: boolean;
  error: unknown;
  /** One group per variety; each group renders its own table. */
  groups: ContractFarmingReportDigitalVarietyGroup[];
  columnVisibility: ContractFarmingColumnVisibility;
  onColumnVisibilityChange: (next: ContractFarmingColumnVisibility) => void;
}

export const ContractFarmingReportDigitalTable = memo(
  function ContractFarmingReportDigitalTable({
    isLoading,
    isError,
    error,
    groups,
    columnVisibility,
  }: ContractFarmingReportDigitalTableProps) {
    const totalRows = groups.reduce((n, g) => {
      const familySubtotalRows = groupFarmersByAccountFamily(g.rows).filter(
        (f) =>
          f.length > 0 &&
          accountFamilyBaseKey(f[0].accountNumber) != null &&
          familyGroupHasDecimalAccountMember(f)
      ).length;
      return n + expandFarmerRowsForSizes(g.rows).length + familySubtotalRows;
    }, 0);

    return (
      <Card className="font-custom border-border rounded-xl shadow-sm">
        <CardContent className="flex flex-col gap-4 p-4 sm:p-5">
          {isLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-8 w-full rounded-md" />
              <Skeleton className="h-8 w-full rounded-md" />
              <Skeleton className="h-8 w-3/4 rounded-md" />
            </div>
          ) : isError ? (
            <p className="font-custom text-destructive text-sm">
              {error instanceof Error
                ? error.message
                : 'Could not load contract farming report.'}
            </p>
          ) : groups.length === 0 ? (
            <p className="font-custom text-muted-foreground text-sm">
              No contract farming rows returned.
            </p>
          ) : (
            <div className="max-h-[min(28rem,50vh)] space-y-6 overflow-auto">
              {groups.map(({ variety, rows }, groupIndex) => {
                return (
                  <section
                    key={variety}
                    className="space-y-2"
                    aria-labelledby={`cf-digital-variety-${groupIndex}`}
                  >
                    <ContractFarmingVarietyTable
                      variety={variety}
                      rows={rows}
                      columnVisibility={columnVisibility}
                    />
                  </section>
                );
              })}
            </div>
          )}
          {!isLoading && totalRows > 0 ? (
            <p className="font-custom text-muted-foreground mt-3 text-xs">
              {totalRows} row{totalRows === 1 ? '' : 's'} across {groups.length}{' '}
              variet{groups.length === 1 ? 'y' : 'ies'}.
            </p>
          ) : null}
        </CardContent>
      </Card>
    );
  }
);
