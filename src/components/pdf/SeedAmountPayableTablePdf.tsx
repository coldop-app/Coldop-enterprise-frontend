import { Text, View, StyleSheet } from '@react-pdf/renderer';
import type {
  FarmerSeedBagSize,
  FarmerSeedEntryByStorageLink,
} from '@/types/farmer-seed';
import { getFarmerSeedBagSizesForVariety } from '@/components/pdf/seedAmountPayablePdfHelpers';

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
  { id: 'bagsForPlantation', label: 'Bags For Plantation', widthPct: 10 },
  { id: 'rate', label: 'Rate', widthPct: 10 },
  { id: 'amount', label: 'Amount', widthPct: 10 },
  { id: 'date', label: 'Date', widthPct: 10 },
  { id: 'amountReceived', label: 'Amount Received', widthPct: 10 },
  { id: 'seedAmountBalance', label: 'Seed Amount Balance', widthPct: 10 },
  { id: 'amtPayable', label: 'AMT PAYABLE', widthPct: 10 },
  { id: 'seedBalance', label: 'SEED BALANCE', widthPct: 10 },
  { id: 'netAmt', label: 'NET AMT', widthPct: 10 },
] as const;

export type SeedAmountPayableColumnId =
  (typeof SEED_AMOUNT_PAYABLE_LEAF_COLUMNS)[number]['id'];

/** @deprecated Use `SEED_AMOUNT_PAYABLE_LEAF_COLUMNS` (includes net-payable sub-columns). */
export const SEED_AMOUNT_PAYABLE_COLUMNS = SEED_AMOUNT_PAYABLE_LEAF_COLUMNS;

const styles = StyleSheet.create({
  wrap: {
    marginTop: 10,
  },
  varietyHeading: {
    fontSize: 6,
    fontWeight: 700,
    color: '#111827',
    marginBottom: 4,
    backgroundColor: '#e5e7eb',
    paddingVertical: 2,
    paddingHorizontal: 4,
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

function formatCommaNumber(n: number): string {
  return new Intl.NumberFormat('en-IN', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(n);
}

function formatBagQuantity(q: number): string {
  if (!Number.isFinite(q)) return EMPTY;
  if (Number.isInteger(q)) return String(q);
  return String(q);
}

function formatSeedRate(rate: number): string {
  if (!Number.isFinite(rate)) return EMPTY;
  if (Number.isInteger(rate)) return String(rate);
  return rate.toFixed(2);
}

function getLineAmountNumber(bag: FarmerSeedBagSize): number | null {
  if (!Number.isFinite(bag.quantity) || !Number.isFinite(bag.rate)) return null;
  const total = bag.quantity * bag.rate;
  return Number.isFinite(total) ? total : null;
}

/** Bags for plantation × rate (per bag size row), with thousands separators. */
function formatSeedAmountLine(bag: FarmerSeedBagSize): string {
  const total = getLineAmountNumber(bag);
  if (total === null) return EMPTY;
  return formatCommaNumber(total);
}

/** Same rules as Summary table `formatRightCellValue` for amountPayable (AMT PAY. total). */
function formatSummaryAmtPayTotal(total: number | undefined): string {
  if (total == null || !Number.isFinite(total)) return EMPTY;
  if (total <= 0) return '—';
  return total.toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

type SeedTableCellContext = {
  summaryAmountPayableTotal?: number;
};

function getSeedAmountBalanceNumber(bag: FarmerSeedBagSize): number | null {
  const amount = getLineAmountNumber(bag);
  if (amount === null) return null;
  const received =
    typeof bag.amountReceived === 'number' &&
    Number.isFinite(bag.amountReceived)
      ? bag.amountReceived
      : 0;
  const balance = amount - received;
  return Number.isFinite(balance) ? balance : null;
}

/** Amount − amount received (same for “Seed Amount Balance” and Net Payable → SEED BALANCE). */
function getSeedAmountBalanceDisplay(bag: FarmerSeedBagSize): string {
  const balance = getSeedAmountBalanceNumber(bag);
  if (balance === null) return EMPTY;
  return formatCommaNumber(balance);
}

/** Net Amt = Amt Payable (summary total) − Seed Balance (row). */
function getNetAmtPayableDisplay(
  bag: FarmerSeedBagSize,
  ctx: SeedTableCellContext
): string {
  const total = ctx.summaryAmountPayableTotal;
  if (total == null || !Number.isFinite(total)) return EMPTY;
  const seedBal = getSeedAmountBalanceNumber(bag);
  if (seedBal === null) return EMPTY;
  const net = total - seedBal;
  if (!Number.isFinite(net)) return EMPTY;
  return formatCommaNumber(net);
}

function getSeedTableCellText(
  colId: SeedAmountPayableColumnId,
  bag: FarmerSeedBagSize | null,
  ctx: SeedTableCellContext
): string {
  if (colId === 'amtPayable') {
    return formatSummaryAmtPayTotal(ctx.summaryAmountPayableTotal);
  }
  if (colId === 'netAmt') {
    if (!bag) return EMPTY;
    return getNetAmtPayableDisplay(bag, ctx);
  }
  if (colId === 'seedBalance') {
    if (!bag) return EMPTY;
    return getSeedAmountBalanceDisplay(bag);
  }
  if (!bag) return EMPTY;
  switch (colId) {
    case 'seedAmountPayable':
      return bag.name?.trim() ? bag.name : EMPTY;
    case 'bagsForPlantation':
      return formatBagQuantity(bag.quantity);
    case 'rate':
      return formatSeedRate(bag.rate);
    case 'amount':
      return formatSeedAmountLine(bag);
    case 'amountReceived':
      if (
        typeof bag.amountReceived !== 'number' ||
        !Number.isFinite(bag.amountReceived)
      ) {
        return EMPTY;
      }
      return formatCommaNumber(bag.amountReceived);
    case 'seedAmountBalance':
      return getSeedAmountBalanceDisplay(bag);
    default:
      return EMPTY;
  }
}

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
  /** Grading subsection variety; compared to `farmerSeedEntry.variety` for matching bag rows. */
  variety: string | null;
  farmerSeedEntry?: FarmerSeedEntryByStorageLink | null;
  /**
   * Same value as Summary table “AMT PAY.” total for this variety’s stock-ledger rows
   * (shown under Net Amount Payable → AMT PAYABLE).
   */
  summaryAmountPayableTotal?: number;
};

/**
 * Seed amount payable breakdown for the accounting stock ledger PDF.
 * One data row per farmer-seed bag size when variety matches; otherwise a single empty row.
 */
export default function SeedAmountPayableTablePdf({
  variety,
  farmerSeedEntry = null,
  summaryAmountPayableTotal,
}: SeedAmountPayableTablePdfProps) {
  const splitIdx =
    SEED_AMOUNT_PAYABLE_LEAF_COLUMNS.length - NET_AMOUNT_PAYABLE_LEAF_COUNT;
  const beforeNet = SEED_AMOUNT_PAYABLE_LEAF_COLUMNS.slice(0, splitIdx);
  const netLeafs = SEED_AMOUNT_PAYABLE_LEAF_COLUMNS.slice(splitIdx);
  const netGroupWidthPct = netLeafs.reduce((s, c) => s + c.widthPct, 0);

  const bagRows = getFarmerSeedBagSizesForVariety(variety, farmerSeedEntry);
  const netCtx: SeedTableCellContext = { summaryAmountPayableTotal };

  const varietyLabel = variety?.trim() ? variety : '—';

  return (
    <View style={styles.wrap}>
      <Text style={styles.varietyHeading}>Variety: {varietyLabel}</Text>
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
        {bagRows.length === 0 ? (
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
                <Text>{getSeedTableCellText(col.id, null, netCtx)}</Text>
              </View>
            ))}
          </View>
        ) : (
          bagRows.map((bag, rowIndex) => (
            <View
              key={`seed-bag-${rowIndex}`}
              style={[
                styles.dataRow,
                rowIndex === bagRows.length - 1 ? styles.dataRowLast : {},
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
                  <Text>{getSeedTableCellText(col.id, bag, netCtx)}</Text>
                </View>
              ))}
            </View>
          ))
        )}
      </View>
    </View>
  );
}
