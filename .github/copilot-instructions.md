# Copilot / AI Agent Instructions for Akera

Short context

- Backend: Node.js + Express (ES modules). Entry: `backend/index.js`.
- DB: MongoDB via `mongoose` (models in `backend/models`).
- API prefix: `/api/v1/*`. Swagger available at `/api-docs`.

Quick commands

- Dev server: `npm run dev` (runs `nodemon backend/index.js`).
- Start (production): `npm start` (sets `VITE_NODE_ENV=production`).
- Tests: `npm test` (runs Jest with `VITE_NODE_ENV=test`, `--runInBand`).
- Frontend build: `npm run build` runs install/build in `frontend` via `--prefix`.

Architecture & important files

- `backend/index.js`: app setup, global middleware, route registration, swagger, and server start.
- `backend/routes/*`: route definitions that map to controllers under `backend/controllers`.
- `backend/controllers/*`: request handling and orchestration; heavy business logic may live in `backend/services`.
- `backend/models/*`: Mongoose schemas. Use `mockingoose` in tests to mock models.
- `backend/middlewares/*`: centralized error handling (`errorHandler.js`), `activityLogger`, `idempotency`, and security helpers (e.g., `xssProtection`).
- `backend/config/*`: DB, redis, and rate-limit configuration. `config/config.js` exports `CORS_OPTIONS` and `RATE_LIMIT_OPTIONS` used in `index.js`.

Conventions & patterns to follow

- ES modules only: use `import` / `export` and keep `type: "module"` in `package.json`.
- API routes use `/api/v1` prefix and are organized by resource (users, companies, partners, operations, payments, shipments, dollars, etc.). See `backend/index.js` for full list.
- Async route handlers: follow the existing `catchAsync` pattern from `backend/middlewares/errorHandler.js` to forward errors to the central handler.
- Responses sometimes pass through `responseFormatter.js` (commented out in `index.js`) — preserve existing response shape when modifying endpoints.
- Security: middleware chain includes `helmet`, `express-rate-limit` (configured via `config/RATE_LIMIT_OPTIONS`), CORS (`CORS_OPTIONS`), and `xssProtection`. Do not remove these without addressing the security implications.

Testing notes

- Tests run with `VITE_NODE_ENV=test` (see `package.json` test script). Keep this env in test runners to match app behavior.
- Use `mockingoose` to stub Mongoose models and `jest-mock-req-res` to build request/response objects. Integration tests use `supertest` against the exported `app` (the server is not started when `NODE_ENV === 'test'`).
- Jest runs `--runInBand` to avoid concurrency issues with the DB mocks.

Integrations & environment

- External services: Redis, AWS SDK, Mailtrap, Bull/Kue (job queues), and Swagger. Configuration lives in `backend/config` and env vars in `.env`.
- Required env vars (discoverable): `DATABASE_URI`, `JWT_SECRET`, `VITE_NODE_ENV`, `MAILTRAP_TOKEN`, `PORT`.

When making changes

- Update or add tests in `backend/tests` alongside controller/service changes. Prefer unit tests with mocked models over spinning a real DB.
- Keep imports consistent (relative ESM paths). Avoid toggling `process.env.NODE_ENV` in code — tests rely on the server not starting when `NODE_ENV === 'test'`.
- If adding a route, register it in `backend/index.js` under the appropriate path and add Swagger docs if the change affects the public API.

Places to inspect for examples

- App bootstrap: [backend/index.js](backend/index.js)
- Configs: [backend/config/config.js](backend/config/config.js) and [backend/config/connectDB.js](backend/config/connectDB.js)
- Error wrapper & helpers: [backend/middlewares/errorHandler.js](backend/middlewares/errorHandler.js)
- Tests: [backend/tests](backend/tests)

If anything here seems incomplete or you want more examples (e.g., common controller idioms, a small test template, or a recommended Swagger doc pattern), say which area and I will expand.
