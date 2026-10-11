import { defineIsland } from "@brevity/islands/client";
import { enhanceForm } from "@brevity/islands/forms";

export default defineIsland((element, _props, context) => {
  const target = element.querySelector<HTMLElement>("#enhanced-form");
  const form = target?.querySelector("form");
  if (!target || !form) throw new Error("Missing native form");
  const cleanup = enhanceForm(form, { target, signal: context.signal });
  element.dataset.ready = "true";
  return () => { cleanup(); delete element.dataset.ready; };
});
