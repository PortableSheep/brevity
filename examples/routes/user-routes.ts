import type { App, Validator } from "@brevity/core";
import { CacheManager } from "@brevity/plugin-cache";
import { UserService } from "../services/user-service.js";
import { NoteService } from "../services/note-service.js";

export function registerUserRoutes(app: App): void {
  // List users — cached for 30s
  app.router.get("/users", (_req, res, container) => {
    const users =
      container?.get<CacheManager>("cache")?.remember(
        "users:all",
        () => container?.get<UserService>("users").all() ?? [],
        30,
      ) ?? container?.get<UserService>("users").all() ?? [];
    res.json({ data: users, meta: { count: users.length } });
  });

  // Get single user
  app.router.get("/users/{i:id}", (req, res, container) => {
    const id = Number(req.param("id", "0"));
    const user = container?.get<UserService>("users").find(id);
    if (!user) return res.status(404).json({ error: "User not found" });
    return res.json({ data: user });
  });

  // Get a user's notes (nested resource)
  app.router.get("/users/{i:id}/notes", (req, res, container) => {
    const id = Number(req.param("id", "0"));
    const user = container?.get<UserService>("users").find(id);
    if (!user) return res.status(404).json({ error: "User not found" });
    const notes = container?.get<NoteService>("notes").forUser(id) ?? [];
    return res.json({ data: notes, meta: { count: notes.length } });
  });

  // Create user
  app.router.post("/users", (req, res, container) => {
    const validator = container?.get<Validator>("validator");
    const validation = validator?.validate(req.body ?? {}, {
      email: "required|email",
      name: "required|min:2|max:60",
      role: "in:admin,user",
    });

    if (!validation || validation.fails()) {
      return res.status(422).json({ error: "Validation failed", details: validation?.errors() });
    }

    const input = validation.validated() as { email: string; name: string; role?: "admin" | "user" };
    const existing = container?.get<UserService>("users").findByEmail(input.email);
    if (existing) return res.status(409).json({ error: "Email already taken" });

    const user = container?.get<UserService>("users").create(input);
    container?.get<CacheManager>("cache")?.forget("users:all");
    return res.status(201).json({ data: user });
  });

  // Update user
  app.router.put("/users/{i:id}", (req, res, container) => {
    const id = Number(req.param("id", "0"));
    const validator = container?.get<Validator>("validator");
    const validation = validator?.validate(req.body ?? {}, {
      email: "email",
      name: "min:2|max:60",
      role: "in:admin,user",
    });

    if (!validation || validation.fails()) {
      return res.status(422).json({ error: "Validation failed", details: validation?.errors() });
    }

    const input = validation.validated() as Partial<{ email: string; name: string; role: "admin" | "user" }>;
    const user = container?.get<UserService>("users").update(id, input);
    if (!user) return res.status(404).json({ error: "User not found" });

    container?.get<CacheManager>("cache")?.forget("users:all");
    return res.json({ data: user });
  });

  // Delete user
  app.router.delete("/users/{i:id}", (req, res, container) => {
    const id = Number(req.param("id", "0"));
    const deleted = container?.get<UserService>("users").delete(id);
    if (!deleted) return res.status(404).json({ error: "User not found" });
    container?.get<CacheManager>("cache")?.forget("users:all");
    return res.status(204).send("");
  });
}
