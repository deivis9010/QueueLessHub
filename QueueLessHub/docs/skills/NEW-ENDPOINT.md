# New Endpoint Scaffold

Step-by-step checklist to add a new REST endpoint that follows QueueLessHub's layered
architecture (`routes -> controllers -> services -> models`). Use this instead of improvising the
order each time a new endpoint is requested.

## When to Use

- Adding a brand-new resource (route + controller + service, optionally a model).
- Adding a new action on an existing resource (e.g. a new sub-route).

## Steps

### 1. Route

Add the route in the matching `*.routes.ts` file (or create one following
`/naming-conventions`). Compose middleware in this order: `authenticate` (if needed) ->
`roleMiddleware`/`roleOrSelfMiddleware` (if needed, see `/security-guidelines`) -> request
validation -> rate limiter (if the endpoint is sensitive, see [RATE_LIMITING.md](../../RATE_LIMITING.md))
-> controller action. Routes must stay declarative — no business logic.

### 2. Controller

Add the controller action in the matching `*.controller.ts` file. The controller only reads
`req.params` / `req.body` / `req.query` / `req.user`, calls the service, and formats the HTTP
response using the shape in `/api-design-rules`. Wrap the call in `try/catch` and forward errors
with `next(error)` (see `/error-handling`).

### 3. Service

Put the business rule in the matching `*.service.ts` file. Services own data access, validation
shortcuts, and orchestration across models. Throw `HttpError` for expected failure cases (not
found, conflict, etc.).

### 4. Model (only if the data shape changes)

Update the Mongoose schema in the matching `*.model.ts` file. Do not add HTTP concerns to models.

### 5. Types

Add or update the request/response/domain types in `src/types/` following the existing
per-domain file layout (see [src/types/README.md](../../src/types/README.md)). Avoid `any`.

### 6. Tests

Add unit tests for the service and controller, and an integration test for the route, following
`/testing-requirements`. Cover both the success path and the expected failure paths (403, 404,
400). Reuse fixtures/factories/helpers from `src/tests/` instead of inlining test data — see
`/new-test-fixtures` if the resource needs new ones.

### 7. API docs

If the endpoint is public, document it with an `@openapi` JSDoc block — see `/document-endpoint`.

### 8. Validate

Run the narrowest useful test command for the touched files, then the `/pre-commit-checklist`.

## Do Not

- Do not query the database directly from a controller.
- Do not skip rate limiting on auth, webhook, or write-heavy endpoints.
- Do not add a new endpoint without a matching test.
