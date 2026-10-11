# Getting started

Brevity is a TypeScript HTTP micro-framework, not an ORM, auth engine, or frontend
compiler. Start with a route and bring other tools as needed.

## Choose your starting point

- **Learn end to end:** [Build a notebook](./tutorial.md), including a native form,
  retained errors, SQLite persistence, and real HTTP tests.
- **Explore this repository:** run `npm ci`, `npm run dev`, then visit
  `http://127.0.0.1:3000`. The existing example demonstrates plugins and providers.
- **Use the starter:** see the repository's `QUICK_START.md` and `starter/`.
  Package installation/publishing instructions live in `PUBLISH.md`.

Core supports Node.js 20+. The checked documentation toolchain runs on Node.js
22 (npm 10+); use that version when following the tutorial in this repository.
All TypeScript samples use ESM and standard TS5 decorators, with
`experimentalDecorators` and `emitDecoratorMetadata` disabled.

## The shape of an app

<<< @/samples/first-route.ts

An import does not start a server. Your entry point calls `app.listen(port, host)`,
which returns a Node HTTP `Server` and defaults to loopback. Explicitly configure
the host if your deployment needs an external listener.

Routes send their own responses. Parameters arrive as strings; generic type
arguments on request helpers are not runtime validation. Choose your own
persistence, access-control, and deployment policies.

## Where next?

[Tutorial](./tutorial.md) · [Recipes](/recipes/) · [Core API](/api/core) ·
[Web API](/api/web) · [Evidence](./evaluating.md)
