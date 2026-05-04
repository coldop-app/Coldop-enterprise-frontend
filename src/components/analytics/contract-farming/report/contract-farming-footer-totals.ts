import {
  formatNumber,
  getAverageQuintalPerAcre,
  getBuyBackAmountFromGradeData,
  getGradeBagCount,
  getNetAmountRupee,
  getTotalGradeBags,
  getTotalGradeNetWeightKg,
  getWastageKg,
} from './contract-farming-report-calculations';
import type { FlattenedRow } from './types';
import {
  AVG_QUINTAL_PER_ACRE_COLUMN_ID,
  BUY_BACK_AMOUNT_COLUMN_ID,
  NET_AMOUNT_COLUMN_ID,
  NET_AMOUNT_PER_ACRE_COLUMN_ID,
  OUTPUT_PERCENTAGE_COLUMN_ID,
  SEED_AMOUNT_COLUMN_ID,
  TOTAL_GRADED_BAGS_COLUMN_ID,
  TOTAL_GRADED_NET_WEIGHT_COLUMN_ID,
  WASTAGE_KG_COLUMN_ID,
  VARIETY_LEVEL_COLUMN_PREFIX,
  VARIETY_LEVEL_PERCENT_COLUMN_PREFIX,
} from './columns';

function dedupeByFarmerVariety(rows: FlattenedRow[]): FlattenedRow[] {
  const seen = new Set<string>();
  const out: FlattenedRow[] = [];
  for (const row of rows) {
    const key = `${row.farmerAccount}\x00${row.varietyName}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(row);
  }
  return out;
}

function sumNullable(values: (number | null | undefined)[]): number {
  let s = 0;
  for (const v of values) {
    if (v != null && Number.isFinite(v)) s += v;
  }
  return s;
}

/**
 * Rollup strings for a subset of rows (e.g. one farmer group or one variety group).
 * Same rules as the footer: size columns sum every row; variety-level metrics use one
 * value per farmer×variety (deduped).
 */
export function buildContractFarmingRollupCellMap(
  rows: FlattenedRow[],
  visibleColumnIds: readonly string[]
): Record<string, string> {
  const cells: Record<string, string> = {};

  if (rows.length === 0) {
    for (const id of visibleColumnIds) {
      cells[id] = '';
    }
    return cells;
  }

  const deduped = dedupeByFarmerVariety(rows);

  let sumQty = 0;
  let sumAcres = 0;
  let sumSeed = 0;
  for (const r of rows) {
    sumQty += r.sizeQuantity;
    sumAcres += r.sizeAcres;
    sumSeed += r.sizeAmount;
  }

  let sumBuyBackBags = 0;
  let sumBuyBackNetKg = 0;
  let sumTotalGradedBags = 0;
  let sumTotalGradedNetKg = 0;
  let sumWastage = 0;
  let sumBuyBackAmt = 0;
  let sumNet = 0;
  let weightedQuintalNumerator = 0;
  let sumVarietyAcresForQuintal = 0;

  for (const r of deduped) {
    sumBuyBackBags += r.buyBackBags ?? 0;
    sumBuyBackNetKg += r.buyBackNetWeightKg ?? 0;
    const tb = getTotalGradeBags(r);
    if (tb != null) sumTotalGradedBags += tb;
    const tn = getTotalGradeNetWeightKg(r);
    if (tn != null) sumTotalGradedNetKg += tn;
    const w = getWastageKg(r);
    if (w != null) sumWastage += w;
    const bb = getBuyBackAmountFromGradeData(r);
    if (bb != null) sumBuyBackAmt += bb;
    const net = getNetAmountRupee(r);
    if (net != null) sumNet += net;
    const avgQ = getAverageQuintalPerAcre(r);
    const ac = r.varietyTotalAcres;
    if (avgQ != null && ac > 0) {
      weightedQuintalNumerator += avgQ * ac;
      sumVarietyAcresForQuintal += ac;
    }
  }

  const netPerAcreReport = sumAcres > 0 ? sumNet / sumAcres : null;

  const weightedAvgQuintal =
    sumVarietyAcresForQuintal > 0
      ? weightedQuintalNumerator / sumVarietyAcresForQuintal
      : null;

  for (const columnId of visibleColumnIds) {
    switch (columnId) {
      case 'farmer':
      case 'farmerMobile':
      case 'address':
      case 'variety':
      case 'generation':
      case 'size':
      case 'noGrades':
        cells[columnId] = '';
        break;
      case 'qty':
        cells[columnId] = formatNumber(sumQty, 0);
        break;
      case 'acres':
        cells[columnId] = formatNumber(sumAcres);
        break;
      case SEED_AMOUNT_COLUMN_ID:
        cells[columnId] = sumSeed > 0 ? `₹${formatNumber(sumSeed)}` : '-';
        break;
      case 'bbBags':
        cells[columnId] = formatNumber(sumBuyBackBags, 0);
        break;
      case 'bbNetWeight':
        cells[columnId] = formatNumber(sumBuyBackNetKg);
        break;
      case TOTAL_GRADED_BAGS_COLUMN_ID:
        cells[columnId] =
          sumTotalGradedBags > 0 ? formatNumber(sumTotalGradedBags, 0) : '-';
        break;
      case TOTAL_GRADED_NET_WEIGHT_COLUMN_ID:
        cells[columnId] =
          sumTotalGradedNetKg > 0 ? formatNumber(sumTotalGradedNetKg) : '-';
        break;
      case AVG_QUINTAL_PER_ACRE_COLUMN_ID:
        cells[columnId] =
          weightedAvgQuintal != null ? formatNumber(weightedAvgQuintal) : '-';
        break;
      case WASTAGE_KG_COLUMN_ID:
        cells[columnId] = sumWastage > 0 ? formatNumber(sumWastage) : '-';
        break;
      case OUTPUT_PERCENTAGE_COLUMN_ID:
        cells[columnId] = '—';
        break;
      case BUY_BACK_AMOUNT_COLUMN_ID:
        cells[columnId] =
          sumBuyBackAmt > 0 ? `₹${formatNumber(sumBuyBackAmt)}` : '-';
        break;
      case NET_AMOUNT_COLUMN_ID:
        cells[columnId] = sumNet > 0 ? `₹${formatNumber(sumNet)}` : '-';
        break;
      case NET_AMOUNT_PER_ACRE_COLUMN_ID:
        cells[columnId] =
          netPerAcreReport != null ? `₹${formatNumber(netPerAcreReport)}` : '-';
        break;
      default:
        if (columnId.startsWith(VARIETY_LEVEL_COLUMN_PREFIX)) {
          const grade = columnId.replace(VARIETY_LEVEL_COLUMN_PREFIX, '');
          const bags = sumNullable(
            deduped.map((r) => getGradeBagCount(r, grade))
          );
          cells[columnId] = bags > 0 ? formatNumber(bags, 0) : '-';
        } else if (columnId.startsWith(VARIETY_LEVEL_PERCENT_COLUMN_PREFIX)) {
          cells[columnId] = '—';
        } else {
          cells[columnId] = '';
        }
    }
  }

  return cells;
}

/**
 * Grand totals for the footer row. Size-level columns sum every filtered row;
 * variety-level columns sum once per farmer×variety (values repeat on each size line).
 */
export function formatContractFarmingFooterRow(
  rows: FlattenedRow[],
  visibleColumnIds: readonly string[]
): Record<string, string> {
  const firstId = visibleColumnIds[0];
  const cells = buildContractFarmingRollupCellMap(rows, visibleColumnIds);
  if (firstId) {
    cells[firstId] = 'Total';
  }
  return cells;
}
