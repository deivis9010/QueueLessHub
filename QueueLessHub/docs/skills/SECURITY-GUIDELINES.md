# Security Guidelines

Security rules and best practices for QueueLessHub.

## Core Security Principles

1. Never trust user input.
2. Validate and sanitize everything.
3. Hash passwords.
4. Protect routes with auth middleware.
5. Treat webhook inputs as untrusted.
6. Keep sensitive data out of logs.

## Input Validation and Sanitization

Validate route params, query params, and body payloads before passing them into services.

## Password Hashing

Use bcrypt with a strong cost factor. Never store passwords in plain text.

## Route Protection

Chain authentication, authorization, and validation middleware before handlers.

## File Uploads

Validate file size, MIME type, and filenames before saving anything to disk or cloud storage.

## JWT Security

Keep JWT payloads small and non-sensitive. Do not store secrets or private data in the token.

## Injection Prevention

Use Mongoose query patterns and avoid unsafe dynamic operators or string-built database queries.

## Error Handling Security

Return generic client-facing error messages. Log details server-side only.

## Environment Variables

Keep secrets in environment variables and out of version control.

## Current Stack Note

The project is TypeScript-first, so keep the same security rules and strengthen them with type-safe validation helpers.
