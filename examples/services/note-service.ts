export type Note = {
  id: number;
  userId: number;
  title: string;
  body: string;
  createdAt: Date;
  updatedAt: Date;
};

export class NoteService {
  #notes: Note[] = [
    {
      id: 1,
      userId: 1,
      title: "Framework goals",
      body: "Keep it slim, educational, and composable.",
      createdAt: new Date("2024-01-05"),
      updatedAt: new Date("2024-01-05"),
    },
    {
      id: 2,
      userId: 2,
      title: "Plugin ideas",
      body: "Auth, rate-limiting, CORS, websockets?",
      createdAt: new Date("2024-02-20"),
      updatedAt: new Date("2024-03-01"),
    },
    {
      id: 3,
      userId: 1,
      title: "Release checklist",
      body: "Build, test, pack, publish, tag.",
      createdAt: new Date("2024-04-01"),
      updatedAt: new Date("2024-04-01"),
    },
  ];

  #nextId = 4;

  all(): Note[] {
    return [...this.#notes];
  }

  forUser(userId: number): Note[] {
    return this.#notes.filter((n) => n.userId === userId);
  }

  find(id: number): Note | undefined {
    return this.#notes.find((n) => n.id === id);
  }

  create(input: { userId: number; title: string; body: string }): Note {
    const now = new Date();
    const note: Note = { id: this.#nextId++, ...input, createdAt: now, updatedAt: now };
    this.#notes.push(note);
    return note;
  }

  update(id: number, input: Partial<{ title: string; body: string }>): Note | undefined {
    const index = this.#notes.findIndex((n) => n.id === id);
    if (index === -1) return undefined;
    this.#notes[index] = { ...this.#notes[index], ...input, updatedAt: new Date() };
    return this.#notes[index];
  }

  delete(id: number): boolean {
    const index = this.#notes.findIndex((n) => n.id === id);
    if (index === -1) return false;
    this.#notes.splice(index, 1);
    return true;
  }
}
