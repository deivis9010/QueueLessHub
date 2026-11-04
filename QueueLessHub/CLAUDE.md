# QueueLessHub - Claude Code Instructions

WhatsApp bot backend for booking medical appointments (Node.js, Express, TypeScript, MongoDB Atlas,
deployed on Vercel). Two business flows: automated MongoDB scheduling (`chatflow.service.ts`) and
legacy Google Sheets manual coordination (`chatflow.spreadsheet.service.ts`).

## Shared agent rules

The working rules, guardrails, and doc index are shared with Copilot and live in one place.
Edit that file (not this one) when a rule applies to every agent:

@.github/copilot-instructions.md

Links inside that file are relative to `.github/`, so `../README.md` means `README.md` at the
project root.

## Project layout

- `src/routes/` -> endpoints and middleware order only
- `src/controller/` -> HTTP concerns only (note: folder is singular)
- `src/services/` -> business rules, chat flow state machine, WhatsApp client, outbox worker
- `src/models/` -> Mongoose schemas
- `src/middlewares/` -> auth (JWT), CSRF, rate limit, URL validation (SSRF), DB error handler
- `src/types/` -> TypeScript types per domain
- `src/tests/` -> `unit/`, `integration/` (mongodb-memory-server), `fixtures/`, `factories/`, `helpers/`
- `docs/CHAT_FLOWS.md` -> source of truth for the WhatsApp conversation design
- `docs/skills/` -> canonical detailed guidance behind each skill

## Skills

Project skills live in `.claude/skills/` and mirror `.github/skills/`. Each one is a thin pointer
to `docs/skills/<NAME>.md`, which holds the real content. Invoke them with `/coding-standards`,
`/new-endpoint`, `/security-audit-webhook`, etc. When you add or change a skill, update both
`.claude/skills/` and `.github/skills/` so Claude and Copilot stay in sync.

## Commands

- Type check: `npm run check`
- Lint: `npm run lint` (CI on PRs uses `npm run lint:strict`, 0 warnings)
- Format check: `npm run format:check` (fix with `npm run format`)
- Single test file: `npx jest src/tests/unit/<file>.test.ts`
- Unit / integration: `npm run test:unit`, `npm run test:integration`
- Full local CI gate: `npm run ci` (check + format + lint:strict + tests)
- Swagger: `npm run swagger:generate`

Run the narrowest test first. Run `npm run ci` before declaring a multi-file change finished.
Coverage thresholds are global: 80% statements/functions/lines, 70% branches.

## Claude-specific notes

- Never read or edit `.env` or `google-credentials.json`; use `.env.example` and
  `google-credentials.example.json` to learn the expected keys.
- `main` is protected by PR validation. Work on a feature branch and only commit or push when asked.
- For changes that span several layers, use plan mode first and confirm the plan before editing.
- `dist/`, `coverage/`, and `*.log` are generated; do not edit them.
