# Production checklist

Use this checklist when deploying a Brevity application. It distinguishes
framework contracts checked in CI from configuration and operational behavior
that must be verified on your selected host.

| Gate                     | Current evidence                                                                                                                                                                                                   | Remaining proof                                                                                          |
| ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------- |
| HTTP correctness         | Bounded parsing, controlled errors, scoped bindings, browser/no-JS contracts                                                                                                                                       | App-specific authorization and abuse cases                                                               |
| Validation configuration | Unknown names and malformed parameters throw; regression coverage                                                                                                                                                  | Domain schemas remain app-owned                                                                          |
| Debug diagnostics        | Disabled rendering produces generic errors                                                                                                                                                                         | Gate custom log endpoints and redact enabled diagnostics                                                 |
| Compatibility            | Framework contracts and packed consumers passed locally and in GitHub Actions on Node 20, 22, 24                                                                                                                   | Newer versions and deployment platforms are not automatically proven                                     |
| Documentation            | Hosted browser checks and live GitHub Pages documentation; homepage, tutorial, core API, and homepage JS/CSS verified over HTTPS                                                                                   | Ongoing documentation checks as APIs and examples change                                                 |
| Packaging                | `npm run test:release` installs all nine tarballs in a clean temporary consumer, exercises HTTP/file views/plugins, checks no server-side Svelte, imports the optional adapter, and builds/runs the copied starter | Registry publication, provenance, and registry-consumer verification                                     |
| Shutdown                 | Tested health/drain recipe, active-request SIGTERM, deadline failure                                                                                                                                               | Target-platform deployment and restart exercises                                                         |
| Hosting                  | [Live Vercel Node 22 example](./deployment#vercel-node-functions): original paths, raw bodies, cookies, forms, bundled views/static assets, errors, binary bytes, and concurrent scopes verified over HTTPS        | Host limits/operations and Lambda deployment; see the application evidence below                         |
| Performance              | Source/dependency/payload comparisons plus [repeatable synthetic HTTP benchmarks](./evaluating#synthetic-http-benchmark)                                                                                           | Dedicated-host capacity, cold starts, overload, and soak; bounded application results below              |
| Usability                | Checked notebook and integration recipes                                                                                                                                                                           | Unfamiliar developer's onboarding and deployed second app                                                |
| Operations               | Explicit [operations recipe](/recipes/operations)                                                                                                                                                                  | Provider-independent recovery/PITR, rollback, rate limits, and alerts; bounded staging drills below      |
| Security                 | Bounded runtime-source review found no high-confidence actionable vulnerabilities; local production dependency audit reported none                                                                                 | Independent penetration testing and application/deployment threat review; tooling audit remains separate |
| Release maintenance      | [Support/upgrade policy](./support), source changelog, enabled private vulnerability reporting, package install checks, and compatibility workflow                                                                 | Registry publication/consumer verification, provenance, and reproducible published releases              |

## Application staging evidence (October 2026)

A separate RSVP application has exercised the Node integration on Vercel with
remote libSQL storage and Supabase authentication. Its database client, migrations,
identity/session policy and deployment tooling remain application dependencies,
not additions to Brevity core. These results apply to that configuration; they are
not a blanket guarantee for other applications or providers. Private application
source, account identifiers, data and credentials are not part of this public record.

| Exercise                             | Observed result                                                                                                                                                                                                            | Limit                                                                                                                     |
| ------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| Hosted HTTP and persistence          | Guest HTML/CSS, protected-route redirects, controlled 404s, escaped RSVP rendering, and a synthetic RSVP readable after redeployment                                                                                       | Not a host-capacity or all-routes guarantee                                                                               |
| Hosted authentication                | User confirmed magic-link callback/dashboard access, reload continuity, logout denial, then continuity after about 71 minutes against a user-reported 3,600-second access-token lifetime                                   | User-observed, not independent provider refresh telemetry                                                                 |
| Actual expiry and concurrent refresh | Local Supabase issued 60-second tokens; after 61 seconds the old token was rejected; four requests through two app instances caused exactly one rotating refresh; dashboard succeeded and logout denied old-session replay | Local instrumented evidence, not a hosted concurrency measurement                                                         |
| Recovery                             | Provider-side copy into a separate database matched eight tables, three migrations, aggregate event/RSVP/session counts and the synthetic fixture check                                                                    | Copy creation reported 6.607 seconds; no measured end-to-end RTO/RPO, timestamp/PITR, failover or separate failure domain |
| Bounded traffic                      | 60 hosted HTTP requests including preflight/redirect reads, six synthetic RSVP writes, 33.643 seconds, concurrency one, minimum request-start spacing 550 ms; expected 200/303 responses and no 429/5xx/transport failures | A small staging run, not throughput capacity, cold-start identification, overload or soak                                 |

Observed staging timings, including client/network time:

| Path category      | Samples |    p50 |      p95 |  Maximum |
| ------------------ | ------: | -----: | -------: | -------: |
| Invitation reads   |      26 | 113 ms |   130 ms |   132 ms |
| RSVP submissions   |       6 | 154 ms |   335 ms |   335 ms |
| Confirmation reads |       6 | 127 ms |   145 ms |   145 ms |
| CSS                |      20 |  24 ms |    42 ms |   108 ms |
| Preflight          |       2 | 197 ms | 1,670 ms | 1,670 ms |

Small samples, especially six writes, cannot establish a meaningful tail-latency
SLO. The first request was not identified as a cold start. No equivalent competing
framework workload was measured in this run.

The hosted bundle needed an HTTP-only libSQL client rather than its native SQLite
entry, and templates/assets/migrations had to be inside the deployed function
root. Keep these provider and packaging decisions in the application. File-backed
SQLite is still appropriate for local development, not durable function storage.

Remaining operational gates include credential rotation, migration failure and
application rollback, provider outage handling, alerts, sustained concurrency and
abuse protection. An expiring staging credential needs rotation even when all
framework checks pass. A retained restore copy containing sessions needs the same
access controls and retention policy as its source. No automated ongoing backups
or recovery schedule is implied by one successful copy drill.

## Release candidate status

The repository and package archives carry the maintainer-approved MIT license.
Public npm metadata returned 404 for all nine package names on October 16, 2026;
this does not establish npm scope ownership or permission to publish. The
[release runbook](https://github.com/PortableSheep/brevity/blob/main/PUBLISH.md)
separates candidate checks from explicit publication approval, trusted-publisher
setup, registry verification and independent onboarding. No publishing workflow
or registry release is implied by the existing verification/Pages workflow.

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

The release check validates MIT license/source/runtime metadata, all declared
export files and repeat-pack integrity, and compiles a strict TypeScript consumer.
It cleans up its temporary consumer even when checks fail.
It never publishes packages. External packages come from the configured npm
registry; no credentials or application data are part of the fixture.

## Publishing this documentation on GitHub Pages

The framework workflow verifies Node 20/22/24. On a successful default-branch
push (or manual run on that branch), it rebuilds docs with the base path supplied
by `actions/configure-pages`, uploads the static site, and deploys to the
`github-pages` environment. Pull requests never deploy.

The [public documentation](https://portablesheep.github.io/brevity/) is live.
The [first successful hosted run](https://github.com/PortableSheep/brevity/actions/runs/38507762699)
passed the Node verification matrix, browser checks, benchmark smoke, and Pages
deployment. This establishes CI and documentation deployment, not application-host
compatibility or production operational readiness.

To publish documentation from a fork:

1. Push the repository and workflow to the intended GitHub repository.
2. In Settings → Pages, choose **GitHub Actions** as the source.
3. Ensure the `github-pages` environment permits the default branch.
4. Merge the changes and inspect the deployment URL and workflow results.

For a local project-site build:

```sh
PAGES_BASE_PATH=/brevity npm run docs:build
```

GitHub Pages serves documentation only. Node applications require a separate
host.

## Acceptance outside the repository

The local Node runs are compatibility checks, not a support promise for end-of-life
versions. Prefer a currently supported Node LTS version for deployment.

Compatible lockfile updates reduced development-tool audit findings from eight
to three. VitePress's nested Vite/esbuild advisories have no compatible fix in
the current stable release. Keep docs dev/preview servers loopback-only; they
are not production hosting. This residual tooling risk is not hidden by the
zero-advisory production dependency result.

The scoped security review covered core HTTP/scopes/validation, web escaping/assets,
view confinement, islands loading/forms/serialization, and debug rendering. It
did not cover every runtime file, dependency internals, application auth, or a
live deployment. An audit reporting no known production advisories does not mean
all dependencies or behavior are safe.

Deploy a staging service with a written workload and latency/error objectives.
Measure warm and cold behavior, increase concurrency, exercise slow upstreams,
and run a soak while observing RSS, event-loop delay, errors, and connection
cleanup. Compare equivalent behavior against Express, Fastify, and Nest under
the same machine/runtime and report repeated runs, versions, and losses.

Extend the bounded staging results above: kill and restart an instance, roll out
two hosted instances, expire a session under provider failure,
restore a backup into a new database, and roll back an application release.
Record the actual result; keep fixtures synthetic and never reuse production
secrets. These drills prove the application configuration, not every Brevity app.

Have someone unfamiliar with Brevity build and deploy from the docs. Record time
and blockers without counting our own familiarity as independent adoption.
