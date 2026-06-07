# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.2.0] - 2026-06-07

### Added
- Dedicated ungraded gate pass report service (`useGetUngradedGatePassesReport`) for `/incoming-gate-pass/ungraded/report`, with query keys, prefetch, and typed error handling.
- Size-rate canonicalization helpers (`sizeRateCanonicalKey`, `resolveSizeRateFromRecord`, `canonicalizeSizeRatesRecord`, `canonicalizeVarietySizeRateTables`, `applySizeRateUpdate`, `canonicalizeCustomSizeRates`) so en-dash and hyphen bag-size aliases stay consistent across preferences and PATCH payloads.

### Changed
- Ungraded analytics report route now loads via `IncomingReportTable variant="ungraded"` and the dedicated ungraded API instead of client-side status filtering on the incoming report.
- Analytics Excel exports (contract farming, farmer seed, incoming, storage) use 40px row heights for headers, body rows, and totals for improved readability.
- Preferences normalization is strict: only canonical `custom` and `financeConstants` fields are accepted, API data is required (embedded defaults and legacy fallbacks removed), and `PreferencesValidationError` surfaces missing or invalid configuration.
- Settings preferences editor applies `applySizeRateUpdate` when editing buy-back and finance size rates so duplicate dash-variant keys are not kept.
- Preferences PATCH payloads canonicalize `buyBackCost` and finance `sizeRates` before save; persisted preferences migration bumped to version 5 and clears invalid cached preferences on migration failure.
- Project version updated to `1.2.0` for this ungraded report API, preferences validation, and Excel export release.

## [1.1.0] - 2026-06-07

### Added
- Locality master data module with CRUD service hooks (`useCreateLocality`, `useEditLocality`, `useDeleteLocality`, `useGetLocalities`) and shared `Locality` typings.
- Reusable station management components (`StationFormDialog`, `DeleteStationDialog`, `StationsTable`, `station-form-utils`, `station-form-handlers`) for Settings → Master → Stations.
- `useGetStationsWithLocalities` for loading stations with nested locality lists in the stations master screen.
- Edit farmer dialog now links farmers to a station and locality with cascading locality loading and a dedicated Location section.
- `resolveEntityId` helper on farmer gate-pass services for normalizing populated or string entity IDs.

### Changed
- Station master data refactored so stations hold name metadata only; seed dispatch and buy-back rates now live on locality records under each station.
- Settings → Master → Stations page simplified to use extracted station components, `StationWithLocalities` typing, and locality-aware search.
- Farmer storage links and profile flows now use `stationId` and `localityId` instead of a flat `station` field; edit-farmer and profile overview wiring updated accordingly.
- Finance report planting variety totals now sum all planting table row amounts; net revenue is grading sale amount minus total planting amount, with station rates resolved from station and locality context.
- `FarmerProfileOverview` mounts `EditFarmerDialog` only while the edit dialog is open.
- Project version updated to `1.1.0` for this locality-aware stations and finance report release.

## [1.0.0] - 2026-05-20

### Added
- Store-admin ERP workflows for incoming, storage, grading, and dispatch (nikasi) gate passes, including create/edit flows, edit history, and daybook views.
- Analytics dashboards and exportable reports for contract farming, farmer seed, incoming, grading, storage, and dispatch, with view filters, Excel export, and PDF generation.
- People module with farmer profiles, dispatch ledgers, finance/accounting/farmer reports, and quick-add farmer support.
- Role-based access control and user preferences (settings).
- shadcn agent skill, TanStack Router Cursor rules, and report refactor documentation.

### Changed
- Merged `staging` into `main`, resolving conflicts in favor of incoming changes.
- Dependency and toolchain updates (React 19, TanStack Router/Query, Tailwind v4, Vite 8).
- Project version updated to `1.0.0` for this first stable store-admin release.

## [0.7.1] - 2026-05-20

### Added
- Contract farming report **family grouping** (`contract-farming-family-grouping.ts`) to merge rows for farmers sharing a `familyKey`, with rowspan cells for farmer/account/address columns, stacked member names in the farmer column, and merged grade metrics per family×variety×size.
- **Group Families** toggle on the contract farming report toolbar; enabling it shows `familyKey` and clears table grouping to avoid conflicting layouts.
- Nikasi report view filters support **bag-size column** advanced filter fields (`bagBelow25`, `bag25to30`, `bagAbove50`, `bagCut`, and related bands) via configurable `bagSizeColumnConfig` and `isNumericFilterField`.
- shadcn `InputGroup` UI component for composable search/filter inputs.

### Changed
- Contract farming report Excel export suppresses repeated family-span cells separately from variety-span cells so merged family blocks export cleanly.
- Footer totals and variety metric dedupe keys recognize `family-*` variety row keys so pooled metrics stay correct when families are grouped.
- Nikasi `ViewFiltersSheet` accepts dynamic column labels and filter field lists so bag-size columns from storage config appear in column filters, ordering, grouping, and the logic builder.
- Project version updated to `0.7.1` for this contract farming family grouping and nikasi filter release.

## [0.7.0] - 2026-05-17

### Added
- Farmer **finance report** with per-variety **planting** and **grading** tables driven by gate-pass data, cold-storage preferences, and accounting report helpers.
- `finance-calculations` to build planting particulars (seed lines, freight, grading charges, storage, multiplication expenses) and grading rows with 6% shortage below 40 mm, 50 kg post-storage bags, and sale amounts from rate tables.
- `PlantingVarietyTable` and `GradingVarietyTable` components with Indian number formatting, variety footers, and net-amount summary for planting blocks.
- Shared exports on report prepare helpers (`aggregateIncomingTableTotals`, grading bag/weight aggregates, summary amount payable) and `incomingIdsLinkedFromGradings` for reuse across accounting and finance flows.

### Changed
- Finance report route loads farmer seed, incoming, and grading passes with loading and error states; renders paired planting and grading sections per variety key.
- Finance report constants (`custom.financeConstants`) are loaded from store preferences with defaults in `useGetPreferences`; Settings → Preferences includes a Finance tab to view and edit them (replaces the removed `finance-constants.ts` module).
- Project version updated to `0.7.0` for this finance report release.

## [0.6.9] - 2026-05-15

### Added
- Contract farming report **calculation breakdown** dialogs for seed amount, net amount per acre, grade weight %, average quintal per acre, wastage, output %, and buy back amount; key metrics open a step-by-step explanation from the table.
- `contract-farming-report-calculations` breakdown helpers (`getGradeWeightPercentBreakdown`, `getWastageKgBreakdown`, `getBuyBackAmountBreakdown`, and related types) to expose inputs and intermediate values for the dialogs.
- Shared `ReportMetricCalculationCell` and `report-calculation-dialog-shared` UI for clickable metric cells with accessible labels.

### Changed
- Contract farming report columns wire calculated metrics through `ReportMetricCalculationCell` instead of plain text spans.
- Project version updated to `0.6.9` for this contract farming calculation transparency release.

## [0.6.8] - 2026-05-14

### Added
- Dispatch ledger **Report** screen at `/store-admin/people/dispatch-ledger/:id/dispatch-ledger-report` with ledger header, per-variety bag and net-weight breakdowns, and loading, error, and empty states driven by `useGetAllGatePassesOfDispatchLedger`.
- `dispatch-ledger-report-helpers` for sorting passes, variety keys, size labels, and allocated net kg; `DispatchLedgerReportExcelButton` for Excel export aligned with the on-screen report.
- **Report** link on the dispatch ledger detail card when the user has `farmer-profile` **reports** permission (uses intent preloading).

### Changed
- `routeTree.gen.ts` updated for the new dispatch ledger report child route.
- Project version updated to `0.6.8` for this dispatch ledger reporting release.

## [0.6.7] - 2026-05-14

### Added
- `useGetAllGatePassesOfDispatchLedger` plus `dispatchLedgerKeys.nikasiGatePasses` for fetching and caching nikasi gate passes scoped to a dispatch ledger.
- Dispatch ledger nikasi API typings and normalized result shapes in `src/types/dispatch-ledger.ts`.
- Route-local `DispatchLedgerNikasiSection` and `to-nikasi-card-item` helper for listing nikasi vouchers on the dispatch ledger detail screen.

### Changed
- Dispatch ledger detail route now loads real ledger and nikasi data with skeleton, error, and empty states instead of placeholder UI; wires edit modal and profile header to permissions-aware `FarmerProfileOverview`.
- `FarmerProfileOverview` gains optional `primaryMetric`, `hideFarmerReportLinks`, and `canShowEditButton`, and displays a mobile line when a number is present.
- Store-admin topbar page title resolves to **Dispatch Ledger** on `/store-admin/people/dispatch-ledger/:id`.
- `useGetAllGatePassesOfFarmer` enriches incoming, grading, and farmer-seed rows from the flat `farmerStorageLink` summary on `/passes` so daybook cards see populated farmer names; `FarmerSeedGatePass.farmerStorageLinkId` accepts string or populated link.
- Project version updated to `0.6.7` for this dispatch ledger detail and farmer passes normalization release.

## [0.6.6] - 2026-05-14

### Added
- `contract-farming-report-footer-totals.ts` centralizes contract farming report footer totals (column sums, pooled metrics, and a per-planted-acre row) for reuse by the on-screen table and Excel export.
- `getPooledOutputPercentage` in report calculations for portfolio-level output % (sum of graded kg ÷ sum of inbound kg over deduped farmer×variety rows with valid inbound).
- Optional **Per acre** footer row in the contract farming data table when total planted acres is positive; Excel export appends a matching second footer row with non-bold styling.
- `docs/contract-farming-report-percentages.md` documents grade %, rollups, output %, and footer averaging; the contract farming pattern guide links to it.

### Changed
- Inbound net weight helper for wastage/output/report use is exported as `getInboundNetWeightKgForReport` (replacing the prior internal-only name).
- Contract farming Excel export reads cold-storage preferences and uses `computeContractFarmingFooterTotals` / `buildContractFarmingExcelFooterRows` so workbook totals align with the UI.
- Project version updated to `0.6.6` for this contract farming footer and documentation release.

## [0.6.5] - 2026-05-10

### Changed
- Contract farming analytics report grading columns now use a stable sort order (`orderContractFarmingGradeHeaders`): aggregate **Below 40** sits before **40–45**, **Above 50** after **45–50**, and **Cut** remains last, with layout version bumped for saved column-order memo invalidation.
- Contract farming report table flattening, advanced-filter row shaping, and empty-grade-column detection now read bag counts via `getGradeBagCount` so totals stay aligned with the ordered header list.
- Nikasi gate pass create and edit flows support an optional **truck number**, wired through list typings, mutations, summary sheet preview, and daybook cards (`truckNumber` on vouchers).
- Nikasi summary review now separates **farmer**, **dispatch ledger**, and **destination** labels instead of generic from/to rows.
- Average weight per bag on Nikasi create/edit is computed from net weight and total bags (`computeAverageWeightPerBag` in `helpers.ts`), shown read-only in the UI, and submitted from the edit form so payloads stay consistent with totals.
- Project version updated to `0.6.5` for this contract farming column ordering and Nikasi trucking/average-weight release.

## [0.6.4] - 2026-05-08

### Changed
- Grading gate pass edit flow was refined with improved incoming gate pass linking/unlinking interactions, stronger selection-step validation, and updated summary/detail handling for safer edits.
- Grading daybook and grading edit modules were aligned to newer gate pass field shapes and UI behavior, including updates to card rendering, edit form composition, and grading detail filling interactions.
- Preferences data handling was tightened across settings and store layers, including query normalization and persisted preference synchronization updates.
- Grading gate pass service hooks and shared typings were updated to support the revised edit payload behavior and linked incoming gate pass workflows.
- Project version updated to `0.6.4` for this grading edit-flow stability and preferences synchronization release.

## [0.6.3] - 2026-05-07

### Added
- Grading gate pass edit flow now supports linking and unlinking incoming gate passes via a dedicated selection step and link dialog (`-Incoming-gate-pass-selection-step.tsx`, `-Link-incoming-gate-pass-dialog.tsx`).
- New service hooks for fetching a single grading gate pass (`useGetSingleGradingGatePass`) and for managing linked incoming gate passes (`useLinkIncomingGatePasses`, `useUnlinkIncomingGatePasses`).

### Changed
- Grading gate pass edit form and route were significantly refactored, splitting incoming gate pass selection and linking into reusable modules for clearer admin workflows.
- Grading gate pass list service now normalizes API responses so newer top-level `farmerStorageLinkId` shapes and legacy nested shapes are both consumed safely; types were updated to reflect this dual shape.
- Daybook grading and incoming gate pass cards now read `farmerStorageLinkId` directly from the gate pass and treat any zero-bag incoming voucher as cancelled regardless of grading status.
- Farmer seed and incoming gate pass create/edit mutations now also invalidate analytics report and contract farming report queries to keep dashboards in sync after voucher changes.
- Grading analytics report table tightened bag size column typings using a shared `CanonBagSize` type for more accurate column rendering.
- Project version updated to `0.6.3` for this grading gate pass linking workflow and analytics cache invalidation release.

## [0.6.2] - 2026-05-07

### Changed
- Storage analytics report table and column behavior were refined for clearer grouped totals, improved value formatting, and more consistent data-table rendering.
- Daybook gate-pass edit/list flows (incoming, storage, nikasi, grading) were aligned with updated form defaults, status handling, and table/list interactions for more consistent admin workflows.
- Store-admin preferences query handling was adjusted to stay in sync with the latest settings screen behavior.
- Project version updated to `0.6.2` for this analytics and gate-pass workflow refinement release.

## [0.6.1] - 2026-05-06

### Added
- New PDF composition modules for grading analytics reports (area-wise distribution, daily breakdown, and size distribution) and incoming daily breakdown reporting.

### Changed
- Contract farming analytics report table and advanced view-filters flow were refined with updated data-table rendering, filter sheet logic, and query-builder constant cleanup.
- Grading, incoming, and storage analytics charts/tables were expanded to support improved breakdown rendering and export-ready data shaping across the dashboard.
- Store-admin analytics route/store wiring and shared advanced-filter utilities were updated to align report filters with the refreshed analytics module behavior.
- Project version updated to `0.6.1` for this analytics reporting and PDF export enhancement release.

## [0.6.0] - 2026-05-06

### Added
- New contract farming report table modules with dedicated data-table wiring for analytics reporting.
- Rebuilt storage summary table UI with interactive tabbed totals, stock filters, and responsive table rendering using TanStack Table primitives.

### Changed
- Contract farming report columns were refined for better tag readability, flattened grading/buy-back column grouping, and adjusted column sizing for report clarity.
- Grading size distribution pie chart layout was tightened to improve centering and responsive rendering behavior.
- Project version updated to `0.6.0` for this analytics report/table refinement release.

## [0.5.9] - 2026-05-06

### Added
- New analytics visualization components for grading, incoming, and storage dashboards, including daily breakdown views, area/size distribution charts, and storage summary widgets.
- Supporting analytics service hooks for grading area/size distribution, storage daily breakdown/summary, and refreshed daily-breakdown query paths.

### Changed
- Store-admin analytics tab screens and overview wiring were updated to surface the new grading/incoming/storage analytics cards and chart modules.
- Contract farming report modules were simplified by removing legacy table/footer components and keeping report column/types flow aligned with the current analytics architecture.
- Shared chart primitives and UI alert composition were refined to support the expanded analytics presentation layer.
- Project version updated to `0.5.9` for this analytics dashboard expansion and report cleanup release.

## [0.5.8] - 2026-05-05

### Added
- Accounting report variety grouping helpers (`accounting-variety-grouped.ts`, `accounting-report-variety-sections.ts`) to structure People accounting exports and tables by variety.

### Changed
- Expanded Excel export pipelines for analytics reports (farmer seed, grading, incoming, storage) with richer workbook layout and column coverage aligned to on-screen tables.
- People report tables (farmer seed, grading, incoming, summary) and the accounting report table/Excel button updated for consistency with grouped variety sections and export preparation.
- Grading analytics report column metadata, grading report table wiring, and advanced view-filters constants adjusted to stay in sync with Excel output.
- Shared helpers (`src/lib/helpers.ts`) and grading report preparation (`grading-prepare.ts`) extended to support the updated report flows.
- Grading gate pass edit route consolidates incoming selection into the main edit/create flow; the standalone `-IncomingSelectionStep.tsx` module was removed in favor of `-IncomingSelectionCreateStep` / `-GradingEditForm` integration.
- Gate pass edit-history cards and related types/services (incoming, storage, nikasi, farmer seed, grading) trimmed for simpler history presentation and tighter typings.
- Project version updated to `0.5.8` for this reporting and gate-pass polish release.

## [0.5.7] - 2026-05-03

### Changed
- Grading analytics report is reorganized under `src/components/analytics/grading/report/` with split modules for column metadata, column definitions, the main grading report table, and the advanced view-filters sheet (advanced filter rules, constants, helpers, logic builder, primitives, and shared types).
- The store-admin grading analytics report route now imports the report table from the new module path.
- Grading gate pass create form uses a clearer Zod shape for optional manual gate pass numbers, explicit typed default values, and a stricter submit validator without type assertions.
- Project version updated to `0.5.7` for this grading report refactor and form validation release.

### Removed
- The previous `grading/reports/` implementation, including the grading report PDF worker and PDF document/prepare modules, in favor of the consolidated report module layout.

## [0.5.6] - 2026-05-02

### Added
- New grading gate pass edit form module with reusable business-number input handling and dedicated gate-pass-by-id data fetching service.
- Expanded grading gate pass type coverage to support edit payload shaping and richer edit-screen bindings.

### Changed
- Grading edit flow now uses enhanced summary-sheet handling and refined mutation wiring for safer update submission behavior.
- Daybook and gate-pass cards (grading, incoming, seed, storage) plus storage/nikasi route screens were refined for consistent number input/search interactions and improved edit navigation behavior.
- Project version updated to `0.5.6` for this grading edit and daybook form consistency release.

## [0.5.5] - 2026-05-02

### Added
- Grading gate pass authenticated routes under `/store-admin/grading-gate-pass/` for voucher edit (with reusable summary sheet) and edit-history listing.
- Grading gate pass API typings plus list and debounced search query hooks wired for the grading daybook experience.
- Daybook grading calculation helpers and a calculations dialog for reviewing derived figures alongside vouchers.
- Persisted preferences slice (`usePreferencesStore`) synced with cold-storage context for offline-friendly draft preference state until server baseline applies.

### Changed
- Daybook grading tab now loads real grading gate pass data with list vs search flows, refreshed cards (including grading gate pass and seed voucher card refinements), and navigation into edit/history where applicable.
- Settings preferences screen updated to cooperate with the new preferences persistence layer.
- Store-admin global store and Zustand debug route snapshot extended to expose relevant preference-related state during development.
- Generated route tree updated to register the new grading gate pass routes.
- Project version updated to `0.5.5` for this grading daybook module and preferences persistence release.

## [0.5.4] - 2026-05-02

### Added
- New authenticated Settings module routes under `/store-admin/settings/` including a Preferences screen with dedicated preferences query and mutation service hooks.
- Zustand debug route at `/zustand/` now surfaces a live snapshot of key global store values for easier state inspection during development.
- Added `@redux-devtools/extension` dependency to support store debugging workflows.

### Changed
- Nikasi daybook tab now uses API-backed search with debounced queries, improved loading/error handling for search vs list mode, and refresh controls for both flows.
- Store state handling and route registration were updated to wire the new Settings/Preferences feature into the authenticated store-admin experience.
- Project version updated to `0.5.4` for this settings and daybook search/refresh enhancement release.

## [0.5.3] - 2026-05-01

### Added
- Dispatch ledger management in People now includes dedicated listing/create/edit UI flows with a new detail route under `/store-admin/people/dispatch-ledger/$id/`.
- Reusable dispatch-ledger form modals and people-tab modules were introduced to separate farmer and dispatch-ledger workflows.

### Changed
- People page UX was reorganized into tabbed farmer and dispatch-ledger views, with farmer card/profile surfaces updated to support dispatch-ledger navigation and metrics context.
- Dispatch ledger create payload handling and shared type definitions were refined to support optional mobile numbers and broader API response compatibility.
- Project version updated to `0.5.3` for this People module dispatch-ledger workflow release.

## [0.5.2] - 2026-05-01

### Added
- Contract farming analytics report now has dedicated report column definitions, modular filter sheet constants/types, and a typed PDF worker contract setup for cleaner report composition.
- Storage analytics report PDF composition was split into reusable document sections (header, summary, table variants, and shared content wrappers) to improve export maintainability.
- Storage analytics advanced view-filters sheet now uses extracted constants, primitives, helper utilities, and logic-builder modules for reusable filter building.

### Changed
- Contract farming report table wiring was updated to consume the new report module structure and align filtering/report rendering behavior with the refactor.
- Storage report table and PDF data preparation flow were updated to align with the new modular PDF/filter architecture.
- Project version updated to `0.5.2` for this analytics report modularization and PDF workflow refinement release.

## [0.5.1] - 2026-04-30

### Added
- Storage analytics report PDF export pipeline with dedicated worker entrypoints, typed worker messaging contracts, and modular report PDF composition sections (header, summary, and report tables).
- Reusable storage report advanced view-filters sheet modules (constants, helper utilities, primitives, logic builder, and typed contracts) for cleaner analytics filter composition.
- New storage gate pass analytics report query hook for API-backed report fetching in the storage analytics flow.

### Changed
- Storage analytics report table and column behavior were refined to align table rendering, filtering, and export-readiness with the new PDF/report workflow.
- Farmer seed analytics report and PDF preparation logic were adjusted to stay consistent with the updated report export data preparation patterns.
- Project version updated to `0.5.1` for this analytics reporting and export workflow release.

## [0.5.0] - 2026-04-30

### Added
- Storage gate pass module routes for listing, editing, and edit-history workflows under `/store-admin/storage-gate-pass/`.
- Reusable storage gate pass edit summary sheet for confirmation before update submission.

### Changed
- Storage daybook cards and tab integration now align with the storage gate pass module APIs and navigation.
- Storage gate pass create/edit services and related type definitions were expanded to support edit payloads, history records, and route-level data usage.
- Farmer seed edit flow refinements were applied to keep form behaviors and shared voucher logic consistent with the updated storage workflows.
- Generated route tree was refreshed to register and type the new storage gate pass route structure.
- Project version updated to `0.5.0` for this storage gate pass workflow release.

## [0.4.9] - 2026-04-30

### Added
- New farmer-seed analytics report route at `/store-admin/analytics/reports/farmer-seed/` with a dedicated report table, advanced view-filters sheet modules, and PDF generation/export support.
- Farmer-seed report data service and typing support for fetching and rendering report entries with farmer/account context.
- Storage daybook gate-pass modules, including a storage voucher card component and query/mutation service hooks for list, search, create, edit, and edit-history workflows.

### Changed
- Analytics overview "Total Farmer Seed Bags Given" stat card now includes direct "Get Report" navigation to the farmer-seed report route.
- Storage daybook tab now renders real API-backed storage gate-pass data with debounced search, pagination-aware loading/error/empty states, and card-based listing UI.
- Seed daybook voucher card UI was refined for tighter density and clearer mobile readability across header, details, and expanded sections.
- Generated route tree was refreshed to register and type the new farmer-seed analytics report route.
- Project version updated to `0.4.9` for this farmer-seed reporting and storage daybook release.

## [0.4.8] - 2026-04-29

### Added
- New ungraded analytics report route at `/store-admin/analytics/reports/ungraded/`, reusing the incoming report screen with enforced status filtering.

### Changed
- Overview "Ungraded" metric card now has a direct "Get Report" navigation action to open the dedicated ungraded report route.
- Incoming report table now supports an `enforcedStatus` prop and applies normalized status filtering before table rendering.
- Generated router route tree was refreshed to register and type the ungraded analytics report route.
- Project version updated to `0.4.8` for this ungraded report navigation and filtering release.

## [0.4.7] - 2026-04-29

### Changed
- Incoming report PDF export now builds from the latest table state at generation time, improving consistency with active sorting, grouping, and visible columns.
- PDF cover/header rendering now uses the active cold storage name and local Oswald font asset configuration for report branding.
- Report table PDF layout now improves wrapped text handling for long fields and refines grouped/non-grouped header rendering behavior.
- Numeric decimal precision detection for PDF preparation was tightened to avoid unnecessary decimal expansion for whole numbers.
- Project version updated to `0.4.7` for this incoming report PDF quality and branding refinement release.

## [0.4.6] - 2026-04-29

### Added
- Incoming report PDF generation flow with a dedicated PDF document composition layer and printable report sections for header, tabular content, and data preparation.

### Changed
- Incoming report table actions now include a direct PDF button that opens a preview tab, renders the latest table state, and handles generation/loading/failure states.
- Incoming report export behavior now tracks per-generation timestamp metadata and aligns visible report columns with the generated PDF output.
- Project version updated to `0.4.6` for this incoming analytics PDF export release.

## [0.4.5] - 2026-04-29

### Added
- Expanded incoming report filter interactions with optimized advanced-tab composition and memoized filter primitives for smoother sheet rendering.

### Changed
- Incoming report table header/body rendering was refined to rely on visible header and cell order directly, with shared numeric-column alignment logic for totals and sorting UI consistency.
- Landing, auth, shared UI primitives, and supporting route components were polished as part of this release cycle to align behavior and presentation across the frontend.
- Project version updated to `0.4.5` for this analytics and UI refinement release.

## [0.4.4] - 2026-04-29

### Added
- Advanced incoming report view filters sheet with grouped filter controls, logic-builder support, and reusable filter helper modules.

### Changed
- Incoming report table behavior was updated with interactive controls and column-level refinements to align with the new advanced filter workflow.
- Project version updated to `0.4.4` for this incoming analytics reporting enhancement release.

## [0.4.3] - 2026-04-29

### Added
- Incoming gate pass analytics report service for fetching, typing, and caching report table data with route-friendly query options.
- Dedicated incoming report table screen component consolidating filters, table rendering, and export-ready report layout behavior.

### Changed
- Incoming analytics report modules were refactored to remove legacy digital report composition files and simplify report route wiring.
- Reusable report table primitives and analytics column definitions were updated to align with the new incoming report architecture.
- Project version updated to `0.4.3` for this incoming analytics report refactor release.

## [0.4.2] - 2026-04-28

### Added
- New incoming analytics report composition with reusable table primitives, typed report columns, and a dedicated report data table implementation.
- Shared incoming report helpers and filter sheet controls to support consistent report rendering and filtering behavior.

### Changed
- Incoming analytics route now renders the new report-first screen architecture and removes legacy digital report/pdf components.
- Project version updated to `0.4.2` for this analytics report release.

## [0.4.1] - 2026-04-28

### Added
- Store-admin analytics module with a dedicated route, date-range filter controls, and an overview dashboard composed of reusable stat cards.
- Analytics overview data service and shared analytics response typings for fetching and prefetching overview metrics from the store-admin API.

### Changed
- Generated route tree now registers and types the new analytics route under authenticated store-admin navigation.

## [0.4.0] - 2026-04-28

### Added
- Farmer seed gate pass edit history page with audit metadata, previous/updated state comparisons, refresh controls, loading skeletons, and pagination.
- Farmer seed edit-history data service with API integration, pagination support, query options, and route-level prefetch support.
- New grading gate pass service hooks for create, edit, list, and edit-history workflows.

### Changed
- Farmer seed edit route registration updated for cleaner file-route declaration.
- Incoming gate pass creation flow now invalidates only incoming query keys and removes daybook coupling.
- Farmer seed typings expanded to include audit response and pagination-compatible history entry shapes.

## [0.3.9] - 2026-04-28

### Added
- Full farmer seed gate pass creation workflow with a dedicated form route, farmer selection/create support, dynamic bag-size rows, and create summary confirmation.
- New interactive daybook placeholders for grading, nikasi, outgoing, and storage tabs with search, sort, item-count, action buttons, and pagination controls.

### Changed
- Seed daybook actions now route directly to farmer seed create and edit-history screens.
- Farmer seed summary sheet now supports configurable title/description and submit labels for reuse across create and edit flows.

## [0.3.8] - 2026-04-28

### Added
- Farmer seed voucher card UI with expandable details and itemized bag-size/amount rendering in the daybook.
- Farmer seed daybook data layer for listing, creating, and editing entries with shared response/request typings.

### Changed
- Seed daybook tab upgraded from empty state to a searchable, sortable, paginated listing experience.
- Incoming daybook tab refactored for controlled search, memoized query params, reusable filter/pagination controls, and tab-aware query enabling.
- Daybook tab container now passes active-tab state to child tabs and removes eager incoming prefetch from route loading.

## [0.3.6] - 2026-04-27

## [0.3.7] - 2026-04-28

### Added
- Incoming gate pass creation service and expanded incoming gate pass typings for create payloads and responses.
- Service scaffolding for farmer seed workflows (create, edit, list, single entry, and edit history) plus daybook/grading data access hooks.

### Changed
- Incoming gate pass create/edit flows now support manual gate pass numbers, dynamic farmer selection, and summary-sheet enhancements for submit behavior and labels.
- Daybook incoming tab and cards now include improved navigation actions and shared constants for weight calculations.
- Sidebar branding label updated to reflect the v1.0.0 application marker.

## [0.3.6] - 2026-04-27

### Added
- Skeleton loading placeholders across daybook tabs, incoming gate pass history, and people screens for better perceived responsiveness.
- Query prefetching from route loaders and next-page prefetch effects for incoming gate pass lists and edit-history pagination.

### Changed
- Incoming, history, and people data services now use stronger cache lifecycles (`staleTime`/`gcTime`) for smoother navigation and fewer redundant refetches.
- People listing search/sort flow now uses memoized filtering to reduce re-computation during interactive input updates.

## [0.3.4] - 2026-04-27

## [0.3.5] - 2026-04-27

### Added
- New Incoming Gate Pass edit history page with audit cards, state comparisons, metadata, and pagination controls.
- Dedicated incoming edit history data service with API integration, query caching, and route wiring for history navigation.
- Incoming gate pass audit response typings to support edit-history records and pagination metadata.

### Changed
- Incoming daybook tab now includes a quick action to navigate directly to incoming edit history.
- Incoming gate pass pagination types expanded for API compatibility with both previous-page key variants.

## [0.3.4] - 2026-04-27

### Added
- Incoming gate pass edit flow now pre-fills voucher data from daybook cards and submits updates through the dedicated edit mutation hook.
- New edit API request/response typings for incoming gate pass update payloads and status-aware edits.

### Changed
- Incoming daybook card UI now visually marks zero-bag vouchers as cancelled and shows a null-state overlay.
- Edit voucher screen UX refined with controlled form fields, null-pass handling, validation feedback, and updated summary sheet action copy.

## [0.3.3] - 2026-04-27

### Added
- Incoming gate pass edit workflow with route screens, summary sheet UI, and update service integration
- Quick add farmer flow with reusable modal, search selector, shared farmer types, and related constants
- New reusable date picker and supporting shadcn UI primitives (`calendar`, `command`, `dialog`, `popover`)

### Changed
- Daybook tab modules refactored into file-based route components with updated route wiring
- People and farmer profile experiences updated to support gate pass data improvements and quick-add farmer actions
- Core UI components (`button`, `sheet`, `FarmerCard`) refined for consistency with the expanded store-admin workflows

## [0.3.2] - 2026-04-27

### Added
- Global error and not-found experiences wired at the router root with dedicated fallback screens
- Farmer listing data service for fetching and prefetching farmer-storage links from the store-admin API

### Changed
- People module now uses live farmer API data with debounced search, sorting options, refresh action, and empty/error/loading states
- Farmer cards redesigned with improved visual hierarchy and quicker scanability for key details

## [0.3.1] - 2026-04-27

### Added
- Live incoming gate pass listing with status-aware filtering, pagination, and debounced gate pass number search

### Changed
- Incoming gate pass card now renders real API data (farmer/account, weight slip details, creator metadata) instead of placeholder values
- Incoming daybook tab refresh behavior now refetches list/search results with loading and error-aware empty states

## [0.3.0] - 2026-04-27

### Added
- Daybook workflow tabs for Seed, Incoming, Grading, Storage, Dispatch (Pre Outgoing), and Dispatch (Outgoing)
- Dedicated daybook tab screens and gate pass cards for incoming, outgoing, nikasi, grading, and seed flows
- New reusable UI primitives for empty states and pagination
- Incoming gate pass data services and shared incoming gate pass type definitions

### Changed
- Daybook route now renders tab-specific screens and persists active tab state in the global store
- Topbar and button component implementation updated for improved consistency and Radix slot usage
- Router tree and daybook module wiring refreshed to support the expanded daybook experience

## [0.2.0] - 2026-04-27

### Added
- New People module with a listing page and dedicated farmer profile route
- Reusable people-focused UI cards (`FarmerCard`, profile header, and metrics)
- Shared UI primitives including filter bar, tabs, badge, and item components

### Changed
- Updated store-admin navigation to include and support new People workflows
- Refined Daybook implementation and route wiring for improved structure
- Enhanced core UI primitives (dropdown menu, tooltip, and separator) for consistency
- Updated app/router and build configuration to support new module structure

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
