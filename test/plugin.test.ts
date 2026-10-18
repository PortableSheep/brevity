import test from "node:test";
import assert from "node:assert/strict";
import { join } from "node:path";
import { createApp, Plugin, type Container } from "@portablesheep/brevity";
import { CachePlugin } from "@portablesheep/brevity-plugin-cache";
import { ViewerPlugin } from "@portablesheep/brevity-plugin-viewer";
import { DebugPlugin } from "@portablesheep/brevity-plugin-debug";
import { ValidationPlugin } from "@portablesheep/brevity-plugin-validation";

test("app registers plugins and exposes bindings", () => {
  const app = createApp({
    plugins: [
      new CachePlugin({ defaultTtl: 10 }),
      new ViewerPlugin({ baseDir: join(process.cwd(), "examples/views") }),
      new DebugPlugin({ enabled: true }),
      new ValidationPlugin(),
    ],
  });

  assert.equal(app.plugins.length, 4);
  assert.equal(app.container.has("cache"), true);
  assert.equal(app.container.has("viewer"), true);
  assert.equal(app.container.has("debug"), true);
  assert.equal(app.container.has("validator"), true);
});

test("late plugin registration boots immediately after container boot", () => {
  class BootPlugin extends Plugin {
    readonly name = "boot";

    register(container: Container): void {
      container.instance("boot-registered", true);
    }

    boot(container: Container): void {
      container.instance("booted", true);
    }
  }

  const app = createApp();
  app.container.bootProviders();
  app.usePlugin(new BootPlugin());

  assert.equal(app.container.get("boot-registered"), true);
  assert.equal(app.container.get("booted"), true);
});
