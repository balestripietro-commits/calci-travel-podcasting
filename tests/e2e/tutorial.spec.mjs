import { expect, test } from "@playwright/test";
import { collectRuntimeErrors, enterSite, expectInsideViewport, expectNoRuntimeErrors } from "./helpers.mjs";

test("initial transcript stays hidden through onboarding and tutorial until audio plays", async ({ page }) => {
  test.setTimeout(90_000);
  await page.goto("./?tappa=1&lang=it", { waitUntil: "domcontentloaded" });
  await expect(page.locator("#onboarding-overlay")).toBeVisible();
  await page.evaluate(() => {
    const caption = document.querySelector("#map-live-caption");
    const onboarding = document.querySelector("#onboarding-overlay");
    window.__initialCaptionFlashed = false;
    const check = () => {
      if (!caption.hidden && caption.classList.contains("is-visible") &&
          onboarding.classList.contains("is-hidden")) {
        window.__initialCaptionFlashed = true;
      }
    };
    new MutationObserver(check).observe(caption, { attributes: true, attributeFilter: ["class", "hidden"] });
    new MutationObserver(check).observe(onboarding, { attributes: true, attributeFilter: ["class"] });
  });

  await page.locator("#onboarding-language-chips .onboarding-language-option").filter({ hasText: /^IT\s/ }).click();
  await expect(page.locator("#guide-layer")).toBeVisible();
  await page.waitForTimeout(3_000);
  expect(await page.evaluate(() => window.__initialCaptionFlashed)).toBe(false);
  await expect(page.locator("#map-live-caption")).toBeHidden();
  await expect.poll(() => page.locator("audio").evaluate((audio) => audio.paused)).toBe(true);

  await page.locator("#guide-skip-button").click();
  await page.locator("#mini-player-toggle").click();
  await expect.poll(() => page.locator("audio").evaluate((audio) => !audio.paused)).toBe(true);
  await expect(page.locator("#map-live-caption")).toBeVisible({ timeout: 8_000 });
  await page.locator("#mini-player-toggle").click();
  await expect(page.locator("#map-live-caption")).toBeVisible();
  await expect(page.locator("#map-live-caption")).toBeHidden({ timeout: 4_500 });
});

test("tutorial keeps desktop in the map experience and mobile in the full player", async ({ page }, testInfo) => {
  test.setTimeout(75_000);
  const errors = collectRuntimeErrors(page);
  if (testInfo.project.name !== "desktop-chrome") {
    await page.setViewportSize({ width: 375, height: 667 });
  }
  await enterSite(page, { guide: true });

  const guide = page.locator("#guide-card");
  const text = page.locator("#guide-step-text");
  const next = page.locator("#guide-next-button");
  const previous = page.locator("#guide-prev-button");

  await expect(previous).toBeDisabled();
  const firstText = await text.textContent();

  await next.click();
  await expect(previous).toBeEnabled();
  await expect(text).not.toHaveText(firstText);
  await expect(guide).toHaveClass(/is-pointing-/);
  await expect(guide).not.toHaveClass(/is-repositioning/);
  await expectInsideViewport(guide, page);
  if (testInfo.project.name !== "desktop-chrome") {
    await expect(text).toContainText("ricentra");
    await expect(page.locator("#map-recenter-button")).toHaveClass(/is-guide-highlighted/);
    await expect(page.locator(".map-floating-controls")).toHaveCSS("z-index", "4250");

    await next.click();
    await expect(text).toContainText("Google Maps");
    const guideOverlapsDirections = await page.evaluate(() => {
      const guideRect = document.querySelector("#guide-card")?.getBoundingClientRect();
      const directionsRect = document.querySelector("#map-directions-button")?.getBoundingClientRect();
      if (!guideRect || !directionsRect) {
        return true;
      }
      return !(
        guideRect.right <= directionsRect.left ||
        guideRect.left >= directionsRect.right ||
        guideRect.bottom <= directionsRect.top ||
        guideRect.top >= directionsRect.bottom
      );
    });
    expect(guideOverlapsDirections).toBe(false);

    const directionsText = await text.textContent();
    await previous.click();
    await expect(text).toContainText("ricentra");
    await next.click();
    await expect(text).toHaveText(directionsText);
    await next.click();
  }

  await expect(guide).not.toHaveClass(/is-repositioning/);
  await expect(guide).not.toHaveClass(/is-arriving/);
  const stopsGuideGeometry = await page.evaluate(() => {
    const guide = document.querySelector("#guide-card");
    const guideRect = guide?.getBoundingClientRect();
    const panelRect = document.querySelector(".stops-panel")?.getBoundingClientRect();
    if (!guide || !guideRect || !panelRect) {
      return null;
    }

    return {
      overlaps: !(
        guideRect.right <= panelRect.left ||
        guideRect.left >= panelRect.right ||
        guideRect.bottom <= panelRect.top ||
        guideRect.top >= panelRect.bottom
      ),
      isAbove: guideRect.bottom <= panelRect.top - 8,
      pointerX: Number.parseFloat(getComputedStyle(guide).getPropertyValue("--guide-pointer-x")),
      targetX: panelRect.left + panelRect.width / 2 - guideRect.left,
    };
  });
  expect(stopsGuideGeometry).not.toBeNull();
  expect(stopsGuideGeometry.overlaps).toBe(false);
  expect(Math.abs(stopsGuideGeometry.pointerX - stopsGuideGeometry.targetX)).toBeLessThanOrEqual(1);
  const stopsHighlightCutoff = await page.evaluate(() => {
    const panel = document.querySelector(".stops-panel");
    const player = document.querySelector("#mini-player");
    const caption = document.querySelector("#map-live-caption");
    if (!panel || !player) return null;
    return {
      panelTop: panel.getBoundingClientRect().top,
      playerTop: player.getBoundingClientRect().top,
      captionTop: caption && !caption.hidden ? caption.getBoundingClientRect().top : null,
      visibleHeight: Number.parseFloat(panel.style.getPropertyValue("--guide-stops-visible-height")),
    };
  });
  expect(stopsHighlightCutoff).not.toBeNull();
  expect(stopsHighlightCutoff.panelTop + stopsHighlightCutoff.visibleHeight).toBeLessThanOrEqual(stopsHighlightCutoff.playerTop - 8);
  if (stopsHighlightCutoff.captionTop !== null) {
    expect(stopsHighlightCutoff.panelTop + stopsHighlightCutoff.visibleHeight).toBeLessThanOrEqual(stopsHighlightCutoff.captionTop - 8);
  }
  const captionWasHidden = await page.locator("#map-live-caption").evaluate((caption) => caption.hidden);
  await page.locator("#map-live-caption").evaluate((caption) => {
    caption.hidden = false;
    caption.classList.add("is-visible");
  });
  await expect.poll(() => page.evaluate(() => {
    const panel = document.querySelector(".stops-panel");
    const caption = document.querySelector("#map-live-caption");
    const cutoff = panel.getBoundingClientRect().top +
      Number.parseFloat(panel.style.getPropertyValue("--guide-stops-visible-height"));
    return cutoff <= caption.getBoundingClientRect().top - 8;
  })).toBe(true);
  if (captionWasHidden) {
    await page.locator("#map-live-caption").evaluate((caption) => {
      caption.classList.remove("is-visible");
      caption.hidden = true;
    });
  }
  if (testInfo.project.name === "desktop-chrome") {
    expect(stopsGuideGeometry.isAbove).toBe(true);
  }
  await expectInsideViewport(guide, page);
  const stopsGuidePosition = await page.evaluate(() => {
    const rect = document.querySelector("#guide-card")?.getBoundingClientRect();
    return rect ? { left: rect.left, top: rect.top } : null;
  });
  await page.waitForTimeout(850);
  const settledStopsGuidePosition = await page.evaluate(() => {
    const rect = document.querySelector("#guide-card")?.getBoundingClientRect();
    return rect ? { left: rect.left, top: rect.top } : null;
  });
  expect(stopsGuidePosition).not.toBeNull();
  expect(settledStopsGuidePosition).not.toBeNull();
  expect(Math.abs(stopsGuidePosition.left - settledStopsGuidePosition.left)).toBeLessThanOrEqual(1);
  expect(Math.abs(stopsGuidePosition.top - settledStopsGuidePosition.top)).toBeLessThanOrEqual(1);

  await next.click();
  await expect(text).toContainText("player resterà");
  await expect(guide).not.toHaveClass(/is-repositioning/);
  await expectInsideViewport(guide, page);
  await next.click();

  if (testInfo.project.name === "desktop-chrome") {
    await expect(text).toContainText("mappa estesa");
    await expect(guide).not.toHaveClass(/is-repositioning/);
    await expectInsideViewport(guide, page);
    await expect(guide).toHaveClass(/is-pointing-down/);
    const exploreGuideGeometry = await page.evaluate(() => {
      const guideRect = document.querySelector("#guide-card")?.getBoundingClientRect();
      const expandRect = document.querySelector("#mini-player-expand")?.getBoundingClientRect();
      if (!guideRect || !expandRect) {
        return null;
      }
      const expandCenterX = expandRect.left + expandRect.width / 2;
      return {
        isAbove: guideRect.bottom <= expandRect.top - 8,
        pointsAtExpand: expandCenterX >= guideRect.left && expandCenterX <= guideRect.right,
      };
    });
    expect(exploreGuideGeometry).not.toBeNull();
    expect(exploreGuideGeometry.isAbove).toBe(true);
    expect(exploreGuideGeometry.pointsAtExpand).toBe(true);
    await expect(page.locator("#player-overlay")).toBeHidden();
    await expect(text).toContainText("mappa estesa");
    await expect(next).toHaveText("→");

    await next.click();
    await expect(page.locator("#guide-action-demo")).toHaveCount(0);
    await expect(page.locator("#player-overlay")).toBeVisible({ timeout: 7_000 });
    await expect(page.locator("#player-overlay")).toHaveClass(/is-map-panel/);
    await expect(page.locator("body")).toHaveClass(/is-map-player-panel/);
    await expect(page.locator("#guide-layer")).toBeVisible();
    await expect(page.locator(".map-stage-frame")).toHaveClass(/is-guide-highlighted/);
    await expect(guide).not.toHaveClass(/is-floating-guide-card/);
    await expect(guide).toHaveClass(/is-pointing-up/);
    await expectInsideViewport(guide, page);
    const exploreMapGuideGeometry = await page.evaluate(() => {
      const guideRect = document.querySelector("#guide-card")?.getBoundingClientRect();
      const mapRect = document.querySelector(".map-stage-frame")?.getBoundingClientRect();
      if (!guideRect || !mapRect) {
        return null;
      }

      return {
        centered: Math.abs(
          guideRect.left + guideRect.width / 2 - (mapRect.left + mapRect.width / 2),
        ) <= 1,
        atBottom: guideRect.bottom <= mapRect.bottom - 16,
      };
    });
    expect(exploreMapGuideGeometry).not.toBeNull();
    expect(exploreMapGuideGeometry.centered).toBe(true);
    expect(exploreMapGuideGeometry.atBottom).toBe(true);
    const guideIsFrontmost = await page.evaluate(() => {
      const card = document.querySelector("#guide-card");
      const rect = card?.getBoundingClientRect();
      if (!card || !rect) {
        return false;
      }
      const topElement = document.elementFromPoint(
        rect.left + rect.width / 2,
        rect.top + rect.height / 2,
      );
      return topElement instanceof Node && card.contains(topElement);
    });
    expect(guideIsFrontmost).toBe(true);
    await expect(text).toContainText("vista estesa");
    await expect(next).toHaveText("✓");
    await page.waitForTimeout(450);
    await expect(page.locator("#guide-layer")).toBeVisible();
    await expect(text).toContainText("vista estesa");
  } else {
    await expect(page.locator("#player-overlay")).toBeVisible();
    await expect(text).toContainText("Mappa + player");
    await expect(page.locator("#player-overlay")).toHaveClass(/is-mobile-map-player/);
    await expect(next).toHaveText("→");
    await next.click();
    await expect(text).toContainText("Full player audio");
    await expect(page.locator("#player-map-button")).toHaveClass(/is-guide-highlighted/);
    await expect(next).toHaveText("→");

    await next.click();
    await expect(text).toContainText("vista Full player audio");
    await expect(page.locator("#player-overlay")).not.toHaveClass(/is-mobile-map-player/);
    await expect(page.locator("#player-map-button .material-symbols-rounded")).toHaveText("map");
    await expect(page.locator(".player-sheet")).toHaveClass(/is-guide-highlighted/);
    await expect(guide).not.toHaveClass(/is-repositioning/);
    await expectInsideViewport(guide, page);
    const listeningArtworkIsClear = await page.evaluate(() => {
      const card = document.querySelector("#guide-card")?.getBoundingClientRect();
      const artwork = document.querySelector("#player-artwork")?.getBoundingClientRect();
      return card && artwork && card.top >= artwork.bottom;
    });
    expect(listeningArtworkIsClear).toBe(true);
    await previous.click();
    await expect(page.locator("#player-overlay")).toHaveClass(/is-mobile-map-player/);
    await expect(page.locator("#player-map-button")).toHaveClass(/is-guide-highlighted/);
    await next.click();
    await expect(text).toContainText("vista Full player audio");
    await expect(page.locator("#player-overlay")).not.toHaveClass(/is-mobile-map-player/);

    await next.click();
    await expect(text).toContainText("tornare a Mappa + player");
    await expect(page.locator("#player-map-button")).toHaveClass(/is-guide-highlighted/);
    await expect(page.locator("#player-overlay")).not.toHaveClass(/is-mobile-map-player/);
    await expect(guide).not.toHaveClass(/is-repositioning/);
    const returnButtonIsClear = await page.evaluate(() => {
      const card = document.querySelector("#guide-card")?.getBoundingClientRect();
      const button = document.querySelector("#player-map-button")?.getBoundingClientRect();
      return card && button && (
        card.bottom <= button.top || card.top >= button.bottom ||
        card.right <= button.left || card.left >= button.right
      );
    });
    expect(returnButtonIsClear).toBe(true);
    await previous.click();
    await expect(text).toContainText("vista Full player audio");
    await expect(page.locator("#player-overlay")).not.toHaveClass(/is-mobile-map-player/);
    await next.click();
    await expect(text).toContainText("tornare a Mappa + player");
    await next.click();
    await expect(text).toContainText("Con la X");
    await expect(page.locator("#player-overlay")).toHaveClass(/is-mobile-map-player/);
    await expect(page.locator("#player-close-button")).toHaveClass(/is-guide-highlighted/);
    await expect(next).toHaveText("✓");
  }

  if (testInfo.project.name === "desktop-chrome") {
    await page.evaluate(() => {
      window.__guideClosingStates = [];
      const layer = document.querySelector("#guide-layer");
      const capture = () => ({
        guideVisible: !layer.classList.contains("is-hidden"),
        closingExplore: layer.classList.contains("is-closing-explore"),
        bubbleOpacity: Number(getComputedStyle(document.querySelector("#guide-card")).opacity),
        veilActive: document.body.classList.contains("guide-open"),
        mapHighlighted: document.querySelector(".map-stage-frame").classList.contains("is-guide-highlighted"),
        scrollY: window.scrollY,
      });
      const observer = new MutationObserver(() => {
        if (!layer.classList.contains("is-closing-explore")) return;
        observer.disconnect();
        window.__guideClosingStates.push(capture());
        const card = document.querySelector("#guide-card");
        const captureFadeEnd = (event) => {
          if (event.propertyName !== "opacity") return;
          card.removeEventListener("transitionend", captureFadeEnd);
          window.__guideClosingStates.push(capture());
        };
        card.addEventListener("transitionend", captureFadeEnd);
      });
      observer.observe(layer, { attributes: true, attributeFilter: ["class"] });
    });
  }
  await next.click();
  await expect(page.locator("#guide-layer")).toBeHidden({ timeout: 10_000 });
  await expect(page.locator("#player-overlay")).toBeHidden({ timeout: 10_000 });
  if (testInfo.project.name === "desktop-chrome") {
    const [start, during] = await page.evaluate(() => window.__guideClosingStates);
    expect(start.guideVisible && start.closingExplore && start.veilActive && start.mapHighlighted).toBe(true);
    expect(during.guideVisible && during.closingExplore && during.veilActive && during.mapHighlighted).toBe(true);
    expect(during.bubbleOpacity).toBeLessThan(0.5);
    expect(during.scrollY).toBe(0);
  }
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(0);
  await expect(page.locator(".map-stage-frame")).not.toHaveClass(/is-guide-highlighted/);
  await expect(page.locator("body")).not.toHaveClass(/guide-open/);
  await expect(page.locator(".app-shell")).toHaveJSProperty("inert", false);
  await expectNoRuntimeErrors(errors);
});

test("tutorial can be closed immediately", async ({ page }) => {
  const errors = collectRuntimeErrors(page);
  await enterSite(page, { guide: true });
  await page.locator("#guide-skip-button").click();
  await expect(page.locator("#guide-layer")).toBeHidden();
  await expect(page.locator("#player-overlay")).toBeHidden();
  await expectNoRuntimeErrors(errors);
});

test("desktop Explore closes normally with X after the tutorial", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "desktop-chrome", "Explore is desktop-only.");
  const errors = collectRuntimeErrors(page);
  await enterSite(page);

  await page.locator("#mini-player-expand").click();
  await expect(page.locator("#player-overlay")).toHaveClass(/is-map-panel/);
  await page.locator("#player-close-button").click();
  await expect(page.locator("#player-overlay")).toBeHidden();
  await expect(page.locator(".map-stage-frame")).not.toHaveClass(/is-expanded/);
  await expect(page.locator("body")).not.toHaveClass(/is-map-player-panel|guide-open/);
  await expect(page.locator("#guide-layer")).toBeHidden();
  await expectNoRuntimeErrors(errors);
});

test("tutorial asks for confirmation before interrupting from its backdrop", async ({ page }) => {
  const errors = collectRuntimeErrors(page);
  await enterSite(page, { guide: true });

  const guide = page.locator("#guide-layer");
  const confirm = page.locator("#guide-exit-confirm");
  const initialStep = await page.locator("#guide-step-text").textContent();
  await guide.click({ position: { x: 8, y: 8 } });
  await expect(confirm).toBeVisible();
  await expect(confirm).toContainText("Vuoi interrompere il tutorial?");
  await expect(confirm).toHaveCSS("background-color", "rgb(255, 255, 255)");

  await page.locator("#guide-exit-confirm-cancel").click();
  await expect(confirm).toBeHidden();
  await expect(page.locator("#guide-step-text")).toHaveText(initialStep);

  await guide.click({ position: { x: 8, y: 8 } });
  await page.locator("#guide-exit-confirm-accept").click();
  await expect(guide).toBeHidden();
  await expect(page.locator(".app-shell")).toHaveJSProperty("inert", false);
  await expectNoRuntimeErrors(errors);
});

test("tutorial blocks pointer, keyboard and assistive access to background controls", async ({ page }, testInfo) => {
  const errors = collectRuntimeErrors(page);
  await enterSite(page, { guide: true });

  await expect(page.locator(".app-shell")).toHaveJSProperty("inert", true);
  await expect(page.locator("#mini-player")).toHaveJSProperty("inert", true);
  await expect(page.locator("#guide-next-button")).toBeFocused();

  const stop = page.locator(".stop-button").nth(1);
  const stopBox = await stop.boundingBox();
  expect(stopBox).not.toBeNull();
  await page.mouse.click(stopBox.x + stopBox.width / 2, stopBox.y + stopBox.height / 2);
  await expect(page.locator('.stop-button[aria-current="true"] .stop-index')).toHaveText("1");

  if (testInfo.project.name === "desktop-chrome") {
    await expect(page.locator("#guide-exit-confirm")).toBeVisible();
    await page.locator("#guide-exit-confirm-cancel").click();
    await expect(page.locator("#guide-exit-confirm")).toBeHidden();
  }
  await page.locator("#guide-skip-button").click();
  await expect(page.locator(".app-shell")).toHaveJSProperty("inert", false);
  await expect(page.locator("#mini-player")).toHaveJSProperty("inert", false);
  await expectNoRuntimeErrors(errors);
});
