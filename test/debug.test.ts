import { test } from "node:test";
import { strict as assert } from "node:assert";
import { once } from "node:events";
import { createApp } from "@brevity/core";
import { DebugService } from "@brevity/plugin-debug";

test("debug service logs when enabled", () => {
  const debug = new DebugService({ enabled: true });
  debug.info("test message", { key: "value" });
  const logs = debug.getLogs();
  assert.equal(logs.length, 1);
  assert.equal(logs[0].level, "info");
  assert.equal(logs[0].message, "test message");
  assert.deepStrictEqual(logs[0].data, { key: "value" });
});

test("debug service ignores logs when disabled", () => {
  const debug = new DebugService({ enabled: false });
  debug.info("test message");
  const logs = debug.getLogs();
  assert.equal(logs.length, 0);
});

test("debug service respects verbose flag", () => {
  const debug = new DebugService({ enabled: true, verbose: false });
  debug.debug("verbose message");
  assert.equal(debug.getLogs().length, 0);
  
  const verbose = new DebugService({ enabled: true, verbose: true });
  verbose.debug("verbose message");
  assert.equal(verbose.getLogs().length, 1);
});

test("debug service max logs limit", () => {
  const debug = new DebugService({ enabled: true });
  for (let i = 0; i < 150; i++) {
    debug.info(`message ${i}`);
  }
  // Should keep only last 100
  assert.equal(debug.getLogs().length, 100);
});

test("debug service clear", () => {
  const debug = new DebugService({ enabled: true });
  debug.info("message 1");
  debug.warn("message 2");
  assert.equal(debug.getLogs().length, 2);
  debug.clear();
  assert.equal(debug.getLogs().length, 0);
});

test("debug service renders error page", () => {
  const debug = new DebugService({ enabled: true });
  debug.info("test log");
  const error = new Error("Test error");
  const html = debug.renderErrorPage(error, { path: "/test" });
  assert(html.includes("Test error"));
  assert(html.includes("test log"));
  assert(html.includes("<!doctype html>"));
  assert(html.includes("Debug Error"));
});

test("disabled debug rendering never reads error or request details", () => {
  const error = new Error("private error");
  Object.defineProperty(error, "stack", {
    get() { throw new Error("stack must not be read"); },
  });
  Object.defineProperty(error, "message", {
    get() { throw new Error("message must not be read"); },
  });
  const requestInfo = {
    toJSON() { throw new Error("request must not be serialized"); },
  };
  for (const debug of [new DebugService(), new DebugService({ enabled: false })]) {
    assert.equal(
      debug.renderErrorPage(error, requestInfo),
      "<!doctype html><title>Internal Server Error</title><h1>Internal Server Error</h1>",
    );
  }
});

test("disabling debug rendering hides retained logs and can be re-enabled", () => {
  const debug = new DebugService({ enabled: true });
  debug.info("private log");
  const error = new Error("private error");
  const requestInfo = { token: "private token" };
  debug.setEnabled(false);
  const html = debug.renderErrorPage(error, requestInfo);
  assert.equal(html.includes("private"), false);
  assert.equal(html.includes("Debug Error"), false);
  debug.setEnabled(true);
  const diagnosticHtml = debug.renderErrorPage(error, requestInfo);
  for (const detail of ["private log", "private error", "private token"]) {
    assert(diagnosticHtml.includes(detail));
  }
});

test("debug error responses respect enabled at request time", async t => {
  const debug = new DebugService({ enabled: true });
  debug.info("private log");
  const app = createApp();
  app.router.get("/", (_req, res) => {
    debug.renderErrorResponse(res, new Error("private error"), { token: "private token" });
  });
  const server = app.listen(0);
  t.after(async () => {
    server.closeAllConnections();
    await new Promise<void>((resolve, reject) => {
      server.close(error => error ? reject(error) : resolve());
    });
  });
  await once(server, "listening");
  const address = server.address();
  assert(address && typeof address !== "string");
  const url = `http://127.0.0.1:${address.port}`;
  for (const enabled of [true, false, true]) {
    debug.setEnabled(enabled);
    const response = await fetch(url);
    assert.equal(response.status, 500);
    assert.equal(response.headers.get("content-type"), "text/html; charset=utf-8");
    const html = await response.text();
    for (const detail of ["private error", "private log", "private token", "Debug Error"]) {
      assert.equal(html.includes(detail), enabled);
    }
    if (!enabled) assert(html.includes("Internal Server Error"));
  }
});
