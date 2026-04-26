# Workflow Commands

NPM commands and development workflow for QueueLessHub.

## Essential Commands

```bash
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

## Quality Commands

```bash
npm run lint
npm run lint:fix
```

## Development Rules

- Use the repository scripts first.
- Run the narrowest useful command for the task.
- Prefer tests over manual verification when behavior changes.
- Use debug mode only for local troubleshooting.
- Type-check and build are part of the standard workflow.

## Typical Workflow

1. Install dependencies.
2. Run `npm run check`.
3. Start the app with `npm run dev`.
4. Reproduce or implement the change.
5. Run the relevant test slice.
6. Run lint if the change touches code, not just docs.
7. Run `npm run build` and the broader test suite before review.

## Current Stack Note

The project is TypeScript-first, so keep build and type-check commands current as part of the regular workflow.
