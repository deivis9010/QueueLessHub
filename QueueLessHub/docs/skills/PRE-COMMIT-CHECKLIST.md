# Pre-Commit Checklist

Complete checklist before committing any code changes to the repository.

## Mandatory Pre-Commit Steps

Run these commands in order. All must pass or stop.

### Step 1: Linting

```bash
npm run lint
```

### Step 2: Testing

```bash
npm test
```

### Step 3: Build or Final Validation

If the repository has a build or typecheck step for the current task, run it. If not, use the strongest available validation command for the touched area.

## TypeScript Rule

`npm run check` and `npm run build` are mandatory before commit because the project is TypeScript-first.

## Review Checklist

- [ ] Business logic is in services, not controllers
- [ ] Controllers only handle HTTP concerns
- [ ] Middlewares are used appropriately
- [ ] Database access only in services
- [ ] Error handling is consistent
- [ ] New features have tests
- [ ] Bug fixes include regression tests
- [ ] User input is validated
- [ ] Sensitive data is not logged
- [ ] No hardcoded secrets
- [ ] README or specialized docs updated when needed

## What Not to Commit

- `.env` files
- secrets or tokens
- `node_modules/`
- coverage output
- build artifacts
- editor or OS junk files

## Commit Message Format

Use clear, descriptive commit messages.

```text
<type>(<scope>): <subject>
```

