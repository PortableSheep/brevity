# Roadmap

Brevity aims to be a light, fast-to-bootstrap TypeScript web framework. It should be credible in production because it composes well with expert tools (Drizzle, Prisma, Supabase, Svelte, Vite, Playwright) instead of replacing them.

This roadmap is derived from evidence, not wishes:

- **`iminvited.to` staged rewrite** (Angular + Nest to Brevity). Persistent Drizzle/libSQL storage, real Supabase passwordless auth, host ownership, a versioned form builder, guest RSVPs, and a Svelte island. Verified by 50 HTTP/persistence tests and a one-command Playwright workflow against local Supabase (PKCE, wrong-browser links, cross-owner denial, real 60-second JWT refresh, logout, no-JS submission). It also passed a manual hosted sign-in → create → RSVP → responses → logout run. Its friction report lives in that repo at `brevity-demo/FRAMEWORK-FRICTION.md`.
- **Support inbox** (`examples/support-inbox`). The same app built with Brevity and with Express, with reproducible measurements. See [Evaluating Brevity](./evaluating.md).

## Boundaries

| Layer | Owns | Never owns |
|---|---|---|
| `@brevity/core` | Routing, request/body correctness, errors, request-scoped DI, lifecycle, optional standard decorators | ORM, auth engine, templates, compiler, client framework |
| Optional packages (`@brevity/web`, …) | Reusable web behavior that **two apps proved** they need | Product policy, schemas, provider choice |
| Applications | Domain rules, persistence, identity/ownership policy, provider setup | — |

A feature moves into a Brevity package only after a second app repeats the same glue. Persistence and version-history complexity in the rewrite was product complexity; a framework cannot honestly erase it.

## What the evidence confirmed

- Core HTTP hardening (bounded parsing, strict content types, `Request.form`, `onError`, async-local scope) removed the prototype's raw-body adapter. It needed no further core changes through persistence, real auth, and E2E.
- Standard TS5 decorators with explicit constructor injection worked without reflection or metadata.
- Drizzle/libSQL and the Supabase SDK were integrated as-is with no Brevity adapter. The difficulties came from the tools themselves (SQLite locking, PKCE browser binding, `skipLibCheck` for Drizzle typings), not from routing.
- HTML-first pages plus one opt-in island kept guest pages JS-free. Host builder JS is about 20.7 KB gzip.

## Next, ranked

### Now (small, high confidence)

1. **Documentation clarifications, no new API.**
   - Show testing with `app.listen(0)`; the rewrite's custom test adapter was its own duplication, not a missing API.
   - Document HEAD semantics explicitly, and decide whether to offer an opt-in HEAD-to-GET alias.
   - Show the `InputError` → `HttpError` mapping pattern, which both apps needed.
2. **Fragment-first form recipes in `@brevity/web`.** Both apps hand-built field, error, and summary markup around `createFormState`. Add documented fragment recipes, possibly a tiny accessible control helper (label, hint, error, focus), and an error-summary class/focus convention. No template engine.
3. **Starter templates.** One HTML-only starter and one with an optional island, each with working build, test, and E2E commands. Measure time-to-first-route with someone unfamiliar with Brevity.

### Next (needs a second app to prove it)

4. **Enhanced-form transport.** A small optional helper: progressive `fetch` submit, pending state, retained 422 errors, 409 conflicts, focus, and acknowledgement hooks. Native forms stay the wire protocol. Extract it only after the support inbox (or another app) repeats the island's glue.
5. **Integration recipes, not engines.** Checked recipes for:
   - Supabase server-side PKCE, with cookies, refresh, logout, and local Mailpit E2E.
   - Drizzle transaction and shutdown ownership.
   - Common security headers, including the `Referrer-Policy: same-origin` lesson for CSRF Origin checks.

### Later (production credibility)

6. **Benchmarks against Fastify, Express, and Nest.** Use reproducible scripts, publish the numbers, and include the losses.
7. **Operational guidance.** Graceful shutdown, health checks, structured logging, rate-limiting hooks, and multi-instance session-store guidance, documented against real deployments.

## Explicitly out of scope

An ORM, an auth engine, a template language or compiler, automatic DI/reflection, and a client framework. If Brevity needs one of these, the answer is a recipe that makes the expert tool easy to use.
