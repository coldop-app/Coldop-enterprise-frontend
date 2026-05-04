# Incoming report table — architecture for LLM context

This document describes how `incoming-report-table.tsx` loads data, applies filters, and uses **TanStack Table** (`@tanstack/react-table`) together with **TanStack Virtual** (`@tanstack/react-virtual`). Use it when extending filters, PDF export, grouping, or column behavior.

## File and role

- **Primary UI + table wiring:** `incoming-report-table.tsx` — builds column definitions with `createColumnHelper<IncomingReportRow>()` in this file.
- **Row type:** `columns.tsx` exports `IncomingReportRow`. The same file exports a simpler `columns: ColumnDef<IncomingReportRow>[]` used for PDF and other consumers; the interactive table does **not** import that array.
- **View / filters sheet:** `view-filters-sheet/index.tsx` — drafts UI state and commits to the table instance on **Save**.
- **Advanced predicate evaluation:** `@/lib/advanced-filters` — `FilterGroupNode`, `evaluateFilterGroup`, `isAdvancedFilterGroup`, `hasAnyUsableFilter`.

## Data pipeline (before TanStack Table)

1. **API:** `useGetIncomingGatePassReport({ fromDate, toDate }, { enabled: true })`.
2. **Date range (server-side):** Local state `fromDate` / `toDate` (picker strings). **Apply** parses with `toApiDate` and sets `appliedFromDate` / `appliedToDate`. The hook receives `fromDate`/`toDate` only when both applied values exist; otherwise `undefined` (wide/unscoped fetch depending on backend).
3. **Row shaping:** `useMemo` maps API items to `IncomingReportRow[]` (`incomingReportData`) — display strings, nested joins flattened (farmer name, weights, net with precision, etc.).
4. **Optional prop filter:** If `enforcedStatus` is set, `filteredIncomingReportData` filters rows by normalized status **before** passing data to the table (not a TanStack filter).

**TanStack Table `data` prop:** `filteredIncomingReportData`.

## TanStack Table — configuration summary

Table instance: `useReactTable<IncomingReportRow>({ ... })`.

### Stable row identity

- `getRowId: (row) => row.id` — stable keys for selection, expansion, virtualization.

### Controlled state (React `useState` + setters)

| State | Purpose |
|--------|---------|
| `sorting` | Column sort order/direction |
| `columnVisibility` | Show/hide columns |
| `columnOrder` | Column order |
| `columnFilters` | Per-column filter values (facets / multi-select / status) |
| `grouping` | Grouped column ids |
| `globalFilter` | **Either** a search string (manual gate pass) **or** a `FilterGroupNode` (advanced logic builder) |
| `columnResizeMode` / `columnResizeDirection` | Resize behavior |

Corresponding `on*` handlers wire state into `useReactTable`.

### Row models (pipeline order conceptually)

- `getCoreRowModel()`
- `getFilteredRowModel()` — applies `columnFilters` + `globalFilter` via column/global filter fns
- `getFacetedRowModel()` / `getFacetedUniqueValues()` — used by the view sheet to build distinct values for filter UIs
- `getSortedRowModel()`
- `getGroupedRowModel()` / `getExpandedRowModel()` — grouping with expand/collapse

### Default column sizing

`defaultColumn` sets `size`, `minSize`, `maxSize` for columns that do not override.

## How filters are applied

### 1) Column filters (`columnFilters` + `filterFn` per column)

Most accessor columns use **`multiValueFilterFn`**:

- If filter value is a **string:** treat as case-insensitive substring match on `String(row.getValue(columnId))`.
- If filter value is a **string[]:** row passes if **empty array** (no filter) or cell string is **included** in the array (multi-select / “faceted” style).

**Status column** uses a dedicated `filterFn`: array of status strings; empty array = no filter; otherwise `filterValue.includes(statusValue)`.

The **View Filters** sheet **Save** action (`handleApplyView`):

- Sets `status` column filter to `undefined` when all statuses selected (clears filter), else the selected subset.
- For each **filterable** column (see `view-filters-sheet/constants.ts` — `filterableColumns`), sets filter to `undefined` when selection equals full facet list, else the selected value array.

So: **column filters = multi-select OR substring**, driven from sheet + TanStack’s filtered row model.

### 2) Global filter (`globalFilter` + `globalFilterFn`)

**`globalManualGatePassFilterFn`** is registered as `globalFilterFn`:

- If `globalFilter` is a **`FilterGroupNode`** (`isAdvancedFilterGroup`): evaluates **`evaluateFilterGroup(row.original, filterValue)`** — row-level advanced logic (AND/OR groups, operators on fields defined in `@/lib/advanced-filters`). This does **not** use TanStack’s default string global filter; the whole predicate is custom.
- Otherwise treats `globalFilter` as a **string**: trim/lowercase substring match on `row.original.manualGatePassNumber` (with `'-'` fallback).

**Toolbar search input:** bound so the displayed value is the string form when `globalFilter` is a string; typing updates **`setGlobalFilter`** with a string (quick search on manual gate pass). If the user saves an **advanced** logic tree from the sheet, `globalFilter` becomes an object — the input shows `''` in that branch of the code (`typeof globalFilter === 'string' ? globalFilter : ''`), so advanced mode and simple string search are mutually exclusive in practice once advanced is applied.

**View Filters — Advanced tab:** On Save, if `hasAnyUsableFilter(draftLogicFilter)`, **`table.setGlobalFilter(draftLogicFilter)`**; if the tree has no usable conditions and the previous global filter was advanced, **`setGlobalFilter('')`** clears it.

### 3) Date and status outside TanStack

- **Date:** API query params only (not `columnFilters`).
- **`enforcedStatus`:** Pre-filter array before `useReactTable` (parent-controlled slice).

## Rendering and performance

- **Virtualized body:** `useVirtualizer` from `@tanstack/react-virtual` with `count: rows.length` (row model rows), `getScrollElement` → table container ref, `estimateSize: 42`, optional `measureElement` (skipped on Firefox).
- **Layout:** CSS grid on `<table>` with explicit widths from `header.getSize()` / `cell.column.getSize()`; sticky header/footer; column resize handles on headers.
- **Grouped rows:** Cells use `getIsGrouped()`, `getIsAggregated()`, `getIsPlaceholder()`; grouped cells toggle expand; some aggregated cells suppressed for gate pass columns (`-`).

## Aggregations

- **`netWeightKg`** column defines `aggregationFn` and `aggregatedCell` for correct summed net with per-row precision (scaled integer sum pattern).

## Footer totals

- **`totalsByColumn`** is computed in a `useMemo` by iterating **`table.getFilteredRowModel().rows`** (not core rows) — sums bags/weights with max precision for display. Shown when numeric columns are visible (`numericColumnIds`).

## PDF export

- **`buildPdfWorkerPayload`:** Uses **`getSortedRowModel().rows`** (sorted order), **`getVisibleLeafColumns()`** ids, **`grouping`**, cold storage name, timestamp.
- **`getLeafRowsForPdf`:** Flattens grouped rows to leaf `IncomingReportRow[]` for the worker.

## View Filters sheet ↔ table API

The sheet receives **`table`** (TanStack `Table<IncomingReportRow>` instance) and calls imperative APIs:

- `table.setColumnVisibility`, `setColumnOrder`, `setGrouping`
- `table.getColumn(id)?.setFilterValue(...)`
- `table.setGlobalFilter(...)` for advanced tree or clear
- Reset: `resetColumnFilters`, `setGlobalFilter('')`, `setGrouping([])`, `setSorting([])`, `resetColumnSizing`, etc.

Draft state syncs from `table.getState()` when the sheet opens (`syncDraftFromTable`).

## Mental model for an LLM

1. **Narrow data on the server** with the date range + optional parent `enforcedStatus`.
2. **TanStack Table** holds all client-side interactive state (sort, visibility, order, filters, grouping, global filter, sizing).
3. **Filtered row set** = `getFilteredRowModel()` = column filter fns + global filter fn.
4. **Facets** for the sheet come from faceting APIs on the same table instance.
5. **Advanced filters** piggyback on **`globalFilter`** as a structured tree, not as an extra TanStack feature.
6. **Virtualizer** renders only visible rows; indices index into **`table.getRowModel().rows`**.

## Related packages

- `@tanstack/react-table` — table state, column defs, filter/sort/group models, `flexRender`.
- `@tanstack/react-virtual` — windowed rows inside the scroll container.
