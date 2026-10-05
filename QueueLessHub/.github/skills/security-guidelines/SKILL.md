---
name: security-guidelines
description: "Apply QueueLessHub security practices for authentication, authorization, input validation, rate limiting, webhooks, and sensitive data. Use when a change handles untrusted input, credentials, user data, or security controls."
---

# Security Guidelines

Before making a security-sensitive change, read `../../../docs/skills/SECURITY-GUIDELINES.md` and consult `SECURITY_CONFIG.md` or `RATE_LIMITING.md` where relevant.

Treat request and webhook payloads as untrusted, preserve authentication and rate-limit safeguards, validate before persistence or external calls, and never expose secrets or sensitive personal data in logs.