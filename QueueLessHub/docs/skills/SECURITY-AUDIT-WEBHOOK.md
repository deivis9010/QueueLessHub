# Security Audit: Webhook / Untrusted-URL Endpoints

Checklist to validate a new or changed webhook, bot, or external-URL-accepting endpoint against
QueueLessHub's SSRF and injection protections. Use this instead of re-deriving the attack surface
from scratch each time.

## When to Use

- Adding or changing a route under `/api/bot/*` or `/api/bot/spreadsheet/*`.
- Adding any endpoint that accepts a URL from the client (webhook registration, callback URL,
  external fetch target, etc.).

## Checklist

1. **Untrusted input.** Treat the entire payload as untrusted — do not assume shape, size, or
   encoding. Validate before use (see `/security-guidelines`).
2. **URL validation.** If the endpoint accepts or forwards a URL, it must go through
   [urlValidator.ts](../../src/middlewares/urlValidator.ts) (`validateWebhookUrl` or
   `validateUrlInBody`). Confirm the blocked list still covers, at minimum:
   - Non-`http(s)` protocols (`file://`, `ftp://`, `gopher://`, `data://`, `dict://`, `ldap://`, `sftp://`, `tftp://`, `telnet://`).
   - Private/loopback/link-local ranges (`127.0.0.0/8`, `10.0.0.0/8`, `172.16.0.0/12`,
     `192.168.0.0/16`, `169.254.0.0/16`, `localhost`).
   - Cloud metadata endpoints (`169.254.169.254`, `metadata.google.internal`, `100.100.100.200`).
   - Null-byte injection and excessive URL length.
   See [SECURITY_CONFIG.md](../../SECURITY_CONFIG.md) for the full attack-pattern reference.
3. **CSRF exemption is intentional.** Webhook routes are expected to skip CSRF (`skipCsrf()`)
   because external callers cannot supply a token — do not add CSRF to a webhook route, and do
   not remove the exemption from non-webhook routes without a reason.
4. **Rate limiting.** Webhook/bot routes must stay behind the webhook limiter (see
   [RATE_LIMITING.md](../../RATE_LIMITING.md)); do not bypass it for a new sub-route.
5. **No sensitive data in logs.** Confirm the handler does not log tokens, credentials, or full
   raw payloads containing personal data.
6. **Tests.** Add a test asserting that at least one blocked protocol/IP pattern is rejected with
   the expected 400 response, alongside the happy-path test.

## Output

Report findings as a short pass/fail list against the checklist above; do not silently fix issues
without flagging them, since URL validation changes affect multiple routes.
