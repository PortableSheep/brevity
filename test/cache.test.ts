import test from "node:test";
import assert from "node:assert/strict";
import { CacheManager, MemoryCacheAdapter, NullCacheAdapter } from "@brevity/plugin-cache";

test("memory cache stores and retrieves", () => {
  const cache = new CacheManager(new MemoryCacheAdapter(), 10);
  cache.put("a", 123);
  assert.equal(cache.get("a"), 123);
  assert.equal(cache.has("a"), true);
});

test("null cache is safe no-op", () => {
  const cache = new CacheManager(new NullCacheAdapter(), 10);
  cache.put("a", 123);
  assert.equal(cache.has("a"), false);
  assert.equal(cache.get("a", "fallback"), "fallback");
});
