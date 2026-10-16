# Test over HTTP

Start your app on port `0` to get a free local port. Make requests with `fetch`
and close the server when the test finishes. No custom request adapter needed.

<<< @/samples/testing.ts

Register cleanup before awaiting `listening`, then read the assigned port from
`server.address()`. `once(server, "listening")` also rejects on a server error.

## Run the examples

```sh
npm run docs:check
```

The [test suite](https://github.com/PortableSheep/brevity/blob/main/docs/samples/sample.test.ts)
covers JSON routes, form errors, escaping, persistence after reopening SQLite,
HEAD, decorators, and Supabase SDK wiring. Use a separate temporary database for
each test and close sockets before closing storage.

`closeAllConnections()` is useful for test cleanup, not graceful production
shutdown. For browser behavior, use [Playwright](./playwright).
