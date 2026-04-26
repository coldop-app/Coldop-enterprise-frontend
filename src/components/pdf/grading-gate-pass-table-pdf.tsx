import { Fragment, type ReactNode } from 'react';
import { View, Text, StyleSheet } from '@react-pdf/renderer';
import { formatVoucherDate } from '@/components/daybook/vouchers/format-date';
import { GRADING_SIZES } from '@/components/forms/grading/constants';
import { SIZE_HEADER_LABELS } from '@/components/pdf/gradingVoucherCalculations';
import {
  type StockLedgerRow,
  groupStockLedgerRowsByGradingPass,
} from '@/components/pdf/stockLedgerTypes';

const BORDER = '#e5e7eb';
const HEADER_BG = '#f9fafb';

/** Column widths: base columns + per-size (Qty with size name as header, Wt in Kg, Bag Type) + Total. */
const COL_WIDTHS = {
  incomingGatePassNo: 34,
  manualIncomingVoucherNo: 34,
  gradingGatePassNo: 34,
  manualGradingGatePassNo: 34,
  farmerName: 80,
  variety: 48,
  date: 44,
  /** Single column: header = size name (e.g. 35-40), cell = quantity */
  sizeQty: 34,
  wtInKg: 26,
  bagType: 24,
  total: 32,
} as const;

const styles = StyleSheet.create({
  section: {
    marginTop: 10,
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 2,
    padding: 10,
    backgroundColor: '#fafafa',
  },
  title: {
    fontSize: 9,
    fontWeight: 700,
    color: '#333',
    marginBottom: 4,
  },
  headerRow: {
    flexDirection: 'row',
    backgroundColor: HEADER_BG,
    borderWidth: 1,
    borderColor: BORDER,
    borderBottomWidth: 0,
    flexShrink: 0,
  },
  headerCell: {
    paddingVertical: 3,
    paddingHorizontal: 3,
    fontWeight: 700,
    fontSize: 8,
    color: '#333',
    textTransform: 'uppercase',
    letterSpacing: 0.1,
    borderRightWidth: 1,
    borderColor: BORDER,
    flexShrink: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerCellLast: {
    borderRightWidth: 0,
  },
  dataRow: {
    flexDirection: 'row',
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderBottomWidth: 1,
    borderColor: BORDER,
    flexShrink: 0,
  },
  cell: {
    paddingVertical: 3,
    paddingHorizontal: 3,
    borderRightWidth: 1,
    borderColor: BORDER,
    flexShrink: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cellLast: {
    borderRightWidth: 0,
  },
  cellCenter: {
    textAlign: 'center',
  },
  totalRow: {
    flexDirection: 'row',
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderBottomWidth: 1,
    borderColor: BORDER,
    backgroundColor: '#f3f4f6',
    flexShrink: 0,
  },
  totalCellText: {
    fontWeight: 700,
  },
  /** Stacked sub-row inside a split column (incoming / repeated identity cols). */
  splitSubRow: {
    minHeight: 14,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
    width: '100%',
  },
  splitSubRowDivider: {
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
  },
  spanCellInner: {
    flex: 1,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
    width: '100%',
  },
  summarySection: {
    marginTop: 8,
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 2,
    padding: 6,
    backgroundColor: '#f5f5f5',
  },
  summaryTitle: {
    fontSize: 10,
    fontWeight: 700,
    marginBottom: 3,
    color: '#333',
  },
  summaryTable: {
    borderWidth: 1,
    borderColor: BORDER,
    marginBottom: 2,
  },
  summaryHeaderRow: {
    flexDirection: 'row',
    backgroundColor: '#e8e8e8',
    borderBottomWidth: 1,
    borderColor: BORDER,
    paddingVertical: 2,
    paddingHorizontal: 2,
  },
  summaryDataRow: {
    flexDirection: 'row',
    borderBottomWidth: 0.5,
    borderColor: BORDER,
    paddingVertical: 2,
    paddingHorizontal: 2,
  },
  summaryCell: {
    fontSize: 7,
    paddingHorizontal: 1,
    borderRightWidth: 0.5,
    borderColor: BORDER,
  },
  summaryCellLast: {
    borderRightWidth: 0,
  },
});

function formatGgpValue(value: number | string | undefined): string {
  if (value == null || String(value).trim() === '') return '—';
  return String(value);
}

/** One stacked sub-line height inside a merged grading-pass row (matches grading-report-table-pdf pattern). */
const PDF_SUB_ROW_HEIGHT = 16;

function formatLedgerGradingDate(row: StockLedgerRow): string {
  if (
    row.gradingGatePassDate != null &&
    String(row.gradingGatePassDate).trim() !== ''
  ) {
    return formatVoucherDate(row.gradingGatePassDate);
  }
  if (row.date != null && String(row.date).trim() !== '') {
    return formatVoucherDate(row.date);
  }
  return '—';
}

function varietyDisplay(row: StockLedgerRow): string {
  return row.variety != null && String(row.variety).trim() !== ''
    ? String(row.variety).trim()
    : '—';
}

function SplitGgpColumn({
  width,
  group,
  getText,
}: {
  width: number;
  group: StockLedgerRow[];
  getText: (row: StockLedgerRow) => string;
}) {
  return (
    <View style={[styles.cell, { width }]}>
      <View style={{ flexDirection: 'column', width: '100%' }}>
        {group.map((row, rowIdx) => (
          <View
            key={rowIdx}
            style={[
              styles.splitSubRow,
              rowIdx < group.length - 1 ? styles.splitSubRowDivider : {},
            ]}
          >
            <Text style={styles.cellCenter} wrap>
              {getText(row)}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}

function SpanGgpColumn({
  width,
  minHeight,
  children,
  isLast = false,
}: {
  width: number;
  minHeight: number;
  children: ReactNode;
  isLast?: boolean;
}) {
  return (
    <View
      style={[styles.cell, isLast ? styles.cellLast : {}, { width, minHeight }]}
    >
      <View style={styles.spanCellInner}>{children}</View>
    </View>
  );
}

/** Multiple incoming gate passes → one visual row; span grading + size + total columns. */
function GroupedGradingDataRow({
  group,
  farmerName,
  sizesWithQty,
  hideFarmerNameColumn,
}: {
  group: StockLedgerRow[];
  farmerName: string;
  sizesWithQty: string[];
  hideFarmerNameColumn: boolean;
}) {
  const groupHeight = group.length * PDF_SUB_ROW_HEIGHT;
  const first = group[0]!;
  /** Full bag count for the pass (JUTE + LENO); main row shows JUTE-only in split size cells. */
  const rowTotal = getRowTotal(first);

  return (
    <View style={[styles.dataRow, { minHeight: groupHeight }]}>
      <SplitGgpColumn
        width={COL_WIDTHS.incomingGatePassNo}
        group={group}
        getText={(r) => formatGgpValue(r.incomingGatePassNo)}
      />
      <SplitGgpColumn
        width={COL_WIDTHS.manualIncomingVoucherNo}
        group={group}
        getText={(r) => formatGgpValue(r.manualIncomingVoucherNo)}
      />
      <SpanGgpColumn
        width={COL_WIDTHS.gradingGatePassNo}
        minHeight={groupHeight}
      >
        <Text style={styles.cellCenter} wrap>
          {formatGgpValue(first.gradingGatePassNo)}
        </Text>
      </SpanGgpColumn>
      <SpanGgpColumn
        width={COL_WIDTHS.manualGradingGatePassNo}
        minHeight={groupHeight}
      >
        <Text style={styles.cellCenter} wrap>
          {formatGgpValue(first.manualGradingGatePassNo)}
        </Text>
      </SpanGgpColumn>
      {!hideFarmerNameColumn ? (
        <SplitGgpColumn
          width={COL_WIDTHS.farmerName}
          group={group}
          getText={() => farmerName}
        />
      ) : null}
      <SplitGgpColumn
        width={COL_WIDTHS.variety}
        group={group}
        getText={(r) => varietyDisplay(r)}
      />
      <SplitGgpColumn
        width={COL_WIDTHS.date}
        group={group}
        getText={(r) => formatLedgerGradingDate(r)}
      />
      {sizesWithQty.map((size) => {
        const { qty, wt, type } = getMainRowSizeCells(first, size);
        return (
          <Fragment key={size}>
            <SpanGgpColumn width={COL_WIDTHS.sizeQty} minHeight={groupHeight}>
              <Text style={styles.cellCenter}>
                {qty > 0 ? qty.toLocaleString('en-IN') : '—'}
              </Text>
            </SpanGgpColumn>
            <SpanGgpColumn width={COL_WIDTHS.wtInKg} minHeight={groupHeight}>
              <Text style={styles.cellCenter}>{wt}</Text>
            </SpanGgpColumn>
            <SpanGgpColumn width={COL_WIDTHS.bagType} minHeight={groupHeight}>
              <Text style={styles.cellCenter}>{type}</Text>
            </SpanGgpColumn>
          </Fragment>
        );
      })}
      <SpanGgpColumn width={COL_WIDTHS.total} minHeight={groupHeight} isLast>
        <Text style={styles.cellCenter}>
          {rowTotal > 0 ? rowTotal.toLocaleString('en-IN') : '—'}
        </Text>
      </SpanGgpColumn>
    </View>
  );
}

/** Get weight (kg) and bag type for a size on a row. Prefers JUTE then LENO then unified. */
function getSizeWtAndType(
  row: StockLedgerRow,
  size: string
): { wt: string; type: string } {
  const juteWt = row.sizeWeightPerBagJute?.[size];
  const lenoWt = row.sizeWeightPerBagLeno?.[size];
  const unifiedWt = row.sizeWeightPerBag?.[size];
  const hasJute =
    juteWt != null &&
    !Number.isNaN(juteWt) &&
    (row.sizeBagsJute?.[size] ?? 0) > 0;
  const hasLeno =
    lenoWt != null &&
    !Number.isNaN(lenoWt) &&
    (row.sizeBagsLeno?.[size] ?? 0) > 0;
  if (hasJute)
    return {
      wt: juteWt > 0 ? String(juteWt) : '—',
      type: 'JUTE',
    };
  if (hasLeno)
    return {
      wt: lenoWt > 0 ? String(lenoWt) : '—',
      type: 'LENO',
    };
  if (
    unifiedWt != null &&
    !Number.isNaN(unifiedWt) &&
    (row.sizeBags?.[size] ?? 0) > 0
  )
    return {
      wt: unifiedWt > 0 ? String(unifiedWt) : '—',
      type: row.bagType ?? '—',
    };
  return { wt: '—', type: '—' };
}

/** Get bag quantity for a size on a row (JUTE + LENO or unified). */
function getSizeQty(row: StockLedgerRow, size: string): number {
  const jute = row.sizeBagsJute?.[size] ?? 0;
  const leno = row.sizeBagsLeno?.[size] ?? 0;
  if (jute > 0 || leno > 0) return jute + leno;
  return row.sizeBags?.[size] ?? 0;
}

type BagType = 'JUTE' | 'LENO';

function isBifurcatedSize(row: StockLedgerRow, size: string): boolean {
  return (
    (row.sizeBagsJute?.[size] ?? 0) > 0 && (row.sizeBagsLeno?.[size] ?? 0) > 0
  );
}

function getBagTypeQty(
  row: StockLedgerRow,
  size: string,
  bagType: BagType
): number {
  if (bagType === 'JUTE') return row.sizeBagsJute?.[size] ?? 0;
  return row.sizeBagsLeno?.[size] ?? 0;
}

function getBagTypeWt(
  row: StockLedgerRow,
  size: string,
  bagType: BagType
): string {
  const qty = getBagTypeQty(row, size, bagType);
  if (qty <= 0) return '—';
  const wt =
    bagType === 'JUTE'
      ? row.sizeWeightPerBagJute?.[size]
      : row.sizeWeightPerBagLeno?.[size];
  if (wt == null || Number.isNaN(wt) || wt <= 0) return '—';
  return String(wt);
}

function hasMixedBagTypesInAnySize(
  row: StockLedgerRow,
  sizesWithQty: string[]
): boolean {
  return sizesWithQty.some((size) => isBifurcatedSize(row, size));
}

/** Main table row: for sizes with both JUTE and LENO, show JUTE-only; else combined/unified as before. */
function getMainRowSizeCells(
  row: StockLedgerRow,
  size: string
): { qty: number; wt: string; type: string } {
  if (isBifurcatedSize(row, size)) {
    const qty = getBagTypeQty(row, size, 'JUTE');
    return {
      qty,
      wt: getBagTypeWt(row, size, 'JUTE'),
      type: 'JUTE',
    };
  }
  const { wt, type } = getSizeWtAndType(row, size);
  return { qty: getSizeQty(row, size), wt, type };
}

function EmptyTableCell({
  width,
  last = false,
}: {
  width: number;
  last?: boolean;
}) {
  return (
    <View style={[styles.cell, last ? styles.cellLast : {}, { width }]}>
      <Text style={styles.cellCenter} />
    </View>
  );
}

/** Second line for bifurcated sizes: blank except LENO qty/wt/type in those size columns. */
function LenoBifurcationContinuationRow({
  row,
  sizesWithQty,
  hideFarmerNameColumn,
}: {
  row: StockLedgerRow;
  sizesWithQty: string[];
  hideFarmerNameColumn: boolean;
}) {
  return (
    <View style={styles.dataRow}>
      <EmptyTableCell width={COL_WIDTHS.incomingGatePassNo} />
      <EmptyTableCell width={COL_WIDTHS.manualIncomingVoucherNo} />
      <EmptyTableCell width={COL_WIDTHS.gradingGatePassNo} />
      <EmptyTableCell width={COL_WIDTHS.manualGradingGatePassNo} />
      {!hideFarmerNameColumn ? (
        <EmptyTableCell width={COL_WIDTHS.farmerName} />
      ) : null}
      <EmptyTableCell width={COL_WIDTHS.variety} />
      <EmptyTableCell width={COL_WIDTHS.date} />
      {sizesWithQty.map((size) => {
        if (!isBifurcatedSize(row, size)) {
          return (
            <Fragment key={size}>
              <EmptyTableCell width={COL_WIDTHS.sizeQty} />
              <EmptyTableCell width={COL_WIDTHS.wtInKg} />
              <EmptyTableCell width={COL_WIDTHS.bagType} />
            </Fragment>
          );
        }
        const qty = getBagTypeQty(row, size, 'LENO');
        const wt = getBagTypeWt(row, size, 'LENO');
        return (
          <Fragment key={size}>
            <View style={[styles.cell, { width: COL_WIDTHS.sizeQty }]}>
              <Text style={styles.cellCenter}>
                {qty > 0 ? qty.toLocaleString('en-IN') : '—'}
              </Text>
            </View>
            <View style={[styles.cell, { width: COL_WIDTHS.wtInKg }]}>
              <Text style={styles.cellCenter}>{wt}</Text>
            </View>
            <View style={[styles.cell, { width: COL_WIDTHS.bagType }]}>
              <Text style={styles.cellCenter}>{qty > 0 ? 'LENO' : '—'}</Text>
            </View>
          </Fragment>
        );
      })}
      <EmptyTableCell width={COL_WIDTHS.total} last />
    </View>
  );
}

/** Sum of all size quantities for a row. */
function getRowTotal(row: StockLedgerRow): number {
  return GRADING_SIZES.reduce((sum, size) => sum + getSizeQty(row, size), 0);
}

/** Sizes that have at least one row with quantity > 0 (so we only show columns for these). */
function getSizesWithQuantities(rows: StockLedgerRow[]): string[] {
  return GRADING_SIZES.filter((size) =>
    rows.some((row) => getSizeQty(row, size) > 0)
  );
}

/** Variety-wise aggregate: variety name and total bags */
interface VarietySummaryRow {
  variety: string;
  total: number;
}

/** Size-wise aggregate: size label and total bags */
interface SizeSummaryRow {
  size: string;
  total: number;
}

function computeGradingTableSummary(
  rows: StockLedgerRow[],
  sizesWithQty: string[]
): {
  byVariety: VarietySummaryRow[];
  bySize: SizeSummaryRow[];
  grandTotal: number;
} {
  const varietyMap = new Map<string, number>();
  const sizeMap = new Map<string, number>();
  let grandTotal = 0;
  for (const row of rows) {
    const variety =
      row.variety != null && String(row.variety).trim() !== ''
        ? String(row.variety).trim()
        : '—';
    const rowTotal = getRowTotal(row);
    grandTotal += rowTotal;
    varietyMap.set(variety, (varietyMap.get(variety) ?? 0) + rowTotal);
    for (const size of sizesWithQty) {
      const qty = getSizeQty(row, size);
      sizeMap.set(size, (sizeMap.get(size) ?? 0) + qty);
    }
  }
  const byVariety: VarietySummaryRow[] = Array.from(varietyMap.entries())
    .map(([variety, total]) => ({ variety, total }))
    .sort((a, b) => a.variety.localeCompare(b.variety));
  const bySize: SizeSummaryRow[] = sizesWithQty.map((size) => ({
    size: SIZE_HEADER_LABELS[size] ?? size,
    total: sizeMap.get(size) ?? 0,
  }));
  return { byVariety, bySize, grandTotal };
}

export interface GradingGatePassTablePdfProps {
  farmerName: string;
  rows: StockLedgerRow[];
  /** When true, hide the Report Summary (Variety / Size / Farmer) below the table. */
  hideReportSummary?: boolean;
  /** When true, omit the Farmer Name column (e.g. accounting ledger PDF where farmer is in the header). */
  hideFarmerNameColumn?: boolean;
}

function GradingGatePassTablePdf({
  farmerName,
  rows,
  hideReportSummary = false,
  hideFarmerNameColumn = false,
}: GradingGatePassTablePdfProps) {
  const rowsWithGgp = rows.filter(
    (row) =>
      (row.gradingGatePassNo != null &&
        String(row.gradingGatePassNo).trim() !== '') ||
      (row.manualGradingGatePassNo != null &&
        String(row.manualGradingGatePassNo).trim() !== '')
  );

  if (rowsWithGgp.length === 0) return null;

  const sizesWithQty = getSizesWithQuantities(rowsWithGgp);
  const rowGroups = groupStockLedgerRowsByGradingPass(rowsWithGgp);

  return (
    <View style={styles.section}>
      <Text style={styles.title}>Grading Gate Pass Table</Text>
      <View style={styles.headerRow}>
        <View
          style={[styles.headerCell, { width: COL_WIDTHS.incomingGatePassNo }]}
        >
          <Text style={styles.cellCenter}>System Incoming GP No</Text>
        </View>
        <View
          style={[
            styles.headerCell,
            { width: COL_WIDTHS.manualIncomingVoucherNo },
          ]}
        >
          <Text style={styles.cellCenter}>Incoming GP No</Text>
        </View>
        <View
          style={[styles.headerCell, { width: COL_WIDTHS.gradingGatePassNo }]}
        >
          <Text style={styles.cellCenter}>System Grading GP No</Text>
        </View>
        <View
          style={[
            styles.headerCell,
            { width: COL_WIDTHS.manualGradingGatePassNo },
          ]}
        >
          <Text style={styles.cellCenter}>Grading GP Number</Text>
        </View>
        {!hideFarmerNameColumn ? (
          <View style={[styles.headerCell, { width: COL_WIDTHS.farmerName }]}>
            <Text style={styles.cellCenter}>Farmer Name</Text>
          </View>
        ) : null}
        <View style={[styles.headerCell, { width: COL_WIDTHS.variety }]}>
          <Text style={styles.cellCenter}>Variety</Text>
        </View>
        <View style={[styles.headerCell, { width: COL_WIDTHS.date }]}>
          <Text style={styles.cellCenter}>Grading Date</Text>
        </View>
        {sizesWithQty.map((size) => {
          const sizeLabel = SIZE_HEADER_LABELS[size] ?? size;
          return (
            <Fragment key={size}>
              <View style={[styles.headerCell, { width: COL_WIDTHS.sizeQty }]}>
                <Text style={styles.cellCenter}>{sizeLabel}</Text>
              </View>
              <View style={[styles.headerCell, { width: COL_WIDTHS.wtInKg }]}>
                <Text style={styles.cellCenter}>Wt in Kg</Text>
              </View>
              <View style={[styles.headerCell, { width: COL_WIDTHS.bagType }]}>
                <Text style={styles.cellCenter}>Bag Type</Text>
              </View>
            </Fragment>
          );
        })}
        <View
          style={[
            styles.headerCell,
            styles.headerCellLast,
            { width: COL_WIDTHS.total },
          ]}
        >
          <Text style={styles.cellCenter}>Total</Text>
        </View>
      </View>
      {rowGroups.map((group, gi) => {
        const keyBase = `ggp-${group[0]?.gradingGatePassNo ?? gi}-${group[0]?.incomingGatePassNo ?? ''}`;
        if (group.length > 1) {
          const first = group[0]!;
          const shouldShowSplitRows = hasMixedBagTypesInAnySize(
            first,
            sizesWithQty
          );
          return (
            <Fragment key={`${keyBase}-grp-wrap`}>
              <GroupedGradingDataRow
                key={`${keyBase}-grp`}
                group={group}
                farmerName={farmerName}
                sizesWithQty={sizesWithQty}
                hideFarmerNameColumn={hideFarmerNameColumn}
              />
              {shouldShowSplitRows ? (
                <LenoBifurcationContinuationRow
                  row={first}
                  sizesWithQty={sizesWithQty}
                  hideFarmerNameColumn={hideFarmerNameColumn}
                />
              ) : null}
            </Fragment>
          );
        }
        const row = group[0]!;
        const shouldShowSplitRows = hasMixedBagTypesInAnySize(
          row,
          sizesWithQty
        );
        const rowTotal = getRowTotal(row);
        return (
          <Fragment key={`${keyBase}-1-wrap`}>
            <View key={`${keyBase}-1`} style={styles.dataRow}>
              <View
                style={[styles.cell, { width: COL_WIDTHS.incomingGatePassNo }]}
              >
                <Text style={styles.cellCenter}>
                  {formatGgpValue(row.incomingGatePassNo)}
                </Text>
              </View>
              <View
                style={[
                  styles.cell,
                  { width: COL_WIDTHS.manualIncomingVoucherNo },
                ]}
              >
                <Text style={styles.cellCenter}>
                  {formatGgpValue(row.manualIncomingVoucherNo)}
                </Text>
              </View>
              <View
                style={[styles.cell, { width: COL_WIDTHS.gradingGatePassNo }]}
              >
                <Text style={styles.cellCenter}>
                  {formatGgpValue(row.gradingGatePassNo)}
                </Text>
              </View>
              <View
                style={[
                  styles.cell,
                  { width: COL_WIDTHS.manualGradingGatePassNo },
                ]}
              >
                <Text style={styles.cellCenter}>
                  {formatGgpValue(row.manualGradingGatePassNo)}
                </Text>
              </View>
              {!hideFarmerNameColumn ? (
                <View style={[styles.cell, { width: COL_WIDTHS.farmerName }]}>
                  <Text style={styles.cellCenter}>{farmerName}</Text>
                </View>
              ) : null}
              <View style={[styles.cell, { width: COL_WIDTHS.variety }]}>
                <Text style={styles.cellCenter}>{varietyDisplay(row)}</Text>
              </View>
              <View style={[styles.cell, { width: COL_WIDTHS.date }]}>
                <Text style={styles.cellCenter}>
                  {formatLedgerGradingDate(row)}
                </Text>
              </View>
              {sizesWithQty.map((size) => {
                const { qty, wt, type } = getMainRowSizeCells(row, size);
                return (
                  <Fragment key={size}>
                    <View style={[styles.cell, { width: COL_WIDTHS.sizeQty }]}>
                      <Text style={styles.cellCenter}>
                        {qty > 0 ? qty.toLocaleString('en-IN') : '—'}
                      </Text>
                    </View>
                    <View style={[styles.cell, { width: COL_WIDTHS.wtInKg }]}>
                      <Text style={styles.cellCenter}>{wt}</Text>
                    </View>
                    <View style={[styles.cell, { width: COL_WIDTHS.bagType }]}>
                      <Text style={styles.cellCenter}>{type}</Text>
                    </View>
                  </Fragment>
                );
              })}
              <View
                style={[
                  styles.cell,
                  styles.cellLast,
                  { width: COL_WIDTHS.total },
                ]}
              >
                <Text style={styles.cellCenter}>
                  {rowTotal > 0 ? rowTotal.toLocaleString('en-IN') : '—'}
                </Text>
              </View>
            </View>
            {shouldShowSplitRows ? (
              <LenoBifurcationContinuationRow
                row={row}
                sizesWithQty={sizesWithQty}
                hideFarmerNameColumn={hideFarmerNameColumn}
              />
            ) : null}
          </Fragment>
        );
      })}
      <TotalRow
        rows={rowsWithGgp}
        sizesWithQty={sizesWithQty}
        hideFarmerNameColumn={hideFarmerNameColumn}
      />
      {!hideReportSummary && (
        <GradingTableSummarySection
          farmerName={farmerName}
          rows={rowsWithGgp}
          sizesWithQty={sizesWithQty}
        />
      )}
    </View>
  );
}

/**
 * Report Summary (Variety, Size, Farmer tables). Exported for use in farmer-report-pdf.
 */
export function ReportSummarySectionPdf({
  farmerName,
  rows,
}: {
  farmerName: string;
  rows: StockLedgerRow[];
}) {
  const sizesWithQty = getSizesWithQuantities(rows);
  return (
    <GradingTableSummarySection
      farmerName={farmerName}
      rows={rows}
      sizesWithQty={sizesWithQty}
    />
  );
}

function GradingTableSummarySection({
  farmerName,
  rows,
  sizesWithQty,
}: {
  farmerName: string;
  rows: StockLedgerRow[];
  sizesWithQty: string[];
}) {
  const { byVariety, bySize, grandTotal } = computeGradingTableSummary(
    rows,
    sizesWithQty
  );
  const nameWidth = 100;
  const numWidth = 40;
  return (
    <View style={styles.summarySection}>
      <Text style={styles.summaryTitle}>Report Summary</Text>
      {/* Variety-wise */}
      <View style={styles.summaryTable}>
        <View style={styles.summaryHeaderRow}>
          <Text style={[styles.summaryCell, { width: nameWidth }]}>
            Variety
          </Text>
          <Text
            style={[
              styles.summaryCell,
              styles.summaryCellLast,
              { width: numWidth },
            ]}
          >
            Total Bags
          </Text>
        </View>
        {byVariety.map((r) => (
          <View key={r.variety} style={styles.summaryDataRow}>
            <Text style={[styles.summaryCell, { width: nameWidth }]}>
              {r.variety}
            </Text>
            <Text
              style={[
                styles.summaryCell,
                styles.summaryCellLast,
                { width: numWidth },
              ]}
            >
              {r.total > 0 ? r.total.toLocaleString('en-IN') : '—'}
            </Text>
          </View>
        ))}
        <View style={[styles.summaryDataRow, { backgroundColor: '#e8e8e8' }]}>
          <Text
            style={[
              styles.summaryCell,
              styles.totalCellText,
              { width: nameWidth },
            ]}
          >
            Total
          </Text>
          <Text
            style={[
              styles.summaryCell,
              styles.summaryCellLast,
              styles.totalCellText,
              { width: numWidth },
            ]}
          >
            {grandTotal > 0 ? grandTotal.toLocaleString('en-IN') : '—'}
          </Text>
        </View>
      </View>
      {/* Size-wise */}
      <View style={[styles.summaryTable, { marginTop: 2 }]}>
        <View style={styles.summaryHeaderRow}>
          <Text style={[styles.summaryCell, { width: nameWidth }]}>Size</Text>
          <Text
            style={[
              styles.summaryCell,
              styles.summaryCellLast,
              { width: numWidth },
            ]}
          >
            Total Bags
          </Text>
        </View>
        {bySize.map((r) => (
          <View key={r.size} style={styles.summaryDataRow}>
            <Text style={[styles.summaryCell, { width: nameWidth }]}>
              {r.size}
            </Text>
            <Text
              style={[
                styles.summaryCell,
                styles.summaryCellLast,
                { width: numWidth },
              ]}
            >
              {r.total > 0 ? r.total.toLocaleString('en-IN') : '—'}
            </Text>
          </View>
        ))}
        <View style={[styles.summaryDataRow, { backgroundColor: '#e8e8e8' }]}>
          <Text
            style={[
              styles.summaryCell,
              styles.totalCellText,
              { width: nameWidth },
            ]}
          >
            Total
          </Text>
          <Text
            style={[
              styles.summaryCell,
              styles.summaryCellLast,
              styles.totalCellText,
              { width: numWidth },
            ]}
          >
            {grandTotal > 0 ? grandTotal.toLocaleString('en-IN') : '—'}
          </Text>
        </View>
      </View>
      {/* Farmer-wise (single farmer) */}
      <View style={[styles.summaryTable, { marginTop: 2 }]}>
        <View style={styles.summaryHeaderRow}>
          <Text style={[styles.summaryCell, { width: nameWidth }]}>Farmer</Text>
          <Text
            style={[
              styles.summaryCell,
              styles.summaryCellLast,
              { width: numWidth },
            ]}
          >
            Total Bags
          </Text>
        </View>
        <View style={styles.summaryDataRow}>
          <Text style={[styles.summaryCell, { width: nameWidth }]}>
            {farmerName}
          </Text>
          <Text
            style={[
              styles.summaryCell,
              styles.summaryCellLast,
              { width: numWidth },
            ]}
          >
            {grandTotal > 0 ? grandTotal.toLocaleString('en-IN') : '—'}
          </Text>
        </View>
      </View>
    </View>
  );
}

function TotalRow({
  rows,
  sizesWithQty,
  hideFarmerNameColumn,
}: {
  rows: StockLedgerRow[];
  sizesWithQty: string[];
  hideFarmerNameColumn: boolean;
}) {
  const totalsBySize: Record<string, number> = {};
  for (const size of GRADING_SIZES) {
    totalsBySize[size] = rows.reduce(
      (sum, row) => sum + getSizeQty(row, size),
      0
    );
  }
  const grandTotal = rows.reduce((sum, row) => sum + getRowTotal(row), 0);
  const boldCenter = [styles.cellCenter, styles.totalCellText];
  return (
    <View style={styles.totalRow}>
      <View style={[styles.cell, { width: COL_WIDTHS.incomingGatePassNo }]}>
        <Text style={styles.cellCenter}>—</Text>
      </View>
      <View
        style={[styles.cell, { width: COL_WIDTHS.manualIncomingVoucherNo }]}
      >
        <Text style={styles.cellCenter}>—</Text>
      </View>
      <View style={[styles.cell, { width: COL_WIDTHS.gradingGatePassNo }]}>
        <Text style={boldCenter}>Total</Text>
      </View>
      <View
        style={[styles.cell, { width: COL_WIDTHS.manualGradingGatePassNo }]}
      >
        <Text style={styles.cellCenter}>—</Text>
      </View>
      {!hideFarmerNameColumn ? (
        <View style={[styles.cell, { width: COL_WIDTHS.farmerName }]}>
          <Text style={styles.cellCenter}>—</Text>
        </View>
      ) : null}
      <View style={[styles.cell, { width: COL_WIDTHS.variety }]}>
        <Text style={styles.cellCenter}>—</Text>
      </View>
      <View style={[styles.cell, { width: COL_WIDTHS.date }]}>
        <Text style={styles.cellCenter}>—</Text>
      </View>
      {sizesWithQty.map((size) => {
        const totalQty = totalsBySize[size] ?? 0;
        return (
          <Fragment key={size}>
            <View style={[styles.cell, { width: COL_WIDTHS.sizeQty }]}>
              <Text style={boldCenter}>
                {totalQty > 0 ? totalQty.toLocaleString('en-IN') : '—'}
              </Text>
            </View>
            <View style={[styles.cell, { width: COL_WIDTHS.wtInKg }]}>
              <Text style={styles.cellCenter}>—</Text>
            </View>
            <View style={[styles.cell, { width: COL_WIDTHS.bagType }]}>
              <Text style={styles.cellCenter}>—</Text>
            </View>
          </Fragment>
        );
      })}
      <View style={[styles.cell, styles.cellLast, { width: COL_WIDTHS.total }]}>
        <Text style={boldCenter}>
          {grandTotal > 0 ? grandTotal.toLocaleString('en-IN') : '—'}
        </Text>
      </View>
    </View>
  );
}

export default GradingGatePassTablePdf;
