# Planning-package verification

This record distinguishes document/contract verification from future backend acceptance. No Dobby server, Atlas mutation, dependency installation, collection run or T01–T42 live test has been performed in this planning task.

## Checks available now

`node scripts/check-contract.js` uses only Node built-ins. It checks JSON parsing, local schema refs, required-field arrays, nullable enums, closed object shapes, unique operation IDs, path parameters/security/roles, endpoint inventory synchronization, FR-01–FR-14 operation coverage, T01–T42 presence, Markdown fences/links and absence of required example/Downloads links. It is a consistency checker, not a complete OpenAPI schema validator or application test.

Portable-copy and ignore checks are run against a temporary copy containing only the planning package, without the reference example, original PDFs or a backend. The source workspace is not initialized as a Git repo or pushed.

## Postman CLI limits observed

Local `postman spec lint docs/contracts/openapi.json --issueType syntax --no-report-events -o json` reported zero syntax violations after correcting an empty required array. However, it then exited 139 with a macOS Keychain `SecItemCopyMatching failed -50` error. Record the empty violation report as useful diagnostics, **not a clean successful CLI exit or complete validation certificate**. No cloud report/publish or workspace initialization was requested.

The installed CLI supports spec lint, but `postman status` returns unknown command (exit 1), so a workspace-status snapshot could not be obtained. No task result relies on a signed-in/initialized Postman workspace. Future implementation should run its chosen validator successfully in the shared development environment.

## Runtime guarantees still unverified

All acceptance cases remain planned. Actual Mongoose indexes/transactions, JWT revocation, ownership filters, endpoint responses, cap/overlap/suspension races and 3-second measurements must be established by the assigned tasks. The earlier example syntax check is historical evidence in example-review.md and does not certify the Dobby backend.

## Final package check results

- PASS: `node --check scripts/check-contract.js`.
- PASS: `node scripts/check-contract.js`: 34 operations, 45 schemas, FR-01–FR-14, T01–T42 and 27 Markdown files; refs/endpoint inventory/links/fences consistent.
- PASS: same checker from a temporary copy with no example/ or Example/ directory and no original PDFs. No required example/Downloads links were found.
- PASS: temporary Git ignore checks exclude example/Example, real env files and node_modules while retaining .env.example, practices, OpenAPI, checker and AGENTS.md.
- No source-workspace Git initialization, remote setup, push, deployment or reference-example mutation was performed. Temporary verification repository was removed.
- The Postman lint/status command limitations above remain; successful independent consistency checks do not erase those nonzero CLI exits or establish runtime guarantees.
