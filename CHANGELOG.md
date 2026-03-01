# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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
