import test from "node:test";
import assert from "node:assert/strict";
import { Container } from "@portablesheep/brevity";

test("container singleton returns same instance", () => {
  const container = new Container();
  container.singleton("x", () => ({ id: 1 }));
  assert.equal(container.get("x"), container.get("x"));
});

test("container bind returns fresh instance", () => {
  const container = new Container();
  container.bind("x", () => ({ id: Math.random() }));
  assert.notEqual(container.get("x"), container.get("x"));
});
