<!-- Use this file to provide workspace-specific custom instructions to Copilot. For more details, visit https://code.visualstudio.com/docs/copilot/copilot-customization#_use-a-githubcopilotinstructionsmd-file -->

# QueueLessHub - Agent Instructions

## Purpose

Use this file as the main entry point for Copilot and other AI agents working in this repository.
Follow the rules below before changing code, documentation, tests, or configuration.

## Quick Skills Reference

Load the most relevant guidance first:

- `/coding-standards` -> layered architecture, controller/service boundaries, repository conventions
- `/testing-requirements` -> Jest patterns, fixtures, integration tests, coverage targets
- `/security-guidelines` -> auth, rate limiting, input validation, secrets, webhook safety
- `/api-design-rules` -> REST naming, status codes, request and response shapes
- `/naming-conventions` -> file names, symbols, env vars, route names
- `/workflow-commands` -> npm scripts, local run, debug, validation commands
- `/pre-commit-checklist` -> required checks before asking for review
- `/error-handling` -> middleware errors, async flow, DB errors, status mapping

## Project Context

- Backend Node.js with Express, TypeScript, and MongoDB Atlas.
- The codebase is TypeScript-first; keep runtime and documentation aligned with the migrated stack.
- The app exposes APIs for users, doctors, appointments, availability, clients, and conversations.
- There are two business flows: automatic MongoDB-based scheduling and Google Sheets-based manual coordination.
- The project includes webhook simulation, WhatsApp conversation flow, logging middleware, rate limiting, and error handling.

## Working Rules for Agents

1. Prefer the smallest change that solves the task.
2. Preserve the existing architecture: routes -> controllers -> services -> models.
3. Do not move business logic into routes or controllers.
4. Do not introduce new dependencies unless the task truly requires them.
5. Do not touch secrets, `.env` values, or generated coverage output.
6. When behavior changes, update tests and documentation together.
7. When a file already has a clear pattern, follow that pattern instead of inventing a new one.
8. If a task spans multiple concerns, split it into the smallest safe step.

## Essential Commands

Use the repository scripts first.

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

## Validation Rules

- Run the narrowest useful test after a change.
- If a controller changes, validate the related route or integration test.
- If a service changes, validate the service unit tests and any dependent integration tests.
- If a middleware changes, validate the security or error-handling path directly.
- If a config file changes, check startup behavior and the affected route path.

## Architecture Guardrails

- Routes should only define endpoints and middleware order.
- Controllers should handle HTTP details only.
- Services should hold business rules and data access orchestration.
- Models should define schema and persistence behavior.
- Middlewares should be reusable and focused on one concern.

## Security Guardrails

- Validate and sanitize user input before persistence or external requests.
- Keep JWT and role checks in the auth middleware, not in scattered controllers.
- Preserve rate limiting on auth and webhook surfaces.
- Avoid logging secrets, tokens, or sensitive personal data.
- Treat webhook inputs as untrusted.

## Testing Expectations

- Add or update tests for every behavior change.
- Prefer fixtures and helpers over hard-coded repeated data.
- Cover success and failure paths, not just the happy path.
- Keep test names descriptive and behavior-focused.

## Documentation Expectations

- Update the most relevant `.md` file when you change behavior, setup, or security.
- Keep `README.md` high-level.
- Put detailed rules in specialized docs, not in the root README.
- Use short references at the top of docs so agents can jump to the right topic quickly.

## Do Not

- Do not rewrite unrelated modules during a focused task.
- Do not refactor for style alone unless the task asks for it.
- Do not remove existing safeguards unless a better replacement is added in the same change.
- Do not reintroduce JavaScript-era conventions that conflict with the TypeScript codebase.

## Preferred Workflow

1. Inspect the smallest relevant area.
2. Form one local hypothesis about how the code works.
3. Make the smallest safe change.
4. Validate immediately with the narrowest executable check available.
5. Update docs and tests if behavior changed.
6. Stop once the task is solved.

## Current Source Documents

- [README.md](../README.md) -> project overview and setup
- [ARCHITECTURE.md](../ARCHITECTURE.md) -> layered architecture and dual-flow design
- [DEVELOPMENT.md](../DEVELOPMENT.md) -> setup, debug, commands, and validation workflow
- [docs/skills/README.md](../docs/skills/README.md) -> skill index and topic navigation
- [src/tests/README.md](../src/tests/README.md) -> testing structure and conventions
- [src/tests/FIXTURES_GUIDE.md](../src/tests/FIXTURES_GUIDE.md) -> fixtures, factories, helpers
- [src/tests/MIGRATION_GUIDE.md](../src/tests/MIGRATION_GUIDE.md) -> historical test migration notes
- [RATE_LIMITING.md](../RATE_LIMITING.md) -> rate limiter behavior
- [SECURITY_CONFIG.md](../SECURITY_CONFIG.md) -> security configuration details
- [VERCEL_DEPLOY.md](../VERCEL_DEPLOY.md) -> deployment notes

## Notes for the TypeScript Codebase

- Keep the documented architecture aligned with the current TypeScript implementation.
- Preserve the current file layout and names unless a task explicitly asks for a rename or refactor.
- Keep the documentation focused on the active runtime, not on a legacy JavaScript baseline.
- Do not use `any` as a default typing strategy. Use `unknown`, explicit interfaces, unions, generics, or type guards instead.
- Allow `any` only as a temporary bridge at an external boundary when a safer type cannot be introduced yet, and replace it as part of the same migration step.
