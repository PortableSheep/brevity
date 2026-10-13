export type IslandContext = { signal: AbortSignal };

export type Island<Props = unknown> = (
  element: HTMLElement,
  props: Props,
  context: IslandContext,
) => void | (() => void) | Promise<void | (() => void)>;

export function defineIsland<Props>(component: Island<Props>): Island<Props> {
  return component;
}

const running = new WeakMap<HTMLElement, () => void>();

/** Dispose islands mounted inside root (e.g. before its markup is replaced). */
export function disposeIslands(root: ParentNode): void {
  for (const element of root.querySelectorAll<HTMLElement>("[data-brevity-island]"))
    running.get(element)?.();
}

/** Starts once per element; returns a disposer for client-side navigation. */
export function startIslands(root: ParentNode = document): () => void {
  const disposers: (() => void)[] = [];
  const manifests = new Map<string, Promise<Record<string, string>>>();
  for (const element of root.querySelectorAll<HTMLElement>("[data-brevity-island]")) {
    if (element.dataset.brevityStarted) continue;
    element.dataset.brevityStarted = "true";
    const controller = new AbortController();
    let cleanup: void | (() => void);
    let started = false;
    let disposed = false;
    let cancel = () => {};
    const dispose = () => {
      if (disposed) return;
      disposed = true;
      cancel();
      controller.abort();
      cleanup?.();
      running.delete(element);
      delete element.dataset.brevityStarted;
    };
    running.set(element, dispose);
    disposers.push(dispose);
    const mount = async () => {
      if (started || controller.signal.aborted) return;
      started = true;
      cancel();
      try {
        const url = new URL(element.dataset.manifest!, location.href);
        if (url.origin !== location.origin) throw new Error("Cross-origin island manifest");
        let manifest = manifests.get(url.href);
        if (!manifest) {
          manifest = fetch(url).then(async (response) => {
            if (!response.ok) throw new Error(`Island manifest HTTP ${response.status}`);
            return response.json();
          });
          manifests.set(url.href, manifest);
        }
        const entries = await manifest;
        const name = element.dataset.brevityIsland!;
        if (!entries || !Object.hasOwn(entries, name) || typeof entries[name] !== "string") {
          throw new Error(`Unknown island: ${name}`);
        }
        const moduleUrl = new URL(entries[name], url);
        if (moduleUrl.origin !== location.origin) throw new Error("Cross-origin island module");
        const component = await import(/* @vite-ignore */ moduleUrl.href);
        if (controller.signal.aborted || !element.isConnected) return;
        cleanup = await component.default(element, JSON.parse(element.dataset.props!), {
          signal: controller.signal,
        });
        if (controller.signal.aborted || !element.isConnected) cleanup?.();
      } catch (error) {
        console.error("Brevity island failed", error);
        element.dispatchEvent(
          new CustomEvent("brevity:island-error", { detail: error, bubbles: true }),
        );
      }
    };
    const hydrate = element.dataset.hydrate;
    if (hydrate === "visible" && typeof IntersectionObserver !== "undefined") {
      const observer = new IntersectionObserver((entries) => {
        if (entries.some((entry) => entry.isIntersecting)) void mount();
      });
      observer.observe(element);
      cancel = () => observer.disconnect();
    } else if (hydrate === "idle") {
      const browser = window as Window & {
        requestIdleCallback?: (callback: () => void) => number;
        cancelIdleCallback?: (id: number) => void;
      };
      const id = browser.requestIdleCallback
        ? browser.requestIdleCallback(() => void mount())
        : window.setTimeout(() => void mount(), 200);
      cancel = () =>
        browser.cancelIdleCallback ? browser.cancelIdleCallback(id) : clearTimeout(id);
    } else if (hydrate === "interaction") {
      const events = ["pointerdown", "focusin", "keydown"];
      const listener = () => void mount();
      for (const event of events) element.addEventListener(event, listener);
      cancel = () => {
        for (const event of events) element.removeEventListener(event, listener);
      };
    } else {
      void mount();
    }
  }
  return () => {
    for (const dispose of disposers) dispose();
  };
}
