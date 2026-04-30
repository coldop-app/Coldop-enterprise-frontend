import * as React from 'react';
import { FileText, RefreshCw, Search, SlidersHorizontal } from 'lucide-react';
import { Item } from '@/components/ui/item';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

type PlaceholderRow = {
  id: string;
  name: string;
  email: string;
  age: number;
};

const PLACEHOLDER_ROWS: PlaceholderRow[] = [
  { id: '1', name: 'John Doe', email: 'john@example.com', age: 28 },
  { id: '2', name: 'Jane Smith', email: 'jane@example.com', age: 33 },
  { id: '3', name: 'Alex Brown', email: 'alex@example.com', age: 24 },
];

const ContractFarmingReportTable = () => {
  const [search, setSearch] = React.useState('');

  const filteredRows = React.useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return PLACEHOLDER_ROWS;

    return PLACEHOLDER_ROWS.filter(
      (row) =>
        row.name.toLowerCase().includes(query) ||
        row.email.toLowerCase().includes(query) ||
        String(row.age).includes(query)
    );
  }, [search]);

  return (
    <main className="from-background via-muted/20 to-background mx-auto max-w-7xl bg-linear-to-b p-3 sm:p-4 lg:p-6">
      <div className="space-y-4">
        <Item
          variant="outline"
          size="sm"
          className="border-border/30 bg-background rounded-2xl border p-3 shadow-sm"
        >
          <div className="flex w-full flex-wrap items-end gap-3 lg:flex-nowrap">
            <div className="ml-auto flex items-center gap-2 self-end">
              <div className="relative min-w-[160px] lg:w-[220px]">
                <Search className="text-muted-foreground pointer-events-none absolute top-1/2 left-2.5 h-3.5 w-3.5 -translate-y-1/2" />
                <Input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search table..."
                  className="h-8 pl-8 text-sm"
                />
              </div>
              <Button
                variant="outline"
                className="border-primary text-primary hover:bg-primary/5 h-8 rounded-lg px-4 text-sm leading-none"
              >
                <SlidersHorizontal className="h-3.5 w-3.5" />
                View Filters
              </Button>
              <Button
                variant="default"
                className="h-8 rounded-lg px-4 text-sm leading-none"
              >
                <FileText className="h-3.5 w-3.5" />
                Pdf
              </Button>
              <Button
                variant="ghost"
                className="text-muted-foreground h-8 rounded-lg px-2 leading-none"
                aria-label="Refresh"
              >
                <RefreshCw className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        </Item>

        <p className="text-muted-foreground text-sm">
          This is a fresh placeholder report scaffold. Contract-farming logic
          will be added in upcoming steps.
        </p>

        <div className="border-primary/15 bg-card/95 ring-primary/5 relative overflow-x-auto rounded-2xl border shadow-[0_1px_2px_rgba(0,0,0,0.05),0_8px_24px_rgba(0,0,0,0.06)] ring-1">
          <Table className="font-custom text-sm">
            <TableHeader className="bg-secondary">
              <TableRow>
                <TableHead className="font-custom">Name</TableHead>
                <TableHead className="font-custom">email</TableHead>
                <TableHead className="font-custom text-right">age</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredRows.length > 0 ? (
                filteredRows.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell className="font-custom">{row.name}</TableCell>
                    <TableCell className="font-custom">{row.email}</TableCell>
                    <TableCell className="font-custom text-right">
                      {row.age}
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell
                    colSpan={3}
                    className="text-muted-foreground font-custom h-20 text-center"
                  >
                    No records found.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </main>
  );
};

export default ContractFarmingReportTable;
