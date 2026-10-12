# Development diagnostics

`@brevity/plugin-debug` is an **opt-in** service. Registering it does not install
request logging middleware, debug endpoints, or an error hook automatically.
Its diagnostics default to enabled outside `NODE_ENV=production` when registered
with default options.

## Wire diagnostics explicitly

<<< @/samples/debugging.ts

The app installs its own request logger and development-only `/debug` route.
It uses `createApp({ onError })` for unexpected failures, including those outside
the middleware pipeline. Known `HttpError`s fall through to core's normal
response; production failures remain logged generic 500s.

**Keep diagnostic routes development-only.** When disabled,
`DebugService.renderErrorPage()` returns generic "Internal Server Error" HTML
and `renderErrorResponse()` sends it with status 500, without reading the error,
request details, or log history. This guard does not protect custom endpoints
that call `getLogs()` directly. Keep the default loopback bind in development,
and never expose stacks, request secrets, or log history publicly.

## What the service does

`info`, `warn`, `error`, and `debug` accept a message and optional data.
`debug` needs verbose as well as enabled. Enabled logs go to console and an
in-memory history of at most 100 entries. `getLogs()` returns a shallow array
copy; `clear()` removes history; `setEnabled()` changes logging and rendering.
Disabling does not clear previously recorded history.

Enabled rendering produces escaped diagnostic HTML with stack and optional request
information. The app chooses which information to pass; escaping does not redact
tokens or personal data. Do not pass raw request headers/body by default.

This is development tooling, not a durable log backend, metrics engine, or
production error-reporting service. See the [plugin API](/api/plugins).
