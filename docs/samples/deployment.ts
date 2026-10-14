import { createApp } from "@brevity/core";

const app = createApp();

app.router.get("/health", (_req, res) => {
  res.json({ ok: true });
});

app.router.post("/echo", (req, res) => {
  res.json({ body: req.body });
});

export default app.handler;
