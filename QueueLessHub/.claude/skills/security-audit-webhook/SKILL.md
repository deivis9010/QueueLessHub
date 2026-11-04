---
name: security-audit-webhook
description: "Validate a new or changed webhook, bot, or URL-accepting endpoint against QueueLessHub's SSRF, CSRF-exemption, and rate-limiting rules. Use when touching /api/bot routes or any endpoint that accepts an external URL."
---

# Security Audit: Webhook / Untrusted-URL Endpoints

Before finishing a change to a webhook or URL-accepting endpoint, read the checklist at
`docs/skills/SECURITY-AUDIT-WEBHOOK.md` and report the result as a pass/fail list.

Treat all webhook input as untrusted, require URL validation via `urlValidator.ts` for any
client-supplied URL, keep the existing CSRF exemption intact, and confirm rate limiting and a
blocked-pattern test are both in place.
