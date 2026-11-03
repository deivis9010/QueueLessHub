# Skills Usage Guide - Practical Examples

This guide shows how to use the skills during real development scenarios.

---

## Scenario 1: Implementing a New Feature

**Goal:** Add a new endpoint or domain capability.

### Step 1: Understanding the Architecture
**Load:** `/coding-standards`
- Review services pattern
- Review controllers pattern
- Understand layered architecture
- Check type safety rules

### Step 2: Designing the API Endpoint
**Load:** `/api-design-rules`
- Choose HTTP method and status codes
- Design request and response format
- Plan pagination or filtering if needed

### Step 3: Naming Your Files and Functions
**Load:** `/naming-conventions`
- Check file naming
- Check function naming
- Check interface and DTO naming for the current TypeScript stack

### Step 4: Writing Tests
**Load:** `/testing-requirements`
- Create unit tests for services
- Create integration tests for the API endpoint
- Use fixtures and helpers

### Step 5: Security Review
**Load:** `/security-guidelines`
- Validate user input
- Check authorization
- Sanitize untrusted payloads

### Step 6: Error Handling
**Load:** `/error-handling`
- Use consistent API errors
- Implement proper status codes
- Log errors safely

### Step 7: Before Committing
**Load:** `/pre-commit-checklist`
- Run lint
- Run tests
- Run build or final validation if applicable

---

## Scenario 2: Fixing a Bug

**Goal:** Fix a runtime issue without breaking existing behavior.

1. Load `/testing-requirements` and create a regression test first.
2. Load `/error-handling` to understand the failure path.
3. Load `/coding-standards` to make the fix in the right layer.
4. Validate with the narrowest useful command from `/workflow-commands`.
5. Finish with `/pre-commit-checklist`.

---

## Scenario 3: Code Review

**Goal:** Review a pull request or a local change set.

1. `/coding-standards` -> architecture review
2. `/api-design-rules` -> endpoint and response review
3. `/testing-requirements` -> coverage and test quality
4. `/security-guidelines` -> input and auth checks
5. `/error-handling` -> status mapping and logging
6. `/naming-conventions` -> names and file layout
7. `/pre-commit-checklist` -> final readiness

---

## Scenario 4: Debugging a Runtime Error

**Goal:** Understand a 500 or broken flow.

1. `/workflow-commands` -> reproduce locally
2. `/error-handling` -> inspect the error path
3. `/coding-standards` -> check the right layer
4. `/testing-requirements` -> create a test that catches the failure

---

## Quick Reference

See the "When to Use Each Skill" table in [docs/skills/README.md](README.md) for the full skill-to-scenario mapping.

## Current Stack Note

The current project is TypeScript-first. Use these skills with that assumption today and keep the typed runtime patterns consistent.
