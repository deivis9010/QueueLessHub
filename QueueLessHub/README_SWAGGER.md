# Swagger documentation for QueueLessHub

This project now includes Swagger (OpenAPI) documentation.

What was added
- `swagger-jsdoc` and `swagger-ui-express` added to `package.json` dependencies.
- `src/swagger.ts` - swagger-jsdoc configuration and spec generator.
- `src/app.ts` now mounts the Swagger UI at `/api-docs`.

Install dependencies

Open a terminal in the project root and run:

```powershell
npm install
```

Running the app and viewing docs

Start the server (dev):

```powershell
npm run dev
```

Open the Swagger UI at:

```
http://localhost:3000/api-docs
```

Notes
- `swagger-jsdoc` will scan JSDoc comments in `./src/routes/*.ts`, `./src/controllers/*.ts` and `./src/models/*.ts` to generate the OpenAPI spec. Add JSDoc-style OpenAPI comments to your route/controller files to document endpoints, parameters and schemas.
- You can set `SWAGGER_BASE_URL` env var to change the server URL shown in the docs.

Examples
- Add a JSDoc block above an Express route in `src/routes/auth.routes.ts` like:

```js
/**
 * @openapi
 * /api/auth/register:
 *   post:
 *     summary: Register a new user
 *     tags:
 *       - Auth
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               username:
 *                 type: string
 *               password:
 *                 type: string
 *               role:
 *                 type: string
 *     responses:
 *       200:
 *         description: User created
 */
```

This will surface the endpoint in the generated Swagger UI.

If you want, I can:
- Add JSDoc comments for the main endpoints (`/api/auth`, `/api/users`, `/api/doctors`, `/api/appointments`) as a follow-up.
- Add a small script to auto-generate a static `swagger.json` file during build.
