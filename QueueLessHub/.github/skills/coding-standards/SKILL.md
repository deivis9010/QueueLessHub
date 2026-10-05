---
name: coding-standards
description: "Apply QueueLessHub's TypeScript conventions, layered architecture, and controller, service, model, and route boundaries. Use when implementing or refactoring backend code or deciding where code belongs."
---

# Coding Standards

Before changing application code, read the detailed project guidance at `../../../docs/skills/CODING-STANDARDS.md`.

Keep changes aligned with the routes -> controllers -> services -> models architecture. Put business rules in services, HTTP handling in controllers, and keep routes focused on endpoint and middleware composition. Follow existing TypeScript patterns and avoid `any` when a safer type is available.