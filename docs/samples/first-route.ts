import { createApp } from "@brevity/core";

export const app = createApp();
app.router.get("/", (_req, res) => res.json({ message: "Hello, Brevity" }));
