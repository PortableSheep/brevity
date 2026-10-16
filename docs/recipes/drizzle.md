# Drizzle + SQLite

Use Drizzle directly; no Brevity database plugin is needed. This recipe uses
Drizzle 0.45.4 and libSQL client 0.15.15 with a local SQLite file.

## Open a repository

<<< @/samples/tutorial/store.ts

Open one client for the app and pass the repository to [createNotebook](/guide/tutorial#_5-wire-get-post-errors-and-redirect).
Drizzle parameterizes the SQL values.

SQLite/libSQL schema and transactions remain Drizzle's responsibility.
The tutorial creates its first table on startup; for a real app, generate and
review migrations using Drizzle's tooling and apply them as a deployment step.
Never assume `CREATE TABLE IF NOT EXISTS` updates an existing table.

## Transactions and shutdown

`add()` shows `db.transaction`: throw to roll back; let unexpected failures
reach core's logged generic 500. Keep transactions short. Lock contention,
timeouts, retries, and multi-process deployment policy are database decisions,
not framework guarantees.

<<< @/samples/tutorial/start.ts

Use `file:notebook.db` locally. For remote libSQL, configure its URL and token
in your application rather than adding provider configuration to core.
Never close the shared client at the end of each request.

Run `npm run docs:check` to check inserts and persistence after reopening SQLite.
