import { test, expect } from "@playwright/test";

declare global {
  interface Window {
    flushIdle: () => void;
    cspViolation: (directive: string) => Promise<void>;
  }
}

test("load, visible, idle, and interaction import only when scheduled, failures keep fallback", async ({ page }) => {
  await page.addInitScript(() => {
    // Control idle scheduling instead of relying on browser idle timing.
    const callbacks: (() => void)[] = [];
    Object.assign(window, {
      requestIdleCallback: (callback: () => void) => callbacks.push(callback),
      cancelIdleCallback: () => {},
      flushIdle: () => callbacks.forEach(callback => callback()),
    });
  });
  await page.goto("/native");
  await expect(page.locator("#load [data-hydrated]")).toHaveCount(1);
  await expect(page.locator("#visible [data-hydrated]")).toHaveCount(0);
  await expect(page.locator("#idle [data-hydrated]")).toHaveCount(0);
  await expect(page.locator("#interaction [data-hydrated]")).toHaveCount(0);
  await page.locator("#interaction button").focus();
  await expect(page.locator("#interaction [data-hydrated]")).toHaveCount(1);
  await page.evaluate(() => window.flushIdle());
  await expect(page.locator("#idle [data-hydrated]")).toHaveCount(1);
  await page.locator("#visible").scrollIntoViewIfNeeded();
  await expect(page.locator("#visible [data-hydrated]")).toHaveCount(1);
  await expect(page.getByRole("button", { name: "broken fallback" })).toBeVisible();
});

test("strict CSP and hostile props preserve fallback and cannot inject markup", async ({ page }) => {
  const violations: string[] = [];
  await page.exposeFunction("cspViolation", (directive: string) => violations.push(directive));
  await page.addInitScript(() => document.addEventListener("securitypolicyviolation", event => {
    void window.cspViolation(event.violatedDirective);
  }));
  await page.goto("/native/hostile");
  await expect(page.locator("output")).toHaveText('</script><img src=x onerror="window.pwned=true">');
  await expect(page.getByText("Safe fallback")).toBeVisible();
  await expect(page.locator("img")).toHaveCount(0);
  expect(await page.evaluate(() => "pwned" in window)).toBe(false);
  expect(violations).toEqual([]);
});

test("enhanced form retains 422 and 409 input, focuses errors, restores pending controls and binds replacement", async ({ page }) => {
  await page.goto("/native/form");
  await expect(page.locator("[data-ready]")).toHaveCount(1);
  const form = page.locator("#enhanced-form form");
  await page.getByLabel("Note", { exact: true }).fill("   ");
  await page.getByRole("button", { name: "Save", exact: true }).click();
  await expect(form).toHaveAttribute("aria-busy", "true");
  await expect(page.getByRole("button", { name: "Save", exact: true })).toBeDisabled();
  await expect(page.getByRole("alert")).toContainText("Write a note.");
  await expect(page.getByLabel("Note", { exact: true })).toHaveValue("   ");
  await expect(page.getByRole("alert")).toBeFocused();
  await expect(page.getByRole("button", { name: "Save", exact: true })).toBeEnabled();
  await expect(page.getByRole("button", { name: "Unavailable" })).toBeDisabled();
  await page.getByLabel("Note", { exact: true }).fill("conflict");
  await page.getByRole("button", { name: "Save", exact: true }).click();
  await expect(page.getByRole("alert")).toContainText("Conflict");
  await expect(page.getByLabel("Note", { exact: true })).toHaveValue("conflict");
  await page.getByLabel("Note", { exact: true }).fill("valid note");
  await page.getByRole("button", { name: "Save", exact: true }).click();
  await expect(page.getByText("Saved", { exact: true })).toBeVisible();
  await expect(page.getByRole("alert")).toHaveCount(0);
  expect(new URL(page.url()).pathname).toBe("/native/form");
});

test("controls named action, method, target, or enctype do not shadow the form's submission attributes", async ({ page }) => {
  await page.goto("/native/form");
  await expect(page.locator("[data-ready]")).toHaveCount(1);
  await page.evaluate(() => {
    const form = document.querySelector<HTMLFormElement>("#enhanced-form form")!;
    for (const name of ["method", "target", "enctype"]) {
      const input = document.createElement("input");
      input.type = "hidden";
      input.name = name;
      input.value = "shadow";
      form.append(input);
    }
    const button = document.createElement("button");
    button.name = "action";
    button.value = "publish";
    button.textContent = "Publish";
    form.append(button);
  });
  await page.getByLabel("Note", { exact: true }).fill("valid note");
  const request = page.waitForRequest(req => req.method() === "POST");
  await page.getByRole("button", { name: "Publish", exact: true }).click();
  const sent = await request;
  expect(sent.resourceType()).toBe("fetch");
  expect(new URL(sent.url()).pathname).toBe("/native/form");
  expect(new URLSearchParams(sent.postData() ?? "").get("action")).toBe("publish");
  await expect(page.getByText("Saved", { exact: true })).toBeVisible();
});

test("fetch errors are reported without losing input or disabling native controls", async ({ page }) => {
  await page.goto("/native/form");
  await expect(page.locator("[data-ready]")).toHaveCount(1);
  await page.evaluate(() => document.addEventListener("brevity:form-error", () => {
    document.documentElement.dataset.formError = "true";
  }));
  await page.route("**/native/form", route => route.request().method() === "POST" ? route.abort() : route.continue());
  await page.getByLabel("Note", { exact: true }).fill("retain me");
  await page.getByRole("button", { name: "Save", exact: true }).click();
  await expect(page.locator("html")).toHaveAttribute("data-form-error", "true");
  await expect(page.getByLabel("Note", { exact: true })).toHaveValue("retain me");
  await expect(page.getByRole("button", { name: "Save", exact: true })).toBeEnabled();
});

test("native islands and POST validation work without JavaScript", async ({ browser, baseURL }) => {
  const context = await browser.newContext({ baseURL, javaScriptEnabled: false });
  try {
    const page = await context.newPage();
    await page.goto("/native");
    await expect(page.locator("[data-hydrated]")).toHaveCount(0);
    await expect(page.getByRole("button", { name: "load fallback", exact: true })).toBeVisible();
    await page.goto("/native/form");
    await page.getByLabel("Note", { exact: true }).fill(" ");
    await page.getByRole("button", { name: "Save", exact: true }).click();
    await expect(page.getByRole("alert")).toContainText("Write a note.");
    await expect(page.getByLabel("Note", { exact: true })).toHaveValue(" ");
    await page.getByLabel("Note", { exact: true }).fill("native note");
    await page.getByRole("button", { name: "Save", exact: true }).click();
    await expect(page.getByText("Saved", { exact: true })).toBeVisible();
  } finally { await context.close(); }
});

test("unsupported observers/timers fall back, start deduplicates and disposal aborts listeners", async ({ page }) => {
  await page.addInitScript(() => {
    Object.assign(window, { IntersectionObserver: undefined, requestIdleCallback: undefined, cancelIdleCallback: undefined });
  });
  await page.goto("/native");
  await expect(page.locator("#visible [data-hydrated]")).toHaveCount(1);
  await expect(page.locator("#idle [data-hydrated]")).toHaveCount(1);
  const result = await page.evaluate(async () => {
    const url = "/native/client.js";
    const { startIslands } = await import(url);
    const element = document.createElement("div");
    element.dataset.brevityIsland = "counter";
    element.dataset.manifest = "/native/manifest.json";
    element.dataset.props = '{"text":"disposable"}';
    element.dataset.hydrate = "load";
    element.innerHTML = "<button>fallback</button>";
    document.body.append(element);
    const dispose = startIslands(element.parentElement);
    // A second scan must not mount duplicates.
    startIslands(element.parentElement);
    await new Promise<void>((resolve, reject) => {
      let attempts = 0;
      const wait = () => {
        if (element.dataset.hydrated) resolve();
        else if (++attempts > 100) reject(new Error("Island did not mount"));
        else setTimeout(wait, 10);
      };
      wait();
    });
    const outputs = element.querySelectorAll("output").length;
    dispose();
    dispose();
    element.querySelector("button")?.click();
    return { outputs, after: element.querySelectorAll("output").length, started: element.dataset.brevityStarted };
  });
  expect(result).toEqual({ outputs: 1, after: 0, started: undefined });
});

test("mount failures emit errors but do not block other islands", async ({ page }) => {
  await page.route("**/native/counter.js", route => route.fulfill({
    contentType: "text/javascript",
    body: 'export default (el, props) => { if (props.text === "load") throw new Error("mount error"); el.dataset.hydrated = "true"; };',
  }));
  await page.addInitScript(() => document.addEventListener("brevity:island-error", () => {
    document.documentElement.dataset.islandError = "true";
  }));
  await page.goto("/native");
  await expect(page.locator("html")).toHaveAttribute("data-island-error", "true");
  await expect(page.locator("#load button")).toHaveText("load fallback");
  await expect(page.locator("#load [data-hydrated]")).toHaveCount(0);
  await expect(page.locator("#idle [data-hydrated]")).toHaveCount(1);
});

test("malformed props report errors and keep fallback", async ({ page }) => {
  await page.goto("/native/hostile");
  await expect(page.locator("[data-hydrated]")).toHaveCount(1);
  const result = await page.evaluate(async () => {
    const url = "/native/client.js";
    const { startIslands } = await import(url);
    const element = document.createElement("div");
    element.dataset.brevityIsland = "counter";
    element.dataset.manifest = "/native/manifest.json";
    element.dataset.props = "not JSON";
    element.dataset.hydrate = "load";
    element.textContent = "still usable";
    document.body.append(element);
    const error = new Promise<void>(resolve => element.addEventListener("brevity:island-error", () => resolve(), { once: true }));
    const dispose = startIslands(document.body);
    await error;
    dispose();
    return element.textContent;
  });
  expect(result).toBe("still usable");
});

test("enhanced redirect uses native navigation", async ({ page }) => {
  await page.goto("/native/form");
  await expect(page.locator("[data-ready]")).toHaveCount(1);
  await page.getByLabel("Note", { exact: true }).fill("redirect");
  await page.getByRole("button", { name: "Save", exact: true }).click();
  await expect(page.getByLabel("Note", { exact: true })).toHaveValue("");
  await expect(page.locator("[data-ready]")).toHaveCount(1);
});

test("data-brevity-enhance upgrades a form without a manifest and restarts nested islands after replacement", async ({ page }) => {
  const scripts: string[] = [];
  page.on("request", req => { if (req.resourceType() === "script") scripts.push(new URL(req.url()).pathname); });
  await page.goto("/native/enhanced");
  await expect(page.locator("#enhanced-note [data-hydrated] output")).toHaveText("nested");
  await page.getByLabel("Note", { exact: true }).fill("  ");
  const blank = page.waitForRequest(req => req.method() === "POST");
  await page.getByRole("button", { name: "Save", exact: true }).click();
  expect((await blank).resourceType()).toBe("fetch");
  await expect(page.getByRole("alert")).toBeFocused();
  await expect(page.locator("#enhanced-note [data-hydrated] output")).toHaveText("nested");
  await page.getByLabel("Note", { exact: true }).fill("hello");
  await page.getByRole("button", { name: "Save", exact: true }).click();
  await expect(page.getByText("Saved", { exact: true })).toBeVisible();
  await expect(page.locator("#enhanced-note [data-hydrated] output")).toHaveText("after save");
  await expect(page.locator("#enhanced-note output")).toHaveCount(1);
  expect(new URL(page.url()).pathname).toBe("/native/enhanced");
  expect(scripts).toContain("/native/enhance.js");
});

test("enhanced directive page still submits natively with JavaScript disabled", async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();
  await page.goto("/native/enhanced");
  await page.getByLabel("Note", { exact: true }).fill("no js");
  await page.getByRole("button", { name: "Save", exact: true }).click();
  await expect(page.getByText("Saved", { exact: true })).toBeVisible();
  await context.close();
});
