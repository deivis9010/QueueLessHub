# Project Guidance Reference

This directory remains the detailed documentation source for project guidance. Agent-discoverable skills live in `.github/skills/` (Copilot) and `.claude/skills/` (Claude Code), kept in sync; each skill points to the relevant document here so this documentation can remain the canonical detailed reference.

Load a skill on demand (same names in Copilot and Claude Code) using:

```
/coding-standards        # Code patterns, architecture, layered structure
/testing-requirements    # Testing rules, patterns, coverage requirements
/security-guidelines     # Security best practices, input validation
/api-design-rules        # REST API design, responses, status codes
/naming-conventions      # File, class, function, and variable naming
/workflow-commands       # npm commands, development workflow
/pre-commit-checklist    # Pre-commit workflow and requirements
/error-handling          # Error handling patterns and HttpError usage
/new-endpoint            # Scaffold a new endpoint (route -> controller -> service -> model -> tests)
/security-audit-webhook  # Audit a webhook/URL-accepting endpoint against SSRF/CSRF/rate-limit rules
/new-test-fixtures       # Add fixtures/factories/helpers for a model
/document-endpoint       # Add or update the Swagger/OpenAPI block for a route
```

## Getting Started

1. First time? Read [USAGE-GUIDE.md](USAGE-GUIDE.md) for practical examples.
2. Need validation? Check [VALIDATION-REPORT.md](VALIDATION-REPORT.md) for completeness.
3. Quick question? See the "When to Use Each Skill" section below.
4. Specific topic? Use the table below.

## When to Use Each Skill

| Skill | Use When... |
|-------|-------------|
| **coding-standards** | Building features, creating services/controllers, architecture questions |
| **testing-requirements** | Writing tests, checking coverage, test patterns |
| **security-guidelines** | Handling user input, file uploads, authentication, security concerns |
| **api-design-rules** | Designing new endpoints, working with responses, status codes |
| **naming-conventions** | Naming variables, functions, files, interfaces |
| **workflow-commands** | Need to run commands, debugging, troubleshooting |
| **pre-commit-checklist** | Before committing code changes |
| **error-handling** | Raising errors, catching exceptions, logging |
| **new-endpoint** | Adding a new resource or action, scaffolding route/controller/service/model/tests |
| **security-audit-webhook** | Touching `/api/bot` routes or any endpoint accepting an external URL |
| **new-test-fixtures** | A new model needs reusable test data, or tests duplicate the same setup |
| **document-endpoint** | A public endpoint was added or its request/response/status codes changed |

The full skills list with one-line descriptions lives in
[.github/copilot-instructions.md](../../.github/copilot-instructions.md) under "Quick Skills
Reference" — refer there instead of duplicating it here.

## Content Quality

Each skill file should be:

- concise enough to scan quickly,
- explicit about what agents should do,
- aligned with the current TypeScript-first codebase,
- clear that the typed runtime is the active reference.

## Recommended Reading Order

### For New Developers
1. This README
2. [USAGE-GUIDE.md](USAGE-GUIDE.md)
3. `/naming-conventions`
4. `/coding-standards`
5. `/testing-requirements`

### For Code Review
1. `/coding-standards`
2. `/api-design-rules`
3. `/testing-requirements`
4. `/security-guidelines`
5. `/naming-conventions`

### For Debugging
1. `/error-handling`
2. `/workflow-commands`
3. `/pre-commit-checklist`

### For Security-Sensitive Work
1. `/security-guidelines`
2. `/coding-standards`
3. `/error-handling`

## Questions?

### "For complete details?"
→ See [\.github/copilot-instructions.md](../../.github/copilot-instructions.md)

### "For quick overview?"
→ See [\.github/copilot-instructions.md](../../.github/copilot-instructions.md) and this README.

## Success Criteria

After reading the relevant skills, an agent should be able to:

- know where to put code,
- name files and functions consistently,
- write tests for new behavior,
- handle errors properly,
- design secure APIs,
- run the right commands,
- and know what to do before committing.
