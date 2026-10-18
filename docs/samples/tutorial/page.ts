import { fileURLToPath } from "node:url";
import { createFormState } from "@portablesheep/brevity-web";
import { createViews } from "@portablesheep/brevity-views";

export const views = createViews({
  root: fileURLToPath(new URL("./views", import.meta.url)),
  layout: "layout",
});
export const emptyForm = () => createFormState({ labels: { text: "Note" } });
