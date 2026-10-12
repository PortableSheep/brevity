# Health checks and graceful shutdown

Brevity returns a normal Node HTTP server. Applications own initialization,
timeouts, health policy, signal handling, and database cleanup. There is no new
lifecycle plugin or runtime dependency.

Initialize required resources before listening. This checked example provides
separate liveness/readiness routes, rejects readiness while stopping, stops
accepting connections, drains existing HTTP work, then closes resources once.

<<< @/samples/operations.ts

The process fixture shows signal handling and nonzero exit on failed draining:

<<< @/samples/operations-process.ts

`npm test` exercises real HTTP, idempotent cleanup, a child-process SIGTERM with
an active request, and a deadline that terminates a slow connection and reports
failure. This proves the recipe locally, not a hosting platform's behavior.

## Deployment responsibilities

- Bind `0.0.0.0` explicitly inside containers; the safe default is loopback.
- Place TLS and request-rate limits at a trusted proxy or use established
  application middleware. Do not trust forwarded headers from arbitrary clients.
- Configure the platform termination grace period longer than the application's
  drain deadline. A supervisor must impose a final process-exit deadline if
  resource cleanup hangs. Node `closeAllConnections()` does not close upgraded
  WebSocket connections; manage them separately if you add upgrades.
- Readiness should reflect dependencies actually needed to serve requests. The
  sample assumes initialization already succeeded; it is not a database probe.
- `requestTimeout` bounds receiving a request, not handler execution. Set
  downstream database/HTTP deadlines and cancellation in application code.
  Forced socket closure does not cancel an async handler. Cancel or account for
  outstanding application work before releasing resources on the forced path.
- Use structured logs with request IDs and redact cookies, authorization
  headers, tokens, and personal data. Debug tooling is not observability.
- Deploy `views/` and compiled browser assets alongside server output. Set
  `NODE_ENV=production`; views cache compiled templates. Publish a new deployment
  instead of editing cached templates in place.
- Keep sessions and PKCE state in a durable, shared store when restarts or
  multiple instances must preserve them. Do not invent auth cryptography.
- Exercise backup restoration, migrations, rollback, and expired sessions against
  a staging database. A passing local HTTP test is not a disaster-recovery drill.
