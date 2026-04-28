# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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
