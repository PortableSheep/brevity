# Roadmap

Brevity is a lightweight TypeScript framework that composes with Drizzle, Prisma,
Supabase, Svelte, Vite, and Playwright rather than replacing them.

This roadmap separates available features from planned integrations and
operational work. For reproducible measurements, see
[comparisons and benchmarks](./evaluating.md).

## Boundaries

| Layer                                 | Owns                                                                                                  | Never owns                                              |
| ------------------------------------- | ----------------------------------------------------------------------------------------------------- | ------------------------------------------------------- |
| `@brevity/core`                       | Routing, request/body correctness, errors, request-scoped DI, lifecycle, optional standard decorators | ORM, auth engine, templates, compiler, client framework |
| Optional packages (`@brevity/web`, …) | Reusable web behavior that **two apps proved** they need                                              | Product policy, schemas, provider choice                |
| Applications                          | Domain rules, persistence, identity/ownership policy, provider setup                                  | —                                                       |

New helpers should address repeated integration needs without moving product
rules into the framework.

## Available now

- Bounded body parsing, controlled HTTP errors, and request-local dependency bindings.
- Optional standard TypeScript decorators with explicit constructor injection,
  without reflection or metadata.
- Optional HTML file views, native browser islands, enhanced forms, and a separate
  Svelte adapter.
- Checked integration recipes for Drizzle, Prisma, Supabase, Svelte, and Playwright.
- Node HTTP service entry point and detached host-owned request handler.
- Runnable Vercel Node 22 deployment example, verified over HTTPS with forms,
  cookies, raw bodies, file views, static assets, and concurrent request scopes.
- Public documentation and Node 20/22/24 verification in GitHub Actions.
- Application-level Vercel/libSQL/Supabase staging evidence for durable RSVP data,
  authentication, expiry/refresh, a provider-side restore and bounded traffic.
  See the production checklist for scope and limits.
- Support/upgrade and private vulnerability-reporting policies, with a source
  changelog.

## Next, ranked

1. **Release preparation and maintenance.** MIT licensing, package source/runtime
   metadata, conditional export/type checks and isolated starter consumers are
   checked before publication. Confirm npm scope ownership and publication approval;
   verify registry installation and provenance before calling a release reproducible.
2. **Operational exercises.** Extend the staging recovery and expiry evidence with
   provider-independent restore/PITR, migration failure/rollback, credential rotation,
   rate limits and alerting. Local health/shutdown covers bounded SIGTERM draining.
3. **Application load and soak measurements.** Extend the small bounded staging run
   and synthetic HTTP benchmarks with sustained concurrency, dedicated-host workloads,
   slow upstreams, overload and observed cold/warm behavior.
4. **Starter experience.** Have an unfamiliar developer follow the public docs and
   record onboarding blockers. Automated packed-consumer checks are not independent
   adoption evidence.
5. **Additional hosting.** Verify a Lambda HTTP-adapter recipe without adding platform
   SDKs to core. Other hosts and Edge/Fetch remain unverified or unsupported.

See [Production readiness](./production-readiness) for explicit gates, package
consumer checks, Node compatibility, Pages setup, and remaining external proof.

## Explicitly out of scope

An ORM, an auth engine, a template language or compiler, automatic DI/reflection, and a client framework. If Brevity needs one of these, the answer is a recipe that makes the expert tool easy to use.
