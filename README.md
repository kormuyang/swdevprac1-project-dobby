# Dobby Rental Car Booking

A rental car booking backend by Saint (A) and Poom (B). A00 includes a partial Express foundation, health/docs routes, and development/start scripts. Feature APIs, feature-owned tests, database setup scripts, and integration/demo checks remain planned.

## Start here

- [Requirements](docs/requirements.md): what the system needs to do.
- [Implementation plan](docs/implementation-plan.md): who works on each task and what to start next.
- [Design](docs/design.md) and [OpenAPI](docs/contracts/openapi.json): data, service functions and endpoints.
- [Decisions](docs/decisions.md): agreed choices and remaining questions.
- [Test checklist](docs/acceptance-checklist.md): cases to check before calling a feature done.

Follow [AGENTS.md](AGENTS.md) when coding. Use Node 24. Copy `.env.example` to `.env` and set `MONGO_URI` before starting the server.

`server.js` defines the middleware and listener, and invokes `connectDB()` without awaiting it. `config/db.js` enables Mongoose `strictQuery`, connects using `MONGO_URI`, and logs the connected host.

A Node 24 smoke check passed for startup, cookie parsing, health, CORS/Helmet headers, Swagger, and the JSON 404 response. Environment loading and database access were mocked. Startup and health also passed under Node 24 against a temporary local MongoDB 8.0.38 replica set. Connection rejection was checked to exit with status 1 and a generic message. Atlas remains unverified.

Install dependencies and run the available development/start commands:

```text
npm ci
npm run dev
npm start
```

No test, integration, seed/reset, or Newman demo scripts exist yet. Add them with their corresponding tasks. The dependency manifest includes JWT, bcrypt, and Newman packages, but their application features are not implemented.
