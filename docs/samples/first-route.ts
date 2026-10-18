import { createApp } from "@portablesheep/brevity";

export const app = createApp();
app.router.get("/", (_req, res) => res.json({ message: "Hello, Brevity" }));
