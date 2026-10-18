import { fileURLToPath } from "node:url";
import { createApp, HttpError, type Request } from "@portablesheep/brevity";
import { createViews } from "@portablesheep/brevity-views";
import { html } from "@portablesheep/brevity-web";

const app = createApp({ maxBodyBytes: 1024 });
const views = createViews({ root: fileURLToPath(new URL("./views/", import.meta.url)) });

app.use(async (req, res, next) => {
  res.header("cache-control", "no-store");
  return next(req, res);
});

app.router.get("/", (_req, res) => views.render(res, "index", {}));

app.router.get("/health", (_req, res) => res.json({ ok: true }));
app.router.head("/health", (_req, res) => res.status(200).send(""));

app.router.post("/echo", (req, res) =>
  res.json({ body: req.body, form: req.form ? [...req.form] : null }),
);

app.router.post("/form", (req, res) => {
  const name = req.body?.name;
  if (typeof name !== "string" || !name.trim() || name.length > 80) {
    return res.status(422).send(html`<p role="alert">Enter a name of 1-80 characters.</p>`);
  }
  res.redirect(`/hello?name=${encodeURIComponent(name)}`, 303);
});

app.router.get("/hello", (req, res) =>
  res.send(html`<h1>Hello, ${req.get<string>("name", "reader")}!</h1>`),
);

app.router.get("/cookies", (_req, res) => {
  res.raw.setHeader("set-cookie", [
    "brevity_first=1; Path=/; HttpOnly; Secure; SameSite=Lax",
    "brevity_second=2; Path=/; HttpOnly; Secure; SameSite=Lax",
  ]);
  res.redirect("/health", 303);
});

app.router.get("/scope/{i:id}", async (req, res, container) => {
  await new Promise<void>((resolve) => setImmediate(resolve));
  if (!container || container.get<Request>("request") !== req) {
    throw new Error("Request scope mismatch");
  }
  res.json({ id: req.param("id") });
});

app.router.get("/binary", (_req, res) => {
  res.raw.setHeader("content-type", "application/octet-stream");
  res.raw.end(Buffer.from([0, 1, 127, 128, 255]));
});

app.router.get("/conflict", () => {
  throw new HttpError(409, "Example conflict");
});

export default app.handler;
