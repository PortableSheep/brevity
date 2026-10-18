import test from "node:test";
import assert from "node:assert/strict";
import { createIslands, islandManifest } from "@portablesheep/brevity-islands";
import { html } from "@portablesheep/brevity-web";
import { readFile } from "node:fs/promises";
import { gzipSync } from "node:zlib";

test("island props/attributes escape, fallback survives with no JS, and loader is external", () => {
  const island = createIslands({
    manifest: "/assets/islands.json",
    loader: "/assets/loader.js",
    nonce: '"<&',
  });
  const markup = String(
    island(
      'name" onclick="attack',
      { value: '</script><img onerror="attack">&\u2028' },
      {
        hydrate: "interaction",
        fallback: html`<form method="post"><button>Save</button></form>`,
      },
    ),
  );
  assert.match(markup, /name&quot; onclick=&quot;attack/);
  assert.match(markup, /\\u003c\/script\\u003e/);
  assert.doesNotMatch(markup, /<img/);
  assert.match(markup, /<form method="post"><button>Save<\/button><\/form>/);
  assert.match(
    markup,
    /<script type="module" src="\/assets\/loader.js" nonce="&quot;&lt;&amp;"><\/script>/,
  );
  const encoded = markup.match(/data-props="([^"]*)"/)![1].replaceAll("&quot;", '"');
  assert.deepEqual(JSON.parse(encoded), { value: '</script><img onerror="attack">&\u2028' });
  for (const hydrate of ["load", "visible", "idle", "interaction"] as const) {
    assert.match(String(island("x", {}, { hydrate })), new RegExp(`data-hydrate="${hydrate}"`));
  }
  assert.throws(() => island("x", undefined), TypeError);
  assert.throws(() => island("x", 1n), TypeError);
  assert.throws(() => island("", {}), TypeError);
  assert.throws(() => island("x", {}, { hydrate: "bad" as never }), TypeError);
});

test("manifest and loader URLs are explicit same-origin canonical assets", () => {
  assert.deepEqual(islandManifest({ counter: "/assets/counter.js" }), {
    counter: "/assets/counter.js",
  });
  for (const url of [
    "javascript:alert(1)",
    "//example.com/x",
    "/a/../x",
    "/%2e/x",
    "/x?y",
    "/x\\y",
    "/é",
  ]) {
    assert.throws(() => islandManifest({ x: url }), TypeError);
    assert.throws(() => createIslands({ loader: url, manifest: "/manifest.json" }), TypeError);
    assert.throws(() => createIslands({ loader: "/loader.js", manifest: url }), TypeError);
  }
});

test("built standalone loader stays within its measured ~1 KB gzip budget", async () => {
  const loader = await readFile(new URL("../packages/islands/dist/loader.js", import.meta.url));
  assert.ok(gzipSync(loader).length <= 1100);
  assert.doesNotMatch(loader.toString(), /from\s*["'](?:@portablesheep\/brevity|@brevity\/)/);
});

test("createEnhance wraps content in a stable target with an external directive script", async () => {
  const { createEnhance } = await import("@portablesheep/brevity-islands");
  const enhanced = createEnhance({ script: "/assets/enhance.js", nonce: "n" });
  const markup = String(enhanced("rsvp", html`<form method="post"></form>`));
  assert.equal(
    markup,
    '<div id="rsvp" data-brevity-enhance><form method="post"></form></div><script type="module" src="/assets/enhance.js" nonce="n"></script>',
  );
  for (const id of ["", "1x", 'a"b', "a b"]) assert.throws(() => enhanced(id, html``), TypeError);
  assert.throws(() => createEnhance({ script: "//evil/x.js" }), TypeError);
  const script = await readFile(new URL("../packages/islands/dist/enhance.js", import.meta.url));
  assert.ok(gzipSync(script).length <= 1400);
  assert.doesNotMatch(script.toString(), /from\s*["'](?:@portablesheep\/brevity|@brevity\/)/);
});
