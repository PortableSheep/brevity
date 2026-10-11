# HTTP tests with `listen(0)`

**Tested:** local @brevity/core 0.1.0, Node.js 22, built-in `node:test`.
Use the public listener instead of building a custom raw request adapter.

<<< @/samples/testing.ts

Register cleanup before awaiting readiness. `once(server, "listening")` also
rejects if the server emits `error`. `server.address()` is only useful after
listening. Binding to loopback avoids exposing fixtures to the network.

## Verify the real contract

<<< @/samples/sample.test.ts

The suite covers the first route, form parser behavior, escaped retained input,
database reopen, explicit HEAD, plain/decorated parity, and SDK PKCE wiring.
Use temporary databases per test, await requests, and close sockets before
releasing persistence. `closeAllConnections()` is appropriate for test teardown,
not a replacement for graceful production shutdown.

Run `npm run docs:check` from the root. Root `npm test` includes this check after
the framework's own suite. Browser behavior needs [Playwright](./playwright.md);
provider email delivery needs a live acceptance run.
