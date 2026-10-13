import { disposeIslands, startIslands } from "./client.js";
startIslands();
// enhanceForm announces markup replacement; restart islands inside the replaced target.
document.addEventListener("brevity:before-replace", (event) =>
  disposeIslands(event.target as HTMLElement),
);
document.addEventListener("brevity:replaced", (event) => {
  startIslands(event.target as HTMLElement);
});
