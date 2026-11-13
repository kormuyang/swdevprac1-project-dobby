# Dobby Rental Car Booking

A rental car booking backend by Saint (A) and Poom (B). The A00 backend foundation is in place; feature APIs, database setup scripts, and integration/demo checks are still to be built.

## Start here

- [Requirements](docs/requirements.md): what the system needs to do.
- [Implementation plan](docs/implementation-plan.md): who works on each task and what to start next.
- [Design](docs/design.md) and [OpenAPI](docs/contracts/openapi.json): data, service functions and endpoints.
- [Decisions](docs/decisions.md): agreed choices and remaining questions.
- [Test checklist](docs/acceptance-checklist.md): cases to check before calling a feature done.

Follow [AGENTS.md](AGENTS.md) when coding. Use Node 24 and copy `.env.example` to `.env`, then set `MONGO_URI` before starting the server. The current foundation supports:

```text
npm ci
npm run dev
npm start
npm run test:unit
```

Database-backed integration, seed/reset, and Newman demo commands will be added with A04. `.env.example` lists the configuration variables.
