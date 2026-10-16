# Deployment

Run Brevity as a Node service, or export its handler to a Node function host.
Your routes stay the same.

## Node services and containers

Start the server with `app.listen(port, host)`. Read the platform's `PORT` and
bind to `0.0.0.0` if it needs an external listener; Brevity defaults to loopback.
Keep secrets in the host's environment settings.

Add [health checks and graceful shutdown](/recipes/operations), and configure
HTTPS, timeouts, and restart policy on your host.

## Host-owned Node handlers

When the platform provides Node requests and responses, export `app.handler`
instead of opening a port:

<<< @/samples/deployment.ts

Build the app once at module scope. The handler uses the same middleware, parsing,
request scopes, and errors as `listen()`, and is safe to export without binding it.

::: warning Keep the request body unread
Don't put a body parser in front of Brevity. The handler needs the original URL
and request stream, not a pre-parsed `req.body`.
:::

The host manages connections. The handler's promise resolves when dispatch is
done, not necessarily when response bytes have finished flushing. See the
[handler reference](/api/core#app-handler-nodereq-noderes).

## Vercel Node functions

The [Vercel example](https://github.com/PortableSheep/brevity/tree/main/examples/vercel)
packages one Node 22 function, HTML views, and static CSS. You can
[try it live](https://brevity-node-example.vercel.app/).

Install and sign in to the Vercel CLI, then run from the repository root:

```sh
npm ci
npm run build:packages
node examples/vercel/build.mjs
vercel link --cwd examples/vercel
vercel deploy --prebuilt --cwd examples/vercel
node examples/vercel/check.mjs https://your-deployment-url
```

Choose a **new Vercel project**, not an existing app. Vercel may make a new
project's first deployment its production deployment. Protected previews need
an authorized client to run the checker.

The build uses Vercel's [Build Output API](https://vercel.com/docs/build-output-api/primitives)
and bundles local packages, so no npm publication is needed.

::: details What's in the function bundle?

- `functions/index.func/index.mjs`: the exported handler.
- `functions/index.func/views/`: HTML templates.
- `functions/index.func/.vc-config.json`: Node 22, 10-second duration, streaming,
  and `shouldAddHelpers: false` to leave the body unread.
- `static/style.css`: CDN-served CSS.
- `config.json`: serves static files first, then forwards all other paths to the function.

`shouldAddHelpers` is a Build Output API setting, not Next.js's `bodyParser`
option. For a different build path, check Vercel's
[Node configuration](https://vercel.com/docs/functions/runtimes/node-js/advanced-node-configuration).
:::

For a real app, use external storage for data and sessions, include templates
and migrations inside the function bundle, and choose an HTTP-compatible database
client. The example stores nothing; the [staging results](./production-readiness#application-staging-evidence-october-2026)
cover a separate app with libSQL and Supabase.

## AWS Lambda

Don't export `app.handler` directly to Lambda: Lambda events aren't Node HTTP
requests. The [AWS Lambda Web Adapter](https://github.com/awslabs/aws-lambda-web-adapter)
can forward HTTP to an app started with `listen()`. Match its port and readiness
path to your app. This deployment path hasn't been verified here.

## Function-host constraints

Keep data and sessions outside the function's filesystem and memory. Reuse
database clients, but keep request state out of shared globals. Await required
work before responding; detached timers aren't a reliable job queue.

Set platform body limits, execution deadlines, and downstream timeouts. Check
forms, cookies, redirects, assets, and persistence on the real host before
launching. Brevity targets **Node HTTP**, not Edge or Fetch runtimes.
