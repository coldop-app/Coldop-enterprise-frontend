import type { FarmerSeedReportRow } from '../columns';

type HorizontalAlign = 'left' | 'right' | 'center';

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

export type PreparedFarmerSeedReportSection = {
  id: string;
  title: string;
  rows: PreparedPdfRow[];
  totals: PreparedPdfTotals;
};

type PreparedSummaryTotals = {
  count: string;
  bags: string;
  acres: string;
  amount: string;
};

export type PreparedFarmerSeedReportSummary = {
  byVariety: Array<PreparedSummaryTotals & { variety: string }>;
  byFarmer: Array<PreparedSummaryTotals & { farmerName: string }>;
  overall: PreparedSummaryTotals;
};

export type PreparedFarmerSeedReportPdf = {
  columns: PreparedPdfColumn[];
  rows: PreparedPdfRow[];
  totals: PreparedPdfTotals;
  sections: PreparedFarmerSeedReportSection[];
  summary: PreparedFarmerSeedReportSummary;
  isGrouped: boolean;
};

type ColumnConfig = {
  label: string;
  align?: HorizontalAlign;
  weight?: number;
  value: (row: FarmerSeedReportRow) => string;
  total?: (rows: FarmerSeedReportRow[]) => string;
};

const numericColumnIds = new Set([
  'gatePassNo',
  'accountNumber',
  'totalBags',
  'totalAcres',
  'averageRate',
  'totalAmount',
]);

const columnConfig: Record<string, ColumnConfig> = {
  farmerName: { label: 'Farmer', weight: 1.6, value: (row) => row.farmerName },
  farmerAddress: {
    label: 'Address',
    weight: 1.8,
    value: (row) => row.farmerAddress,
  },
  accountNumber: {
    label: 'Account #',
    align: 'right',
    value: (row) =>
      row.accountNumber !== null
        ? formatIndianNumber(row.accountNumber, 0)
        : '-',
  },
  gatePassNo: {
    label: 'Gate Pass No',
    align: 'right',
    value: (row) => formatIndianNumber(row.gatePassNo, 0),
  },
  invoiceNumber: { label: 'Invoice Number', value: (row) => row.invoiceNumber },
  date: { label: 'Date', value: (row) => row.date },
  variety: { label: 'Variety', value: (row) => row.variety },
  generation: { label: 'Generation', value: (row) => row.generation },
  bag35to40: {
    label: '35-40 (mm)',
    align: 'right',
    value: (row) =>
      formatBagSizePdfValue(
        row.bag35to40,
        row.bag35to40Rate,
        row.bag35to40Acres
      ),
    total: (rows) =>
      formatIndianNumber(
        sumBy(rows, (r) => r.bag35to40),
        0
      ),
  },
  bag40to45: {
    label: '40-45 (mm)',
    align: 'right',
    value: (row) =>
      formatBagSizePdfValue(
        row.bag40to45,
        row.bag40to45Rate,
        row.bag40to45Acres
      ),
    total: (rows) =>
      formatIndianNumber(
        sumBy(rows, (r) => r.bag40to45),
        0
      ),
  },
  bag40to50: {
    label: '40-50 (mm)',
    align: 'right',
    value: (row) =>
      formatBagSizePdfValue(
        row.bag40to50,
        row.bag40to50Rate,
        row.bag40to50Acres
      ),
    total: (rows) =>
      formatIndianNumber(
        sumBy(rows, (r) => r.bag40to50),
        0
      ),
  },
  bag45to50: {
    label: '45-50 (mm)',
    align: 'right',
    value: (row) =>
      formatBagSizePdfValue(
        row.bag45to50,
        row.bag45to50Rate,
        row.bag45to50Acres
      ),
    total: (rows) =>
      formatIndianNumber(
        sumBy(rows, (r) => r.bag45to50),
        0
      ),
  },
  bag50to55: {
    label: '50-55 (mm)',
    align: 'right',
    value: (row) =>
      formatBagSizePdfValue(
        row.bag50to55,
        row.bag50to55Rate,
        row.bag50to55Acres
      ),
    total: (rows) =>
      formatIndianNumber(
        sumBy(rows, (r) => r.bag50to55),
        0
      ),
  },
  totalBags: {
    label: 'Bags',
    align: 'right',
    value: (row) => formatIndianNumber(row.totalBags, 0),
    total: (rows) =>
      formatIndianNumber(
        sumBy(rows, (r) => r.totalBags),
        0
      ),
  },
  totalAcres: {
    label: 'Acres',
    align: 'right',
    value: (row) => formatIndianNumber(row.totalAcres, 2),
    total: (rows) =>
      formatIndianNumber(
        sumBy(rows, (r) => r.totalAcres),
        2
      ),
  },
  averageRate: {
    label: 'Avg Rate',
    align: 'right',
    value: (row) => formatIndianNumber(row.averageRate, 2),
  },
  totalAmount: {
    label: 'Amount',
    align: 'right',
    value: (row) => formatIndianNumber(row.totalAmount, 2),
    total: (rows) =>
      formatIndianNumber(
        sumBy(rows, (r) => r.totalAmount),
        2
      ),
  },
  remarks: { label: 'Remarks', weight: 1.8, value: (row) => row.remarks },
};

export function prepareFarmerSeedReportPdf(options: {
  rows: FarmerSeedReportRow[];
  visibleColumnIds: string[];
  grouping?: string[];
}): PreparedFarmerSeedReportPdf {
  const { rows, visibleColumnIds, grouping = [] } = options;

  const columns = visibleColumnIds
    .map((id) => {
      const config = columnConfig[id];
      if (!config) return null;
      return {
        id,
        label: config.label,
        align: config.align ?? (numericColumnIds.has(id) ? 'right' : 'left'),
        weight: config.weight ?? 1,
      } satisfies PreparedPdfColumn;
    })
    .filter((column): column is PreparedPdfColumn => Boolean(column));

  const resolvedColumnConfigs = columns.map((column) => ({
    column,
    config: columnConfig[column.id],
  }));

  const prepareRowsAndTotals = (sourceRows: FarmerSeedReportRow[]) => {
    const preparedRows: PreparedPdfRow[] = sourceRows.map((row) => {
      const values: Record<string, string> = {};
      for (const { column, config } of resolvedColumnConfigs) {
        const value = config?.value(row) ?? '-';
        values[column.id] = value || '-';
      }
      return { id: row.id, values };
    });

    const totals: PreparedPdfTotals = {};
    for (const { column, config } of resolvedColumnConfigs) {
      totals[column.id] = config?.total ? config.total(sourceRows) : '';
    }

    return { rows: preparedRows, totals };
  };

  const preparedMain = prepareRowsAndTotals(rows);
  const sections = buildGroupedSections(
    rows,
    grouping,
    columns,
    prepareRowsAndTotals
  );
  const summary = buildSummary(rows);

  return {
    columns,
    rows: preparedMain.rows,
    totals: preparedMain.totals,
    sections,
    summary,
    isGrouped: sections.length > 0,
  };
}

function buildGroupedSections(
  rows: FarmerSeedReportRow[],
  grouping: string[],
  columns: PreparedPdfColumn[],
  prepareRowsAndTotals: (rows: FarmerSeedReportRow[]) => {
    rows: PreparedPdfRow[];
    totals: PreparedPdfTotals;
  }
): PreparedFarmerSeedReportSection[] {
  if (!grouping.length || !rows.length) return [];

  const sections: PreparedFarmerSeedReportSection[] = [];

  const walk = (
    currentRows: FarmerSeedReportRow[],
    level: number,
    labels: string[]
  ) => {
    const groupId = grouping[level];
    if (!groupId) return;

    const groupedRows = new Map<string, FarmerSeedReportRow[]>();
    for (const row of currentRows) {
      const groupLabel = getGroupLabel(row, groupId, columns);
      const list = groupedRows.get(groupLabel) ?? [];
      list.push(row);
      groupedRows.set(groupLabel, list);
    }

    for (const [groupLabel, childRows] of groupedRows) {
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
    }
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
  row: FarmerSeedReportRow,
  groupId: string,
  columns: PreparedPdfColumn[]
): string {
  const config = columnConfig[groupId];
  if (config) return config.value(row) || '-';
  const fallback = (row as unknown as Record<string, unknown>)[groupId];
  if (typeof fallback === 'number') return formatIndianNumber(fallback);
  if (typeof fallback === 'string' && fallback.trim()) return fallback;
  return getColumnLabel(groupId, columns);
}

type SummaryAccumulator = {
  count: number;
  bags: number;
  acres: number;
  amount: number;
};

function createSummaryAccumulator(): SummaryAccumulator {
  return { count: 0, bags: 0, acres: 0, amount: 0 };
}

function addRowToSummary(acc: SummaryAccumulator, row: FarmerSeedReportRow) {
  acc.count += 1;
  acc.bags += Number(row.totalBags || 0);
  acc.acres += Number(row.totalAcres || 0);
  acc.amount += Number(row.totalAmount || 0);
}

function formatSummaryTotals(
  totals: SummaryAccumulator
): PreparedSummaryTotals {
  return {
    count: formatIndianNumber(totals.count, 0),
    bags: formatIndianNumber(totals.bags, 0),
    acres: formatIndianNumber(totals.acres, 2),
    amount: formatIndianNumber(totals.amount, 2),
  };
}

function buildSummary(
  rows: FarmerSeedReportRow[]
): PreparedFarmerSeedReportSummary {
  const overall = createSummaryAccumulator();
  const byVarietyMap = new Map<string, SummaryAccumulator>();
  const byFarmerMap = new Map<string, SummaryAccumulator>();

  for (const row of rows) {
    addRowToSummary(overall, row);
    const variety = row.variety?.trim() || '-';
    const farmerName = row.farmerName?.trim() || '-';

    const varietyTotals =
      byVarietyMap.get(variety) ?? createSummaryAccumulator();
    addRowToSummary(varietyTotals, row);
    byVarietyMap.set(variety, varietyTotals);

    const farmerTotals =
      byFarmerMap.get(farmerName) ?? createSummaryAccumulator();
    addRowToSummary(farmerTotals, row);
    byFarmerMap.set(farmerName, farmerTotals);
  }

  const byVariety = Array.from(byVarietyMap.entries()).map(
    ([variety, totals]) => ({
      variety,
      ...formatSummaryTotals(totals),
    })
  );
  const byFarmer = Array.from(byFarmerMap.entries()).map(
    ([farmerName, totals]) => ({
      farmerName,
      ...formatSummaryTotals(totals),
    })
  );

  return {
    byVariety,
    byFarmer,
    overall: formatSummaryTotals(overall),
  };
}

function sumBy(
  rows: FarmerSeedReportRow[],
  selector: (row: FarmerSeedReportRow) => number
): number {
  return rows.reduce((sum, row) => sum + Number(selector(row) || 0), 0);
}

function formatIndianNumber(value: number, precision = 0): string {
  const safePrecision = Math.max(0, Number(precision || 0));
  return Number(value || 0).toLocaleString('en-IN', {
    minimumFractionDigits: safePrecision,
    maximumFractionDigits: safePrecision,
  });
}

function formatBagSizePdfValue(
  quantity: number,
  rate: number,
  acres: number
): string {
  if (Number(quantity || 0) === 0) return '-';
  return [
    formatIndianNumber(quantity, 0),
    `Rate - ${formatIndianNumber(rate, 2)}`,
    `Acres - ${formatIndianNumber(acres, 2)}`,
  ].join('\n');
}
