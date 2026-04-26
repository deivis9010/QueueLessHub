# Coding Standards & Architecture

Complete patterns and architecture guidelines for QueueLessHub.

## Project Context

- **Type:** Backend REST API service
- **Stack:** Node.js, Express.js, TypeScript, MongoDB (Mongoose)
- **Architecture:** Layered (Routes -> Controllers -> Services -> Models)
- **Auth:** JWT tokens with role-based checks

## Directory Structure

```
src/
├── controller/        # HTTP request handlers - validate and delegate
├── middlewares/       # Auth, rate-limit, validation, error handling
├── models/            # Mongoose schemas
├── routes/            # Express route definitions
├── services/          # Business logic and data access orchestration
├── tests/             # Unit, integration, fixtures, helpers
└── app.ts             # App configuration
```

## Code Patterns

### Controllers

Controllers handle only HTTP concerns: parsing requests and formatting responses.

```javascript
// Correct - controller delegates to service
exports.createDocument = async (req, res, next) => {
  try {
    const { filename, folderId } = req.body;
    const userId = req.user.id;

    const document = await documentService.create({ filename, folderId, userId });
    res.status(201).json({ success: true, data: document });
  } catch (error) {
    next(error);
  }
};
```

### Services

Services contain business logic and data access.

```javascript
// Correct - service handles business rules
exports.documentService = {
  async create(data) {
    const folder = await Folder.findById(data.folderId);
    if (!folder) {
      throw new HttpError(404, 'Folder not found');
    }

    return Document.create(data);
  }
};
```

### Models

Use Mongoose schemas with clear fields and indexes.

```javascript
const documentSchema = new mongoose.Schema(
  {
    filename: { type: String, required: true },
    folder: { type: mongoose.Schema.Types.ObjectId, ref: 'Folder' }
  },
  { timestamps: true }
);
```

### Middlewares

Chain middlewares in routes.

```javascript
router.post(
  '/',
  authenticate,
  requireRole(['admin', 'owner']),
  validateRequest(createDocumentSchema),
  documentController.create
);
```

## Error Handling

Use `HttpError` or the project's error middleware pattern for API errors.

```javascript
throw new HttpError(404, 'Document not found');
throw new HttpError(403, 'Access denied');
```

## Architecture Guardrails

- Routes only define endpoints and middleware order.
- Controllers only handle HTTP details.
- Services hold business rules and data access orchestration.
- Models define schema and persistence behavior.
- Middlewares stay reusable and focused on one concern.

## Type Safety Notes

The project is TypeScript-first today.

- Prefer explicit runtime validation.
- Keep code clear, low-ambiguity, and easy to type across layers.
- Avoid patterns that make controllers or services harder to maintain in TypeScript.
- Do not use `any` unless it is a short-lived bridge at an external boundary and there is a concrete follow-up to replace it.
- Prefer `unknown`, typed DTOs, discriminated unions, generics, and type guards instead of `any`.

## Do Not

- Do not move business logic into routes or controllers.
- Do not introduce new dependencies unless the task requires them.
- Do not rewrite unrelated modules during a focused task.
- Do not refactor for style alone.
