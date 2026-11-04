---
name: error-handling
description: "Handle errors in QueueLessHub services, controllers, middleware, and database operations consistently. Use when adding error paths, mapping failures to HTTP responses, or troubleshooting error propagation."
---

# Error Handling

Read `docs/skills/ERROR-HANDLING.md` before changing error behavior. Follow the existing async flow and shared error middleware; keep HTTP status mapping at the appropriate boundary and avoid leaking internal details.