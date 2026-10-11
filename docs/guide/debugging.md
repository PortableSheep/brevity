# Development diagnostics

`@brevity/plugin-debug` is an **opt-in** service. Registering it does not install
request logging middleware, debug endpoints, or an error hook automatically.
Its logging defaults to enabled outside `NODE_ENV=production` when registered
with default options.

## Wire diagnostics explicitly

<<< @/samples/debugging.ts

The app installs its own request logger and development-only `/debug` route.
It uses `createApp({ onError })` for unexpected failures, including those outside
the middleware pipeline. Known `HttpError`s fall through to core's normal
response; production failures remain logged generic 500s.

**Gate rendering and routes yourself.** `DebugService.renderErrorPage()` and
`renderErrorResponse()` do not check enabled. Turning logging off does not make
diagnostic endpoints safe. Keep the default loopback bind in development, and
never expose stacks, request secrets, or log history publicly.

## What the service does

`info`, `warn`, `error`, and `debug` accept a message and optional data.
`debug` needs verbose as well as enabled. Enabled logs go to console and an
in-memory history of at most 100 entries. `getLogs()` returns a shallow array
copy; `clear()` removes history; `setEnabled()` changes logging.

Rendering produces escaped diagnostic HTML with stack and optional request
information. The app chooses which information to pass; escaping does not redact
tokens or personal data. Do not pass raw request headers/body by default.

This is development tooling, not a durable log backend, metrics engine, or
production error-reporting service. See the [plugin API](/api/plugins).
