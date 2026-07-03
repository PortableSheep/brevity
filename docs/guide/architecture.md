# Architecture

```text
Incoming HTTP request
  -> Router.dispatch()
    -> Request/Response wrappers
    -> Container request/response injection
    -> Provider boot lifecycle
    -> Middleware chain
    -> Route handler
    -> JSON/HTML response
```

## Core flow

1. App creates `Router` and `Container`.
2. `router.dispatch` wraps node req/res.
3. Container receives `request` and `response`.
4. Plugins/providers are registered.
5. Providers are booted once.
6. Middleware pipeline runs.
7. Matching route handler executes.

## Design goals

- Keep everything framework-core in small files
- Favor explicit control over magic
- Prefer composition (middleware + providers) over inheritance
- Provide development debugging utilities without production bloat

## Core modules

| Module | Purpose | Lines |
|--------|---------|-------|
| `container.ts` | Dependency injection & service registration | ~100 |
| `router.ts` | HTTP routing & middleware pipeline | ~150 |
| `provider.ts` | Service provider lifecycle | ~30 |
| `request.ts` | Request parsing & validation | ~80 |
| `validation.ts` | Shared validation helpers | ~60 |
| `response.ts` | Response building | ~50 |
| `plugin.ts` | Plugin base types | ~20 |
| `viewer.ts` | Template rendering | ~40 |
| `plugins/*` | Optional feature plugins | varies |

## Development Features

### Debug Service

Development-only debugging utilities usually registered via `DebugPlugin`:

```typescript
app.usePlugin(new DebugPlugin({ enabled: process.env.NODE_ENV !== "production" }));
```

Features:
- **Styled error pages** with stack traces and request context
- **Request/response logging** with timestamps
- **In-memory log history** (last 100 entries)
- **Structured data** for debugging complex issues
- **Zero overhead in production** when disabled

See [Debug Mode Guide](/guide/debugging) for usage.

### Plugin boundary

Core remains:

- `Router`
- `Request`
- `Response`
- `Container`
- `ServiceProvider`

Optional features move into plugins:

- `CachePlugin`
- `ViewerPlugin`
- `DebugPlugin`
- `ValidationPlugin`

See [Plugins](/guide/plugins) for details.
