# Roadmap

Brevity aims to be a light, fast-to-bootstrap TypeScript web framework. It should be credible in production because it composes well with expert tools (Drizzle, Prisma, Supabase, Svelte, Vite, Playwright) instead of replacing them.

This roadmap is derived from evidence, not wishes:

- **`iminvited.to` staged rewrite** (Angular + Nest to Brevity). Persistent Drizzle/libSQL storage, real Supabase passwordless auth, host ownership, a versioned form builder, guest RSVPs, and a Svelte island. Verified by 50 HTTP/persistence tests and a one-command Playwright workflow against local Supabase (PKCE, wrong-browser links, cross-owner denial, real 60-second JWT refresh, logout, no-JS submission). It also passed a manual hosted sign-in → create → RSVP → responses → logout run. Its friction report lives in that repo at `brevity-demo/FRAMEWORK-FRICTION.md`.
- **Support inbox** (`examples/support-inbox`). The same app built with Brevity and with Express, with reproducible measurements. See [Evaluating Brevity](./evaluating.md).

## Boundaries

| Layer                                 | Owns                                                                                                  | Never owns                                              |
| ------------------------------------- | ----------------------------------------------------------------------------------------------------- | ------------------------------------------------------- |
| `@brevity/core`                       | Routing, request/body correctness, errors, request-scoped DI, lifecycle, optional standard decorators | ORM, auth engine, templates, compiler, client framework |
| Optional packages (`@brevity/web`, …) | Reusable web behavior that **two apps proved** they need                                              | Product policy, schemas, provider choice                |
| Applications                          | Domain rules, persistence, identity/ownership policy, provider setup                                  | —                                                       |

A feature moves into a Brevity package only after a second app repeats the same glue. Persistence and version-history complexity in the rewrite was product complexity; a framework cannot honestly erase it.

## What the evidence confirmed

- Core HTTP hardening (bounded parsing, strict content types, `Request.form`, `onError`, async-local scope) removed the prototype's raw-body adapter. It needed no further core changes through persistence, real auth, and E2E.
- Standard TS5 decorators with explicit constructor injection worked without reflection or metadata.
- Drizzle/libSQL and the Supabase SDK were integrated as-is with no Brevity adapter. The difficulties came from the tools themselves (SQLite locking, PKCE browser binding, `skipLibCheck` for Drizzle typings), not from routing.
- HTML-first pages remain usable without JS. The latest RSVP directive port loads
  2,809 bytes gzip on guest pages (down from 4,347); host JS is 22,282 bytes gzip.
  Confirmation needs no JS. File views/islands did not produce a net total-LOC win.

## Next, ranked

### Now (small, high confidence)

1. **Documentation clarifications, no new API.**
   - Checked recipes now cover `app.listen(0)`, explicit HEAD, and domain-error
     mapping. There is no automatic HEAD-to-GET alias.
2. **File views and opt-in native islands: shipped and ported.** Optional
   `@brevity/views` and `@brevity/islands` keep these concerns outside core.
   The RSVP port proved the standalone form directive and nested island restart;
   Svelte's adapter is separate so server installations do not pull its runtime.
   Measurements include increased payload/LOC where applicable.
3. **Starter templates.** One HTML-only starter and one with an optional island, each with working build, test, and E2E commands. Measure time-to-first-route with someone unfamiliar with Brevity.

### Next (needs a second app to prove it)

4. **Enhanced-form transport: proved locally in the RSVP port.** Pending state,
   retained 422/409 errors, focus, network failures, no-JS and nested Svelte restart
   are exercised. Keep product semantics in applications; repeat deployment-level
   tests against the selected host.
5. **Integration recipes, not engines.** Checked recipes for:
   - Supabase server-side PKCE, with cookies, refresh, logout, and local Mailpit E2E.
   - Drizzle transaction and shutdown ownership.
   - Common security headers, including the `Referrer-Policy: same-origin` lesson for CSRF Origin checks.

### Later (production credibility)

6. **Benchmarks against Fastify, Express, and Nest.** A repeatable synthetic JSON
   harness now measures latency/throughput/startup/RSS. Dedicated-host load and
   long-running application workloads remain unproven.
7. **Operational guidance.** The checked health/shutdown recipe includes real
   SIGTERM draining and deadline failure. Durable sessions, restore/rollback,
   logging and rate limits must still be exercised in a real deployment.

See [Production readiness](./production-readiness) for explicit gates, package
consumer checks, Node compatibility, Pages setup, and remaining external proof.

## Explicitly out of scope

An ORM, an auth engine, a template language or compiler, automatic DI/reflection, and a client framework. If Brevity needs one of these, the answer is a recipe that makes the expert tool easy to use.
