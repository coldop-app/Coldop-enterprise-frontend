# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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
