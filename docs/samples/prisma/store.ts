import { PrismaClient } from "@prisma/client";
import type { NoteStore } from "../tutorial/store.js";

export async function openPrismaStore(url: string) {
  const prisma = new PrismaClient({ datasources: { db: { url } } });
  await prisma.$connect();
  return {
    async list() { return prisma.note.findMany({ orderBy: { id: "asc" } }); },
    async add(text: string) {
      return prisma.$transaction(tx => tx.note.create({ data: { text } }));
    },
    async close() { await prisma.$disconnect(); },
  } satisfies NoteStore;
}
