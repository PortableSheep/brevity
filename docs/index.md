---
layout: home
hero:
  name: Brevity
  text: A little framework. Your kind of app.
  tagline: Build APIs and server-rendered pages in TypeScript. Add what you need. Leave the rest out.
  actions:
    - theme: brand
      text: Get started
      link: /guide/getting-started
    - theme: alt
      text: Build a notebook
      link: /guide/tutorial
features:
  - title: Small by default
    details: Routes, middleware, and dependency injection. Core has no external runtime dependencies.
  - title: Start with HTML
    details: Use optional templates and native forms. Add a browser component where it helps, without turning the whole page into a client app.
  - title: Use tools you know
    details: Bring Drizzle, Prisma, Supabase, or Svelte. Brevity connects the HTTP pieces, not every layer of your stack.
---

## A route is just a function

<<< @/samples/first-route.ts

Call `app.listen(3000)` in your entry point to start the server. Send JSON with
`res.json()`, redirect with `res.redirect()`, or render an HTML page.

## Where to start

[Run your first app](/guide/getting-started), then follow the
[notebook tutorial](/guide/tutorial) for forms and a database.
Already building something? Pick an [integration recipe](/recipes/) or look up
an API in the [reference](/api/core).
