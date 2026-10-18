# Plugins

A plugin registers services in the app's container. Use the built-in ones you
need, or write a small provider for your own integration.

## Add a plugin

```ts
import { createApp } from "@portablesheep/brevity";
import { CachePlugin, CacheManager } from "@portablesheep/brevity-plugin-cache";

const app = createApp({
  plugins: [new CachePlugin({ defaultTtl: 120 })],
});
const cache = app.container.get<CacheManager>("cache");

cache.put("greeting", "Hello!");
```

You can also call `app.usePlugin(instance)` or `app.usePlugins([instances])`
after creating the app.

## Built-in plugins

| Package                                    | What it registers                            |
| ------------------------------------------ | -------------------------------------------- |
| `@portablesheep/brevity-plugin-cache`      | A process-local cache, under `cache`         |
| `@portablesheep/brevity-plugin-validation` | Core's rule validator, under `validator`     |
| `@portablesheep/brevity-plugin-viewer`     | The simple file interpolator, under `viewer` |
| `@portablesheep/brevity-plugin-debug`      | Development diagnostics, under `debug`       |

For layouts and partials, use [HTML views](./views). For sign-in, start with the
[Supabase recipe](/recipes/supabase). There's no built-in durable session or
rate-limit plugin.

## Write a plugin

Extend `Plugin` and register a service. For example, expose an app-owned logger:

```ts
import { Plugin, type Container } from "@portablesheep/brevity";

type Logger = { info(message: string): void };

class LoggerPlugin extends Plugin {
  readonly name = "logger";

  constructor(private readonly logger: Logger) {
    super();
  }

  register(container: Container): void {
    container.instance("logger", this.logger);
  }
}
```

`register()` sets up bindings. An optional `boot()` hook runs once before the
first request; plugins registered after boot are booted immediately. Both hooks
are synchronous, so initialize async resources before listening.

Keep request-specific state out of reused services. See the
[plugin reference](/api/plugins) for options and [container reference](/api/core#container-and-providers)
for binding lifetimes.
