import { Text, View, StyleSheet } from '@react-pdf/renderer';

const BORDER = '#e5e7eb';
const HEADER_BG = '#f9fafb';
const HEADER_ROW1_MIN = 16;
const HEADER_ROW2_MIN = 14;

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
export const SEED_AMOUNT_PAYABLE_LEAF_COLUMNS = [
  { id: 'seedAmountPayable', label: 'Seed Amount Payable', widthPct: 10 },
  { id: 'rate', label: 'Rate', widthPct: 8 },
  { id: 'amount', label: 'Amount', widthPct: 8 },
  { id: 'date', label: 'Date', widthPct: 8 },
  { id: 'amountReceived', label: 'Amount Received', widthPct: 10 },
  { id: 'seedAmountBalance', label: 'Seed Amount Balance', widthPct: 10 },
  { id: 'farmerAmountBalance', label: 'Farmer Amount Balance', widthPct: 10 },
  { id: 'farmerAmountPayable', label: 'Farmer Amount Payable', widthPct: 9 },
  { id: 'amtPayable', label: 'AMT PAYABLE', widthPct: 9 },
  { id: 'seedBalance', label: 'SEED BALANCE', widthPct: 9 },
  { id: 'netAmt', label: 'NET AMT', widthPct: 9 },
] as const;

export type SeedAmountPayableColumnId =
  (typeof SEED_AMOUNT_PAYABLE_LEAF_COLUMNS)[number]['id'];

/** @deprecated Use `SEED_AMOUNT_PAYABLE_LEAF_COLUMNS` (includes net-payable sub-columns). */
export const SEED_AMOUNT_PAYABLE_COLUMNS = SEED_AMOUNT_PAYABLE_LEAF_COLUMNS;

const styles = StyleSheet.create({
  wrap: {
    marginTop: 10,
  },
  title: {
    fontSize: 7,
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
    fontSize: 3.2,
    fontWeight: 700,
    color: '#111827',
    textTransform: 'uppercase',
    letterSpacing: 0.15,
    textAlign: 'center',
  },
  headerPlain: {
    fontSize: 3.2,
    fontWeight: 700,
    color: '#333',
    textAlign: 'center',
  },
  headerSingleTop: {
    minHeight: HEADER_ROW1_MIN,
    borderBottomWidth: 1,
    borderColor: BORDER,
    paddingVertical: 2,
    paddingHorizontal: 1,
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
    paddingVertical: 2,
    paddingHorizontal: 2,
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
    paddingVertical: 2,
    paddingHorizontal: 1,
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
    paddingVertical: 2,
    paddingHorizontal: 2,
    fontSize: 4,
    color: '#374151',
    borderRightWidth: 1,
    borderColor: BORDER,
    textAlign: 'center',
    minHeight: 12,
  },
  cellLast: {
    borderRightWidth: 0,
  },
});

const EMPTY = '—';

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

/**
 * Seed amount payable breakdown for the accounting stock ledger PDF.
 * Table shell with headers; data rows to be wired when figures are available.
 */
export default function SeedAmountPayableTablePdf() {
  const splitIdx =
    SEED_AMOUNT_PAYABLE_LEAF_COLUMNS.length - NET_AMOUNT_PAYABLE_LEAF_COUNT;
  const beforeNet = SEED_AMOUNT_PAYABLE_LEAF_COLUMNS.slice(0, splitIdx);
  const netLeafs = SEED_AMOUNT_PAYABLE_LEAF_COLUMNS.slice(splitIdx);
  const netGroupWidthPct = netLeafs.reduce((s, c) => s + c.widthPct, 0);

  return (
    <View style={styles.wrap}>
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
        <View style={[styles.dataRow, styles.dataRowLast]} wrap={false}>
          {SEED_AMOUNT_PAYABLE_LEAF_COLUMNS.map((col, i) => (
            <View
              key={`cell-${col.id}`}
              style={[
                styles.cell,
                i === SEED_AMOUNT_PAYABLE_LEAF_COLUMNS.length - 1
                  ? styles.cellLast
                  : {},
                { width: `${col.widthPct}%` },
              ]}
            >
              <Text>{EMPTY}</Text>
            </View>
          ))}
        </View>
      </View>
    </View>
  );
}
