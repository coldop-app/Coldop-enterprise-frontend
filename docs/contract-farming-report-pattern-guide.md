# Contract Farming Report Pattern Guide

This guide documents the architecture used in `src/components/analytics/contract-farming/report`, centered on `contract-farming-report-table.tsx`. It complements [docs/incoming-report-pattern-guide.md](./incoming-report-pattern-guide.md): the same broad ideas (TanStack Table, view-filters sheet, advanced filters, footer totals) apply, but this report adds **dynamic grading columns**, **HTML `rowspan` grouping** for farmer and variety, and a **two-level header** (Buy back / Grading groups).

---

## Goal of This Module

A **wide contract-farming analytics table** that:

- loads report data from the store-admin API (`useGetContractFarmingReport`)
- normalizes API payloads into a flat **one row per seed size line** model (`FlattenedRow`)
- builds **grade-dependent columns** from discovered grades (bags + weight % per grade, totals, wastage, output %, amounts)
- uses TanStack Table for **sorting, filtering, column order, visibility, and resize**
- applies **visual rowspan** for farmer / variety cells (without using TanStack’s `grouping` row model, so leaf columns stay sortable)
- shows **aggregate footer** cells aligned with visible columns
- opens **`ContractFarmingViewFiltersSheet`** for filters, column layout, resize mode, and rowspan toggles

The toolbar also includes a **Pdf** button (presentational in the current tree; wire-up is separate from the table data pipeline).

---

## Folder Architecture

`src/components/analytics/contract-farming/report`

- `contract-farming-report-table.tsx`: main UI shell, TanStack wiring, custom header/body/footer rendering, `renderCfBodyCellContent` / `ContractFarmingReportBodyRow`
- `types.ts`: `FlattenedRow` — canonical flattened row shape for the grid
- `columns.tsx`: `buildColumns`, column id constants (grading prefixes, buy-back ids, numeric sort ids, layout version for cache busting)
- `contract-farming-report-calculations.ts`: `normalizeReportData`, `flattenRows`, `buildGradeHeaders`, grade grouping/order, `recomputeRowSpans`, `RenderRow`, and per-cell metric helpers (totals, wastage, net amount, buy-back amount from prefs, etc.)
- `contract-farming-footer-totals.ts`: `formatContractFarmingFooterRow` and related rollup helpers for footer strings
- `view-filters-sheet/`
  - `index.tsx`: `ContractFarmingViewFiltersSheet` (table-bound filters and layout)
  - `logic-builder.tsx`, `primitives.tsx`, `helpers.ts`, `constants.ts`, `types.ts`: same pattern as other reports — operators, labels, draft/apply, advanced filter tree

---

## Data Pipeline (End to End)

1. **Fetch**: `useGetContractFarmingReport()` supplies raw report data (loading / error / refetch exposed on the shell).
2. **Normalize**: `normalizeReportData(data)` produces structured farmers + metadata (e.g. `allGrades`).
3. **Grade headers**: `buildGradeHeaders(report.meta.allGrades)` dedupes, maps bag-size labels into display groups (e.g. “Below 40” / “Above 50” rollups), and sorts for stable column order.
4. **Flatten**: `flattenRows(report.farmers)` yields `FlattenedRow[]` — one logical grid row per farmer × variety × **size** line, with `gradeData`, buy-back fields, variety-level rollups used by accessors.
5. **Columns**: `buildColumns(gradeHeaders)` returns `ColumnDef<FlattenedRow>[]` including dynamic ids such as variety-level bag columns (`VARIETY_LEVEL_COLUMN_PREFIX` + grade) and percent columns (`VARIETY_LEVEL_PERCENT_COLUMN_PREFIX` + grade).
6. **Table state**: `useReactTable` runs on `flattenedRows` with hoisted row models (`getCoreRowModel`, `getFilteredRowModel`, `getSortedRowModel`) plus faceting plugins.
7. **Sort + filter**: User sorting and filters apply to the flat row model; `sortedRowModel.rows` → `dataRows` (`FlattenedRow[]`).
8. **Rowspan overlay**: `recomputeRowSpans(dataRows, { groupByFarmer, groupByVariety })` returns `RenderRow[]` (`FlattenedRow` + `farmerRowSpan`, `varietyRowSpan`, first-row flags, block-start flags for borders).
9. **Render**: The component maps `renderedRows` to `ContractFarmingReportBodyRow`, which calls `renderCfBodyCellContent` per visible column — **not** `flexRender` from TanStack — so each cell can emit `rowSpan` / `null` for spanned-out cells.
10. **Footer**: `formatContractFarmingFooterRow(dataRows, visibleColumnIds)` returns per-column display strings; one footer `<tr>` mirrors visible columns.

---

## `contract-farming-report-table.tsx` Responsibilities

### State owned by the shell

- **Global filter**: `string | FilterGroupNode` — plain text search (deferred via `useDeferredValue` for the string path) or advanced tree evaluated with `evaluateFilterGroup` / `isAdvancedFilterGroup` from `@/lib/advanced-filters`.
- **Sorting, column filters, visibility, order**: standard TanStack controlled state.
- **`rowSpanGrouping`**: local `GroupingState`-shaped value `['farmer', 'variety']` by default — **only** drives `recomputeRowSpans`; it is **not** passed to `useReactTable`’s `grouping` (comment in code: rowspan is UI-only so grading leaf columns remain sortable).
- **Column resize mode / direction**: user-tunable; affects table wrapper `direction` and resize handle behavior.

### Rebuild triggers

- **`buyBackCostPrefsKey`**: `JSON.stringify` of store preferences `custom.buyBackCost` from `usePreferencesStore`. Included in the `useMemo` deps for `buildColumns` so when cold-storage buy-back rates change, column accessors refresh (columns read prefs inside accessors).
- **`CONTRACT_FARMING_GRADING_COLUMN_LAYOUT_VERSION`**: bumps `defaultColumnOrder` memo when grading tail column ordering changes without grade set changes.

### `cfGlobalFilterFn`

- If the filter is an advanced group, delegates to `evaluateFilterGroup(row.original, filterValue)`.
- Else lowercases a fixed list of string fields on `FlattenedRow` (farmer name, address, mobile, variety, generation, size, account).

### Custom rendering vs TanStack defaults

- **Header**: Two `<tr>` rows — first row uses `rowSpan={2}` for leading base columns and trailing “two-row header” ids; `colSpan` for **Buy back** and **Grading**; second row expands buy-back leaf headers and per-grade / aggregate grading headers. Sort UI is built manually via `renderLeafSortHeader` (clicks toggle sort; icons for asc/desc/unsorted).
- **Body**: Fully custom `<td>` output from `renderCfBodyCellContent` keyed by `columnId` — handles farmer/address/mobile with `rowSpan={row.farmerRowSpan}` only on `isFirstFarmerRow`; variety and variety-level metrics with `rowSpan={row.varietyRowSpan}` only on `isFirstVarietyRow`; per-size columns on every row; buy-back block styling (`bg-green-50`) where applicable.
- **Footer**: Single row; numeric alignment and buy-back background match body rules.

### Performance notes

- Row body is wrapped in `React.memo` (`ContractFarmingReportBodyRow`).
- Stable `getRowId`: `cfGetRowId` → `row.rowId`.
- This report **does not** use `@tanstack/react-virtual`; all rendered rows are mapped in the DOM (acceptable when row counts are bounded; if growth is expected, the incoming virtualizer pattern is the reference).

---

## Supporting Modules (Concise)

### `types.ts`

Defines `FlattenedRow`: stable `rowId`, identity fields, size line metrics, `gradeData` map, buy-back / incoming weights, and variety-level aggregates used by formulas.

### `columns.tsx`

Single place for **column id constants** (prefixes, special ids like `TOTAL_GRADED_BAGS_COLUMN_ID`, `BUY_BACK_COLUMN_IDS`, `TRAILING_TWO_ROW_HEADER_COLUMN_IDS`), `isNumericSortColumnId`, `buildContractFarmingGradingLeafColumnIds`, and `buildColumns(gradeHeaders)` returning TanStack column definitions (accessors, headers, enableSorting, filterFns where needed).

### `contract-farming-report-calculations.ts`

- **Domain normalization** from API types to internal trees.
- **`buildGradeHeaders`**: ordering and grouping of grade labels for headers and dynamic column ids.
- **`flattenRows`**: expansion to `FlattenedRow[]`.
- **`recomputeRowSpans`**: pure function from sorted flat rows + `{ groupByFarmer, groupByVariety }` to `RenderRow[]`.
- **Metric helpers**: `formatNumber`, bags/weights per grade, totals, wastage, output %, net rupees per acre, buy-back amount using preference-backed rates, etc. (shared by cells and footer).

### `contract-farming-footer-totals.ts`

`formatContractFarmingFooterRow` (and `buildContractFarmingRollupCellMap` for grouped rollups): sums size-level columns across all filtered rows; for variety-level aggregates, **dedupes by farmer × variety** so multi-size lines do not double-count variety-level metrics — same rules documented in file comments.

### `view-filters-sheet/`

Same staged **draft vs apply** pattern as the incoming report: filters, columns, advanced logic builder, plus contract-farming–specific controls (rowspan grouping, column resize mode/direction) passed as props from the table shell.

---

## Design Choices Worth Preserving

1. **Keep TanStack `grouping` off** for farmer/variety rowspan — use a separate `rowSpanGrouping` state + `recomputeRowSpans` so dynamic grade columns stay first-class sortable columns.
2. **Centralize numbers** in `contract-farming-report-calculations.ts` (and footer module) so body and footer stay consistent.
3. **Explicit `defaultColumnOrder`** and effect that merges user order with newly added column ids when grade set or layout version changes — avoids first-paint column order drift vs grading sequence.
4. **Preference-driven columns**: when store prefs affect accessors, include a **serializable cache-bust key** in column `useMemo` deps (not only `gradeHeaders`).

---

## Copy-Paste Checklist (New Similar Report)

- [ ] Flat row type in `types.ts` (one logical line per grid row)
- [ ] API normalize + flatten in a dedicated calculations module
- [ ] `buildColumns` accepts dynamic header list if columns are data-driven
- [ ] `useReactTable` with stable row id, hoisted row models where applicable
- [ ] Global filter: string + optional `FilterGroupNode` + `cfGlobalFilterFn` pattern
- [ ] If using rowspan: pure `recomputeRowSpans` + render path that returns `null` for non-leader cells
- [ ] Footer formatter keyed by visible column ids, with dedupe rules for rolled-up metrics
- [ ] View filters sheet with draft/apply and table props (`table`, `defaultColumnOrder`, etc.)

---

## Related Reading

- [docs/incoming-report-pattern-guide.md](./incoming-report-pattern-guide.md) — virtualization-first variant of the same “report shell + sheet + TanStack” approach.
