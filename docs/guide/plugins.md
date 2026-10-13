# Plugins

Brevity treats plugins as **enhanced service providers**. Core stays tiny; optional features live in plugins.

## What stays in core

- Router
- Request / Response
- Container
- ServiceProvider
- Middleware pipeline
- Error boundary

## What becomes a plugin

- Cache
- Viewer / templating
- Debug tools
- Validation helpers

Auth/session policy, durable logging/metrics, and rate limiting are application
integrations, not existing built-in plugins. Start with the
[Supabase recipe](/recipes/supabase) for identity wiring.

## Built-in plugins

```ts
import { createApp } from "@brevity/core";
import { CachePlugin } from "@brevity/plugin-cache";
import { ViewerPlugin } from "@brevity/plugin-viewer";
import { DebugPlugin } from "@brevity/plugin-debug";
import { ValidationPlugin } from "@brevity/plugin-validation";

const app = createApp({
  plugins: [
    new CachePlugin({ defaultTtl: 120 }),
    new ViewerPlugin({ baseDir: "./examples/views" }),
    new DebugPlugin({ enabled: process.env.NODE_ENV !== "production" }),
    new ValidationPlugin(),
  ],
});
```

### CachePlugin

Registers a `cache` binding.

```ts
app.usePlugin(new CachePlugin({ defaultTtl: 60 }));
const cache = app.container.get("cache");
```

### ViewerPlugin

Registers a `viewer` binding.

```ts
app.usePlugin(new ViewerPlugin({ baseDir: "./views" }));
const viewer = app.container.get("viewer");
```

### DebugPlugin

Registers a `debug` binding with auto-dev mode defaults.
This enables the service's logging, not automatic request logging or diagnostic
routes. [Wire and gate those explicitly](./debugging.md).

```ts
app.usePlugin(new DebugPlugin());
const debug = app.container.get("debug");
```

### ValidationPlugin

Registers a shared `validator` binding.

```ts
app.usePlugin(new ValidationPlugin());
const validator = app.container.get("validator");
```

## App-level plugins

You can also add plugins later:

```ts
app.usePlugin(new CachePlugin());
app.usePlugins([new DebugPlugin({ verbose: true })]);
```

If the container has already booted, late-registered plugins boot immediately.

## Writing your own plugin

```ts
import { Plugin, type Container } from "@brevity/core";

export class MetricsPlugin extends Plugin {
  readonly name = "metrics";

  register(container: Container): void {
    container.singleton("metrics", () => new MetricsService());
  }

  boot(container: Container): void {
    container.get("metrics").start();
  }
}
```

## Rules of thumb

1. Keep the plugin small and focused.
2. Register services in the container.
3. Avoid hidden global state.
4. Make everything optional.
5. Let core stay framework-neutral.
