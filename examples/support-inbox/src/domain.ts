import { randomUUID } from "node:crypto";
import { mkdir, open, readFile, rename, unlink } from "node:fs/promises";
import { dirname, isAbsolute } from "node:path";

export const fields = ["name", "email", "subject", "details"] as const;
export type Field = (typeof fields)[number];
export type Values = Record<Field, string>;
export type Errors = Partial<Record<Field | "status", string[]>>;
export const labels: Record<Field, string> = {
  name: "Name",
  email: "Email",
  subject: "Subject",
  details: "Details",
};
export const limits: Record<Field, number> = { name: 80, email: 254, subject: 120, details: 2000 };
export type Ticket = Values & { id: string; status: "open" | "closed"; createdAt: string };

export function validate(input: Record<string, unknown>): { values: Values; errors: Errors } {
  const values: Values = { name: "", email: "", subject: "", details: "" };
  const errors: Errors = {};
  for (const field of fields) {
    const value = input[field];
    values[field] = typeof value === "string" ? value : "";
    if (typeof value !== "string" || !value.trim())
      errors[field] = [`Enter ${labels[field].toLowerCase()}.`];
    else if (value.length > limits[field])
      errors[field] = [`Use at most ${limits[field]} characters.`];
  }
  if (!errors.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email)) {
    errors.email = ["Enter a valid email address."];
  }
  return { values, errors };
}

export function isStatus(value: unknown): value is Ticket["status"] {
  return value === "open" || value === "closed";
}

export class InputError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
  }
}

export function list(tickets: readonly Ticket[], query: Record<string, unknown>) {
  const q = query.q ?? "";
  const status = query.status ?? "";
  const page = query.page ?? "1";
  if (
    typeof q !== "string" ||
    q.length > 120 ||
    typeof status !== "string" ||
    (status !== "" && !isStatus(status)) ||
    typeof page !== "string" ||
    !/^[1-9]\d*$/.test(page) ||
    !Number.isSafeInteger(Number(page))
  ) {
    throw new InputError(400, "Invalid inbox filters");
  }
  const matches = tickets
    .filter(
      (ticket) =>
        (!status || ticket.status === status) &&
        `${ticket.name} ${ticket.email} ${ticket.subject} ${ticket.details}`
          .toLowerCase()
          .includes(q.toLowerCase()),
    )
    .slice()
    .reverse();
  const pages = Math.max(1, Math.ceil(matches.length / 5));
  const current = Math.min(Number(page), pages);
  return {
    q,
    status,
    page: current,
    pages,
    total: matches.length,
    tickets: matches.slice((current - 1) * 5, current * 5),
  };
}
export type Inbox = ReturnType<typeof list>;

function storedTickets(value: unknown): Ticket[] {
  if (!Array.isArray(value)) throw new Error("Repository must contain a JSON array");
  const records: unknown[] = value;
  const tickets: Ticket[] = [];
  const ids = new Set<string>();
  for (const ticket of records) {
    if (
      !isRecord(ticket) ||
      Object.keys(ticket).sort().join(",") !== "createdAt,details,email,id,name,status,subject" ||
      Object.keys(validate(ticket).errors).length ||
      !isStatus(ticket.status) ||
      typeof ticket.id !== "string" ||
      !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(ticket.id) ||
      ids.has(ticket.id) ||
      typeof ticket.createdAt !== "string" ||
      !Number.isFinite(Date.parse(ticket.createdAt))
    )
      throw new Error("Invalid stored request");
    ids.add(ticket.id);
    tickets.push({
      ...validate(ticket).values,
      id: ticket.id,
      status: ticket.status,
      createdAt: ticket.createdAt,
    });
  }
  return tickets;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

export class Repository {
  private queue: Promise<unknown> = Promise.resolve();
  private constructor(
    private readonly file: string,
    private tickets: Ticket[],
  ) {}

  static async open(file: string): Promise<Repository> {
    if (!isAbsolute(file)) throw new Error("Repository path must be absolute");
    await mkdir(dirname(file), { recursive: true });
    let tickets: Ticket[];
    try {
      tickets = storedTickets(JSON.parse(await readFile(file, "utf8")));
    } catch (error) {
      if (!(error instanceof Error && "code" in error && error.code === "ENOENT")) throw error;
      const repository = new Repository(file, []);
      await repository.persist([]);
      return repository;
    }
    return new Repository(file, tickets);
  }

  all(): Ticket[] {
    return this.tickets.map((ticket) => ({ ...ticket }));
  }
  find(id: string): Ticket {
    const ticket = this.tickets.find((ticket) => ticket.id === id);
    if (!ticket) throw new InputError(404, "Request not found");
    return { ...ticket };
  }
  create(values: Values): Promise<Ticket> {
    return this.mutate(() => {
      if (Object.keys(validate(values).errors).length) throw new InputError(422, "Invalid request");
      const ticket: Ticket = {
        ...values,
        id: randomUUID(),
        status: "open",
        createdAt: new Date().toISOString(),
      };
      return { tickets: [...this.tickets, ticket], result: { ...ticket } };
    });
  }
  update(id: string, status: unknown): Promise<Ticket> {
    return this.mutate(() => {
      if (!isStatus(status)) throw new InputError(422, "Invalid status");
      const ticket = { ...this.find(id), status };
      return {
        tickets: this.tickets.map((item) => (item.id === id ? ticket : item)),
        result: { ...ticket },
      };
    });
  }
  private mutate(change: () => { tickets: Ticket[]; result: Ticket }): Promise<Ticket> {
    const run = async () => {
      const { tickets, result } = change();
      await this.persist(tickets);
      this.tickets = tickets;
      return result;
    };
    // A rejected write reaches its caller; subsequent operations may still retry.
    const operation = this.queue.then(run, run);
    this.queue = operation;
    return operation;
  }
  private async persist(tickets: Ticket[]): Promise<void> {
    const temporary = `${this.file}.${randomUUID()}.tmp`;
    const handle = await open(temporary, "wx", 0o600);
    try {
      try {
        await handle.writeFile(JSON.stringify(tickets, null, 2) + "\n");
        await handle.sync();
      } finally {
        await handle.close();
      }
      await rename(temporary, this.file);
    } finally {
      try {
        await unlink(temporary);
      } catch (error) {
        if (!(error instanceof Error && "code" in error && error.code === "ENOENT")) throw error;
      }
    }
  }
}
