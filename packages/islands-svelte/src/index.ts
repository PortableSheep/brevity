import { mount, unmount, type Component } from "svelte";
import { defineIsland } from "@portablesheep/brevity-islands/client";

/** Svelte 5 adapter; kept out of @portablesheep/brevity-islands so native apps never resolve Svelte. */
export function svelteIsland<Props extends Record<string, unknown>>(component: Component<Props>) {
  return defineIsland<Props>((target, props) => {
    const container = document.createElement("div");
    const instance = mount(component, { target: container, props });
    target.replaceChildren(container);
    return () => {
      void unmount(instance);
    };
  });
}
