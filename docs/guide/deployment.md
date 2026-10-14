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

The runnable [Vercel example](https://github.com/PortableSheep/brevity/tree/main/examples/vercel)
uses the documented [Build Output API](https://vercel.com/docs/build-output-api/primitives)
with a single Node 22 function. Try the
[live application](https://brevity-node-example.vercel.app/): HTML file views,
CSS, and a native form without browser JavaScript.

From a clone of this repository, build and deploy:

```sh
npm ci
npm run build:packages
node examples/vercel/build.mjs
vercel link --cwd examples/vercel
vercel deploy --prebuilt --cwd examples/vercel
node examples/vercel/check.mjs https://your-deployment-url
```

Install and authenticate the Vercel CLI separately. Select a new project for
the example, not an existing application's project. Use an account and plan
appropriate for your use; platform limits and billing still apply.
Vercel may make the first deployment of a new project its production deployment.
Protected previews need an authorized verification client.

The build script bundles the local workspace packages with esbuild, so this
example does not depend on unpublished packages being available from npm.
It emits:

- `functions/index.func/index.mjs`: the application exporting `app.handler`.
- `functions/index.func/views/`: explicitly bundled HTML file views.
- `functions/index.func/.vc-config.json`: Node 22, a 10-second duration, streaming,
  and **`shouldAddHelpers: false`**.
- `static/style.css`: CDN-served browser assets.
- `config.json`: filesystem-first routing with all remaining original paths
  forwarded to the function.

Disabling Vercel's helpers is essential: Brevity needs the unread request stream,
not an upstream parsed body. This setting belongs in the generated function
configuration; it is not Next.js's `bodyParser` option. For other build paths,
consult Vercel's
[advanced Node configuration](https://vercel.com/docs/functions/runtimes/node-js/advanced-node-configuration)
before assuming raw-body behavior.

The [deployed Node 22 build](https://brevity-node-example-7vminw42o-michael-gundersons-projects.vercel.app/)
passed HTTPS checks for routing, explicit HEAD, JSON/repeated form fields,
400/413/415 errors, 422 form validation, escaped output, 303 redirects, repeated
cookies, binary responses, file views, static CSS, 404/409, and 20 concurrent
request-local bindings. The same checker runs against the generated bundle in
the repository's Node compatibility tests; that local check does not emulate
the Vercel runtime.

The example uses synthetic data and stores nothing. It does **not** establish
durable persistence, real authentication, cold-start latency, load capacity, or
Lambda/Edge compatibility. Preserve all application paths when adapting it,
including auth callbacks and enhanced-form targets.

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
