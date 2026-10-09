# Brevity Node (TypeScript)

A minimal, educational web framework for Node.js with TypeScript support, plugins, and an optional dependency injection container.

## 🚀 Getting Started

**Start a new project in ~30 seconds:**

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

| Package | Purpose |
|---------|---------|
| **@brevity/core** | Router, DI container, request/response |
| **@brevity/plugin-cache** | Memory & Redis caching adapters |
| **@brevity/plugin-debug** | Dev-mode error pages & logs |
| **@brevity/plugin-viewer** | Template rendering |
| **@brevity/plugin-validation** | Request validation |

Use what you need; leave the rest out.

## 🔨 Development

```bash
npm run dev          # Run example app
npm run build        # Build all packages + examples
npm test             # Run tests
npm run typecheck    # Type checking only
npm run docs:dev     # VitePress dev server
npm run docs:build   # Build static docs
```

## 📚 Documentation

- **[Getting Started](QUICK_START.md)** — Copy-paste your first app
- **[Architecture](docs/guide/architecture.md)** — How Brevity works
- **[Plugin System](docs/guide/plugins.md)** — Build your own plugins
- **[API Reference](docs/api/core.md)** — Complete API docs
- **[Debugging](docs/guide/debugging.md)** — Dev tooling

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

- Learning how web frameworks work
- Building microservices
- Hobby/personal projects
- Serverless functions (Lambda, Vercel)
- When you want opinionated defaults with minimal magic

## 🤔 Not For

- Large monoliths (use Nest.js or Express with advanced patterns)
- When you need a mature middleware ecosystem (use Express)
- If you want database ORMs built-in (add them yourself, keep framework slim)

## 📖 Example

```typescript
import { createApp } from "@brevity/core";
import { ViewerPlugin } from "@brevity/plugin-viewer";
import { ValidationPlugin } from "@brevity/plugin-validation";

const app = createApp({
  plugins: [
    new ViewerPlugin({ baseDir: "./views" }),
    new ValidationPlugin(),
  ],
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

## 📊 Comparison

| Feature | Brevity | Express | Fastify | Hono |
|---------|---------|---------|---------|------|
| TypeScript | ✅ | Partial | ✅ | ✅ |
| Plugin system | ✅ | Middleware | Middleware | Hooks |
| Learning curve | Minimal | Medium | Medium | Minimal |
| Production-ready | ⚠️ | ✅ | ✅ | ✅ |

Brevity is educational and great for small projects. For production apps at scale, consider Express or Fastify.

## 📝 License

MIT
