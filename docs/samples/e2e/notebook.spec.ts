import { test, expect } from "@playwright/test";

test("Svelte counter enhances the native form", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator("#note-counter")).toContainText("0 / 200 characters");
  await page.getByLabel("Note", { exact: true }).fill("Hello island");
  await expect(page.locator("#note-counter")).toContainText("12 / 200 characters");
  await page.getByRole("button", { name: "Save note" }).click();
  await expect(page.locator("main > ul")).toContainText("Hello island");
});

test("native submission and retained errors work with JavaScript disabled", async ({
  browser,
  baseURL,
}) => {
  const context = await browser.newContext({ javaScriptEnabled: false, baseURL });
  try {
    const page = await context.newPage();
    await page.goto("/");
    await page.getByLabel("Note", { exact: true }).fill("   ");
    const invalid = page.waitForResponse(
      (response) => response.url().endsWith("/notes") && response.request().method() === "POST",
    );
    await page.getByRole("button", { name: "Save note" }).click();
    expect((await invalid).status()).toBe(422);
    await expect(page.getByRole("alert")).toContainText("Write between 1 and 200 characters");
    await expect(page.getByLabel("Note", { exact: true })).toHaveValue("   ");
    await page.getByLabel("Note", { exact: true }).fill("No JavaScript needed");
    await page.getByRole("button", { name: "Save note" }).click();
    await expect(page.locator("main > ul")).toContainText("No JavaScript needed");
  } finally {
    await context.close();
  }
});
