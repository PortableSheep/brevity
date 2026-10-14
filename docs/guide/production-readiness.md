# Production readiness: evidence, not a badge

Brevity is a candidate for explicit, HTML-first Node services. A working local
prototype is not evidence of sustained production reliability. This checklist
separates repository checks from deployment and independent-user evidence.

| Gate                     | Current evidence                                                                                                                                                                                                   | Remaining proof                                                                                          |
| ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------- |
| HTTP correctness         | Bounded parsing, controlled errors, scoped bindings, browser/no-JS contracts                                                                                                                                       | App-specific authorization and abuse cases                                                               |
| Validation configuration | Unknown names and malformed parameters throw; regression coverage                                                                                                                                                  | Domain schemas remain app-owned                                                                          |
| Debug diagnostics        | Disabled rendering produces generic errors                                                                                                                                                                         | Gate custom log endpoints and redact enabled diagnostics                                                 |
| Compatibility            | Framework contracts and packed consumers passed locally and in GitHub Actions on Node 20, 22, 24                                                                                                                   | Newer versions and deployment platforms are not automatically proven                                     |
| Documentation            | Hosted browser checks and live GitHub Pages documentation; homepage, tutorial, core API, and homepage JS/CSS verified over HTTPS                                                                                   | Ongoing documentation checks as APIs and examples change                                                 |
| Packaging                | `npm run test:release` installs all nine tarballs in a clean temporary consumer, exercises HTTP/file views/plugins, checks no server-side Svelte, imports the optional adapter, and builds/runs the copied starter | Registry publication, provenance, and registry-consumer verification                                     |
| Shutdown                 | Tested health/drain recipe, active-request SIGTERM, deadline failure                                                                                                                                               | Target-platform deployment and restart exercises                                                         |
| Performance              | Source/dependency/payload comparisons plus [repeatable synthetic HTTP benchmarks](./evaluating#synthetic-http-benchmark)                                                                                           | Dedicated-host, application-workload, overload, and soak benchmarks                                      |
| Usability                | Checked notebook and integration recipes                                                                                                                                                                           | Unfamiliar developer's onboarding and deployed second app                                                |
| Operations               | Explicit [operations recipe](/recipes/operations)                                                                                                                                                                  | Durable sessions, rate limits, backup restore, migrations, rollback, alerts                              |
| Security                 | Bounded runtime-source review found no high-confidence actionable vulnerabilities; local production dependency audit reported none                                                                                 | Independent penetration testing and application/deployment threat review; tooling audit remains separate |
| Release maintenance      | Package install checks and compatibility workflow                                                                                                                                                                  | Changelog, upgrade/support policy, reporting channel, reproducible published releases                    |

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

The release check cleans up its temporary consumer even when checks fail.
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

Then kill and restart an instance, roll out two instances, expire a session,
restore a backup into a new database, and roll back an application release.
Record the actual result; keep fixtures synthetic and never reuse production
secrets. These drills prove the application configuration, not every Brevity app.

Have someone unfamiliar with Brevity build and deploy from the docs. Record time
and blockers without counting our own familiarity as independent adoption.
