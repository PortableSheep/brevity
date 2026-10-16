# Health checks and graceful shutdown

Start required resources before listening. On shutdown, stop accepting requests,
let active work finish, then close the database. Brevity returns a normal Node
HTTP server, so you can use Node's lifecycle methods.

Initialize required resources before listening. This checked example provides
separate liveness/readiness routes, rejects readiness while stopping, stops
accepting connections, drains existing HTTP work, then closes resources once.

<<< @/samples/operations.ts

::: details Signal handling and the process entry point
<<< @/samples/operations-process.ts
:::

`npm test` checks active-request draining, repeated cleanup, SIGTERM, and
deadline failure locally. Check your host's termination grace period too.

## Before deploying

Set the platform's termination grace period longer than your drain deadline.
Give database/HTTP calls their own timeouts: Node's `requestTimeout` limits
receiving a request, not executing a handler.

Forced socket closure doesn't cancel async work. Cancel or account for outstanding
work before closing resources. A supervisor should enforce a final process-exit
deadline; upgraded WebSockets need their own cleanup.

Readiness should reflect the dependencies you need to serve traffic. This sample
assumes startup succeeded; it isn't a database health probe.

For HTTPS, proxy trust, assets, durable sessions, backups, and rollout checks,
see [deployment](/guide/deployment) and the [launch checklist](/guide/production-readiness).
