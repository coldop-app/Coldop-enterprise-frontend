# Report Refactor Guide

This guide standardizes how analytics report tables should be refactored to a clean TanStack Table architecture, following the same pattern used in `incoming/report`.

---

## Target Pattern (Triad + Feature Files)

Each report should follow this structure:

```text
src/components/analytics/<report>/report/
├── <report>-report-table.tsx            # Container (data + orchestration)
├── <report>-report-data-table.tsx       # Table engine (render + virtualization)
├── columns.tsx                          # Column schema + table constants/helpers
├── <report>-excel-button.tsx            # Export feature (if applicable)
├── view-filters-sheet/                  # Existing filter UI + logic (reuse)
└── pdf/ + pdf.worker.tsx                # Existing PDF feature (reuse)
```

---

## Responsibility Split

### 1) Container: `<report>-report-table.tsx`

- Owns API data fetching and top-level UI state.
- Builds row model from API response.
- Owns toolbar controls (date filters, search, refresh, export triggers, view filters open state).
- Creates and configures `useReactTable(...)`.
- Passes table instance and computed UI data to the engine component.

Keep here:
- `useGet...Report(...)` hooks
- date/apply/reset logic
- global search input state
- table state (`sorting`, `columnVisibility`, `columnOrder`, `grouping`, etc.)
- export payload builders (excel/pdf inputs)

Do not keep here:
- bulky `columns` definitions
- heavy header/body/footer rendering markup

---

### 2) Configuration: `columns.tsx`

- Defines row type (`<Report>Row`).
- Defines and exports column array (`<report>Columns`).
- Holds column-level logic:
  - formatting
  - custom `filterFn`
  - `aggregationFn`
  - status badges / cell displays
- Exports reusable table constants:
  - `defaultColumnOrder`
  - `defaultColumnVisibility`
  - `numericColumnIds`
  - global filter function/type if needed by View Filters sheet

Keep this file as the single source of truth for:
- "what columns exist"
- "how each cell behaves"

---

### 3) Engine: `<report>-report-data-table.tsx`

- Receives `table` and precomputed values as props.
- Handles rendering only:
  - loading skeleton
  - empty state
  - virtualized rows
  - sticky header/footer
  - resize handles
  - grouped/aggregated cells
- Avoids business logic and API concerns.

---

## Refactor Workflow (Per Report)

1. **Create engine component**
   - Move table markup and virtualization from old monolithic file.
   - Parameterize via props.

2. **Normalize `columns.tsx`**
   - Move all column definitions from monolith.
   - Export constants and helper formatters.
   - Keep advanced filter compatibility if report uses View Filters sheet.

3. **Slim container**
   - Keep data fetch + mapping + table orchestration.
   - Wire toolbar actions and pass props to engine.

4. **Preserve feature modules**
   - Reuse existing:
     - `view-filters-sheet/*`
     - `pdf/*`
     - `*.worker.tsx`
     - `*-excel-button.tsx`
   - Only move code when necessary.

5. **Delete unused files**
   - Remove stale docs or legacy table fragments no longer referenced.

6. **Validate**
   - Typecheck (`pnpm -s exec tsc --noEmit`)
   - Lint changed paths
   - Manual quick UI pass for:
     - sorting/grouping/filtering
     - date apply/reset
     - view filters reset/apply
     - excel/pdf export
     - totals row and sticky behavior

---

## Naming Conventions

- Use report-specific names for clarity:
  - `grading-report-table.tsx`
  - `grading-report-data-table.tsx`
  - `columns.tsx`
- Export names should be explicit:
  - `GradingReportRow`
  - `gradingReportColumns`
  - `defaultGradingReportColumnVisibility`

---

## Migration Checklist Template

Copy this block per report:

```md
### <ReportName> Report

- [ ] Extract table engine file (`<report>-report-data-table.tsx`)
- [ ] Move columns + table constants to `columns.tsx`
- [ ] Keep only container concerns in `<report>-report-table.tsx`
- [ ] Verify View Filters sheet behavior remains identical
- [ ] Verify Excel export works
- [ ] Verify PDF export works
- [ ] Remove unused legacy files
- [ ] Run typecheck
- [ ] Run lint for changed files
- [ ] Manual UI verification complete
```

---

## Recommended Order for Remaining Reports

1. `grading/report`
2. `storage/report`
3. `farmer-seed/report`

This order is recommended because they are larger and most similar to the incoming report complexity.

