import type { IncomingReportRow } from '../columns';

type HorizontalAlign = 'left' | 'right' | 'center';

type BagSizeColumnId =
  | 'bagBelow25'
  | 'bag25to30'
  | 'bagBelow30'
  | 'bag30to35'
  | 'bag30to40'
  | 'bag35to40'
  | 'bag40to45'
  | 'bag45to50'
  | 'bag50to55'
  | 'bagAbove50'
  | 'bagAbove55'
  | 'bagCut';

export type PreparedPdfColumn = {
  id: string;
  label: string;
  align: HorizontalAlign;
  weight: number;
};

export type PreparedPdfRow = {
  id: string;
  values: Record<string, string>;
};

export type PreparedPdfTotals = Record<string, string>;

export type PreparedIncomingReportSection = {
  id: string;
  title: string;
  rows: PreparedPdfRow[];
  totals: PreparedPdfTotals;
};

type PreparedSummaryTotals = {
  count: string;
  bags: string;
  bagSizeTotals: Record<BagSizeColumnId, string>;
};

type PreparedVarietySummaryRow = PreparedSummaryTotals & {
  variety: string;
};

type PreparedFarmerSummaryRow = PreparedSummaryTotals & {
  farmerName: string;
};

type PreparedBagSizeSummaryRow = {
  label: string;
  totalBags: string;
};

export type PreparedIncomingReportSummary = {
  bagColumns: Array<{ id: BagSizeColumnId; label: string }>;
  byVariety: PreparedVarietySummaryRow[];
  byFarmer: PreparedFarmerSummaryRow[];
  bagSizeTotals: PreparedBagSizeSummaryRow[];
  overall: PreparedSummaryTotals;
};

export type PreparedIncomingReportPdf = {
  columns: PreparedPdfColumn[];
  rows: PreparedPdfRow[];
  totals: PreparedPdfTotals;
  sections: PreparedIncomingReportSection[];
  summary: PreparedIncomingReportSummary;
  isGrouped: boolean;
};

type ColumnConfig = {
  label: string;
  align?: HorizontalAlign;
  weight?: number;
  value: (row: IncomingReportRow) => string;
  total?: (rows: IncomingReportRow[]) => string;
};

const BAG_COLUMNS: Array<{ id: BagSizeColumnId; label: string }> = [
  { id: 'bagBelow25', label: 'Below 25' },
  { id: 'bag25to30', label: '25-30' },
  { id: 'bagBelow30', label: 'Below 30' },
  { id: 'bag30to35', label: '30-35' },
  { id: 'bag30to40', label: '30-40' },
  { id: 'bag35to40', label: '35-40' },
  { id: 'bag40to45', label: '40-45' },
  { id: 'bag45to50', label: '45-50' },
  { id: 'bag50to55', label: '50-55' },
  { id: 'bagAbove50', label: 'Above 50' },
  { id: 'bagAbove55', label: 'Above 55' },
  { id: 'bagCut', label: 'Cut' },
];

const BAG_COLUMN_IDS = BAG_COLUMNS.map((column) => column.id);
const BAG_COLUMN_LABELS = Object.fromEntries(
  BAG_COLUMNS.map((column) => [column.id, column.label])
) as Record<BagSizeColumnId, string>;

const numericColumnIds = new Set<string>([
  'accountNumber',
  ...BAG_COLUMN_IDS,
  'totalBags',
]);

const columnConfig: Record<string, ColumnConfig> = {
  gatePassNo: {
    label: 'System Generated Gate Pass No',
    value: (row) => formatIndianNumber(Number(row.gatePassNo || 0), 0),
  },
  manualGatePassNumber: {
    label: 'Manual Gate Pass No',
    value: (row) =>
      row.manualGatePassNumber ? String(row.manualGatePassNumber) : '-',
  },
  date: {
    label: 'Date',
    value: (row) => row.date || '-',
  },
  accountNumber: {
    label: 'Account No.',
    align: 'right',
    value: (row) =>
      row.accountNumber === null || row.accountNumber === undefined
        ? '-'
        : formatIndianNumber(Number(row.accountNumber), 0),
  },
  farmerMobileNumber: {
    label: 'Mobile Number',
    value: (row) => row.farmerMobileNumber || '-',
  },
  variety: {
    label: 'Variety',
    value: (row) => row.variety || '-',
  },
  bagBelow25: {
    label: 'Below 25 (mm)',
    align: 'right',
    value: (row) => formatNumberOrEmpty(Number(row.bagBelow25 || 0), 0),
    total: (rows) =>
      formatNumberOrEmpty(
        sumBy(rows, (row) => row.bagBelow25),
        0
      ),
  },
  bag25to30: {
    label: '25-30 (mm)',
    align: 'right',
    value: (row) => formatNumberOrEmpty(Number(row.bag25to30 || 0), 0),
    total: (rows) =>
      formatNumberOrEmpty(
        sumBy(rows, (row) => row.bag25to30),
        0
      ),
  },
  bagBelow30: {
    label: 'Below 30 (mm)',
    align: 'right',
    value: (row) => formatNumberOrEmpty(Number(row.bagBelow30 || 0), 0),
    total: (rows) =>
      formatNumberOrEmpty(
        sumBy(rows, (row) => row.bagBelow30),
        0
      ),
  },
  bag30to35: {
    label: '30-35 (mm)',
    align: 'right',
    value: (row) => formatNumberOrEmpty(Number(row.bag30to35 || 0), 0),
    total: (rows) =>
      formatNumberOrEmpty(
        sumBy(rows, (row) => row.bag30to35),
        0
      ),
  },
  bag30to40: {
    label: '30-40 (mm)',
    align: 'right',
    value: (row) => formatNumberOrEmpty(Number(row.bag30to40 || 0), 0),
    total: (rows) =>
      formatNumberOrEmpty(
        sumBy(rows, (row) => row.bag30to40),
        0
      ),
  },
  bag35to40: {
    label: '35-40 (mm)',
    align: 'right',
    value: (row) => formatNumberOrEmpty(Number(row.bag35to40 || 0), 0),
    total: (rows) =>
      formatNumberOrEmpty(
        sumBy(rows, (row) => row.bag35to40),
        0
      ),
  },
  bag40to45: {
    label: '40-45 (mm)',
    align: 'right',
    value: (row) => formatNumberOrEmpty(Number(row.bag40to45 || 0), 0),
    total: (rows) =>
      formatNumberOrEmpty(
        sumBy(rows, (row) => row.bag40to45),
        0
      ),
  },
  bag45to50: {
    label: '45-50 (mm)',
    align: 'right',
    value: (row) => formatNumberOrEmpty(Number(row.bag45to50 || 0), 0),
    total: (rows) =>
      formatNumberOrEmpty(
        sumBy(rows, (row) => row.bag45to50),
        0
      ),
  },
  bag50to55: {
    label: '50-55 (mm)',
    align: 'right',
    value: (row) => formatNumberOrEmpty(Number(row.bag50to55 || 0), 0),
    total: (rows) =>
      formatNumberOrEmpty(
        sumBy(rows, (row) => row.bag50to55),
        0
      ),
  },
  bagAbove50: {
    label: 'Above 50 (mm)',
    align: 'right',
    value: (row) => formatNumberOrEmpty(Number(row.bagAbove50 || 0), 0),
    total: (rows) =>
      formatNumberOrEmpty(
        sumBy(rows, (row) => row.bagAbove50),
        0
      ),
  },
  bagAbove55: {
    label: 'Above 55 (mm)',
    align: 'right',
    value: (row) => formatNumberOrEmpty(Number(row.bagAbove55 || 0), 0),
    total: (rows) =>
      formatNumberOrEmpty(
        sumBy(rows, (row) => row.bagAbove55),
        0
      ),
  },
  bagCut: {
    label: 'Cut',
    align: 'right',
    value: (row) => formatNumberOrEmpty(Number(row.bagCut || 0), 0),
    total: (rows) =>
      formatNumberOrEmpty(
        sumBy(rows, (row) => row.bagCut),
        0
      ),
  },
  totalBags: {
    label: 'Total Bags',
    align: 'right',
    value: (row) => formatNumberOrEmpty(Number(row.totalBags || 0), 0),
    total: (rows) =>
      formatNumberOrEmpty(
        sumBy(rows, (row) => row.totalBags),
        0
      ),
  },
  remarks: {
    label: 'Remarks',
    weight: 1.5,
    value: (row) => row.remarks || '-',
  },
};

export function prepareIncomingReportPdf(options: {
  rows: IncomingReportRow[];
  visibleColumnIds: string[];
  grouping?: string[];
}): PreparedIncomingReportPdf {
  const { rows, visibleColumnIds, grouping = [] } = options;

  const columns = visibleColumnIds
    .map((id) => {
      const config = columnConfig[id];
      if (!config) return null;
      return {
        id,
        label: config.label,
        align: config.align ?? (numericColumnIds.has(id) ? 'right' : 'left'),
        weight:
          config.weight ??
          (BAG_COLUMN_IDS.includes(id as BagSizeColumnId) ? 0.85 : 1),
      } satisfies PreparedPdfColumn;
    })
    .filter((column): column is PreparedPdfColumn => Boolean(column));

  const resolvedColumnConfigs = columns.map((column) => ({
    column,
    config: columnConfig[column.id],
  }));

  const prepareRowsAndTotals = (sourceRows: IncomingReportRow[]) => {
    const preparedRows: PreparedPdfRow[] = sourceRows.map((row) => {
      const values: Record<string, string> = {};
      resolvedColumnConfigs.forEach(({ column, config }) => {
        values[column.id] = config?.value(row) ?? '-';
      });
      return {
        id: row.id,
        values,
      };
    });

    const totals: PreparedPdfTotals = {};
    resolvedColumnConfigs.forEach(({ column, config }) => {
      totals[column.id] = config?.total ? config.total(sourceRows) : '';
    });

    return {
      rows: preparedRows,
      totals,
    };
  };

  const preparedMain = prepareRowsAndTotals(rows);
  const sections = buildGroupedSections(
    rows,
    grouping,
    columns,
    prepareRowsAndTotals
  );
  const summary = buildSummary(rows, visibleColumnIds);

  return {
    columns,
    rows: preparedMain.rows,
    totals: preparedMain.totals,
    sections,
    summary,
    isGrouped: sections.length > 0,
  };
}

type SummaryAccumulator = {
  count: number;
  bags: number;
  bagSizeTotals: Record<BagSizeColumnId, number>;
};

function createBagTotals(): Record<BagSizeColumnId, number> {
  return {
    bagBelow25: 0,
    bag25to30: 0,
    bagBelow30: 0,
    bag30to35: 0,
    bag30to40: 0,
    bag35to40: 0,
    bag40to45: 0,
    bag45to50: 0,
    bag50to55: 0,
    bagAbove50: 0,
    bagAbove55: 0,
    bagCut: 0,
  };
}

function createBagTotalsDisplay(): Record<BagSizeColumnId, string> {
  return {
    bagBelow25: '',
    bag25to30: '',
    bagBelow30: '',
    bag30to35: '',
    bag30to40: '',
    bag35to40: '',
    bag40to45: '',
    bag45to50: '',
    bag50to55: '',
    bagAbove50: '',
    bagAbove55: '',
    bagCut: '',
  };
}

function createSummaryAccumulator(): SummaryAccumulator {
  return {
    count: 0,
    bags: 0,
    bagSizeTotals: createBagTotals(),
  };
}

function addRowToSummary(
  accumulator: SummaryAccumulator,
  row: IncomingReportRow
): void {
  accumulator.count += 1;
  accumulator.bags += Number(row.totalBags || 0);
  BAG_COLUMN_IDS.forEach((columnId) => {
    accumulator.bagSizeTotals[columnId] += Number(row[columnId] || 0);
  });
}

function normalizeSummaryKey(value: string | null | undefined): string {
  const normalized = String(value || '').trim();
  return normalized || '-';
}

const labelCollator = new Intl.Collator('en-IN', {
  sensitivity: 'base',
  ignorePunctuation: true,
});

function compareLabels(a: string, b: string): number {
  if (a === '-') return 1;
  if (b === '-') return -1;
  return labelCollator.compare(a, b);
}

function formatSummaryTotals(
  totals: SummaryAccumulator,
  bagColumns: BagSizeColumnId[]
): PreparedSummaryTotals {
  const formattedBagTotals = createBagTotalsDisplay();
  BAG_COLUMN_IDS.forEach((columnId) => {
    formattedBagTotals[columnId] = bagColumns.includes(columnId)
      ? formatNumberOrEmpty(totals.bagSizeTotals[columnId], 0)
      : '';
  });

  return {
    count: formatIndianNumber(totals.count, 0),
    bags: formatNumberOrEmpty(totals.bags, 0),
    bagSizeTotals: formattedBagTotals,
  };
}

function buildSummary(
  rows: IncomingReportRow[],
  visibleColumnIds: string[]
): PreparedIncomingReportSummary {
  const visibleBagColumns = BAG_COLUMNS.filter((column) =>
    visibleColumnIds.includes(column.id)
  );
  const visibleBagColumnIds = visibleBagColumns.map((column) => column.id);

  const overall = createSummaryAccumulator();
  const byVarietyMap = new Map<string, SummaryAccumulator>();
  const byFarmerMap = new Map<string, SummaryAccumulator>();

  rows.forEach((row) => {
    addRowToSummary(overall, row);

    const variety = normalizeSummaryKey(row.variety);
    const varietyTotals =
      byVarietyMap.get(variety) ?? createSummaryAccumulator();
    addRowToSummary(varietyTotals, row);
    byVarietyMap.set(variety, varietyTotals);

    // Storage report does not include farmer name column, so aggregate by storage/farm.
    const farmerName = 'Bhatti Agritech';
    const farmerTotals =
      byFarmerMap.get(farmerName) ?? createSummaryAccumulator();
    addRowToSummary(farmerTotals, row);
    byFarmerMap.set(farmerName, farmerTotals);
  });

  const byVariety = Array.from(byVarietyMap.entries())
    .sort(([left], [right]) => compareLabels(left, right))
    .map(([variety, totals]) => ({
      variety,
      ...formatSummaryTotals(totals, visibleBagColumnIds),
    }));

  const byFarmer = Array.from(byFarmerMap.entries())
    .sort(([left], [right]) => compareLabels(left, right))
    .map(([farmerName, totals]) => ({
      farmerName,
      ...formatSummaryTotals(totals, visibleBagColumnIds),
    }));

  const overallFormatted = formatSummaryTotals(overall, visibleBagColumnIds);

  const bagSizeTotals: PreparedBagSizeSummaryRow[] = visibleBagColumnIds.map(
    (columnId) => ({
      label: BAG_COLUMN_LABELS[columnId],
      totalBags: overallFormatted.bagSizeTotals[columnId],
    })
  );

  return {
    bagColumns: visibleBagColumns,
    byVariety,
    byFarmer,
    bagSizeTotals,
    overall: overallFormatted,
  };
}

function buildGroupedSections(
  rows: IncomingReportRow[],
  grouping: string[],
  columns: PreparedPdfColumn[],
  prepareRowsAndTotals: (rows: IncomingReportRow[]) => {
    rows: PreparedPdfRow[];
    totals: PreparedPdfTotals;
  }
): PreparedIncomingReportSection[] {
  if (!grouping.length || !rows.length) return [];

  const sections: PreparedIncomingReportSection[] = [];

  const walk = (
    currentRows: IncomingReportRow[],
    level: number,
    labels: string[]
  ) => {
    const groupId = grouping[level];
    if (!groupId) return;

    const groupedRows = new Map<string, IncomingReportRow[]>();
    currentRows.forEach((row) => {
      const groupLabel = getGroupLabel(row, groupId, columns);
      const list = groupedRows.get(groupLabel) ?? [];
      list.push(row);
      groupedRows.set(groupLabel, list);
    });

    groupedRows.forEach((childRows, groupLabel) => {
      const nextLabels = [
        ...labels,
        `${getColumnLabel(groupId, columns)}: ${groupLabel}`,
      ];
      const isLeaf = level === grouping.length - 1;
      if (isLeaf) {
        const prepared = prepareRowsAndTotals(childRows);
        sections.push({
          id: `${groupId}-${nextLabels.join('|')}`,
          title: nextLabels.join(' | '),
          rows: prepared.rows,
          totals: prepared.totals,
        });
      } else {
        walk(childRows, level + 1, nextLabels);
      }
    });
  };

  walk(rows, 0, []);
  return sections;
}

function getColumnLabel(
  columnId: string,
  columns: PreparedPdfColumn[]
): string {
  return columns.find((column) => column.id === columnId)?.label ?? columnId;
}

function getGroupLabel(
  row: IncomingReportRow,
  groupId: string,
  columns: PreparedPdfColumn[]
): string {
  const config = columnConfig[groupId];
  if (config) {
    const value = config.value(row);
    return value || '-';
  }

  const fallback = (row as unknown as Record<string, unknown>)[groupId];
  if (typeof fallback === 'number') return formatIndianNumber(fallback, 0);
  if (typeof fallback === 'string' && fallback.trim()) return fallback;
  return getColumnLabel(groupId, columns);
}

function sumBy(
  rows: IncomingReportRow[],
  selector: (row: IncomingReportRow) => number
) {
  return rows.reduce((sum, row) => sum + Number(selector(row) || 0), 0);
}

const formatterCache: Intl.NumberFormat[] = [];

function getFormatter(precision: number): Intl.NumberFormat {
  const cached = formatterCache[precision];
  if (cached) return cached;

  const formatter = new Intl.NumberFormat('en-IN', {
    minimumFractionDigits: precision,
    maximumFractionDigits: precision,
  });
  formatterCache[precision] = formatter;
  return formatter;
}

function formatIndianNumber(value: number, precision = 0): string {
  const safePrecision = Math.max(0, Number(precision || 0));
  return getFormatter(safePrecision).format(Number(value || 0));
}

function formatNumberOrEmpty(value: number, precision = 0): string {
  return Number(value || 0) === 0 ? '' : formatIndianNumber(value, precision);
}
