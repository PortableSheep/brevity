import test, { type TestContext } from "node:test";
import assert from "node:assert/strict";
import { once } from "node:events";
import { request } from "node:http";
import { mkdtemp, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createApp, Request, Response, type App, type Router } from "@brevity/core";
import {
  html,
  escapeHtml,
  trustedHtml,
  renderPage,
  createFormState,
  serializeJson,
  jsonScript,
  staticAssets,
  type HtmlFragment,
} from "@brevity/web";
import { createWebExampleApp } from "../examples/web-app.js";

async function serve(t: TestContext, app: App): Promise<string> {
  const server = app.listen(0);
  await once(server, "listening");
  t.after(
    () =>
      new Promise<void>((resolve, reject) =>
        server.close((error) => (error ? reject(error) : resolve())),
      ),
  );
  const address = server.address();
  assert.ok(address && typeof address !== "string");
  return `http://127.0.0.1:${address.port}`;
}

async function rawRequest(base: string, path: string, method = "GET") {
  return new Promise<{ status: number; body: string }>((resolve, reject) => {
    const req = request(base, { path, method }, (res) => {
      const chunks: Buffer[] = [];
      res.on("data", (chunk: Buffer) => chunks.push(chunk));
      res.on("end", () =>
        resolve({ status: res.statusCode ?? 0, body: Buffer.concat(chunks).toString() }),
      );
      res.on("error", reject);
    });
    req.on("error", reject);
    req.end();
  });
}

test("HTML escapes every ordinary interpolation and composes only marked markup", () => {
  const attack = `<img src=x onerror="alert('x')">&`;
  assert.equal(escapeHtml(attack), "&lt;img src=x onerror=&quot;alert(&#39;x&#39;)&quot;&gt;&amp;");
  assert.equal(
    String(html`<p title="${attack}">${attack}</p>`),
    `<p title="${escapeHtml(attack)}">${escapeHtml(attack)}</p>`,
  );
  assert.equal(
    String(
      html`${[html`<b>${"<"}</b>`, ["<i>", trustedHtml("<hr>")], null]}${undefined}${0}${true}`,
    ),
    "<b>&lt;</b>&lt;i&gt;<hr>0true",
  );
});

test("unrecognized interpolation objects are rejected instead of coerced to raw markup", () => {
  assert.throws(() => html`${{ toString: () => "<script>" } as never}`, TypeError);
});

test("JSON script data round trips without closing the data block or executing markup", () => {
  const data = { text: '</script><script>alert("x")</script>&\u2028\u2029', count: 2, empty: null };
  const serialized = serializeJson(data);
  assert.ok(!/[<>&\u2028\u2029]/.test(serialized));
  assert.deepEqual(JSON.parse(serialized), data);
  assert.equal(
    String(jsonScript('state" onclick="attack', data)),
    `<script type="application/json" id="state&quot; onclick=&quot;attack">${serialized}</script>`,
  );
  assert.throws(() => serializeJson(undefined), TypeError);
  assert.throws(() => serializeJson(1n), TypeError);
  const cycle: { self?: unknown } = {};
  cycle.self = cycle;
  assert.throws(() => serializeJson(cycle), TypeError);
});

test("form state retains explicit values and exposes accessible escaped errors", () => {
  const errors = { name: ["Required <script>", "Try again & retry"], email: [] };
  const form = createFormState({
    values: { name: '"<Ada>&', empty: "" },
    errors,
    labels: { name: "Your <name>" },
    idPrefix: "contact",
  });
  errors.name.push("Later mutation");
  const field = form.field("name", { describedBy: "name-help" });
  assert.equal(field.value, '"<Ada>&');
  assert.equal(field.name, "name");
  assert.equal(field.invalid, true);
  assert.equal(field.describedBy, `name-help ${field.id}-errors`);
  assert.ok(String(form.fieldErrors("name")).includes(`id="${field.id}-errors"`));
  assert.ok(String(form.fieldErrors("name")).includes("Required &lt;script&gt;"));
  assert.ok(!String(form.fieldErrors("name")).includes("Later mutation"));
  assert.ok(String(form.errorSummary()).includes(`href="#${field.id}"`));
  assert.ok(String(form.errorSummary()).includes("Your &lt;name&gt;:"));
  assert.ok(String(form.errorSummary()).includes('role="alert" tabindex="-1"'));
  assert.equal(form.value("empty"), "");
  assert.equal(form.value("missing"), "");
  assert.equal(form.value("toString"), "");
  assert.equal(form.field("email").invalid, false);
  assert.equal(form.field("email").describedBy, "");
  assert.equal(String(form.fieldErrors("email")), "");
  assert.equal(String(createFormState().errorSummary()), "");
});

test("form IDs distinguish arbitrary names and prefixes reject unsafe IDs", () => {
  const form = createFormState();
  assert.notEqual(form.field("a b").id, form.field("a-b").id);
  assert.notEqual(form.field("\ud800").id, form.field("\ufffd").id);
  assert.match(form.field('"><script>').id, /^[A-Za-z][A-Za-z0-9_-]*$/);
  assert.throws(() => createFormState({ idPrefix: 'bad" id' }), TypeError);
});

test("callback pages compose layouts, escaped partials, status and core response headers", async (t) => {
  const app = createApp();
  app.router.get("/", (req, res) => {
    assert.ok(req instanceof Request);
    assert.ok(res instanceof Response);
    const partial = (name: string) => html`<p>${name}</p>`;
    renderPage(
      res,
      ({ name }) => partial(name),
      { name: "<Ada>" },
      {
        status: 422,
        /* prettier-ignore */
        layout: (body, data) => html`<!doctype html><title>${data.name}</title><main>${body}</main>`,
      },
    );
  });
  const response = await fetch(await serve(t, app));
  assert.equal(response.status, 422);
  assert.equal(response.headers.get("content-type"), "text/html; charset=utf-8");
  assert.equal(response.headers.get("x-content-type-options"), "nosniff");
  assert.equal(
    await response.text(),
    "<!doctype html><title>&lt;Ada&gt;</title><main><p>&lt;Ada&gt;</p></main>",
  );
});

test("plain string page and layout returns fail explicitly", async (t) => {
  const app = createApp();
  app.router.get("/template", (_req, res) => renderPage(res, () => "<script>" as never, undefined));
  app.router.get("/layout", (_req, res) =>
    renderPage(res, () => html`ok`, undefined, {
      layout: () => "<script>" as never,
    }),
  );
  const base = await serve(t, app);
  assert.equal((await fetch(`${base}/template`)).status, 500);
  assert.equal((await fetch(`${base}/layout`)).status, 500);
});

test("static assets serve explicit files, binary bytes, MIME, cache and empty HEAD", async (t) => {
  const directory = await mkdtemp(join(tmpdir(), "brevity-web-"));
  t.after(() => rm(directory, { recursive: true, force: true }));
  const file = join(directory, "style.css");
  const binary = join(directory, "image.png");
  await writeFile(file, "body { color: red; }");
  await writeFile(binary, Buffer.from([0, 255, 128, 13]));
  const app = createApp();
  app.use(
    staticAssets({
      "/assets/style.css": { file, cacheControl: "public, max-age=3600, immutable" },
      "/assets/image.png": { file: binary },
      "/assets/custom": { file, contentType: "text/plain; charset=utf-8" },
    }),
  );
  const base = await serve(t, app);
  const response = await fetch(`${base}/assets/style.css?v=1`);
  assert.equal(response.status, 200);
  assert.equal(response.headers.get("content-type"), "text/css; charset=utf-8");
  assert.equal(response.headers.get("x-content-type-options"), "nosniff");
  assert.equal(response.headers.get("cache-control"), "public, max-age=3600, immutable");
  assert.equal(response.headers.get("content-length"), "20");
  assert.equal(await response.text(), "body { color: red; }");
  const head = await fetch(`${base}/assets/style.css`, { method: "HEAD" });
  assert.equal(head.status, 200);
  assert.equal(head.headers.get("content-length"), "20");
  assert.equal(head.headers.get("content-type"), response.headers.get("content-type"));
  assert.equal(await head.text(), "");
  const image = await fetch(`${base}/assets/image.png`);
  assert.deepEqual(Buffer.from(await image.arrayBuffer()), Buffer.from([0, 255, 128, 13]));
  assert.equal(image.headers.get("cache-control"), "no-cache");
  assert.equal(
    (await fetch(`${base}/assets/custom`)).headers.get("content-type"),
    "text/plain; charset=utf-8",
  );
});

test("asset middleware does not swallow API 404s or unknown paths and rejects method/path aliases", async (t) => {
  const app = createApp();
  app.use(staticAssets({ "/assets/style.css": { file: join("examples", "assets", "web.css") } }));
  app.router.get("/api/ok", (_req, res) => res.json({ ok: true }));
  const base = await serve(t, app);
  assert.deepEqual(await (await fetch(`${base}/api/ok`)).json(), { ok: true });
  const missing = await fetch(`${base}/api/missing`);
  assert.equal(missing.status, 404);
  assert.deepEqual(await missing.json(), { error: "Not Found" });
  for (const path of [
    "/assets/missing.css",
    "/assets/%73tyle.css",
    "/assets/../assets/style.css",
    "/assets/%2e%2e/assets/style.css",
    "/assets/style.css/extra",
  ]) {
    assert.equal((await rawRequest(base, path)).status, 404, path);
  }
  for (const method of ["POST", "PUT", "DELETE", "OPTIONS"]) {
    const response = await fetch(`${base}/assets/style.css`, { method });
    assert.equal(response.status, 405, method);
    assert.equal(response.headers.get("allow"), "GET, HEAD");
  }
});

test("asset setup validates canonical URLs, known MIME and header injection", () => {
  for (const url of [
    "assets/app.js",
    "//host/app.js",
    "/a/../app.js",
    "/app.js?x=1",
    "/%61.js",
    "/a\\b",
    "/a b",
    "/caf\u00e9.js",
  ]) {
    assert.throws(() => staticAssets({ [url]: { file: "app.js" } }), TypeError, url);
  }
  assert.throws(() => staticAssets({ "/asset": { file: "unknown.extension" } }), TypeError);
  assert.throws(
    () => staticAssets({ "/asset": { file: "app.css", cacheControl: "x\r\ninjected: yes" } }),
    TypeError,
  );
  assert.throws(
    () => staticAssets({ "/asset": { file: "app.css", contentType: "x\ninjected" } }),
    TypeError,
  );
});

test("missing and non-file explicit assets raise errors instead of falling through", async (t) => {
  const app = createApp();
  app.use(
    staticAssets({
      "/missing": { file: join("examples", "does-not-exist.css") },
      "/directory": { file: "examples", contentType: "text/plain" },
    }),
  );
  const base = await serve(t, app);
  assert.equal((await fetch(`${base}/missing`)).status, 500);
  assert.equal((await fetch(`${base}/directory`)).status, 500);
});

test("complete form flow: GET, escaped retained invalid POST, successful redirect, assets and API 404", async (t) => {
  const base = await serve(t, createWebExampleApp());
  const initial = await fetch(`${base}/contact`);
  assert.equal(initial.status, 200);
  assert.match(await initial.text(), /<form method="post" action="\/contact">/);
  const invalid = await fetch(`${base}/contact`, {
    method: "POST",
    body: new URLSearchParams({ name: "  " }),
  });
  assert.equal(invalid.status, 422);
  const markup = await invalid.text();
  assert.match(markup, /value="  "/);
  assert.match(markup, /aria-invalid="true"/);
  assert.match(markup, /Enter your name\./);
  const accepted = await fetch(`${base}/contact`, {
    method: "POST",
    body: new URLSearchParams({ name: "<Ada>" }),
    redirect: "manual",
  });
  assert.equal(accepted.status, 303);
  assert.equal(accepted.headers.get("location"), "/thanks");
  assert.equal((await fetch(`${base}/thanks`)).status, 200);
  assert.equal((await fetch(`${base}/assets/web.css`)).status, 200);
  assert.equal((await fetch(`${base}/api/missing`)).status, 404);
});

// Compile-time contracts: callbacks must mark their markup and middleware consumes core types.
function typeContracts(res: Response) {
  const middleware: Parameters<Router["middleware"]>[0] = staticAssets({});
  const fragment: HtmlFragment = html`ok`;
  renderPage(res, () => fragment, undefined);
  // @ts-expect-error Raw string callbacks are not safe templates.
  renderPage(res, () => "<h1>unsafe</h1>", undefined);
  // @ts-expect-error Objects are not implicitly trusted HTML values.
  html`${{ markup: "<script>" }}`;
  return middleware;
}
