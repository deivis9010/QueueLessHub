---
name: new-test-fixtures
description: "Add fixtures, factories, and helpers for a model following QueueLessHub's existing test-data patterns. Use when a new model needs reusable test data or several tests duplicate the same setup."
---

# New Test Fixtures, Factories, and Helpers

Before adding test data for a new or changed model, read
`../../../docs/skills/NEW-TEST-FIXTURES.md`.

Add a fixture file, a factory function, and (if needed) a helper, following the structure in
`src/tests/fixtures/`, `src/tests/factories/`, and `src/tests/helpers/testHelpers.ts`, and update
`FIXTURES_GUIDE.md` so the new resources are discoverable.
