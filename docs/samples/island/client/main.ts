import { defineIsland } from "@portablesheep/brevity-islands/client";
import { svelteIsland } from "@portablesheep/brevity-islands-svelte";
import NoteCounter from "./NoteCounter.svelte";

const mountCounter = svelteIsland(NoteCounter);
export default defineIsland((element, data: unknown, context) => {
  if (
    !data ||
    typeof data !== "object" ||
    !("initialText" in data) ||
    typeof data.initialText !== "string"
  )
    throw new Error("Invalid note island state");
  return mountCounter(element, { initialText: data.initialText }, context);
});
