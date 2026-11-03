# API Design Rules

REST API design rules and conventions for QueueLessHub.

## RESTful Endpoints

Use nouns for resources, not verbs.

```javascript
// Correct
GET    /api/documents
GET    /api/documents/:id
POST   /api/documents
PUT    /api/documents/:id
DELETE /api/documents/:id
```

## Response Format

Use a consistent response shape.

```javascript
{
  success: true,
  data: { id: 'doc-123', filename: 'report.pdf' }
}

{
  success: false,
  error: 'Document not found'
}
```

## HTTP Status Codes

- `200` for successful GET/PUT/PATCH
- `201` for created resources
- `204` for successful deletes with no body
- `400` for validation errors
- `401` for authentication failures
- `403` for authorization failures
- `404` for missing resources
- `409` for duplicates or conflicts
- `500` for unexpected server errors

## Query Parameters

Use query params for pagination, filtering, sorting, and search.

- `?page=1&limit=20`
- `?status=active`
- `?sort=-createdAt`
- `?fields=id,filename,createdAt`
- `?q=invoice`

## CORS and Headers

Keep CORS and security headers configured centrally. Avoid adding endpoint-specific CORS exceptions unless the task demands it.

## Current Stack Note

The project is TypeScript-first, so keep request and response contracts explicit and aligned with typed controllers and services.
