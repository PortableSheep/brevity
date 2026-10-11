import { mount } from "svelte";
import NoteCounter from "./NoteCounter.svelte";

const target = document.getElementById("note-counter");
const state = document.getElementById("note-state");
if (!target || !state) throw new Error("Missing island mount or state");
const data: unknown = JSON.parse(state.textContent ?? "");
if (!data || typeof data !== "object" || !("initialText" in data)
  || typeof data.initialText !== "string") {
  throw new Error("Invalid note island state");
}
mount(NoteCounter, { target, props: { initialText: data.initialText } });
