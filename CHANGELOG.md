# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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
