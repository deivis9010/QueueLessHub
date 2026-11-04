---
name: new-endpoint
description: "Scaffold a new QueueLessHub REST endpoint end-to-end across route, controller, service, model, types, and tests. Use when adding a new resource or a new action on an existing resource."
---

# New Endpoint Scaffold

Before adding a new endpoint, read the detailed checklist at `docs/skills/NEW-ENDPOINT.md`.

Follow the routes -> controllers -> services -> models order, keep middleware composition
consistent with existing routes, and add tests and (if public) Swagger docs in the same change.
