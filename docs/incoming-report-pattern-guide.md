# Incoming Report Pattern Guide

This guide documents the exact architecture used in `src/components/analytics/incoming/report` so other report modules can replicate the same approach consistently.

## Goal of This Pattern

The Incoming Report module is built as a **high-performance analytics table + export system** with:

- server-driven data fetching with date filters
- client-side advanced filtering/grouping/sorting/column customization
- virtualized table rendering for large datasets
- aggregate footer totals
- worker-based PDF generation (non-blocking UI)
- PDF output that mirrors current table state (visible columns, grouping, sorting, filtered rows)

---

## Folder Architecture

`src/components/analytics/incoming/report`

- `incoming-report-table.tsx`: main orchestrator (UI + table state + fetch + PDF trigger)
- `columns.tsx`: canonical row shape + base table columns metadata
- `pdf.worker.tsx`: isolated worker runtime for PDF rendering
- `pdf/`
  - `incoming-report-table-pdf.tsx`: document composition
  - `pdf-prepare.ts`: transforms table rows into printable grouped/summary structures
  - `header.tsx`: reusable PDF cover/header/footer primitives
  - `content.tsx`: tabular PDF body rendering
  - `summary.tsx`: summary page rendering
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
- Generates PDF by sending current state payload to a web worker.

### Key pattern here
The screen owns all state and passes down only controlled contracts to child modules.

---

## `columns.tsx`

Defines:

- `IncomingReportRow` (single source of truth for row model)
- baseline column definition list (`ColumnDef<IncomingReportRow>[]`)

This acts as the shared row schema foundation for table and PDF transformation logic.

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

## `pdf.worker.tsx`

Runs PDF generation off main thread.

- lazy imports React + `@react-pdf/renderer` + PDF components
- registers font once
- receives payload from UI
- prepares report data
- renders PDF blob
- returns success/error message

Pattern: heavy PDF work in worker to preserve table interaction smoothness.

---

## `pdf/pdf-prepare.ts`

Core transformation engine for print output:

- maps visible column ids -> printable column metadata
- prepares display-ready rows and column totals
- computes grouped sections recursively from grouping selection
- builds summary datasets:
  - by variety
  - by farmer
  - overall
- preserves numeric precision for weight math

Pattern: keep PDF transform logic independent from render layer.

---

## `pdf/incoming-report-table-pdf.tsx`

Document assembly:

- cover page
- summary page
- content table page

Pattern: composition-first entrypoint; no data logic here.

---

## `pdf/header.tsx`

Reusable fixed PDF blocks:

- run header (org / powered by)
- page number
- cover block with logo + report metadata
- divider

Pattern: visual branding/layout primitives reused across pages.

---

## `pdf/content.tsx`

Tabular content renderer:

- grouped/non-grouped sections
- weighted width columns
- zebra rows
- section totals row
- empty-state handling

Pattern: render-only component that consumes pre-shaped `PreparedIncomingReportPdf`.

---

## `pdf/summary.tsx`

Summary page with reusable summary table primitive:

- variety-wise totals
- farmer-wise totals
- overall totals

Pattern: generic summary table helper reused with different datasets.

---

## End-to-End Data Flow

1. Fetch API data in `incoming-report-table.tsx`.
2. Normalize into `IncomingReportRow`.
3. User configures view in sheet (filters/columns/grouping/advanced logic).
4. Table computes visible sorted/grouped rows.
5. PDF button builds payload from **current table state**.
6. Worker receives payload and runs `prepareIncomingReportPdf`.
7. Worker renders React-PDF document to blob.
8. UI opens PDF in new tab.

---

## Reusable Blueprint for New Reports

For a new report module (example: outgoing report), replicate this structure:

1. Create folder `src/components/analytics/<report>/report`.
2. Add:
   - `<report>-table.tsx`
   - `columns.tsx`
   - `view-filters-sheet/*`
   - `pdf.worker.tsx`
   - `pdf/*`
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
6. Build `pdf-prepare.ts` as report-specific mapper and summarizer.
7. Keep PDF modules split into:
   - composition
   - header/branding
   - content
   - summary
8. Use worker for PDF generation (copy incoming implementation pattern).

---

## Implementation Rules to Keep Consistency

- Keep all number formatting and precision logic centralized in helper functions.
- Keep interactive logic out of PDF components.
- Keep filter/group mutation helpers pure and recursive.
- Keep “draft vs applied” separation for complex filter panels.
- Keep sticky table header/footer and row virtualization for scalability.
- Keep worker lifecycle clean (terminate worker, revoke object URLs).

---

## Copy-Paste Checklist (for any new report)

- [ ] Row type defined in `columns.tsx`
- [ ] API response normalized to row model
- [ ] TanStack table wired with sorting/filter/group/resize/order/visibility
- [ ] Virtualization enabled
- [ ] Totals calculation implemented for visible numeric columns
- [ ] `ViewFiltersSheet` integrated with draft/apply flow
- [ ] Global advanced filter supports `FilterGroupNode`
- [ ] PDF button builds payload from current table view state
- [ ] Worker-based PDF rendering implemented
- [ ] `pdf-prepare.ts` maps rows, grouped sections, summary totals
- [ ] PDF document assembled with cover + summary + content
- [ ] Error handling and loading states polished

---

## Recommended Optional Refactor for Future Reports

If multiple reports will follow this pattern, create a shared internal toolkit:

- shared `report-table` hooks for totals/virtualization wiring
- shared `view-filters-sheet` with configurable column metadata
- shared PDF header/footer primitives
- shared number precision utilities

This will reduce duplication while preserving per-report customization.
