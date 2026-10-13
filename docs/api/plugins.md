# Optional plugin APIs

These packages are opt-in. Core exports `Plugin`/`ServiceProvider`, not their
implementations. This inventory follows each `packages/plugin-*/src/index.ts`.
Use `app.usePlugin(new PluginClass(options))`, then resolve its configured key
from `app.container`.

## `@brevity/plugin-cache`

Runtime exports: `CachePlugin`, `CacheManager`, `MemoryCacheAdapter`,
`NullCacheAdapter`. Type exports: `CacheAdapter`, `CachePluginOptions`.

`new CachePlugin({ adapter?, defaultTtl?, key? } = {})` registers a singleton manager.
Defaults: memory adapter, TTL 300 seconds, key `"cache"`.
`new CacheManager(adapter, defaultTtl = 300)` exposes its `adapter`.

The adapter/manager methods are `get<T>(key, defaultValue = null)`,
`put<T>(key, value, ttl = 0)`, `has(key)`, `forget(key)`, and `clear()`.
`get` returns `T | null`; mutation methods return boolean.
Manager additionally offers `remember<T>(key, resolver, ttl = 0)`.

Memory TTL is in seconds; adapter TTL 0 means no expiration.
At the **manager** layer, TTL 0 falls back to defaultTtl.
Memory values live in one process and are not a durable shared store.
Null adapter stores nothing and returns defaults.
`remember` is synchronous; it does not await/deduplicate async work.
No Redis adapter is exported today.

## `@brevity/plugin-validation`

Exports `ValidationPlugin` and type `ValidationPluginOptions`.
`new ValidationPlugin({ key? } = {})` registers core `Validator` as a singleton,
default key `"validator"`. It does not install route validation middleware.
See the [core validator contract](./core.md#validator).

## `@brevity/plugin-viewer`

Exports `ViewerPlugin` and type `ViewerPluginOptions`.
`new ViewerPlugin({ baseDir, key? })` registers core `Viewer` as a singleton,
default key `"viewer"`. baseDir is required.
See [Viewer](./core.md#viewer) for file interpolation and instance-state limits.

## `@brevity/plugin-debug`

Runtime exports: `DebugPlugin`, `DebugService`.
Type exports: `DebugConfig`, `DebugPluginOptions`.

`new DebugPlugin({ enabled?, verbose?, key? } = {})` registers a singleton
`DebugService`; key defaults to `"debug"`, verbose to false, and enabled to
`NODE_ENV !== "production"`.
`new DebugService(config = { enabled: false })` requires enabled when supplying
an explicit `DebugConfig`; verbose is optional.

| Method                                          | Contract                                                               |
| ----------------------------------------------- | ---------------------------------------------------------------------- |
| `setEnabled(boolean)`                           | Toggle logging and diagnostic rendering; retained history is unchanged |
| `log(level, message, data?)`                    | Level info/warn/error/debug; no-op when disabled                       |
| `info`, `warn`, `error` `(message, data?)`      | Level helpers                                                          |
| `debug(message, data?)`                         | Requires verbose and enabled                                           |
| `getLogs()`                                     | Shallow array copy of at most 100 entries                              |
| `clear()`                                       | Clear history                                                          |
| `renderErrorPage(error, requestInfo?)`          | Escaped diagnostic HTML when enabled; generic error HTML when disabled |
| `renderErrorResponse(res, error, requestInfo?)` | Send the enabled/disabled error HTML with 500                          |

**Rendering is gated by enabled.** Disabled rendering does not read error or
request details or expose log history. Gate custom diagnostic routes in
application code: `getLogs()` still returns retained history when disabled.
Never expose stacks, credentials, or request payloads publicly.
The service is opt-in tooling, not production observability or a security filter.
