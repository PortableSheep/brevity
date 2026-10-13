import test, { type TestContext } from "node:test";
import assert from "node:assert/strict";
import { once } from "node:events";
import { request as httpRequest } from "node:http";
import { createConnection } from "node:net";
import {
  createApp,
  HttpError,
  Request,
  ServiceProvider,
  type App,
  type CreateAppOptions,
} from "@brevity/core";

async function serve(t: TestContext, app: App): Promise<string> {
  const server = app.listen(0);
  t.after(async () => {
    server.closeAllConnections();
    await new Promise<void>((resolve, reject) => {
      server.close((error) => (error ? reject(error) : resolve()));
    });
  });
  await once(server, "listening");
  const address = server.address();
  assert(address && typeof address !== "string");
  return `http://127.0.0.1:${address.port}`;
}

function echo(options: CreateAppOptions = {}): App {
  const app = createApp(options);
  app.router.post("/", (req, res) =>
    res.json({ body: req.body, form: req.form ? [...req.form] : null }),
  );
  return app;
}

async function post(url: string, body: string, contentType = "application/json") {
  return fetch(url, { method: "POST", headers: { "content-type": contentType }, body });
}

test("bounded parser accepts object JSON and forms, caches parses and exposes repeated fields", async (t) => {
  const app = echo();
  app.use(async (req, res, next) => {
    const first = req.body;
    assert.equal(await req.parseBody(), first);
    return next(req, res);
  });
  const url = await serve(t, app);
  assert.deepEqual(
    await (await post(url, '{"value":42}', "application/example+json; charset=utf-8")).json(),
    { body: { value: 42 }, form: null },
  );
  assert.deepEqual(
    await (
      await post(url, "choice=a&choice=b&name=Jos%C3%A9+Smith", "application/x-www-form-urlencoded")
    ).json(),
    {
      body: { choice: "b", name: "Jos\u00e9 Smith" },
      form: [
        ["choice", "a"],
        ["choice", "b"],
        ["name", "Jos\u00e9 Smith"],
      ],
    },
  );
  assert.deepEqual(await (await post(url, "")).json(), { body: {}, form: null });
});

test("malformed JSON and nonobject JSON are controlled 400s and server stays usable", async (t) => {
  const url = await serve(t, echo());
  for (const body of ["{", "null", "[]", "true", '"value"', "42"]) {
    const response = await post(url, body);
    assert.equal(response.status, 400, body);
    assert.equal("detail" in (await response.json()), false);
  }
  assert.equal((await post(url, "{}")).status, 200);
});

test("malformed percent encoded forms are controlled 400s", async (t) => {
  const url = await serve(t, echo());
  for (const body of ["value=%", "value=%ZZ", "value=%C3%28"]) {
    assert.equal((await post(url, body, "application/x-www-form-urlencoded")).status, 400);
  }
});

test("unsupported nonempty media/encodings are 415; empty untyped bodies accepted", async (t) => {
  const url = await serve(t, echo());
  for (const type of ["text/plain", "multipart/form-data; boundary=x", "application/jsonp"]) {
    assert.equal((await post(url, "hello", type)).status, 415);
  }
  assert.equal(
    (
      await fetch(url, {
        method: "POST",
        headers: { "content-encoding": "gzip", "content-type": "application/json" },
        body: "{}",
      })
    ).status,
    415,
  );
  assert.equal((await fetch(url, { method: "POST" })).status, 200);
});

test("streamed invalid UTF8 is rejected instead of replaced", async (t) => {
  const url = await serve(t, echo());
  const status = await new Promise<number>((resolve) => {
    const req = httpRequest(
      url,
      { method: "POST", headers: { "content-type": "application/x-www-form-urlencoded" } },
      (res) => {
        res.resume();
        resolve(res.statusCode ?? 0);
      },
    );
    req.end(Buffer.from([0x61, 0x3d, 0xc3, 0x28]));
  });
  assert.equal(status, 400);
});

test("Content-Length and chunked uploads enforce exact byte limit", async (t) => {
  const url = await serve(t, echo({ maxBodyBytes: 7 }));
  assert.equal((await post(url, '{"a":1}')).status, 200);
  assert.equal((await post(url, '{"a":12}')).status, 413);
  const response = await new Promise<{ status: number; body: string }>((resolve, reject) => {
    const req = httpRequest(
      url,
      { method: "POST", headers: { "content-type": "application/json" } },
      (res) => {
        let body = "";
        res.setEncoding("utf8");
        res.on("data", (chunk) => {
          body += chunk;
        });
        res.on("end", () => resolve({ status: res.statusCode ?? 0, body }));
      },
    );
    req.on("error", reject);
    req.write('{"a":');
    req.end("1234}");
  });
  assert.equal(response.status, 413);
  assert.deepEqual(JSON.parse(response.body), { error: "Payload Too Large" });
  assert.equal((await post(url, "{}")).status, 200);
});

test("limits count UTF8 bytes rather than string characters", async (t) => {
  const body = '{"value":"\u00e9"}';
  const url = await serve(t, echo({ maxBodyBytes: Buffer.byteLength(body) - 1 }));
  assert.equal((await post(url, body)).status, 413);
});

test("invalid configured bounds fail at startup, zero only accepts empty bodies", async (t) => {
  for (const maxBodyBytes of [-1, NaN, Infinity, 0.5]) {
    assert.throws(() => createApp({ maxBodyBytes }), /non-negative safe integer/);
  }
  assert.throws(() => new HttpError(200, "bad"), /between 400 and 599/);
  const url = await serve(t, echo({ maxBodyBytes: 0 }));
  assert.equal((await post(url, "")).status, 200);
  assert.equal((await post(url, "{}")).status, 413);
});

test("explicit parser opt-out leaves raw stream for an application-owned reader", async (t) => {
  const app = createApp({ parseBody: false });
  app.router.post("/", async (req, res) => {
    assert.equal(req.body, null);
    res.json(await req.parseBody(16));
  });
  const url = await serve(t, app);
  assert.deepEqual(await (await post(url, '{"raw":true}')).json(), { raw: true });
});

test("request container bindings stay isolated across asynchronous concurrent handlers", async (t) => {
  const app = createApp();
  app.container.singleton("shared", () => ({}));
  const singleton = app.container.get("shared");
  let arrived = 0;
  let release!: () => void;
  const ready = new Promise<void>((resolve) => {
    release = resolve;
  });
  app.router.get("/:id", async (req, res, container) => {
    assert(container);
    assert.equal(container.get("shared"), singleton);
    assert.equal(container.get("request"), req);
    if (++arrived === 20) release();
    await ready;
    assert.equal(container.get("request"), req);
    assert.equal(container.get("response"), res);
    res.json({ id: container.get<Request>("request").param("id") });
  });
  const url = await serve(t, app);
  const answers = await Promise.all(
    Array.from({ length: 20 }, async (_, i) => (await fetch(`${url}/${i}`)).json()),
  );
  assert.deepEqual(
    answers,
    Array.from({ length: 20 }, (_, i) => ({ id: String(i) })),
  );
  assert.equal(app.container.has("request"), false);
  assert.equal(app.container.has("response"), false);
});

test("error hook gets parsed-body failures and unknown errors without default details", async (t) => {
  const errors: unknown[] = [];
  const app = echo({
    onError(error, req, res) {
      errors.push(error);
      assert(req);
      res
        .status(error instanceof HttpError ? error.status : 500)
        .send("<h1>Controlled failure</h1>");
    },
  });
  app.router.get("/broken", () => {
    throw new Error("private credentials");
  });
  const url = await serve(t, app);
  const malformed = await post(url, "{");
  assert.equal(malformed.status, 400);
  assert.equal(await malformed.text(), "<h1>Controlled failure</h1>");
  const broken = await fetch(`${url}/broken`);
  assert.equal(broken.status, 500);
  assert.equal((await broken.text()).includes("credentials"), false);
  assert.equal(errors.length, 2);
});

test("hook throwing or not sending falls back to controlled error response", async (t) => {
  for (const onError of [
    () => {},
    () => {
      throw new Error("hook failed");
    },
  ]) {
    const app = echo({ onError });
    const url = await serve(t, app);
    const result = await post(url, "{");
    assert.equal(result.status, 400);
    assert.deepEqual(await result.json(), { error: "Invalid JSON Body" });
  }
});

test("listen catches unexpected rejected dispatch promises", async (t) => {
  const app = createApp();
  app.router.dispatch = async () => {
    throw new Error("unexpected boundary failure");
  };
  const url = await serve(t, app);
  const response = await fetch(url);
  assert.equal(response.status, 500);
  assert.deepEqual(await response.json(), { error: "Internal Server Error" });
});

test("provider boot failures are within the controlled request lifecycle", async (t) => {
  class BrokenProvider extends ServiceProvider {
    override boot(): void {
      throw new Error("private boot configuration");
    }
  }
  const app = createApp();
  app.container.registerProvider(new BrokenProvider());
  const url = await serve(t, app);
  const response = await fetch(url);
  assert.equal(response.status, 500);
  assert.deepEqual(await response.json(), { error: "Internal Server Error" });
});

test("middleware failures and explicit HttpErrors preserve safe status semantics", async (t) => {
  const app = createApp();
  app.use(() => {
    throw new HttpError(403, "Forbidden");
  });
  const url = await serve(t, app);
  const response = await fetch(url);
  assert.equal(response.status, 403);
  assert.deepEqual(await response.json(), { error: "Forbidden" });
});

test("errors after completed response do not attempt a second response", async (t) => {
  const app = createApp();
  app.router.get("/", (_req, res) => {
    res.send("finished");
    throw new Error("after response");
  });
  const url = await serve(t, app);
  assert.equal(await (await fetch(url)).text(), "finished");
  assert.equal(await (await fetch(url)).text(), "finished");
});

test("aborted upload rejects dispatch safely and leaves listener responsive", async (t) => {
  const url = await serve(t, echo());
  const target = new URL(url);
  const socket = createConnection({ port: Number(target.port), host: "127.0.0.1" });
  await once(socket, "connect");
  socket.write(
    "POST / HTTP/1.1\r\nHost: localhost\r\nContent-Type: application/json\r\nContent-Length: 100\r\n\r\n{",
  );
  // Wait until the server is reading the partial body before disconnecting.
  await new Promise<void>((resolve) => setTimeout(resolve, 30));
  const closed = once(socket, "close");
  socket.destroy();
  await closed;
  assert.equal((await post(url, "{}")).status, 200);
});

test("route literals are escaped and captures decode once with invalid encodings rejected", async (t) => {
  const app = createApp();
  app.router.get("/assets/app.js", (_req, res) => res.send("asset"));
  app.router.get("/names/:name", (req, res) => res.json(req.param("name")));
  const url = await serve(t, app);
  assert.equal((await fetch(`${url}/assets/appXjs`)).status, 404);
  assert.equal(await (await fetch(`${url}/names/Jos%C3%A9`)).json(), "Jos\u00e9");
  assert.equal((await fetch(`${url}/names/%ZZ`)).status, 400);
});

test("scope overrides compose without changing root bindings or singleton lifetime", () => {
  const { container } = createApp();
  container.instance("value", "root");
  const outer = new Map([["value", "outer"]]);
  container.runScoped(outer, () => {
    assert.equal(container.get("value"), "outer");
    container.runScoped(new Map([["value", "inner"]]), () => {
      assert.equal(container.get("value"), "inner");
    });
    assert.equal(container.get("value"), "outer");
  });
  assert.equal(container.get("value"), "root");
});
