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
- Public documentation and Node 20/22/24 verification in GitHub Actions.

## Next, ranked

1. **Hosted application deployment.** Verify routing, body handling, cookies,
   assets, persistence, and authentication on a selected host. Complete Vercel
   Node and Lambda integration recipes without adding platform SDKs to core.
2. **Operational exercises.** Run restart, migration/rollback, backup restore,
   session expiry, rate-limit, and alerting drills in staging. The existing
   health/shutdown recipe covers SIGTERM draining and deadline failures locally.
3. **Release maintenance.** Publish support and upgrade policies, a changelog,
   and a private security-reporting channel. Verify registry installation and
   release provenance before calling a release reproducible.
4. **Application load and soak measurements.** Extend the synthetic HTTP
   benchmarks with dedicated-host workloads, slow upstreams, overload, and
   sustained operation.
5. **Starter experience.** Provide HTML-only and optional-island starters with
   build, test, and browser checks. Have an unfamiliar developer follow the
   documentation and record onboarding blockers.

See [Production readiness](./production-readiness) for explicit gates, package
consumer checks, Node compatibility, Pages setup, and remaining external proof.

## Explicitly out of scope

An ORM, an auth engine, a template language or compiler, automatic DI/reflection, and a client framework. If Brevity needs one of these, the answer is a recipe that makes the expert tool easy to use.
