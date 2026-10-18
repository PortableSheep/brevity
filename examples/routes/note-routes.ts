import type { App, Validator } from "@portablesheep/brevity";
import { NoteService } from "../services/note-service.js";

export function registerNoteRoutes(app: App): void {
  // List all notes
  app.router.get("/notes", (_req, res, container) => {
    const notes = container?.get<NoteService>("notes").all() ?? [];
    res.json({ data: notes, meta: { count: notes.length } });
  });

  // Get single note
  app.router.get("/notes/{i:id}", (req, res, container) => {
    const id = Number(req.param("id", "0"));
    const note = container?.get<NoteService>("notes").find(id);
    if (!note) return res.status(404).json({ error: "Note not found" });
    return res.json({ data: note });
  });

  // Create note
  app.router.post("/notes", (req, res, container) => {
    const validator = container?.get<Validator>("validator");
    const validation = validator?.validate(req.body ?? {}, {
      userId: "required|integer",
      title: "required|min:2|max:120",
      body: "required|min:1",
    });

    if (!validation || validation.fails()) {
      return res.status(422).json({ error: "Validation failed", details: validation?.errors() });
    }

    const input = validation.validated() as { userId: number; title: string; body: string };
    const note = container?.get<NoteService>("notes").create(input);
    return res.status(201).json({ data: note });
  });

  // Update note
  app.router.put("/notes/{i:id}", (req, res, container) => {
    const id = Number(req.param("id", "0"));
    const validator = container?.get<Validator>("validator");
    const validation = validator?.validate(req.body ?? {}, {
      title: "min:2|max:120",
      body: "min:1",
    });

    if (!validation || validation.fails()) {
      return res.status(422).json({ error: "Validation failed", details: validation?.errors() });
    }

    const input = validation.validated() as Partial<{ title: string; body: string }>;
    const note = container?.get<NoteService>("notes").update(id, input);
    if (!note) return res.status(404).json({ error: "Note not found" });
    return res.json({ data: note });
  });

  // Delete note
  app.router.delete("/notes/{i:id}", (req, res, container) => {
    const id = Number(req.param("id", "0"));
    const deleted = container?.get<NoteService>("notes").delete(id);
    if (!deleted) return res.status(404).json({ error: "Note not found" });
    return res.status(204).send("");
  });
}
