import assert from "node:assert/strict";
import { mkdir, mkdtemp, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { Repository, validate } from "../src/domain.js";

test("repository validates storage, paths, serialization, isolation and retry semantics", async (t) => {
  const directory = await mkdtemp(join(tmpdir(), "support-inbox-store-"));
  t.after(() => rm(directory, { recursive: true }));
  const file = join(directory, "requests.json");
  await assert.rejects(Repository.open("relative.json"), /must be absolute/);
  for (const contents of ["not-json", "{}", "[{}]", '[{"name":3}]']) {
    await writeFile(file, contents);
    await assert.rejects(Repository.open(file));
    assert.equal(await readFile(file, "utf8"), contents);
  }
  await rm(file);
  await writeFile(file, "not a directory");
  await assert.rejects(Repository.open(join(file, "nested.json")));
  assert.equal(await readFile(file, "utf8"), "not a directory");
  await rm(file);
  await mkdir(file);
  await assert.rejects(Repository.open(file));
  await rm(file, { recursive: true });
  const repository = await Repository.open(file);
  const values = {
    name: "Demo",
    email: "demo@example.test",
    subject: "Question",
    details: "Details",
  };
  const tickets = await Promise.all(Array.from({ length: 20 }, () => repository.create(values)));
  assert.equal(new Set(tickets.map((ticket) => ticket.id)).size, 20);
  assert.equal((await Repository.open(file)).all().length, 20);
  await Promise.all(tickets.map((ticket) => repository.update(ticket.id, "closed")));
  assert((await Repository.open(file)).all().every((ticket) => ticket.status === "closed"));
  const snapshot = repository.all();
  snapshot[0].name = "Mutated";
  assert.equal(repository.find(snapshot[0].id).name, "Demo");
  const returned = repository.find(snapshot[0].id);
  returned.details = "Mutated";
  assert.equal(repository.find(returned.id).details, "Details");
  await assert.rejects(repository.update(tickets[0].id, "removed"), /Invalid status/);
  await assert.rejects(repository.update("missing", "closed"), /not found/);
  await assert.rejects(repository.create({ ...values, email: "bad" }), /Invalid request/);
  assert.equal((await repository.create(values)).status, "open");
  const stored = JSON.parse(await readFile(file, "utf8"));
  await writeFile(file, JSON.stringify([...stored, stored[0]]));
  await assert.rejects(Repository.open(file), /Invalid stored request/);
  assert.deepEqual((await readdir(directory)).sort(), ["requests.json"]);
  assert.equal(Object.keys(validate({ ...values, name: null }).errors).length, 1);
});
