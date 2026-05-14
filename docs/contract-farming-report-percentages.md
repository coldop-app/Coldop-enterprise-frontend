# Contract Farming Report: Percentage Calculations (TanStack Table)

This document describes how **percentage** values are computed in the store-admin **Contract Farming** analytics table built on TanStack Table.

**Implementation**

- Formulas: `src/components/analytics/contract-farming/report/contract-farming-report-calculations.ts`
- Footer rollups for `%` columns: `contract-farming-report-footer-totals.ts` (`computeContractFarmingFooterTotals`), used from `contract-farming-report-table.tsx`

For overall module architecture, see [contract-farming-report-pattern-guide.md](./contract-farming-report-pattern-guide.md).

> **Note:** [contract-farming-report-calculation.md](./contract-farming-report-calculation.md) documents an older **seed / digital table** stack (`ContractFarmingReportDigitalTable.tsx`). The formulas are similar in spirit (weight-based band %), but code paths and some details differ from the TanStack report described here.

---

## 1) Per-grade weight % (dynamic grading columns)

Each visible **“%”** column next to a grade (bag size / grading bucket) shows what share of **graded net weight** on that **grid row** belongs to that grade.

### Formula

\[
\text{grade \%} = \frac{\text{netWeightKg for that grade (or synthetic group)}}{\sum \text{netWeightKg across all grades on the row}} \times 100
\]

- **Denominator** = sum of `netWeightKg` from every entry in `FlattenedRow.gradeData` (all API grade keys present on that row), including buckets that may be rolled into group headers in the UI.
- **Numerator** = net kg for the column’s grade, with two **synthetic** group columns:
  - **`Below 40`** — sum of net kg for underlying fine grades (see below).
  - **`Above 50`** — sum of net kg for underlying coarse grades (see below).
- If the denominator is **≤ 0**, the value is **`null`** (no percentage).

Source: `getGradeWeightPercent` and `getTotalGradeNetWeightKgSum` in `contract-farming-report-calculations.ts`.

### Synthetic “Below 40” group

The column id / header **`Below 40`** aggregates **net weight** from any `gradeData` key whose normalized label is in this set (hyphens are normalized to en-dashes, then lowercased / trimmed for matching):

| Underlying grade labels rolled into “Below 40” |
| --- |
| Below 25 |
| 25–30 |
| Below 30 |
| 30–35 |
| 30–40 |
| 35–40 |

### Synthetic “Above 50” group

Similarly, **`Above 50`** aggregates:

| Underlying grade labels rolled into “Above 50” |
| --- |
| 50–55 |
| Above 50 |
| Above 55 |

### Other grades

For any grade header that is not `Below 40` or `Above 50`, the numerator is simply `gradeData[gradeHeader].netWeightKg` (treated as `0` when building the ratio if missing).

---

## 2) “Output %” column (different base)

**Output %** is **not** “one grade ÷ total graded”. It compares **all graded net kg** on the row to **inbound** net weight.

### Formula

\[
\text{Output \%} = \frac{\sum \text{netWeightKg across all } \texttt{gradeData}}{\text{inbound net kg}} \times 100
\]

**Inbound net kg** (`getInboundNetWeightKgForReport`):

1. If **buy-back net weight** (`buyBackNetWeightKg`) is present and finite → use it.
2. Else if **`incomingNetWeightKg`** is present and finite → use it.
3. Else → **`null`** (no output %).

If inbound is **≤ 0**, output % is **`null`**.

Source: `getOutputPercentage` in `contract-farming-report-calculations.ts`.

---

## 3) Footer row: how % totals are shown

For columns whose ids start with the variety-level percent prefix (`VARIETY_LEVEL_PERCENT_COLUMN_PREFIX` + grade name), the footer does **not** sum raw cell values across rows.

Instead, the table:

1. Deduplicates rows to **one row per farmer account + variety** (`accountNumber|varietyName`).
2. Sums **graded net kg** for that grade (or synthetic group) across those rows using `getGradeNetWeightKg` (same numerators as per-row %).
3. Sums **total graded net kg** across the same rows using `getTotalGradeNetWeightKg`.
4. Shows **pooled** grade % = \((\sum \text{kg in band}) / (\sum \text{total graded kg}) \times 100\). If the pooled denominator is **≤ 0**, the footer shows **0**.

So the footer is a **single weight-based blend** across varieties, not an arithmetic mean of per-variety percentages.

**Net ₹/acre** in the footer is **total net amount ÷ total acres** (`roundMax2` after division): the same net sum as variety-level net amount logic over deduped rows, divided by the **Acres** column total when that column is visible, or otherwise by the sum of `sizeAcres` on filtered leaf rows. It is **not** the sum of each row’s ₹/acre.

**Avg quintal / acre** in the footer Total row is **total graded net kg ÷ 100 ÷ total planted acres** (`roundMax2`), i.e. portfolio quintals per acre using the same acres base as Net ₹/acre (sum of **Acres** column or leaf `sizeAcres`). It is **not** an arithmetic mean of each row’s quintal/acre.

**Output %** in the footer Total row is **pooled** \(\sum \text{graded kg} / \sum \text{inbound kg} \times 100\) over deduped farmer×variety rows with finite inbound > 0 (`getPooledOutputPercentage`), same inbound rule as per-row `getOutputPercentage`. It is **not** an arithmetic mean of row output %.

Source: `computeContractFarmingFooterTotals` in `contract-farming-report-footer-totals.ts`.

---

## 3b) Per acre footer row (below Total)

When total planted acres > 0, a second footer row **Per acre** appears (see `computeContractFarmingFooterTotals` in `contract-farming-report-footer-totals.ts`).

- **Additive columns** (qty, bags, kg, ₹ amounts, per-grade bags, etc.): **Total ÷ total planted acres** (same acres base as the Net ₹/acre total: visible **Acres** column sum, else sum of leaf `sizeAcres`).
- **Grade weight %** (`grade_weight_pct_*`): **Same as the Total row** (pooled weights are unchanged when normalizing by a common acres factor).
- **Output %** and **Avg quintal/acre**: **Same values as the Total row** (portfolio pooled output %; portfolio quintals per acre — no extra ÷ acres).
- **Net ₹/acre**: **Same as Total** (already portfolio net ÷ acres).
- **Acres column**: **`1`** (per one acre basis).
- **Wastage kg**: **Sum of per-variety wastage (finite values only) ÷ acres** (not the Total row’s average of row wastage).

Excel export appends the same **Per acre** row when acres > 0.

---

## 4) Display

Percentage cells are formatted with **`en-IN`** locale, typically **2 decimal places**, and a **`%`** suffix in the totals formatter for percent column ids.

---

## 5) Quick reference

| Metric | Numerator | Denominator | When null |
| --- | --- | --- | --- |
| Per-grade % | Net kg for grade / group | Sum of all graded net kg on row | Total graded net ≤ 0 |
| Footer per-grade % (totals row) | Sum of net kg in band over deduped varieties | Sum of total graded net kg over same rows | Pooled denominator ≤ 0 → footer **0** |
| Footer Output % (Total row) | Sum of graded net kg | Sum of inbound net kg (same rule as row) | No contributing rows with inbound > 0 → **0** |
| Footer Avg quintal/acre (Total row) | Total graded net kg ÷ 100 (quintals) | Total planted acres (same base as Net ₹/acre) | Acres ≤ 0 → **0** |
