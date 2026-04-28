import {
  Download,
  FileSpreadsheet,
  RefreshCw,
  Search,
  Filter,
  Calendar as CalendarIcon,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

// --- MOCK DATA (UI ONLY) ---
const INCOMING_GATE_PASSES = [
  {
    gatePassNo: 10021,
    manualGatePassNumber: 451,
    date: '2026-04-25',
    variety: 'FC-5',
    location: 'Store Gate - 2',
    truckNumber: 'PB10GH2255',
    bagsReceived: 92,
    weightSlip: {
      slipNumber: 'WS-8821',
      grossWeightKg: 6640,
      tareWeightKg: 1840,
    },
    status: 'NOT_GRADED',
    remarks: 'Bag stitching pending for 2 bags.',
  },
  {
    gatePassNo: 10022,
    manualGatePassNumber: null,
    date: '2026-04-26',
    variety: 'Khyati',
    location: 'Main Dock',
    truckNumber: 'HR68AF1902',
    bagsReceived: 74,
    weightSlip: {
      slipNumber: 'WS-8822',
      grossWeightKg: 5410,
      tareWeightKg: 1590,
    },
    status: 'GRADED',
    remarks: 'Moisture within accepted limits.',
  },
  {
    gatePassNo: 10023,
    manualGatePassNumber: 453,
    date: '2026-04-27',
    variety: 'Lady Rosetta',
    location: null,
    truckNumber: 'PB02AZ9011',
    bagsReceived: 58,
    weightSlip: null,
    status: 'NOT_GRADED',
    remarks: null,
  },
];

const statusClasses = {
  NOT_GRADED: 'bg-amber-100/80 text-amber-800 ring-1 ring-amber-600/20',
  GRADED: 'bg-emerald-100/80 text-emerald-800 ring-1 ring-emerald-600/20',
};

export default function IncomingDigitalReportUI() {
  return (
    <main className="mx-auto max-w-7xl p-3 sm:p-4 lg:p-6">
      <div className="space-y-6">
        {/* HEADER SECTION */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-foreground text-2xl font-bold tracking-tight">
                Incoming Gate Pass Report
              </h1>
              <Badge
                variant="secondary"
                className="rounded-md bg-blue-50/80 text-blue-700 ring-1 ring-blue-600/20"
              >
                UI Preview
              </Badge>
            </div>
            <p className="text-muted-foreground mt-1 text-sm">
              Comprehensive overview of all incoming agricultural materials and
              grading statuses.
            </p>
          </div>

          {/* PRIMARY ACTIONS */}
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              className="h-9 gap-2 bg-white text-xs font-medium shadow-sm"
            >
              <Download className="h-3.5 w-3.5" />
              Export PDF
            </Button>
            <Button className="h-9 gap-2 text-xs font-medium shadow-sm">
              <FileSpreadsheet className="h-3.5 w-3.5" />
              Export Excel
            </Button>
          </div>
        </div>

        {/* KPI SUMMARY CARDS */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Card className="border-muted/40 bg-white shadow-sm">
            <CardContent className="p-5">
              <p className="text-muted-foreground/80 text-[11px] font-semibold tracking-wider uppercase">
                Total Gate Passes
              </p>
              <div className="mt-2 flex items-baseline gap-2">
                <p className="text-foreground text-3xl font-bold">3</p>
                <span className="text-xs font-medium text-emerald-600">
                  +12% this week
                </span>
              </div>
            </CardContent>
          </Card>

          <Card className="border-muted/40 bg-white shadow-sm">
            <CardContent className="p-5">
              <p className="text-muted-foreground/80 text-[11px] font-semibold tracking-wider uppercase">
                Total Bags Received
              </p>
              <div className="mt-2 flex items-baseline gap-2">
                <p className="text-foreground text-3xl font-bold">224</p>
                <span className="text-muted-foreground text-xs font-medium">
                  Bags
                </span>
              </div>
            </CardContent>
          </Card>

          <Card className="border-muted/40 bg-white shadow-sm">
            <CardContent className="p-5">
              <p className="text-muted-foreground/80 text-[11px] font-semibold tracking-wider uppercase">
                Total Gross Weight
              </p>
              <div className="mt-2 flex items-baseline gap-2">
                <p className="text-foreground text-3xl font-bold">12,050</p>
                <span className="text-muted-foreground text-xs font-medium">
                  KG
                </span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* DATA TABLE SECTION */}
        <Card className="border-muted/40 overflow-hidden bg-white shadow-sm">
          {/* INLINE FILTER TOOLBAR */}
          <div className="border-muted/30 bg-muted/10 flex flex-wrap items-center justify-between gap-4 border-b p-4">
            <div className="flex flex-wrap items-center gap-3">
              <div className="relative">
                <Search className="text-muted-foreground absolute top-2.5 left-2.5 h-3.5 w-3.5" />
                <Input
                  placeholder="Search truck or variety..."
                  className="h-8 w-[200px] bg-white pl-8 text-xs shadow-none"
                  readOnly
                />
              </div>

              <div className="border-input flex items-center gap-1 rounded-md border bg-white px-3 py-1 shadow-none">
                <CalendarIcon className="text-muted-foreground h-3.5 w-3.5" />
                <span className="text-muted-foreground text-xs">
                  Apr 25 - Apr 27, 2026
                </span>
              </div>

              <Select defaultValue="all">
                <SelectTrigger className="h-8 w-[140px] bg-white text-xs shadow-none">
                  <Filter className="mr-2 h-3 w-3" />
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="NOT_GRADED">Not Graded</SelectItem>
                  <SelectItem value="GRADED">Graded</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Button
              variant="ghost"
              size="sm"
              className="text-muted-foreground hover:text-foreground h-8 text-xs"
            >
              <RefreshCw className="mr-2 h-3.5 w-3.5" />
              Clear Filters
            </Button>
          </div>

          {/* TABLE */}
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1100px] border-collapse text-sm">
              <thead>
                <tr className="bg-white">
                  {[
                    'Gate Pass',
                    'Date',
                    'Variety',
                    'Truck No.',
                    'Bags',
                    'Slip No.',
                    'Gross (kg)',
                    'Tare (kg)',
                    'Status',
                  ].map((header) => (
                    <th
                      key={header}
                      className={`border-muted/40 text-muted-foreground/70 border-b px-4 py-3.5 text-[10px] font-bold tracking-widest uppercase ${
                        ['Bags', 'Gross (kg)', 'Tare (kg)'].includes(header)
                          ? 'text-right'
                          : 'text-left'
                      }`}
                    >
                      {header}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-muted/20 divide-y bg-white">
                {INCOMING_GATE_PASSES.map((row) => (
                  <tr
                    key={row.gatePassNo}
                    className="group hover:bg-muted/20 transition-colors"
                  >
                    <td className="px-4 py-3">
                      <div className="flex flex-col">
                        <span className="text-foreground font-medium">
                          {row.gatePassNo}
                        </span>
                        {row.manualGatePassNumber && (
                          <span className="text-muted-foreground text-[11px]">
                            Ref: {row.manualGatePassNumber}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="text-muted-foreground px-4 py-3 text-xs">
                      {row.date}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-col">
                        <span className="font-medium">{row.variety}</span>
                        {row.location && (
                          <span className="text-muted-foreground text-[11px]">
                            {row.location}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 font-mono text-xs">
                      {row.truckNumber}
                    </td>
                    <td className="px-4 py-3 text-right font-medium tabular-nums">
                      {row.bagsReceived}
                    </td>
                    <td className="text-muted-foreground px-4 py-3 text-xs">
                      {row.weightSlip?.slipNumber ?? '-'}
                    </td>
                    <td className="text-muted-foreground px-4 py-3 text-right tabular-nums">
                      {row.weightSlip?.grossWeightKg?.toLocaleString() ?? '-'}
                    </td>
                    <td className="text-muted-foreground px-4 py-3 text-right tabular-nums">
                      {row.weightSlip?.tareWeightKg?.toLocaleString() ?? '-'}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex rounded-md px-2 py-1 text-[10px] font-bold tracking-wide uppercase ${
                          statusClasses[
                            row.status as keyof typeof statusClasses
                          ]
                        }`}
                      >
                        {row.status.replace('_', ' ')}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* TABLE FOOTER / PAGINATION PLACEHOLDER */}
          <div className="border-muted/30 text-muted-foreground flex items-center justify-between border-t bg-white px-4 py-3 text-xs">
            <p>Showing 1 to 3 of 3 entries</p>
            <div className="flex gap-1">
              <Button
                variant="outline"
                size="sm"
                className="h-7 w-7 p-0 shadow-none"
                disabled
              >
                {'<'}
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="h-7 w-7 p-0 shadow-none"
                disabled
              >
                {'>'}
              </Button>
            </div>
          </div>
        </Card>
      </div>
    </main>
  );
}
