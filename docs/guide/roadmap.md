# Roadmap

Brevity's direction is simple: make common HTTP and HTML work pleasant without
growing an all-in-one platform.

## Available today

- Routing, middleware, bounded parsing, and explicit dependency injection.
- Optional TypeScript controller decorators, without reflection.
- Optional HTML views, native forms, islands, and a separate Svelte adapter.
- [Recipes](/recipes/) for databases, Supabase auth, and testing.
- Node service and Vercel function deployment.

The [production checklist](./production-readiness) covers tested behavior and
remaining operational work.

## Up next

1. **First release:** verify npm scope ownership, publish with provenance, and
   test registry installation. Publication still needs approval.
2. **Onboarding:** have a developer new to Brevity follow the docs and record
   where they get stuck.
3. **Operations:** extend recovery and auth checks with rollback, provider
   outages, credential rotation, rate limits, and alerts.
4. **Performance:** measure sustained concurrency, overload, and cold starts.
   Current staging traffic is a small test, not a capacity estimate.
5. **More hosts:** verify a Lambda adapter without adding platform SDKs to core.

## What stays out

No ORM, auth engine, frontend compiler, automatic DI/reflection, or client router.
Use the tools you prefer for those jobs. New helpers should solve a repeated need
across apps, not move one app's business rules into the framework.
