import { Text, View, StyleSheet } from '@react-pdf/renderer';
import {
  type PreparedSeedAmountPayableData,
  prepareSeedAmountPayableTableData,
} from '@/components/pdf/seedAmountPayableTablePrepare';
import type { FarmerSeedEntryByStorageLink } from '@/types/farmer-seed';

const BORDER = '#e5e7eb';
const HEADER_BG = '#f9fafb';
const HEADER_ROW1_MIN = 20;

/**
 * Leaf columns in table order (left → right). Widths sum to 100%.
 */
export const SEED_AMOUNT_PAYABLE_LEAF_COLUMNS = [
  { id: 'date', label: 'Date of Seed Dispatch', widthPct: 16 },
  { id: 'seedAmountPayable', label: 'Seed Size Given', widthPct: 20 },
  { id: 'bagsForPlantation', label: 'Total Bags Given', widthPct: 16 },
  { id: 'bagsPerAcre', label: 'Bags Given Per Acre', widthPct: 16 },
  { id: 'rate', label: 'Seed Rate Per Bag', widthPct: 16 },
  { id: 'amount', label: 'Total Seed Amount', widthPct: 16 },
] as const;

export type SeedAmountPayableColumnId =
  (typeof SEED_AMOUNT_PAYABLE_LEAF_COLUMNS)[number]['id'];

/** @deprecated Use `SEED_AMOUNT_PAYABLE_LEAF_COLUMNS` (includes net-payable sub-columns). */
export const SEED_AMOUNT_PAYABLE_COLUMNS = SEED_AMOUNT_PAYABLE_LEAF_COLUMNS;

function parseNumericCellValue(value: string): number | null {
  const normalized = value.replace(/,/g, '').trim();
  if (!normalized || normalized === '—') return null;
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

function formatTotalNumber(value: number): string {
  if (Number.isInteger(value)) {
    return value.toLocaleString('en-IN');
  }
  return value.toLocaleString('en-IN', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
}

/** Columns where summing detail/clubbed rows is misleading for the footer row. */
const SEED_TOTAL_ROW_DASH_COLUMNS = new Set<SeedAmountPayableColumnId>([
  'rate',
  'bagsPerAcre',
  'date',
]);

function buildSeedAmountPayableTotalRowCells(
  rowsForTotal: string[][],
  columnMetas: readonly { id: SeedAmountPayableColumnId; widthPct: number }[]
): string[] {
  return columnMetas.map((col, colIdx) => {
    if (col.id === 'seedAmountPayable') return 'Total';

    if (SEED_TOTAL_ROW_DASH_COLUMNS.has(col.id)) return '—';

    let sum = 0;
    let foundNumeric = false;
    for (const row of rowsForTotal) {
      const numeric = parseNumericCellValue(String(row[colIdx] ?? ''));
      if (numeric != null) {
        sum += numeric;
        foundNumeric = true;
      }
    }
    return foundNumeric ? formatTotalNumber(sum) : '—';
  });
}

const styles = StyleSheet.create({
  wrap: {
    marginTop: 10,
  },
  varietyHeading: {
    fontSize: 8,
    fontWeight: 700,
    color: '#111827',
    marginBottom: 4,
    backgroundColor: '#e5e7eb',
    paddingVertical: 2,
    paddingHorizontal: 4,
  },
  title: {
    fontSize: 9,
    fontWeight: 700,
    color: '#333',
    marginBottom: 4,
  },
  table: {
    borderWidth: 1,
    borderColor: BORDER,
    width: '100%',
  },
  headerRow: {
    flexDirection: 'row',
    backgroundColor: HEADER_BG,
    borderBottomWidth: 1,
    borderColor: BORDER,
  },
  headerPlain: {
    fontSize: 5,
    fontWeight: 700,
    color: '#333',
    textAlign: 'center',
  },
  headerSingleTop: {
    minHeight: HEADER_ROW1_MIN,
    borderBottomWidth: 1,
    borderColor: BORDER,
    paddingVertical: 3,
    paddingHorizontal: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dataRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderColor: BORDER,
  },
  dataRowLast: {
    borderBottomWidth: 0,
  },
  cell: {
    paddingVertical: 3,
    paddingHorizontal: 3,
    fontSize: 6,
    color: '#374151',
    borderRightWidth: 1,
    borderColor: BORDER,
    textAlign: 'center',
    minHeight: 16,
  },
  cellLast: {
    borderRightWidth: 0,
  },
});

function HeaderSingleStack({
  widthPct,
  label,
  isLast,
  headerSingleTopStyle,
  headerPlainStyle,
}: {
  widthPct: number;
  label: string;
  isLast: boolean;
  headerSingleTopStyle?: Record<string, string | number>;
  headerPlainStyle?: Record<string, string | number>;
}) {
  return (
    <View
      style={{
        width: `${widthPct}%`,
        borderRightWidth: isLast ? 0 : 1,
        borderColor: BORDER,
      }}
    >
      <View style={headerSingleTopStyle ?? styles.headerSingleTop}>
        <Text style={headerPlainStyle ?? styles.headerPlain} wrap>
          {label}
        </Text>
      </View>
    </View>
  );
}

export type SeedAmountPayableTablePdfProps = {
  prepared?: PreparedSeedAmountPayableData;
  variety?: string | null;
  farmerSeedEntries?: FarmerSeedEntryByStorageLink[] | null;
  summaryAmountPayableTotal?: number;
  largePrintMode?: boolean;
};

/**
 * Seed amount payable breakdown for the accounting stock ledger PDF.
 * One row per bag line per seed entry; a total row follows when there are multiple lines.
 */
export default function SeedAmountPayableTablePdf({
  prepared,
  variety = null,
  farmerSeedEntries = null,
  summaryAmountPayableTotal: summaryAmountPayableTotalProp,
  largePrintMode = false,
}: SeedAmountPayableTablePdfProps) {
  const data =
    prepared ??
    prepareSeedAmountPayableTableData({
      variety,
      farmerSeedEntries,
      summaryAmountPayableTotal: summaryAmountPayableTotalProp,
      columnIds: SEED_AMOUNT_PAYABLE_LEAF_COLUMNS.map((c) => c.id),
    });

  const { detailRowCells } = data;
  const rowsForTotal = detailRowCells;

  const shouldShowTotalRow = rowsForTotal.length > 1;
  const totalRowCells = shouldShowTotalRow
    ? buildSeedAmountPayableTotalRowCells(
        rowsForTotal,
        SEED_AMOUNT_PAYABLE_LEAF_COLUMNS
      )
    : null;
  const varietyHeadingStyle = {
    ...styles.varietyHeading,
    ...(largePrintMode
      ? { fontSize: 11, marginBottom: 7, paddingVertical: 4 }
      : {}),
  };
  const titleStyle = {
    ...styles.title,
    ...(largePrintMode ? { fontSize: 12, marginBottom: 7 } : {}),
  };
  const headerSingleTopStyle = {
    ...styles.headerSingleTop,
    ...(largePrintMode
      ? { minHeight: 30, paddingVertical: 5, paddingHorizontal: 3 }
      : {}),
  };
  const headerPlainStyle = {
    ...styles.headerPlain,
    ...(largePrintMode ? { fontSize: 7 } : {}),
  };
  const cellStyle = {
    ...styles.cell,
    ...(largePrintMode
      ? { fontSize: 8.5, paddingVertical: 5, minHeight: 22 }
      : {}),
  };

  return (
    <View style={styles.wrap}>
      <Text style={varietyHeadingStyle}>Variety: {data.varietyLabel}</Text>
      <Text style={titleStyle}>Seed Amount Payable</Text>
      <View style={styles.table}>
        <View style={styles.headerRow} wrap={false}>
          {SEED_AMOUNT_PAYABLE_LEAF_COLUMNS.map((col, i) => (
            <HeaderSingleStack
              key={col.id}
              widthPct={col.widthPct}
              label={col.label}
              isLast={i === SEED_AMOUNT_PAYABLE_LEAF_COLUMNS.length - 1}
              headerSingleTopStyle={headerSingleTopStyle}
              headerPlainStyle={headerPlainStyle}
            />
          ))}
        </View>
        {detailRowCells.map((rowCells, rowIndex) => (
          <View
            key={`seed-detail-${rowIndex}`}
            style={[
              styles.dataRow,
              rowIndex === detailRowCells.length - 1 && !shouldShowTotalRow
                ? styles.dataRowLast
                : {},
            ]}
            wrap={false}
          >
            {SEED_AMOUNT_PAYABLE_LEAF_COLUMNS.map((col, i) => (
              <View
                key={col.id}
                style={[
                  cellStyle,
                  i === SEED_AMOUNT_PAYABLE_LEAF_COLUMNS.length - 1
                    ? styles.cellLast
                    : {},
                  { width: `${col.widthPct}%` },
                ]}
              >
                <Text>{rowCells[i] ?? '—'}</Text>
              </View>
            ))}
          </View>
        ))}
        {shouldShowTotalRow && totalRowCells ? (
          <View
            style={[
              styles.dataRow,
              styles.dataRowLast,
              { borderTopWidth: 1, borderColor: BORDER },
            ]}
            wrap={false}
          >
            {SEED_AMOUNT_PAYABLE_LEAF_COLUMNS.map((col, i) => (
              <View
                key={`seed-total-${col.id}`}
                style={[
                  cellStyle,
                  i === SEED_AMOUNT_PAYABLE_LEAF_COLUMNS.length - 1
                    ? styles.cellLast
                    : {},
                  { width: `${col.widthPct}%`, fontWeight: 700 },
                ]}
              >
                <Text style={{ fontWeight: 700 }}>{totalRowCells[i]}</Text>
              </View>
            ))}
          </View>
        ) : null}
      </View>
    </View>
  );
}
