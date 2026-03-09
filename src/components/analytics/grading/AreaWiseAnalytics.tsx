import type { KeyboardEvent } from 'react';
import { memo, useMemo } from 'react';
import {
  type ColumnDef,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from '@tanstack/react-table';
import { useNavigate } from '@tanstack/react-router';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { RefreshCw, MapPin, Layers } from 'lucide-react';
import {
  useGetAreaWiseAnalytics,
  type GetAreaWiseAnalyticsParams,
} from '@/services/store-admin/grading-gate-pass/useGetAreaWiseAnalytics';
import type { AreaWiseVarietyItem, AreaWiseAreaItem } from '@/types/analytics';
import { cn } from '@/lib/utils';

/** Preferred column order for size names (others appended alphabetically) */
const SIZE_ORDER = [
  'Below 30',
  '30–40',
  '35–40',
  '40–45',
  '45–50',
  '50–55',
  'Above 50',
  'Above 55',
  'Cut',
];

function orderedSizeNames(areas: AreaWiseAreaItem[]): string[] {
  const set = new Set<string>();
  areas.forEach((a) => a.sizes.forEach((s) => set.add(s.name)));
  const rest = [...set].filter((s) => !SIZE_ORDER.includes(s)).sort();
  return [...SIZE_ORDER.filter((s) => set.has(s)), ...rest];
}

function sizeMap(
  sizes: { name: string; value: number }[]
): Map<string, number> {
  const m = new Map<string, number>();
  sizes.forEach((s) => m.set(s.name, s.value));
  return m;
}

interface TableRowData {
  area: string;
  values: Record<string, number>;
  total: number;
}

/** Match StorageSummaryTable: light grey background + subtle ring on hover */
const cellClickClass =
  'font-custom border-border border px-4 py-2 cursor-pointer hover:bg-muted hover:ring-1 hover:ring-primary/20 transition-all duration-150';

export interface AreaWiseAnalyticsProps {
  dateParams: GetAreaWiseAnalyticsParams;
}

const AreaWiseAnalytics = memo(function AreaWiseAnalytics({
  dateParams,
}: AreaWiseAnalyticsProps) {
  const { data, isLoading, isError, error, refetch } =
    useGetAreaWiseAnalytics(dateParams);

  const chartData = useMemo(() => data?.chartData ?? [], [data?.chartData]);
  const hasData =
    chartData.length > 0 && chartData.some((v) => v.areas?.length > 0);

  if (isLoading) {
    return (
      <Card className="font-custom border-border w-full min-w-0 overflow-hidden rounded-xl shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base font-semibold sm:text-lg">
            <MapPin className="text-primary h-5 w-5" />
            Area-wise Size Distribution
          </CardTitle>
          <CardDescription className="text-xs sm:text-sm">
            Bags by area and size for each variety
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Skeleton className="min-h-[280px] w-full rounded-lg" />
        </CardContent>
      </Card>
    );
  }

  if (isError) {
    return (
      <Card className="font-custom border-destructive/30 bg-destructive/5 w-full min-w-0 overflow-hidden rounded-xl">
        <CardHeader>
          <CardTitle className="text-destructive">
            Failed to load area-wise analytics
          </CardTitle>
          <CardDescription>
            {error instanceof Error ? error.message : 'Something went wrong.'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button
            variant="default"
            onClick={() => refetch()}
            className="font-custom gap-2"
          >
            <RefreshCw className="h-4 w-4" />
            Retry
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (!hasData) {
    return (
      <Card className="font-custom border-border w-full min-w-0 overflow-hidden rounded-xl shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base font-semibold sm:text-lg">
            <MapPin className="text-primary h-5 w-5" />
            Area-wise Size Distribution
          </CardTitle>
          <CardDescription className="text-xs sm:text-sm">
            Bags by area and size for each variety
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="font-custom text-muted-foreground text-sm">
            No data for the selected date range.
          </p>
        </CardContent>
      </Card>
    );
  }

  const defaultTab = chartData[0]?.variety ?? '';

  return (
    <Card className="font-custom border-border w-full min-w-0 overflow-hidden rounded-xl shadow-sm transition-shadow duration-200 hover:shadow-md">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base font-semibold sm:text-lg">
          <MapPin className="text-primary h-5 w-5" />
          Area-wise Size Distribution
        </CardTitle>
        <CardDescription className="font-custom text-muted-foreground text-xs sm:text-sm">
          Bags by area and size for each variety. Click a cell to view area
          breakdown.
        </CardDescription>
      </CardHeader>
      <CardContent className="min-w-0">
        <Tabs defaultValue={defaultTab} className="font-custom w-full">
          <TabsList className="font-custom mb-4 flex h-auto w-full flex-nowrap overflow-x-auto">
            {chartData.map(({ variety }) => (
              <TabsTrigger
                key={variety}
                value={variety}
                className="min-w-0 shrink-0 px-3 sm:px-4"
              >
                {variety}
              </TabsTrigger>
            ))}
          </TabsList>
          {chartData.map((item) => (
            <TabsContent
              key={item.variety}
              value={item.variety}
              className="mt-0 outline-none"
            >
              <VarietyAreaTable varietyItem={item} />
            </TabsContent>
          ))}
        </Tabs>
      </CardContent>
    </Card>
  );
});

interface VarietyAreaTableProps {
  varietyItem: AreaWiseVarietyItem;
}

const VarietyAreaTable = memo(function VarietyAreaTable({
  varietyItem,
}: VarietyAreaTableProps) {
  const navigate = useNavigate();
  const { variety, areas } = varietyItem;
  const sizeNames = useMemo(() => orderedSizeNames(areas), [areas]);

  const { rows, totals, varietyTotal } = useMemo(() => {
    const rowsData: TableRowData[] = [];
    const totals: Record<string, number> = {};
    for (const size of sizeNames) {
      totals[size] = 0;
    }
    for (const a of areas) {
      const bySize = sizeMap(a.sizes);
      const total = a.sizes.reduce((sum, s) => sum + s.value, 0);
      const values: Record<string, number> = {};
      for (const size of sizeNames) {
        const v = bySize.get(size) ?? 0;
        values[size] = v;
        totals[size] = (totals[size] ?? 0) + v;
      }
      rowsData.push({ area: a.area, values, total });
    }
    const varietyTotal = rowsData.reduce((sum, r) => sum + r.total, 0);
    return { rows: rowsData, totals, varietyTotal };
  }, [areas, sizeNames]);

  const columns = useMemo<ColumnDef<TableRowData>[]>(() => {
    const cols: ColumnDef<TableRowData>[] = [
      {
        accessorKey: 'area',
        header: () => <span className="font-custom font-bold">Area</span>,
        cell: ({ getValue }) => (
          <span className="font-custom font-medium">
            {getValue() as string}
          </span>
        ),
      },
    ];
    for (const size of sizeNames) {
      cols.push({
        id: size,
        accessorFn: (row) => row.values[size] ?? 0,
        header: () => <span className="font-custom font-bold">{size}</span>,
        cell: ({ getValue }) => (
          <span className="font-custom font-medium tabular-nums">
            {Number(getValue()).toLocaleString('en-IN')}
          </span>
        ),
      });
    }
    cols.push({
      accessorKey: 'total',
      header: () => <span className="font-custom font-bold">Total</span>,
      cell: ({ getValue }) => (
        <span className="font-custom text-primary font-bold tabular-nums">
          {Number(getValue()).toLocaleString('en-IN')}
        </span>
      ),
    });
    return cols;
  }, [sizeNames]);

  const table = useReactTable({
    data: rows,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  const handleCellClick = (area: string, size: string) => {
    navigate({
      to: '/store-admin/area-breakdown',
      search: { area, size, variety },
    });
  };

  if (sizeNames.length === 0) {
    return (
      <div className="font-custom text-muted-foreground border-border rounded-lg border p-6 text-center text-sm">
        No size data for this variety.
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="font-custom text-muted-foreground flex flex-wrap items-center gap-2 text-sm">
        <Layers className="h-4 w-4 shrink-0" />
        <span>
          {areas.length} area{areas.length !== 1 ? 's' : ''} ·{' '}
          {varietyTotal.toLocaleString('en-IN')} total bags
        </span>
      </div>
      <div className="border-border overflow-x-auto rounded-lg border">
        <Table className="border-collapse">
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow
                key={headerGroup.id}
                className="border-border bg-muted hover:bg-muted"
              >
                {headerGroup.headers.map((header) => (
                  <TableHead
                    key={header.id}
                    className="font-custom border-border border px-4 py-2 font-bold"
                  >
                    {header.isPlaceholder
                      ? null
                      : flexRender(
                          header.column.columnDef.header,
                          header.getContext()
                        )}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  className="border-border hover:bg-transparent"
                >
                  {row.getVisibleCells().map((cell) => {
                    const colId = cell.column.id;
                    const isClickable = colId !== 'area';
                    const sizeParam = colId === 'total' ? 'total' : colId;
                    return (
                      <TableCell
                        key={cell.id}
                        className={cn(
                          'font-custom border-border border px-4 py-2',
                          isClickable && cellClickClass
                        )}
                        {...(isClickable && {
                          onClick: () =>
                            handleCellClick(row.original.area, sizeParam),
                          role: 'button',
                          tabIndex: 0,
                          onKeyDown: (
                            e: KeyboardEvent<HTMLTableCellElement>
                          ) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                              e.preventDefault();
                              handleCellClick(row.original.area, sizeParam);
                            }
                          },
                        })}
                      >
                        {flexRender(
                          cell.column.columnDef.cell,
                          cell.getContext()
                        )}
                      </TableCell>
                    );
                  })}
                </TableRow>
              ))
            ) : (
              <TableRow className="border-border hover:bg-transparent">
                <TableCell
                  colSpan={columns.length}
                  className="font-custom text-muted-foreground border-border h-24 border px-4 py-2 text-center"
                >
                  No area data.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
          {rows.length > 0 && (
            <TableFooter>
              <TableRow className="border-border hover:bg-transparent">
                <TableHead className="font-custom bg-muted/50 border-border border px-4 py-2 font-bold">
                  Bag Total
                </TableHead>
                {sizeNames.map((size) => (
                  <TableCell
                    key={size}
                    className="font-custom bg-muted/50 border-border border px-4 py-2 font-bold tabular-nums"
                  >
                    {(totals[size] ?? 0).toLocaleString('en-IN')}
                  </TableCell>
                ))}
                <TableCell className="font-custom text-primary bg-primary/10 border-border border px-4 py-2 font-bold tabular-nums">
                  {varietyTotal.toLocaleString('en-IN')}
                </TableCell>
              </TableRow>
            </TableFooter>
          )}
        </Table>
      </div>
    </div>
  );
});

export default AreaWiseAnalytics;
