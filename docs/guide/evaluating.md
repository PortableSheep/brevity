# Evaluating Brevity

Brevity's intended advantage is a small amount of explicit application glue:
one HTTP backend can render pages, accept forms, provide APIs, and supply data
to an independently compiled browser component. This is a design goal, not a
demonstrated productivity or performance advantage.

HTML-first rendering, progressive enhancement, and interactive components are
established patterns. Brevity must earn its place through the developer experience
of combining them, rather than claiming to have invented them.

## Compare complete features

Use one written acceptance contract for each implementation. A useful support
inbox includes a form, server-side validation, retained invalid input, persistent
storage, a redirect to request details, a searchable paginated inbox, and status
updates. Navigation and submissions should work without browser JavaScript.

Comparable implementations must also handle malformed and oversized bodies,
token failures, escaping, unknown routes, persistence errors, and concurrent
writes. Omitting those behaviors from one implementation invalidates the
comparison. A bounded local example is not a production system: authentication,
authorization, deployment, and real user data are separate concerns.

Use documented public APIs and ordinary idioms for each framework. Do not copy
private helpers into the Brevity app, deliberately inflate another implementation,
or move domain code into the framework just to reduce the application count.

## Count what developers maintain

Report physical and nonblank lines with a reproducible file inventory:
Also report source bytes: compressed or long template/CSS lines can make a
line-only comparison misleading.

| Category | Include |
|---|---|
| Shared business code | Input rules, repository, domain types, persistence policy |
| Framework-specific server code | Routes, middleware, transport errors, response handling |
| Rendering | Templates, layout callbacks, field/error markup |
| Browser code | Native scripts, component source, mount/save/error handling |
| Styling | Hand-authored CSS, including shared styles |
| Configuration | Manifests, compiler/build configuration, start/build scripts |
| Verification | Contract tests and measurement scripts, reported separately |

If a file mixes categories, label it mixed rather than silently assigning all of
it to domain code. Count shared files once per runnable implementation when
reporting each application's total. Also show framework-specific totals so a
large shared repository cannot hide a small or absent difference in glue.

Exclude generated output, lockfiles, dependencies, vendored package archives,
runtime data, and screenshots from hand-authored line totals, but name those
exclusions. Record the exact dependency versions and runtime requirements:
excluding a runtime from source counts does not eliminate its cost.

Report browser payload separately from source size. State which page loads each
asset, whether dependencies are included, and whether gzip is a measured
compression size or actually used by the server. Zero JavaScript on one page
does not imply a JavaScript-free application.

## Interpret the result

Line counts measure source shape, not correctness, maintainability, execution
speed, or developer time. Formatting, helper granularity, and template style
affect them. One application is evidence about that application, not proof that
Brevity is always smaller or easier.

A fair outcome might be modest savings, parity, or more code in Brevity. Publish
that result. An awkward API discovered while building a second app is useful
evidence even when the comparison does not favor Brevity.

Useful follow-up evidence includes:

- Add the same field and behavior to both implementations and record the changed
  surfaces, including validation, templates, persistence, and tests.
- Have a developer unfamiliar with Brevity follow the guide and add a feature;
  record blockers without inventing an onboarding-time claim.
- Identify repeated general web glue across independent applications before
  proposing another helper. Keep their business rules application-owned.

## RSVP prototype audit

A read-only audit on October 9, 2026 counted the isolated invitation prototype
after core/web integration and the Svelte conditional editor. These are snapshot
observations, not an equivalent-framework comparison or an onboarding study.
Physical lines use line splitting; nonblank lines exclude blank lines but include
comments. Categories are at file level and include mixed responsibilities.

| File group | Physical lines | Nonblank lines | Source bytes |
|---|---:|---:|---:|
| Server domain/schema/repository | 290 | 277 | 15,871 |
| HTTP glue and mixed controllers | 216 | 212 | 12,423 |
| Templates and CSS | 178 | 172 | 29,475 |
| Native browser code, Svelte component, and mount | 347 | 343 | 17,263 |
| Configuration | 85 | 84 | 2,214 |
| **Application and configuration** | **1,116** | **1,088** | **77,246** |
| Tests, separately | 737 | 705 | 41,714 |

Lockfiles, compiled output, installed dependencies, vendored package archives, and
session screenshots/browser scripts were excluded from authored totals. The
prototype README was also counted separately: 105 physical / 68 nonblank lines.
For perspective, its CSS occupies 6,377 bytes on only eight physical lines.
Short files do not imply little UI code.

The audit found public core/web imports, no custom stream-buffer/parser replay,
and no custom escaping implementation. Request token policy, strict field limits,
conditional visibility, and historical form versions remain application code.
The controllers mix transport and domain orchestration, so the HTTP group is
not a pure measure of framework overhead.

Potential simplifications are finishing fragment-based template composition,
reducing repeated accessible field/error markup, and replacing a test-only
unbound-server adapter with the existing `app.listen(0)` API. A reusable
enhanced-form transport helper requires evidence from another application first.
None of these findings justifies moving RSVP rules into core.

## Second application: support inbox

The repository now includes two runnable implementations of one acceptance
contract in `examples/support-inbox`: Brevity core/web and Express 5.1.0.
Both create and validate support requests, retain invalid input, persist to a
local JSON store, show details, search/filter/paginate the inbox, and update
request status. Both use ordinary forms and the same optional character counter.

| Comparable authored source | Brevity | Express |
|---|---:|---:|
| HTTP adapter and templates, nonblank lines | 117 | 150 |
| Runnable app, nonblank lines | 309 | 342 |
| Runnable app, source bytes | 17,271 | 19,593 |
| Including common build configuration, nonblank lines | 359 | 392 |

Each app total includes the shared validation, repository, runtime configuration,
CSS, and browser code once. The measured difference is 33 nonblank lines and
2,322 source bytes: about 10% of the runnable source in this particular example,
not a large reduction in all application work. The Brevity page HTML is slightly
larger because of its generated field IDs. Both implementations serve the same
322-byte native browser script; neither requires a browser framework.

Core/web have two direct production package entries and no additional runtime
package dependencies. Express's measured production graph has 42 distinct
name/version pairs. Those counts are dependency observations, not a security,
startup-time, loaded-code, or performance score.

The repeatable report and all counting/fixture rules are in
`examples/support-inbox/RESULTS.md`; run instructions and limitations are in its
`README.md`. From that directory, after package build/install:

```sh
npm run typecheck
npm run build
npm test
npm run smoke
node scripts/measure.mjs | cmp - measurements.json
```

The last command checks the committed report against the actual installed
libraries, source inventory, and served HTTP fixture payloads. Different Node,
framework, or dependency versions can legitimately change the report. Both
implementations passed the shared contract and compiled-process restart smoke,
and the report was reproduced after integration into the framework branch.

The concrete reduction comes from escaped fragment composition, accessible
field/error feedback, and exact asset handling. Domain input rules and
persistence remain shared application code. Expected domain errors still need
mapping to core `HttpError`, and HEAD page routes are explicitly registered.
This is evidence of modest glue reduction, not proof of faster development.

The local inbox is unauthenticated and loopback-only; its JSON store coordinates
one process/repository instance, not a production database. No new framework
features were added to make the comparison favorable.

## Current boundaries

`@brevity/core` and `@brevity/web` have no runtime package dependencies. They still
use Node's runtime, and optional browser components still use their own compiler
and runtime. Core handles bounded object-JSON/form parsing and request-local
bindings; the web layer provides escaped fragments, form feedback, exact asset
maps, and safe JSON state serialization.

The application owns validation policy, CSRF/access control, persistence, and
frontend compilation. Escaping is not URL validation or authorization. Read the
[web guide](./web.md) and [core API](../api/core.md) for the precise contracts.
Neither a local prototype nor a passing test suite establishes production
readiness.
