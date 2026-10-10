import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";
import { runInNewContext } from "node:vm";

test("shared progressive counter initializes and updates without owning submission", async () => {
  const script = await readFile(new URL("../public/app.js", import.meta.url), "utf8");
  let input: (() => void) | undefined;
  const details = { value: "hello", maxLength: 2000, addEventListener(event: string, listener: () => void) {
    assert.equal(event, "input"); input = listener;
  } };
  const counter = { textContent: "" };
  runInNewContext(script, { document: { querySelector: () => details, getElementById: () => counter } });
  assert.equal(counter.textContent, "5 / 2000 characters");
  details.value = "changed";
  input!();
  assert.equal(counter.textContent, "7 / 2000 characters");
  runInNewContext(script, { document: { querySelector: () => null, getElementById: () => null } });
});
