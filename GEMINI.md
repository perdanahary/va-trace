# VA Trace (Officebee) - Project Overview

VA Trace is a procurement and order lifecycle tracking system designed to streamline the flow between Clients, Admins, and Vendors. This repository primarily serves as a **Documentation and UI Analysis** hub, capturing the system's architecture, user flows, and interface states.

## Project Purpose
The platform manages the end-to-end lifecycle of Order Requests (OR), from initial creation by Clients to fulfillment and delivery by Vendors, overseen by Procurement Managers (Admins).

### Key Roles
- **Admin (Procurement Manager):** Full access to manage platform data, route orders to suppliers, and monitor system-wide metrics.
- **Client (Brand Manager):** Initiates order requests and tracks the progress of their specific projects.
- **Vendor (Supplier):** Receives assigned orders, updates production progress, and handles shipping.

## Technology Stack
- **Documentation:** Markdown notes and project notes live alongside the codebase, while generated screenshots are written to `test-artifacts/screenshots/`.
- **Testing:** [Playwright](https://playwright.dev/) for automated end-to-end testing and potentially for automated UI capture/validation.
- **Environment:** Node.js project.

## Directory Structure
- `test-artifacts/screenshots/`: Generated Playwright screenshots from test runs.
- `tests/`: Directory for Playwright test specifications.
- `playwright.config.ts`: Configuration for the Playwright testing framework.

## Building and Running

### Setup
Ensure you have [Node.js](https://nodejs.org/) installed, then run:
```bash
npm install
```

### Testing
To run the automated tests:
```bash
# Run all tests
npx playwright test

# Run tests in headed mode
npx playwright test --headed

# Show test report
npx playwright show-report
```

## Development Conventions
- **Documentation First:** Changes to the UI or business logic should be reflected in the repo notes and test artifacts as needed.
- **Role-Based Separation:** Keep screenshots separated by user role (Admin, Client, Vendor) to maintain clarity on permissions and specific flows.
- **Screenshot Consistency:** When updating screenshots, ensure they are placed in the correct role-specific subdirectory within `test-artifacts/screenshots/`.
