# Testing Requirements & Patterns

Complete testing rules, patterns, and requirements for QueueLessHub.

## Test Structure

```
src/tests/
├── unit/
├── integration/
├── fixtures/
├── factories/
└── helpers/
```

## Mandatory Testing Rules

- All tests must pass before merging.
- New features must include tests.
- Bug fixes must include regression tests.
- Coverage must not decrease.

## Coverage Targets

- Minimum overall coverage: 70%
- New code: >80%
- Critical flows: >90%

## Current Stack Note

The project is TypeScript-first, so tests should target the typed runtime and keep the same coverage expectations.

## Test Patterns

- Use builders or fixtures instead of hard-coded data.
- Use descriptive test names that describe behavior.
- Prefer unit tests for services and integration tests for endpoints.

## Running Tests

```bash
npm test
npm run test:coverage
npm run test:unit
npm run test:integration
```

