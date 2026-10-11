import { mount, unmount, type Component } from "svelte";
import { defineIsland } from "./client.js";

/** Svelte 5 is an optional peer, never part of the native loader. */
export function svelteIsland<Props extends Record<string, unknown>>(component: Component<Props>) {
  return defineIsland<Props>((target, props) => {
    const container = document.createElement("div");
    const instance = mount(component, { target: container, props });
    target.replaceChildren(container);
    return () => { void unmount(instance); };
  });
}
