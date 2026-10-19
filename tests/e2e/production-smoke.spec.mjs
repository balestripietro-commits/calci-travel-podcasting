import { expect, test } from "@playwright/test";
import { collectRuntimeErrors, enterSite, expectNoRuntimeErrors } from "./helpers.mjs";

test.describe.configure({ retries: 2 });
test.skip(!process.env.E2E_BASE_URL, "requires the deployed site URL");

test("deployed site exposes the core experience without runtime errors", async ({ page }) => {
  const responseOrigin = new URL(process.env.E2E_BASE_URL).origin;
  const runtimeErrors = collectRuntimeErrors(page, { responseOrigin });

  await enterSite(page, { language: "it", stop: 1 });

  await expect(page).toHaveTitle("Travel Podcasting Comune di Vicopisano");
  await expect(page.locator("#map")).toBeVisible();
  await expect(page.locator(".map-marker").first()).toBeVisible();
  await expect(page.locator("#mini-player")).toBeVisible();

  const hasHorizontalOverflow = await page.evaluate(
    () => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
  );
  expect(hasHorizontalOverflow).toBe(false);
  await expectNoRuntimeErrors(runtimeErrors);
});
