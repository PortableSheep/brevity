---
layout: home
hero:
  name: Brevity
  text: Small core. Serious possibilities.
  tagline: A light TypeScript micro-framework for APIs, HTML-first apps, and the expert tools you already trust. Explicit routes. Native forms. No hidden machinery.
  actions:
    - theme: brand
      text: Build your first app
      link: /guide/tutorial
    - theme: alt
      text: Explore integrations
      link: /recipes/
features:
  - title: Start with a route
    details: One app, one handler, one response. Add middleware and explicit dependency wiring when your application needs them.
  - title: HTML first, islands by choice
    details: HTML files with layouts and partials in optional views. Lazy plain-TypeScript islands and native-form enhancement in optional islands. Your frontend compiler stays yours.
  - title: Bring the specialists
    details: Drizzle or Prisma for data. Supabase for identity. Svelte for an island. Playwright for the browser. Recipes, not replacement engines.
  - title: Know the boundaries
    details: Bounded body parsing, controlled errors, and async-local request bindings in core. Authorization, deployment, and business policy in your app.
---

## Your first route

<<< @/samples/first-route.ts

Call `app.listen(3000)` from your entry point. Brevity never auto-serializes a
handler's return value: send the response explicitly.

## Less framework, not less responsibility

`@brevity/core` and `@brevity/web` have no runtime package dependencies.
That makes the framework surface small; it does not make your database,
identity provider, or browser compiler disappear.

Write complete pages in [HTML file views](/guide/views), with Eta 3.5.0 and
escape-by-default interpolation. Add [native islands](/guide/islands) only where
interaction helps: load, visible, idle, or interaction scheduling, usable
no-JS fallback, and optional Svelte mounting. Both packages are opt-in; core
has no template engine, compiler, or client framework. Inline `html` remains
useful for fragments and small cases.

Run a Node service with `app.listen()`, or export `app.handler` when your host
supplies Node HTTP requests and responses. The [deployment guide](/guide/deployment)
explains hosting options and serverless integration requirements.

Start with the [notebook tutorial](/guide/tutorial), choose an
[integration recipe](/recipes/), and check the [API contracts](/api/core).
For measured workloads and package comparisons, see
[comparisons and benchmarks](/guide/evaluating).
