# Document an Endpoint (Swagger / OpenAPI)

Checklist to add or update the `@openapi` JSDoc block for a route so it shows up correctly in the
generated Swagger UI, instead of leaving new endpoints undocumented.

## When to Use

- A new public endpoint was added (see `/new-endpoint`).
- An existing endpoint's request/response shape, status codes, or auth requirement changed.

## Steps

1. Add an `@openapi` JSDoc comment directly above the route definition in the matching
   `src/routes/*.ts` file, following the structure already used by sibling routes in the same
   file (path, method, tags, requestBody or parameters, responses).
2. List every status code the controller can actually return (200/201, 400, 401, 403, 404, 409,
   500 as applicable) per `/api-design-rules` — do not just document the happy path.
3. If the endpoint requires authentication or a specific role, note it in the `description` or via
   `security` so consumers of the docs know the access requirement (see `/security-guidelines`).
4. Regenerate the spec and confirm it builds cleanly:
   ```powershell
   npm run swagger:generate
   ```
5. Start the dev server and spot-check the endpoint at `http://localhost:3000/api-docs` (see
   [README_SWAGGER.md](../../README_SWAGGER.md)).

## Do Not

- Do not hand-edit a generated `swagger.json`; always edit the JSDoc source and regenerate.
- Do not document request/response shapes that don't match the actual TypeScript types in
  `src/types/`.
