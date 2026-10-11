export type EnhancedFormOptions = {
  /** Stable wrapper ID shared by the current page and server's HTML response. */
  target: HTMLElement;
  signal?: AbortSignal;
  onResponse?: (response: Response) => void | Promise<void>;
};

/** Native POST protocol; validation and conflict markup stay server-owned. */
export function enhanceForm(initialForm: HTMLFormElement, options: EnhancedFormOptions): () => void {
  let form = initialForm;
  let pending = false;
  let stopped = false;
  let request: AbortController | undefined;
  const target = options.target;
  if (!target.id || !target.contains(form)) throw new TypeError("Enhanced form needs a containing target with an ID");
  const report = (error: unknown) => {
    console.error("Brevity form failed", error);
    target.dispatchEvent(new CustomEvent("brevity:form-error", { detail: error, bubbles: true }));
  };
  const submit = async (event: SubmitEvent) => {
    // Read attributes: controls named "action"/"method"/"target"/"enctype" shadow the form's IDL properties.
    const attr = (name: string) => form.getAttribute(name)?.trim() ?? "";
    const action = new URL(attr("action") || location.href, location.href);
    const method = attr("method").toLowerCase() || "get";
    const enctype = attr("enctype").toLowerCase() || "application/x-www-form-urlencoded";
    const browsingTarget = attr("target");
    if (method !== "post" || action.origin !== location.origin
      || event.submitter?.hasAttribute("formaction") || event.submitter?.hasAttribute("formmethod")
      || event.submitter?.hasAttribute("formenctype") || event.submitter?.hasAttribute("formtarget")
      || browsingTarget && browsingTarget !== "_self"
      || enctype === "text/plain") return;
    const multipart = enctype === "multipart/form-data";
    const data = new FormData(form, event.submitter);
    if (!multipart && [...data.values()].some(value => typeof value !== "string")) return;
    event.preventDefault();
    if (pending) return;
    pending = true;
    const originalForm = form;
    const busy = originalForm.getAttribute("aria-busy");
    const submitControls = [...originalForm.elements].filter(
      (control): control is HTMLButtonElement | HTMLInputElement =>
        (control instanceof HTMLButtonElement || control instanceof HTMLInputElement)
        && (control.type === "submit" || control.type === "image"),
    );
    const controls = submitControls.map(control => ({ control, disabled: control.disabled }));
    originalForm.setAttribute("aria-busy", "true");
    for (const { control } of controls) control.disabled = true;
    request = new AbortController();
    try {
      const body = multipart ? data : new URLSearchParams(
        [...data.entries()].map(([key, value]) => [key, String(value)]),
      );
      const response = await fetch(action, {
        method: "POST", body, credentials: "same-origin",
        headers: { Accept: "text/html" }, signal: request.signal,
      });
      await options.onResponse?.(response.clone());
      if (stopped) return;
      if (response.redirected) {
        const destination = new URL(response.url);
        if (destination.origin !== location.origin) throw new Error("Cross-origin form redirect");
        location.assign(destination.href);
        return;
      }
      if (!response.ok && response.status !== 422 && response.status !== 409) {
        throw new Error(`Enhanced form HTTP ${response.status}`);
      }
      if (!response.headers.get("content-type")?.startsWith("text/html")) {
        throw new Error("Enhanced form response must be HTML");
      }
      const page = new DOMParser().parseFromString(await response.text(), "text/html");
      const replacement = page.getElementById(target.id);
      const nextForm = replacement?.querySelector("form");
      if (!replacement || !nextForm) throw new Error("Enhanced form response is missing its target/form");
      if (stopped) return;
      form.removeEventListener("submit", submit);
      target.replaceChildren(...replacement.childNodes);
      form = nextForm;
      form.addEventListener("submit", submit);
      const focus = target.querySelector<HTMLElement>('[role="alert"], [aria-invalid="true"]');
      focus?.focus();
      target.dispatchEvent(new CustomEvent("brevity:form-response", { detail: { status: response.status }, bubbles: true }));
    } catch (error) {
      if (!request?.signal.aborted) report(error);
    } finally {
      if (busy === null) originalForm.removeAttribute("aria-busy");
      else originalForm.setAttribute("aria-busy", busy);
      for (const { control, disabled } of controls) control.disabled = disabled;
      pending = false;
    }
  };
  const dispose = () => {
    stopped = true;
    request?.abort();
    form.removeEventListener("submit", submit);
    options.signal?.removeEventListener("abort", dispose);
  };
  if (options.signal?.aborted) dispose();
  else {
    form.addEventListener("submit", submit);
    options.signal?.addEventListener("abort", dispose, { once: true });
  }
  return dispose;
}
