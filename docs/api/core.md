# Core API

## `createApp()`

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
router.delete(path, handler)
router.middleware(fn)
router.setNotFound(fn)
```

Route placeholders:

- `{i:id}` numeric
- `{s:slug}` alphanumeric
- `{*:path}` wildcard
- `:id` segment capture

## Request

```ts
req.get("name", defaultValue)
req.has("name")
req.param("id")
await req.parseBody()
req.validate({ email: "required|email" })
```

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
