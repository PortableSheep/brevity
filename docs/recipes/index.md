# Recipes

Connect Brevity to the tools you already use. Each recipe includes runnable
source; start with the [notebook tutorial](/guide/tutorial) if you're new here.

## Data

- [Drizzle + SQLite](./drizzle): a small repository with transactions.
- [Prisma](./prisma): use the same app with a generated database client.

## Pages and sign-in

- [Supabase sign-in](./supabase): passwordless email with server-side sessions.
- [Svelte island](./svelte): add a counter without replacing a native form.

## Routes and tests

- [Controller decorators](./decorators): group routes into classes.
- [Domain errors](./errors): translate expected failures into HTTP responses.
- [HEAD routes](./head): serve headers without a response body.
- [HTTP tests](./testing): test against a real listener on a free port.
- [Playwright](./playwright): check the browser with JavaScript on and off.
- [Health and shutdown](./operations): drain requests before closing resources.

## Versions and checks

::: details Tool versions and automated coverage
These recipes use Drizzle 0.45.4, libSQL client 0.15.15, Prisma 6.12.0,
Supabase SSR 0.7.0 / JS 2.57.4, cookie 1.0.2, Svelte 5.57.2, Vite 6.4.4,
Svelte Vite plugin 5.1.1, and Playwright 1.56.0. CI checks Node 20/22/24;
browser checks run on Node 22. Newer versions need their own compatibility checks.

Listings come from `docs/samples/`. `npm run docs:check` typechecks them,
generates Prisma's client, builds Svelte, and runs HTTP tests. `npm run docs:e2e`
adds Chromium checks. The Supabase recipe's automated tests stub Auth HTTP;
email delivery and hosted refresh need a configured environment.
:::
