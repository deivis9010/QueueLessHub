# Error Handling Patterns

Error handling patterns and best practices for QueueLessHub.

## Core Rule

Always use a consistent API error pattern and pass unexpected errors to the central error middleware.

## In Services

```javascript
exports.documentService = {
  async getById(id, userId) {
    if (!id) {
      throw new HttpError(400, 'Document ID is required');
    }

    const document = await Document.findById(id);
    if (!document) {
      throw new HttpError(404, 'Document not found');
    }

    if (document.uploadedBy.toString() !== userId) {
      throw new HttpError(403, 'Access denied');
    }

    return document;
  }
};
```

## In Controllers

```javascript
exports.getDocument = async (req, res, next) => {
  try {
    const document = await documentService.getById(req.params.id, req.user.id);
    res.json({ success: true, data: document });
  } catch (error) {
    next(error);
  }
};
```

## Error Middleware

The middleware should:

- map known errors to the right HTTP status,
- avoid exposing stack traces to clients,
- log enough context for debugging,
- keep sensitive data out of logs.

## Common Status Codes

- `400` Bad Request: invalid input or validation failure
- `401` Unauthorized: authentication required or failed
- `403` Forbidden: authenticated but not allowed
- `404` Not Found: resource does not exist
- `409` Conflict: duplicate or incompatible state
- `500` Internal Server Error: unexpected failure

## Async Error Handling

- Wrap async controller handlers in try/catch.
- Call `next(error)` instead of sending ad-hoc error responses.
- Keep service methods throwing domain errors, not HTTP side effects.

## Logging Errors Safely

- Log context, not secrets.
- Do not log tokens, passwords, or personal data.
- Prefer structured logs with request metadata when available.

## Current Stack Note

The project is TypeScript-first, so keep the same error flow and tighten the typing around `unknown` errors and error guards.
