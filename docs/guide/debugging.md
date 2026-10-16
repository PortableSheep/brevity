# Debugging

`@brevity/plugin-debug` adds development logs and error pages. It doesn't create
routes or middleware automatically; you choose what to expose.

## Add diagnostics

<<< @/samples/debugging.ts

This example adds a request logger, a development-only `/debug` route, and an
`onError` hook. Known `HttpError`s use the normal response; unexpected production
errors stay generic and are logged on the server.

::: warning Keep debug routes private
Error pages can contain stacks and request details. Don't pass cookies, tokens,
or raw request bodies to the renderer. Disabling the service hides its error
details, but doesn't protect a custom route that calls `getLogs()`.
:::

## Logs

Use `info`, `warn`, or `error` with a message and optional data. `debug` also
requires `verbose: true`. Logs go to the console and a process-local history of
up to 100 entries.

`getLogs()` returns a copy; `clear()` removes history. Disabling doesn't erase
existing entries. For durable production logs and metrics, use your host's
observability tools. See the [plugin reference](/api/plugins#brevity-plugin-debug).
