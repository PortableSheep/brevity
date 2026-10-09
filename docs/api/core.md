# Core API

## `createApp()`

```ts
import { createApp, HttpError } from "@brevity/core";

const app = createApp({
  maxBodyBytes: 128 * 1024,
  onError(error, _req, res) {
    const status = error instanceof HttpError ? error.status : 500;
    res.status(status).send("<h1>Request could not be completed</h1>");
  },
});
```

`maxBodyBytes` defaults to 1 MiB and counts bytes, including chunked requests.
It must be a non-negative safe integer; zero permits only empty parsed bodies.
`parseBody: false` disables automatic parsing for integrations that own a raw
stream (for example multipart or signed webhooks). Such integrations must
enforce their own stream bounds and parse/validate their input.

All request setup, provider boot, parsing, middleware, and endpoint errors are
handled by the router; `listen()` also handles rejected dispatch promises.
Malformed input receives 400, oversized bodies 413, and nonempty unsupported
media types/content encodings 415. `HttpError(status, message)` supplies an
explicit HTTP error; only 4xx messages are exposed by the default handler.
Unexpected/5xx errors are logged server-side and return a generic error response,
without stack traces or error details.

Optional `onError(error, req, res)` may send a custom response and can be async.
`req` is null when setup fails before a Request exists. If the hook returns
without sending or throws, the default response is used; hook failures are
logged. Completed responses are never rewritten; partial responses are closed
on failure. A disconnected client cannot receive an error response.

Returns:

- `router`
- `container`
- `use(middleware)`
- `usePlugin(plugin)`
- `usePlugins(plugins)`
- `plugins` (registered plugin names)
- `listen(port?, host?)`

## Router

```ts
router.get(path, handler)
router.post(path, handler)
router.put(path, handler)
router.patch(path, handler)
router.delete(path, handler)
router.head(path, handler)
router.options(path, handler)
router.route(method, path, handler)
router.middleware(fn)
router.setNotFound(fn)
```

Route placeholders:

- `{i:id}` numeric
- `{s:slug}` alphanumeric
- `{*:path}` wildcard
- `:id` segment capture

Literal route text is escaped (for example `/assets/app.js` does not match
`/assets/appXjs`). Captured params are URL-decoded once; invalid encodings
receive 400. HTTP methods remain explicit: a GET route does not automatically
register HEAD or OPTIONS.

## Optional controller decorators

Decorators are available only from `@brevity/core/decorators`; importing
`@brevity/core` does not load them. They use standard TypeScript 5+ decorators,
not legacy decorators: leave `experimentalDecorators` and
`emitDecoratorMetadata` disabled. No runtime dependencies or reflection
polyfills are required.

```ts
import { createApp, type Request, type Response } from "@brevity/core";
import { Controller, Get, Post, registerControllers } from "@brevity/core/decorators";

@Controller("/users")
class UsersController {
  @Get("/{i:id}")
  show(req: Request, res: Response): void {
    res.json({ id: req.param("id") });
  }

  @Post()
  create(req: Request, res: Response): void {
    res.status(201).json(req.body);
  }
}

const app = createApp();
registerControllers(app.router, new UsersController());
```

`@Controller(prefix?)` sets a class's route prefix. `@Get`, `@Post`, `@Put`,
`@Patch`, `@Delete`, `@Head`, and `@Options` accept an optional route path;
`@Route(method, path?)` is the generic equivalent. Paths must be empty or start
with `/`. A trailing slash on the prefix is removed before joining it to the
route path. An empty prefix and path register `/`. A route path of `/` keeps
its trailing slash, so `@Controller("/users")` with `@Get()` matches `/users`,
while `@Get("/")` matches `/users/`.

`registerControllers(router, ...instances)` registers explicitly constructed
instances. Constructor dependencies remain explicit; there is no discovery or
automatic injection. Each instance must have its own `@Controller` class
annotation. Methods receive the same `(req, res, container)` arguments as
callback routes and must send responses explicitly. Returned values are not
automatically serialized. Async methods use the existing router error handling.

Route decorators require public instance methods, not static/private methods,
fields, or accessors. Multiple route decorators can share a method. Inherited
routes are supported; an override hides the base method's routes even when the
override is undecorated. Methods retain their instance's `this`. Instances are
reused across requests, so keep request-specific state in local variables.
Existing middleware, body parsing, plugins, and first-match routing apply
unchanged; callback and decorated routes can be mixed.

## Request

```ts
req.get("name", defaultValue)
req.has("name")
req.param("id")
await req.parseBody()
await req.parseBody(128 * 1024)
req.form?.getAll("choice")
req.validate({ email: "required|email" })
```

Automatic parsing runs before middleware for methods other than GET/HEAD;
those two methods leave `body` null. Empty parsed bodies become `{}`.
JSON must be an object, not an array, scalar, or null. Nonempty bodies must use
`application/json`, an `application/*+json` media type, or
`application/x-www-form-urlencoded`, with uncompressed UTF-8 input.
Malformed UTF-8 or percent-encoded form input is rejected.

Successful parsing is cached. `body` remains a record; repeated form names use
the last value for compatibility. `form` is a `URLSearchParams` for form
requests, preserving all entries: use `getAll()` to handle checkbox groups or
`entries()` to reject duplicates for singleton fields. `query` also retains
the existing last-value behavior; use `new URL(req.url, "http://localhost")`
if repeated query values matter.

Validation helpers:

- `required`
- `email`
- `int`
- `slug`
- `min:x`
- `max:x`

## Response

```ts
res.status(201).json({ ok: true })
res.send("<h1>Hello</h1>")
res.redirect("/login")
res.header("x-request-id", "abc123")
```

## Container + providers

```ts
container.bind("x", c => createX(c))
container.singleton("cache", () => new CacheManager(...))
container.instance("request", req)
container.registerProvider(AppProvider)
container.bootProviders()
```

Within dispatch, `container.get("request")` and `container.get("response")`
resolve async-local request bindings. Concurrent requests cannot overwrite
one another's bindings; no request binding is installed on the global app
container. Explicit handler arguments are still preferred. Services remain
singleton/transient as registered: do not capture a request in a singleton or
keep request objects in long-lived services. Provider boot is still once per
container, not once per request.

`container.runScoped(instances, callback)` temporarily supplies a readonly map
of binding overrides through an async call chain. It does not make singleton
services request-scoped or create a new service container.

Plugin helpers:

```ts
app.usePlugin(new CachePlugin({ defaultTtl: 120 }))
app.usePlugins([
  new ViewerPlugin({ baseDir: "./views" }),
  new DebugPlugin({ enabled: true }),
  new ValidationPlugin(),
])
```

## CachePlugin

Cache lives in the plugin layer, not core.

```ts
const cache = app.container.get<CacheManager>("cache")
cache.put("users", data, 60)
cache.get("users", [])
cache.has("users")
cache.forget("users")
cache.remember("expensive", () => compute(), 120)
```

## Viewer

```ts
const viewer = new Viewer("examples/views")
const html = viewer.render("home.html", { title: "Hello" })
```

## Plugins

```ts
class MyPlugin extends Plugin {
  readonly name = "my-plugin"
  register(container) {
    container.singleton("my-service", () => new MyService())
  }
}

app.usePlugin(new MyPlugin())
```

## Validator

```ts
const validator = app.container.get<Validator>("validator")
const result = validator.validate({ email: "a@b.com" }, {
  email: "required|email",
})
```

## DebugService

Development-only debugging and error rendering (disabled in production).

```ts
const debug = new DebugService({ 
  enabled: process.env.NODE_ENV !== "production",
  verbose: true 
})

debug.info("User created", { user_id: 42 })
debug.warn("Cache miss", { key: "expensive" })
debug.error("Connection failed", { host: "db.local" })
debug.debug("Detailed state", { state: ... })

const logs = debug.getLogs()          // Get all logs
debug.clear()                         // Clear logs

// Render error pages in dev mode
const html = debug.renderErrorPage(error, { path: "/test" })
debug.renderErrorResponse(res, error, { method: "POST", path: "/users" })
```

Configuration:
- `enabled` (boolean) - Enable/disable debug features
- `verbose` (boolean) - Log debug-level messages (default: false)

See [Debug Mode Guide](/guide/debugging) for full documentation.
