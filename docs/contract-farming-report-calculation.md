# Contract Farming Digital Table: Data Processing and Formulas

This document explains only data processing and calculations used by:

- `src/components/analytics/seed/ContractFarmingReportDigitalTable.tsx`
- `src/components/analytics/seed/ContractFarmingVarietyTable.tsx`
- `src/utils/contractFarmingReportShared.ts`

It intentionally skips UI rendering details.

---

## 1) Backend response shape used by the table

API: `GET /analytics/contract-farming-report`

Top-level payload:

- `data.byVariety: Record<string, ContractFarmingFarmerRow[]>`
  - key = variety name (for example, `"Kufri Jyoti"`)
  - value = farmer rows for that variety

Per farmer row (`ContractFarmingFarmerRow`) fields used:

- `id`
- `name`
- `address`
- `mobileNumber` (not displayed in this table)
- `accountNumber` (number or string; may be fractional like `50.1`)
- `acresPlanted`
- `totalSeedAmountPayable` (not used directly in this table's calculations)
- `generations: string[]`
- `sizes: Array<{ name, quantity, acres, amountPayable }>`
- `'buy-back-bags': Record<string, { bags, netWeightKg }>`
  - keyed by variety
- `grading: Record<string, Record<string, { initialBags, netWeightKg }>>`
  - supports two practical shapes:
    - flat: `size -> bucket`
    - nested: `variety -> size -> bucket`

---

## 2) Pre-processing before row calculations

## 2.1 Variety groups

Input for digital table is already grouped as:

- `[{ variety, rows }]`

From source data:

1. Sort varieties alphabetically.
2. For each variety, filter out farmers where all `sizes[].quantity <= 0`.
3. Sort farmers by account-family logic:
   - family key = `Math.floor(accountNumber)`
   - example: `50`, `50.1`, `50.2` are treated as same family for ordering/grouping

## 2.2 Size expansion

Each farmer becomes one or more table rows:

- if `sizes.length > 0`: one row per size line
- else: one row with `size = null`

Important: many post-seed metrics are farmer-level and repeated/merged across the farmer's size rows.

---

## 3) Which columns are backend vs computed

## 3.1 Directly from backend (or direct selection from backend arrays)

- `name` <- `farmer.name`
- `address` <- `farmer.address`
- `sizeName` <- `size.name`
- `seedBags` <- `size.quantity`
- grading bucket raw source <- `grading[*][*].initialBags`, `grading[*][*].netWeightKg`
- buy-back raw source <- `'buy-back-bags'[variety].bags`, `'buy-back-bags'[variety].netWeightKg`
- seed payable raw source <- `sizes[].amountPayable`
- acres raw source <- `sizes[].acres` and fallback `farmer.acresPlanted`
- generation raw source <- `generations[]`

## 3.2 Computed/derived in frontend

- `serial` (S. No.)
- `accountNumber` display normalization
- `acresPlanted` (per seed line chosen/fallback)
- `generation` (mapped per size-line index)
- `buyBackBags`
- `wtWithoutBardana`
- dynamic grading columns (`Below 25`, `25-30`, ..., `Cut`)
- `totalGradingBags`
- `below40Percent`
- `range40To50Percent`
- `above50Percent`
- `cutPercent`
- `netWeightAfterGrading`
- `buyBackAmount`
- `totalSeedAmount`
- `netAmountPayable`
- `netAmountPerAcre`
- `yieldPerAcreQuintals`
- footer total row values for all numeric columns
- family subtotal rows (for decimal-account families)
- digital table meta count: total displayed rows across varieties

---

## 4) Exact formulas (row-level)

Let current farmer = `f`, current report variety = `V`.

## 4.1 Account number and family key

- `parsedAccount = Number(accountNumber)` if finite, else null
- display account = parsed account as non-grouped decimal string
- family key = `Math.floor(parsedAccount)` when parseable

## 4.2 Acres planted (seed-line column)

For each expanded row with size `s`:

- if `s` exists and `s.acres` is finite:
  - `acresPlanted = s.acres`
- else:
  - `acresPlanted = f.acresPlanted` (or `0` if invalid)

## 4.3 Generation value per row

Given `generations = f.generations`, size-line index `i`:

1. if no generations -> `'—'`
2. if no sizes -> `generations.join(', ')`
3. if `generations.length === sizes.length` -> `generations[i]`
4. if single generation -> that same generation for every size line
5. otherwise fallback by index if available else `'—'`

## 4.4 Buy-back bags and "Wt. without bardana"

From `f['buy-back-bags']`, pick entry whose key matches `V` case-insensitively.

- `buyBackBags = matched.bags` else `0`/`—` depending on formatter context
- `wtWithoutBardana = matched.netWeightKg` else `0`/`—`

## 4.5 Grading map merge for current variety

`gradingBySize = mergeGradingSizeMapsForReportVariety(f, V)`

Behavior:

- if grading is flat (`size -> bucket`), use as-is (merged by identical size keys)
- if grading is nested (`variety -> size -> bucket`), include only subtree for variety `V`
- if duplicate same size appears under multiple branches, merge by sum:
  - `initialBags_sum`
  - `netWeightKg_sum`

## 4.6 Dynamic grading columns

Configured grading headers:

- `Below 25`
- `25-30`
- `Below 30`
- `30-35`
- `30-40`
- `35-40`
- `40-45`
- `45-50`
- `50-55`
- `Above 50`
- `Above 55`
- `Cut`

For each header `H`, match key variants (en-dash/hyphen tolerant), then:

- `grading[H] = matchedBucket.initialBags` else `0`/`—`

## 4.7 Total grading bags

- `totalGradingBags = Σ(initialBags over all entries in gradingBySize)`

## 4.8 Net weight after grading

- `netWeightAfterGradingKg = Σ(netWeightKg over all entries in gradingBySize)`

## 4.9 Percent bands (weight-based, not bag-count-based)

All percentages use net weight (`kg`) as numerator/denominator.

Bucket groups:

- Below 40 group = `{Below 25, 25-30, Below 30, 30-35, 30-40, 35-40}`
- 40-50 group = `{40-45, 45-50}`
- Cut group = `{Cut}`
- Above 50 group = all remaining configured headers (`50-55`, `Above 50`, `Above 55`)

Let:

- `W_total = Σ(netWeightKg over configured grading headers)`
- `W_below40`, `W_40_50`, `W_above50`, `W_cut` per groups above

Then:

- `below40Percent = (W_below40 / W_total) * 100`
- `range40To50Percent = (W_40_50 / W_total) * 100`
- `above50Percent = (W_above50 / W_total) * 100`
- `cutPercent = (W_cut / W_total) * 100`

If `W_total <= 0`, all four percentages are null/`—`.

## 4.10 Buy back amount

For each grading bucket used for `V`, compute:

- `bucketAmount = bucket.netWeightKg * buyBackRatePerKg(variety, sizeKey)`

Then:

- `buyBackAmount = Σ(bucketAmount)`

`buyBackRatePerKg` is looked up from `BUY_BACK_COST` by variety + size key (normalized key matching).

## 4.11 Total seed amount

- `totalSeedAmount = Σ(size.amountPayable for all sizes)`
- if no size lines: null/`—`

## 4.12 Net amount payable

- `netAmountPayable = (buyBackAmount ?? 0) - (totalSeedAmount ?? 0)`
- if both are null -> `—`

## 4.13 Net amount per acre

First, acres denominator for net-per-acre:

- `acresForNet = Σ(sizes[].acres where finite)`
- if this sum is `0`, fallback to `f.acresPlanted`

Then:

- `netAmountPerAcre = netAmountPayable / acresForNet`
- if `acresForNet <= 0` -> `—`

## 4.14 Yield per acre (quintals)

Uses grading net weight:

- `yieldPerAcreQuintals = netWeightAfterGradingKg / acresForNet / 100`

(`100 kg = 1 quintal`)

If `acresForNet <= 0`, result is `—`.

---

## 5) Footer totals (per variety table)

Footer totals are calculated once per farmer (not once per expanded size row), then formatted into footer columns.

For a variety `V`:

- `acresPlanted_total`
  - sum `sizes[].acres` when sizes exist, else fallback to `farmer.acresPlanted`
- `seedBags_total = Σ(sizes[].quantity)`
- `buyBackBags_total = Σ(aggregateBuyBackBagsForReportVariety(f, V).bags)`
- `buyBackNetWeightKg_total = Σ(...netWeightKg)`
- grading column totals:
  - for each grading header `H`: sum matched `initialBags` across farmers
- `totalGradingBags_total = Σ(farmer totalGradingBags)`
- `netWeightAfterGrading_total = Σ(farmer netWeightAfterGradingKg)`
- `buyBackAmount_total = Σ(farmer buyBackAmount)`
- `totalSeedAmount_total = Σ(farmer totalSeedAmount)`
- `netAmountPayable_total = Σ((buyBackAmount ?? 0) - (seedAmount ?? 0))`
- `netAmountPerAcre_total = netAmountPayable_total / Σ(resolveAcresForNetPerAcre(f))` (0 if denominator is 0)
- `yieldPerAcreQuintals_total = netWeightAfterGrading_total / acresPlanted_total / 100` (null if acres total is 0)

Footer percentage bands are recomputed from aggregated grading net weights (same weight-based formula as row-level).

---

## 6) Family subtotal rows

Inside each variety:

- farmers are grouped by `Math.floor(accountNumber)`
- if family has at least one decimal account member (for example `50.1`), a `Family total` row is inserted
- that row reuses the same totals calculator as footer, but only for that family's farmers

---

## 7) Row count shown by `ContractFarmingReportDigitalTable`

The summary text (`"X rows across Y varieties"`) is computed as:

For each variety group:

- expanded data rows count = `expandFarmerRowsForSizes(g.rows).length`
- family subtotal rows count = number of family groups with:
  - parseable family base key and
  - at least one decimal account member

Total:

- `totalRows = Σ(expandedRows + familySubtotalRows)` over all variety groups

---

## 8) Formatting and rounding rules

- Locale formatting: `en-IN`
- counts/bags: usually 0 decimal places
- kg values: typically up to 2 decimals
- currency-like amounts: 2 decimals
- percentage display: 2 decimals + `%`
- yield display: 2 decimals
- missing/unavailable values shown as `'—'`

---

## 9) Quick implementation checklist for another project

If you are rewriting this logic elsewhere, keep these invariants:

1. Group by variety from `byVariety`.
2. Filter farmers with no positive `sizes[].quantity`.
3. Sort by family account key (`floor(accountNumber)`), then exact account, then name.
4. Expand one row per size line but compute many post-seed metrics at farmer+variety scope.
5. Compute percentage columns from grading **netWeightKg**, not from bag counts.
6. Use buy-back rates by `(variety, size)` and sum `netWeightKg * rate`.
7. For per-acre metrics, denominator is sum of `sizes[].acres`, fallback to `farmer.acresPlanted`.
8. Compute footer/family totals once per farmer, not per expanded row.
