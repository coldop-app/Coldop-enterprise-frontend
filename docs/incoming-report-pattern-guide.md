# Incoming Report Pattern Guide

This guide documents the exact architecture used in `src/components/analytics/incoming/report` so other report modules can replicate the same approach consistently.

## Goal of This Pattern

The Incoming Report module is built as a **high-performance analytics table** with:

- server-driven data fetching with date filters
- client-side advanced filtering/grouping/sorting/column customization
- virtualized table rendering for large datasets
- aggregate footer totals

---

## Folder Architecture

`src/components/analytics/incoming/report`

- `incoming-report-table.tsx`: main orchestrator (UI + table state + fetch)
- `columns.tsx`: canonical row shape + base table columns metadata
- `view-filters-sheet/`
  - `index.tsx`: tabbed customization sheet
  - `logic-builder.tsx`: nested AND/OR filter builder UI
  - `primitives.tsx`: reusable UI atoms for sortable/filtering controls
  - `constants.ts`: filter operators, labels, column configs, defaults
  - `helpers.ts`: immutable nested filter/group mutation helpers
  - `types.ts`: contract types for the sheet

---

## File-by-File Responsibilities

## `incoming-report-table.tsx`

Acts as the **feature shell**.

- Fetches report data (`useGetIncomingGatePassReport`) with applied date filters.
- Normalizes backend rows into `IncomingReportRow` (including computed net weight precision-safe subtraction).
- Builds TanStack table with:
  - sorting
  - per-column filters
  - global advanced filter support (`FilterGroupNode`)
  - grouping/expansion
  - column sizing/ordering/visibility
- Uses `@tanstack/react-virtual` for row virtualization.
- Renders sticky header and sticky totals footer.
- Opens `ViewFiltersSheet` for advanced view customization.

### Key pattern here

The screen owns all state and passes down only controlled contracts to child modules.

---

## `columns.tsx`

Defines:

- `IncomingReportRow` (single source of truth for row model)
- baseline column definition list (`ColumnDef<IncomingReportRow>[]`)

This acts as the shared row schema foundation for the table.

---

## `view-filters-sheet/types.ts`

Defines strict prop interface (`ViewFiltersSheetProps`) and filter union types (`StatusFilterValue`, `FilterableColumnId`).

Pattern: keep UI module contracts explicit and independent from implementation details.

---

## `view-filters-sheet/constants.ts`

Contains:

- allowed filter operators
- display labels
- filterable column lists
- initial-state factories

Pattern: isolate config from logic; avoid scattering labels/operator maps inside render code.

---

## `view-filters-sheet/helpers.ts`

Utility functions for immutable nested updates:

- mutate specific filter tree node by id
- remove node recursively
- parse DnD synthetic ids for grouping order

Pattern: all tree mutations in testable pure helpers.

---

## `view-filters-sheet/primitives.tsx`

Reusable small components:

- sortable column row
- sortable grouping row
- grouping drop zone
- empty state
- section label

Pattern: split presentational components out of heavy container components.

---

## `view-filters-sheet/logic-builder.tsx`

Nested condition builder UI for advanced filters:

- supports group operator (AND/OR)
- nested groups and conditions
- field/operator/value editing
- datalist-backed value suggestions per field

Pattern: deeply interactive subsection isolated into memoized module.

---

## `view-filters-sheet/index.tsx`

Tabbed control center:

- Filters tab: status + value filters
- Columns tab: visibility and DnD order
- Grouping tab: active grouping order and available groupable columns
- Advanced tab: logic builder + column resize reset actions

It keeps a **draft state model** and only applies changes on “Save & Apply”.

Pattern: staged editing UX avoids accidental instant table mutation.

---

## End-to-End Data Flow

1. Fetch API data in `incoming-report-table.tsx`.
2. Normalize into `IncomingReportRow`.
3. User configures view in sheet (filters/columns/grouping/advanced logic).
4. Table computes visible sorted/grouped rows and footer totals from that state.

---

## Reusable Blueprint for New Reports

For a new report module (example: outgoing report), replicate this structure:

1. Create folder `src/components/analytics/<report>/report`.
2. Add:
   - `<report>-table.tsx`
   - `columns.tsx`
   - `view-filters-sheet/*`
3. Define report row contract in `columns.tsx`.
4. Build table orchestrator:
   - query hook integration
   - row normalization
   - TanStack state
   - virtualizer
   - totals/footer
5. Reuse view-filter-sheet model:
   - update filterable column ids/constants
   - keep draft/apply UX

---

## Implementation Rules to Keep Consistency

- Keep all number formatting and precision logic centralized in helper functions.
- Keep filter/group mutation helpers pure and recursive.
- Keep “draft vs applied” separation for complex filter panels.
- Keep sticky table header/footer and row virtualization for scalability.

---

## Copy-Paste Checklist (for any new report)

- [ ] Row type defined in `columns.tsx`
- [ ] API response normalized to row model
- [ ] TanStack table wired with sorting/filter/group/resize/order/visibility
- [ ] Virtualization enabled
- [ ] Totals calculation implemented for visible numeric columns
- [ ] `ViewFiltersSheet` integrated with draft/apply flow
- [ ] Global advanced filter supports `FilterGroupNode`
- [ ] Error handling and loading states polished

---

## Recommended Optional Refactor for Future Reports

If multiple reports will follow this pattern, create a shared internal toolkit:

- shared `report-table` hooks for totals/virtualization wiring
- shared `view-filters-sheet` with configurable column metadata
- shared number precision utilities

This will reduce duplication while preserving per-report customization.
