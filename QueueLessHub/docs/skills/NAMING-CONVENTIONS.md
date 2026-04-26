# Naming Conventions

Naming standards for files, classes, functions, and variables in QueueLessHub.

## File Naming

Use lowercase, descriptive names with dots for roles.

```text
*.controller.ts
*.service.ts
*.model.ts
*.routes.ts
*.middleware.ts
```

Examples:
- `auth.controller.ts`
- `appointment.service.ts`
- `rateLimit.middleware.ts`
- `user.model.ts`

## Function Names

Use camelCase.

- `getUserById`
- `createAppointment`
- `validatePassword`
- `handleWebhookMessage`

## Class Names

Use PascalCase.

- `HttpError`
- `ValidationError`
- `AuthService`
- `AppointmentController`

## Variables

- Use camelCase for variables.
- Use SCREAMING_SNAKE_CASE for constants.
- Use boolean prefixes like `is`, `has`, `can`, `should`.

## Interfaces and DTOs

TypeScript is the current standard, so keep names aligned with the typed codebase.

- Use clear nouns for payloads and domain shapes.
- Prefer clear, typed domain names that remain stable across controllers, services, and tests.

## Tests

- Describe blocks should name the unit under test.
- Test cases should start with `should` and describe observable behavior.

## Current Stack Note

The project is TypeScript-first, so file names should already reflect the typed runtime and avoid future-only conventions.
