import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { app as firstRoute } from "./first-route.js";
import { createNotebook } from "./tutorial/app.js";
import { openStore } from "./tutorial/store.js";
import { openPrismaStore } from "./prisma/store.js";
import { PrismaClient } from "@prisma/client";
import { serve } from "./testing.js";
import { decoratedApp, plainApp, GreetingService } from "./routes.js";
import { islandApp } from "./island/server.js";
import { authApp } from "./supabase.js";

test("first route works over HTTP; HEAD is not automatically GET", async t => {
  const origin = await serve(t, firstRoute);
  assert.deepEqual(await (await fetch(origin)).json(), { message: "Hello, Brevity" });
  assert.equal((await fetch(origin, { method: "HEAD" })).status, 404);
});

test("notebook retains errors, escapes input, rejects duplicates and persists", async t => {
  const dir = await mkdtemp(join(tmpdir(), "brevity-docs-"));
  const url = `file:${join(dir, "notes.db")}`;
  t.after(() => rm(dir, { recursive: true, force: true }));
  const store = await openStore(url);
  t.after(() => store.close());
  const origin = await serve(t, createNotebook(store));
  const post = (body: URLSearchParams | string, sameOrigin = origin) => fetch(`${origin}/notes`, {
    method: "POST", headers: {
      origin: sameOrigin, "content-type": "application/x-www-form-urlencoded",
    }, body, redirect: "manual",
  });
  assert.equal((await fetch(origin)).status, 200);
  assert.equal((await fetch(origin, { method: "HEAD" })).status, 200);
  assert.equal((await post("text=one&text=two")).status, 400);
  assert.equal((await post("text=one", "https://other.invalid")).status, 403);
  const invalid = await post(new URLSearchParams({ text: "<script>".repeat(30) }));
  assert.equal(invalid.status, 422);
  const markup = await invalid.text();
  assert.match(markup, /role="alert"/);
  assert.match(markup, /aria-invalid="true"/);
  assert.match(markup, /&lt;script&gt;/);
  assert.doesNotMatch(markup, /<script>/);
  assert.equal((await post(new URLSearchParams({ text: "A <great> note" }))).status, 303);
  assert.match(await (await fetch(origin)).text(), /A &lt;great&gt; note/);
  const reopened = await openStore(url);
  try { assert.deepEqual(await reopened.list(), [{ id: 1, text: "A <great> note" }]); }
  finally { reopened.close(); }
});

test("Prisma repository satisfies the same notebook contract", async t => {
  const dir = await mkdtemp(join(tmpdir(), "brevity-prisma-"));
  t.after(() => rm(dir, { recursive: true, force: true }));
  const url = `file:${join(dir, "notes.db")}`;
  const setup = new PrismaClient({ datasources: { db: { url } } });
  try {
    await setup.$executeRaw`CREATE TABLE Note (id INTEGER PRIMARY KEY AUTOINCREMENT, text TEXT NOT NULL)`;
  } finally { await setup.$disconnect(); }
  const store = await openPrismaStore(url);
  t.after(() => store.close());
  const origin = await serve(t, createNotebook(store));
  const response = await fetch(`${origin}/notes`, {
    method: "POST", headers: { origin }, body: new URLSearchParams({ text: "With Prisma" }),
    redirect: "manual",
  });
  assert.equal(response.status, 303);
  assert.deepEqual(await store.list(), [{ id: 1, text: "With Prisma" }]);
});

for (const factory of [plainApp, decoratedApp]) {
  test(`${factory.name}: constructor wiring, domain errors and explicit HEAD`, async t => {
    const origin = await serve(t, factory(new GreetingService()));
    assert.deepEqual(await (await fetch(`${origin}/readers/7`)).json(), { message: "Hello, reader 7" });
    assert.equal((await fetch(`${origin}/readers/nope`)).status, 422);
    const head = await fetch(`${origin}/readers/7`, { method: "HEAD" });
    assert.equal(head.status, 200);
    assert.equal(await head.text(), "");
  });
}

test("built island is allowlisted and native form is still usable", async t => {
  const dir = await mkdtemp(join(tmpdir(), "brevity-island-test-"));
  t.after(() => rm(dir, { recursive: true, force: true }));
  const store = await openStore(`file:${join(dir, "notes.db")}`);
  t.after(() => store.close());
  const origin = await serve(t, islandApp(store));
  const markup = await (await fetch(origin)).text();
  assert.match(markup, /type="application\/json" id="note-state"/);
  assert.match(markup, /method="post" action="\/notes"/);
  const asset = await fetch(`${origin}/assets/counter.js`);
  assert.equal(asset.status, 200);
  assert.match(await asset.text(), /characters/);
  assert.equal((await fetch(`${origin}/assets/unknown.js`)).status, 404);
  const saved = await fetch(`${origin}/notes`, {
    method: "POST", headers: { origin }, body: new URLSearchParams({ text: "Native island" }),
  });
  assert.equal(saved.status, 200);
  assert.match(await saved.text(), /Native island/);
  const invalid = await fetch(`${origin}/notes`, {
    method: "POST", headers: { origin }, body: new URLSearchParams({ text: "</script>".repeat(30) }),
  });
  const retained = await invalid.text();
  assert.equal(invalid.status, 422);
  assert.match(retained, /\\u003c\/script\\u003e/);
});

test("Supabase SDK creates browser-bound PKCE cookies; wrong browser and CSRF fail", async t => {
  const calls: { url: string; body: Record<string, unknown> }[] = [];
  const fakeFetch: typeof fetch = async (input, init) => {
    const url = String(input);
    const body = JSON.parse(String(init?.body ?? "{}")) as Record<string, unknown>;
    calls.push({ url, body });
    if (new URL(url).pathname.endsWith("/otp")) return new globalThis.Response("{}", {
      status: 200, headers: { "content-type": "application/json" },
    });
    return new globalThis.Response(JSON.stringify({ msg: "Invalid link" }), {
      status: 400, headers: { "content-type": "application/json" },
    });
  };
  const config = {
    origin: "http://127.0.0.1:3000", supabaseUrl: "https://example.supabase.co",
    publishableKey: "test-publishable-key", fetch: fakeFetch,
  };
  const origin = await serve(t, authApp(config));
  const post = (requestOrigin: string) => fetch(`${origin}/login`, {
    method: "POST", headers: { origin: requestOrigin },
    body: new URLSearchParams({ email: "reader@example.com" }),
  });
  assert.equal((await post("https://attacker.invalid")).status, 403);
  assert.equal(calls.length, 0);
  const login = await post(config.origin);
  assert.equal(login.status, 200);
  assert.equal(login.headers.get("referrer-policy"), "same-origin");
  assert.equal(login.headers.get("cache-control"), "private, no-store");
  const cookies = login.headers.getSetCookie();
  assert(cookies.some(cookie => cookie.includes("code-verifier=")));
  assert(cookies.every(cookie => cookie.includes("HttpOnly") && cookie.includes("SameSite=Lax")));
  assert.equal(calls[0].body.code_challenge_method, "s256");
  assert.equal(typeof calls[0].body.code_challenge, "string");
  const wrongBrowser = await fetch(`${origin}/auth/callback?code=one`);
  assert.equal(wrongBrowser.status, 400);
  assert.equal(calls.length, 1);
  const cookie = cookies.map(value => value.split(";")[0]).join("; ");
  const expired = await fetch(`${origin}/auth/callback?code=one`, { headers: { cookie } });
  assert.equal(expired.status, 400);
  assert(calls[1].url.includes("grant_type=pkce"));
  assert.equal(typeof calls[1].body.code_verifier, "string");
  assert.equal((await fetch(`${origin}/account`)).status, 401);
});

test("Supabase rate limits are visible, not reported as email success", async t => {
  const origin = await serve(t, authApp({
    origin: "https://notes.example", supabaseUrl: "https://example.supabase.co",
    publishableKey: "test-key",
    fetch: async () => new globalThis.Response(JSON.stringify({
      code: "over_email_send_rate_limit", msg: "Email rate limit exceeded",
    }), { status: 429, headers: { "content-type": "application/json" } }),
  }));
  const response = await fetch(`${origin}/login`, {
    method: "POST", headers: { origin: "https://notes.example" },
    body: new URLSearchParams({ email: "reader@example.com" }),
  });
  assert.equal(response.status, 429);
  assert(response.headers.getSetCookie().every(cookie => cookie.includes("Secure")));
});
