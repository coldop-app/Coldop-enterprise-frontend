import { memo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import type { ContractFarmingReportDigitalVarietyGroup } from '@/utils/contractFarmingReportShared';
import { expandFarmerRowsForSizes } from '@/utils/contractFarmingReportShared';
import { Columns3 } from 'lucide-react';
import ContractFarmingVarietyTable from '@/components/people/ContractFarmingVarietyTable';
import {
  CONTRACT_FARMING_COLUMN_OPTIONS,
  type ContractFarmingColumnVisibility,
} from '@/components/people/contractFarmingColumns';

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
    onColumnVisibilityChange,
  }: ContractFarmingReportDigitalTableProps) {
    const totalRows = groups.reduce(
      (n, g) => n + expandFarmerRowsForSizes(g.rows).length,
      0
    );

    return (
      <Card className="font-custom border-border rounded-xl shadow-sm">
        <CardHeader className="flex flex-col gap-3 pb-2 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
          <div className="min-w-0">
            <CardTitle className="font-custom text-xl font-bold tracking-tight sm:text-2xl">
              Contract farming report
            </CardTitle>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="font-custom focus-visible:ring-primary h-9 w-full shrink-0 gap-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 sm:w-auto"
              >
                <Columns3 className="h-4 w-4 shrink-0" />
                Columns
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="font-custom w-64">
              <DropdownMenuLabel>Toggle columns</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {CONTRACT_FARMING_COLUMN_OPTIONS.map((column) => (
                <DropdownMenuCheckboxItem
                  key={column.key}
                  checked={columnVisibility[column.key]}
                  onCheckedChange={(checked) =>
                    onColumnVisibilityChange({
                      ...columnVisibility,
                      [column.key]: checked === true,
                    })
                  }
                >
                  {column.label}
                </DropdownMenuCheckboxItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </CardHeader>
        <CardContent className="flex flex-col gap-4 p-4 pt-0 sm:p-5 sm:pt-0">
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
