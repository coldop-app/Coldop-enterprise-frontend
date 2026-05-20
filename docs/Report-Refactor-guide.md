# Report Refactor Guide

This guide documents the standard TanStack Table file pattern to apply across all analytics reports, based on the working `incoming/report` refactor.

## Goal

Split large monolithic report-table files into:

1. **Container**: data fetching + orchestration
2. **Columns config**: schema + cell behavior + table constants
3. **Data table engine**: rendering + virtualization + table chrome

This keeps code easier to maintain and safer to evolve.

---

## Standard Folder Pattern

For each report module:

```text
src/components/analytics/<report>/report/
├── <report>-report-table.tsx          # Container
├── <report>-report-data-table.tsx     # Engine (rendering)
├── columns.tsx                        # Column definitions + constants
├── <report>-excel-button.tsx          # Export action
├── view-filters-sheet/                # Reused filter UI/logic
├── pdf/                               # PDF rendering helpers
└── pdf.worker.tsx                     # PDF generation worker
```

---

## Responsibilities by File

### 1) Container (`<report>-report-table.tsx`)

Owns:
- API hook calls (`useGet...Report`)
- date/search/filter toolbar state
- mapping API data -> report row type
- `useReactTable(...)` initialization
- wiring `ViewFiltersSheet`, excel button, pdf button

Avoids:
- large table markup
- column cell formatting logic

---

### 2) Columns (`columns.tsx`)

Owns:
- `<Report>Row` type
- `reportColumns` definition
- per-column behavior:
  - custom `filterFn`
  - `aggregationFn`
  - formatting/cell rendering
- default table constants:
  - `defaultColumnOrder`
  - `defaultColumnVisibility`
  - `numericColumnIds`
  - global filter type/function (if used by view filters)

---

### 3) Engine (`<report>-report-data-table.tsx`)

Owns:
- loading skeleton
- empty state
- virtualized body rendering
- sticky header/footer
- resize handles
- grouped and aggregated row display

Receives everything through props from container.

---

## Refactor Steps (Per Report)

1. **Extract engine file**
   - Move `<table>` rendering and virtualization out of container.

2. **Extract/normalize columns**
   - Move all column definitions and related helpers to `columns.tsx`.
   - Export constants needed by `ViewFiltersSheet` and totals logic.

3. **Simplify container**
   - Keep only orchestration concerns and feature wiring.

4. **Preserve existing behavior**
   - Do not change functional behavior of:
     - View Filters sheet
     - date apply/reset
     - global search
     - grouping/sorting/filtering
     - totals
     - excel/pdf export

5. **Delete unused files**
   - Remove stale helper/docs/components that are no longer imported.

6. **Validate**
   - `pnpm -s exec tsc --noEmit`
   - lint changed files
   - quick manual UI verification

---

## Suggested Refactor Order

1. `grading/report` (largest)
2. `storage/report`
3. `farmer-seed/report`

This order reduces risk: once grading is done, the same shape can be repeated quickly.

---

## Checklist Template

Copy this for each report:

```md
### <ReportName>
- [ ] Create `<report>-report-data-table.tsx`
- [ ] Move column schema + constants to `columns.tsx`
- [ ] Keep `<report>-report-table.tsx` as container only
- [ ] Ensure `ViewFiltersSheet` behavior unchanged
- [ ] Ensure export flows unchanged (excel/pdf)
- [ ] Remove unused files
- [ ] Run typecheck and lint
- [ ] Manual functional verification
```

