# Architecture

Brevity keeps the HTTP boundary explicit and lets expert tools own their layers.

```text
Node HTTP request
  -> method/path match
  -> Request and Response
  -> async-local request/response bindings
  -> provider boot (once)
  -> bounded body parsing (except GET/HEAD)
  -> middleware in registration order
  -> matched handler or not-found handler
  -> explicit JSON/HTML response
```

Setup, parsing, middleware, and handler failures go through the router's
error hook/default handler. Middleware does not precede automatic body parsing:
raw-stream integrations must opt out and enforce their own bounds.

## Ownership

| Layer                      | Owns                                                                              |
| -------------------------- | --------------------------------------------------------------------------------- |
| `@brevity/core`            | Router, bounded parsing, responses, errors, explicit DI/providers                 |
| `@brevity/core/decorators` | Optional standard TS5 route annotations, explicit controller construction         |
| `@brevity/web`             | Escaped callback fragments, form feedback, safe JSON state, exact asset maps      |
| Optional plugins           | Cache, viewer registration, validation registration, development diagnostics      |
| Application                | Schema, domain validation, persistence, auth/CSRF, resource ownership, deployment |
| Specialist tools           | ORM/query building, identity provider, browser compiler, E2E runner               |

The container uses async-local request/response overrides, not global mutation.
Services keep their registered singleton/transient lifetime; a singleton is
not automatically request-scoped. Constructor dependencies stay explicit.

Core/web have no runtime package dependencies. Node's runtime and any selected
application integrations still count. Small dependency graphs do not establish
speed, reliability, or security.

See the [API contracts](/api/core), [integration recipes](/recipes/),
and [roadmap boundaries](./roadmap.md).
