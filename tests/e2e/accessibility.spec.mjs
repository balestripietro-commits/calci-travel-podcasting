import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { enterSite, openFullPlayer } from "./helpers.mjs";

function formatViolations(violations) {
  return violations
    .map((violation) => {
      const targets = violation.nodes.map((node) => node.target.join(", ")).join(" | ");
      return `${violation.id} (${violation.impact || "unknown"}): ${violation.help} — ${targets}`;
    })
    .join("\n");
}

async function expectNoAxeViolations(page, selector, rules = [
  "aria-allowed-attr",
  "aria-required-attr",
  "aria-valid-attr",
  "button-name",
  "color-contrast",
  "heading-order",
  "image-alt",
  "label",
  "link-name",
  "landmark-one-main",
  "region",
]) {
  // Leaflet owns a large, continuously mutating tile/SVG subtree; map controls
  // remain covered by Axe while the third-party rendering surface is excluded.
  const builder = new AxeBuilder({ page })
    .include(selector)
    .exclude("#map")
    .withRules(rules);
  const results = await builder.analyze();
  expect(results.violations, formatViolations(results.violations)).toEqual([]);
}

async function ensureOnboardingVisible(page) {
  const overlay = page.locator("#onboarding-overlay");
  // The production app normally opens this on first load. Make the fixture
  // deterministic when a reused browser profile has already dismissed it.
  if (!(await overlay.isVisible())) {
    await overlay.evaluate((element) => element.classList.remove("is-hidden"));
  }
  await page.locator("#onboarding-language-chips .onboarding-language-option").first().waitFor();
  await expect(overlay).toBeVisible();
}

function contrastRatio(foreground, background) {
  const luminance = (hex) => {
    const channels = hex.match(/[0-9a-f]{2}/gi).map((channel) => parseInt(channel, 16) / 255);
    return channels
      .map((channel) => channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4)
      .reduce((sum, channel, index) => sum + channel * [0.2126, 0.7152, 0.0722][index], 0);
  };
  const values = [luminance(foreground), luminance(background)].sort((a, b) => b - a);
  return (values[0] + 0.05) / (values[1] + 0.05);
}

async function expectUnclippedKeyboardFocus(page, selector) {
  const control = page.locator(selector);
  await page.keyboard.press("Tab");
  await control.focus();
  await expect.poll(() => control.evaluate((element) => element.matches(":focus-visible"))).toBe(true);
  const result = await control.evaluate((element) => {
    const box = element.getBoundingClientRect();
    const style = getComputedStyle(element);
    const ring = Math.max(parseFloat(style.outlineWidth) + parseFloat(style.outlineOffset), 7);
    const edges = { left: box.left - ring, right: box.right + ring, top: box.top - ring, bottom: box.bottom + ring };
    const clippedBy = [];
    for (let parent = element.parentElement; parent && parent !== document.body; parent = parent.parentElement) {
      const parentStyle = getComputedStyle(parent);
      const parentBox = parent.getBoundingClientRect();
      if (/(hidden|clip|auto|scroll)/.test(parentStyle.overflowX) &&
          (edges.left < parentBox.left - 1 || edges.right > parentBox.right + 1)) {
        clippedBy.push(`${parent.id || parent.className}: horizontal`);
      }
      if (/(hidden|clip|auto|scroll)/.test(parentStyle.overflowY) &&
          (edges.top < parentBox.top - 1 || edges.bottom > parentBox.bottom + 1)) {
        clippedBy.push(`${parent.id || parent.className}: vertical`);
      }
    }
    return {
      outlineStyle: style.outlineStyle,
      outlineWidth: parseFloat(style.outlineWidth),
      edges,
      viewport: { width: innerWidth, height: innerHeight },
      clippedBy,
    };
  });
  expect(result.outlineStyle, selector).not.toBe("none");
  expect(result.outlineWidth, selector).toBeGreaterThan(0);
  expect(result.edges.left, selector).toBeGreaterThanOrEqual(-1);
  expect(result.edges.right, selector).toBeLessThanOrEqual(result.viewport.width + 1);
  expect(result.edges.top, selector).toBeGreaterThanOrEqual(-1);
  expect(result.edges.bottom, selector).toBeLessThanOrEqual(result.viewport.height + 1);
  expect(result.clippedBy, selector).toEqual([]);
}

test.describe("accessibility", () => {
  test("theme text and stop-number colors meet normal-text contrast", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "desktop-chrome", "Color tokens are viewport-independent.");
    await page.goto("/?tappa=1&lang=it", { waitUntil: "domcontentloaded" });
    const colors = await page.evaluate(() => {
      const styles = getComputedStyle(document.documentElement);
      return Object.fromEntries([
        "--tp-color-on-surface-variant",
        "--tp-color-surface-dim",
        "--tp-color-tertiary",
        "--tp-color-primary",
        "--tp-legacy-stop-purple",
      ].map((name) => [name, styles.getPropertyValue(name).trim()]));
    });
    expect(contrastRatio(colors["--tp-color-on-surface-variant"], colors["--tp-color-surface-dim"])).toBeGreaterThanOrEqual(4.5);
    expect(contrastRatio(colors["--tp-legacy-stop-purple"], "#ffffff")).toBeGreaterThanOrEqual(4.5);
    expect(contrastRatio(colors["--tp-color-tertiary"], colors["--tp-color-primary"])).toBeGreaterThanOrEqual(4.5);
  });

  test("onboarding language focus keeps its rounded halo", async ({ page }, testInfo) => {
    if (testInfo.project.name === "mobile-chrome") {
      await page.setViewportSize({ width: 375, height: 667 });
    }
    await page.goto("/?tappa=1&lang=it", { waitUntil: "domcontentloaded" });
    await ensureOnboardingVisible(page);
    const italian = page.locator("#onboarding-language-chips .onboarding-language-option").filter({ hasText: /^IT\s/ });
    await italian.focus();
    // The email submit is a pointer action; move focus with the keyboard so
    // this assertion checks the keyboard-visible ring rather than pointer focus.
    await page.keyboard.press("Tab");
    await page.keyboard.press("Shift+Tab");
    await expect(page.locator("#onboarding-language-chips")).toHaveCSS("overflow-x", "visible");
    await expect(italian).toHaveCSS("border-radius", "999px");
    await expect(italian).toHaveCSS("outline-style", "none");
    await expect.poll(() => italian.evaluate((button) => button.matches(":focus-visible"))).toBe(true);
  });

  test("onboarding surface has no axe violations", async ({ page }) => {
    test.setTimeout(90_000);
    await page.goto("/?tappa=1&lang=it", { waitUntil: "domcontentloaded" });
    await ensureOnboardingVisible(page);
    await expectNoAxeViolations(page, "#onboarding-overlay .onboarding-card");
  });

  test("unavailable language feedback is a readable modal", async ({ page }) => {
    test.setTimeout(150_000);
    await page.goto("/?tappa=1&lang=it", { waitUntil: "domcontentloaded" });
    await ensureOnboardingVisible(page);
    const unavailableLanguages = [
      ["EN", "Language unavailable", "Close"],
      ["DE", "Sprache nicht verfügbar", "Schließen"],
      ["FR", "Langue indisponible", "Fermer"],
      ["ES", "Idioma no disponible", "Cerrar"],
      ["PT", "Idioma indisponível", "Fechar"],
      ["RU", "Язык недоступен", "Закрыть"],
    ];
    let axeChecked = false;
    for (const [code, title, closeLabel] of unavailableLanguages) {
      await page.locator("#onboarding-language-chips .onboarding-language-option").filter({ hasText: new RegExp(`^${code}\\s`) }).click();
      await expect(page.locator("#language-unavailable-modal")).toBeVisible({ timeout: 20_000 });
      await expect(page.locator("#language-unavailable-title")).toHaveText(title);
      await expect(page.locator("#language-unavailable-close")).toHaveAttribute("aria-label", closeLabel);
      await expect(page.locator("#language-unavailable-close .material-symbols-rounded")).toHaveText("close");
      if (!axeChecked) {
        await expectNoAxeViolations(page, "#language-unavailable-modal .language-unavailable-card");
        axeChecked = true;
      }
      await page.locator("#language-unavailable-close").click();
      await expect(page.locator("#language-unavailable-modal")).toBeHidden();
    }
  });

  test("player surface has no axe violations", async ({ page }) => {
    test.setTimeout(90_000);
    await page.goto("/?tappa=1&lang=it", { waitUntil: "domcontentloaded" });
    await ensureOnboardingVisible(page);
    await page.locator("#onboarding-language-chips .onboarding-language-option").filter({ hasText: /^IT\s/ }).click();
    await page.locator("#guide-skip-button").click();
    await page.locator("#mini-player-open").click();
    await expect(page.locator("#player-overlay")).toBeVisible();
    if (test.info().project.name === "mobile-chrome") {
      await expect(page.locator("#player-map-button")).toBeVisible();
    } else {
      await expect(page.locator("#player-map-button")).toBeHidden();
    }
    await expect(page.locator("#player-directions-button")).toBeHidden();
    if (test.info().project.name === "desktop-chrome") {
      await expect(page.locator("#player-overlay .is-mascot-layer")).toBeHidden();
      await expect(page.locator(".map-explore-mascot")).toBeVisible();
    } else {
      await expect(page.locator("#player-overlay .is-mascot-layer")).toBeHidden();
      await expect(page.locator(".map-explore-mascot")).toBeVisible();
    }
    await expect(page.locator("#mini-player")).not.toHaveAttribute("aria-live");
    await expect(page.locator(".player-sheet")).not.toHaveAttribute("aria-live");
    const desktopPanelLayout = await page.locator("#player-overlay").evaluate((overlay) => {
      const sheet = overlay.querySelector(".player-sheet");
      const side = overlay.querySelector(".player-side");
      return {
        sheetOverflowX: sheet ? sheet.scrollWidth - sheet.clientWidth : 0,
        sideOverflowY: side ? side.scrollHeight - side.clientHeight : 0,
      };
    });
    expect(desktopPanelLayout.sheetOverflowX).toBeLessThanOrEqual(1);
    if (test.info().project.name === "desktop-chrome") {
      expect(desktopPanelLayout.sideOverflowY).toBeLessThanOrEqual(1);
    }
    await page.locator("#player-speed-button").click();
    await expect(page.locator("#player-speed-button")).toHaveText("x1,25");
    await expectNoAxeViolations(page, "#player-overlay");
  });

  test("home route controls keep sufficient contrast", async ({ page }) => {
    test.setTimeout(150_000);
    await page.goto("/?tappa=1&lang=it", { waitUntil: "domcontentloaded" });
    await ensureOnboardingVisible(page);
    await page.locator("#onboarding-language-chips .onboarding-language-option").filter({ hasText: /^IT\s/ }).click();
    await page.locator("#guide-skip-button").click();
    await page.locator(".stop-button").nth(1).click();
    await expect(page.locator('.stop-button[aria-current="true"] .stop-index')).toHaveText("2");
    if (!(await page.locator("audio").evaluate((audio) => audio.paused))) {
      await page.locator("#mini-player-toggle").click();
    }
    await expect.poll(() => page.locator("audio").evaluate((audio) => audio.paused)).toBe(true);
    await page.locator("#mini-player-speed-button").click();
    await expect(page.locator("#mini-player-speed-button")).toHaveText("x1,25");
    // On mobile, Axe's contrast pass over the entire live map page can stall
    // while Leaflet is repainting. Scan the authored surfaces separately and
    // keep the rendered map (which has its own UI tests) out of this pass.
    const surfaces = test.info().project.name === "mobile-chrome"
      ? [".site-header", ".intro-panel", "#stop-preview", ".stops-panel", ".platforms-panel", "#mini-player", ".map-floating-controls"]
      : ["#main-content", "#mini-player"];
    for (const surface of surfaces) {
      await expectNoAxeViolations(page, surface, ["color-contrast"]);
    }
  });

  test("mobile full player exposes a map return button", async ({ page }, testInfo) => {
    test.setTimeout(90_000);
    test.skip(testInfo.project.name !== "mobile-chrome", "The map return button is mobile-only.");
    await page.goto("/?tappa=1&lang=it", { waitUntil: "domcontentloaded" });
    await ensureOnboardingVisible(page);
    await page.locator("#onboarding-language-chips .onboarding-language-option").filter({ hasText: /^IT\s/ }).click();
    await page.locator("#guide-skip-button").click();
    await page.locator("#mini-player-open").click();
    await expect(page.locator("#player-map-button")).toBeVisible();
    await page.locator("#player-map-button").click();
    await expect(page.locator("#player-overlay")).toBeVisible();
    await expect(page.locator("#player-overlay")).not.toHaveClass(/is-mobile-map-player/);
    await expect(page.locator("#player-listen-help-button")).toBeVisible();
  });

  test("keyboard flow keeps focus and controls usable", async ({ page }, testInfo) => {
    test.setTimeout(120_000);
    test.skip(testInfo.project.name !== "desktop-chrome", "Keyboard audit runs once on desktop Chrome.");
    await page.goto("/?tappa=1&lang=it", { waitUntil: "domcontentloaded" });
    await ensureOnboardingVisible(page);

    const italian = page.locator("#onboarding-language-chips .onboarding-language-option").filter({ hasText: /^IT\s/ });
    await italian.focus();
    await page.keyboard.press("Enter");
    await expect(page.locator("#guide-layer")).toBeVisible();

    await page.locator("#guide-skip-button").focus();
    await page.keyboard.press("Enter");
    await expect(page.locator("#guide-layer")).toBeHidden();

    const stopTwo = page.locator(".stop-button").nth(1);
    await stopTwo.focus();
    await page.keyboard.press("Enter");
    await expect(page.locator('.stop-button[aria-current="true"] .stop-index')).toHaveText("2");

    const openButton = page.locator("#mini-player-open");
    await openButton.focus();
    await page.keyboard.press("Enter");
    await expect(page.locator("#player-overlay")).toBeVisible();

    const playButton = page.locator("#player-play-button");
    await playButton.focus();
    if (!(await page.locator("audio").evaluate((audio) => audio.paused))) {
      await page.keyboard.press("Enter");
      await expect.poll(() => page.locator("audio").evaluate((audio) => audio.paused)).toBe(true);
    }
    await page.keyboard.press("Enter");
    await expect.poll(() => page.locator("audio").evaluate((audio) => !audio.paused)).toBe(true);
    await page.keyboard.press("Enter");
    await expect.poll(() => page.locator("audio").evaluate((audio) => audio.paused)).toBe(true);

    const progress = page.locator("#player-progress-input");
    await progress.focus();
    const before = await progress.inputValue();
    await page.keyboard.press("ArrowRight");
    await expect(progress).not.toHaveValue(before);

    const closeButton = page.locator("#player-close-button");
    await closeButton.focus();
    await page.keyboard.press("Enter");
    await expect(page.locator("#player-overlay")).toBeHidden();
    await expect(page.locator("#mini-player-open")).toBeFocused();
  });

  test("200% and 400% zoom equivalents keep the layout within the viewport", async ({ page }, testInfo) => {
    test.setTimeout(120_000);
    test.skip(testInfo.project.name !== "desktop-chrome", "Zoom audit runs once with desktop Chrome.");

    for (const width of [720, 360]) {
      await page.setViewportSize({ width, height: 900 });
      await page.goto("/?tappa=1&lang=it", { waitUntil: "domcontentloaded" });
      await ensureOnboardingVisible(page);
      await page.locator("#onboarding-language-chips .onboarding-language-option").filter({ hasText: /^IT\s/ }).click();
      await page.locator("#guide-skip-button").click();
      await page.locator("#mini-player-open").click();
      await expect(page.locator("#player-overlay")).toBeVisible();

      const geometry = await page.evaluate(() => ({
        documentWidth: document.documentElement.scrollWidth,
        viewportWidth: document.documentElement.clientWidth,
      }));
      expect(geometry.documentWidth).toBeLessThanOrEqual(geometry.viewportWidth + 1);
      const controlBoxes = await Promise.all([
        page.locator("#player-prev-button").boundingBox(),
        page.locator("#player-play-button").boundingBox(),
        page.locator("#player-next-button").boundingBox(),
        page.locator("#player-speed-button").boundingBox(),
      ]);
      controlBoxes.forEach((box) => expect(box).not.toBeNull());
      for (let index = 1; index < controlBoxes.length; index += 1) {
        expect(controlBoxes[index].x).toBeGreaterThanOrEqual(controlBoxes[index - 1].x + controlBoxes[index - 1].width - 2);
      }
    }
  });

  test("compact controls remain reachable at narrow mobile widths", async ({ page }, testInfo) => {
    test.setTimeout(120_000);
    test.skip(testInfo.project.name !== "desktop-chrome", "Viewport audit runs once in Chrome.");
    for (const width of [320, 375, 440]) {
      await page.setViewportSize({ width, height: 667 });
      await page.goto("/?tappa=1&lang=it", { waitUntil: "domcontentloaded" });
      await ensureOnboardingVisible(page);
      await page.locator("#onboarding-language-chips .onboarding-language-option").filter({ hasText: /^IT\s/ }).click();
      await page.locator("#guide-skip-button").click();

      const controls = await page.locator("#mini-player .mini-player-controls button").evaluateAll((buttons) =>
        buttons.filter((button) => getComputedStyle(button).display !== "none").map((button) => {
          const rect = button.getBoundingClientRect();
          return { id: button.id, left: rect.left, right: rect.right, width: rect.width, height: rect.height, centerY: rect.top + rect.height / 2 };
        }),
      );
      expect(controls).toHaveLength(6);
      for (const control of controls) {
        expect(control.left, control.id).toBeGreaterThanOrEqual(0);
        expect(control.right, control.id).toBeLessThanOrEqual(width);
        expect(control.width, control.id).toBeGreaterThanOrEqual(44);
        expect(control.height, control.id).toBeGreaterThanOrEqual(44);
        expect(Math.abs(control.centerY - controls[0].centerY), control.id).toBeLessThanOrEqual(1);
      }
      for (let index = 1; index < controls.length; index += 1) {
        expect(controls[index].left, controls[index].id).toBeGreaterThanOrEqual(controls[index - 1].right);
      }
      await expect(page.locator("#mini-player-progress-input")).toHaveCSS("height", "44px");
    }

    await page.setViewportSize({ width: 1440, height: 900 });
    await page.reload({ waitUntil: "domcontentloaded" });
    await expect(page.locator(".map-stage-frame .leaflet-control-zoom a")).toHaveCount(2);
    const zoomSizes = await page.locator(".map-stage-frame .leaflet-control-zoom a").evaluateAll((links) =>
      links.map((link) => ({ width: link.getBoundingClientRect().width, height: link.getBoundingClientRect().height })),
    );
    for (const size of zoomSizes) {
      expect(size.width).toBeGreaterThanOrEqual(44);
      expect(size.height).toBeGreaterThanOrEqual(44);
    }
  });

  test("map, player and guide keyboard focus rings stay visible at 320px", async ({ page }, testInfo) => {
    test.setTimeout(120_000);
    test.skip(testInfo.project.name !== "desktop-chrome", "Narrow keyboard focus audit runs once in Chrome.");
    await page.setViewportSize({ width: 320, height: 667 });
    await enterSite(page);
    await expectUnclippedKeyboardFocus(page, "#map-recenter-button");
    await expectUnclippedKeyboardFocus(page, "#mini-player-speed-button");
    await openFullPlayer(page);
    await expectUnclippedKeyboardFocus(page, "#player-map-help-button");
    await page.locator("#player-map-help-button").click();
    await expect(page.locator("#player-context-guide")).toBeVisible();
    await expectUnclippedKeyboardFocus(page, "#player-context-guide-next");
  });

  test("long listening titles remain readable with reduced motion", async ({ page }, testInfo) => {
    test.setTimeout(120_000);
    test.skip(testInfo.project.name !== "desktop-chrome", "Responsive reduced-motion audit runs once.");
    for (const width of [320, 375]) {
      await page.setViewportSize({ width, height: 667 });
      await page.emulateMedia({ reducedMotion: "reduce" });
      await page.goto("/?tappa=6&lang=it", { waitUntil: "domcontentloaded" });
      await ensureOnboardingVisible(page);
      await page.locator("#onboarding-language-chips .onboarding-language-option").filter({ hasText: /^IT\s/ }).click();
      await page.locator("#guide-skip-button").click();
      await page.locator(".stop-button").nth(5).click();
      await page.locator("#mini-player-open").click();
      await page.locator("#player-map-button").click();

      const title = page.locator("#detail-title");
      await expect(title).toHaveClass(/is-overflowing/);
      await expect(title).toHaveAttribute("tabindex", "0");
      await expect(page.locator("#detail-title-text")).toHaveText("Parrocchia di Santa Maria Addolorata e San Giovanni Apostolo");
      const before = await title.evaluate((element) => ({
        clientWidth: element.clientWidth,
        scrollWidth: element.scrollWidth,
        clientHeight: element.clientHeight,
        scrollHeight: element.scrollHeight,
        left: element.getBoundingClientRect().left,
        right: element.getBoundingClientRect().right,
      }));
      expect(before.left).toBeGreaterThanOrEqual(0);
      expect(before.right).toBeLessThanOrEqual(width + 1);
      expect(before.scrollWidth).toBeGreaterThan(before.clientWidth);
      expect(before.scrollHeight).toBeLessThanOrEqual(before.clientHeight + 2);
      await title.focus();
      await page.keyboard.press("ArrowRight");
      await expect.poll(() => title.evaluate((element) => element.scrollLeft)).toBeGreaterThan(0);
      await title.evaluate((element) => { element.scrollLeft = element.scrollWidth; });
      await expect.poll(() => title.evaluate((element) => element.scrollLeft + element.clientWidth >= element.scrollWidth - 1)).toBe(true);
    }
  });
});
