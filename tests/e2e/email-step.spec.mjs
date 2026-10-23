import { expect, test } from "@playwright/test";

const fakeEndpoint = "https://script.google.com/macros/s/TEST/exec";

async function openWithEndpoint(page) {
  await page.addInitScript((endpoint) => {
    window.__calciEmailEndpoint = endpoint;
    if (!sessionStorage.getItem("email-test-init")) {
      localStorage.removeItem("calci-email-step-done");
      sessionStorage.setItem("email-test-init", "1");
    }
  }, fakeEndpoint);
  await page.goto("./?tappa=1&lang=it", { waitUntil: "domcontentloaded" });
  await expect(page.locator("#onboarding-email-form")).toBeVisible();
  await expect(page.locator("#onboarding-language-chips")).toBeHidden();
}

async function chooseItalian(page) {
  await expect(page.locator("#onboarding-language-chips")).toBeVisible();
  await page.locator("#onboarding-language-chips .onboarding-language-option")
    .filter({ hasText: /^IT\s/ })
    .click();
}

test("email step sends the address after consent and then continues", async ({ page }) => {
  test.setTimeout(90_000);
  const posts = [];
  await page.route(fakeEndpoint, (route) => {
    posts.push(route.request().postDataJSON());
    return route.fulfill({ status: 200, contentType: "application/json", body: '{"ok":true}' });
  });
  await openWithEndpoint(page);

  await page.locator("#onboarding-email-input").fill("non-valida");
  await page.locator("#onboarding-email-submit").click();
  await expect(page.locator("#onboarding-email-error")).toBeVisible();
  expect(posts).toHaveLength(0);

  await page.locator("#onboarding-email-input").fill("visitatore@example.com");
  await page.locator("#onboarding-email-consent").check();
  await page.locator("#onboarding-email-submit").click();
  await expect(page.locator("#onboarding-email-form")).toBeHidden();
  await chooseItalian(page);
  await expect(page.locator("#onboarding-overlay")).toBeHidden();
  await expect(page.locator("#guide-layer")).toBeVisible();
  expect(posts).toEqual([
    expect.objectContaining({ email: "visitatore@example.com", consent: true, language: "IT" }),
  ]);

  const stored = await page.evaluate(() => Object.values(localStorage));
  expect(stored.some((value) => value.includes("@"))).toBe(false);
});

test("email step can be skipped without sending anything", async ({ page }) => {
  test.setTimeout(90_000);
  let sent = 0;
  await page.route(fakeEndpoint, (route) => {
    sent += 1;
    return route.fulfill({ status: 200, body: "{}" });
  });
  await openWithEndpoint(page);

  await page.locator("#onboarding-email-skip").click();
  await chooseItalian(page);
  await expect(page.locator("#onboarding-overlay")).toBeHidden();
  expect(sent).toBe(0);

  await page.reload({ waitUntil: "domcontentloaded" });
  await expect(page.locator("#onboarding-overlay")).toBeHidden();
});
