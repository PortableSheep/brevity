# Quick Start

## Option 1: Use the Starter Template (Recommended)

The **starter/** folder is a minimal, copy-paste template for new projects:

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

## Option 2: Manual Setup

Create a new TypeScript project:

```bash
mkdir my-app
cd my-app
npm init -y
npm install @brevity/core @brevity/plugin-cache @brevity/plugin-debug @brevity/plugin-viewer @brevity/plugin-validation
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
import { ViewerPlugin } from "@brevity/plugin-viewer";
import { DebugPlugin } from "@brevity/plugin-debug";

const app = createApp({
  plugins: [
    new ViewerPlugin({ baseDir: "./views" }),
    new DebugPlugin({ enabled: true }),
  ],
});

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
- [Full Example App](examples/) — Production patterns
- [Architecture Guide](docs/guide/architecture.md)
- [Plugin System](docs/guide/plugins.md)
- [API Reference](docs/api/core.md)

---

## Comparison with Other Frameworks

| Feature | Brevity | Express | Hono |
|---------|---------|---------|------|
| **Size** | ~2KB | ~50KB | ~17KB |
| **Setup Time** | ~2 min | ~2 min | ~2 min |
| **Plugin System** | ✅ | Middleware | Middleware |
| **TypeScript** | ✅ Built-in | Requires setup | ✅ Built-in |
| **Learning Curve** | Minimal | Medium | Minimal |

Brevity is **best for**:
- Learning web frameworks
- Hobby/personal projects
- Microservices
- When you want a minimal, opinionated starting point

**Start the starter and customize from there.** Happy building! 🚀
