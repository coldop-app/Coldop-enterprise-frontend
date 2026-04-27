# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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
