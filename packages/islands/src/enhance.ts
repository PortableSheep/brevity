import { enhanceForm } from "./forms.js";

/** `data-brevity-enhance` directive: enhance the first form inside each marked target, no loader or manifest. */
for (const target of document.querySelectorAll<HTMLElement>("[data-brevity-enhance]")) {
  const form = target.querySelector("form");
  if (!target.dataset.brevityEnhanced && form) {
    target.dataset.brevityEnhanced = "true";
    enhanceForm(form, { target });
  }
}
