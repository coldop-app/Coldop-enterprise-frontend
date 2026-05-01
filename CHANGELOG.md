# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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
