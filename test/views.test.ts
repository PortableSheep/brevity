import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, mkdir, writeFile, symlink, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createViews, etaEngine, type ViewEngine } from "@brevity/views";
import { html } from "@brevity/web";
import { createApp } from "@brevity/core";
import { serve } from "../docs/samples/testing.js";

test("Eta views escape data, compose file partials/layouts, and expose trusted helpers", async (t) => {
  const root = await mkdtemp(join(tmpdir(), "brevity-views-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  await mkdir(join(root, "shared"));
  await writeFile(
    join(root, "page.html"),
    '<%= it.name %><%= await it.partial("shared/field") %><%= it.island() %>',
  );
  await writeFile(
    join(root, "shared/field.html"),
    '<% const form = it.createFormState({ values: { name: it.name } }); %><input value="<%= form.value("name") %>">',
  );
  await writeFile(join(root, "layout.html"), "<main><%= it.body %></main>");
  const views = createViews({
    root,
    layout: "layout",
    helpers: { island: () => html`<b>fallback</b>` },
  });
  assert.equal(
    String(await views.renderToString("page", { name: '<"&' })),
    '<main>&lt;&quot;&amp;<input value="&lt;&quot;&amp;"><b>fallback</b></main>',
  );
  assert.ok(
    !String(await views.renderToString("page", { name: "ok" }, { layout: false })).includes(
      "<main>",
    ),
  );
  const app = createApp();
  app.router.get("/", (_req, res) =>
    views.render(res, "page", { name: "<script>" }, { status: 422 }),
  );
  const origin = await serve(t, app);
  const response = await fetch(origin);
  assert.equal(response.status, 422);
  assert.equal(response.headers.get("content-type"), "text/html; charset=utf-8");
  assert.match(await response.text(), /&lt;script&gt;/);
});

test("view resolution rejects traversal, absolute paths, aliases, and escaping symlinks", async (t) => {
  const dir = await mkdtemp(join(tmpdir(), "brevity-views-path-"));
  t.after(() => rm(dir, { recursive: true, force: true }));
  const root = join(dir, "views");
  await mkdir(root);
  await writeFile(join(dir, "secret.html"), "secret");
  await symlink(join(dir, "secret.html"), join(root, "escape.html"));
  const views = createViews({ root });
  for (const name of [
    "../secret",
    "/secret",
    "a/../../secret",
    "a\\secret",
    "%2e%2e/secret",
    "./secret",
    "",
    "a//b",
    "escape",
  ]) {
    await assert.rejects(views.renderToString(name), TypeError, name);
  }
  await writeFile(join(root, "partial.html"), '<%= await it.partial("../secret") %>');
  await assert.rejects(views.renderToString("partial"));
  await assert.rejects(views.renderToString("partial", {}, { layout: "../secret" }));
  await writeFile(join(root, "cycle.html"), '<%= await it.partial("cycle") %>');
  await assert.rejects(views.renderToString("cycle"), /Recursive view partial/);
});

test("production compiles once concurrently; dev reloads, failures can retry and caches clear", async (t) => {
  const root = await mkdtemp(join(tmpdir(), "brevity-views-cache-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  await writeFile(join(root, "page.html"), "one");
  let count = 0;
  const eta = etaEngine();
  const engine: ViewEngine = {
    compile(source, filename) {
      count++;
      return eta.compile(source, filename);
    },
  };
  const cached = createViews({ root, cache: true, engine });
  assert.deepEqual(
    (await Promise.all([cached.renderToString("page"), cached.renderToString("page")])).map(String),
    ["one", "one"],
  );
  assert.equal(count, 1);
  await writeFile(join(root, "page.html"), "two");
  assert.equal(String(await cached.renderToString("page")), "one");
  cached.clearCache();
  assert.equal(String(await cached.renderToString("page")), "two");
  const dev = createViews({ root, cache: false, engine });
  assert.equal(String(await dev.renderToString("page")), "two");
  await writeFile(join(root, "page.html"), "three");
  assert.equal(String(await dev.renderToString("page")), "three");
  await assert.rejects(cached.renderToString("missing"));
  await writeFile(join(root, "missing.html"), "retry");
  assert.equal(String(await cached.renderToString("missing")), "retry");
  assert.equal(count, 5);
});

test("custom engines/extensions keep the file contract; default cache follows production mode", async (t) => {
  const root = await mkdtemp(join(tmpdir(), "brevity-views-engine-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  await writeFile(join(root, "custom.txt"), "one");
  let count = 0;
  const engine: ViewEngine = {
    compile(source, filename) {
      assert.ok(filename.endsWith(".txt"));
      count++;
      return (data) => source + String(data.title);
    },
  };
  const before = process.env.NODE_ENV;
  try {
    process.env.NODE_ENV = "production";
    const views = createViews({ root, extension: ".txt", engine });
    assert.equal(String(await views.renderToString("custom", { title: "!" })), "one!");
    await writeFile(join(root, "custom.txt"), "two");
    assert.equal(String(await views.renderToString("custom", { title: "?" })), "one?");
    assert.equal(count, 1);
    process.env.NODE_ENV = "development";
    const dev = createViews({ root, extension: ".txt", engine });
    assert.equal(String(await dev.renderToString("custom", { title: "!" })), "two!");
    await writeFile(join(root, "custom.txt"), "three");
    assert.equal(String(await dev.renderToString("custom", { title: "!" })), "three!");
    assert.equal(count, 3);
  } finally {
    if (before === undefined) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = before;
  }
});
