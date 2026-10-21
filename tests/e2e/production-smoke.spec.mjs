import { expect, test } from "@playwright/test";
import { collectRuntimeErrors, enterSite, expectAudioPlaying, expectNoRuntimeErrors, stopButton } from "./helpers.mjs";
test.skip(!process.env.E2E_BASE_URL, "requires the deployed site URL");

test("deployed site exposes the core experience without runtime errors", async ({ page }) => {
  const responseOrigin = new URL(process.env.E2E_BASE_URL).origin;
  const runtimeErrors = collectRuntimeErrors(page, { responseOrigin });

  await enterSite(page, { language: "it", stop: 1 });
  const deployedPath = new URL(process.env.E2E_BASE_URL).pathname.replace(/\/*$/, "/");
  await expect.poll(() => new URL(page.url()).pathname).toBe(deployedPath);

  await expect(page).toHaveTitle("Travel Podcasting Comune di Calci");
  await expect(page.locator("#map")).toBeVisible();
  await expect(page.locator(".map-marker").first()).toBeVisible();
  await expect(page.locator("#mini-player")).toBeVisible();
  await stopButton(page, 1).click();
  await expectAudioPlaying(page);
  await expect.poll(() => page.locator("audio").evaluate((audio) => audio.currentTime)).toBeGreaterThan(0.2);

  const hasHorizontalOverflow = await page.evaluate(
    () => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
  );
  expect(hasHorizontalOverflow).toBe(false);
  await expectNoRuntimeErrors(runtimeErrors);
});
