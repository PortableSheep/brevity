import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const notes = sqliteTable("notes", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  text: text("text").notNull(),
});

export async function openStore(url: string) {
  const client = createClient({ url });
  const db = drizzle(client);
  try {
    // A fixed schema for this tutorial; use versioned migrations in a real app.
    await client.execute(
      "CREATE TABLE IF NOT EXISTS notes (id INTEGER PRIMARY KEY AUTOINCREMENT, text TEXT NOT NULL)",
    );
  } catch (error) {
    client.close();
    throw error;
  }
  return {
    async list() {
      return db.select().from(notes).orderBy(notes.id);
    },
    async add(text: string) {
      return db.transaction(async (tx) => {
        const [note] = await tx.insert(notes).values({ text }).returning();
        if (!note) throw new Error("Insert returned no note");
        return note;
      });
    },
    close() {
      client.close();
    },
  };
}

export type NoteStore = Awaited<ReturnType<typeof openStore>>;
