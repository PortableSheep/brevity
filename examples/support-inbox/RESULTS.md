# Measured support-inbox comparison

This is a historical snapshot from before the npm scope migration. Its package
names and byte counts describe that snapshot; current packages use
`@portablesheep/brevity` and `@portablesheep/brevity-web`. Re-run the measurement
script for current source rather than editing recorded observations.

Recorded from public core/web revision
`6ea67baf511b97a0f780f2d1b71c741920b54efe`, Node `v22.21.1`, and the example's
committed npm lockfile. These are actual measurements of this implementation,
not estimates of development time or production performance.

From this directory, after the README's package build/install steps:

```sh
npm run build
node scripts/measure.mjs > /tmp/brevity-inbox-current.json
node scripts/measure.mjs | cmp - /tmp/brevity-inbox-current.json
```

The second command checks repeatability. The script uses fixed fictional
repository/token fixtures for served HTML, starts each compiled implementation
on an ephemeral loopback port, reads actual HTTP responses, then closes servers
and removes its exact temporary fixture directory. It reports installed versions
and JS hashes, framework revision, lock hash, each source file, and categories.
Reproduction requires the same framework checkout/installed lock/Node environment;
changed source or dependencies should produce changed output.

## Application-owned code

| Category                                               | Physical lines | Nonblank lines | UTF-8 bytes |
| ------------------------------------------------------ | -------------: | -------------: | ----------: |
| Brevity HTTP + templates                               |            120 |            117 |       7,706 |
| Express HTTP + templates                               |            153 |            150 |      10,028 |
| Shared validation + JSON repository                    |            147 |            137 |       6,479 |
| Shared CSS + native browser JS                         |             31 |             31 |       1,800 |
| Shared runtime configuration/token check               |             25 |             24 |       1,286 |
| **Brevity runnable total**                             |        **323** |        **309** |  **17,271** |
| **Express runnable total**                             |        **356** |        **342** |  **19,593** |
| Common build/package configuration, separate           |             50 |             50 |       1,204 |
| Brevity runnable + common build configuration          |            373 |            359 |      18,475 |
| Express runnable + common build configuration          |            406 |            392 |      20,797 |
| Shared acceptance/domain/browser tests, separate       |            302 |            291 |      17,463 |
| Measurement + compiled-process smoke tooling, separate |            232 |            229 |      12,287 |

Each runnable total includes its own route/template modules and the three shared
runtime categories **once**. Neither shared business logic nor shared assets are
duplicated to inflate a baseline. The example's package/TypeScript/npm/ignore
configuration is also reported, not concealed; the root checkout integration is
one changed `tsconfig.json` exclusion line, outside these standalone app totals.

Physical lines count newline-delimited source lines, ignoring a final empty
split caused by a trailing newline. Nonblank lines exclude only whitespace-only
lines; comments/imports/template literals/CSS are counted. Bytes are UTF-8 file
bytes. The script explicitly classifies every file in `src`, `public`, `test`,
and `scripts` and fails on added/unclassified files. Documentation, this report,
the generated JSON report, lockfiles, emitted `dist`, installed dependencies,
and unrelated repository files are excluded from application-source counts.
The lock's byte size and SHA-256 appear separately in the JSON report.

The result is **33 fewer physical/nonblank lines and 2,322 fewer source bytes**
for the Brevity runnable app in this particular comparison. Most of the app's
work remains domain, persistence, templates, configuration, and browser code,
not route declarations. Both implementations use compact multi-line templates
and some multi-statement lines; source formatting can change line counts without
changing behavior. Bytes help expose that limitation but are not a productivity
measurement either.

## Framework/library code and dependencies

| Installed production graph | Direct dependencies                                            | Additional unique name/version pairs | Total unique pairs |
| -------------------------- | -------------------------------------------------------------- | -----------------------------------: | -----------------: |
| Brevity                    | `@brevity/core@0.1.0`, `@brevity/web@0.1.0` from this checkout |                                    0 |                  2 |
| Express                    | `express@5.1.0`                                                |                                   41 |                 42 |

`@brevity/web`'s core peer is counted once, not as a third package. Two versions
of one package name count as two pairs. Exact transitive versions, including
Express's body parser/router/static dependencies, are listed in
`measurements.json`; both apps coexist in one isolated comparison manifest, but
each production graph is traversed separately. There are no optional application
plugins or template-engine packages. Development-only direct pins are
`typescript@5.9.2`, `tsx@4.20.3`, `@types/node@22.17.0`, and
`@types/express@5.0.3`; the lock captures their resolved tool dependencies.

| Library code, not application code              | Physical lines | Nonblank lines |   Bytes |
| ----------------------------------------------- | -------------: | -------------: | ------: |
| Installed core/web shipped JS                   |            768 |            768 |  28,703 |
| Installed Express + production graph shipped JS |         24,111 |         20,405 | 751,807 |
| Core TypeScript source, separate                |            693 |            614 |  24,053 |
| Web TypeScript source, separate                 |            217 |            195 |   8,391 |

Installed library totals recursively count shipped `.js`/`.cjs`/`.mjs` files
once per production name/version pair, excluding nested `node_modules` before
walking dependencies. They include unused public APIs and any shipped JS test
or utility files; they exclude JSON data, typings, source maps, docs, and native
files. Therefore these are **not total install size, loaded/executed code,
startup memory, download size, a security score, or a speed benchmark**.
Compiled Brevity JS and published Express JS also use different formatting.
Library code is intentionally separate from the application-owned totals rather
than pretending that framework work vanished.

## Browser payloads

No frontend build/minification or runtime dependency is required. These source
assets are the production assets served by both compiled apps:

| Shared asset      | Raw bytes | Gzip level 9 bytes |
| ----------------- | --------: | -----------------: |
| CSS               |     1,478 |                686 |
| Native counter JS |       322 |                227 |
| **Both assets**   | **1,800** |            **913** |

| Actual served HTML / initial page      | Brevity raw / gzip bytes | Express raw / gzip bytes |
| -------------------------------------- | -----------------------: | -----------------------: |
| Empty create form                      |              1,729 / 739 |              1,591 / 699 |
| Inbox with one fixed fictional request |              1,084 / 578 |              1,084 / 578 |
| Detail for that request                |              1,218 / 681 |              1,182 / 662 |
| First form + both assets               |            3,529 / 1,652 |            3,391 / 1,612 |

Each gzip value is computed independently with Node zlib level 9 and summed
where appropriate. **Neither server enables HTTP compression**; the script and
acceptance tests check that `Content-Encoding` is absent. Header/TLS overhead,
cache behavior, arbitrary data sizes, alternate error pages, and browser
execution costs are not measured. The fixed high-entropy 64-character token,
UUID, timestamp, and fictional text make the fixture reproducible, not a sample
of production traffic. Brevity's generated deterministic field IDs make this
form's HTML slightly larger despite its smaller application source.

## Verification and limits

The identical acceptance contract passed against both implementations: 18 total
Node tests, including the two parent contracts, their seven subtests each, and
shared repository/browser tests. Example typecheck/build and compiled-process
HTTP smoke/restart passed. Root typecheck and 31 public core HTTP/web tests also
passed after adding the standalone example exclusion.

This shows a second complete vertical feature with runtime validation, accessible
retained errors, native create/update forms, durable restart behavior, inbox
search/filter/pagination, and progressive JS. It does **not** claim equivalence
to the differently scoped RSVP app, faster development, better architecture in
general, production readiness, authenticated administration, crash-proof storage,
visual/accessibility certification, or performance superiority. Different
templates, repository adapters, Express factoring, or formatting could change
these measurements. The single-instance JSON store and unauthenticated loopback
demo boundaries are documented in the README.
