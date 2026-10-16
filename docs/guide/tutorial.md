# Build a notebook

Let's build a small app that saves notes. It uses HTML forms and SQLite, so it
works without browser JavaScript.

You'll keep routes, templates, and data access in separate files. The finished
source is in `docs/samples/tutorial/`.

## 1. Set up

From a checkout of Brevity, using Node 22 or 24:

```sh
npm ci
npm run build:packages
```

The dependencies are already installed: Brevity's optional web and views packages,
Drizzle, and the libSQL SQLite client. This is a local learning app without accounts;
don't expose it as a public notes service.

::: details TypeScript settings for a separate app
<<< @/samples/tsconfig.json

Adjust `include` and `exclude` to your files. For local package installation,
see [Quick Start](https://github.com/PortableSheep/brevity/blob/main/QUICK_START.md).
:::

## 2. Start with a route

<<< @/samples/first-route.ts

The handler sends a JSON response. A separate entry point starts the server:

<<< @/samples/first-route-start.ts

```sh
node --import tsx docs/samples/first-route-start.ts
```

Visit **http://127.0.0.1:3000**. Stop this process before starting the notebook.

## 3. Build the native form

First, configure the HTML renderer. We'll use [Eta file views](./views) with a
shared layout:

<<< @/samples/tutorial/page.ts

The layout wraps every page:

<<< @/samples/tutorial/views/layout.html

The notes page includes the form and lists saved notes:

<<< @/samples/tutorial/views/notes.html

The form uses `createFormState` to connect labels and errors to each field,
and to keep the user's input after a validation error:

<<< @/samples/tutorial/views/form.html

`<%= ... %>` escapes text. Partials and form-feedback fragments keep their HTML.
Don't mark user-entered note text as trusted markup. The `enhancement` slot stays
empty for now; later, you can [add a Svelte counter](/recipes/svelte).

## 4. Add persistence

Use Drizzle to define a table and open a local SQLite file:

<<< @/samples/tutorial/store.ts

The repository exposes `list()`, `add()`, and `close()`. Routes don't need to know
which database implements them. `add()` runs in a transaction; a thrown error
rolls it back.

This first schema uses `CREATE TABLE IF NOT EXISTS`. It won't update an existing
table: use versioned migrations when your schema changes.

## 5. Wire GET, POST, errors, and redirect

<<< @/samples/tutorial/app.ts

The GET shows notes. The POST checks the input, saves a valid note, and redirects
with **303** so refreshing the page doesn't submit it again. Invalid input returns
**422** with the original value and an error message.

The app limits request bodies to 4 KiB. It also rejects duplicate fields and
cross-origin submissions.

::: warning Before deploying this example
Its Origin check is for local HTTP. A public app needs a configured HTTPS origin,
trusted proxy settings, and access control. The [Supabase recipe](/recipes/supabase)
shows a fixed-origin setup.
:::

## 6. Own the server lifecycle

Open the database, start the app, and close the database when the server stops:

<<< @/samples/tutorial/start.ts

```sh
npm run docs:app
```

Open **http://127.0.0.1:3000**. Try an empty note to see the error feedback. Save a
note, restart the app, and check that it's still there in `notebook.db`.
For a deployed service, add a [shutdown deadline](/recipes/operations).

## 7. Test through HTTP, not a private adapter

Use `listen(0)` to let the OS choose a free port for each test:

<<< @/samples/testing.ts

The [notebook tests](https://github.com/PortableSheep/brevity/blob/main/docs/samples/sample.test.ts)
check validation, escaping, redirects, and persistence after reopening the database.
Run them with:

```sh
npm run docs:check
```

For browser tests with JavaScript on and off, use the [Playwright recipe](/recipes/playwright).

## Make it yours

Try adding a timestamp to each note. You'll change the schema, add a migration,
render the timestamp, and update a test. Then choose [Prisma](/recipes/prisma)
for a different database layer, [Supabase](/recipes/supabase) for sign-in, or
[Svelte](/recipes/svelte) for a small browser enhancement.
