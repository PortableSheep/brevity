# Deployment

Brevity uses Node HTTP requests and responses. Choose a persistent Node service
or a Node-compatible function host; your routes, middleware, and plugins stay
the same. Core has no platform SDK dependencies.

## Node services and containers

Call `app.listen(port, host)` in your entry point. Use the host's assigned `PORT`
and bind to `0.0.0.0` when the platform requires external access. Keep secrets in
the host's environment configuration, not in the repository.

The [health and shutdown recipe](/recipes/operations) covers readiness probes,
request draining, and SIGTERM deadlines. Configure HTTPS, proxy trust, resource
limits, and restart policy on your deployment platform.

## Host-owned Node handlers

Export `app.handler` when the host supplies Node `IncomingMessage` and
`ServerResponse` objects. Creating the app and exporting the handler does not
open a port. Build routes and register plugins once at module scope so a warm
function can reuse them.

<<< @/samples/deployment.ts

`handler` is safe to export without binding `this` and returns `Promise<void>`.
It uses the same bounded body parsing, request-local bindings, middleware,
plugins, and error handling as `listen()`. The host owns the listener and
connection lifecycle. Resolution means dispatch has completed, not necessarily
that a response stream has finished flushing.

The host must preserve the request URL and provide the unread request stream.
Do not run an upstream body parser before Brevity: pre-parsed objects are not
used and an already-consumed stream cannot be parsed again. Keep explicit
responses in handlers; return values are not automatically serialized.

## Vercel Node functions

Vercel offers Node request/response function handlers as well as Web-standard
handlers. Brevity's `app.handler` targets the **Node request/response** contract,
not a Web `Request`/`Response` or Edge runtime.

Use a single function entry point and configure rewrites to preserve all
application paths, including form actions, redirects, auth callbacks, and
assets. Verify that the chosen function runtime leaves the body stream unread.
Bundle HTML templates and other file assets explicitly, or serve browser assets
from a CDN/public directory.

See Vercel's [Node runtime documentation](https://vercel.com/docs/functions/runtimes/node-js)
and [function API reference](https://vercel.com/docs/functions/functions-api-reference).
The Node handler contract is tested locally and in CI. A deployed Vercel
application has not yet been verified; a handler export alone does not establish
that rewrites, body handling, asset packaging, or authentication are correct.

## AWS Lambda

Lambda events are not Node HTTP requests. Do not export `app.handler` directly
as a Lambda handler.

One integration path is the
[AWS Lambda Web Adapter](https://github.com/awslabs/aws-lambda-web-adapter),
which forwards HTTP to a Node server started by `app.listen()`. This keeps
Lambda-specific code outside Brevity and lets a container use the same server
entry point on Lambda or a conventional host. Align the adapter port and
readiness path with your application.

An event-to-Node adapter is another option, but it must correctly translate
API Gateway/Function URL events, binary bodies, repeated cookies, and responses.
Neither Lambda deployment path has been verified for this repository yet.

## Function-host constraints

- Store sessions and persistent application data externally. Local files,
  in-memory stores, and caches are not durable or shared across instances.
- Keep database clients reusable, bound connection counts, and use the provider's
  supported pooling strategy. Request-specific state belongs in request scope,
  not mutable module globals.
- Await required work before completing a response. A function host can freeze
  or stop the process; timers and detached background tasks are not job queues.
- Configure body limits, execution duration, concurrency, and outbound timeouts
  for the platform. Platform limits can reject a request before Brevity sees it.

Before going live, exercise cold and warm requests, concurrent requests,
malformed/oversized bodies, multiple cookies, auth redirects, form submissions,
assets, persistence, and controlled failures on the selected host. See the
[production checklist](./production-readiness).
