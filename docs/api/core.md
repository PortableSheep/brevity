# Core API

Public entry point: **`@brevity/core`**. This reference follows
`packages/core/src/index.ts` and the exported implementations.
Decorators have a separate entry point; [web helpers](./web.md) and
[plugins](./plugins.md) are separate packages.

## Export inventory

| Runtime export | Purpose |
|---|---|
| `createApp` | App, router, container, plugin wiring, HTTP listener |
| `Router` | Explicit routes and middleware |
| `Request`, `Response` | Node HTTP wrappers |
| `HttpError` | Explicit 4xx/5xx transport error |
| `Container`, `ServiceProvider`, `Plugin` | Explicit dependency/provider wiring |
| `Validator` | Small rule-based validation helper |
| `Viewer` | Existing file interpolation utility |

Exported types: `App`, `CreateAppOptions`, `RouterOptions`, `HttpMethod`,
`RouteHandler`, `MiddlewareHandler`, and `PluginLike`.
Internal module types such as `BindingKey`, `ValidationRules`,
`ValidationResult`, and `PluginCtor` are **not** exported from this entry point;
use inference or the public class method types rather than undocumented subpaths.

## `createApp(options?)`

Returns an `App` with `router`, `container`, `plugins`, `use`, `usePlugin`,
`usePlugins`, and `listen`.

| Option (`CreateAppOptions`) | Default | Contract |
|---|---|---|
| `maxBodyBytes` | 1,048,576 | Non-negative safe integer, byte limit for automatic parsing |
| `parseBody` | enabled unless `false` | Disable only when your integration owns/bounds the raw stream |
| `onError(error, req, res)` | default handler | Sync/async response hook; `req` can be null |
| `plugins` | none | `PluginLike[]`, registered during app creation |

`app.use(middleware)` appends middleware.
`app.usePlugin(instanceOrConstructor)` returns the resolved `Plugin`;
`usePlugins(list)` returns resolved instances. Constructors must be
zero-argument; instantiate plugins yourself when they need options.
`app.plugins` records registered plugin names; it is not a dependency manifest.
Providers are deduplicated by constructor name, not by `Plugin.name`.

### `app.listen(port = 3000, host = "127.0.0.1")`

Returns Node's `http.Server`; listening is asynchronous. Use port **0** for an
OS-assigned test port, await `listening`, then inspect `server.address()`.
Handle the server's `error` event and own shutdown/connection cleanup.
The loopback default is intentional; externally reachable deployments need an
explicit host and their own network/proxy configuration.
[Runnable testing recipe](/recipes/testing).

## Router

`new Router(options?: RouterOptions)` can be used separately from an app.
`setContainer(container)` connects explicit dependency wiring.

| Method | Effect |
|---|---|
| `get`, `post`, `put`, `patch`, `delete`, `head`, `options` `(path, handler)` | Register one method/path |
| `route(method: HttpMethod, path, handler)` | Generic equivalent |
| `middleware(fn)` | Append middleware |
| `clearMiddleware()` | Remove all middleware |
| `setNotFound(handler)` | Replace default 404 JSON |
| `dispatch(nodeReq, nodeRes)` | Dispatch Node HTTP objects, returns `Promise<void>` |
| `handleError(error, req, res)` | Apply hook/default handling |

`HttpMethod` is `"GET" | "POST" | "PUT" | "PATCH" | "DELETE" | "HEAD" | "OPTIONS"`.
Handlers receive `(req, res, container)`; `container` is nullable for a standalone
router. They must send responses explicitly. Return values are not serialized.
First registered matching route wins. Methods, case, and trailing slashes are
explicit; GET is **not** an automatic HEAD or OPTIONS registration.

`MiddlewareHandler` receives `(req, res, next, container)`.
Call and await/return `next(req, res)` to continue, or send a response to stop.
Middleware runs in registration order, including for unmatched paths.
Provider boot and automatic parsing occur **before** middleware.

### Paths

| Placeholder | Matches | Result |
|---|---|---|
| `:id` | Nonempty segment without `/` | String |
| `{i:id}` | Digits | String, not a converted number |
| `{s:slug}` | ASCII letters/digits | String |
| `{*:path}` | Nonempty wildcard, can include `/` | String |

Literal text is regex-escaped. Captured params are URL-decoded once;
invalid encoding is a controlled 400. Query parameters do not affect matching.

## Request

`new Request(raw: IncomingMessage, routeParams = {})` wraps the Node request.
Public properties: `raw`, `method`, `headers`, `url`, `path`, `query`, `params`,
`body`, and `form`.

| Member | Contract |
|---|---|
| `get<T = unknown>(key, defaultValue: T \| null = null)` | Body own property first, then query, then default |
| `has(key)` | Value is neither null nor empty string; not a type/required validator |
| `param<T = string>(key, defaultValue: T \| null = null)` | Route param or default |
| `parseBody(maxBodyBytes = 1048576)` | Bounded, cached `Promise<Record<string, unknown>>` |
| `validate(rules)` | Same rule engine as `Validator` |

Generic parameters assert a type; they do not parse/validate/coerce values.
`body` starts as null and becomes a record after parsing. `form` is null unless
a nonempty URL-encoded body was parsed, then is `URLSearchParams` preserving
repeated entries. Body/query records keep the **last** repeated value.
Use `form.getAll()` for checkbox groups or rejecting duplicate singleton fields.
For repeated query values, parse `req.url` with a trusted base and use searchParams.

### Body parsing

Automatic parsing applies to methods other than GET/HEAD. Empty bodies become
`{}`. Successful parsing is cached; calling with a new limit does not reparse.
Nonempty bodies require uncompressed UTF-8 and one of:

- `application/json` or an `application/*+json` media type; top-level object only.
- `application/x-www-form-urlencoded`; malformed percent encoding is rejected.

Malformed JSON/UTF-8/form encoding and aborted uploads get 400. Oversized
declared or streamed bodies get 413. Unsupported media types/encoding get 415.
Multipart, compressed-body decoding, and raw webhook verification are not built
in. With `parseBody: false`, enforce your own limits before reading the stream.

## Response

`new Response(raw: ServerResponse)` exposes `raw` for Node capabilities such as
multiple Set-Cookie headers.

| Member | Contract |
|---|---|
| `status(code)` | Chainable, sets wrapper's default response code |
| `header(name, value: string)` | Chainable Node header setter |
| `json(payload, code = currentStatus)` | JSON content type, stringify, end |
| `send(content, code = currentStatus)` | String conversion; HTML content type unless already set; end |
| `redirect(url, code = 302)` | Location header and empty response |

Core `send()` does **not** escape HTML. Use the optional web helpers for
user-controlled text. Redirect destinations, status choices, cookie policy,
streaming, and URL validation belong to the app. For post/redirect/get,
explicitly use 303. For buffers/streams, use Node's `raw`, not stringifying `send`.

## `HttpError(status, message)` and `onError`

`HttpError` extends `Error` and requires an integer status between 400 and 599;
invalid statuses throw `RangeError`.
Core catches setup, provider, parsing, middleware, and endpoint failures.
Only **4xx HttpError messages** are exposed by the default JSON response.
Unexpected and 5xx errors are logged and return `"Internal Server Error"`.

`onError(error: unknown, req: Request | null, res: Response)` can be async.
Send your custom response explicitly. If it returns without responding or
throws, core falls back to its default handler and logs hook failures.
Completed responses are not rewritten; partially sent responses are closed.
A disconnected client cannot receive a response.

Avoid leaking private error details in hooks.
[Domain-to-HTTP mapping recipe](/recipes/errors).

## Container and providers

`new Container()` stores explicit factories/instances keyed by string or symbol.

| Member | Contract |
|---|---|
| `bind<T>(key, factory)` | Transient factory `(container) => T` |
| `singleton<T>(key, factory)` | Cached after first `get` |
| `instance<T>(key, value)` | Explicit value |
| `has(key)` | Scope, factory, or instance exists |
| `get<T>(key)` | Scoped override, explicit/cached instance, then factory; throws if missing |
| `make<T>(key)` | Always call registered factory; ignores cached instances/scoped overrides |
| `runScoped(instances, callback)` | Async-local readonly map overrides for the callback chain |
| `registerProvider(ctorOrInstance)` | Call register; dedupe by constructor name; returns provider |
| `registerProviders(list)` | Register each provider |
| `bootProviders()` | Boot once; providers added after boot are booted when registered |

Dispatch supplies async-local `"request"` and `"response"` bindings.
They do not mutate the global container and do not create an entire per-request
service container. Scoped bindings stay available through awaited async work.
Do not capture a request in a singleton or store request state on a reused
controller. Prefer explicit handler arguments.

`ServiceProvider` has overridable `register(container)` and `boot(container)`.
Hooks are synchronous; do asynchronous resource initialization in your entry
point before listening. `Plugin` extends it with abstract `name`, default
`version = "0.1.0"`, and default `description = ""`.

## Validator

`new Validator().validate(data, rules)` and `req.validate(rules)` return:
`passes()`, `fails()`, `errors(): Record<string, string[]>`, and
`validated(): Record<string, unknown>`.
Rules are a pipe-separated string or string array per field.

Supported rules: `required`, `email`, `int`, `slug`, `min:x`, `max:x`.
Min/max compare **string length**, not numeric bounds; int checks syntax without
coercion. Non-required rules allow nullish values. Unknown names and malformed
rule parameters throw `TypeError` (application configuration errors, not invalid
user input). Min/max require a nonnegative safe integer; other rules accept no
parameters. Do not construct rule strings from request input. `validated()`
returns selected original values, even when validation failed; it is not a typed
or sanitized object. Check the result before use.

## Viewer

Existing file utility, not a compiler:
`new Viewer(baseDir)`, `render(viewFile, data = {})`, `section(name, fallback = "")`,
`setSection(name, value)`, and static `Viewer.e(value)`.

`render` reads synchronously and resolves dotted data paths. Double braces escape
text; triple braces interpolate raw trusted markup. File paths must be
application-owned. Sections live on the instance, not in a request-local store.
For new HTML-first apps, consider `@brevity/web`'s explicit callback fragments.

## Optional controller decorators

Entry point: **`@brevity/core/decorators`**. It exports `Controller`, `Route`,
`Get`, `Post`, `Put`, `Patch`, `Delete`, `Head`, `Options`, and `registerControllers`.
These are standard TS5 decorators, not legacy/reflection-based decorators.
Keep `experimentalDecorators` and `emitDecoratorMetadata` disabled.

<<< @/samples/routes.ts

`@Controller(prefix = "")` annotates the class.
`@Route(method, path = "")` and method-specific decorators attach routes to public
instance methods. They do not decorate fields, accessors, static or private
methods. Multiple route decorators can share a method.

Paths must be empty or start with `/`. Prefix trailing slashes are removed
before joining; empty prefix/path becomes `/`.
For prefix `/users`, `@Get()` matches `/users`, while `@Get("/")` matches `/users/`.

`registerControllers(router, ...instances)` accepts explicitly constructed
instances. Each class needs its own Controller annotation; no automatic
constructor injection/discovery occurs. Methods retain `this` and receive the
ordinary handler arguments. Inherited routes work; any override (even
undecorated) hides the base method's routes.

Instances are reused, middleware and parsing are unchanged, and callback routes
can coexist with controllers. Choose the form that keeps your app explicit;
neither adds auto-serialization or automatic HEAD registration.
