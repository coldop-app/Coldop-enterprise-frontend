import { Text, View, StyleSheet } from '@react-pdf/renderer';
import {
  type PreparedSeedAmountPayableData,
  prepareSeedAmountPayableTableData,
} from '@/components/pdf/seedAmountPayableTablePrepare';
import type { FarmerSeedEntryByStorageLink } from '@/types/farmer-seed';

const BORDER = '#e5e7eb';
const HEADER_BG = '#f9fafb';
const HEADER_ROW1_MIN = 20;
const HEADER_ROW2_MIN = 18;

/** Sub-columns under the merged “Net Amount Payable” header (image: AMT PAYABLE | SEED BALANCE | NET AMT). */
export const NET_AMOUNT_PAYABLE_SUB_COLUMNS = [
  { id: 'amtPayable', label: 'AMT PAYABLE' },
  { id: 'seedBalance', label: 'SEED BALANCE' },
  { id: 'netAmt', label: 'NET AMT' },
] as const;

/** Number of leaf columns under the merged NET AMOUNT PAYABLE header (last columns in the table). */
export const NET_AMOUNT_PAYABLE_LEAF_COUNT =
  NET_AMOUNT_PAYABLE_SUB_COLUMNS.length;

/**
 * Leaf columns in table order (left → right). Widths sum to 100%.
 * The last `NET_AMOUNT_PAYABLE_LEAF_COUNT` columns are the Net Amount Payable group.
 */
/** Widths sum to 100% (7×8% + 2×7% + 3×10%). */
export const SEED_AMOUNT_PAYABLE_LEAF_COLUMNS = [
  { id: 'seedAmountPayable', label: 'Seed Amount Payable', widthPct: 8 },
  { id: 'bagsForPlantation', label: 'Bags For Plantation', widthPct: 8 },
  { id: 'bagsPerAcre', label: 'Bags Per Acre', widthPct: 8 },
  { id: 'areaPlanted', label: 'Area Planted', widthPct: 8 },
  { id: 'rate', label: 'Rate', widthPct: 8 },
  { id: 'amount', label: 'Amount', widthPct: 8 },
  { id: 'date', label: 'Date', widthPct: 8 },
  { id: 'amountReceived', label: 'Amount Received', widthPct: 7 },
  { id: 'seedAmountBalance', label: 'Seed Amount Balance', widthPct: 7 },
  { id: 'amtPayable', label: 'AMT PAYABLE', widthPct: 10 },
  { id: 'seedBalance', label: 'SEED BALANCE', widthPct: 10 },
  { id: 'netAmt', label: 'NET AMT', widthPct: 10 },
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
  headerUpper: {
    fontSize: 5,
    fontWeight: 700,
    color: '#111827',
    textTransform: 'uppercase',
    letterSpacing: 0.15,
    textAlign: 'center',
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
  headerSingleBottom: {
    minHeight: HEADER_ROW2_MIN,
    backgroundColor: HEADER_BG,
  },
  netGroupOuter: {
    borderRightWidth: 1,
    borderColor: BORDER,
  },
  netGroupTop: {
    minHeight: HEADER_ROW1_MIN,
    borderBottomWidth: 1,
    borderColor: BORDER,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 3,
    paddingHorizontal: 3,
  },
  netGroupBottomRow: {
    flexDirection: 'row',
    minHeight: HEADER_ROW2_MIN,
  },
  netSubCell: {
    flex: 1,
    borderRightWidth: 1,
    borderColor: BORDER,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 3,
    paddingHorizontal: 2,
  },
  netSubCellLast: {
    borderRightWidth: 0,
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
  borderRight,
}: {
  widthPct: number;
  label: string;
  borderRight: boolean;
}) {
  return (
    <View
      style={{
        width: `${widthPct}%`,
        borderRightWidth: borderRight ? 1 : 0,
        borderColor: BORDER,
      }}
    >
      <View style={styles.headerSingleTop}>
        <Text style={styles.headerPlain} wrap>
          {label}
        </Text>
      </View>
      <View style={styles.headerSingleBottom} />
    </View>
  );
}

function HeaderNetAmountPayableGroup({ widthPct }: { widthPct: number }) {
  return (
    <View
      style={[
        styles.netGroupOuter,
        {
          width: `${widthPct}%`,
        },
      ]}
    >
      <View style={styles.netGroupTop}>
        <Text style={styles.headerUpper}>NET AMOUNT PAYABLE</Text>
      </View>
      <View style={styles.netGroupBottomRow}>
        {NET_AMOUNT_PAYABLE_SUB_COLUMNS.map((sub, i) => (
          <View
            key={sub.id}
            style={[
              styles.netSubCell,
              i === NET_AMOUNT_PAYABLE_SUB_COLUMNS.length - 1
                ? styles.netSubCellLast
                : {},
            ]}
          >
            <Text style={styles.headerUpper} wrap>
              {sub.label}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}

export type SeedAmountPayableTablePdfProps = {
  prepared?: PreparedSeedAmountPayableData;
  variety?: string | null;
  farmerSeedEntries?: FarmerSeedEntryByStorageLink[] | null;
  summaryAmountPayableTotal?: number;
};

/**
 * Seed amount payable breakdown for the accounting stock ledger PDF.
 * One data row per farmer-seed bag size when variety matches; otherwise a single empty row.
 */
export default function SeedAmountPayableTablePdf({
  prepared,
  variety = null,
  farmerSeedEntries = null,
  summaryAmountPayableTotal,
}: SeedAmountPayableTablePdfProps) {
  const splitIdx =
    SEED_AMOUNT_PAYABLE_LEAF_COLUMNS.length - NET_AMOUNT_PAYABLE_LEAF_COUNT;
  const beforeNet = SEED_AMOUNT_PAYABLE_LEAF_COLUMNS.slice(0, splitIdx);
  const netLeafs = SEED_AMOUNT_PAYABLE_LEAF_COLUMNS.slice(splitIdx);
  const netGroupWidthPct = netLeafs.reduce((s, c) => s + c.widthPct, 0);

  const data =
    prepared ??
    prepareSeedAmountPayableTableData({
      variety,
      farmerSeedEntries,
      summaryAmountPayableTotal,
      columnIds: SEED_AMOUNT_PAYABLE_LEAF_COLUMNS.map((c) => c.id),
    });

  const shouldShowTotalRow = data.rowCells.length > 1;
  const totalRowCells = shouldShowTotalRow
    ? SEED_AMOUNT_PAYABLE_LEAF_COLUMNS.map((_, colIdx) => {
        if (colIdx === 0) return 'Total';
        let sum = 0;
        let foundNumeric = false;
        for (const row of data.rowCells) {
          const numeric = parseNumericCellValue(String(row[colIdx] ?? ''));
          if (numeric != null) {
            sum += numeric;
            foundNumeric = true;
          }
        }
        return foundNumeric ? formatTotalNumber(sum) : '—';
      })
    : null;

  return (
    <View style={styles.wrap}>
      <Text style={styles.varietyHeading}>Variety: {data.varietyLabel}</Text>
      <Text style={styles.title}>Seed Amount Payable</Text>
      <View style={styles.table}>
        <View style={styles.headerRow} wrap={false}>
          {beforeNet.map((col) => (
            <HeaderSingleStack
              key={col.id}
              widthPct={col.widthPct}
              label={col.label}
              borderRight
            />
          ))}
          <HeaderNetAmountPayableGroup widthPct={netGroupWidthPct} />
        </View>
        {data.rowCells.map((rowCells, rowIndex) => (
          <View
            key={`seed-bag-${rowIndex}`}
            style={[
              styles.dataRow,
              rowIndex === data.rowCells.length - 1 ? styles.dataRowLast : {},
            ]}
            wrap={false}
          >
            {SEED_AMOUNT_PAYABLE_LEAF_COLUMNS.map((col, i) => (
              <View
                key={col.id}
                style={[
                  styles.cell,
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
          <View style={[styles.dataRow, styles.dataRowLast]} wrap={false}>
            {SEED_AMOUNT_PAYABLE_LEAF_COLUMNS.map((col, i) => (
              <View
                key={`seed-total-${col.id}`}
                style={[
                  styles.cell,
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
