import { test } from "node:test";
import { strict as assert } from "node:assert";
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
