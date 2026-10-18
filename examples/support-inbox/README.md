# Support inbox: a second complete app

Two implementations of the same small, server-rendered support inbox: public
`@portablesheep/brevity` + `@portablesheep/brevity-web`, and Express 5 with ordinary escaped templates.
No RSVP code, private framework imports, frontend compiler, external database,
real email delivery, or authentication service.

This is a **local demonstration, not an authenticated admin product**. Use
fictional information only. Both servers bind to `127.0.0.1`, including when called
programmatically. Do not proxy them onto a public network. The inbox, request
details, and status controls deliberately have no login.

## Run either implementation

Node 20+ and npm are required. Start from this repository's checkout of the
framework source, not the registry (these packages aren't published yet):

```sh
# Repository root: compile the public packages from this checkout.
npm ci
npm run build --workspace @portablesheep/brevity
npm run build --workspace @portablesheep/brevity-web

cd examples/support-inbox
npm ci
npm run build
npm run start:brevity
# http://127.0.0.1:3000/requests/new
```

Stop with Ctrl-C, then run the equivalent implementation:

```sh
npm run start:express
```

Both default to the same app-local `data/requests.json`, so switching servers
preserves the demo requests. **Do not run two processes against that file.**
To run both at once, give each its own absolute storage path and port:

```sh
PORT=3001 SUPPORT_DATA="$PWD/data/express.json" npm run start:express
```

`SUPPORT_DATA` must be an absolute filesystem path. A missing parent directory is
created; a missing file initializes an empty repository. Corrupt JSON, invalid
stored records, unreadable files, directories in place of files, and failed
writes are errors, not empty-success fallbacks. `.npmrc` makes the example's
`file:` dependencies packaged copies, not symlinks; its own lockfile records
Express and its resolved dependencies. Rebuild the public packages and reinstall
the example after changing framework code.

## Smallest complete developer flow

Open **Ask for help**, fill all four fields, submit, and inspect the redirected
request. Open **Demo inbox**, search or filter, follow pagination when there are
more than five results, inspect a request, and submit its status form. Stop and
restart the app; the requests and statuses remain. With JavaScript disabled,
every operation still works. With JavaScript enabled, the details character
counter initializes and updates; it never intercepts form submission.

The two route adapters own their request/response and rendering glue. Their
templates are independent: Brevity uses `html`, `renderPage`, `createFormState`,
and `staticAssets`; Express uses plain escaped strings and `sendFile`. Express
does not import Brevity or its web helpers. Both import only the shared
framework-independent business/repository module, runtime configuration/token
check, and identical CSS/browser script. A templating engine or different Express
architecture could change these counts; this is one reasonable implementation,
not a minimal-code contest.

Changing an existing field's label or length limit starts in `src/domain.ts`;
both templates iterate the shared fields, labels, and limits. Adding a required
field also requires updating `Values`/initial values, persisted-record schema,
fixtures and acceptance assertions, and deciding how to display it on the detail
page in each view module. There is no schema/form generator that hides that work.

## One acceptance contract

`test/acceptance.test.ts` executes the same assertion body against each real
loopback HTTP server. It does not compare controller snippets or require
byte-identical HTML.

| Surface                     | Contract                                                                                                                                                                                                                       |
| --------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `GET/HEAD /requests/new`    | Required labeled name/email/subject/details controls; HTML, nosniff, CSP, no-store; native POST form and token                                                                                                                 |
| `POST /requests`            | Required string fields, non-whitespace content, simple email shape, limits 80/254/120/2000 UTF-16 code units; invalid shape/length gives retained, escaped, accessible 422 errors; exact maximum lengths accepted              |
| Successful creation         | 303 to `/requests/:id`; persisted detail page escapes user text; generated UUID, creation time, initial `open` status                                                                                                          |
| `GET/HEAD /inbox`           | Case-insensitive substring search across all four fields, exact open/closed filter, five results per page, newest insertion first; native GET form and previous/next links                                                     |
| Query handling              | Search at most 120 characters; invalid status/page gives 400; positive out-of-range pages clamp to the last page                                                                                                               |
| `GET/HEAD /requests/:id`    | Inspect fields and status; native status form; nonexistent ID gives 404                                                                                                                                                        |
| `POST /requests/:id/status` | Same token requirement; only `open`/`closed`, invalid status gives accessible 422 with current selection, successful update gives 303 to detail                                                                                |
| Bodies/tokens               | URL-encoded and JSON object inputs; absent/incorrect tokens 403; invalid JSON, non-object JSON, invalid form escapes or UTF-8 400; unsupported nonempty body types/encodings 415; declared and chunked bodies above 16 KiB 413 |
| Assets                      | Exact `/assets/app.css` and `/assets/app.js` allowlist; GET/HEAD, MIME/length/nosniff/no-cache, no HTTP compression; other methods 405 with `Allow: GET, HEAD`; encoded/dot-segment asset aliases do not expose files          |
| Missing routes/methods      | 404, with case-sensitive and strict trailing-slash page paths; HEAD supported for the GET pages, not an additional application action                                                                                          |
| Persistence/failure         | Restart retains records/status; concurrent writes on one repository serialize without lost updates; failed replacement gives logged 500, no redirect/phantom record, and a later write can retry                               |

Only the declared business fields are retained. Extra input fields are ignored;
duplicate URL-encoded fields and query keys use the last value. Whitespace is
retained rather than silently trimmed. The email check is intentionally modest,
not full RFC validation or verification. Status errors preserve the persisted
valid selection rather than echoing an arbitrary invalid option.

```sh
# From this example directory:
npm run typecheck
npm run build
npm test
npm run smoke
npm run measure
# Machine-readable report only:
node scripts/measure.mjs > measurements.json
```

The suite includes repository corruption/path/isolation/retry checks and a small
VM test of the browser counter. `smoke` launches each **compiled CLI in a separate
process**, creates a request over HTTP, checks detail/static responses, then
restarts the process and checks persistence. Tests, smoke, and measurement own
temporary fixture directories and close all their servers; no preview is left
running. Deliberate filesystem-failure tests print expected server error logs.
These are HTTP/DOM-markup assertions and a script unit test, **not** a full
browser accessibility audit or automated visual review.

## Persistence and safety boundaries

`src/domain.ts` uses one in-memory repository snapshot, a per-instance mutation
queue, and complete JSON replacement through a uniquely named same-directory
temporary file, file sync, and atomic rename. Memory changes only after the write
commits; failures propagate, temporary files are cleaned, and the next queued
operation can retry. Records and returned snapshots are copied to prevent callers
mutating internal state.

This is **single-process, single-repository-instance** coordination. There is no
cross-process lock, external-change detection, multi-instance merge, transaction
database, directory fsync/power-loss durability guarantee, or scalability claim.
Reads during a pending write see the last committed snapshot. Each mutation
rewrites the entire file, so this is suitable only for this small local demo.
Do not run both adapters against one file simultaneously. Startup validates the
stored schema; adding a field requires an explicit migration or a new demo file.

A cryptographically random token is generated per app start, retained in hidden
form controls, and checked on both writes. Old forms fail after restart and must
be reloaded. This protects against cross-origin form submissions; it is **not
authorization**, and anyone able to read the local form can write. Body bounds,
quoted/text interpolation escaping, CSP, fixed asset paths, and non-disclosing
500 pages do not turn the demo into a production deployment. No real secrets or
production data are shipped.

## Measurements and public API observations

See [RESULTS.md](RESULTS.md) and [measurements.json](measurements.json) for actual
counts and their limits. All application/template/browser/runtime configuration
code is counted once per runnable implementation; the shared business code is
never duplicated to inflate Express. Tests, build configuration, measurement
tooling, and framework library code are reported separately.

Public web composition removed application-owned escaping, field-error lists,
error-summary links, invalid/described-by assembly, and static-file handling from
the Brevity adapter. Rendering actual input/select/textarea markup and selecting
valid options still belongs to the application. `createFormState` intentionally
does not parse or validate domain inputs.

Two small public-core boundary costs remain visible in `src/brevity.ts`: mapping
framework-independent `InputError` into `HttpError` so expected errors do not get
logged as internal failures, and registering GET handlers for HEAD explicitly.
Express supplies implicit HEAD support. The sample handles these locally and
does not modify or extend the framework to improve the comparison.
