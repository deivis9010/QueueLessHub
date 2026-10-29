# Architecture Guide - QueueLessHub

> For the full skills index (`/coding-standards`, `/testing-requirements`, `/security-guidelines`, etc.),
> see [.github/copilot-instructions.md](.github/copilot-instructions.md) or load `/coding-standards`
> and `/api-design-rules` directly — they are the most relevant skills for this document.

## Purpose

This document explains how QueueLessHub is structured today and which architectural rules agents must preserve while making changes.

## System Overview

QueueLessHub is a Node.js backend with Express, TypeScript, and MongoDB Atlas. It exposes API endpoints for:

- users
- doctors
- appointments
- availability
- clients
- conversations
- webhook simulation and WhatsApp conversation flow

The project also supports two business flows:

1. Automated scheduling stored in MongoDB Atlas.
2. Manual coordination via Google Sheets for data collection and human follow-up.

## Layered Structure

The codebase follows a simple layered flow:

```text
routes -> controllers -> services -> models
```

### Routes

- Declare endpoints and middleware order.
- Do not contain business logic.
- Should stay thin and explicit.

### Controllers

- Handle HTTP concerns only.
- Read params, body, query and auth context.
- Call services and format responses.
- Should not query the database directly unless the current codebase already does so and refactoring is part of the task.

### Services

- Hold business rules and orchestration.
- Own data access decisions, validation shortcuts, and workflow composition.
- Are the best place for reusable logic that crosses endpoints.

### Models

- Define schema and persistence behavior.
- Represent the MongoDB documents and relations.
- Should not contain HTTP behavior.

## Current Domain Areas

### Users and Authentication

- Users authenticate with JWT.
- Roles currently include `admin`, `doctor`, and `user`.
- Authentication and role checks belong in middleware.

### Doctors

- Doctors are linked to users.
- Doctor operations should respect ownership and role rules.

### Appointments and Availability

- Availability drives appointment generation.
- Appointments are the central scheduling entity.
- Services should preserve the existing rules for slot generation and state transitions.

### Clients

- Clients are business entities.
- They are not authenticated users.
- Treat them as domain data, not identity records.

### Conversations and Bot Flow

- Conversation state is used to drive WhatsApp interactions. Conversations are `active` or `closed`, with a `closedReason`.
- Inbound messages are deduplicated through `ProcessedMessage`. Version-conditional updates prevent concurrent writes.
- Undelivered replies are stored in the `OutboundMessage` outbox. A worker started from `server.ts` retries them and closes the conversation with `send_failed` after the last attempt.
- Business-initiated messages use the templates in `whatsapp.templates.ts`. Sending is not implemented yet.
- The current code supports webhook simulation and a Google Sheets coordination flow.
- This area is sensitive to state handling and should be changed carefully.

## Dual Flow Design

### MongoDB Flow

Use this flow when the system should own scheduling end to end.

- The backend stores users, doctors, availability, appointments, clients, and conversations.
- Business logic decides how data is validated and linked.
- This is the main automated path.

### Google Sheets Flow

Use this flow when the business wants manual follow-up.

- WhatsApp collects user data step by step.
- The data is sent to Google Sheets.
- Human staff reviews the sheet and coordinates the next steps manually.
- This flow does not fully automate appointment assignment.

## Architectural Boundaries

Agents must preserve these boundaries:

- Routes stay declarative.
- Controllers stay HTTP-focused.
- Services own behavior.
- Models own persistence shape.
- Middlewares stay reusable and single-purpose.

If a change breaks one of these boundaries, the change should be treated as a refactor and validated more strictly.

## Error Handling Shape

- Use the existing middleware pattern for API errors.
- Prefer explicit status mapping over generic failure responses.
- Do not leak internal stack traces to clients.
- When changing error flows, update the relevant tests and docs together.

## Common Change Patterns

### Adding a New Endpoint

1. Define the route.
2. Add or update the controller.
3. Move domain logic into a service if the controller starts growing.
4. Add the model change only if the data shape changes.
5. Add tests for both success and failure paths.

### Changing Business Rules

1. Update the service first.
2. Verify the controller still only formats HTTP responses.
3. Update any affected validations or middleware.
4. Cover the change with tests.

### Touching Webhooks or Bot Flows

1. Keep untrusted input handling explicit.
2. Preserve current conversation states unless the task is to change them.
3. Validate both manual and automated flows.
4. Re-test the webhook path before merging.

## Current Constraints

- The project is TypeScript-first.
- Existing business rules and WhatsApp limits should be preserved unless the task explicitly changes them.
- Avoid introducing new abstractions unless they solve a real problem in the current code.

## Recommended Follow-Up Docs

- [README.md](README.md) -> high-level project overview
- [\.github/copilot-instructions.md](.github/copilot-instructions.md) -> agent entry point and operating rules
- [src/tests/README.md](src/tests/README.md) -> test structure and commands
- [src/tests/FIXTURES_GUIDE.md](src/tests/FIXTURES_GUIDE.md) -> fixtures and helpers
- [RATE_LIMITING.md](RATE_LIMITING.md) -> rate limiting behavior
- [SECURITY_CONFIG.md](SECURITY_CONFIG.md) -> URL validation and security notes

## What Agents Should Ask Themselves Before Editing

- Does this change preserve the route-controller-service-model flow?
- Does it keep business logic out of the controller?
- Does it affect both MongoDB and Google Sheets paths?
- Does it require tests and docs updates?
- Does it preserve current security and error handling behavior?
