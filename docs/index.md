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
      text: Evaluate the tradeoffs
      link: /guide/evaluating
features:
  - title: Start with a route
    details: One app, one handler, one response. Add middleware and explicit dependency wiring when your application needs them.
  - title: HTML first, islands by choice
    details: Escaped fragments, retained form errors, and safe JSON state live in the optional web package. Your frontend compiler stays yours.
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

The [support inbox comparison](/guide/evaluating#second-application-support-inbox)
found about **10% fewer nonblank runnable source lines** and **2 vs 42 production
name/version pairs** against Express in one matched app. It did **not** measure
developer productivity, startup speed, or request throughput.
[Read the reproducible evidence and its limitations](/guide/evaluating).

Start with the [notebook tutorial](/guide/tutorial), choose an
[integration recipe](/recipes/), and check the [API contracts](/api/core).
Brevity aims to punch above its weight through composition, not an ever-growing core.
