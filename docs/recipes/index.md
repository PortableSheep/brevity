# Integration recipes

Keep core light. Use the specialist library directly, make dependencies
explicit, and keep schema, identity policy, and frontend compilation in the app.
Start with the [notebook tutorial](/guide/tutorial); recipes reuse its repository
contract and native form instead of inventing adapters.

## Tested versions and what “tested” means

| Recipe | Pinned version | Automated evidence |
|---|---|---|
| [Drizzle + SQLite](./drizzle.md) | drizzle-orm 0.45.4; @libsql/client 0.15.15 | Strict compilation; inserts, transaction, SQLite reopen, HTTP form |
| [Prisma](./prisma.md) | prisma / @prisma/client 6.12.0 | Client generation; real SQLite insert/read and notebook HTTP |
| [Supabase PKCE](./supabase.md) | @supabase/ssr 0.7.0; @supabase/supabase-js 2.57.4; cookie 1.0.2 | Real SDK with stubbed Auth HTTP; PKCE/cookies, wrong browser, CSRF, expiry and 429 |
| [Svelte island](./svelte.md) | svelte 5.57.2; Vite 6.4.4; Svelte Vite plugin 5.1.1 | Compiler build, state escaping, allowlisted asset, browser mount |
| [Playwright](./playwright.md) | @playwright/test 1.56.0 | Chromium; native forms with JS on/off, 422 retention |
| [HTTP testing](./testing.md), [decorators](./decorators.md), [domain errors](./errors.md), [HEAD](./head.md) | Local @brevity/core / @brevity/web 0.1.0; TypeScript 5.9 | Strict compilation and real HTTP |
| [Health and shutdown](./operations.md) | Node HTTP server; local @brevity/core 0.1.0 | Health probes, active-request draining, real SIGTERM, deadline failure |

These are compatibility snapshots, not recommendations to freeze dependencies
forever. Review provider releases and advisories when upgrading.
CI is configured for Node.js 20, 22, and 24; Chromium runs on Node.js 22.

**Supabase email delivery, successful hosted authentication, and live JWT refresh
are not established by stubbed tests.** Its recipe includes the provider setup
and manual acceptance checklist needed to verify your own environment.

## Anti-drift contract

Every tutorial/recipe source sample is a VitePress snippet import from
`docs/samples/`. `scripts/check-docs.mjs` rejects inline TypeScript, JavaScript,
Svelte, and Prisma fences in these pages. Node samples typecheck; Prisma's client
is generated; Svelte compiles; HTTP tests run. Root `test` and `typecheck` both
include `docs:check`. CI also builds docs and runs browser tests.

Shell fences are setup/run instructions, not credential-bearing integration
tests. External SMTP and Supabase configuration require your own environment.
No recipe moves an ORM, an auth engine, or a client compiler into core.
