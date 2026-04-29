import type { IncomingReportRow } from '../columns';

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

export type PreparedIncomingReportPdf = {
  columns: PreparedPdfColumn[];
  rows: PreparedPdfRow[];
  totals: PreparedPdfTotals;
  sections: PreparedIncomingReportSection[];
  isGrouped: boolean;
};

export type PreparedIncomingReportSection = {
  id: string;
  title: string;
  rows: PreparedPdfRow[];
  totals: PreparedPdfTotals;
};

type ColumnConfig = {
  label: string;
  align?: HorizontalAlign;
  weight?: number;
  value: (row: IncomingReportRow) => string;
  total?: (rows: IncomingReportRow[]) => string;
};

const numericColumnIds = new Set([
  'bagsReceived',
  'grossWeightKg',
  'tareWeightKg',
  'netWeightKg',
]);

const columnConfig: Record<string, ColumnConfig> = {
  farmerName: {
    label: 'Farmer',
    weight: 1.8,
    value: (row) => row.farmerName,
  },
  farmerAddress: {
    label: 'Address',
    weight: 1.8,
    value: (row) => row.farmerAddress,
  },
  farmerMobileNumber: {
    label: 'Mobile Number',
    value: (row) => row.farmerMobileNumber,
  },
  createdByName: {
    label: 'Created By',
    value: (row) => row.createdByName,
  },
  location: {
    label: 'Location',
    value: (row) => row.location,
  },
  gatePassNo: {
    label: 'System Gate Pass No',
    value: (row) => String(row.gatePassNo),
  },
  manualGatePassNumber: {
    label: 'Manual Gate Pass No',
    value: (row) => String(row.manualGatePassNumber),
  },
  date: {
    label: 'Date',
    value: (row) => row.date,
  },
  variety: {
    label: 'Variety',
    value: (row) => row.variety,
  },
  truckNumber: {
    label: 'Truck No.',
    value: (row) => row.truckNumber,
  },
  bagsReceived: {
    label: 'Bags',
    align: 'right',
    value: (row) => formatIndianNumber(row.bagsReceived, 0),
    total: (rows) =>
      formatIndianNumber(
        sumBy(rows, (row) => row.bagsReceived),
        0
      ),
  },
  grossWeightKg: {
    label: 'Gross (kg)',
    align: 'right',
    value: (row) =>
      formatIndianNumber(
        row.grossWeightKg,
        getDecimalPlaces(row.grossWeightKg)
      ),
    total: (rows) => {
      const precision = maxBy(rows, (row) =>
        getDecimalPlaces(row.grossWeightKg)
      );
      return formatIndianNumber(
        sumBy(rows, (row) => row.grossWeightKg),
        precision
      );
    },
  },
  tareWeightKg: {
    label: 'Tare (kg)',
    align: 'right',
    value: (row) =>
      formatIndianNumber(row.tareWeightKg, getDecimalPlaces(row.tareWeightKg)),
    total: (rows) => {
      const precision = maxBy(rows, (row) =>
        getDecimalPlaces(row.tareWeightKg)
      );
      return formatIndianNumber(
        sumBy(rows, (row) => row.tareWeightKg),
        precision
      );
    },
  },
  netWeightKg: {
    label: 'Net (kg)',
    align: 'right',
    value: (row) => formatIndianNumber(row.netWeightKg, row.netWeightPrecision),
    total: (rows) => {
      const precision = maxBy(rows, (row) => row.netWeightPrecision);
      return formatIndianNumber(
        sumBy(rows, (row) => row.netWeightKg),
        precision
      );
    },
  },
  status: {
    label: 'Status',
    align: 'center',
    value: (row) => row.status.replace('_', ' '),
  },
  remarks: {
    label: 'Remarks',
    weight: 1.8,
    value: (row) => row.remarks,
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
        weight: config.weight ?? 1,
      } satisfies PreparedPdfColumn;
    })
    .filter((column): column is PreparedPdfColumn => Boolean(column));

  const buildPreparedRows = (sourceRows: IncomingReportRow[]) =>
    sourceRows.map((row) => {
      const values: Record<string, string> = {};
      for (const column of columns) {
        const value = columnConfig[column.id]?.value(row) ?? '-';
        values[column.id] = value || '-';
      }
      return {
        id: row.id,
        values,
      };
    });

  const buildTotals = (sourceRows: IncomingReportRow[]) => {
    const nextTotals: PreparedPdfTotals = {};
    for (const column of columns) {
      const totalFn = columnConfig[column.id]?.total;
      nextTotals[column.id] = totalFn ? totalFn(sourceRows) : '';
    }
    return nextTotals;
  };

  const preparedRows = buildPreparedRows(rows);
  const totals = buildTotals(rows);
  const sections = buildGroupedSections(
    rows,
    grouping,
    columns,
    buildPreparedRows,
    buildTotals
  );

  return {
    columns,
    rows: preparedRows,
    totals,
    sections,
    isGrouped: sections.length > 0,
  };
}

function buildGroupedSections(
  rows: IncomingReportRow[],
  grouping: string[],
  columns: PreparedPdfColumn[],
  buildPreparedRows: (rows: IncomingReportRow[]) => PreparedPdfRow[],
  buildTotals: (rows: IncomingReportRow[]) => PreparedPdfTotals
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
        sections.push({
          id: `${groupId}-${nextLabels.join('|')}`,
          title: nextLabels.join(' | '),
          rows: buildPreparedRows(childRows),
          totals: buildTotals(childRows),
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
  row: IncomingReportRow,
  groupId: string,
  columns: PreparedPdfColumn[]
): string {
  const config = columnConfig[groupId];
  if (config) {
    const value = config.value(row);
    return value || '-';
  }

  const rowAsRecord = row as unknown as Record<string, unknown>;
  const fallback = rowAsRecord[groupId];
  if (typeof fallback === 'number') return formatIndianNumber(fallback);
  if (typeof fallback === 'string' && fallback.trim()) return fallback;
  return getColumnLabel(groupId, columns);
}

function sumBy(
  rows: IncomingReportRow[],
  selector: (row: IncomingReportRow) => number
) {
  return rows.reduce((sum, row) => sum + Number(selector(row) || 0), 0);
}

function maxBy(
  rows: IncomingReportRow[],
  selector: (row: IncomingReportRow) => number
) {
  return rows.reduce(
    (max, row) => Math.max(max, Number(selector(row) || 0)),
    0
  );
}

function getDecimalPlaces(value: number): number {
  if (!Number.isFinite(value)) return 0;
  const asString = value.toString().toLowerCase();
  if (!asString.includes('e')) {
    return asString.includes('.') ? (asString.split('.')[1]?.length ?? 0) : 0;
  }

  const [base, exponentPart] = asString.split('e');
  const exponent = Number(exponentPart);
  const baseDecimals = base.includes('.')
    ? (base.split('.')[1]?.length ?? 0)
    : 0;

  if (!Number.isFinite(exponent)) return baseDecimals;
  if (exponent >= 0) return Math.max(0, baseDecimals - exponent);
  return baseDecimals + Math.abs(exponent);
}

function formatIndianNumber(value: number, precision = 0): string {
  return Number(value || 0).toLocaleString('en-IN', {
    minimumFractionDigits: precision,
    maximumFractionDigits: precision,
  });
}
