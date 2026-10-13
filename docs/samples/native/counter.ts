import { defineIsland } from "@brevity/islands/client";

export default defineIsland<{ text: string }>((element, props, context) => {
  element.dataset.hydrated = "true";
  const output = document.createElement("output");
  output.textContent = props.text;
  element.append(output);
  const button = element.querySelector("button");
  button?.addEventListener(
    "click",
    () => {
      output.textContent = "clicked";
    },
    { signal: context.signal },
  );
  return () => {
    output.remove();
    delete element.dataset.hydrated;
  };
});
