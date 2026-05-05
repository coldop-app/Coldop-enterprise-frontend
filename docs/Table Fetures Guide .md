# Incoming Report Table Fetures Guide

This guide explains how TanStack Table features are implemented across:

- `src/components/analytics/incoming/report/incoming-report-table.tsx`
- `src/components/analytics/incoming/report/incoming-report-data-table.tsx`
- `src/components/analytics/incoming/report/columns.tsx`

## Architecture Overview

The table is split into three clear responsibilities:

- `columns.tsx`: Column schema, per-column sorting/filtering/aggregation behavior, formatting helpers, default order/visibility.
- `incoming-report-table.tsx`: Table state management + `useReactTable` configuration + data mapping + toolbar/filter actions.
- `incoming-report-data-table.tsx`: Rendering engine (header/body/footer), sorting UI, resize handles, grouped-row/aggregated-cell rendering, and row virtualization.

This separation is strong because behavior stays declarative in one place (`columns`) while rendering remains focused and reusable.

## Data Preparation Layer

Before table features run, API records are normalized into `IncomingReportRow` in `incoming-report-table.tsx`.

Important preprocessing:

- Converts nested API shape into flat row fields (`farmerName`, `createdByName`, `slipNumber`, etc.).
- Computes `netWeightKg` using precision-safe subtraction (`subtractWithPrecision`).
- Stores `netWeightPrecision` for accurate display and aggregation.
- Optional route-level status restriction via `enforcedStatus` + `normalizeStatusValue`.

Result: TanStack Table works on clean, predictable rows.

## Core TanStack Table Setup

`useReactTable` is created in `incoming-report-table.tsx` with:

- `data: filteredIncomingReportData`
- `columns: incomingReportColumns`
- `state`: controlled states for sorting, visibility, order, column filters, grouping, global filter
- row model pipeline:
  - `getCoreRowModel()`
  - `getFilteredRowModel()`
  - `getFacetedRowModel()`
  - `getFacetedUniqueValues()`
  - `getSortedRowModel()`
  - `getGroupedRowModel()`
  - `getExpandedRowModel()`
- `globalFilterFn: globalManualGatePassFilterFn`
- `getRowId: (row) => row.id`
- column resizing options (`columnResizeMode`, `columnResizeDirection`)

This means filtering, sorting, grouping, and expansion are all active in the same pipeline.

## Sorting

### How sorting state is managed

- State: `sorting` in `incoming-report-table.tsx`
- Controlled via `onSortingChange: setSorting`
- Sorting model: `getSortedRowModel()`

### How users trigger sorting

In `incoming-report-data-table.tsx`:

- Each header cell wrapper uses `onClick={header.column.getToggleSortingHandler()}`.
- Sort icons reflect state:
  - ascending: `ArrowUp`
  - descending: `ArrowDown`
  - unsorted: `ArrowUpDown` on hover

### Per-column sorting strategies

Defined in `columns.tsx` using `sortingFn`:

- `alphanumeric`: gate pass numbers and dates stored as display strings.
- `text`: text columns like farmer name, location, status, remarks.
- `basic`: numeric columns (`bagsReceived`, weight columns).

So sorting behavior is explicitly tuned per column type.

## Grouping and Expansion

### Grouping state

- State: `grouping` in `incoming-report-table.tsx`
- Controlled via `onGroupingChange: setGrouping`
- Group model enabled with `getGroupedRowModel()`
- Expansion enabled with `getExpandedRowModel()`

### Grouped row rendering

In `incoming-report-data-table.tsx`, each cell checks:

- `cell.getIsGrouped()`
- `cell.getIsAggregated()`
- `cell.getIsPlaceholder()`

For grouped cells:

- A button is rendered with `row.getToggleExpandedHandler()`.
- UI shows expand/collapse marker (`▶` / `▼`) and child count (`row.subRows.length`).

This gives tree-like grouped rows with manual expansion control.

## Aggregation

Aggregation is implemented strongly for `netWeightKg` in `columns.tsx`.

### Aggregation function

`aggregationFn` for `netWeightKg`:

- Reads leaf rows.
- Finds max precision among rows.
- Sums using scaled integer math (`Math.round(value * factor)`).
- Returns precision-safe aggregate.

### Aggregated cell display

`aggregatedCell` for `netWeightKg`:

- Recomputes with same precision-safe logic.
- Formats using Indian locale number formatting.

### Selective suppression for some aggregated cells

In `incoming-report-data-table.tsx`, aggregated display is intentionally suppressed for:

- `gatePassNo`
- `manualGatePassNumber`

These render `-` for aggregate rows to avoid misleading values.

## Column Filtering

There are two levels of filtering: per-column and global.

### Per-column filter behavior

Configured in `columns.tsx`:

- Most columns use `multiValueFilterFn`, which supports:
  - text contains (when filter value is a string)
  - multi-select inclusion (when filter value is `string[]`)
- `status` uses custom filter logic for array membership.

Table plumbing:

- State: `columnFilters` in `incoming-report-table.tsx`
- Controlled via `onColumnFiltersChange`
- Engine: `getFilteredRowModel()`

### Faceted filtering support

`getFacetedRowModel()` + `getFacetedUniqueValues()` are enabled in `useReactTable`.
This supports building rich filter UIs (like unique-value filter lists) in `ViewFiltersSheet`.

## Global Filtering

Global search is intentionally specialized:

- State: `globalFilter` in `incoming-report-table.tsx`
- Controlled via `onGlobalFilterChange`
- Input in toolbar labeled "Search manual gate pass…"
- `globalFilterFn` is `globalManualGatePassFilterFn` from `columns.tsx`

Behavior of `globalManualGatePassFilterFn`:

- If value is an advanced filter tree (`FilterGroupNode`), delegates to `evaluateFilterGroup`.
- Else does case-insensitive contains match on `manualGatePassNumber`.

So global filter supports both:

- simple search text
- advanced structured filter groups

## Column Visibility

### Defaults

`defaultIncomingReportColumnVisibility` in `columns.tsx` hides several columns initially:

- `farmerMobileNumber`
- `createdByName`
- `location`
- `gatePassNo`
- `grossWeightKg`
- `tareWeightKg`

### Runtime control

- State: `columnVisibility`
- Controlled via `onColumnVisibilityChange`
- Passed to `ViewFiltersSheet` for user configuration

This enables user-facing view customization without losing column definitions.

## Column Order

### Defaults

`defaultColumnOrder` in `columns.tsx` defines stable initial ordering.

### Runtime control

- State: `columnOrder`
- Controlled via `onColumnOrderChange`
- Managed through `ViewFiltersSheet`

This supports user reordering while preserving a defined fallback order.

## Column Resizing

Column sizing combines defaults, per-column constraints, and interactive handles.

### Table-level defaults

In `incoming-report-table.tsx`:

- default size: `170`
- min size: `120`
- max size: `550`

### Per-column overrides

In `columns.tsx`, several columns define custom `minSize`/`maxSize` and some fixed-size-like ranges.

### Resize interaction

In `incoming-report-data-table.tsx`:

- Each header has a right-edge resize handle.
- `onMouseDown` and `onTouchStart` use `header.getResizeHandler()`.
- Double-click calls `header.column.resetSize()`.
- If resize mode is `onEnd`, transform offset preview uses `columnSizingInfo.deltaOffset`.

### Resize mode and direction

State in `incoming-report-table.tsx`:

- `columnResizeMode`: defaults to `'onChange'`
- `columnResizeDirection`: defaults to `'ltr'`

Both are controlled via `ViewFiltersSheet`, so users can switch behavior and direction.

## Pagination

TanStack Table supports both client-side and server-side pagination. For this project, start with client-side pagination unless data size or API constraints require server-side pagination.

### Client-side pagination (recommended default)

Client-side pagination means the table receives all rows, and TanStack handles page slicing in the UI layer.

To enable it in `useReactTable`:

- add `getPaginationRowModel()` to the row-model pipeline
- control pagination state with `pagination` + `onPaginationChange`

```tsx
import {
  useReactTable,
  getCoreRowModel,
  getFilteredRowModel,
  getSortedRowModel,
  getPaginationRowModel,
} from '@tanstack/react-table'

const [pagination, setPagination] = useState({
  pageIndex: 0,
  pageSize: 10,
})

const table = useReactTable({
  data: filteredIncomingReportData,
  columns: incomingReportColumns,
  state: {
    sorting,
    columnVisibility,
    columnOrder,
    columnFilters,
    grouping,
    globalFilter,
    pagination,
  },
  onPaginationChange: setPagination,
  getCoreRowModel: getCoreRowModel(),
  getFilteredRowModel: getFilteredRowModel(),
  getSortedRowModel: getSortedRowModel(),
  getPaginationRowModel: getPaginationRowModel(),
})
```

If you only need custom defaults and do not need controlled state, use `initialState.pagination` instead.

Important: do not pass pagination in both `state` and `initialState`; controlled `state` overrides `initialState`.

### Pagination UI APIs

Useful TanStack APIs for pagination controls:

- `table.getCanPreviousPage()`, `table.getCanNextPage()`
- `table.firstPage()`, `table.previousPage()`, `table.nextPage()`, `table.lastPage()`
- `table.setPageIndex(index)`, `table.resetPageIndex()`
- `table.setPageSize(size)`, `table.resetPageSize()`
- `table.getPageCount()`, `table.getRowCount()`

Example controls:

```tsx
<Button onClick={() => table.firstPage()} disabled={!table.getCanPreviousPage()}>
  {'<<'}
</Button>
<Button onClick={() => table.previousPage()} disabled={!table.getCanPreviousPage()}>
  {'<'}
</Button>
<Button onClick={() => table.nextPage()} disabled={!table.getCanNextPage()}>
  {'>'}
</Button>
<Button onClick={() => table.lastPage()} disabled={!table.getCanNextPage()}>
  {'>>'}
</Button>
<select
  value={table.getState().pagination.pageSize}
  onChange={(e) => table.setPageSize(Number(e.target.value))}
>
  {[10, 20, 30, 40, 50].map((size) => (
    <option key={size} value={size}>
      {size}
    </option>
  ))}
</select>
```

### Auto reset behavior

By default, `pageIndex` resets to `0` when page-altering state changes (data/filter/sort/group changes). You can override with:

- `autoResetPageIndex: false`

If disabled, add your own guard logic to avoid landing on empty pages after filters or data updates.

### Server-side pagination (when needed)

Use server-side pagination when datasets become too large or API constraints require backend paging.

Key setup:

- set `manualPagination: true`
- do not use `getPaginationRowModel()` for server paging
- pass `rowCount` (or `pageCount`) so TanStack can compute total pages

```tsx
const table = useReactTable({
  data, // already paginated page from API
  columns,
  getCoreRowModel: getCoreRowModel(),
  manualPagination: true,
  rowCount: dataQuery.data?.rowCount,
})
```

## Row Virtualization (Performance Feature)

Implemented with `@tanstack/react-virtual` in `incoming-report-data-table.tsx`:

- `useVirtualizer` configured with:
  - `count: rows.length`
  - estimated row height `42`
  - overscan `8`
- Body uses absolute-positioned virtual rows with `translateY(virtualRow.start)`.
- Container height fixed (`560px`) and scrollable.

Why this matters:

- Large datasets render efficiently.
- Sorting/filtering/grouping still operate on logical row model; virtualization only affects DOM rendering.

## Totals Footer

Totals are not a built-in TanStack aggregate footer; they are custom computed from filtered rows:

- `filteredRows = table.getFilteredRowModel().rows`
- `totalsByColumn` computed in `incoming-report-table.tsx`
- Precision-aware totals for gross/tare/net
- Footer shown only when numeric columns are visible (`hasVisibleNumericTotals`)

Footer rendering in `incoming-report-data-table.tsx`:

- Sticky bottom footer.
- Widths synced with actual column sizes using `table.getColumn(columnId)?.getSize()`.
- First visible column shows `Total`, numeric columns show formatted totals.

This ensures totals respect current filters, visibility, and column resizing.

## State Control Summary

All major table feature states are controlled (not uncontrolled):

- `sorting`
- `columnVisibility`
- `columnOrder`
- `columnFilters`
- `grouping`
- `globalFilter`
- `pagination`
- `columnResizeMode`
- `columnResizeDirection`

This is important because controlled state makes integration with custom UI panels (`ViewFiltersSheet`) predictable and extensible.

## Feature Matrix (What is implemented here)

- Sorting: yes (column-level sort functions + clickable headers)
- Grouping: yes (group model + grouped row rendering + expand/collapse)
- Aggregation: yes (notably precision-safe `netWeightKg`)
- Column filtering: yes (multi-mode filter fn + faceting)
- Global filtering: yes (manual gate pass + advanced filter groups)
- Column visibility: yes (default hidden + runtime toggles)
- Column ordering: yes (default order + runtime reordering)
- Column resizing: yes (drag handles, reset, mode/direction controls)
- Row expansion: yes (for grouped rows)
- Pagination: ready to add with TanStack pagination row model + controls
- Row virtualization: yes (react-virtual integration)
- Custom totals footer: yes (filter-aware, resize-aware)

## Notes for Extension

If you extend this table later, keep these patterns:

- Add behavior in `columns.tsx` first (sorting/filter/aggregation definitions).
- Keep table state controlled in `incoming-report-table.tsx`.
- Keep rendering-only concerns in `incoming-report-data-table.tsx`.
- For new numeric aggregates, follow the existing precision-safe math approach.

