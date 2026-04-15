# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.53.0] - 2026-04-15

### Added
- Analytics **Dispatch** tab: nikasi (dispatch) **summary** by variety and size — `DispatchAnalyticsScreen`, `DispatchSummaryTable`, and React Query hook **`useGetNikasiGatePassSummary`** for GET `/analytics/nikasi-summary` (optional `dateFrom` / `dateTo`); types `NikasiGatePassSummaryData` and related shapes in `analytics.ts`
- Analytics **Refresh** now also invalidates the nikasi gate pass summary query

### Changed
- Analytics layout and tab wiring updated for the Dispatch tab alongside Seed, Incoming, Grading, Storage, and Outgoing
- Daybook **Dispatch** tab and **nikasi voucher**: small UX/copy adjustments for dispatch listings
- **Nikasi edit sheet** (daybook): size and variety rows use **`SearchSelector`** backed by grading sizes and potato varieties, with support for values not in the standard lists; new rows default to the first grading size instead of an empty string
- Farmer profile **farmer seed** details dialog refactored for clearer structure; **`farmerProfileReportHelpers`** extended to support report flows

## [0.52.0] - 2026-04-14

### Added
- Analytics now includes a dedicated **Seed** tab with contract-farming table search plus report export actions (PDF/Excel) moved from Daybook seed view
- Analytics tab selection now persists via local storage (`analytics-active-tab`)

### Changed
- Daybook **Seed** tab now focuses on farmer seed voucher browsing and search, while contract-farming report tooling is handled in Analytics
- Contract farming PDF rows now render stable serial numbers per expanded row

### Removed
- Removed the standalone `/store-admin/farmer-seed-history` route/screen and its topbar navigation entry

## [0.51.0] - 2026-04-14

### Added
- Daybook seed tab now shows grouped farmer seed vouchers, including account-level grouping and voucher rendering via the new `FarmerSeedVoucher` component
- Daybook tab header now uses mobile-friendly Lucide icons and persists the active tab (`daybook-active-tab`) in local storage

### Changed
- Daybook data flow moved from centralized parent-state orchestration to tab-local state in `Incoming`, `Grading`, `Storage`, and `Dispatch`, with each tab handling its own search, sorting, pagination, and refresh actions
- Daybook and sidebar navigation active-path behavior now treats `/store-admin/farmer-seed` as part of Daybook instead of People

### Removed
- Deleted unused store file `src/stores/useBearStore.ts`

## [0.50.0] - 2026-04-14

### Added
- Daybook: debounced search by gate pass number on **Incoming**, **Grading**, **Storage**, and **Dispatch** (nikasi) tabs, switching to search API results when the user types a number
- Store admin React Query hooks for gate-pass-by-number search: `useSearchIncomingGatePassNumber`, `useSearchGradingGatePassNumber`, `useSearchStorageGatePass`, and `useSearchNikasiGatePass`
- Contract farming contract report: **Address** column in the digital table and in the Excel export (merge column index adjusted for the extra column)

### Changed
- Daybook tabs: props and empty-copy for active search vs full list; gate pass types extended for search response usage where applicable

### Fixed
- TypeScript: added `@types/lodash` so `lodash/debounce` used by the daybook page type-checks
- Incoming daybook tab: safe handling of `bagSizes` and `gradingSummary` when list items are either full GET list shapes or farmer-storage-link search result items
- ESLint: documented daybook debounce sync for `react-hooks/set-state-in-effect`; removed unused `pageIndex` tracking in grading gate pass PDF; exported `InnerApp` from `main.tsx` for Fast Refresh

## [0.49.0] - 2026-04-09

### Added
- Nikasi (Dispatch) form now supports dynamic **Add Size** rows, allowing multiple size entries (including repeated sizes with different varieties) in one gate pass submission

### Changed
- Nikasi create form payload assembly now includes both fixed grading sizes and dynamic extra rows when building `bagSizes` for create requests
- Nikasi gate pass list service (`useGetNikasiGatePasses`) now supports pagination and date-range query params (`page`, `limit`, `sortOrder`, `dateFrom`, `dateTo`) and returns `{ data, pagination }`
- Nikasi gate pass types aligned to populated GET response shape with `farmerStorageLinkId` details and pagination metadata
- Daybook **Dispatch** tab now uses live nikasi list API data with year-to-date filtering, search, sort, and pagination, and renders vouchers through `NikasiVoucher` (`variant="dispatch"`)

## [0.48.0] - 2026-04-08

### Added
- Farmer seed create and edit forms now capture gate pass number, invoice number, entry date, and optional remarks, with these fields included in summary-sheet review before submit
- Farmer profile seed details dialog now includes an inline Edit action for each farmer seed entry, with direct navigation to the dedicated edit route
- Farmer seed generation options extended with **Foundation** and **Certified** in shared grading constants

### Changed
- Farmer seed edit route now provides a full edit experience (prefill existing values, update fixed/default and extra bag-size rows, and submit through `useEditFarmerSeedEntry`)
- Farmer seed service/type contracts aligned to include gate pass number, invoice number, date, and remarks across create/edit inputs and returned entities
- Farmer seed API normalization in `useGetFarmerSeed` now coerces numeric bag-size fields (`quantity`, `rate`) and top-level seed metadata to safer defaults for UI consumption

## [0.47.0] - 2026-04-07

### Added
- Farmer profile reporting helpers: extracted filtering, sorting, aggregate, and voucher-prop mapping logic into `farmerProfileReportHelpers` to keep page/report orchestration centralized
- PDF data-preparation helpers for render-only report components: `accountingStockLedgerPdfPrepare`, `summaryTablePdfPrepare`, and `seedAmountPayableTablePrepare`

### Changed
- Farmer seed by farmer-storage-link flow now handles array responses end-to-end (types, service hook, profile dialog, and accounting PDF seed matching)
- Farmer profile page now fetches farmer seed data in the main container and passes it to child dialogs/report generation via props
- Accounting/Farmer stock-ledger PDF pipeline now consumes precomputed prepared props for incoming sections, summary sections, and seed amount payable sections
- Summary and seed amount payable PDF components refactored toward presentational rendering with prepared data inputs

### Fixed
- Farmer seed details dialog crash when seed response is empty/unpopulated (`accountNumber` access on undefined)
- Farmer and accounting report generation after PDF refactor by resolving summary table typing/runtime issues
- Removed noisy debug logs from report formatting and suppressed expected 404 warn noise in global query handler

## [0.46.0] - 2026-04-06

### Added
- Analytics **Shed stock report**: **PDF export** ("View Report") — dynamic `@react-pdf/renderer` document with grading summary, storage, dispatch, and shed sections; cold storage name and applied date-range label; opens in a new tab with toast feedback
- PDF component: `shed-stock-report-pdf` under `src/components/pdf/analytics/`

### Changed
- **Farmer seed** form: **generation** is **G2 / G3** only, selected via `SearchSelector` (replaces free-text input); shared options as `FARMER_SEED_GENERATIONS` in `grading/constants`
- Shed stock report toolbar: **Updating…** indicator is right-aligned from the `sm` breakpoint upward

## [0.45.0] - 2026-04-05

### Added
- Analytics Grading: **PDF export** for the **area-wise** table (current variety tab) — dynamic `@react-pdf/renderer` document with cold storage name, applied date range, size columns, area rows, and totals; opens in a new tab with toast feedback
- Analytics Grading: **PDF export** for **grading trend** summary tables (daily and monthly modes)
- Analytics Grading: **PDF export** for **size distribution** summary tables
- Analytics Incoming: **PDF export** for **stock trend** summary tables (daily and monthly modes)
- PDF components: `grading-area-wise-table-pdf`, `grading-trend-table-pdf`, `grading-size-distribution-table-pdf`, `incoming-stock-trend-table-pdf` under `src/components/pdf/analytics/`

### Changed
- Farmer profile **grading gate pass** card: toolbar layout — date pickers and filter actions grouped for small screens; **Columns** / **Group by variety** in a labeled filter group with a left border on large viewports; **Show/Hide table data** and **Custom Report** grouped on the right; consistent header padding (`px-4` / `sm:px-6`) across loading, empty, and data states

## [0.44.0] - 2026-04-04

### Added
- Farmer profile header: **Accounting Report** opens the same pass-selection dialog as the grading table (PDF/Excel), wired through a ref handle on `FarmerProfileGradingGatePassTable`
- `FarmerProfileGradingGatePassTable`: **`forwardRef`** with `FarmerProfileGradingGatePassTableHandle` exposing `openAccountingReportDialog`; component **`displayName`** set for React DevTools

### Changed
- Farmer report PDF: body rows **group by grading pass** — pass-level columns (grading gate pass #, manual #, date, post-grading bags, actual potato weight, wastage, wastage %, amount payable) use **vertically merged cells** with stacked sub-rows for line/detail columns, consistent with the grading report PDF grouped layout
- Farmer profile grading gate pass table: toolbar layout — **Columns** with filters on the left; **Custom Report** for farmer PDF on the right; accounting report action moved to the profile header
- Farmer profile header: primary export label **Farmer Report** (replaces "View Farmer Report")
- People (farmers list): on small viewports, the **sort/footer bar hides while the search field is focused** to reduce clutter when typing
- Accounting report dialog: PDF generate button uses **default primary styling** (removed hardcoded blue classes)

### Fixed
- Build: farmer report PDF pass-group row cell styles satisfy `@react-pdf/renderer` `View` typing (avoid readonly style arrays)

## [0.43.0] - 2026-03-31

### Added
- Analytics Grading: **Area-wise analytics details panel** for selected area in the variety tab — bag-type cards with progress bars, per-size bag and net-weight breakdown, area-share percentages, and a direct "View Farmer-wise Area Breakdown" action
- Ungraded report: **PDF view/export** button on the report toolbar with dynamic import, table snapshot support (visible columns/grouping/sorting), cold storage name, and applied date-range label

### Changed
- Area-wise size distribution data model in `analytics.ts` aligned to the new API response shape (`chartData` now area-first with nested varieties, bag types, net-weight metadata, and percentage fields)
- Analytics Grading area-wise table interaction updated from cell-level drilldown to **row selection with detailed insights** for the selected area while keeping size totals in the summary table
- Grading report: **Wastage now displayed as percentage** (`Wastage (%)`) computed as `((incoming net product − total graded weight) / incoming net product) × 100`, with labels and formatting updated across table columns and visibility labels
- Grading report default visible columns adjusted to remove wastage from the initial visible set while retaining it as an available column

## [0.42.0] - 2026-03-29

### Added
- Analytics Grading: **Grading daily breakdown** at `/store-admin/analytics/grading-daily-breakdown` — search param `date` (YYYY-MM-DD); summary cards (graders, gate passes, total current bags); per-grader groups with a gate pass table (GP #, manual #, farmer, account, variety, initial/current bags, allocation, remarks); loading, error, and empty states aligned with incoming daily breakdown
- Service: **useGetGradingDailyBreakdown**, `gradingDailyBreakdownQueryOptions`, and **prefetchGradingDailyBreakdown** for GET `/grading-gate-pass/grading-daily-breakdown`
- Types: grading daily breakdown API shapes in `analytics.ts` (`GradingDailyBreakdownData`, groups, totals, response)
- Grading trend analysis (**daily** activity table): clickable date and grader cells navigate to grading daily breakdown with `date` in the URL (row total column remains non-link), consistent with incoming stock trend behavior
- Route: **validateSearch** on grading daily breakdown for typed `date` query parsing

## [0.41.0] - 2026-03-29

### Added
- Analytics overview: **Shed Stock** stat — bags = grading (initial) − stored (initial) − dispatch; description on card; no linked report (derived metric)
- Types: optional **`totalBagsStoredInitial`** on `AnalyticsOverviewData` when provided by GET `/analytics/overview` (clients otherwise use `totalBagsStored` for the stored term)

### Changed
- Analytics overview: **`StatCard`** accepts optional `reportType`; "Get Reports" is shown only when a report type is set
- Grading report (table + PDF): bag-size columns follow **canonical grading report order** (`Below 30` … `Cut`) with unknown sizes after, via `orderBagSizesByGradingReport`, `sortGradedBagSizeColumnIds`, and `compareSizeKeysForReport` in `grading-bag-sizes.ts` (replaces lexicographic column ordering)
- Grading report PDF: summary rows/tables use the same bag-size ordering as the main table; visible-column PDF path normalizes bag column block order
- Grading report data table: memoized totals, header groups, row model, and span-column set for clearer renders
- Grading report screen: toolbar left/right content extracted into variables
- Accounting report PDF: **system incoming gate pass number** column removed from table 1 (incoming details); manual incoming remains as gate pass reference

## [0.40.0] - 2026-03-27

### Added
- Store admin: **Farmer seed** create form at `/store-admin/farmer-seed` — farmer search (`SearchSelector` + `AddFarmerModal`), potato variety, per–bag-size quantity and rate (from grading sizes), validation, and `FarmerSeedSummarySheet` review before submit
- Services: **useCreateFarmerSeedEntry** (POST `/farmer-seed`) and **useEditFarmerSeedEntry** (PUT `/farmer-seed/:id`) with success/error toasts and `farmerSeedKeys` query invalidation
- Types: `FarmerSeedBagSize`, create/edit inputs, `FarmerSeedEntry`, and API response types in `farmer-seed.ts`
- Routes: `/store-admin/farmer-seed` (create) and `/store-admin/farmer-seed/edit` (edit entry point); TanStack Router `routeTree.gen.ts` updated

## [0.39.0] - 2026-03-25

### Added
- UI: `Toggle` component (`TogglePrimitive`-based) at `src/components/ui/toggle.tsx`
- Analytics: toggleable daily/monthly trend charts in `GradingTrendAnalysisChart`, `IncomingTrendAnalysisChart`, and `StorageTrendAnalysisChart`
- People (farmer detail): `EditFarmerModal` to update farmer details (name, address, mobile number, account number) on the farmer profile page
- Service: `useUpdateFarmer` hook for PUT `/farmer-storage-link/:id` (toast feedback + query invalidation on success)
- Dependency: `@radix-ui/react-toggle`

### Changed
- Farmer profile page now syncs `farmerStorageLink` from router state and renders `EditFarmerModal` when available

## [0.38.0] - 2026-03-15

### Added
- Analytics Storage: **Storage trend analysis chart** — `StorageTrendAnalysisChart` with daily and monthly bag trends (line chart by variety), summary table, date params, and refresh; integrated at top of storage analytics screen
- Service: **useGetStorageTrendAnalysis** and `storageTrendQueryOptions` for GET `/analytics/storage-daily-monthly-trend` (dateFrom, dateTo)
- Daybook Storage voucher: **Edit from daybook** — Edit button opens dialog to update date and manual gate pass number; submits via PUT `/storage-gate-pass/:id`; invalidates daybook, storage list, storage summary, and storage trend on success
- Service: **useEditStorageGatePass** — mutation for PUT `/storage-gate-pass/:id`; payload: `date?`, `manualGatePassNumber?`, `reason?`; toast and query invalidation on success/error
- Types: `StorageTrendData`, `GetStorageTrendApiResponse` in analytics; `EditStorageGatePassInput`, `EditStorageGatePassApiResponse` in storage-gate-pass

### Changed
- Analytics Storage screen: renders `StorageTrendAnalysisChart` above stock summary with shared date params
- Analytics page: Apply/Reset date filters now prefetch and invalidate storage trend query
- Storage form: single-pass create only; bulk storage gate pass create removed

### Removed
- **useCreateBulkStorageGatePasses** — bulk storage gate pass create hook and POST `/storage-gate-pass/bulk`; storage form uses single-pass create only

## [0.37.0] - 2026-03-15

### Added
- Analytics Storage tab: **Stock Summary** — `StorageAnalyticsScreen` with table of variety × size (initial/current quantities) from GET `/analytics/storage-summary`; loading, error, and empty states
- Analytics Storage: **StorageSummaryTable** component and **useGetStorageSummary** hook with `storageSummaryQueryOptions` and `prefetchStorageSummary`
- People (farmer detail): **FarmerProfileCharts** — variety distribution and size distribution (per variety) pie charts and tables derived from grading gate passes
- Farmer report PDF: **Distribution section** — optional variety and size distribution tables (extracted from report data) when provided

### Changed
- Analytics page: Storage tab now renders live `StorageAnalyticsScreen` (replacing placeholder)
- Farmer profile: charts block with `FarmerProfileCharts` above grading gate pass table
- Types: **Storage summary** in `analytics.ts` — `StorageSummaryByBagType`, `StorageSummarySizeItem`, `StorageSummaryVarietyItem`, `StorageSummaryData`, `GetStorageSummaryApiResponse`

## [0.36.0] - 2026-03-15

### Added
- People (farmer detail): **Accounting Report Excel export** — "Download Excel" button in the Accounting Report dialog; single-sheet Excel with incoming details, grading gate pass table, and summary (variety/size/farmer)
- Utils: **accountingReportExcel.ts** — `downloadAccountingReportExcel(snapshot, stockLedgerRows)` using shared `buildSummarySheetData` and `buildGradingGatePassSheetData` from stock ledger Excel

### Changed
- Summary table (PDF and Stock Ledger Excel): summary rows sort with B30 ("Below 30") first, then other sizes in size order; within same size/type/weight, sort by variety
- Stock Ledger Excel: **buildSummarySheetData** and **buildGradingGatePassSheetData** exported for reuse by accounting report Excel
- Accounting Report dialog: added `onDownloadExcel` prop and "Download Excel" (FileSpreadsheet) button in footer; refactored farmer profile to use shared `buildAccountingReportDataForSelection` for both PDF and Excel

## [0.35.0] - 2026-03-15

### Added
- People (farmer detail): **Accounting Report** — new PDF export with three tables: (1) Incoming details (up to Actual kg), (2) Grading gate pass table, (3) Summary (Variety/Size/Farmer); "Accounting Report" button next to "View Report" on grading gate pass table
- PDF: **AccountingStockLedgerPdf** — component for accounting report (uses FarmerReportPdf snapshot for table 1, GradingGatePassTablePdf for table 2, SummaryTablePdf for table 3)
- Farmer report PDF: optional **Report Summary** section (Variety, Size, Farmer tables) below main table when `stockLedgerRows` prop is provided

### Changed
- Grading gate pass table PDF: **hideReportSummary** prop to optionally hide Report Summary section; **ReportSummarySectionPdf** exported for reuse in farmer report PDF
- Farmer report PDF: accepts optional `stockLedgerRows` and renders Report Summary when provided; grading gate pass table (farmer profile) passes stock ledger rows to Farmer Report PDF and adds Accounting Report flow with `gradingPassToStockLedgerRow` helper

## [0.34.0] - 2026-03-14

### Added
- People (farmer detail): Grading gate pass table — **column visibility toggle** (Columns button) to show/hide incoming, grading, bag size, and computed columns
- People (farmer detail): Grading gate pass table — **Amount Payable** column per pass and in totals (computed from BUY_BACK_COST rates and net potato kg after bardana)

### Changed
- People (farmer detail): grading gate pass table uses shared column labels and visibility state; amount payable uses variety/size rates and bardana weight per bag type (JUTE/LENO)

## [0.33.0] - 2026-03-13

### Added
- Analytics Grading: daily and monthly trend tables now include totals row per grader and overall total for bags
- Analytics Grading: size distribution cards now show total bags per variety in the header

### Changed
- People (farmer detail): grading gate pass incoming refs table shows aggregated totals columns for bags, gross/tare/net, bardana, and actual weight per grading gate pass

## [0.32.0] - 2026-03-12

### Added
- Incoming gate pass: **Edit from daybook** — Edit button on incoming voucher opens dialog to update manual gate pass number and weight slip (gross/tare kg); submits via PUT `/incoming-gate-pass/:id` with optional reason; invalidates daybook and incoming queries on success
- Service: **useEditIncomingGatePass** — mutation for PUT `/incoming-gate-pass/:id`; payload: `manualGatePassNumber?`, `weightSlip?` (grossWeightKg, tareWeightKg), `reason?`; toast and query invalidation on success/error
- Types: `EditIncomingGatePassWeightSlip`, `EditIncomingGatePassInput`, `EditIncomingGatePassApiResponse` for incoming gate pass edit API
- Incoming form: **Net (kg) live display** — form.Subscribe below weight slip shows computed net (gross − tare) in kg

### Changed
- Incoming voucher: edit dialog with fields for manual GP number, gross weight, tare weight; validation and submit wired to `useEditIncomingGatePass`; reset form when dialog opens

## [0.31.0] - 2026-03-12

### Added
- People (farmer detail): **Incoming and Grading tabs** — tabbed view with live incoming gate passes (via `useGetIncomingGatePassesOfSingleFarmer`) and grading gate passes (via `useGetGradingPassesOfSingleFarmer`); search, pagination, status filter (Incoming), and voucher cards
- Service: **useGetIncomingGatePassesOfSingleFarmer** — GET `/incoming-gate-pass/farmer-storage-link/:farmerStorageLinkId` with query keys and prefetch; returns `IncomingGatePassByFarmerStorageLinkItem[]` and pagination
- Grading gate pass list: **fetchAllPages** — optional param to fetch all pages and return combined data; used by grading report for full dataset
- Types: `IncomingGatePassCreatedBy`, `IncomingGatePassByLinkFarmerStorageLink`, `IncomingGatePassByFarmerStorageLinkItem`, `GetIncomingGatePassesByFarmerStorageLinkApiResponse` for farmer-specific incoming API

### Changed
- People (farmer detail): refactored to use dedicated incoming/grading-by-farmer APIs and tabbed layout; stock ledger and export (PDF/Excel) retained; daybook-style vouchers for Incoming and Grading
- Grading report: uses `fetchAllPages: true` for grading gate passes so report includes full date-range data
- Grading gate pass type: `GradingGatePass.__v` optional (omitted by farmer-storage-link endpoint)
- Grading gate pass service: split into single-page fetcher and main fetcher with optional all-pages loop

## [0.30.0] - 2026-03-10

### Added
- Grading report: **PDF export** — "View Report" button opens a PDF of the grading report table in a new tab; PDF honours table snapshot (visible columns, grouping, sorting) when available
- Grading report data table: **PDF snapshot** — `GradingReportPdfSnapshot` type and `getPdfSnapshot()` ref API to capture visible columns, grouping, sorting, and row model for PDF generation
- PDF: **GradingReportTablePdf** component (`grading-report-table-pdf.tsx`) for grading report table PDF with optional snapshot support

### Changed
- Grading report screen: added View Report button and PDF generation wired to table ref and snapshot; date range label and report title passed to PDF

## [0.29.0] - 2026-03-10

### Added
- Grading report: **Net product (kg)** column — incoming net weight minus bardana (bags × JUTE_BAG_WEIGHT), aligned with grading voucher logic
- Grading report: **Total graded weight (kg)** and **Wastage (kg)** columns — total graded weight from order details; wastage = incoming net product − total graded weight with red highlight
- Grading report: **Farmer** as first column with account number suffix (e.g. "Name #123"); column order and visibility refinements
- Incoming voucher: **Bardana and net product (after bardana)** — weight slip section shows net weight, bardana (bags × JUTE_BAG_WEIGHT), and net weight after bardana
- Incoming voucher PDF: **Bardana** and **Net product (kg)** rows in weight slip section

### Changed
- Grading report: row mapping uses `computeGradingOrderTotals` and `computeIncomingNetProductKg` for consistent net product and wastage; date format "do MMMM yyyy"; totals row includes net product, total graded weight, wastage
- Grading report DataTable: `initialColumnVisibility` prop; column labels for visibility toggle
- Incoming voucher and PDF: use shared `JUTE_BAG_WEIGHT` from grading constants for bardana calculation

## [0.28.0] - 2026-03-10

### Added
- Analytics Grading: **Grading trend analysis chart** — `GradingTrendAnalysisChart` with daily and monthly bag trends (line chart), summary table, date params, and refresh; integrated at top of grading analytics screen
- Service: `useGetGradingTrendAnalysis` and `gradingTrendQueryOptions` for GET `/analytics/grading-daily-monthly-trend` (dateFrom, dateTo)

### Changed
- Analytics Grading screen: renders `GradingTrendAnalysisChart` above size distribution and area-wise analytics with shared date params
- Analytics page: Apply/Reset date filters now prefetch and invalidate grading trend query

## [0.27.0] - 2026-03-09

### Added
- Analytics Grading: **Area-wise analytics** — `AreaWiseAnalytics` component with table (areas × sizes), tabs "By Area" / "By Variety", date params, refresh; cell click navigates to area breakdown with `area`/`size`/`variety` search params
- Analytics Grading: **Size distribution chart** — `SizeDistributionChart` pie charts for grading size-wise distribution per variety; date params and refresh
- Store admin: **Area breakdown route** (`/store-admin/area-breakdown`) with search params `area`, `size`, `variety` for drill-down from area-wise table
- Services: `useGetAreaWiseAnalytics`, `useGetGradingSizeWiseDistribution` and query options for area-wise and size distribution APIs
- Types: `AreaWiseSizeItem`, `AreaWiseAreaItem`, `AreaWiseVarietyItem`, `AreaWiseSizeDistributionData`, `SizeDistributionSizeItem`, `SizeDistributionVarietyItem`, `SizeDistributionData` and related API response types in analytics

### Changed
- Analytics Grading screen: renders `SizeDistributionChart` and `AreaWiseAnalytics` with shared date params
- Analytics page: Apply/Reset date filters now prefetch and invalidate area-wise and size distribution queries

## [0.26.0] - 2026-03-07

### Added
- Incoming report: **PDF export** — "View Report" button opens a PDF of the report table in a new tab; PDF honours table snapshot (visible columns, grouping, sorting) when available
- Incoming report data table: **PDF snapshot** — `IncomingReportPdfSnapshot` type and `getPdfSnapshot()` ref API to capture visible columns, grouping, sorting, and row model for PDF generation
- PDF: **IncomingReportTablePdf** component (`incoming-report-table-pdf.tsx`) for incoming report table PDF with optional snapshot support

### Changed
- Incoming report screen: added View Report button and PDF generation wired to table ref and snapshot; date range label and report title passed to PDF

## [0.25.0] - 2026-03-07

### Added
- Analytics Incoming report: **date range filters** — From/To date pickers with Apply and Clear; report fetches with `dateFrom`/`dateTo` and toast feedback
- Incoming report data table: **column sorting** — sortable headers (ascending/descending/clear) for Account No., Gate pass no., Manual GP no., and Date via dropdown menu
- Incoming report data table: **footer totals row** — sums for Bags, Gross, Tare, and Net weight columns

### Changed
- Incoming report: wired to `incomingGatePassReportQueryOptions` for date-filtered fetches; Apply triggers refetch with selected range
- Incoming report columns: `SortableHeader` and `GroupableSortableHeader` for sortable columns; Date column supports both grouping and sorting
- Incoming report DataTable: `getSortedRowModel`, `sorting` state, optional `totalColumnIds` prop for footer totals

## [0.24.0] - 2026-03-07

### Added
- Daybook Storage tab: **live storage vouchers** with pagination — `StorageTab` now receives `useGetStorageGatePasses` data; search (gate pass no, date, farmer name), sort order (asc/desc), limit selector, and pagination controls; renders `StorageVoucher` per pass with loading and empty states
- Storage gate pass list API: **pagination** — `GetStorageGatePassesParams` (page, limit, sortOrder, dateFrom, dateTo); `useGetStorageGatePasses` returns `GetStorageGatePassesResult` with `data` and `pagination` (`StorageGatePassPagination`); query keys `storageGatePassKeys.lists()` and `storageGatePassKeys.list(params)`
- Types: `StorageGatePassPagination`, `GetStorageGatePassesResult`; `GetStorageGatePassesApiResponse` extended with `pagination`; `GradingGatePass.grader` (optional); `IncomingGatePassWithLink.location` (optional)

### Changed
- Daybook: Storage tab wired to `useGetStorageGatePasses` with shared page/limit/sortOrder state; date range (year-to-date) passed to storage API
- Grading voucher: layout and content updates
- Incoming voucher: layout and content updates; voucher types adjustments
- Grading voucher PDF: minor formatting
- Route tree: updates for daybook/storage

## [0.23.0] - 2026-03-07

### Added
- Daybook: **tabbed layout** — Incoming, Grading, Storage, Dispatch, Outgoing tabs with shared `TabSummaryBar`, `TabToolbarSimple`, `LIMIT_OPTIONS`, and `IncomingStatusFilter` in `tabs/` (`IncomingTab`, `GradingTab`, `StorageTab`, `DispatchTab`, `OutgoingTab`)
- Daybook: **DaybookEntryCard** component for consistent entry display across tabs
- Grading form: **GradingFormStep1** — dedicated step for farmer and variety selection (Step 1) with incoming gate pass selection
- Grading gate pass list API: **pagination** — `GetGradingGatePassesParams` (page, limit, sortOrder, dateFrom, dateTo); `useGetGradingGatePasses` returns `data` and `pagination` (`GradingGatePassPagination`)
- Incoming gate pass list API: **status filter** — `GetIncomingGatePassesParams.status` (e.g. `NOT_GRADED`, `GRADED`) for filtering by grading status; `incomingGatePassesQueryOptions` exported for reuse
- Types: `GradingGatePassPagination`, `GetGradingGatePassesResult`; grading gate pass GET response and list types updated for pagination

### Changed
- Daybook: refactored from single view to tabbed content; Incoming tab uses status filter (all / ungraded / graded) and pagination; Grading tab uses `useGetGradingGatePasses` with page, limit, sortOrder
- Grading form: step-based flow using `GradingFormStep1` for step 1; constants and summary sheet aligned with step flow
- Grading voucher: layout and content updates
- Analytics grading and grading route: wiring for updated services and types
- Route tree: updates for grading and daybook

## [0.22.0] - 2026-03-06

### Added
- Analytics Reports: **dedicated reports route** (`/store-admin/analytics/reports`) with search param `report` for type (incoming, ungraded, grading, stored, dispatch, outgoing)
- Analytics Reports: **report table components** per type — `IncomingReportTable`, `UngradedReportTable`, `GradingReportTable`, `StorageReportsTable`, `DispatchReportTable`, `OutgoingReportTable`; lazy-loaded screen with `ReportsScreen` switching by report type
- Incoming report: **data table** with columns (GP No, Manual, Date, Farmer, Truck, Variety, Bags, Gross/Tare/Net, Remarks, etc.), `columns.tsx` and `DataTable` in `incoming-report/`
- Analytics types: `AnalyticsReportType` for report type union used by reports route and overview links

### Changed
- Analytics overview: stat cards link to reports screen with `report` search (e.g. "Get Reports" → `/store-admin/analytics/reports?report=incoming`); grading card links to grading report
- Route tree and analytics overview wiring for reports navigation

## [0.21.0] - 2026-03-02

### Added
- Daybook Dispatch tab: **live nikasi vouchers** — fetches dispatch gate passes via `useGetNikasiGatePasses`, renders `NikasiVoucher` per pass with loading and empty states; "Add Dispatch voucher" CTA when empty
- Nikasi voucher: **dispatch variant** — `variant="dispatch"` uses red accent (dot, gate pass number, border hover) for Daybook Dispatch tab; default remains green
- Nikasi voucher: **direct allocation display** — when voucher has `bagSize` (single-pass API), shows "Quantities by size" table (Size, Variety, Quantity Issued) instead of grading-ref breakdown
- Daybook voucher types: `NikasiBagSizeRow`, `totalBagsFromNikasiBagSizes` for bag-sizes–based nikasi display

### Changed
- Daybook Dispatch tab: placeholder replaced with `DispatchTabContent` (real data)
- Nikasi voucher: supports both `bagSize` (new single-pass shape) and legacy `orderDetails`; totals and table layout adapt; Ref column dot and total row use variant accent
- Nikasi gate pass types: list/GET response shape extended for `bagSize` where applicable

## [0.20.0] - 2026-03-02

### Added
- Nikasi (Dispatch) form: **single gate pass create** — manual bag-size entry (size, variety, quantity issued) using grading constants; farmer selection via SearchSelector when not in fixed-farmer mode
- Nikasi form: fixed-farmer mode for specific cold storage (`FIXED_FARMER_STORAGE_LINK_ID`); otherwise optional `farmerStorageLinkId` from route (e.g. Daybook) or in-form farmer search
- Nikasi types: `CreateNikasiGatePassBagSize` (size, variety, quantityIssued); `CreateNikasiGatePassInput` now uses `bagSizes` with optional `netWeight`, `averageWeightPerBag`

### Changed
- Nikasi form: refactored from bulk multi-pass flow to single-pass flow — uses `useCreateNikasiGatePass` instead of `useCreateBulkNikasiGatePasses`; no grading gate pass list or allocation table; direct size/variety/quantity grid with JUTE/LENO and variety dropdowns
- Nikasi route: always renders form; `farmerStorageLinkId` optional (empty string when absent); removed "open from Daybook" placeholder
- Nikasi summary sheet: supports direct allocation — shows "Quantities by size" when `gradingGatePassId === '_direct'`, "Grading gate passes" otherwise
- Nikasi gate pass types: deprecated `CreateNikasiGatePassAllocation`, `CreateNikasiGatePassGradingEntry` (bulk API); retained for backward compatibility

## [0.19.0] - 2026-03-01

### Added
- Daybook Storage tab: **live storage vouchers** — fetches storage gate passes via `useGetStorageGatePasses`, renders `StorageVoucher` per pass with loading and empty states
- Daybook voucher types: `StorageBagSizeRow` and `totalBagsFromBagSizes` for bag-sizes–based storage display
- Storage gate pass types: `StorageGatePassWithLink`, `StorageGatePassFarmerStorageLink`, `StorageGatePassBagSize`, `StorageGatePassLinkedByAdmin` for GET response shape
- Incoming gate pass types: `IncomingGatePassBagSize`; `IncomingGatePassWithLink` extended with `bagSizes`, `createdBy`, `editHistory`

### Changed
- Storage voucher component: uses `StorageGatePassWithLink` and `bagSizes` instead of legacy `orderDetails`; farmer name/account from `voucher.farmerStorageLinkId` when not passed as props; Farmer Details section shows address and mobile when available; location table columns (Size, Bag Type, Chamber, Floor, Row, Current Qty, Initial Qty); removed "Grading refs" and weight-per-bag from total row
- Daybook Storage tab: placeholder replaced with `StorageTabContent` (real data)
- `useGetStorageGatePasses`: returns `StorageGatePassWithLink[]`; API response type updated
- `useCreateStorageGatePass`: success toast uses static message
- Incoming gate pass types: `IncomingGatePassFarmerStorageLink` simplified; deprecated `bagsReceived`, `weightSlip`, `truckNumber`, `manualGatePassNumber`, `status`, `gradingSummary` on `IncomingGatePassWithLink` (kept for backward compatibility)

## [0.18.0] - 2026-03-01

### Added
- Storage form: **farmer selection** in-step — optional `farmerStorageLinkId` prop; when not provided, step 1 includes SearchSelector for "Enter Account Name" and AddFarmerModal to search/create farmers
- Storage form: validation for farmer (required when not pre-set) before proceeding to step 2
- Types: `CreateStorageGatePassBagSize`, `CreatedStorageGatePassBagSize` for bag-size–based storage API; `CreatedStorageGatePass` extended with `farmerStorageLinkId`, `createdBy`, `bagSizes`

### Changed
- Storage gate pass API: create payload now uses `bagSizes` (size, bagType, currentQuantity, initialQuantity, chamber, floor, row) instead of `gradingGatePasses`; `manualGatePassNumber` removed from request body
- Storage form: builds and submits `bagSizes` from size quantities and location; farmer comes from form field when not passed as prop
- Storage route: no longer passes hardcoded `farmerStorageLinkId`; form used without initial farmer so user selects in form
- `useCreateStorageGatePass` / bulk: success handling uses `data.success !== false && data.data != null` for robustness; `CreateStorageGatePassApiResponse.success` optional
- Types: `CreateStorageGatePassInput` and `CreatedStorageGatePass` aligned with new bag-sizes API shape; legacy allocation types retained for summary/display

## [0.17.0] - 2026-03-01

### Added
- Analytics Incoming: **Incoming trend analysis chart** — daily and monthly bag trends (GET `/analytics/daily-monthly-trend`) with date range support
- Analytics Incoming: **Top farmers chart** — top farmers by bags (GET `/analytics/top-farmers-by-bags`) with date params
- Analytics Incoming: **Variety distribution chart** — variety breakdown (GET `/analytics/variety-distribution`) with date params
- Services: `useGetIncomingTrendAnalysis`, `useGetIncomingVarietyBreakdown`, `useGetTopFarmers` and query options for incoming analytics charts
- UI: Chart component (`@/components/ui/chart`) for recharts-based visualizations
- Types: `TopFarmersChartItem`, `TopFarmersByBagsData`, `VarietyDistributionChartItem`, `VarietyDistributionData`, `DailyTrendChartItem`, `MonthlyTrendChartItem`, `DailyMonthlyTrendData` and related API response types in analytics types

### Changed
- Analytics Incoming tab: layout now includes Top Farmers and Variety Distribution charts in a grid, plus full-width Incoming Trend Analysis chart
- Card component: updates for chart integration

## [0.16.0] - 2026-02-26

### Added
- Get Reports: **Group by variety** option for Grading, Storage, and Dispatch (nikasi) reports; can be combined with "Group by farmers" for variety-then-farmer grouping
- Analytics types: variety-grouped report data shapes for grading, storage, and nikasi — `*ReportVarietyGroupItem`, `*ReportDataGroupedByVariety`, `*ReportVarietyAndFarmerItem`, `*ReportDataGroupedByVarietyAndFarmer`, and union types `GradingGatePassReportData`, `StorageGatePassReportData`, `NikasiGatePassReportData`

### Changed
- Get Reports dialog: Grading, Storage, and Dispatch report types now send `groupByVariety` to the API; param comparison includes `groupByVariety` for same-params check
- Services: `useGetGradingGatePassReports`, `useGetNikasiGatePassReports`, `useGetStorageGatePassReports` accept optional `groupByVariety` and pass it to the API
- Grading gate pass report PDF: supports flat, grouped-by-farmer, grouped-by-variety, and grouped-by-variety-and-farmer data; variety section headers and layout
- Storage gate pass report PDF: same grouping support and variety section layout
- Nikasi (Dispatch) gate pass report PDF: same grouping support and variety section layout
- Analytics incoming format-data: extended for variety-grouped report handling where applicable

## [0.15.0] - 2026-02-26

### Added
- Stock Ledger: separate **Grading gate pass date** column (in addition to incoming gate pass date); data sourced from first grading pass on farmer detail page
- Stock Ledger types: `gradingGatePassDate` on `StockLedgerRow`; column width and labels in `stockLedgerColumnWidths`

### Changed
- Stock Ledger PDF: clearer column headers (e.g. "System Incoming GP No", "Incoming gate pass date", "Grading gate pass date", "Actual Weight of Potato", "Weight Received After Grading", "Less Bard Weight @0.700 g"); grading block layout (right borders, top-aligned content); visual divider after Actual Weight column
- Stock Ledger Excel: headers aligned with PDF; grading gate pass date column and value in left block; grading gate pass sheet uses "System Incoming GP No", "Grading GP Number", "Grading Date" and prefers `gradingGatePassDate` with fallback to `date`
- Grading gate pass table PDF: headers aligned ("System Incoming GP No", "Incoming GP No", "System Grading GP No", "Grading GP Number", "Grading Date"); date cell uses `gradingGatePassDate` with fallback to `date`
- Farmer detail (people): stock ledger row building passes `gradingGatePassDate` from first grading pass

## [0.14.0] - 2026-02-26

### Added
- Store admin Settings route (`/store-admin/settings/`) with placeholder screen
- Get Reports: Ungraded report PDF uses custom title "Ungraded Bags Report" via optional `reportTitle` on incoming gate pass report PDF

### Changed
- Stock Ledger PDF: dynamic size columns — only size columns that have quantities across rows are shown; `getSizesWithQuantities`, `getMiddleBlockWidth`; TableHeader, TotalRow, DataRow accept `sizesWithQuantities` / `middleBlockWidth`
- Stock Ledger Excel: aligned with PDF — uses shared calculation modules (`incomingVoucherCalculations`, `gradingVoucherCalculations`), `stockLedgerTypes`; dynamic size columns; bifurcated rows (JUTE/LENO sub-rows per ledger row when post-grading split); `getSizeBagsJute`/`getSizeBagsLeno`, `rowToExcelRows`
- Incoming gate pass report PDF: optional `reportTitle` prop for custom report title (e.g. Ungraded Bags Report)

## [0.13.0] - 2026-02-23

### Added
- Analytics Get Reports: Dispatch (nikasi) report type — date range, group-by-farmer, and PDF download for nikasi gate pass report
- Service: `useGetNikasiGatePassReports` and `nikasiGatePassReportQueryOptions` for GET `/analytics/nikasi-gate-pass-report` (dateFrom, dateTo, groupByFarmer)
- PDF: `nikasi-gate-pass-report.pdf.tsx` for Dispatch (nikasi) gate pass report
- Types: `NikasiGatePassReportFarmer`, `NikasiGatePassReportFarmerStorageLink`, `NikasiGatePassReportItem`, `NikasiGatePassReportGroupedItem`, `NikasiGatePassReportDataGrouped`, `NikasiGatePassReportDataFlat`, `GetNikasiGatePassReportApiResponse` in analytics types

### Changed
- Get Reports dialog: supports report type `dispatch`; fetches nikasi report and generates Dispatch gate pass report PDF

## [0.12.0] - 2026-02-23

### Added
- Analytics Incoming tab: full data table with TanStack Table — sortable GP No column; columns for Manual, Date, Farmer Name, Truck No, Variety, Bags, Gross/Tare/Net (kg), Remarks; optional Grading Status when data is from report API
- Analytics Incoming tab: search (by farmer name or truck number), pagination (10/20/50 per page), and footer totals for Bags, Gross, Tare, Net

### Changed
- Analytics Incoming: replaced simple list with `DataTable` component; row type supports `IncomingGatePassRow` with optional `gradingStatus`; formatted dates (DD/MM/YY), locale numbers, and weight display

## [0.11.0] - 2026-02-23

### Added
- Analytics: "Get Reports" button on overview stat cards opens a dialog to generate Incoming or Grading reports with date range and group-by-farmer; PDF download for incoming report
- Get Reports dialog: `GetReportsDialog` component with date pickers (From/To), group-by-farmer checkbox, and PDF generation for incoming gate pass report
- Service: `useGetGradingGatePassReports` and `gradingGatePassReportQueryOptions` for GET `/analytics/grading-gate-pass-report` (dateFrom, dateTo, groupByFarmer)
- PDF: `incoming-gate-pass-report-pdf.tsx` for incoming gate pass report
- Helpers: `addGradingStatusToIncomingReport` in `analytics/incoming/format-data.ts` to merge grading report data and mark incoming gate passes as Graded/Ungraded
- Types: grading report (`GradingGatePassReportFarmer`, `GradingGatePassReportItem`, `GradingGatePassReportDataGrouped`, `GradingGatePassReportDataFlat`, `GetGradingGatePassReportApiResponse`); incoming with status (`IncomingGatePassWithLinkWithStatus`, `IncomingGatePassReportDataGroupedWithStatus`, `IncomingGatePassReportDataFlatWithStatus`)

### Changed
- Analytics overview: stat cards accept `onGetReports` callback and show "Get Reports" button; overview opens `GetReportsDialog` with report type per card (incoming, ungraded, grading, stored, dispatch, outgoing)
- Types: `analytics.ts` extended with grading report and status types

## [0.10.0] - 2026-02-23

### Added
- Analytics: date range filters (From / To) with Apply and Reset; Apply refetches overview and incoming data with toast feedback
- Analytics: Incoming tab showing incoming gate passes for the selected date range
- Service: `useGetIncomingGatePassReports` and `incomingGatePassReportQueryOptions` for GET `/analytics/incoming-gate-pass-report` (dateFrom, dateTo, groupByFarmer)
- Types: `IncomingGatePassReportFarmer`, `IncomingGatePassReportGroupedItem`, `IncomingGatePassReportDataGrouped`, `IncomingGatePassReportDataFlat`, `GetIncomingGatePassReportApiResponse` in analytics types

### Changed
- Analytics overview and incoming data support optional date range params (dateFrom, dateTo)
- `useGetIncomingGatePasses`: added `GetIncomingGatePassesParams` (dateFrom, dateTo) and exported `incomingGatePassesQueryOptions` for use in analytics
- `useGetOverview`: accepts `GetOverviewParams` with optional dateFrom/dateTo
- Helpers: `formatDateToYYYYMMDD` for converting dd.mm.yyyy to YYYY-MM-DD for API params
- Date picker: used in analytics with configurable label and id (From/To)

## [0.9.9] - 2026-02-22

### Added
- Stock Ledger PDF: shared column widths in `stockLedgerColumnWidths.ts` for main table and summary table alignment
- Stock Ledger PDF: `SummaryTablePdf` component in `sumary-table-pdf.tsx` for bag-type/size summary section below main table

### Changed
- Stock Ledger PDF: refactored to use `SummaryTablePdf` and `STOCK_LEDGER_COL_WIDTHS`; removed inline column widths and analytics section from `StockLedgerPdf.tsx`
- Grading gate pass table PDF: minor formatting (total row cell)

## [0.9.8] - 2026-02-17

### Added
- Stock Ledger export: dialog on farmer detail page to choose "View PDF" or "Download Excel"
- Stock Ledger Excel export: `downloadStockLedgerExcel` in `src/utils/stockLedgerExcel.ts` using xlsx; columns aligned with PDF (gate pass, dates, variety, weights, shortage, amount payable)
- Dependency: `xlsx` for Excel generation

### Changed
- Stock Ledger PDF: exported shared helpers (`SIZE_HEADER_LABELS`, `formatWeight`, `roundUpToMultipleOf10`, `computeWtReceivedAfterGrading`, `getTotalJuteAndLenoBags`, `computeLessBardanaAfterGrading`, `computeActualWtOfPotato`, `computeIncomingActualWeight`, `computeWeightShortage`, `computeWeightShortagePercent`, `getBuyBackRate`, `computeAmountPayable`, `sortRowsByGatePassNo`) for reuse by Excel export

## [0.9.7] - 2026-02-11

### Added
- Storage form: variety-based filtering (step 1), sort by voucher number (ascending default / descending), and group-by (farmer or date) using `Object.groupBy`; shared `storage-form-utils` with `groupPassesByFarmer`, `groupPassesByDate`, and display group helpers
- Storage form components: `GradingFiltersBar`, `Step1BagsCard`, `Step2LocationCard`, `StorageAllocationTable`, `StorageFormHeader`, `StorageFormFooter`, `StorageFormStepIndicator`; types and utils in `storage-form-types.ts` and `storage-form-utils.ts`
- Bulk storage gate pass: `useCreateBulkStorageGatePasses` for `POST /storage-gate-pass/bulk`

### Changed
- Storage form: main filter is variety only (date range removed); vouchers displayed then sort by voucher # then optional grouping (farmer-wise or date-wise)
- Nikasi form: same filtering, sorting, and grouping flow as storage — variety filter (default **All Varieties** to show all), sort by voucher (asc/desc), group by farmer or date; uses shared `storage-form-utils`; date range and “sort by date” removed; table uses unified display groups
- Nikasi variety filter: default option **All Varieties** so all varieties are shown until a specific variety is selected

## [0.9.6] - 2026-02-10

### Added
- Bulk nikasi gate pass: `useCreateBulkNikasiGatePasses` hook for `POST /nikasi-gate-pass/bulk`
- Types: `CreateBulkNikasiGatePassInput`, `CreateBulkNikasiGatePassApiResponse` for bulk create request/response

### Changed
- Nikasi form: support for multiple passes per submit — add/remove pass cards, each with its own From, To, Date, Remarks and grading allocation table; shared filters and column toggle; summary sheet lists all passes and shows voucher range (e.g. #2–#3); submit sends `passes` array with sequential gate pass numbers
- Nikasi voucher (daybook): "Detailed Breakdown" table with columns Type, Ref, Initial Quantity, Issued, Avail; removed Location column; removed Farmer Details and Grading Gate Passes from expanded (More) section; short mobile-friendly headings with tooltips; `table-fixed` and responsive padding to avoid horizontal scroll on small screens
- Daybook voucher types: `gradingGatePassIds` may be `string[]` (bulk API) or object array; nikasi voucher supports both

## [0.9.4] - 2026-02-08

### Changed
- Grading voucher: Weight % now uses total graded weight (sum of initial qty × weight per bag) as denominator so row percentages sum to 100%
- Grading voucher order details table: per-row Weight % = (initial qty × weight per bag) / total graded weight × 100; total row shows 100% and total graded weight in Wt/Bag column
- Grading voucher PDF: same percentage logic applied for consistency with voucher UI

## [0.9.3] - 2026-02-02

### Changed
- Daybook: voucher components (grading, incoming, nikasi, outgoing, storage) and types
- Daybook index and filter integration
- Nikasi and storage forms and routes
- Gate pass services: grading, incoming, nikasi, storage create hooks and daybook fetch
- Daybook types updates

## [0.9.2] - 2026-02-02

### Changed
- Daybook: improvements and fixes
- Incoming form: updates
- Search selector: refinements
- People listing and farmer detail page: updates

## [0.9.0] - 2026-01-31

### Added
- Progress UI component (shadcn, Radix) for progress bars
- Optional manual gate pass number field on Incoming, Grading, Nikasi, and Storage gate pass forms
- Incoming gate pass voucher: stage progress bar (Incoming → Grading → Storage → Nikasi → Outgoing) with labels and percentage
- Success toasts on form submission (incoming, storage) via sonner

### Changed
- Incoming, Grading, Nikasi, and Storage gate pass types: added optional `manualGatePassNumber`
- Summary sheets pass through manual gate pass number for all gate pass types
- Incoming gate pass voucher: layout and stage visibility improvements

## [0.8.0] - 2026-01-30

### Added
- Nikasi (outgoing) gate pass form with validation and submission
- Nikasi gate pass summary sheet for review before submit
- Nikasi gate pass route and page (`/store-admin/nikasi`)
- Service hooks: `useCreateNikasiGatePass`, `useGetNikasiGatePasses`
- Type definitions for nikasi gate pass data structures

### Changed
- Nikasi gate pass voucher: full implementation (replacing placeholder) with farmer, vehicle, variety, and grading details
- Incoming gate pass voucher: layout and content updates
- Grading form: minor adjustments

## [0.7.0] - 2026-01-29

### Added
- Grading gate pass form: bag type and weight per size entry in quantities grid
- Grading summary sheet: table-style size rows with Size, Bag Type, Qty, Wt (kg) columns

### Changed
- Grading gate pass form: responsive quantities layout (mobile cards, desktop table-like grid) with improved typography and spacing
- Grading gate pass form: allocation status set to `UNALLOCATED` on submit (was `PENDING`)
- Grading summary sheet: refactored meta row and size rows into `SummaryMetaRow` and `RowCells` components; updated styling (zinc palette, compact layout)

## [0.6.0] - 2026-01-29

### Added
- Empty UI component for empty states (Empty, EmptyHeader, EmptyMedia, EmptyTitle, EmptyDescription, EmptyActions)
- Daybook voucher placeholder components: grading, nikasi (out), outgoing, and storage gate pass vouchers

### Changed
- Incoming gate pass voucher: layout and content updates
- Incoming gate pass form and summary sheet improvements
- Incoming gate pass types updates

## [0.5.0] - 2026-01-29

### Added
- Incoming gate pass listing in daybook with search, sort, voucher count, and refresh actions
- Incoming gate pass voucher card component showing farmer, vehicle, variety, and grading details
- Service hook `useGetIncomingGatePasses` and types for populated incoming gate pass responses

### Changed
- Updated daybook empty and loading states for incoming gate passes

## [0.4.0] - 2026-01-29

### Added
- Incoming gate pass form with comprehensive validation and submission
- Date picker component with calendar integration
- Search selector component for farmer selection with search functionality
- Calendar UI component (shadcn/ui)
- Command UI component (shadcn/ui) for searchable dropdowns
- Spinner UI component for loading states
- Summary sheet component for incoming gate pass review
- Voucher number service hook (`useGetVoucherNumber`)
- Incoming gate pass creation service (`useCreateIncomingGatePass`)
- Incoming gate pass route and page
- Type definitions for incoming gate pass data structures

### Changed
- Enhanced daybook component with improved functionality
- Updated app sidebar with incoming gate pass navigation
- Improved dialog component with better accessibility
- Updated sheet component styling
- Enhanced add farmer modal with better integration

### Technical Details
- Added `date-fns` for date manipulation
- Added `react-day-picker` for calendar functionality
- Added `cmdk` for command palette/search functionality

## [0.1.0] - 2026-01-27

### Added
- Initial project setup with React 19, TypeScript, and Vite
- TanStack Router integration for routing
- Tailwind CSS v4 for styling
- ESLint and Prettier configuration for code quality
- Husky pre-commit hooks with lint-staged
- Basic home page with welcome message
- TypeScript configuration for React and Node.js
- Development and build scripts

### Technical Details
- React 19.2.0
- TypeScript 5.9.3
- Vite with Rolldown (rolldown-vite@7.2.5)
- TanStack Router 1.157.16
- Tailwind CSS 4.1.18
- React Compiler enabled
