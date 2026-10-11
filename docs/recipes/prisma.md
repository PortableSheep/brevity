# Prisma

**Tested:** prisma and @prisma/client 6.12.0, SQLite, Node.js 22.
Use Prisma directly; the same notebook needs only a different repository.

## Schema and generated client

<<< @/samples/prisma/schema.prisma

From the repository root:

```sh
PRISMA_DATABASE_URL=file:./notebook.db npx prisma generate --schema docs/samples/prisma/schema.prisma
PRISMA_DATABASE_URL=file:./notebook.db npx prisma db push --schema docs/samples/prisma/schema.prisma
```

`db push` is for a disposable development database. Use Prisma migrations and
`migrate deploy` for a reviewed production schema. Relative SQLite URLs in the
CLI resolve relative to the schema file.

## Match the application's contract

<<< @/samples/prisma/store.ts

Pass the returned repository to `createNotebook(store)` from the tutorial.
Use an absolute `file:` URL if the application working directory differs from
the schema directory. Create one client for the app, not one per handler.

Prisma owns pooling, parameterization, and transactions; Brevity owns the HTTP
response. The async `close()` must be awaited by your entry point after the
server stops accepting/drains requests.

Run `npm run docs:check`: it generates the client and tests the adapter against
a temporary real SQLite table. That test's fixed DDL is a fixture, not a migration
strategy. The recipe does not claim Prisma 7 compatibility.
