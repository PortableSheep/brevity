# Drizzle + SQLite

**Tested:** drizzle-orm 0.45.4 and @libsql/client 0.15.15, on Node.js 22.
No Brevity plugin is needed.

## Open a repository

<<< @/samples/tutorial/store.ts

The client is process-owned, not request-owned. Route handlers receive the
repository explicitly through [createNotebook](/guide/tutorial#_5-wire-get-post-errors-and-redirect).
SQL values go through Drizzle, not string concatenation.

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

Run `npm run docs:check`. The tests insert into a real temporary SQLite file
and reopen it before cleanup. They do not establish distributed durability or
production throughput.
