# Development Guide - QueueLessHub

## Quick Skills Reference

Load the most relevant guidance first:

- `/workflow-commands` -> npm scripts, local run, debug, validation commands
- `/testing-requirements` -> test commands, fixtures, integration patterns
- `/pre-commit-checklist` -> required checks before asking for review
- `/error-handling` -> how to validate runtime failures while developing

## Purpose

This document explains how to set up, run, debug, and validate QueueLessHub during day-to-day development.

## Local Setup

1. Install dependencies.
2. Configure `.env` with the required values.
3. Start MongoDB Atlas connectivity or use the project's test setup when running tests.
4. Run the app in development mode.

### Required environment values

- `MONGODB_URI`
- `PORT`
- `JWT_SECRET`
- `JWT_EXPIRES_IN`
- `WHATSAPP_TOKEN`
- `PHONE_NUMBER_ID`
- `WHATSAPP_WEBHOOK_VERIFY`
- `SHEET_NAME`
- `SPREADSHEET_ID`
- `GOOGLE_CREDENTIALS_JSON`
- `ALLOWED_ORIGINS`
- `RATE_LIMIT_WINDOW_MS`
- `RATE_LIMIT_MAX_REQUESTS`
- `NODE_ENV`
- `TRUST_PROXY`

## Essential Commands

Use repository scripts first.

```powershell
npm install
npm run check
npm run build
npm run dev
npm start
npm test
npm run test:coverage
npm run test:unit
npm run test:integration
npm run swagger:generate
```

## Debug Workflow

### VS Code

- Open the Run and Debug panel.
- Use the existing server debug configuration.
- Put breakpoints in `src/` and restart the server if needed.

### Nodemon

```powershell
node --inspect --enable-source-maps src/server.ts
```

Use this only for local debugging. Do not change production startup behavior for debugging convenience.

## Daily Development Rules

- Make the smallest safe change.
- Keep business logic in services.
- Keep controllers focused on HTTP handling.
- Update tests when behavior changes.
- Update docs when the change affects setup, security, or developer workflow.

## Validation Checklist

Before asking for review, confirm the following:

- The app starts locally.
- The relevant tests pass.
- The change does not break the route, controller, or service touched.
- Swagger or API docs are still aligned if the endpoint changed.
- No secrets or environment files were modified accidentally.

## Common Development Scenarios

### Changing an endpoint

1. Update the route.
2. Update the controller.
3. Adjust the service if the business rule changed.
4. Add or update tests.

### Changing shared behavior

1. Update the service or middleware first.
2. Verify related routes still behave correctly.
3. Run the narrowest useful test set.

### Working on webhook or bot flow

1. Keep payloads treated as untrusted.
2. Re-test the webhook path.
3. Check both MongoDB and Google Sheets flows if the change affects conversation logic.

## Docs That Matter Most

- [\.github/copilot-instructions.md](.github/copilot-instructions.md) -> agent entry point and operating rules
- [ARCHITECTURE.md](ARCHITECTURE.md) -> layered architecture and dual-flow design
- [src/tests/README.md](src/tests/README.md) -> test structure and commands
- [src/tests/FIXTURES_GUIDE.md](src/tests/FIXTURES_GUIDE.md) -> fixtures, factories, helpers
- [RATE_LIMITING.md](RATE_LIMITING.md) -> rate limiter behavior
- [SECURITY_CONFIG.md](SECURITY_CONFIG.md) -> security configuration details
