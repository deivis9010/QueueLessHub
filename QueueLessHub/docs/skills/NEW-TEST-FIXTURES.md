# New Test Fixtures, Factories, and Helpers

Checklist to add fixtures/factories/helpers for a new or changed model, following the existing
pattern instead of inlining test data in individual test files.

## When to Use

- A new Mongoose model is added and tests need reusable sample data.
- An existing model gains fields that several tests now need to set up repeatedly.

## Steps

1. **Fixture.** Add `src/tests/fixtures/<model>.fixture.ts` exporting a small set of named,
   static objects (e.g. `active`, `inactive`, `pending` — follow the vocabulary already used in
   [FIXTURES_GUIDE.md](../../src/tests/FIXTURES_GUIDE.md)). Export it from
   `src/tests/fixtures/index.ts`.
2. **Factory.** Add a `<model>Factory` function in `src/tests/factories/index.ts` that generates a
   valid document with sensible defaults, accepting an `overrides` object for the fields a given
   test cares about.
3. **Helpers.** If creating the fixture in the database requires more than one step (e.g.
   creating a related `User` first), add a helper in `src/tests/helpers/testHelpers.ts` under the
   matching helper group (`authHelpers`, `requestHelpers`, `modelHelpers`, `assertionHelpers`,
   `waitHelpers`).
4. **Use in tests.** Prefer the factory/fixture over hand-built literals in new or updated tests
   for that model.
5. **Document.** Add the new fixture/factory names to the relevant table in
   [FIXTURES_GUIDE.md](../../src/tests/FIXTURES_GUIDE.md) so other agents can discover them.

## Do Not

- Do not duplicate an existing fixture under a new name — extend the existing one with
  `overrides` instead.
- Do not put database-creation helpers directly in a `*.test.ts` file if more than one test needs
  them; move them to `testHelpers.ts`.
