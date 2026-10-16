# Quick Start

## Option 1: Try HTML-first pages in this repository

The web example uses the public `@brevity/core` and optional `@brevity/web` APIs:

```bash
npm ci
npm run build
node --import tsx examples/web-app.ts
```

Open `http://127.0.0.1:3000/contact`. Submit an empty name to see accessible form
errors, or a valid name for a redirect to the confirmation page. This is a small
rendering example, not a persistent or authenticated application.

Read the [optional web guide](docs/guide/web.md) for the complete page/form flow.
Core does not require web helpers or a frontend runtime. React, Svelte, Vue, or
other browser applications can use the same HTTP backend independently.

For persistence, request details, search, pagination, and status updates, run the
[support inbox example](examples/support-inbox/README.md). It includes an
equivalent Express implementation and reproducible measurements. Both are
loopback-only demos without authenticated administration.

## Option 2: Use the Existing Starter Template

The **starter/** folder is a minimal, copy-paste template for new projects.
The registry packages are not yet verified as published. Until publication, use
repository examples above or build and install local tarballs:

```sh
# From the framework checkout; creates archives but does not publish.
npm ci
npm run publish:dry-run
# Copy the starter into a new empty directory, then install the exact archives.
cp -r starter ../my-brevity-app
cd ../my-brevity-app
npm install ../brevity/brevity-core-0.1.0.tgz ../brevity/brevity-plugin-cache-0.1.0.tgz ../brevity/brevity-plugin-debug-0.1.0.tgz ../brevity/brevity-plugin-viewer-0.1.0.tgz ../brevity/brevity-plugin-validation-0.1.0.tgz
npm run dev
```

The example paths assume the checkout is named `brevity`; adjust that path to your
checkout name. Install all five starter dependencies together so npm does not
try to resolve an unpublished internal dependency from the registry. The automated
`npm run test:release` performs this isolated-consumer rehearsal in a temporary
directory and removes it afterward. Keep generated tarballs out of commits.

After registry publication, the normal starter flow is:

```bash
# Copy the starter to your project
cp -r starter ~/my-app
cd ~/my-app

# Install and run
npm install
npm run dev
```

Then edit:

- `src/index.ts` — Add routes and handlers
- `views/index.html` — Customize the home page

That's it! Read the [starter README](starter/README.md) for usage patterns.

---

## Option 3: Manual API Setup

After registry publication, create a new TypeScript project:

```bash
mkdir my-app
cd my-app
npm init -y
npm install @brevity/core
npm install -D typescript tsx @types/node
```

Create `tsconfig.json`:

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "lib": ["ES2022"],
    "strict": true,
    "outDir": "dist"
  }
}
```

Create `src/index.ts`:

```typescript
import { createApp } from "@brevity/core";

const app = createApp();

app.router.get("/", (_req, res) => {
  res.send("<h1>Hello Brevity!</h1>");
});

app.listen(3000);
console.log("Running: http://127.0.0.1:3000");
```

Run:

```bash
npx tsx src/index.ts
```

---

## Learning Resources

- [Starter Template](starter/README.md) — Copy-paste app template
- [Example Apps](examples/) — Repository examples, not production templates
- [Architecture Guide](docs/guide/architecture.md)
- [Plugin System](docs/guide/plugins.md)
- [API Reference](docs/api/core.md)

---

## Comparison with Other Frameworks

We do not publish estimated setup times or unqualified bundle-size comparisons.
The useful question is how much code a complete equivalent feature needs,
including its templates, validation, persistence, and browser enhancements.
See [Evaluating Brevity](docs/guide/evaluating.md) for the measurement contract.

Repository examples exercise the current source. Registry installations use the
published version and do not automatically include unreleased branch changes.
