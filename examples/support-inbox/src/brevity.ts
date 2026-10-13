import { createApp, HttpError, type RouteHandler } from "@brevity/core";
import { html, renderPage, staticAssets } from "@brevity/web";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { Repository, InputError, isStatus, list, validate } from "./domain.js";
import { assets, bodyLimit, checkToken, configuration, headers, type Options } from "./config.js";
import { createView, detailView, inboxView, layout } from "./brevity-views.js";

export async function start(options: Options, port = 0) {
  const repository = await Repository.open(options.file);
  const app = createApp({
    parseBody: false,
    onError(error, _req, res) {
      const status = error instanceof InputError || error instanceof HttpError ? error.status : 500;
      renderPage(
        res,
        () =>
          html`<h1>${status}</h1>
            <p>
              ${status < 500 && error instanceof Error ? error.message : "Internal Server Error"}
            </p>`,
        undefined,
        { layout, status },
      );
    },
  });
  app.use(async (req, res, next) => {
    for (const [name, value] of Object.entries(headers)) res.header(name, value);
    try {
      return await next(req, res);
    } catch (error) {
      if (error instanceof InputError) throw new HttpError(error.status, error.message);
      throw error;
    }
  });
  app.use(
    staticAssets({
      "/assets/app.css": { file: resolve(assets, "app.css") },
      "/assets/app.js": { file: resolve(assets, "app.js") },
    }),
  );
  app.use(async (req, res, next) => {
    if (req.method === "POST") await req.parseBody(bodyLimit);
    return next(req, res);
  });
  const get = (path: string, handler: RouteHandler) => {
    app.router.get(path, handler);
    app.router.head(path, handler);
  };
  get("/", (_req, res) => res.redirect("/requests/new", 303));
  get("/requests/new", (_req, res) =>
    renderPage(res, () => createView(options.token), undefined, { layout }),
  );
  app.router.post("/requests", async (req, res) => {
    const input = await req.parseBody(bodyLimit);
    checkToken(input, options.token);
    const { values, errors } = validate(input);
    if (Object.keys(errors).length) {
      renderPage(res, () => createView(options.token, values, errors), undefined, {
        layout,
        status: 422,
      });
      return;
    }
    const ticket = await repository.create(values);
    res.redirect(`/requests/${ticket.id}`, 303);
  });
  get("/inbox", (req, res) =>
    renderPage(res, inboxView, list(repository.all(), req.query), { layout }),
  );
  get("/requests/:id", (req, res) =>
    renderPage(res, () => detailView(repository.find(req.params.id), options.token), undefined, {
      layout,
    }),
  );
  app.router.post("/requests/:id/status", async (req, res) => {
    const input = await req.parseBody(bodyLimit);
    checkToken(input, options.token);
    const ticket = repository.find(req.params.id);
    if (!isStatus(input.status)) {
      renderPage(
        res,
        () => detailView(ticket, options.token, { status: ["Choose open or closed."] }),
        undefined,
        { layout, status: 422 },
      );
      return;
    }
    await repository.update(ticket.id, input.status);
    res.redirect(`/requests/${ticket.id}`, 303);
  });
  app.router.setNotFound((_req, res) =>
    renderPage(
      res,
      () =>
        html`<h1>404</h1>
          <p>Not Found</p>`,
      undefined,
      { layout, status: 404 },
    ),
  );
  const server = app.listen(port, "127.0.0.1");
  await new Promise<void>((resolve, reject) => {
    server.once("listening", resolve);
    server.once("error", reject);
  });
  return server;
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const options = configuration();
  const server = await start(options, options.port);
  console.log("Brevity support inbox:", server.address(), "storage:", options.file);
}
