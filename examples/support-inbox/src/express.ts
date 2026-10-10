import express, { type ErrorRequestHandler } from "express";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { Repository, InputError, isStatus, list, validate } from "./domain.js";
import { assets, bodyLimit, checkToken, configuration, headers, type Options } from "./config.js";
import { createView, detailView, inboxView, layout, errorView } from "./express-views.js";

export async function start(options: Options, port = 0) {
  const repository = await Repository.open(options.file);
  const app = express();
  app.disable("x-powered-by");
  app.set("strict routing", true);
  app.set("case sensitive routing", true);
  app.use((_req, res, next) => { res.set(headers); next(); });
  for (const name of ["app.css", "app.js"]) {
    app.all(`/assets/${name}`, (req, res, next) => {
      if (req.originalUrl.split("?")[0] !== `/assets/${name}`) { next(); return; }
      if (req.method !== "GET" && req.method !== "HEAD") {
        res.set("Allow", "GET, HEAD").status(405).send(errorView(405, "Method Not Allowed")); return;
      }
      res.sendFile(resolve(assets, name), { cacheControl: false, etag: false, lastModified: false,
        headers: { "Cache-Control": "no-cache" } }, error => { if (error) next(error); });
    });
  }
  const parse = express.text({ type: ["application/json", "application/*+json", "application/x-www-form-urlencoded"],
    limit: bodyLimit, inflate: false, verify(_req, _res, buffer) {
      try { new TextDecoder("utf-8", { fatal: true }).decode(buffer); }
      catch { throw new InputError(400, "Invalid UTF-8 Body"); }
    } });
  app.use((req, res, next) => {
    if (req.method !== "POST") { next(); return; }
    parse(req, res, error => {
      if (error) { next(error); return; }
      try {
        const raw = req.body;
        if (raw === undefined && !req.headers["transfer-encoding"]
          && (!req.headers["content-length"] || req.headers["content-length"] === "0")) {
          req.body = {}; next(); return;
        }
        if (typeof raw !== "string") throw new InputError(415, "Unsupported Media Type");
        if (req.is("application/x-www-form-urlencoded")) {
          decodeURIComponent(raw.replaceAll("+", " "));
          req.body = Object.fromEntries(new URLSearchParams(raw));
        } else {
          const value: unknown = JSON.parse(raw);
          if (!value || typeof value !== "object" || Array.isArray(value)) throw new InputError(400, "JSON Body Must Be an Object");
          req.body = value;
        }
        next();
      } catch (error) {
        next(error instanceof SyntaxError || error instanceof URIError ? new InputError(400, "Invalid Body Encoding") : error);
      }
    });
  });
  app.get("/", (_req, res) => res.redirect(303, "/requests/new"));
  app.get("/requests/new", (_req, res) => res.send(layout(createView(options.token))));
  app.post("/requests", async (req, res) => {
    checkToken(req.body, options.token);
    const { values, errors } = validate(req.body);
    if (Object.keys(errors).length) { res.status(422).send(layout(createView(options.token, values, errors))); return; }
    const ticket = await repository.create(values);
    res.redirect(303, `/requests/${ticket.id}`);
  });
  app.get("/inbox", (req, res) => res.send(layout(inboxView(list(repository.all(),
    Object.fromEntries(new URL(req.originalUrl, "http://localhost").searchParams))))));
  app.get("/requests/:id", (req, res) => res.send(layout(detailView(repository.find(req.params.id), options.token))));
  app.post("/requests/:id/status", async (req, res) => {
    checkToken(req.body, options.token);
    const ticket = repository.find(req.params.id);
    if (!isStatus(req.body.status)) {
      res.status(422).send(layout(detailView(ticket, options.token, { status: ["Choose open or closed."] }))); return;
    }
    await repository.update(ticket.id, req.body.status);
    res.redirect(303, `/requests/${ticket.id}`);
  });
  app.use((_req, res) => res.status(404).send(layout(errorView(404, "Not Found"))));
  const handleError: ErrorRequestHandler = (error, _req, res, next) => {
    if (res.headersSent) { next(error); return; }
    const status = error instanceof InputError ? error.status
      : error?.type === "entity.too.large" ? 413 : error?.type === "encoding.unsupported" ? 415
      : error?.type === "entity.verify.failed" || error?.type === "request.aborted" ? 400
      : error instanceof URIError ? 400 : 500;
    if (status >= 500) console.error("[support-inbox] request failed", error);
    res.status(status).send(layout(errorView(status, status < 500 ? error.message : "Internal Server Error")));
  };
  app.use(handleError);
  const server = app.listen(port, "127.0.0.1");
  await new Promise<void>((resolve, reject) => { server.once("listening", resolve); server.once("error", reject); });
  return server;
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const options = configuration();
  const server = await start(options, options.port);
  console.log("Express support inbox:", server.address(), "storage:", options.file);
}
