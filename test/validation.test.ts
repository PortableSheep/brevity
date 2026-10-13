import test from "node:test";
import assert from "node:assert/strict";
import { IncomingMessage } from "node:http";
import { Socket } from "node:net";
import { Request, Validator } from "@brevity/core";

test("validator rejects unknown rules instead of accepting unchecked input", () => {
  const validator = new Validator();
  for (const value of ["bad email", undefined, null]) {
    for (const rules of ["required|emial", ["emial"]]) {
      assert.throws(() => validator.validate({ email: value }, { email: rules }), {
        name: "TypeError",
        message: 'Unknown validation rule "emial" for "email".',
      });
    }
  }
});

test("validator rejects malformed rules even when the value is optional", () => {
  const validator = new Validator();
  for (const rule of [
    "",
    "email|",
    "min",
    "max:",
    "min:-1",
    "max:1.5",
    "min:NaN",
    "max:Infinity",
    "min:9007199254740992",
    "max:1:2",
    "required:1",
  ]) {
    assert.throws(() => validator.validate({}, { value: rule }), TypeError, rule);
  }
});

test("supported rules preserve validation messages and original values", () => {
  const validator = new Validator();
  const data = { email: "bad", integer: "1.5", slug: "Bad Slug", small: "x", large: "long" };
  const result = validator.validate(data, {
    missing: "required",
    email: "email",
    integer: "int",
    slug: "slug",
    small: "min:2",
    large: "max:3",
  });
  assert.equal(result.passes(), false);
  assert.equal(result.fails(), true);
  assert.deepEqual(result.errors(), {
    missing: ["missing is required."],
    email: ["email must be a valid email."],
    integer: ["integer must be an integer."],
    slug: ["slug must be a slug."],
    small: ["small must be at least 2."],
    large: ["large must be at most 3."],
  });
  assert.deepEqual(result.validated(), { missing: undefined, ...data });
  assert(
    validator
      .validate(
        { email: "a@example.com", integer: "-12", slug: "a-b", text: "" },
        {
          email: "required|email",
          integer: ["int"],
          slug: "slug",
          text: "min:0|max:0",
          absent: "email|int|slug|min:1|max:2",
        },
      )
      .passes(),
  );
});

test("request validation uses the same strict rule engine", () => {
  const socket = new Socket();
  try {
    const raw = new IncomingMessage(socket);
    raw.url = "/?email=bad";
    const req = new Request(raw);
    assert.throws(() => req.validate({ email: "emial" }), TypeError);
    assert.equal(req.validate({ email: "email" }).fails(), true);
  } finally {
    socket.destroy();
  }
});
