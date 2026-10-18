import type { App, Viewer } from "@portablesheep/brevity";
import { UserService } from "../services/user-service.js";
import { NoteService } from "../services/note-service.js";

export function registerHomeRoutes(app: App): void {
  app.router.get("/", (_req, res, container) => {
    const viewer = container?.get<Viewer>("viewer");
    const users = container?.get<UserService>("users").all() ?? [];
    const notes = container?.get<NoteService>("notes").all() ?? [];

    const html = viewer?.render("home.html", {
      title: "Brevity Reference App",
      userCount: users.length,
      noteCount: notes.length,
      uptime: Math.round(process.uptime()),
      env: process.env.NODE_ENV ?? "development",
    });
    res.header("content-type", "text/html; charset=utf-8").send(html ?? "Brevity");
  });
}
