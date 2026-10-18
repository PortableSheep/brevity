import { createApp } from "@portablesheep/brevity";

const app = createApp();

app.router.get("/health", (_req, res) => {
  res.json({ ok: true });
});

app.router.post("/echo", (req, res) => {
  res.json({ body: req.body });
});

export default app.handler;
