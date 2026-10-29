# Development Guide - QueueLessHub

> For the full skills index, see [.github/copilot-instructions.md](.github/copilot-instructions.md)
> or load `/workflow-commands` and `/pre-commit-checklist` directly — they are the most relevant
> skills for day-to-day development.

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
4. The webhook always answers 200 after logging. Meta retries any non-200 response, so a failure must never bubble up as a 500.
5. Duplicate deliveries are ignored through the `ProcessedMessage` collection (unique `wamid`, 7-day TTL).
6. A conversation closes with a `closedReason` (`completed`, `invalid_input`, `timeout`, `error`, `send_failed`). After it closes, the bot stays silent until the client sends a new message, which starts a new conversation.
7. Conversations expire after 10 minutes without activity. The expiry is checked on the next inbound message.
8. Patient-facing texts are in English. Times are shown in the America/Merida time zone.
9. Replies that fail to send are stored in the `OutboundMessage` collection (outbox). `startOutboxWorker()` in `src/server.ts` retries them every 15 seconds, with 30 s and 2 min delays. After 3 failed attempts the reply is marked `failed` and its conversation closes with `send_failed`. The worker needs a long-running process; it does not run in serverless handlers.
10. Meta-approved message templates live in `src/services/whatsapp.templates.ts`. Business-initiated messages must use these templates. Sending them from the server is not implemented yet. Submit the `body` text to Meta before using them.
11. Run the flow tests after changes: `npx jest src/tests/unit/chatflow src/tests/unit/bot.controller.test.ts src/tests/unit/whatsapp.templates.test.ts src/tests/integration/chatflow.integration.test.ts src/tests/integration/outbox.integration.test.ts`.

## Docs That Matter Most

- [\.github/copilot-instructions.md](.github/copilot-instructions.md) -> agent entry point and operating rules
- [ARCHITECTURE.md](ARCHITECTURE.md) -> layered architecture and dual-flow design
- [src/tests/README.md](src/tests/README.md) -> test structure and commands
- [src/tests/FIXTURES_GUIDE.md](src/tests/FIXTURES_GUIDE.md) -> fixtures, factories, helpers
- [RATE_LIMITING.md](RATE_LIMITING.md) -> rate limiter behavior
- [SECURITY_CONFIG.md](SECURITY_CONFIG.md) -> security configuration details
