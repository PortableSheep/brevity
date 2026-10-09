import test, { type TestContext } from "node:test";
import assert from "node:assert/strict";
import { once } from "node:events";
import { createApp, type App, type Container, type Request, type Response } from "@brevity/core";
import {
  Controller, Get, Post, Put, Patch, Delete, Head, Options, Route, registerControllers,
} from "@brevity/core/decorators";
import { createControllerApp } from "../examples/controllers.js";

async function serve(t: TestContext, app: App): Promise<string> {
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
  return `http://127.0.0.1:${address.port}`;
}

test("optional decorator entry point does not change the core exports", async () => {
  const core = await import("@brevity/core");
  assert.equal("Controller" in core, false);
  assert.equal("registerControllers" in core, false);
});

test("controller example uses constructor injection and typed route params", async t => {
  const url = await serve(t, createControllerApp());
  const response = await fetch(`${url}/users/42`);
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { id: "42", name: "Brevity" });
  assert.equal((await fetch(`${url}/users/not-a-number`)).status, 404);
});

test("decorated HTTP verbs use existing middleware, body parsing, and container", async t => {
  const app = createApp();
  app.container.instance("label", "injected");
  app.use(async (req, res, next) => {
    res.header("x-middleware", "yes");
    return next(req, res);
  });

  @Controller("/verbs/")
  class VerbsController {
    @Get()
    @Post()
    @Put()
    @Patch()
    @Delete()
    @Head()
    @Options()
    async handle(req: Request, res: Response, container: Container | null): Promise<void> {
      await Promise.resolve();
      res.json({ method: req.method, body: req.body, label: container?.get("label") });
    }
  }
  registerControllers(app.router, new VerbsController());
  const url = await serve(t, app);
  for (const method of ["GET", "POST", "PUT", "PATCH", "DELETE", "HEAD", "OPTIONS"]) {
    const hasBody = method !== "GET" && method !== "HEAD";
    const response = await fetch(`${url}/verbs`, {
      method,
      ...(hasBody ? { headers: { "content-type": "application/json" }, body: '{"name":"test"}' } : {}),
    });
    assert.equal(response.status, 200, method);
    assert.equal(response.headers.get("x-middleware"), "yes");
    if (method === "HEAD") {
      assert.equal(await response.text(), "");
    } else {
      assert.deepEqual(await response.json(), {
        method, body: hasBody ? { name: "test" } : null, label: "injected",
      });
    }
  }
});

test("root routes, symbol methods, and callback routes coexist in registration order", async t => {
  const key = Symbol("endpoint");
  @Controller("/")
  class RootController {
    @Get()
    root(_req: Request, res: Response): void { res.send("root"); }

    @Route("GET", "/symbol")
    [key](_req: Request, res: Response): void { res.send("symbol"); }

    @Get("/first")
    first(_req: Request, res: Response): void { res.send("decorated"); }
  }
  const app = createApp();
  app.router.get("/first", (_req, res) => res.send("callback"));
  registerControllers(app.router, new RootController());
  const url = await serve(t, app);
  assert.equal(await (await fetch(url)).text(), "root");
  assert.equal(await (await fetch(`${url}/symbol`)).text(), "symbol");
  assert.equal(await (await fetch(`${url}/first`)).text(), "callback");
});

test("inherited routes bind this to the registered instance and overrides shadow them", async t => {
  class Base {
    label = "base";

    @Get("/inherited")
    inherited(_req: Request, res: Response): void { res.send(this.label); }

    @Get("/old")
    replaced(_req: Request, res: Response): void { res.send("old"); }

    @Get("/hidden")
    hidden(_req: Request, res: Response): void { res.send("base"); }
  }
  @Controller("/child")
  class Child extends Base {
    override label = "child";

    @Get("/new")
    override replaced(_req: Request, res: Response): void { res.send(this.label); }

    override hidden(_req: Request, res: Response): void { res.send("undecorated"); }
  }
  const app = createApp();
  registerControllers(app.router, new Child());
  const url = await serve(t, app);
  assert.equal(await (await fetch(`${url}/child/inherited`)).text(), "child");
  assert.equal(await (await fetch(`${url}/child/new`)).text(), "child");
  assert.equal((await fetch(`${url}/child/old`)).status, 404);
  assert.equal((await fetch(`${url}/child/hidden`)).status, 404);
});

test("controller instances and apps do not share mutable state", async t => {
  @Controller("/count")
  class Counter {
    count = 0;
    @Get()
    handle(_req: Request, res: Response): void { res.json(++this.count); }
  }
  const first = createApp();
  const second = createApp();
  registerControllers(first.router, new Counter());
  registerControllers(second.router, new Counter());
  const url1 = await serve(t, first);
  const url2 = await serve(t, second);
  assert.equal(await (await fetch(`${url1}/count`)).json(), 1);
  assert.equal(await (await fetch(`${url1}/count`)).json(), 2);
  assert.equal(await (await fetch(`${url2}/count`)).json(), 1);
});

test("async controller errors use the existing router error response", async t => {
  @Controller()
  class Broken {
    @Get("/broken")
    async handle(): Promise<void> { throw new Error("controller failure"); }
  }
  const app = createApp();
  registerControllers(app.router, new Broken());
  const url = await serve(t, app);
  const response = await fetch(`${url}/broken`);
  assert.equal(response.status, 500);
  assert.deepEqual(await response.json(), {
    error: "Internal Server Error",
  });
});

test("invalid decorator usage fails explicitly", () => {
  assert.throws(() => Controller("users"), /must be empty or start/);
  assert.throws(() => Get("users"), /must be empty or start/);
  assert.throws(() => {
    class Static {
      @Get()
      static handle(): void {}
    }
    return Static;
  }, /public instance methods/);
  assert.throws(() => {
    class Private {
      @Get()
      #handle(): void {}
    }
    return Private;
  }, /public instance methods/);
  assert.throws(() => registerControllers(createApp().router, {}), /must have @Controller/);
});

test("invalid controller in a batch does not register earlier controllers", async t => {
  @Controller()
  class Valid {
    @Get("/valid")
    handle(_req: Request, res: Response): void { res.send("valid"); }
  }
  const app = createApp();
  assert.throws(() => registerControllers(app.router, new Valid(), {}), /must have @Controller/);
  const url = await serve(t, app);
  assert.equal((await fetch(`${url}/valid`)).status, 404);
});
