# Before you go live

Brevity has been used in a Vercel app with libSQL storage and Supabase sign-in.
That gives us useful deployment experience, not a guarantee for every app.
Here's what to check for yours.

## Your launch checklist

- **Access:** verify sign-in, logout, resource ownership, and protection against
  cross-site submissions. Keep diagnostics private.
- **Data:** use durable storage, review migrations, and restore a backup before
  you need one. Plan application and schema rollback separately.
- **Hosting:** set HTTPS, trusted proxy policy, body limits, and timeouts. Include
  templates and assets in the deployment. Check shutdown behavior on your host.
- **Operations:** add request IDs, redacted logs, alerts, rate limits, and a
  credential-rotation plan.
- **Workload:** measure your own traffic, concurrency, slow dependencies, and
  failures. The small results below aren't a capacity estimate.

For setup, see [deployment](./deployment) and [health/shutdown](/recipes/operations).

## What we've checked

CI covers HTTP parsing/errors, request isolation, HTML/forms, browser behavior
with and without JavaScript, and package installation on Node 20/22/24.
Release checks build all nine packages, compile a separate TypeScript consumer,
and run the starter from installed tarballs. Use supported Node 22/24 for deployment.

Packages use the `@portablesheep` scope (`@portablesheep/brevity` for core)
and have an MIT license. Version `0.1.0` is published on npm; the initial release
uses authenticated local publishing without a provenance attestation. See the
[release runbook](https://github.com/PortableSheep/brevity/blob/main/PUBLISH.md).

## Application staging evidence (October 2026)

A separate RSVP app on Vercel uses libSQL and Supabase. It passed checks for
submission and persistence across redeployment. A provider-side database copy
matched the source's schema and aggregate counts.

The user confirmed email sign-in, dashboard access after roughly 71 minutes
against a one-hour token lifetime, and logout denying further access. A local,
instrumented test separately proved expiry and exactly one rotating refresh
across four requests through two app instances.

A small hosted run completed **60 requests and six synthetic writes without
rate limits, server errors, or transport failures**. Invitation-page p95 was
130 ms; RSVP-submission p95 was 335 ms. These include network time and are small
samples, not a latency promise.

::: details Test conditions and detailed results
The traffic run lasted 33.643 seconds with concurrency one and at least 550 ms
between request starts. The 60 requests include preflight and redirect reads;
all responses had their expected 200 or 303 status.

| Request      | Samples |    p50 |      p95 |  Maximum |
| ------------ | ------: | -----: | -------: | -------: |
| Invitation   |      26 | 113 ms |   130 ms |   132 ms |
| RSVP POST    |       6 | 154 ms |   335 ms |   335 ms |
| Confirmation |       6 | 127 ms |   145 ms |   145 ms |
| CSS          |      20 |  24 ms |    42 ms |   108 ms |
| Preflight    |       2 | 197 ms | 1,670 ms | 1,670 ms |

No request was independently identified as a cold start. No competing framework
was measured in this run.

The local auth test used actual 60-second Supabase tokens, waited 61 seconds,
confirmed the old token was rejected, and verified token rotation, authenticated
reads, and logout denial of an old session cookie. The hosted expiry result is
user-observed; it doesn't independently record the provider's refresh exchange.

The restore matched eight tables, three migrations, event/RSVP/session counts,
and the synthetic fixture. Copy creation took 6.607 seconds. End-to-end recovery
time, recovery-point loss, point-in-time restore, failover, and recovery outside
Turso weren't measured. The retained copy includes session data and needs the
same access controls as the source. This drill doesn't set up scheduled backups.

The hosted bundle required an HTTP-only libSQL client and templates/assets/
migrations inside the function root. Database and auth integrations stayed in
the app, not core. Private source, credentials, and row data aren't published here.
:::

## Still to prove

Sustained load, overload handling, cold starts, provider outages, migration
failure/rollback, alerts, and recovery in another failure domain need further
work. Independent onboarding and penetration testing haven't been completed.

A scoped source review and dependency audit are snapshots, not security
certifications. Docs tooling still has known VitePress/Vite/esbuild advisories;
keep development and preview servers loopback-only.

## Run the repository gates

```sh
npm ci
npm test
npm run typecheck
npm run test:release
npm run docs:build
npx playwright install chromium
npm run docs:e2e
```

These commands don't publish packages. Temporary release consumers are cleaned
up even on failure.

## Publishing this documentation on GitHub Pages

The default-branch workflow checks the framework, builds the docs, and deploys
Pages. Pull requests don't deploy. To host a fork, select **GitHub Actions** in
Settings -> Pages and allow the default branch in the `github-pages` environment.
For a project-site build locally:

```sh
PAGES_BASE_PATH=/brevity npm run docs:build
```

Pages hosts the documentation, not your Node application.
