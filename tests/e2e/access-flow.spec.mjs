import { expect, test } from "@playwright/test";

test("first access asks for language and later access remembers it", async ({ page }) => {
  test.setTimeout(90_000);
  let localPostRequests = 0;
  page.on("request", (request) => {
    if (request.method() === "POST") localPostRequests += 1;
  });

  await page.goto("/?tappa=1&lang=it", { waitUntil: "domcontentloaded" });
  await expect(page.locator("#email-gate-overlay")).toHaveCount(0);
  await expect(page.locator('form[name="email-demo-gate"]')).toHaveCount(0);
  await expect(page.locator("#onboarding-overlay")).toBeVisible();
  await expect(page.locator("#guide-layer")).toBeHidden();

  await page.locator("#onboarding-language-chips .onboarding-language-option")
    .filter({ hasText: /^IT\s/ })
    .click();
  await expect(page.locator("#onboarding-overlay")).toBeHidden();
  await expect(page.locator("#guide-layer")).toBeVisible();
  await page.locator("#guide-skip-button").click();
  await expect(page.locator("#guide-layer")).toBeHidden();

  const savedState = await page.evaluate(() => ({
    onboardingCompleted: localStorage.getItem("vicopisano-onboarding-completed"),
    language: localStorage.getItem("vicopisano-language"),
    savedValues: Object.values(localStorage),
  }));
  expect(savedState.onboardingCompleted).toBe("true");
  expect(savedState.language).toBe("IT");
  expect(savedState.savedValues.some((value) => value.includes("@"))).toBe(false);
  expect(localPostRequests).toBe(0);

  await page.evaluate(() => window.sessionStorage.clear());
  await page.reload({ waitUntil: "domcontentloaded" });
  await expect(page.locator("#email-gate-overlay")).toHaveCount(0);
  await expect(page.locator("#onboarding-overlay")).toBeHidden();
  await expect(page.locator("#guide-layer")).toBeHidden();
  await expect(page.locator("html")).toHaveAttribute("lang", "it");
});
