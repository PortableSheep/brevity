import assert from "node:assert/strict";

const origin = process.argv[2];
assert(origin, "Usage: node examples/vercel/check.mjs https://deployment-url");
const base = new URL(origin);
assert(["https:", "http:"].includes(base.protocol), "Expected an HTTP(S) URL");
const request = (path, options) =>
  fetch(new URL(path, base), {
    redirect: "manual",
    signal: AbortSignal.timeout(15_000),
    ...options,
  });

const health = await request("/health");
assert.equal(
  health.status,
  200,
  "Health must be directly accessible; protected deployments need an authorized verification client",
);
assert.match(health.headers.get("content-type"), /application\/json/);
assert.deepEqual(await health.json(), { ok: true });
const page = await request("/");
assert.equal(page.status, 200);
assert.match(await page.text(), /Brevity on Vercel/);
const css = await request("/style.css");
assert.equal(css.status, 200);
assert.match(css.headers.get("content-type"), /text\/css/);
assert.match(await css.text(), /system-ui/);
assert.equal((await request("/missing")).status, 404);
const head = await request("/health", { method: "HEAD" });
assert.equal(head.status, 200);
assert.equal(await head.text(), "");

const post = (body, type = "application/json", path = "/echo") =>
  request(path, {
    method: "POST",
    headers: { "content-type": type },
    body,
    redirect: "manual",
  });
const json = await post('{"value":42}');
assert.equal(json.status, 200);
assert.deepEqual(await json.json(), { body: { value: 42 }, form: null });
const form = await post("choice=a&choice=b", "application/x-www-form-urlencoded");
assert.equal(form.status, 200);
assert.deepEqual(await form.json(), {
  body: { choice: "b" },
  form: [
    ["choice", "a"],
    ["choice", "b"],
  ],
});
assert.equal((await post("{")).status, 400);
assert.equal((await post(JSON.stringify({ value: "x".repeat(1024) }))).status, 413);
assert.equal((await post("text", "text/plain")).status, 415);
assert.equal((await post("name=", "application/x-www-form-urlencoded", "/form")).status, 422);
const submitted = await post("name=%3Creader%3E", "application/x-www-form-urlencoded", "/form");
assert.equal(submitted.status, 303);
assert.equal(submitted.headers.get("location"), "/hello?name=%3Creader%3E");
const greeted = await request(submitted.headers.get("location"));
assert.equal(greeted.status, 200);
assert.match(await greeted.text(), /&lt;reader&gt;/);

const cookies = await request("/cookies", { redirect: "manual" });
assert.equal(cookies.status, 303);
assert.equal(cookies.headers.get("location"), "/health");
const setCookies = cookies.headers.getSetCookie();
assert(setCookies.some((value) => value.startsWith("brevity_first=1;")));
assert(setCookies.some((value) => value.startsWith("brevity_second=2;")));
const binary = await request("/binary");
assert.equal(binary.status, 200);
assert.deepEqual(Buffer.from(await binary.arrayBuffer()), Buffer.from([0, 1, 127, 128, 255]));
const conflict = await request("/conflict");
assert.equal(conflict.status, 409);
assert.deepEqual(await conflict.json(), { error: "Example conflict" });
assert.deepEqual(
  await Promise.all(
    Array.from({ length: 20 }, async (_, id) => {
      const response = await request(`/scope/${id}`);
      assert.equal(response.status, 200);
      return response.json();
    }),
  ),
  Array.from({ length: 20 }, (_, id) => ({ id: String(id) })),
);
assert.equal((await request("/health")).status, 200);
console.log(`Vercel HTTP contracts passed against ${base.origin}`);
