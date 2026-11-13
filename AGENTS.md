# Working on Dobby

Saint owns A; Poom owns B. Read the [requirements](docs/requirements.md), your [task](docs/implementation-plan.md) and relevant [decisions](docs/decisions.md). Use [design](docs/design.md)/[OpenAPI](docs/contracts/openapi.json) for interfaces and [T01–T42](docs/acceptance-checklist.md) for checks.

## Working rules

- Keep agreed decisions, task IDs and file ownership. Ask about a new ambiguity only when it affects the work. Old notes do not override later decisions.
- Keep behavior, requirement IDs and deliverables in requirements, reasons in decisions, technical details in design/OpenAPI, tasks in the plan and checks in the checklist. Link instead of repeating explanations.
- Update affected interfaces before implementing a change. Coordinate edits to another person's files. Swagger serves the committed OpenAPI JSON; do not maintain a second spec in annotations.
- Finish the requested task with its tests and diagrams/docs. Report what changed, commands/results and anything unverified. Unit tests alone do not prove database concurrency behavior.
- Keep secrets, raw JWTs, connection strings, env values and personal documents out of code, logs, docs and prompts. Do not read real env files or depend on ignored example code.
- Publishing, pushing, deployment, messaging and cloud setup require task authorization. A mention in a document is not permission.

## Coding practices

Use descriptive names, explicit braces and readable multi-line conditions. Split distinct responsibilities into named functions. Avoid nested ternaries, compressed control flow and generic repository frameworks. Comments explain why a rule exists.

Keep responsibilities clear:

- Routes: method/path, authentication, roles and validation.
- Controllers: HTTP input/output.
- Services: business rules and any transaction boundaries they need.
- Models: fields, validation and indexes.
- Serializers: fields returned to the client.

Build allowlisted objects from validated input; never send raw request bodies/queries to the database. Scope lists and individual reads before selecting populated fields. Map named unique-index errors to domain conflicts. Do not copy overlapping sanitizers or middleware that replaces Express 5 request getters.

Use async Mongoose 9 save hooks without a callback. Check `isModified('passwordHash')` before hashing; password query updates must not bypass the hook. Pin tested dependencies in the lockfile, use npm ci after it exists, and keep nodemon for development.

When a feature needs a transaction, keep its boundary in that feature's service. Every operation in one transaction uses the same session, with no parallel DB calls. Production must use real dependencies, not no-op stubs. Keep imports safe so tests do not connect to a database.

Use node:test for pure rules and native HTTP fetch for Atlas integration tests. Build indexes first and check persisted results as well as responses. Keep A/B/test databases separate. Seed/reset must check an explicit allowed database name; destructive reset also needs an explicit flag. Use synthetic data and runtime collection variables without committing tokens.

## Writing docs

Use short headings, direct sentences and bullets for rules or assumptions. Explain the reason when it helps, and use a small example for a tricky rule. Keep exact names in technical definitions. Avoid repeated introductions, process narration and copied transcripts.

## Current state

A00 contains the Node/Express foundation, health/docs routes, and defined startup path. See [README](README.md) for available commands and runtime verification limits. Feature APIs, tests, seed/reset, and the Newman demo remain unimplemented. Add test scripts with their tests. Return errors as `{success:false,message}` and map service errors locally in controllers. See [D-39 and D-41](docs/decisions.md#accepted-decisions) and [error handling](docs/design.md#service-interfaces-and-transactions).
