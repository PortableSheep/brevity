import assert from "node:assert/strict";
import { mkdir, mkdtemp, readFile, rename, rm } from "node:fs/promises";
import { request, type Server } from "node:http";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { start as brevity } from "../src/brevity.js";
import { start as express } from "../src/express.js";
import { bodyLimit } from "../src/config.js";
import { fields, limits } from "../src/domain.js";

type Result = { status: number; headers: Record<string, string | string[] | undefined>; text: string };
function http(server: Server, path: string, method = "GET", body?: string | Buffer,
  headers: Record<string, string> = {}, chunked = false): Promise<Result> {
  const address = server.address();
  assert(address && typeof address === "object");
  return new Promise((resolve, reject) => {
    const req = request({ host: "127.0.0.1", port: address.port, path, method,
      headers: { ...(body !== undefined && !chunked ? { "content-length": String(Buffer.byteLength(body)) } : {}), ...headers } }, res => {
      const chunks: Buffer[] = [];
      res.on("data", chunk => chunks.push(chunk));
      res.on("error", reject);
      res.on("end", () => resolve({ status: res.statusCode!, headers: res.headers, text: Buffer.concat(chunks).toString() }));
    });
    req.on("error", reject);
    if (chunked && body !== undefined) req.write(body);
    req.end(chunked ? undefined : body);
  });
}
const close = (server: Server) => new Promise<void>((resolve, reject) => {
  server.close(error => error ? reject(error) : resolve());
  server.closeIdleConnections();
});
const valid = { name: "Demo Person", email: "demo@example.test", subject: "Help with local demo", details: "Fictional support details." };
const formHeaders = { "content-type": "application/x-www-form-urlencoded" };
const jsonHeaders = { "content-type": "application/json" };
const form = (data: Record<string, string>) => new URLSearchParams(data).toString();
function htmlHeaders(result: Result, status = 200) {
  assert.equal(result.status, status);
  assert.match(String(result.headers["content-type"]), /^text\/html; charset=utf-8$/i);
  assert.equal(result.headers["x-content-type-options"], "nosniff");
  assert.match(String(result.headers["content-security-policy"]), /form-action 'self'/);
  assert.equal(result.headers["cache-control"], "no-store");
}
function retained(result: Result, name: string, expected: string) {
  const tag = result.text.match(new RegExp(`<input[^>]*name="${name}"[^>]*>`))?.[0];
  assert(tag, `Missing ${name} input`);
  assert(tag.includes(`value="${expected}"`), `Value not retained for ${name}`);
}
function errorsAccessible(text: string) {
  assert.match(text, /role="alert" tabindex="-1"/);
  const targets = [...text.matchAll(/href="#([^"]+)"/g)].map(match => match[1]);
  assert(targets.length > 0);
  for (const target of targets) {
    assert(text.includes(`id="${target}"`));
    const control = text.match(new RegExp(`<(?:input|textarea|select)[^>]*id="${target}"[^>]*>`))?.[0];
    assert(control?.includes('aria-invalid="true"'));
    assert(control?.includes(`${target}-errors`));
    assert(text.includes(`id="${target}-errors"`));
  }
}

for (const [name, start] of Object.entries({ brevity, express })) {
  test(`${name}: identical support inbox acceptance contract`, async t => {
    const directory = await mkdtemp(join(tmpdir(), "support-inbox-http-"));
    const file = join(directory, "requests.json");
    let server = await start({ file, token: "test-only-token" });
    t.after(async () => { await close(server); await rm(directory, { recursive: true }); });
    const tokenPage = await http(server, "/requests/new");
    const token = tokenPage.text.match(/name="_token" value="([^"]+)"/)?.[1];
    assert.equal(token, "test-only-token");
    const create = (values: Record<string, string> = valid) => http(server, "/requests", "POST", form({ ...values, _token: token! }), formHeaders);

    await t.test("native forms, field labels, limits, assets, and response headers", async () => {
      htmlHeaders(tokenPage);
      assert.match(tokenPage.text, /<form method="post" action="\/requests">/);
      assert.match(tokenPage.text, /<script defer src="\/assets\/app.js">/);
      for (const field of fields) {
        const control = tokenPage.text.match(new RegExp(`<(?:input|textarea)[^>]*name="${field}"[^>]*>`))?.[0];
        assert(control?.includes(`maxlength="${limits[field]}"`));
        assert(control?.includes("required"));
        const id = control?.match(/id="([^"]+)"/)?.[1];
        assert(tokenPage.text.includes(`<label for="${id}">`));
      }
      assert.equal((await http(server, "/")).headers.location, "/requests/new");
      htmlHeaders(await http(server, "/requests/new", "HEAD"));
      assert.equal((await http(server, "/requests/new", "HEAD")).text, "");
      for (const asset of ["app.css", "app.js"]) {
        const get = await http(server, `/assets/${asset}?v=1`);
        assert.equal(get.status, 200);
        assert.equal(get.headers["cache-control"], "no-cache");
        assert.equal(get.headers["x-content-type-options"], "nosniff");
        assert.match(String(get.headers["content-type"]), asset.endsWith("css") ? /text\/css/ : /(?:text|application)\/javascript/);
        assert.equal(Number(get.headers["content-length"]), Buffer.byteLength(get.text));
        assert.equal(get.headers["content-encoding"], undefined);
        const head = await http(server, `/assets/${asset}`, "HEAD");
        assert.equal(head.status, 200);
        assert.equal(head.text, "");
        assert.equal(head.headers["content-length"], get.headers["content-length"]);
        assert.equal(head.headers["content-type"], get.headers["content-type"]);
        const post = await http(server, `/assets/${asset}`, "POST");
        assert.equal(post.status, 405);
        assert.equal(post.headers.allow, "GET, HEAD");
      }
    });

    await t.test("runtime shape/length validation returns accessible retained 422 errors", async () => {
      const invalid = await create({ ...valid, name: `A & "B"`, email: "bad", subject: "", details: "Retain <this>" });
      htmlHeaders(invalid, 422);
      errorsAccessible(invalid.text);
      retained(invalid, "name", "A &amp; &quot;B&quot;");
      retained(invalid, "email", "bad");
      assert.match(invalid.text, /Retain &lt;this&gt;<\/textarea>/);
      for (const field of fields) {
        const wrongType = await http(server, "/requests", "POST", JSON.stringify({ ...valid, [field]: [valid[field]], _token: token }), jsonHeaders);
        htmlHeaders(wrongType, 422);
        errorsAccessible(wrongType.text);
        assert.equal((await create({ ...valid, [field]: " ".repeat(2) })).status, 422);
        assert.equal((await create({ ...valid, [field]: "x".repeat(limits[field] + 1) })).status, 422);
      }
      const missing = await http(server, "/requests", "POST", JSON.stringify({ _token: token }), jsonHeaders);
      htmlHeaders(missing, 422);
      assert.equal(JSON.parse(await readFile(file, "utf8")).length, 0);
    });

    let detail = "";
    await t.test("valid native POST redirects 303 to persisted escaped detail page", async () => {
      const result = await create({
        name: valid.name.padEnd(limits.name, "x"),
        email: "x".repeat(limits.email - "@example.test".length) + "@example.test",
        subject: `<script>alert("x")</script> & help`.padEnd(limits.subject, "x"),
        details: `Text </textarea><script>bad()</script> ' "`.padEnd(limits.details, "x"),
      });
      assert.equal(result.status, 303);
      detail = String(result.headers.location);
      assert.match(detail, /^\/requests\/[0-9a-f-]{36}$/);
      const page = await http(server, detail);
      htmlHeaders(page);
      htmlHeaders(await http(server, detail, "HEAD"));
      assert.equal((await http(server, detail, "HEAD")).text, "");
      assert.match(page.text, /&lt;script&gt;alert\(&quot;x&quot;\)&lt;\/script&gt; &amp; help/);
      assert(!page.text.includes("<script>alert"));
      assert(!page.text.includes("</textarea><script>bad"));
      assert.match(page.text, /Status: <strong>open<\/strong>/);
      assert.match(page.text, new RegExp(`<form method="post" action="${detail}/status">`));
      assert.equal(JSON.parse(await readFile(file, "utf8")).length, 1);
    });

    await t.test("concurrent creation, five-row pagination, search, filters, native status updates", async () => {
      const results = await Promise.all(Array.from({ length: 7 }, (_, index) => create({ ...valid, subject: `Question ${index}` })));
      assert(results.every(result => result.status === 303));
      assert.equal(JSON.parse(await readFile(file, "utf8")).length, 8);
      const first = await http(server, "/inbox");
      htmlHeaders(first);
      htmlHeaders(await http(server, "/inbox", "HEAD"));
      assert.match(first.text, /8 requests\. Page 1 of 2\./);
      assert.equal([...first.text.matchAll(/<li><a href="\/requests\//g)].length, 5);
      assert.match(first.text, /rel="next"/);
      const second = await http(server, "/inbox?page=2");
      assert.equal([...second.text.matchAll(/<li><a href="\/requests\//g)].length, 3);
      assert.match(second.text, /rel="prev"/);
      const search = await http(server, "/inbox?q=QUESTION%203");
      assert.match(search.text, /1 requests\. Page 1 of 1\./);
      assert.match(search.text, /Question 3/);
      const invalid = await http(server, `${detail}/status`, "POST", form({ _token: token!, status: "deleted" }), formHeaders);
      htmlHeaders(invalid, 422);
      errorsAccessible(invalid.text);
      assert.match(invalid.text, /value="open" selected/);
      const update = await http(server, `${detail}/status`, "POST", form({ _token: token!, status: "closed" }), formHeaders);
      assert.equal(update.status, 303);
      assert.equal(update.headers.location, detail);
      assert.match((await http(server, detail)).text, /Status: <strong>closed<\/strong>/);
      assert.match((await http(server, "/inbox?status=closed")).text, /1 requests/);
      assert.match((await http(server, "/inbox?status=open")).text, /7 requests/);
      assert.match((await http(server, "/inbox?q=never-found&status=closed")).text, /No requests match/);
      assert.match((await http(server, "/inbox?page=999")).text, /Page 2 of 2/);
      const escaped = await http(server, "/inbox?q=%22%3E%3Cscript%3E");
      retained(escaped, "q", "&quot;&gt;&lt;script&gt;");
      for (const query of ["status=deleted", "page=0", "page=-1", "page=1.5", "page=9007199254740992", `q=${"a".repeat(121)}`]) {
        htmlHeaders(await http(server, `/inbox?${query}`), 400);
      }
    });

    await t.test("app/repository restart retains all records and closed status", async () => {
      await close(server);
      server = await start({ file, token: "test-only-token" });
      htmlHeaders(await http(server, detail));
      assert.match((await http(server, detail)).text, /Status: <strong>closed<\/strong>/);
      assert.match((await http(server, "/inbox")).text, /8 requests/);
    });

    await t.test("write tokens, malformed/unsupported/oversized bodies and unknown routes/methods", async () => {
      for (const path of ["/requests", `${detail}/status`]) {
        htmlHeaders(await http(server, path, "POST", form(valid), formHeaders), 403);
        htmlHeaders(await http(server, path, "POST", form({ _token: "incorrect" }), formHeaders), 403);
        htmlHeaders(await http(server, path, "POST", "", formHeaders), 403);
        for (const body of ["{", "null", "[]", '"string"']) {
          htmlHeaders(await http(server, path, "POST", body, jsonHeaders), 400);
        }
        htmlHeaders(await http(server, path, "POST", "_token=%ZZ", formHeaders), 400);
        htmlHeaders(await http(server, path, "POST", Buffer.from([0xff]), formHeaders), 400);
        htmlHeaders(await http(server, path, "POST", "hello", { "content-type": "text/plain" }), 415);
        htmlHeaders(await http(server, path, "POST", "hello", { ...formHeaders, "content-encoding": "gzip" }), 415);
        for (const chunked of [false, true]) {
          htmlHeaders(await http(server, path, "POST", "a".repeat(bodyLimit + 1), formHeaders, chunked), 413);
        }
      }
      for (const path of ["/missing", "/requests/no-such-id", "/assets/missing.js", "/assets/../package.json",
        "/assets/%2e%2e/package.json", "/assets/%61pp.js", "/assets/x/../app.js", "/assets/app.js/extra",
        "/REQUESTS/new", "/requests/new/"]) {
        assert.equal((await http(server, path)).status, 404, path);
      }
      for (const [path, method] of [["/inbox", "DELETE"], ["/requests", "GET"], ["/inbox", "POST"], ["/requests/new", "PUT"]]) {
        assert.equal((await http(server, path, method)).status, 404);
      }
      assert.equal(JSON.parse(await readFile(file, "utf8")).length, 8);
    });

    await t.test("filesystem write failure yields explicit 500 without a success redirect or phantom data", async () => {
      const moved = join(directory, "saved.json");
      await rename(file, moved);
      // A directory at the destination deterministically prevents atomic replacement.
      await mkdir(file);
      const failure = await create({ ...valid, subject: "Must not be committed" });
      htmlHeaders(failure, 500);
      assert.equal(failure.headers.location, undefined);
      assert(!failure.text.includes(directory));
      assert.match((await http(server, "/inbox")).text, /8 requests/);
      await rm(file, { recursive: true });
      await rename(moved, file);
      assert.equal((await create({ ...valid, subject: "Retry succeeds" })).status, 303);
      assert.equal(JSON.parse(await readFile(file, "utf8")).length, 9);
    });
  });
}
