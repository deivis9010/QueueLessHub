---
name: document-endpoint
description: "Add or update the Swagger/OpenAPI JSDoc block for a route and regenerate the spec. Use after adding a new public endpoint or changing a request/response shape or status codes."
---

# Document an Endpoint (Swagger / OpenAPI)

Before finishing an endpoint change, read `../../../docs/skills/DOCUMENT-ENDPOINT.md`.

Add or update the `@openapi` JSDoc block above the route definition, document every status code
the controller can return, and run `npm run swagger:generate` to confirm the spec builds cleanly.
