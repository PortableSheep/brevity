# Brevity Node (TypeScript)

[Documentation](https://portablesheep.github.io/brevity/) ·
[CI](https://github.com/PortableSheep/brevity/actions/workflows/docs.yml)

A small TypeScript backend for APIs and server-rendered pages. Start with ordinary
HTTP routes and forms; add browser components only where they help.

Core handles HTTP, middleware, and explicit dependency wiring. The optional
`@brevity/views` package renders HTML files with Eta layouts/partials.
`@brevity/web` supplies escaped fragments, form feedback, assets, and safe JSON;
`@brevity/islands` adds opt-in native browser mounts and enhanced forms.
Frontend compilation and business rules stay application-owned.

## 🚀 Getting Started

**Try the existing starter:**

```bash
cp -r starter ~/my-app
cd ~/my-app
npm install
npm run dev
```

Visit **http://127.0.0.1:3000**, then:

- Edit `src/index.ts` to add routes
- Edit `views/index.html` to customize the UI
- Run `npm run build && npm start` for production

👉 **[Full Quick Start Guide →](QUICK_START.md)**

## 📦 Packages

The framework is split into publishable packages:

| Package                        | Purpose                                                              |
| ------------------------------ | -------------------------------------------------------------------- |
| **@brevity/core**              | Router, DI container, request/response                               |
| **@brevity/web**               | Optional escaped fragments, accessible forms, explicit static assets |
| **@brevity/views**             | Optional file views with Eta 3.5.0, layouts, partials and caching    |
| **@brevity/islands**           | Optional lazy native components and enhanced forms                   |
| **@brevity/islands-svelte**    | Separate optional Svelte 5 mount adapter                             |
| **@brevity/plugin-cache**      | Memory & no-op caching adapters                                      |
| **@brevity/plugin-debug**      | Dev-mode error pages & logs                                          |
| **@brevity/plugin-viewer**     | Template rendering                                                   |
| **@brevity/plugin-validation** | Request validation                                                   |

Use what you need; leave the rest out.

## 🔨 Development

```bash
npm run dev          # Run example app
npm run build        # Build all packages + examples
npm test             # Run tests
npm run typecheck    # Type checking only
npm run test:release # Clean tarball installation and HTTP/import checks
npm run docs:dev     # VitePress dev server
npm run docs:build   # Build static docs
```

## 📚 Documentation

- **[Notebook Tutorial](docs/guide/tutorial.md)** — Native forms, retained errors, SQLite, and HTTP tests
- **[Integration Recipes](docs/recipes/index.md)** — Checked Drizzle, Prisma, Supabase PKCE, Svelte, and Playwright
- **[Getting Started](QUICK_START.md)** — Copy-paste your first app
- **[Architecture](docs/guide/architecture.md)** — How Brevity works
- **[Optional Web Layer](packages/web/README.md)** — Callback pages, forms, assets, and island data
- **[File Views](docs/guide/views.md)** — Escape-by-default HTML files, layouts, partials
- **[Native Islands](docs/guide/islands.md)** — Plain TypeScript enhancements and optional Svelte
- **[Plugin System](docs/guide/plugins.md)** — Build your own plugins
- **[API Reference](docs/api/core.md)** — Complete API docs
- **[Web API Reference](docs/api/web.md)** — Escaped fragments, forms, assets, and JSON state
- **[Debugging](docs/guide/debugging.md)** — Dev tooling
- **[Production Readiness](docs/guide/production-readiness.md)** — Evidence gates and GitHub Pages setup
- **[Operations](docs/recipes/operations.md)** — Checked health and shutdown recipe
- **[Deployment](docs/guide/deployment.md)** — Node services, host-owned handlers, and serverless integration boundaries
- **[HTTP Benchmarks](examples/benchmarks/README.md)** — Reproducible Brevity/Express/Fastify/Nest fixtures and limitations

Tutorial/recipe listings import executable files from `docs/samples/`.
`npm test` and `npm run typecheck` include `npm run docs:check` (TypeScript,
Prisma client generation, Svelte checks/build, and HTTP contracts).
`npm run docs:e2e` adds Chromium form tests after `npx playwright install chromium`.
The docs CI runs both plus `npm run docs:build`; integrations remain root dev
dependencies, never core/web runtime dependencies.

## ✨ Features

- **Minimal core** — HTTP routing, middleware, and explicit DI; web helpers stay optional
- **Typed routes** — Built-in route params: `{i:id}`, `{s:name}`, `{*:path}`
- **Plugin system** — Service-provider style, boot safely
- **TypeScript first** — Strict types, no `any` escapes
- **Optional decorators** — Controllers and routes via a separate, dependency-free entry point
- **Validation** — Simple, composable rules
- **Caching** — Memory adapter (Redis plugin planned)
- **Dev tooling** — Styled errors, request logs, debug dashboard
- **Bounded HTTP input** — Configurable body limits, controlled errors, isolated request bindings

## 🎯 Best For

- HTML-first pages and forms with targeted browser enhancements
- APIs for independently built frontends, not just React
- Small services and independently deployed backends
- Small Node services with explicit dependencies and optional web helpers

## 🤔 Not For

- Applications that require a batteries-included platform and established operational conventions
- When you need a mature middleware ecosystem (use Express)
- If you want database ORMs built-in (add them yourself, keep framework slim)
- A drop-in Angular, Nest, or Next.js replacement

Run a Node service with `app.listen()`, or export `app.handler` for a host that
accepts Node HTTP requests and responses without opening a port. Lambda requires
an HTTP adapter; Edge/Fetch runtimes are not supported. See [Deployment](docs/guide/deployment.md)
for platform requirements and the distinction between tested contracts and
verified hosted deployments.

## 📖 Example

```typescript
import { createApp } from "@brevity/core";
import { ViewerPlugin } from "@brevity/plugin-viewer";
import { ValidationPlugin } from "@brevity/plugin-validation";

const app = createApp({
  plugins: [new ViewerPlugin({ baseDir: "./views" }), new ValidationPlugin()],
});

// Simple GET
app.router.get("/", (_req, res) => {
  res.send("<h1>Hello!</h1>");
});

// With route params
app.router.get("/users/{i:id}", (req, res) => {
  const id = req.param("id");
  res.json({ id });
});

// With validation
app.router.post("/users", (req, res, container) => {
  const validator = container?.get("validator");
  const validation = validator?.validate(req.body, {
    email: "required|email",
    name: "required|min:2",
  });

  if (validation?.fails()) {
    return res.status(422).json({ errors: validation.errors() });
  }

  res.json({ success: true, user: validation?.validated() });
});

app.listen(3000);
```

### Optional controller decorators

Keep callback routes, or opt into standard TypeScript 5+ decorators:

```typescript
import { createApp, type Request, type Response } from "@brevity/core";
import { Controller, Get, registerControllers } from "@brevity/core/decorators";

@Controller("/users")
class UsersController {
  @Get("/{i:id}")
  show(req: Request, res: Response): void {
    res.json({ id: req.param("id") });
  }
}

const app = createApp();
registerControllers(app.router, new UsersController());
app.listen(3000);
```

No reflection library, automatic discovery, or dependency-injection decorators.
Construct controllers yourself and pass dependencies through their constructors.
The normal core entry point does not load decorator support.
Leave `experimentalDecorators` and `emitDecoratorMetadata` disabled.
See the [decorator API](docs/api/core.md#optional-controller-decorators) and
[constructor-injection example](examples/controllers.ts).

## 📊 Examples and benchmarks

The [support inbox](examples/support-inbox/README.md) demonstrates forms,
validation, persistence, and search, with an equivalent Express implementation.
[Comparisons and benchmarks](docs/guide/evaluating.md) document reproducible
measurements, workloads, and limitations rather than a universal framework ranking.

Brevity is an early-stage framework. Review the
[production checklist](docs/guide/production-readiness.md) before deployment.
Authentication policy, durable storage, and operational configuration remain
application responsibilities; examples are not turnkey production templates.

## 📝 License

MIT
