import { expect, test } from "@playwright/test";
import {
  collectRuntimeErrors,
  enterSite,
  expectInsideViewport,
  expectClassObserved,
  expectNoRuntimeErrors,
  languageNames,
  openFullPlayer,
  stopButton,
  watchClass,
} from "./helpers.mjs";

// Only Italian is currently available. The other language buttons intentionally
// open the unavailable-language modal and are covered by accessibility tests.
const languageChecks = ["it"];

for (const code of languageChecks) {
  test(`interface localization is complete in ${languageNames[code]}`, async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "desktop-chrome", "Language matrix runs once on desktop Chrome");
    const errors = collectRuntimeErrors(page);
    await enterSite(page, { language: code });

    await expect(page.locator("html")).toHaveAttribute("lang", code);
    await expect(page.locator("#global-language-current-label")).toHaveText(languageNames[code]);
    await expect(page.locator("#map-recenter-button")).toBeHidden();
    await expect(page.locator("#map-directions-button")).toBeHidden();
    await expect(page.locator("#mini-player-expand")).not.toHaveAttribute("aria-label", "");
    await expectNoRuntimeErrors(errors);
  });
}

test("full player fits the viewport without horizontal overflow", async ({ page }) => {
  test.setTimeout(90_000);
  const errors = collectRuntimeErrors(page);
  await enterSite(page, { stop: 6 });
  await openFullPlayer(page);
  if (test.info().project.name === "mobile-chrome") {
    await page.locator("#player-map-button").click();
  }

  await expect.poll(() => page.evaluate(() => getComputedStyle(document.documentElement).overflowX)).toBe("hidden");
  await expect.poll(() => page.locator("#player-overlay").evaluate((element) => element.scrollHeight <= element.clientHeight + 1)).toBe(true);
  await expectInsideViewport(page.locator("#player-play-button"), page);
  await expectInsideViewport(page.locator("#player-speed-button"), page);
  await expectInsideViewport(page.locator("#player-close-button"), page);
  await expect(page.locator("#player-close-button .material-symbols-rounded")).toHaveText("close");
  if (test.info().project.name === "mobile-chrome") {
    await expectInsideViewport(page.locator("#player-transcript-dock"), page);
    const artworkBox = await page.locator("#player-overlay .player-artwork").boundingBox();
    expect(artworkBox).not.toBeNull();
    expect(Math.abs(artworkBox.width - artworkBox.height)).toBeLessThanOrEqual(2);
  }
  if (test.info().project.name !== "desktop-chrome") {
    const controlBoxes = await Promise.all([
      page.locator("#player-prev-button").boundingBox(),
      page.locator("#player-play-button").boundingBox(),
      page.locator("#player-next-button").boundingBox(),
      page.locator("#player-speed-button").boundingBox(),
    ]);
    controlBoxes.forEach((box) => expect(box).not.toBeNull());

    const centers = controlBoxes.map((box) => ({
      x: box.x + box.width / 2,
      y: box.y + box.height / 2,
    }));
    const gaps = centers.slice(1).map((center, index) => center.x - centers[index].x);

    // The primary Play button is intentionally taller than the secondary
    // controls; all controls remain on the same horizontal row within that
    // shared vertical band.
    const centerYValues = centers.map((center) => center.y);
    expect(Math.max(...centerYValues) - Math.min(...centerYValues)).toBeLessThanOrEqual(20);
    // The controls have different widths, so equal center-to-center distances
    // would incorrectly reject the intentionally larger Play button.
    gaps.forEach((gap) => expect(gap).toBeGreaterThan(24));
  }
  await expectNoRuntimeErrors(errors);
});

test("reduced motion keeps route feedback functional without animation", async ({ page }) => {
  const errors = collectRuntimeErrors(page);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await enterSite(page);
  await watchClass(page, "#map-directions-button", "is-directions-cued");
  await stopButton(page, 4).click();

  await expectClassObserved(page, "is-directions-cued");
  await expect(page.locator(".map-route-active")).toBeVisible();
  const animationDuration = await page.locator("#map-directions-button").evaluate(
    (element) => getComputedStyle(element).animationDuration,
  );
  expect(["0s", "0.001s"]).toContain(animationDuration);
  await expectNoRuntimeErrors(errors);
});

test("unavailable platform badges explain missing and invalid destinations", async ({ page }) => {
  const errors = collectRuntimeErrors(page);
  await enterSite(page);

  const badges = page.locator(".platform-logo");
  await expect(badges).toHaveCount(3);
  const originalUrl = page.url();
  for (const [index, name] of ["izi.TRAVEL", "Loquis", "Spotify"].entries()) {
    const badge = badges.nth(index);
    await expect(badge).toHaveJSProperty("tagName", "BUTTON");
    await expect(badge).not.toHaveAttribute("href");
    await badge.click();
    await expect(page.locator("#platform-link-status")).toContainText(`${name} non è ancora disponibile`);
  }
  expect(page.url()).toBe(originalUrl);

  const izi = page.locator(".logo-izi");
  await izi.evaluate((element) => { element.dataset.platformUrl = "javascript:alert(1)"; });
  await izi.click();
  await expect(page.locator("#platform-link-status")).toContainText("il collegamento non è valido");

  await expectNoRuntimeErrors(errors);
});

test("social sharing section stays removed from the route surface", async ({ page }) => {
  const errors = collectRuntimeErrors(page);
  await enterSite(page);

  await expect(page.locator(".share-panel")).toBeHidden();
  await expect(page.locator(".platforms-panel")).toBeVisible();
  await expectNoRuntimeErrors(errors);
});
