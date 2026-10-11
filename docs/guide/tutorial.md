# Build a notebook

Go from a JSON route to an HTML-first app with accessible form feedback,
Drizzle/SQLite persistence, and tests over a real ephemeral HTTP listener.
No browser JavaScript is required.

::: tip Follow the checked source
Every source listing below is imported from `docs/samples/`, not copied into
Markdown. `npm test` and `npm run typecheck` check those files.
This is a runnable local learning app, **not a production starter**:
it has no accounts, per-user authorization, or public deployment configuration.
:::

## 1. Set up

Use Node.js 22 and npm 10+ in a checkout of this repository.
Run these commands from the repository root:

```sh
npm ci
npm run build:packages
```

The tutorial's tested dependencies are Drizzle **0.45.4** and `@libsql/client`
**0.15.15**. They are documentation-only root dev dependencies; core/web gain
no runtime dependencies. SQLite here is a local libSQL file, not a hosted service.

For your own app, install `@brevity/core`, `@brevity/web`, `drizzle-orm@0.45.4`,
and `@libsql/client@0.15.15` (see `PUBLISH.md` if consuming local packages).
Keep the same ESM/strict TypeScript settings:

<<< @/samples/tsconfig.json

In a standalone project, adapt `include` to your own source layout; the
exclusions above are specific to the docs' separate browser bundle.

## 2. Start with a route

<<< @/samples/first-route.ts

The route calls `res.json()` itself. Brevity does not infer a response from a
return value. Start it from a separate entry point:

<<< @/samples/first-route-start.ts

```sh
node --import tsx docs/samples/first-route-start.ts
```

Visit `http://127.0.0.1:3000` and expect `{"message":"Hello, Brevity"}`.
Stop this process with Ctrl+C before running the notebook on the same port.
The [HTTP test recipe](/recipes/testing) exercises this exact app module.

## 3. Build the native form

Create a page from escaped fragments. `createFormState` snapshots values and
errors; it does **not** validate input or invent controls. We use its field IDs,
hint/error associations, and linked error summary to build our own markup.

<<< @/samples/tutorial/page.ts

The optional `enhancement` slot is unused in the basic app. The
[Svelte recipe](/recipes/svelte) adds an island through that slot later, without
changing the form's wire protocol.

Strings interpolate as escaped text, nested fragments as markup.
Do not use `trustedHtml` on note text. Escaping is not URL validation,
CSRF protection, or authorization.

## 4. Add persistence

Define the Drizzle table and open a local SQLite client. The app receives an
explicit repository rather than resolving a database magically.

<<< @/samples/tutorial/store.ts

`add()` uses Drizzle's transaction API; errors propagate and transactions roll
back. The connection owner closes the client. Fixed `CREATE TABLE IF NOT EXISTS`
is enough for this first schema, but cannot migrate an existing schema: use
reviewed, versioned migrations before changing production tables.

## 5. Wire GET, POST, errors, and redirect

<<< @/samples/tutorial/app.ts

The GET displays saved notes. The POST accepts exactly one URL-encoded `text`
field, validates it on the server, and returns **422 with the original value**
on failure. Body parsing is bounded to 4 KiB; malformed and oversized transport
input is handled by core before the handler.

Successful writes use **303 See Other**, so refresh repeats GET rather than
POST. GET and HEAD are separate registrations. Expected transport errors use
`HttpError`; unexpected persistence errors become a logged generic 500.

The local Origin check derives the expected `http://` origin from Host.
**Do not copy that policy to a reverse-proxied/public deployment**: configure
one trusted canonical HTTPS origin, validate Host at the edge, reject missing
or unexpected Origin on mutations, and do not blindly trust forwarded headers.
The [Supabase recipe](/recipes/supabase) demonstrates a configured origin.

## 6. Own the server lifecycle

<<< @/samples/tutorial/start.ts

```sh
npm run docs:app
```

Open `http://127.0.0.1:3000`. Submit whitespace: expect a linked error summary
and retained whitespace. Save a real note, stop the process, and restart:
the note remains in `notebook.db` in the repository root. The process closes the
database after its listener drains; production shutdown also needs a deadline
and a policy for long-running requests.

## 7. Test through HTTP, not a private adapter

<<< @/samples/testing.ts

The port `0` requests a free port from the OS. Await `listening`, inspect
`server.address()`, and register cleanup immediately. Concurrent tests avoid
fixed-port collisions and never need to reconstruct the router's dispatch internals.

These are the actual checked tests, including SQLite reopen persistence,
retained escaping, duplicate fields, HEAD, and the same app backed by Prisma:

<<< @/samples/sample.test.ts

```sh
npm run docs:check
```

The command generates Prisma's client, checks strict TypeScript, builds the
Svelte island, and runs HTTP tests. No live Supabase project or browser download
is required for that check. [Playwright](/recipes/playwright) separately verifies
the form in a browser with JavaScript both enabled and disabled.

## Onboarding checkpoint

You should be able to explain where each concern lives: HTTP in `app.ts`, markup
in `page.ts`, data in `store.ts`, lifecycle in `start.ts`, and socket cleanup in
`testing.ts`. Try adding a timestamp to a note: change the schema, migrate it,
render it, and extend the test. Record any blockers; we have not measured
onboarding time or claimed this tutorial proves faster development.

For the next layer, choose [Prisma](/recipes/prisma),
[identity](/recipes/supabase), or a [single Svelte island](/recipes/svelte).
