import { expect, test } from "@playwright/test";
import {
  collectRuntimeErrors,
  enterSite,
  expectAudioPlaying,
  expectClassObserved,
  expectNoRuntimeErrors,
  openFullPlayer,
  stopButton,
  watchClass,
} from "./helpers.mjs";

test("map uses canonical OSM tiles and keeps attribution visible above the player", async ({ page }, testInfo) => {
  test.setTimeout(180_000);
  const tileHosts = new Set();
  const tileReferrers = new Set();
  await page.route(/https:\/\/(?:[abc]\.)?tile\.openstreetmap\.org\/.*/, async (route) => {
    tileHosts.add(new URL(route.request().url()).hostname);
    tileReferrers.add(route.request().headers().referer || "");
    await route.fulfill({
      status: 200,
      contentType: "image/svg+xml",
      body: '<svg xmlns="http://www.w3.org/2000/svg" width="256" height="256"><rect width="256" height="256" fill="#edf2e8"/></svg>',
    });
  });

  await page.goto("/?tappa=1&lang=it", { waitUntil: "domcontentloaded" });
  // This test checks the map credit, not the onboarding hit targets. Use the
  // app's own handlers without waiting for lengthy animations on CI devices.
  await page.locator("#onboarding-language-chips .onboarding-language-option").first().evaluate((button) => button.click());
  await page.locator("#guide-skip-button").evaluate((button) => button.click());
  await expect(page.locator("#guide-layer")).toBeHidden();
  const attribution = page.locator("#map .leaflet-control-attribution");
  const credit = attribution.getByRole("link", { name: "© OpenStreetMap" });
  await expect(credit).toBeVisible();
  await expect(credit).toHaveAttribute("href", "https://www.openstreetmap.org/copyright");
  expect([...tileHosts]).toEqual(["tile.openstreetmap.org"]);
  expect([...tileReferrers]).toEqual([`${new URL(page.url()).origin}/`]);

  const geometry = async () => page.evaluate(() => {
    const mapBox = document.querySelector("#map").getBoundingClientRect();
    const creditBox = document.querySelector("#map .leaflet-control-attribution").getBoundingClientRect();
    const zoomBox = document.querySelector("#map .leaflet-control-zoom").getBoundingClientRect();
    const frame = document.querySelector(".map-stage-frame");
    const caption = document.querySelector("#map-live-caption");
    const captionBox = caption && !caption.hidden ? caption.getBoundingClientRect() : null;
    const creditLink = document.querySelector("#map .leaflet-control-attribution a");
    return {
      creditInsideMap: creditBox.left >= mapBox.left && creditBox.right <= mapBox.right &&
        creditBox.top >= mapBox.top && creditBox.bottom <= mapBox.bottom,
      topInset: creditBox.top - mapBox.top,
      leftInset: creditBox.left - mapBox.left,
      rightInset: mapBox.right - creditBox.right,
      bottomInset: mapBox.bottom - creditBox.bottom,
      centerOffset: Math.abs((creditBox.left + creditBox.right) / 2 - (mapBox.left + mapBox.right) / 2),
      frameBackground: getComputedStyle(frame).backgroundColor,
      creditBackground: getComputedStyle(document.querySelector("#map .leaflet-control-attribution")).backgroundColor,
      creditFontSize: parseFloat(getComputedStyle(document.querySelector("#map .leaflet-control-attribution")).fontSize),
      creditLinkHeight: creditLink.getBoundingClientRect().height,
      clearOfCaption: !captionBox || captionBox.bottom <= creditBox.top - 8 ||
        captionBox.right <= creditBox.left || captionBox.left >= creditBox.right,
      clearOfZoom: zoomBox.height === 0 || creditBox.right <= zoomBox.left || creditBox.left >= zoomBox.right,
      creditBottom: creditBox.bottom,
      dockTop: document.querySelector("#player-overlay .player-sheet").getBoundingClientRect().top,
    };
  });

  expect((await geometry()).creditInsideMap).toBe(true);
  expect((await geometry()).bottomInset).toBeLessThanOrEqual(2);
  expect((await geometry()).centerOffset).toBeLessThanOrEqual(2);
  expect((await geometry()).creditBackground).toBe((await geometry()).frameBackground);
  expect((await geometry()).creditFontSize).toBe(testInfo.project.name === "desktop-chrome" ? 11 : 10);
  expect((await geometry()).creditLinkHeight).toBeGreaterThanOrEqual(24);
  const homeFrameColors = await page.locator(".map-stage-frame").evaluate((frame) => {
    const styles = getComputedStyle(frame);
    return { background: styles.backgroundColor, border: styles.borderTopColor };
  });
  if (testInfo.project.name === "desktop-chrome") {
    expect((await geometry()).clearOfZoom).toBe(true);
  }
  const originalViewport = page.viewportSize();
  await page.setViewportSize({ width: testInfo.project.name === "desktop-chrome" ? 375 : 1280, height: originalViewport.height });
  await expect.poll(async () => {
    const position = await geometry();
    return position.centerOffset;
  }).toBeLessThanOrEqual(2);
  if (testInfo.project.name === "mobile-chrome") {
    expect((await geometry()).bottomInset).toBeLessThanOrEqual(2);
    expect((await geometry()).creditBackground).toBe((await geometry()).frameBackground);
    expect((await geometry()).creditFontSize).toBe(11);
  }
  await page.setViewportSize(originalViewport);
  await expect.poll(async () => {
    const position = await geometry();
    return position.centerOffset;
  }).toBeLessThanOrEqual(2);
  if (testInfo.project.name === "mobile-chrome") {
    for (const width of [320, 375, 440]) {
      await page.setViewportSize({ width, height: originalViewport.height });
      await expect.poll(async () => (await geometry()).centerOffset).toBeLessThanOrEqual(2);
      const position = await geometry();
      expect(position.creditInsideMap).toBe(true);
      expect(position.bottomInset).toBeLessThanOrEqual(2);
      expect(position.creditBackground).toBe(position.frameBackground);
    }
    await page.setViewportSize(originalViewport);
  }
  await page.locator("#mini-player-open").evaluate((button) => button.click());
  await expect(page.locator("#player-overlay")).toBeVisible();
  expect((await geometry()).creditInsideMap).toBe(true);
  await expect(credit).toBeVisible();
  if (testInfo.project.name === "desktop-chrome") {
    expect((await geometry()).bottomInset).toBeLessThanOrEqual(2);
    expect((await geometry()).centerOffset).toBeLessThanOrEqual(2);
    expect((await geometry()).creditBackground).toBe((await geometry()).frameBackground);
    const exploreFrameColors = await page.locator(".map-stage-frame").evaluate((frame) => {
      const styles = getComputedStyle(frame);
      return { background: styles.backgroundColor, border: styles.borderTopColor };
    });
    expect(exploreFrameColors).toEqual(homeFrameColors);
    expect((await geometry()).creditFontSize).toBe(11);
    await page.locator("#player-play-button").evaluate((button) => button.click());
    await expect(page.locator("#map-live-caption")).toBeVisible({ timeout: 8000 });
    expect((await geometry()).clearOfCaption).toBe(true);
  } else {
    const position = await geometry();
    expect(position.creditFontSize).toBe(10);
    expect(position.creditLinkHeight).toBeGreaterThanOrEqual(24);
    expect(position.creditInsideMap).toBe(true);
    expect(position.topInset).toBeLessThanOrEqual(2);
    expect(position.leftInset).toBeLessThanOrEqual(2);
    expect(position.creditBottom).toBeLessThan(position.dockTop);
    await expect(attribution).toHaveCSS("background-color", "rgba(0, 0, 0, 0)");
    await expect(attribution).toHaveCSS("border-top-width", "0px");
    await expect(attribution).toHaveCSS("box-shadow", "none");
    await expect(credit).toHaveCSS("color", "rgba(16, 58, 51, 0.82)");

    await page.setViewportSize({ width: 375, height: 667 });
    const narrowPosition = await geometry();
    expect(narrowPosition.creditInsideMap).toBe(true);
    expect(narrowPosition.leftInset).toBeLessThanOrEqual(2);
    expect(narrowPosition.creditBottom).toBeLessThan(narrowPosition.dockTop);
  }
});

test("narration supports byte-range responses for precise seeking", async ({ request }, testInfo) => {
  test.skip(testInfo.project.name !== "desktop-chrome", "The HTTP response is shared by every viewport.");
  const response = await request.get("/audio/it/01_torre_quattro_porte.mp3", {
    headers: { Range: "bytes=1000-1999" },
  });
  expect(response.status()).toBe(206);
  expect(response.headers()["content-range"]).toMatch(/^bytes 1000-1999\/\d+$/);
  expect((await response.body()).byteLength).toBe(1000);
  expect((await request.get("/.git/config")).status()).toBe(403);
});

test("marker selects a stop, starts audio and keeps the full player closed", async ({ page }) => {
  const errors = collectRuntimeErrors(page);
  await enterSite(page);

  const directionsButton = page.locator("#map-directions-button");
  const directionsAreVisible = await directionsButton.isVisible();
  if (directionsAreVisible) {
    await watchClass(page, "#map-directions-button", "is-directions-cued");
  }
  const stopThreeMarker = page.locator(".map-marker").filter({ hasText: "3" });
  const waitForMapCameraToSettle = () => page.waitForFunction(() => {
    const center = map.getCenter();
    const current = { lat: center.lat, lng: center.lng, zoom: map.getZoom() };
    const previous = window.__e2eMapCameraSample;
    const stable = previous &&
      Math.abs(previous.lat - current.lat) < 0.000001 &&
      Math.abs(previous.lng - current.lng) < 0.000001 &&
      Math.abs(previous.zoom - current.zoom) < 0.001;
    if (!stable) {
      window.__e2eMapCameraSample = { ...current, stableSince: performance.now() };
      return false;
    }
    window.__e2eMapCameraSample = { ...current, stableSince: previous.stableSince };
    return performance.now() - previous.stableSince >= 300 && !map._animatingZoom;
  }, { timeout: 10_000 });
  const waitForStopThreeCameraTarget = () => expect.poll(() => page.evaluate(() => {
    const target = getStopCameraTarget(tappe[2], "firstTap");
    return map.getCenter().distanceTo(target.center) < 20 &&
      Math.abs(map.getZoom() - target.zoom) < 0.05;
  }), { timeout: 10_000 }).toBe(true);
  await waitForMapCameraToSettle();
  await stopThreeMarker.click();
  await expect(page.locator("#detail-number")).toHaveText("3");
  await waitForStopThreeCameraTarget();
  if (directionsAreVisible) {
    await expectClassObserved(page, "is-directions-cued");
  }
  await expect(page.locator('.stop-button[aria-current="true"] .stop-index')).toHaveText("3");
  await expect(page.locator("#player-overlay")).toBeHidden();
  await expectAudioPlaying(page);
  await expect(page.locator(".map-route-active")).toBeVisible();
  await stopThreeMarker.click();
  await waitForStopThreeCameraTarget();
  await expect
    .poll(async () => {
      const [mapBox, markerBox] = await Promise.all([
        page.locator("#map").boundingBox(),
        page.locator(".map-marker").filter({ hasText: "3" }).boundingBox(),
      ]);
      if (!mapBox || !markerBox) {
        return false;
      }
      return (
        markerBox.x >= mapBox.x &&
        markerBox.y >= mapBox.y &&
        markerBox.x + markerBox.width <= mapBox.x + mapBox.width &&
        markerBox.y + markerBox.height <= mapBox.y + mapBox.height
      );
    })
    .toBe(true);
  await expect(page.locator(".map-route-active")).toBeVisible();
  await expectNoRuntimeErrors(errors);
});

test("map selection bubble shows only the stop photo on mobile", async ({ page }, testInfo) => {
  const errors = collectRuntimeErrors(page);
  await enterSite(page);

  const selectAndReadBubble = async (number) => {
    return page.evaluate((stop) => {
      markersByStop.get(stop).fire("click");
      const bubble = [...document.querySelectorAll(".map-selection-label")].at(-1);
      const image = bubble?.querySelector(".map-selection-label-image");
      return {
        text: bubble?.textContent?.trim(),
        titleCount: bubble?.querySelectorAll(".map-selection-label-title").length,
        imageSrc: image?.getAttribute("src"),
        imageAlt: image?.getAttribute("alt"),
      };
    }, number);
  };

  const homeBubble = await selectAndReadBubble(1);
  expect(homeBubble.imageSrc).toMatch(/tappa_1_torre_delle_quattro_porte\.webp/);
  if (testInfo.project.name === "desktop-chrome") {
    expect(homeBubble.text).toContain("Tappa 1");
    expect(homeBubble.titleCount).toBe(1);
  } else {
    expect(homeBubble.text).toBe("");
    expect(homeBubble.titleCount).toBe(0);
    expect(homeBubble.imageAlt).toBe("Torre delle Quattro Porte");

    await openFullPlayer(page);
    const fullMapBubble = await selectAndReadBubble(2);
    expect(fullMapBubble.imageSrc).toMatch(/tappa_2_torre_e_camminamento_del_soccorso\.webp/);
    expect(fullMapBubble.text).toBe("");
    expect(fullMapBubble.titleCount).toBe(0);
    expect(fullMapBubble.imageAlt).toBe("Torre e Camminamento del Soccorso");
  }
  await expectNoRuntimeErrors(errors);
});

test("every map marker keeps its selected stop visible in the home map", async ({ page }, testInfo) => {
  test.setTimeout(90_000);
  const errors = collectRuntimeErrors(page);
  if (testInfo.project.name !== "desktop-chrome") {
    await page.setViewportSize({ width: 375, height: 667 });
  }
  await enterSite(page);
  await page.evaluate(() => new Promise((resolve) => {
    requestAnimationFrame(() => {
      map.invalidateSize({ pan: false, animate: false });
      requestAnimationFrame(resolve);
    });
  }));

  for (const stop of [1, 2, 3, 4, 5, 6, 7]) {
    const moveEnd = page.evaluate(() => new Promise((resolve) => {
      map.once("moveend", resolve);
      window.setTimeout(resolve, 1_200);
    }));
    await page.evaluate((number) => markersByStop.get(number).fire("click"), stop);
    await expect(page.locator("#detail-number")).toHaveText(String(stop));
    await moveEnd;
    const marker = page.locator(".map-marker").filter({ hasText: String(stop) });
    await expect.poll(async () => {
      const [mapBox, markerBox] = await Promise.all([
        page.locator("#map").boundingBox(),
        marker.boundingBox(),
      ]);
      if (!mapBox || !markerBox) return false;
      const centerX = markerBox.x + markerBox.width / 2;
      const centerY = markerBox.y + markerBox.height / 2;
      return centerX >= mapBox.x && centerX <= mapBox.x + mapBox.width &&
        centerY >= mapBox.y && centerY <= mapBox.y + mapBox.height;
    }, { timeout: 6_000 }).toBe(true);
    // Let Leaflet's flyTo animation finish before checking the marker's
    // visible anchor. The decorative icon may straddle the map edge slightly.
    await page.waitForTimeout(700);
    const [mapBox, markerBox] = await Promise.all([
      page.locator("#map").boundingBox(),
      marker.boundingBox(),
    ]);
    expect(mapBox).not.toBeNull();
    expect(markerBox, `stop ${stop} marker`).not.toBeNull();
    const centerX = markerBox.x + markerBox.width / 2;
    const centerY = markerBox.y + markerBox.height / 2;
    expect(centerX, `stop ${stop} center left`).toBeGreaterThanOrEqual(mapBox.x);
    expect(centerX, `stop ${stop} center right`).toBeLessThanOrEqual(mapBox.x + mapBox.width);
    expect(centerY, `stop ${stop} center top`).toBeGreaterThanOrEqual(mapBox.y);
    expect(centerY, `stop ${stop} center bottom`).toBeLessThanOrEqual(mapBox.y + mapBox.height);
  }

  await expectNoRuntimeErrors(errors);
});

test("desktop Explore keeps all seven selected markers inside the map", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "desktop-chrome", "Explore with a side player is desktop-only.");
  test.setTimeout(90_000);
  const errors = collectRuntimeErrors(page);
  await enterSite(page);
  await openFullPlayer(page);
  await expect(page.locator("#player-overlay")).toHaveClass(/is-map-panel/);

  for (const stop of [1, 2, 3, 4, 5, 6, 7]) {
    await page.evaluate((number) => markersByStop.get(number).fire("click"), stop);
    await expect(page.locator("#detail-number")).toHaveText(String(stop));
    await expect.poll(() => page.evaluate((number) => {
      const target = getStopCameraTarget(tappe[number - 1], "firstTap");
      return map.getCenter().distanceTo(target.center) < 20 &&
        Math.abs(map.getZoom() - target.zoom) < 0.05;
    }, stop), { timeout: 6_000 }).toBe(true);
    const [mapBox, markerBox] = await Promise.all([
      page.locator("#map").boundingBox(),
      page.locator(".map-marker").filter({ hasText: String(stop) }).boundingBox(),
    ]);
    expect(mapBox).not.toBeNull();
    expect(markerBox, `stop ${stop} marker`).not.toBeNull();
    expect(markerBox.x, `stop ${stop} left`).toBeGreaterThanOrEqual(mapBox.x + 8);
    expect(markerBox.x + markerBox.width, `stop ${stop} right`).toBeLessThanOrEqual(mapBox.x + mapBox.width - 8);
    expect(markerBox.y, `stop ${stop} top`).toBeGreaterThanOrEqual(mapBox.y + 8);
    expect(markerBox.y + markerBox.height, `stop ${stop} bottom`).toBeLessThanOrEqual(mapBox.y + mapBox.height - 8);
  }

  await expectNoRuntimeErrors(errors);
});

test("mobile map-player centers marker selections in the unobstructed map area", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name === "desktop-chrome", "The full-screen mobile map player is phone-only.");
  const errors = collectRuntimeErrors(page);
  await enterSite(page);

  await page.locator("#mini-player-open").click();
  await expect(page.locator("#player-overlay")).toHaveClass(/is-mobile-map-player/);
  await page.waitForTimeout(320);

  const selectedMarker = page.locator(".map-marker").filter({ hasText: "2" });
  await selectedMarker.click();
  await page.waitForTimeout(700);

  const [mapBox, markerBox, dockBox] = await Promise.all([
    page.locator("#map").boundingBox(),
    selectedMarker.boundingBox(),
    page.locator("#player-overlay .player-sheet").boundingBox(),
  ]);
  const mascot = page.locator("#map-explore-mascot-image");
  await expect(mascot).toBeVisible();
  const mascotBox = await mascot.boundingBox();
  expect(mapBox).not.toBeNull();
  expect(markerBox).not.toBeNull();
  expect(dockBox).not.toBeNull();
  expect(mascotBox).not.toBeNull();
  expect(mascotBox.x).toBeGreaterThanOrEqual(mapBox.x);
  expect(mascotBox.y + mascotBox.height).toBeLessThanOrEqual(dockBox.y - 8);
  expect(markerBox.x).toBeGreaterThanOrEqual(mapBox.x);
  expect(markerBox.x + markerBox.width).toBeLessThanOrEqual(mapBox.x + mapBox.width);
  expect(markerBox.y).toBeGreaterThanOrEqual(mapBox.y);
  expect(markerBox.y + markerBox.height).toBeLessThanOrEqual(dockBox.y - 8);
  await expectNoRuntimeErrors(errors);
});

test("mobile map player keeps its dock content-sized and mascot just above it", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "mobile-chrome", "Phone dock geometry is covered here.");
  test.setTimeout(120_000);
  const errors = collectRuntimeErrors(page);
  for (const viewport of [{ width: 320, height: 568 }, { width: 375, height: 667 }, { width: 440, height: 956 }]) {
    await page.setViewportSize(viewport);
    await enterSite(page);
    await page.locator("#mini-player-open").evaluate((button) => button.click());
    await expect(page.locator("#player-overlay")).toHaveClass(/is-mobile-map-player/);
    await expect.poll(async () => {
      const box = await page.locator("#player-overlay .player-sheet").boundingBox();
      return Math.round(box ? box.y + box.height : 0);
    }).toBe(viewport.height);

    const geometry = await page.evaluate(() => {
      const box = (selector) => document.querySelector(selector).getBoundingClientRect();
      const dock = box("#player-overlay .player-sheet");
      const controls = box("#player-overlay .player-command-row");
      const mascot = box(".map-explore-mascot");
      const map = box("#map");
      const credit = box("#map .leaflet-control-attribution");
      return {
        dockHeight: dock.height,
        emptyBottom: dock.bottom - controls.bottom,
        mascotGap: dock.top - mascot.bottom,
        mascotInsideMap: mascot.left >= map.left && mascot.right <= map.right,
        mascotClearOfCredit: mascot.top >= credit.bottom,
      };
    });
    expect(geometry.dockHeight).toBeLessThanOrEqual(244);
    expect(geometry.emptyBottom).toBeLessThanOrEqual(18);
    expect(geometry.mascotGap).toBeGreaterThanOrEqual(8);
    expect(geometry.mascotGap).toBeLessThanOrEqual(24);
    expect(geometry.mascotInsideMap).toBe(true);
    expect(geometry.mascotClearOfCredit).toBe(true);
    await expectNoRuntimeErrors(errors);
  }
});

test("mobile map-player uses stable stop framing without clipping markers", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name === "desktop-chrome", "The expanded map framing is mobile-only.");
  test.setTimeout(90_000);
  await page.setViewportSize({ width: 375, height: 667 });
  await enterSite(page);
  await page.locator("#mini-player-open").click();
  await expect(page.locator("#player-overlay")).toHaveClass(/is-mobile-map-player/);

  for (const stop of [1, 2, 3, 4, 5, 6, 7]) {
    await page.evaluate((number) => markersByStop.get(number).fire("click"), stop);
    await expect(page.locator("#detail-number")).toHaveText(String(stop));
    const marker = page.locator(".map-marker").filter({ hasText: String(stop) });
    await expect.poll(async () => {
      const [mapBox, markerBox, dockBox] = await Promise.all([
        page.locator("#map").boundingBox(),
        marker.boundingBox(),
        page.locator("#player-overlay .player-sheet").boundingBox(),
      ]);
      return Boolean(mapBox && markerBox && dockBox &&
        markerBox.x >= mapBox.x + 8 &&
        markerBox.x + markerBox.width <= mapBox.x + mapBox.width - 8 &&
        markerBox.y >= mapBox.y + 8 &&
        markerBox.y + markerBox.height <= dockBox.y - 8);
    }, { timeout: 6_000 }).toBe(true);
    await page.waitForTimeout(700);
    const markerBox = await page.locator(".map-marker").filter({ hasText: String(stop) }).boundingBox();
    const mapBox = await page.locator("#map").boundingBox();
    const dockBox = await page.locator("#player-overlay .player-sheet").boundingBox();
    const captionBox = await page.locator("#map-live-caption").boundingBox();
    const mascotBox = await page.locator(".map-explore-mascot").boundingBox();
    expect(markerBox, `marker ${stop}`).not.toBeNull();
    expect(mapBox).not.toBeNull();
    expect(dockBox).not.toBeNull();
    const visibleBottom = captionBox && captionBox.y < dockBox.y
      ? Math.min(captionBox.y, dockBox.y)
      : dockBox.y;
    const markerX = (markerBox.x + markerBox.width / 2 - mapBox.x) / mapBox.width;
    const markerY = (markerBox.y + markerBox.height / 2 - mapBox.y) / (visibleBottom - mapBox.y);
    expect(markerX, `stop ${stop} horizontal framing`).toBeGreaterThanOrEqual(0.12);
    expect(markerX, `stop ${stop} horizontal framing`).toBeLessThanOrEqual(0.88);
    expect(markerY, `stop ${stop} vertical framing`).toBeGreaterThanOrEqual(0.12);
    expect(markerY, `stop ${stop} vertical framing`).toBeLessThanOrEqual(0.88);
    if (mascotBox) {
      const overlapsMascot = markerBox.x < mascotBox.x + mascotBox.width &&
        markerBox.x + markerBox.width > mascotBox.x &&
        markerBox.y < mascotBox.y + mascotBox.height &&
        markerBox.y + markerBox.height > mascotBox.y;
      expect(overlapsMascot, `stop ${stop} marker is clear of the mascot`).toBe(false);
    }
    if (captionBox) {
      const overlapsCaption = markerBox.x < captionBox.x + captionBox.width &&
        markerBox.x + markerBox.width > captionBox.x &&
        markerBox.y < captionBox.y + captionBox.height &&
        markerBox.y + markerBox.height > captionBox.y;
      expect(overlapsCaption, `stop ${stop} marker is clear of the live caption`).toBe(false);
    }
    expect(markerBox.x, `marker ${stop} left`).toBeGreaterThanOrEqual(mapBox.x + 8);
    expect(markerBox.x + markerBox.width, `marker ${stop} right`).toBeLessThanOrEqual(mapBox.x + mapBox.width - 8);
    expect(markerBox.y, `marker ${stop} top`).toBeGreaterThanOrEqual(mapBox.y + 8);
    expect(markerBox.y + markerBox.height, `marker ${stop} bottom`).toBeLessThanOrEqual(dockBox.y - 8);
    expect(await page.evaluate(() => map.getZoom()), `stop ${stop} zoom`).toBeLessThanOrEqual(17.5);
  }
});

test("mobile map-player captions stay clear of controls, offer wider zoom and link to full audio", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name === "desktop-chrome", "The full-screen mobile map player is phone-only.");
  test.setTimeout(60_000);
  const errors = collectRuntimeErrors(page);
  await page.setViewportSize({ width: 375, height: 667 });
  await enterSite(page);

  await stopButton(page, 1).click();
  await expectAudioPlaying(page);
  await page.locator("audio").evaluate((audio) => {
    audio.currentTime = 72;
    audio.dispatchEvent(new Event("seeking"));
    audio.dispatchEvent(new Event("seeked"));
    audio.dispatchEvent(new Event("timeupdate"));
  });
  const homeMinZoom = await page.evaluate(() => map.getMinZoom());
  await page.locator("#mini-player-open").click();
  await expect(page.locator("#player-overlay")).toHaveClass(/is-mobile-map-player/);
  await page.waitForTimeout(320);

  const caption = page.locator("#map-live-caption");
  await expect(caption).toBeVisible();
  await expect(page.locator("#player-map-button .material-symbols-rounded")).toHaveText("headphones");
  await expect(page.locator("#player-map-button")).toHaveAttribute("aria-label", "Apri Full player audio");
  expect(await page.evaluate(() => map.getMinZoom())).toBeLessThan(homeMinZoom);
  await expect(page.locator(".leaflet-control-zoom")).toBeHidden();
  const [dockBox, mascotBox, helpBox] = await Promise.all([
    page.locator("#player-overlay .player-sheet").boundingBox(),
    page.locator(".map-explore-mascot").boundingBox(),
    page.locator("#player-map-help-button").boundingBox(),
  ]);
  expect(dockBox).not.toBeNull();
  expect(mascotBox).not.toBeNull();
  expect(helpBox).not.toBeNull();
  expect(mascotBox.x + mascotBox.width).toBeLessThanOrEqual(helpBox.x - 4);
  const captionBox = await caption.boundingBox();
  expect(captionBox).not.toBeNull();
  expect(captionBox.y + captionBox.height).toBeLessThanOrEqual(dockBox.y - 8);
  expect(captionBox.x).toBeGreaterThanOrEqual(mascotBox.x + mascotBox.width + 4);
  await expect(page.locator(".map-floating-controls")).toBeHidden();
  await page.locator("#player-map-button").click();
  await expect(page.locator("#player-overlay")).not.toHaveClass(/is-mobile-map-player/);
  await expect(page.locator("#player-mobile-live-transcript")).toBeVisible();
  await expect(page.locator("#player-map-button .material-symbols-rounded")).toHaveText("map");
  await page.locator("#player-close-button").click();
  await expect(page.locator("#player-overlay")).toHaveClass(/is-hidden/);
  await expect.poll(() => page.evaluate(() => map.getMinZoom())).toBe(homeMinZoom);
  await expectNoRuntimeErrors(errors);
});

test("mobile map captions remain complete and clear of mascot and dock at phone widths", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "mobile-chrome", "Mobile caption geometry is phone-only.");
  test.setTimeout(75_000);
  const errors = collectRuntimeErrors(page);
  await enterSite(page);
  await stopButton(page, 1).click();
  await expectAudioPlaying(page);
  await page.locator("#mini-player-open").click();
  await expect(page.locator("#player-overlay")).toHaveClass(/is-mobile-map-player/);
  const caption = page.locator("#map-live-caption");

  for (const { width, height } of [{ width: 320, height: 568 }, { width: 375, height: 667 }, { width: 440, height: 956 }]) {
    await page.setViewportSize({ width, height });
    await page.locator("audio").evaluate((audio) => {
      audio.currentTime = 1;
      audio.dispatchEvent(new Event("timeupdate"));
    });
    await expect(caption).toBeVisible();
    await expect(caption).toContainText("Vicopisano");
    const layout = await page.evaluate(() => {
      const cue = activeMapTranscript.segments.find((item) => item.text.startsWith("Quando arrivai qui"));
      const captionElement = document.querySelector("#map-live-caption");
      const originalText = captionElement.textContent;
      const pages = [];
      for (let time = cue.start + 0.01; time < cue.end; time += 0.05) {
        const text = getTimedMapCaptionText(cue, time);
        if (pages.at(-1) !== text) pages.push(text);
      }
      const style = getComputedStyle(captionElement);
      const lineHeight = parseFloat(style.lineHeight);
      const verticalInset = parseFloat(style.paddingTop) + parseFloat(style.paddingBottom) +
        parseFloat(style.borderTopWidth) + parseFloat(style.borderBottomWidth);
      let maximumLines = 0;
      let horizontalOverflow = false;
      for (const text of pages) {
        captionElement.textContent = text;
        maximumLines = Math.max(maximumLines, (captionElement.getBoundingClientRect().height - verticalInset) / lineHeight);
        horizontalOverflow ||= captionElement.scrollWidth > captionElement.clientWidth + 1;
      }
      captionElement.textContent = originalText;
      const captionBox = captionElement.getBoundingClientRect();
      const mascotBox = document.querySelector(".map-explore-mascot").getBoundingClientRect();
      const dockBox = document.querySelector("#player-overlay .player-sheet").getBoundingClientRect();
      return {
        expected: cue.text.replace(/\s+/g, " ").trim(),
        actual: pages.join(" ").replace(/\s+/g, " ").trim(),
        maximumLines,
        horizontalOverflow,
        clearOfMascot: captionBox.left >= mascotBox.right + 4,
        clearOfDock: captionBox.bottom <= dockBox.top - 8,
        insideViewport: captionBox.top >= 0 && captionBox.right <= innerWidth,
      };
    });
    expect(layout.actual, `complete cue at ${width}px`).toBe(layout.expected);
    expect(layout.maximumLines, `caption lines at ${width}px`).toBeLessThanOrEqual(2.15);
    expect(layout.horizontalOverflow, `horizontal overflow at ${width}px`).toBe(false);
    expect(layout.clearOfMascot, `mascot overlap at ${width}px`).toBe(true);
    expect(layout.clearOfDock, `dock overlap at ${width}px`).toBe(true);
    expect(layout.insideViewport, `viewport overflow at ${width}px`).toBe(true);
  }
  await expectNoRuntimeErrors(errors);
});

test("mobile map-player keeps a selected marker above the player dock", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name === "desktop-chrome", "The expanded map player is mobile-only.");
  const errors = collectRuntimeErrors(page);
  await enterSite(page);

  await page.locator("#mini-player-open").click();
  await expect(page.locator("#player-overlay")).toHaveClass(/is-mobile-map-player/);
  await page.waitForTimeout(320);

  const selectedMarker = page.locator(".map-marker").filter({ hasText: "2" });
  await selectedMarker.click();
  await page.waitForTimeout(700);

  const [mapBox, markerBox, dockBox] = await Promise.all([
    page.locator("#map").boundingBox(),
    selectedMarker.boundingBox(),
    page.locator("#player-overlay .player-sheet").boundingBox(),
  ]);
  expect(mapBox).not.toBeNull();
  expect(markerBox).not.toBeNull();
  expect(dockBox).not.toBeNull();
  expect(markerBox.x).toBeGreaterThanOrEqual(mapBox.x);
  expect(markerBox.x + markerBox.width).toBeLessThanOrEqual(mapBox.x + mapBox.width);
  expect(markerBox.y).toBeGreaterThanOrEqual(mapBox.y);
  expect(markerBox.y + markerBox.height).toBeLessThanOrEqual(dockBox.y - 8);
  await expectNoRuntimeErrors(errors);
});

test("hero mascot acknowledges mouse and touch activation with its dedicated jump", async ({ page }, testInfo) => {
  const errors = collectRuntimeErrors(page);
  await enterSite(page);

  const mascot = page.locator(".mascot-motion-shell--hero");
  await expect(mascot).toHaveAttribute("role", "button");
  await mascot.scrollIntoViewIfNeeded();
  await watchClass(page, ".mascot-motion-shell--hero", "is-hero-tap-reaction");
  if (testInfo.project.name === "mobile-chrome") {
    const box = await mascot.boundingBox();
    expect(box).not.toBeNull();
    await page.touchscreen.tap(box.x + box.width / 2, box.y + box.height / 2);
  } else {
    await mascot.click();
  }
  await expectClassObserved(page, "is-hero-tap-reaction");
  await expect(mascot).toHaveCSS("animation-name", "mascot-hero-tap-reaction");
  await expectNoRuntimeErrors(errors);
});

test("mini player cycles playback speed like the full player", async ({ page }) => {
  const errors = collectRuntimeErrors(page);
  await enterSite(page);
  await stopButton(page, 1).click();
  await expectAudioPlaying(page);

  const speedButton = page.locator("#mini-player-speed-button");
  await expect(speedButton).toHaveText("x1");
  await expect(page.locator("[data-mini-playback-rate]")).toHaveCount(0);
  await expect(page.locator("#mini-player-mute, #mini-player-volume, #player-mute, #player-volume")).toHaveCount(0);
  await expect.poll(() => page.locator("audio").evaluate((audio) => ({ volume: audio.volume, muted: audio.muted }))).toEqual({ volume: 1, muted: false });
  await speedButton.click();
  await expect(speedButton).toHaveText("x1,25");
  await expect.poll(() => page.locator("audio").evaluate((audio) => audio.playbackRate)).toBe(1.25);
  await speedButton.click();
  await expect(speedButton).toHaveText("x1,5");
  await speedButton.click();
  await expect(speedButton).toHaveText("x1");
  await expect.poll(() => page.locator("audio").evaluate((audio) => audio.playbackRate)).toBe(1);
  await expectNoRuntimeErrors(errors);
});

test("desktop mini-player dedicates the remaining row to the seek timeline", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "desktop-chrome", "The expanded mini-player row is desktop-only.");
  const errors = collectRuntimeErrors(page);
  await enterSite(page);

  const [controlsBox, timelineBox, seekBox, expandBox, playBox] = await Promise.all([
    page.locator(".mini-player-controls").boundingBox(),
    page.locator(".mini-player-timeline").boundingBox(),
    page.locator("#mini-player-progress-input").boundingBox(),
    page.locator("#mini-player-expand").boundingBox(),
    page.locator("#mini-player-toggle").boundingBox(),
  ]);
  expect(controlsBox).not.toBeNull();
  expect(timelineBox).not.toBeNull();
  expect(seekBox).not.toBeNull();
  expect(expandBox).not.toBeNull();
  expect(playBox).not.toBeNull();
  expect(Math.abs((playBox.y + playBox.height / 2) - (controlsBox.y + controlsBox.height / 2))).toBeLessThanOrEqual(1);
  expect(timelineBox.x).toBeGreaterThanOrEqual(controlsBox.x + controlsBox.width + 12);
  expect(timelineBox.x + timelineBox.width).toBeLessThanOrEqual(expandBox.x - 12);
  // The timeline remains the flexible row; its exact width varies with the
  // browser viewport and the desktop control labels.
  expect(seekBox.width).toBeGreaterThanOrEqual(280);
  const miniBox = await page.locator("#mini-player").boundingBox();
  expect(miniBox.x).toBeGreaterThanOrEqual(23);
  expect(miniBox.width).toBeGreaterThanOrEqual(1390);
  await expectNoRuntimeErrors(errors);
});

test("mobile contextual guides spotlight one control and preserve player state", async ({ page }, testInfo) => {
  test.setTimeout(90_000);
  test.skip(testInfo.project.name === "desktop-chrome", "The contextual guides are mobile-only.");
  const errors = collectRuntimeErrors(page);
  await enterSite(page);
  await stopButton(page, 6).click();
  await openFullPlayer(page);
  const audio = page.locator("audio");
  await audio.evaluate((element) => element.pause());

  const checkStep = async (progress, target) => {
    await expect(page.locator("#player-context-guide-progress")).toHaveText(progress);
    await expect(page.locator("#player-context-guide")).toHaveClass(target ? /has-target/ : /^(?!.*has-target).*$/);
    if (!target) return;
    const geometry = await page.evaluate((selector) => {
      const control = document.querySelector(selector).getBoundingClientRect();
      const card = document.querySelector("#player-context-guide-card").getBoundingClientRect();
      const guide = document.querySelector("#player-context-guide");
      return {
        x: parseFloat(guide.style.getPropertyValue("--context-guide-x")),
        y: parseFloat(guide.style.getPropertyValue("--context-guide-y")),
        targetX: control.left + control.width / 2,
        targetY: control.top + control.height / 2,
        separate: card.bottom <= control.top || card.top >= control.bottom ||
          card.right <= control.left || card.left >= control.right,
      };
    }, target);
    expect(Math.abs(geometry.x - geometry.targetX)).toBeLessThan(1);
    expect(Math.abs(geometry.y - geometry.targetY)).toBeLessThan(1);
    expect(geometry.separate).toBe(true);
  };

  await page.locator("#player-map-help-button").click();
  await checkStep("1/5", null);
  await page.locator("#player-context-guide-next").click();
  await checkStep("2/5", "#player-recenter-button");
  await page.locator("#player-context-guide-prev").click();
  await checkStep("1/5", null);
  for (const [progress, target] of [
    ["2/5", "#player-recenter-button"],
    ["3/5", "#player-map-directions-button"],
    ["4/5", "#player-map-button"],
    ["5/5", "#player-close-button"],
  ]) {
    await page.locator("#player-context-guide-next").click();
    await checkStep(progress, target);
    await expect(page.locator("#detail-number")).toHaveText("6");
    await expect(page.locator("#player-overlay")).toHaveClass(/is-mobile-map-player/);
    await expect.poll(() => audio.evaluate((element) => element.paused)).toBe(true);
  }
  await page.locator("#player-context-guide-next").click();
  await expect(page.locator("#player-context-guide")).toBeHidden();
  await expect(page.locator("#player-overlay")).toBeVisible();

  await page.locator("#player-map-button").click();
  await expect(page.locator("#player-overlay")).not.toHaveClass(/is-mobile-map-player/);
  await expect(page.locator("#detail-title")).toHaveClass(/is-overflowing/);
  await expect(page.locator("#detail-title-text")).toContainText("Santa Maria Addolorata");
  expect(await page.locator("#detail-title-text").evaluate((element) => getComputedStyle(element).animationIterationCount)).toBe("1");
  await page.locator("#player-listen-help-button").click();
  await checkStep("1/3", null);
  await page.locator("#player-context-guide-next").click();
  await checkStep("2/3", "#player-map-button");
  await page.locator("#player-context-guide-prev").click();
  await checkStep("1/3", null);
  await page.locator("#player-context-guide-next").click();
  await checkStep("2/3", "#player-map-button");
  await page.locator("#player-context-guide-next").click();
  await checkStep("3/3", "#player-close-button");
  await page.keyboard.press("Escape");
  await expect(page.locator("#player-context-guide")).toBeHidden();
  await expect(page.locator("#player-overlay")).toBeVisible();
  await expect(page.locator("#player-overlay")).not.toHaveClass(/is-mobile-map-player/);
  await expect.poll(() => audio.evaluate((element) => element.paused)).toBe(true);
  await page.locator("#player-listen-help-button").click();
  await page.locator("#player-context-guide-close").click();
  await expect(page.locator("#player-context-guide")).toBeHidden();
  await expect(page.locator("#player-overlay")).toBeVisible();

  await page.locator("#player-map-button").click();
  for (const width of [320, 375, 430]) {
    await page.setViewportSize({ width, height: 667 });
    const controlBoxes = await Promise.all([
      "#player-map-button", "#player-recenter-button", "#player-map-directions-button", "#player-close-button",
    ].map((selector) => page.locator(selector).boundingBox()));
    for (const box of controlBoxes) {
      expect(box.x).toBeGreaterThanOrEqual(0);
      expect(box.x + box.width).toBeLessThanOrEqual(width + 1);
    }
    expect(controlBoxes[0].x).toBeLessThan(controlBoxes[1].x);
    expect(controlBoxes[1].x).toBeLessThan(controlBoxes[2].x);
    expect(controlBoxes[2].x + controlBoxes[2].width).toBeLessThan(controlBoxes[3].x);
    await expect(page.locator("#player-map-help-button")).toBeVisible();
    await expect(page.locator(".map-floating-controls")).toBeHidden();
  }
  await page.setViewportSize({ width: 320, height: 568 });
  await page.locator("#player-map-help-button").click();
  for (let index = 0; index < 5; index += 1) {
    await expect(page.locator("#player-context-guide-progress")).toHaveText(`${index + 1}/5`);
    const card = await page.locator("#player-context-guide-card").boundingBox();
    const dock = await page.locator("#player-overlay .player-sheet").boundingBox();
    expect(card.y + card.height).toBeLessThanOrEqual(dock.y - 8);
    await expect(page.locator("#player-context-guide-next")).toBeVisible();
    await page.locator("#player-context-guide-next").click();
  }
  await expect(page.locator("#player-context-guide")).toBeHidden();
  await expectNoRuntimeErrors(errors);
});

test("desktop home keeps the stop photo square while prioritizing the map", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "desktop-chrome", "The square home preview is desktop-only.");
  const errors = collectRuntimeErrors(page);
  await enterSite(page);

  const [mapBox, previewBox, imageBox] = await Promise.all([
    page.locator(".map-stage").boundingBox(),
    page.locator("#stop-preview").boundingBox(),
    page.locator("#stop-preview-image").boundingBox(),
  ]);
  expect(mapBox).not.toBeNull();
  expect(previewBox).not.toBeNull();
  expect(imageBox).not.toBeNull();
  expect(Math.abs(imageBox.width - imageBox.height)).toBeLessThanOrEqual(1);
  expect(mapBox.width).toBeGreaterThan(previewBox.width);
  await expectNoRuntimeErrors(errors);
});

test("stop list selection provides the same route and directions feedback", async ({ page }) => {
  const errors = collectRuntimeErrors(page);
  await enterSite(page);

  await watchClass(page, "#map-directions-button", "is-directions-cued");
  await stopButton(page, 5).click();
  await expectClassObserved(page, "is-directions-cued");
  await expect(page.locator('.stop-button[aria-current="true"] .stop-index')).toHaveText("5");
  await expect(page.locator(".map-route-active")).toBeVisible();
  await expect(page.locator("#player-overlay")).toBeHidden();
  await expectAudioPlaying(page);
  await expectNoRuntimeErrors(errors);
});

test("selected narration advances after playback starts", async ({ page }) => {
  const errors = collectRuntimeErrors(page);
  await enterSite(page);

  await stopButton(page, 2).click();
  await page.waitForTimeout(800);
  const initialAudioState = await page.locator("audio").evaluate((audio) => ({
    paused: audio.paused,
    ended: audio.ended,
    currentTime: audio.currentTime,
    readyState: audio.readyState,
    networkState: audio.networkState,
    error: audio.error?.message || null,
    currentSrc: audio.currentSrc,
  }));
  expect(initialAudioState, JSON.stringify(initialAudioState)).toMatchObject({ paused: false });
  const startTime = await page.locator("audio").evaluate((audio) => audio.currentTime);
  await page.waitForTimeout(1_000);
  await expect
    .poll(() => page.locator("audio").evaluate((audio) => audio.currentTime))
    .toBeGreaterThan(startTime + 0.15);
  await expectNoRuntimeErrors(errors);
});

test("mascot lip sync preloads cues and applies the visual lead", async ({ page }) => {
  const errors = collectRuntimeErrors(page);
  await enterSite(page);

  await stopButton(page, 1).click();
  await expectAudioPlaying(page);
  await page.locator("audio").evaluate((audio) => {
    audio.currentTime = 0.44;
    audio.dispatchEvent(new Event("seeking"));
    audio.dispatchEvent(new Event("seeked"));
  });

  await expect
    .poll(() => page.locator("#detail-mascot-image").getAttribute("src"))
    .toContain("mascotte_C.webp");
  await expectNoRuntimeErrors(errors);
});

test("Italian master audio keeps the map subtitle synchronized and fades it after pause", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "desktop-chrome", "Desktop home and Explore captions are covered here.");
  test.setTimeout(60_000);
  const errors = collectRuntimeErrors(page);
  await enterSite(page);

  await stopButton(page, 1).click();
  await expectAudioPlaying(page);
  const caption = page.locator("#map-live-caption");
  await expect(caption).toBeVisible();

  await page.locator("audio").evaluate((audio) => {
    audio.currentTime = 72;
    audio.dispatchEvent(new Event("seeking"));
    audio.dispatchEvent(new Event("seeked"));
    audio.dispatchEvent(new Event("timeupdate"));
  });
  await expect(caption).toContainText(/torre delle quattro porte/i);
  await expect(caption).toHaveCSS("white-space", "pre-line");
  await expect(caption).toHaveCSS("display", "block");
  await page.locator("#mini-player-toggle").click();
  await expect(caption).toBeVisible();
  await page.waitForTimeout(1_000);
  await expect(caption).toBeVisible();
  await expect(caption).toBeHidden({ timeout: 4_500 });

  await page.locator("#mini-player-toggle").click();
  await expectAudioPlaying(page);
  await expect(caption).toBeVisible();
  await page.locator("#mini-player-expand").click();
  await expect(page.locator("body")).toHaveClass(/is-map-player-panel/);
  await page.locator("audio").evaluate((audio) => audio.dispatchEvent(new Event("timeupdate")));
  await expect(caption).toHaveCSS("white-space", "pre-line");
  await expect(caption).toHaveCSS("display", "block");
  await page.locator("#player-play-button").click();
  await expect(caption).toBeVisible();
  await page.waitForTimeout(1_000);
  await expect(caption).toBeVisible();
  await expect(caption).toBeHidden({ timeout: 4_500 });
  await expectNoRuntimeErrors(errors);
});

test("long captions remain complete and clear of the player across viewport sizes", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "desktop-chrome", "This test resizes one page through desktop and phone layouts.");
  test.setTimeout(120_000);
  const errors = collectRuntimeErrors(page);
  await enterSite(page);
  await stopButton(page, 5).click();
  await expect.poll(() => page.evaluate(() => activeMapTranscript?.segments?.length || 0)).toBeGreaterThan(0);
  await page.locator("audio").evaluate((audio) => audio.pause());

  const checkCaption = async (width, height, expanded = false) => {
    await page.setViewportSize({ width, height });
    await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(resolve)));
    const result = await page.evaluate((isExpanded) => {
      const cue = activeMapTranscript.segments.find((item) => item.text.startsWith("Questo cambiamento ci racconta"));
      const caption = document.querySelector("#map-live-caption");
      caption.hidden = false;
      caption.classList.add("is-visible");
      const pages = [];
      for (let time = cue.start + 0.01; time < cue.end; time += 0.05) {
        const text = getTimedMapCaptionText(cue, time);
        if (pages.at(-1) !== text) pages.push(text);
      }
      const computed = getComputedStyle(caption);
      const lineHeight = parseFloat(computed.lineHeight);
      const paddingAndBorder = parseFloat(computed.paddingTop) + parseFloat(computed.paddingBottom) +
        parseFloat(computed.borderTopWidth) + parseFloat(computed.borderBottomWidth);
      let maximumLines = 0;
      let horizontalOverflow = false;
      for (const text of pages) {
        caption.textContent = text;
        maximumLines = Math.max(maximumLines, (caption.getBoundingClientRect().height - paddingAndBorder) / lineHeight);
        horizontalOverflow ||= caption.scrollWidth > caption.clientWidth + 1;
      }
      const rect = caption.getBoundingClientRect();
      const blocker = isExpanded
        ? document.querySelector("#player-overlay").getBoundingClientRect()
        : document.querySelector("#mini-player").getBoundingClientRect();
      const target = isExpanded
        ? document.querySelector(".map-stage-frame").getBoundingClientRect()
        : blocker;
      return {
        expected: cue.text.replace(/\s+/g, " ").trim(),
        actual: pages.join(" ").replace(/\s+/g, " ").trim(),
        pageCount: pages.length,
        maximumLines,
        horizontalOverflow,
        left: rect.left,
        top: rect.top,
        right: rect.right,
        bottom: rect.bottom,
        width: rect.width,
        targetLeft: target.left,
        targetRight: target.right,
        targetWidth: target.width,
        fontScale: parseFloat(computed.fontSize) / parseFloat(getComputedStyle(document.documentElement).fontSize),
        gap: isExpanded ? blocker.left - rect.right : blocker.top - rect.bottom,
      };
    }, expanded);
    expect(result.actual).toBe(result.expected);
    // A wider desktop caption can fit the same cue on a single page.
    expect(result.pageCount).toBeGreaterThanOrEqual(1);
    expect(result.maximumLines).toBeLessThanOrEqual(2.15);
    expect(result.horizontalOverflow).toBe(false);
    expect(result.top).toBeGreaterThanOrEqual(0);
    expect(result.bottom).toBeLessThanOrEqual(height);
    expect(result.right).toBeLessThanOrEqual(width);
    expect(result.gap).toBeGreaterThanOrEqual(8);
    if (width >= 1024) {
      expect(result.fontScale).toBeCloseTo(1.35, 2);
      if (expanded) {
        expect(result.left).toBeGreaterThanOrEqual(result.targetLeft + 20);
        expect(result.right).toBeLessThanOrEqual(result.targetRight - 20);
        expect(result.width).toBeGreaterThanOrEqual(result.targetWidth - 52);
      } else {
        expect(Math.abs(result.left - result.targetLeft)).toBeLessThanOrEqual(2);
        expect(Math.abs(result.right - result.targetRight)).toBeLessThanOrEqual(2);
      }
    }
  };

  const auditAllDesktopCues = async () => page.evaluate(async () => {
    const caption = document.querySelector("#map-live-caption");
    caption.hidden = false;
    const styles = getComputedStyle(caption);
    const lineHeight = parseFloat(styles.lineHeight);
    const paddingAndBorder = parseFloat(styles.paddingTop) + parseFloat(styles.paddingBottom) +
      parseFloat(styles.borderTopWidth) + parseFloat(styles.borderBottomWidth);
    const failures = [];
    let checked = 0;
    for (const source of MAP_TRANSCRIPT_SOURCES) {
      const transcript = await fetch(source.source).then((response) => response.json());
      for (const cue of transcript.segments) {
        getTimedMapCaptionText(cue, cue.start);
        const pages = mapCaptionPageCache.get(cue).pages;
        if (pages.join(" ").replace(/\s+/g, " ").trim() !== cue.text.replace(/\s+/g, " ").trim()) {
          failures.push(`${source.stop}: missing words at ${cue.start}`);
        }
        for (const text of pages) {
          caption.textContent = text;
          const lines = (caption.getBoundingClientRect().height - paddingAndBorder) / lineHeight;
          if (lines > 2.15 || caption.scrollWidth > caption.clientWidth + 1) {
            failures.push(`${source.stop}: overflow at ${cue.start}`);
          }
        }
        checked += 1;
      }
    }
    return { checked, failures };
  });

  await checkCaption(1440, 900);
  await checkCaption(1024, 768);
  const homeCueAudit = await auditAllDesktopCues();
  expect(homeCueAudit.checked).toBeGreaterThan(200);
  expect(homeCueAudit.failures).toEqual([]);
  await checkCaption(375, 667);
  await checkCaption(320, 568);
  const mobileCueAudit = await page.evaluate(async () => {
    const caption = document.querySelector("#map-live-caption");
    const styles = getComputedStyle(caption);
    const lineHeight = parseFloat(styles.lineHeight);
    const paddingAndBorder = parseFloat(styles.paddingTop) + parseFloat(styles.paddingBottom) +
      parseFloat(styles.borderTopWidth) + parseFloat(styles.borderBottomWidth);
    const failures = [];
    let checked = 0;
    for (const source of MAP_TRANSCRIPT_SOURCES) {
      const transcript = await fetch(source.source).then((response) => response.json());
      for (const cue of transcript.segments) {
        getTimedMapCaptionText(cue, cue.start);
        const pages = mapCaptionPageCache.get(cue).pages;
        if (pages.join(" ").replace(/\s+/g, " ").trim() !== cue.text.replace(/\s+/g, " ").trim()) {
          failures.push(`${source.stop}: missing words at ${cue.start}`);
        }
        for (const text of pages) {
          caption.textContent = text;
          const lines = (caption.getBoundingClientRect().height - paddingAndBorder) / lineHeight;
          if (lines > 2.15) failures.push(`${source.stop}: ${lines.toFixed(1)} lines at ${cue.start}`);
        }
        checked += 1;
      }
    }
    return { checked, failures };
  });
  expect(mobileCueAudit.checked).toBeGreaterThan(200);
  expect(mobileCueAudit.failures).toEqual([]);
  await page.setViewportSize({ width: 1440, height: 900 });
  await openFullPlayer(page);
  await checkCaption(1440, 900, true);
  await checkCaption(1024, 768, true);
  const exploreCueAudit = await auditAllDesktopCues();
  expect(exploreCueAudit.checked).toBeGreaterThan(200);
  expect(exploreCueAudit.failures).toEqual([]);
  await expectNoRuntimeErrors(errors);
});

test("mobile home and map player share caption timing while full audio uses its transcript", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "mobile-chrome", "The three mobile player views are covered here.");
  test.setTimeout(90_000);
  const errors = collectRuntimeErrors(page);
  await page.setViewportSize({ width: 375, height: 667 });
  await enterSite(page);
  await stopButton(page, 1).click();
  await expectAudioPlaying(page);
  await page.locator("audio").evaluate((audio) => {
    audio.currentTime = 72;
    audio.dispatchEvent(new Event("seeking"));
    audio.dispatchEvent(new Event("seeked"));
    audio.dispatchEvent(new Event("timeupdate"));
  });

  const caption = page.locator("#map-live-caption");
  await expect(caption).toBeVisible();
  await page.locator("#mini-player-toggle").click();
  await expect(caption).toBeVisible();
  await page.waitForTimeout(1_000);
  await expect(caption).toBeVisible();
  await expect(caption).toBeHidden({ timeout: 4_500 });

  await page.locator("#mini-player-toggle").click();
  await expectAudioPlaying(page);
  await expect(caption).toBeVisible();
  await page.locator("#mini-player-open").click();
  await expect(page.locator("#player-overlay")).toHaveClass(/is-mobile-map-player/);
  await expect(caption).toBeVisible();
  await page.locator("#player-play-button").click();
  await expect(caption).toBeVisible();
  await page.evaluate(() => {
    window.__pausedCaptionSync = window.setInterval(() => {
      document.querySelector("audio")?.dispatchEvent(new Event("timeupdate"));
    }, 150);
  });
  await expect(caption).toBeHidden({ timeout: 4_500 });
  await page.evaluate(() => window.clearInterval(window.__pausedCaptionSync));

  await page.locator("#player-play-button").click();
  await expectAudioPlaying(page);
  await expect(caption).toBeVisible();
  await page.locator("#player-map-button").click();
  await expect(page.locator("#player-overlay")).not.toHaveClass(/is-mobile-map-player/);
  await expect(caption).toBeHidden();
  const listeningTranscript = page.locator("#player-mobile-live-transcript");
  await expect(listeningTranscript).toBeVisible();
  await page.locator("#player-play-button").click();
  await expect(listeningTranscript).toBeVisible();
  await expect(listeningTranscript).toBeHidden({ timeout: 4_500 });
  await expectNoRuntimeErrors(errors);
});

test("switching from mobile map to listening immediately reveals the current transcript cue", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "mobile-chrome", "The view switch is mobile-only.");
  test.setTimeout(90_000);
  const errors = collectRuntimeErrors(page);
  for (const viewport of [{ width: 375, height: 667 }, { width: 440, height: 956 }]) {
    await page.setViewportSize(viewport);
    await enterSite(page);
    await stopButton(page, 1).click();
    await expectAudioPlaying(page);
    await openFullPlayer(page);
    await expect(page.locator("#player-overlay")).toHaveClass(/is-mobile-map-player/);

    const audio = page.locator("audio");
    await audio.evaluate((element) => {
      element.currentTime = 101;
      element.dispatchEvent(new Event("seeked"));
      element.dispatchEvent(new Event("timeupdate"));
    });
    await expect.poll(() => audio.evaluate((element) => element.currentTime)).toBeGreaterThan(100);
    await page.locator("#player-map-button").click();
    await expect(page.locator("#player-overlay")).not.toHaveClass(/is-mobile-map-player/);
    await expectAudioPlaying(page);

    const transcript = page.locator("#player-mobile-live-transcript-scroll");
    await expect(transcript).toBeVisible();
    await expect.poll(() => transcript.evaluate((element) => element.scrollTop), { timeout: 1_000 }).toBeGreaterThan(20);
    const position = await transcript.evaluate((element) => {
      const active = element.querySelector(".player-mobile-transcript-segment.is-active");
      const frame = element.getBoundingClientRect();
      const activeBox = active?.getBoundingClientRect();
      return {
        text: active?.textContent || "",
        scrollTop: element.scrollTop,
        activeTop: activeBox?.top,
        activeBottom: activeBox?.bottom,
        frameTop: frame.top,
        frameBottom: frame.bottom,
      };
    });
    expect(position.text).toContain("grandi cardini in pietra");
    expect(position.scrollTop).toBeGreaterThan(20);
    expect(position.activeTop).toBeGreaterThanOrEqual(position.frameTop - 2);
    expect(position.activeBottom).toBeLessThanOrEqual(position.frameBottom + 2);
    await expectNoRuntimeErrors(errors);
  }
});

test("map location control recenters the route on desktop and locates the user on mobile", async ({ page }, testInfo) => {
  const errors = collectRuntimeErrors(page);
  if (testInfo.project.name !== "desktop-chrome") {
    await page.context().grantPermissions(["geolocation"]);
    await page.context().setGeolocation({ latitude: 43.6995, longitude: 10.5865, accuracy: 12 });
  }
  await enterSite(page);

  if (testInfo.project.name === "desktop-chrome") {
    await expect(page.locator(".map-floating-controls")).toBeHidden();
    await expectNoRuntimeErrors(errors);
    return;
  }

  await expect(page.locator("#map-recenter-button")).toHaveAttribute("aria-label", /.+/);
  await expect(page.locator("#map-recenter-button .material-symbols-rounded")).toHaveText("my_location");
  await expect(page.locator(".map-floating-controls")).toHaveAttribute("role", "group");
  const controlGroupMetrics = await page.locator(".map-floating-controls").evaluate((group) => {
    const style = getComputedStyle(group);
    const button = group.querySelector(".map-action-button");
    const buttonStyle = button ? getComputedStyle(button) : null;
    return {
      width: style.width,
      padding: style.padding,
      gap: style.gap,
      buttonWidth: buttonStyle?.width,
      buttonHeight: buttonStyle?.height,
    };
  });
  expect(controlGroupMetrics).toMatchObject({
    width: "60px",
    padding: "4px",
    gap: "8px",
    buttonWidth: "48px",
    buttonHeight: "48px",
  });
  await page.locator("#map-recenter-button").click();
  if (testInfo.project.name !== "desktop-chrome") {
    await expect(page.locator("#map-load-status")).toHaveText("Posizione trovata sulla mappa.");
    await expect(page.locator(".map-user-location-marker")).toBeVisible();
    // The location toast is intentionally transient; the persistent marker is
    // the stable assertion for a completed mobile geolocation request.
    await expectNoRuntimeErrors(errors);
    return;
  }

  await expect(page.locator("#map-recenter-button")).not.toHaveClass(/is-recenter-cued/);
  await expect(page.locator("#map-recenter-button")).toHaveClass(/is-route-centered/);
  await expect(page.locator("#map-recenter-button")).toHaveAttribute("data-route-off-center", "false");
  await expect(page.locator("#map-recenter-button")).toHaveAttribute("data-route-centered", "true");
  const recenterStyles = await page.locator("#map-recenter-button").evaluate((button) => {
    const centered = getComputedStyle(button);
    const centeredStyles = { background: centered.backgroundColor, border: centered.borderColor, shadow: centered.boxShadow };
    button.classList.remove("is-route-centered");
    const standard = getComputedStyle(button);
    const standardStyles = { background: standard.backgroundColor, border: standard.borderColor, shadow: standard.boxShadow };
    button.classList.add("is-route-centered");
    return { centeredStyles, standardStyles };
  });
  expect(recenterStyles.centeredStyles).toEqual(recenterStyles.standardStyles);
  await expectNoRuntimeErrors(errors);
});

test("mobile GPS outside the route restores the complete route view", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name === "desktop-chrome", "The route-preserving GPS behavior is mobile-only.");
  const errors = collectRuntimeErrors(page);
  await page.context().grantPermissions(["geolocation"]);
  await page.context().setGeolocation({ latitude: 43.74, longitude: 10.65, accuracy: 18 });
  await enterSite(page);

  await page.locator("#map-recenter-button").click();
  await expect(page.locator("#map-load-status")).toHaveText(
    "Sei fuori dall'area del percorso. Ti mostro le tappe di Vicopisano.",
  );
  await expect(page.locator(".map-user-location-marker")).toHaveCount(1);
  await expect(page.locator("#map-recenter-button")).toHaveAttribute("data-route-centered", "true");
  await page.locator("#map-recenter-button").click();
  await expect(page.locator("#map-load-status")).toHaveText(
    "Sei fuori dall'area del percorso. Ti mostro le tappe di Vicopisano.",
  );
  await expectNoRuntimeErrors(errors);
});

test("map cannot zoom out beyond the local route context", async ({ page }) => {
  const errors = collectRuntimeErrors(page);
  await enterSite(page);

  if (test.info().project.name === "mobile-chrome") {
    await expect(page.locator(".leaflet-control-zoom")).toBeHidden();
    await page.evaluate(() => { map.stop(); map.setZoom(map.getMinZoom(), { animate: false }); });
    await expect.poll(() => page.evaluate(() => map.getZoom() === map.getMinZoom())).toBe(true);
  } else {
    const zoomOut = page.getByRole("button", { name: "Zoom out" });
    for (let attempt = 0; attempt < 8; attempt += 1) {
      if ((await zoomOut.getAttribute("aria-disabled")) === "true") break;
      await zoomOut.click({ force: true });
    }
    await expect(zoomOut).toHaveAttribute("aria-disabled", "true");
  }

  await expect(page.locator(".map-marker")).toHaveCount(7);
  await expect(page.locator("#map-recenter-button")).toHaveAttribute("data-route-off-center", "false");
  await expectNoRuntimeErrors(errors);
});

test("desktop map stays anchored above the mini-player while the stops column scrolls", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "desktop-chrome", "The split sticky layout is desktop-only.");
  const errors = collectRuntimeErrors(page);
  await enterSite(page);

  await page.waitForTimeout(1_000);
  await page.evaluate(() => window.scrollTo({ top: window.innerHeight * 0.7, behavior: "auto" }));
  await page.waitForTimeout(180);
  const pageScrollY = await page.evaluate(() => window.scrollY);
  expect(pageScrollY).toBeGreaterThan(0);

  const [mapBox, miniPlayerBox] = await Promise.all([
    page.locator(".map-stage-frame").boundingBox(),
    page.locator(".mini-player").boundingBox(),
  ]);
  expect(mapBox).not.toBeNull();
  expect(miniPlayerBox).not.toBeNull();
  expect(mapBox.y + mapBox.height).toBeLessThanOrEqual(miniPlayerBox.y - 8);
  expect(miniPlayerBox.y - (mapBox.y + mapBox.height)).toBeLessThanOrEqual(28);
  await expectNoRuntimeErrors(errors);
});

test("free mini-player areas open the desktop map experience or mobile full player without hijacking controls", async ({ page }, testInfo) => {
  const errors = collectRuntimeErrors(page);
  await enterSite(page);

  await page.locator("#mini-player-toggle").click();
  await expect(page.locator("#player-overlay")).toBeHidden();

  await page.locator("#mini-player-open").click();
  if (testInfo.project.name === "desktop-chrome") {
    await expect(page.locator("body")).toHaveClass(/is-map-fullscreen/);
    await expect(page.locator("#player-overlay")).toHaveClass(/is-map-panel/);
  } else {
    await expect(page.locator("#player-overlay")).toBeVisible();
    await expect(page.locator("#player-overlay")).toHaveAttribute("aria-hidden", "false");
  }
  await expectNoRuntimeErrors(errors);
});

test("mini-player expansion opens Explore on desktop and the full player on mobile", async ({ page }, testInfo) => {
  const errors = collectRuntimeErrors(page);
  await enterSite(page);

  await page.locator("#mini-player-expand").click();
  if (testInfo.project.name === "desktop-chrome") {
    await expect(page.locator("body")).toHaveClass(/is-map-fullscreen/);
    await expect(page.locator(".map-stage-frame")).toHaveClass(/is-expanded/);
    if (await page.locator("#player-overlay").isVisible()) {
      await expect(page.locator("#player-overlay")).toHaveClass(/is-map-panel/);
    }
  } else {
    await expect(page.locator("#player-overlay")).toBeVisible();
    await expect(page.locator("#player-overlay")).toHaveAttribute("aria-hidden", "false");
    await expect(page.locator("body")).toHaveClass(/is-map-fullscreen/);
    await expect(page.locator("body")).toHaveClass(/is-mobile-map-player-mode/);
    await expect(page.locator("#mini-player-expand")).toHaveAttribute(
      "aria-label",
      "Apri player a schermo intero",
    );
  }

  await expectNoRuntimeErrors(errors);
});

test("mobile map hides the fullscreen map entry point", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name === "desktop-chrome", "The mobile map layout is phone-only.");
  const errors = collectRuntimeErrors(page);
  await enterSite(page);

  await expect(page.locator("#map-fullscreen-button")).toBeHidden();
  await expect(page.locator(".mini-player")).toBeVisible();

  await expectNoRuntimeErrors(errors);
});

test("desktop Explore mode keeps all player controls in the contextual panel", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "desktop-chrome", "The side player panel is desktop-only.");
  test.setTimeout(60_000);
  const errors = collectRuntimeErrors(page);
  await enterSite(page);

  await page.locator("#mini-player-expand").click();
  await expect(page.locator("#player-overlay")).toBeVisible();

  await expect(page.locator("body")).toHaveClass(/is-map-player-panel/);
  await expect(page.locator("#player-overlay")).toHaveClass(/is-map-panel/);
  await expect(page.locator("#transcript-reading-mode-button")).toHaveCount(0);
  await expect(page.locator(".mini-player")).toBeHidden();
  await expect(page.locator("#mini-player-expand")).toBeHidden();
  await expect(page.locator("#detail-number")).toBeVisible();
  await expect(page.locator("#player-share-button")).toHaveCount(0);
  await expect(page.locator("#player-overlay .player-timeline")).toBeVisible();
  await expect(page.locator("#player-overlay .player-command-row")).toBeVisible();
  await expect(page.locator("#map-live-caption")).toHaveCSS("white-space", "pre-line");
  await expect(page.locator("#map-live-caption")).toHaveCSS("z-index", "4950");
  // Captions are paginated in JavaScript, not truncated by a CSS line clamp.
  await expect
    .poll(() => page.locator("#map-live-caption").evaluate((element) => getComputedStyle(element).webkitLineClamp))
    .toBe("none");
  await expect(page.locator("#mini-player-progress-input")).toBeHidden();
  await expect(page.locator(".mini-player-controls")).toBeHidden();
  await expect(page.locator("#player-next-preview-image")).toBeVisible();
  await expect(page.locator("#detail-title")).toBeVisible();
  await expect(page.locator(".mini-player-main")).toBeHidden();

  const [mapBox, playerBox] = await Promise.all([
    page.locator(".map-stage-frame").boundingBox(),
    page.locator("#player-overlay").boundingBox(),
  ]);
  expect(mapBox).not.toBeNull();
  expect(playerBox).not.toBeNull();
  expect(playerBox.x).toBeGreaterThanOrEqual(mapBox.x + mapBox.width - 1);

  const [artworkBox, closeBox, playerSideBox, navigationBox, panelTimelineBox, panelControlsBox] = await Promise.all([
    page.locator("#player-overlay .player-artwork").boundingBox(),
    page.locator("#player-close-button").boundingBox(),
    page.locator("#player-overlay .player-side").boundingBox(),
    page.locator(".player-stop-navigation").boundingBox(),
    page.locator("#player-overlay .player-timeline").boundingBox(),
    page.locator("#player-overlay .player-command-row").boundingBox(),
  ]);
  expect(artworkBox).not.toBeNull();
  expect(navigationBox).not.toBeNull();
  expect(panelTimelineBox).not.toBeNull();
  expect(panelControlsBox).not.toBeNull();
  expect(artworkBox.x).toBeGreaterThanOrEqual(playerBox.x);
  expect(artworkBox.x + artworkBox.width).toBeLessThanOrEqual(playerBox.x + playerBox.width);
  expect(Math.abs(artworkBox.width - artworkBox.height)).toBeLessThanOrEqual(2);
  expect(artworkBox.y - (closeBox.y + closeBox.height)).toBeGreaterThanOrEqual(8);
  expect(playerSideBox.y).toBeGreaterThanOrEqual(artworkBox.y + artworkBox.height + 8);
  expect(navigationBox.y).toBeGreaterThan(artworkBox.y + artworkBox.height);
  await expect(page.locator("#player-transcript-dock")).toBeHidden();
  expect(panelTimelineBox.x).toBeGreaterThanOrEqual(playerBox.x);
  expect(panelTimelineBox.x + panelTimelineBox.width).toBeLessThanOrEqual(playerBox.x + playerBox.width);
  expect(panelControlsBox.y).toBeGreaterThan(panelTimelineBox.y);
  await expect(page.locator("#map-recenter-button")).toBeHidden();
  await expect(page.locator("#map-fullscreen-button")).toBeHidden();
  await expect(page.locator(".map-explore-mascot")).toBeVisible();
  const mapMascot = page.locator(".map-explore-mascot-motion");
  await expect(mapMascot).toHaveAttribute("role", "button");
  await mapMascot.click();
  await expect(mapMascot).toHaveClass(/is-hero-tap-reaction/);
  expect(mapBox.y + mapBox.height).toBeGreaterThanOrEqual(playerBox.y + playerBox.height - 1);

  const controlIds = [
    "#player-previous-track",
    "#player-prev-button",
    "#player-play-button",
    "#player-next-button",
    "#player-next-track",
    "#player-speed-button",
  ];
  const controlBoxes = await Promise.all(controlIds.map((id) => page.locator(id).boundingBox()));
  controlBoxes.forEach((box) => {
    expect(box).not.toBeNull();
    expect(box.width).toBeGreaterThanOrEqual(44);
    expect(box.height).toBeGreaterThanOrEqual(44);
    expect(box.x).toBeGreaterThanOrEqual(playerBox.x);
    expect(box.x + box.width).toBeLessThanOrEqual(playerBox.x + playerBox.width);
  });
  const playCenterY = controlBoxes[2].y + controlBoxes[2].height / 2;
  controlBoxes.forEach((box) => {
    expect(Math.abs(box.y + box.height / 2 - playCenterY)).toBeLessThanOrEqual(2);
  });

  await page.locator("#player-play-button").click();
  await expect(page.locator("#map-live-caption")).toBeVisible({ timeout: 8000 });
  const [mascotBox, captionBox] = await Promise.all([
    page.locator(".map-explore-mascot").boundingBox(),
    page.locator("#map-live-caption").boundingBox(),
  ]);
  expect(mascotBox.y + mascotBox.height).toBeLessThan(captionBox.y);
  expect(captionBox.x + captionBox.width).toBeLessThanOrEqual(playerBox.x);

  await page.setViewportSize({ width: 1024, height: 768 });
  const [narrowPanelBox, narrowCaptionBox, narrowArtworkBox, narrowCloseBox, narrowControls] = await Promise.all([
    page.locator("#player-overlay").boundingBox(),
    page.locator("#map-live-caption").boundingBox(),
    page.locator("#player-overlay .player-artwork").boundingBox(),
    page.locator("#player-close-button").boundingBox(),
    Promise.all(controlIds.map((id) => page.locator(id).boundingBox())),
  ]);
  expect(narrowArtworkBox.y - (narrowCloseBox.y + narrowCloseBox.height)).toBeGreaterThanOrEqual(8);
  expect(narrowCaptionBox.x + narrowCaptionBox.width).toBeLessThanOrEqual(narrowPanelBox.x);
  narrowControls.forEach((box) => {
    expect(box.x).toBeGreaterThanOrEqual(narrowPanelBox.x);
    expect(box.x + box.width).toBeLessThanOrEqual(narrowPanelBox.x + narrowPanelBox.width);
  });

  await page.locator("#player-close-button").click();
  await expect(page.locator("#player-overlay")).toBeHidden();
  await expect(page.locator("body")).not.toHaveClass(/is-map-fullscreen/);
  await expect(page.locator("body")).not.toHaveClass(/is-map-player-panel/);
  await expect(page.locator(".map-stage-frame")).not.toHaveClass(/is-expanded/);
  await expectNoRuntimeErrors(errors);
});

test("an open player follows the desktop Explore and mobile full-player layouts on resize", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "desktop-chrome", "Viewport transition is exercised from desktop.");
  const errors = collectRuntimeErrors(page);
  await enterSite(page);
  await page.locator("#mini-player-expand").click();
  await expect(page.locator("#player-overlay")).toHaveClass(/is-map-panel/);

  await page.setViewportSize({ width: 900, height: 900 });
  await expect(page.locator("#player-overlay")).toBeVisible();
  await expect(page.locator("#player-overlay")).not.toHaveClass(/is-map-panel/);
  await expect(page.locator("body")).not.toHaveClass(/is-map-player-panel/);
  await expect(page.locator("body")).toHaveClass(/is-mobile-map-player-mode/);
  await expect(page.locator("#player-overlay .player-sheet")).toHaveAttribute("aria-modal", "false");
  await expect(page.locator(".map-explore-mascot-motion")).not.toHaveAttribute("role", "button");

  await page.setViewportSize({ width: 1440, height: 900 });
  await expect(page.locator("#player-overlay")).toHaveClass(/is-map-panel/);
  await expect(page.locator("body")).toHaveClass(/is-map-player-panel/);
  await expect(page.locator("#player-overlay .player-sheet")).toHaveAttribute("aria-modal", "false");
  await expect(page.locator(".map-explore-mascot-motion")).toHaveAttribute("role", "button");
  await expectNoRuntimeErrors(errors);
});

test("shared speed control styling survives player modes and responsive widths", async ({ page }, testInfo) => {
  test.setTimeout(90_000);
  await enterSite(page);
  const miniSpeed = page.locator("#mini-player-speed-button");
  await miniSpeed.click();
  await expect(miniSpeed).toHaveText("x1,25");

  const assertSpeedStyle = async (button) => {
    await expect(button).toHaveCSS("color", "rgb(232, 195, 109)");
    await expect(button).toHaveCSS("background-color", "rgba(0, 0, 0, 0)");
    const sizing = await button.evaluate((element) => ({
      buttonWidth: element.getBoundingClientRect().width,
      buttonHeight: element.getBoundingClientRect().height,
      labelWidth: element.querySelector("span")?.scrollWidth ?? 0,
      labelAvailable: element.querySelector("span")?.clientWidth ?? 0,
      fontFamily: getComputedStyle(element).fontFamily,
    }));
    expect(sizing.buttonWidth).toBeGreaterThanOrEqual(44);
    expect(sizing.buttonHeight).toBeGreaterThanOrEqual(44);
    expect(sizing.labelWidth).toBeLessThanOrEqual(sizing.labelAvailable + 1);
    expect(sizing.fontFamily).toContain("Roboto");
  };

  for (const width of testInfo.project.name === "desktop-chrome" ? [1024, 1440] : [320, 375, 440]) {
    await page.setViewportSize({ width, height: testInfo.project.name === "desktop-chrome" ? 900 : 667 });
    await assertSpeedStyle(miniSpeed);
  }
  await page.keyboard.press("Tab");
  await miniSpeed.focus();
  await expect.poll(() => miniSpeed.evaluate((element) => element.matches(":focus-visible"))).toBe(true);
  await expect(miniSpeed).toHaveCSS("outline-color", "rgb(44, 109, 163)");

  await openFullPlayer(page);
  const fullSpeed = page.locator("#player-speed-button");
  await expect(fullSpeed).toHaveText("x1,25");
  await assertSpeedStyle(fullSpeed);
  await page.keyboard.press("Tab");
  await fullSpeed.focus();
  await expect.poll(() => fullSpeed.evaluate((element) => element.matches(":focus-visible"))).toBe(true);
  await expect(fullSpeed).toHaveCSS("outline-color", "rgb(44, 109, 163)");
  if (testInfo.project.name !== "desktop-chrome") {
    await page.locator("#player-map-button").click();
    await expect(page.locator("#player-overlay")).not.toHaveClass(/is-mobile-map-player/);
    await assertSpeedStyle(fullSpeed);
  }
});

test("full player controls playback, seek, speed and live transcript", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name === "desktop-chrome", "Desktop keeps controls in the map experience.");
  test.setTimeout(60_000);
  const errors = collectRuntimeErrors(page);
  await enterSite(page);
  await stopButton(page, 2).click();
  await expectAudioPlaying(page);
  await openFullPlayer(page);
  await page.locator("#player-map-button").click();
  await expect(page.locator("#player-overlay")).not.toHaveClass(/is-mobile-map-player/);

  await page.locator("#player-play-button").click();
  await expect.poll(() => page.locator("audio").evaluate((audio) => audio.paused)).toBe(true);
  await page.locator("#player-play-button").click();
  await expectAudioPlaying(page);

  await page.locator("audio").evaluate((audio) => {
    audio.pause();
    if (!Number.isFinite(audio.duration)) {
      Object.defineProperty(audio, "duration", { configurable: true, value: 224 });
    }
    audio.currentTime = 30;
  });
  await page.locator("#player-prev-button").click();
  await expect(page.locator("#player-seek-feedback")).toHaveText("−10s");
  await page.locator("#player-next-button").click();
  await expect(page.locator("#player-seek-feedback")).toHaveText("+10s");
  await expect(page.locator(".seek-feedback")).toHaveCount(0);

  await page.locator("#player-speed-button").click();
  await expect(page.locator("#player-speed-button")).toHaveText("x1,25");
  await expect.poll(() => page.locator("audio").evaluate((audio) => audio.playbackRate)).toBe(1.25);

  await expect(page.locator("#player-share-button")).toHaveCount(0);

  await expect(page.locator("#player-transcript-dock")).toBeVisible();
  await expect(page.locator("#detail-copy-title")).toBeHidden();
  await page.locator("#player-play-button").click();
  await expectAudioPlaying(page);
  await expect(page.locator("#player-mobile-live-transcript")).toBeVisible();
  await expect(page.locator("#player-mobile-live-transcript-scroll")).not.toHaveText("");
  await expect(page.locator("#player-mobile-live-transcript-scroll")).toHaveAttribute("data-mode", "scroll");

  await watchClass(page, "#player-overlay", "is-closing");
  await page.locator("#player-close-button").click();
  await expectClassObserved(page, "is-closing");
  await expect(page.locator("#player-overlay")).toBeHidden();
  await expectNoRuntimeErrors(errors);
});

test("mobile full-player seek and ten-second controls stay in sync in both views", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name === "desktop-chrome", "Both mobile full-player views are phone-only.");
  test.setTimeout(90_000);
  const errors = collectRuntimeErrors(page);
  await page.setViewportSize({ width: 375, height: 667 });
  await enterSite(page);
  await stopButton(page, 1).click();
  await expectAudioPlaying(page);
  await page.locator("#mini-player-open").click();
  await expect(page.locator("#player-overlay")).toHaveClass(/is-mobile-map-player/);

  const audio = page.locator("audio");
  const timeline = page.locator("#player-progress-input");
  // Headless Chrome does not decode the local MP3 reliably. Keep the real
  // controls and events, but provide deterministic media time/metadata.
  await audio.evaluate((element) => {
    element.pause();
    let currentTime = 0;
    let readyState = HTMLMediaElement.HAVE_NOTHING;
    window.__setMockAudioReady = () => {
      readyState = HTMLMediaElement.HAVE_ENOUGH_DATA;
      element.dispatchEvent(new Event("loadedmetadata"));
    };
    Object.defineProperties(element, {
      duration: { configurable: true, get: () => 229 },
      readyState: { configurable: true, get: () => readyState },
      currentTime: {
        configurable: true,
        get: () => currentTime,
        set: (value) => {
          currentTime = value;
          element.dispatchEvent(new Event("timeupdate"));
        },
      },
    });
  });
  await page.locator("#player-next-button").click();
  await expect(audio).toHaveJSProperty("currentTime", 0);
  await page.evaluate(() => window.__setMockAudioReady());
  await expect(audio).toHaveJSProperty("currentTime", 10);
  await audio.evaluate((element) => { element.currentTime = 0; });
  const duration = await audio.evaluate((element) => element.duration);
  await expect(timeline).toBeEnabled();

  for (const mode of ["map", "listening"]) {
    if (mode === "listening") {
      await page.locator("#player-map-button").click();
      await expect(page.locator("#player-overlay")).not.toHaveClass(/is-mobile-map-player/);
    }
    for (const width of [375, 320]) {
      await page.setViewportSize({ width, height: 667 });
      const controlsBox = await page.locator("#player-overlay .player-controls").boundingBox();
      const boxes = await Promise.all([
        "#player-previous-track", "#player-prev-button", "#player-play-button",
        "#player-next-button", "#player-next-track",
      ].map((selector) => page.locator(selector).boundingBox()));
      const [previousTrack, rewind, playBox, forward, nextTrack] = boxes;
      expect(controlsBox).not.toBeNull();
      expect(boxes.every(Boolean), `${mode} ${width}px transport buttons`).toBe(true);
      const centerX = (box) => box.x + box.width / 2;
      const centerY = (box) => box.y + box.height / 2;
      expect([previousTrack, rewind, playBox, forward, nextTrack].every((box, index, row) =>
        index === 0 || centerX(row[index - 1]) < centerX(box)), `${mode} ${width}px transport order`).toBe(true);
      const iconBoxes = await Promise.all([
        "#player-previous-track", "#player-prev-button", "#player-play-button",
        "#player-next-button", "#player-next-track",
      ].map((selector) => page.locator(`${selector} .material-symbols-rounded`).boundingBox()));
      for (const [index, buttonBox] of boxes.entries()) {
        expect(buttonBox.width, `${mode} ${width}px button ${index} width`).toBeGreaterThanOrEqual(44);
        expect(Math.abs(centerY(buttonBox) - centerY(playBox)), `${mode} ${width}px button ${index} vertical alignment`).toBeLessThanOrEqual(4);
        expect(iconBoxes[index], `${mode} ${width}px button ${index} icon`).not.toBeNull();
        expect(Math.abs(centerX(iconBoxes[index]) - centerX(buttonBox)), `${mode} ${width}px button ${index} icon centering`).toBeLessThanOrEqual(2);
        expect(Math.abs(centerY(iconBoxes[index]) - centerY(buttonBox)), `${mode} ${width}px button ${index} icon vertical centering`).toBeLessThanOrEqual(2);
      }
      const speed = page.locator("#player-speed-button");
      await expect(speed, `${mode} ${width}px speed in controls`).toBeVisible();
      expect(await speed.evaluate((element) => element.parentElement.classList.contains("player-controls"))).toBe(true);
      const speedBox = await speed.boundingBox();
      expect(speedBox.width).toBeGreaterThanOrEqual(44);
      expect(speedBox.height).toBeGreaterThanOrEqual(44);
      expect(centerX(speedBox)).toBeGreaterThan(centerX(nextTrack));
      expect(Math.abs(centerY(speedBox) - centerY(playBox)), `${mode} ${width}px speed alignment`).toBeLessThanOrEqual(4);
      expect(previousTrack.x).toBeGreaterThanOrEqual(0);
      expect(speedBox.x + speedBox.width).toBeLessThanOrEqual(width + 1);
    }
    await page.setViewportSize({ width: 375, height: 667 });
    const box = await timeline.boundingBox();
    expect(box).not.toBeNull();
    await page.touchscreen.tap(box.x + box.width * 0.7, box.y + box.height / 2);
    await expect.poll(() => audio.evaluate((element) => element.currentTime)).toBeGreaterThan(duration * 0.6);
    await expect.poll(() => audio.evaluate((element) => element.currentTime)).toBeLessThan(duration * 0.8);
    const seeked = await audio.evaluate((element) => element.currentTime);
    await page.locator("#player-next-button").click();
    await expect.poll(() => audio.evaluate((element) => element.currentTime)).toBeGreaterThan(seeked + 9);
    const advanced = await audio.evaluate((element) => element.currentTime);
    await page.locator("#player-prev-button").click();
    await expect.poll(() => audio.evaluate((element) => element.currentTime)).toBeLessThan(advanced - 9);
    await expect.poll(async () => Number(await timeline.inputValue())).toBeGreaterThan(55);

    await timeline.evaluate((control) => {
      control.value = "40";
      control.dispatchEvent(new Event("input", { bubbles: true }));
    });
    await page.locator("#player-next-button").click();
    await expect.poll(() => audio.evaluate((element) => element.currentTime)).toBeGreaterThan(duration * 0.4 + 9);
    await expect.poll(async () => Number(await timeline.inputValue())).toBeGreaterThan(40);

    await timeline.evaluate((control) => {
      control.value = "25";
      control.dispatchEvent(new Event("input", { bubbles: true }));
      control.dispatchEvent(new Event("change", { bubbles: true }));
    });
    await expect.poll(() => audio.evaluate((element) => element.currentTime)).toBeLessThan(duration * 0.35);
  }
  await page.setViewportSize({ width: 1200, height: 800 });
  await expect.poll(() => page.locator("#player-speed-button").evaluate((element) => element.parentElement.classList.contains("player-controls"))).toBe(true);
  await page.setViewportSize({ width: 375, height: 667 });
  await expect.poll(() => page.locator("#player-speed-button").evaluate((element) => element.parentElement.classList.contains("player-controls"))).toBe(true);
  await expectNoRuntimeErrors(errors);
});

test("real narration seeks in both mobile full-player views", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name === "desktop-chrome", "The two mobile views are phone-only.");
  test.setTimeout(75_000);
  await page.setViewportSize({ width: 375, height: 667 });
  await enterSite(page);
  await stopButton(page, 1).click();
  const audio = page.locator("audio");
  await expect.poll(() => audio.evaluate((element) => element.duration), { timeout: 15_000 }).toBeGreaterThan(200);
  await audio.evaluate((element) => element.pause());
  await page.locator("#mini-player-open").evaluate((button) => button.click());
  await expect(page.locator("#player-overlay")).toHaveClass(/is-mobile-map-player/);

  await page.locator("#player-next-button").click();
  await expect.poll(() => audio.evaluate((element) => element.currentTime)).toBeGreaterThan(9);
  const timeline = page.locator("#player-progress-input");
  const box = await timeline.boundingBox();
  expect(box).not.toBeNull();
  await page.touchscreen.tap(box.x + box.width * 0.7, box.y + box.height / 2);
  await expect.poll(() => audio.evaluate((element) => element.currentTime)).toBeGreaterThan(130);

  await page.locator("#player-map-button").click();
  await expect(page.locator("#player-overlay")).not.toHaveClass(/is-mobile-map-player/);
  const before = await audio.evaluate((element) => element.currentTime);
  await page.locator("#player-prev-button").click();
  await expect.poll(() => audio.evaluate((element) => element.currentTime)).toBeLessThan(before - 9);
  const listeningBox = await timeline.boundingBox();
  expect(listeningBox).not.toBeNull();
  await page.touchscreen.tap(listeningBox.x + listeningBox.width * 0.25, listeningBox.y + listeningBox.height / 2);
  await expect.poll(() => audio.evaluate((element) => element.currentTime)).toBeLessThan(80);
  await page.locator("#player-play-button").click();
  await expectAudioPlaying(page);
  const playingTime = await audio.evaluate((element) => element.currentTime);
  await page.locator("#player-next-button").click();
  await expect.poll(() => audio.evaluate((element) => element.currentTime)).toBeGreaterThan(playingTime + 9);
  await page.touchscreen.tap(listeningBox.x + listeningBox.width * 0.5, listeningBox.y + listeningBox.height / 2);
  await expect.poll(() => audio.evaluate((element) => element.currentTime)).toBeGreaterThan(100);
});

test("real narration seeks in the mini-player and desktop Explore", async ({ page }, testInfo) => {
  test.setTimeout(75_000);
  await enterSite(page);
  await stopButton(page, 1).click();
  const audio = page.locator("audio");
  await expect.poll(() => audio.evaluate((element) => element.duration), { timeout: 15_000 }).toBeGreaterThan(200);
  await audio.evaluate((element) => element.pause());

  await page.locator("#mini-player-next").click();
  await expect.poll(() => audio.evaluate((element) => element.currentTime)).toBeGreaterThan(9);
  const miniTimeline = page.locator("#mini-player-progress-input");
  const miniBox = await miniTimeline.boundingBox();
  expect(miniBox).not.toBeNull();
  const miniPlayBox = await page.locator("#mini-player-toggle").boundingBox();
  expect(miniPlayBox).not.toBeNull();
  for (const selector of ["#mini-player-previous-track", "#mini-player-prev", "#mini-player-next", "#mini-player-next-track", "#mini-player-speed-button"]) {
    const buttonBox = await page.locator(selector).boundingBox();
    expect(buttonBox).not.toBeNull();
    expect(Math.abs(buttonBox.y + buttonBox.height / 2 - (miniPlayBox.y + miniPlayBox.height / 2)), `${selector} vertical alignment`).toBeLessThanOrEqual(4);
  }
  if (testInfo.project.name === "desktop-chrome") {
    await page.mouse.click(miniBox.x + miniBox.width * 0.5, miniBox.y + miniBox.height / 2);
  } else {
    await page.touchscreen.tap(miniBox.x + miniBox.width * 0.5, miniBox.y + miniBox.height / 2);
  }
  await expect.poll(() => audio.evaluate((element) => element.currentTime)).toBeGreaterThan(90);
  await page.locator("#mini-player-prev").click();
  await expect.poll(() => audio.evaluate((element) => element.currentTime)).toBeLessThan(110);

  if (testInfo.project.name === "desktop-chrome") {
    await openFullPlayer(page);
    await expect(page.locator("#player-overlay")).toHaveClass(/is-map-panel/);
    const fullPlayBox = await page.locator("#player-play-button").boundingBox();
    expect(fullPlayBox).not.toBeNull();
    for (const selector of ["#player-previous-track", "#player-prev-button", "#player-next-button", "#player-next-track", "#player-speed-button"]) {
      const buttonBox = await page.locator(selector).boundingBox();
      expect(buttonBox).not.toBeNull();
      expect(Math.abs(buttonBox.y + buttonBox.height / 2 - (fullPlayBox.y + fullPlayBox.height / 2)), `${selector} vertical alignment`).toBeLessThanOrEqual(4);
    }
    const fullTimeline = page.locator("#player-progress-input");
    const fullBox = await fullTimeline.boundingBox();
    expect(fullBox).not.toBeNull();
    await page.mouse.click(fullBox.x + fullBox.width * 0.25, fullBox.y + fullBox.height / 2);
    await expect.poll(() => audio.evaluate((element) => element.currentTime)).toBeLessThan(75);
    const before = await audio.evaluate((element) => element.currentTime);
    await page.locator("#player-next-button").click();
    await expect.poll(() => audio.evaluate((element) => element.currentTime)).toBeGreaterThan(before + 9);
  }
});

test("previous and next navigation reflects first, intermediate and last stops", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name === "desktop-chrome", "Desktop navigation is covered by Explore mode.");
  const errors = collectRuntimeErrors(page);
  await enterSite(page);
  await openFullPlayer(page);
  await page.locator("#player-map-button").click();

  await expect(page.locator("#player-previous-preview")).toBeHidden();
  await expect(page.locator("#player-next-preview")).toBeVisible();
  await page.locator("#player-next-stop-button").click();
  await expect(page.locator("#detail-number")).toHaveText("2");
  await expect(page.locator("#player-previous-preview")).toBeVisible();
  await expect(page.locator("#player-next-preview")).toBeVisible();
  await expect(page.locator("#player-previous-preview-image")).toHaveAttribute("src", /.+/);
  await expect(page.locator("#player-next-preview-image")).toHaveAttribute("src", /.+/);

  await page.locator("audio").evaluate((audio) => {
    audio.pause();
    audio.currentTime = 12;
  });
  await page.locator("#player-previous-track").click();
  await expect(page.locator("#detail-number")).toHaveText("2");
  await expect(page.locator("audio")).toHaveJSProperty("currentTime", 0);
  await page.locator("#player-previous-track").click();
  await expect(page.locator("#detail-number")).toHaveText("1");
  await page.locator("#player-previous-track").click();
  await page.locator("#player-previous-track").click();
  await expect(page.locator("#detail-number")).toHaveText("1");

  await page.locator("#player-close-button").click();
  await stopButton(page, 7).click();
  await openFullPlayer(page);
  await page.locator("#player-map-button").click();
  await expect(page.locator("#player-previous-preview")).toBeVisible();
  await expect(page.locator("#player-next-preview")).toBeHidden();
  await page.locator("#player-next-track").click();
  await expect(page.locator("#detail-number")).toHaveText("7");
  await expectNoRuntimeErrors(errors);
});

test("mobile stop navigation preserves the current full-player view", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name === "desktop-chrome", "The two full-player views are mobile-only.");
  test.setTimeout(90_000);
  const errors = collectRuntimeErrors(page);
  await page.setViewportSize({ width: 375, height: 667 });
  await enterSite(page);
  await openFullPlayer(page);

  const overlay = page.locator("#player-overlay");
  const listenView = async (number) => {
    await expect(page.locator("#detail-number")).toHaveText(String(number));
    await expect(overlay).not.toHaveClass(/is-mobile-map-player/);
    await expect(page.locator("#player-transcript-dock")).toBeVisible();
  };

  await expect(overlay).toHaveClass(/is-mobile-map-player/);
  await page.locator("#player-map-button").click();
  await listenView(1);

  await page.locator("#player-next-stop-button").click();
  await listenView(2);
  await expect(page.locator("#detail-title-text")).toContainText("Camminamento del Soccorso");
  await page.locator("#player-next-track").click();
  await listenView(3);
  await expect(page.locator("#detail-title-text")).toContainText("Palazzo Pretorio");

  await page.locator("audio").evaluate((audio) => {
    audio.pause();
    audio.currentTime = 12;
  });
  await page.locator("#player-previous-track").click();
  await listenView(3);
  await page.locator("#player-previous-stop-button").click();
  await listenView(2);

  await page.locator("audio").evaluate((audio) => audio.dispatchEvent(new Event("ended")));
  await expect(page.locator("body")).toHaveClass(/is-transition-audio/);
  await page.locator("audio").evaluate((audio) => audio.dispatchEvent(new Event("ended")));
  await listenView(3);

  await page.locator("#player-map-button").click();
  await expect(overlay).toHaveClass(/is-mobile-map-player/);
  await page.locator("#player-next-track").click();
  await expect(page.locator("#detail-number")).toHaveText("4");
  await expect(overlay).toHaveClass(/is-mobile-map-player/);
  await expectNoRuntimeErrors(errors);
});

test("ending a track advances and autoplays, except on the last stop", async ({ page }) => {
  const errors = collectRuntimeErrors(page);
  await enterSite(page);
  await stopButton(page, 1).click();
  await expectAudioPlaying(page);

  await page.locator("audio").evaluate((audio) => audio.dispatchEvent(new Event("ended")));
  await expect(page.locator("body")).toHaveClass(/is-transition-audio/);
  await expectAudioPlaying(page);
  await page.locator("audio").evaluate((audio) => audio.dispatchEvent(new Event("ended")));
  await expect(page.locator('.stop-button[aria-current="true"] .stop-index')).toHaveText("2");

  await stopButton(page, 7).click();
  await expectAudioPlaying(page);
  await page.locator("audio").evaluate((audio) => audio.dispatchEvent(new Event("ended")));
  await expect(page.locator('.stop-button[aria-current="true"] .stop-index')).toHaveText("7");
  await expectNoRuntimeErrors(errors);
});

test("transition audio replaces the previous mobile transcript immediately", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "mobile-chrome", "The live transcript overlay is mobile-only.");
  test.setTimeout(90_000);
  const errors = collectRuntimeErrors(page);
  await enterSite(page);
  await stopButton(page, 1).click();
  await expectAudioPlaying(page);
  await openFullPlayer(page);
  await page.locator("#player-map-button").click();
  await expect(page.locator("#player-overlay")).not.toHaveClass(/is-mobile-map-player/);

  const transcript = page.locator("#player-mobile-live-transcript");
  const transcriptLines = page.locator("#player-mobile-live-transcript-scroll .player-mobile-transcript-segment");
  await expect(transcript).toBeVisible();
  await page.locator("audio").evaluate((audio) => audio.dispatchEvent(new Event("ended")));
  await expect(page.locator("body")).toHaveClass(/is-transition-audio/);
  await expectAudioPlaying(page);
  await expect(transcript).toBeVisible();
  await expect(transcriptLines).toHaveCount(2);
  await expect(transcript).toContainText("Questa traccia fa parte dell'itinerario audio");
  await expect(transcript).not.toContainText("grandi cardini in pietra");
  await expectNoRuntimeErrors(errors);
});

test("transition play fills the home and mobile map-player control rows", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "mobile-chrome", "Transition control sizing is mobile-specific.");
  test.setTimeout(90_000);
  await enterSite(page);
  await stopButton(page, 1).click();
  await expectAudioPlaying(page);
  await page.locator("audio").evaluate((audio) => audio.dispatchEvent(new Event("ended")));
  await expect(page.locator("body")).toHaveClass(/is-transition-audio/);

  const miniPlay = page.locator("#mini-player-toggle");
  const miniTimeline = page.locator("#mini-player .mini-player-timeline");
  await expect.poll(async () => {
    const [play, timeline] = await Promise.all([miniPlay.boundingBox(), miniTimeline.boundingBox()]);
    return play && timeline ? Math.abs(play.width - timeline.width) : Number.POSITIVE_INFINITY;
  }).toBeLessThanOrEqual(2);

  await openFullPlayer(page);
  await expect(page.locator("#player-overlay")).toHaveClass(/is-mobile-map-player/);
  const playerPlay = page.locator("#player-play-button");
  const playerControls = page.locator("#player-overlay .player-controls");
  await expect.poll(async () => {
    const [play, controls] = await Promise.all([playerPlay.boundingBox(), playerControls.boundingBox()]);
    return play && controls ? controls.width - play.width : Number.POSITIVE_INFINITY;
  }).toBeLessThanOrEqual(2);
  const playerTimeline = page.locator("#player-overlay .player-timeline");
  await expect.poll(async () => {
    const [play, timeline] = await Promise.all([playerPlay.boundingBox(), playerTimeline.boundingBox()]);
    return play && timeline ? play.y - (timeline.y + timeline.height) : Number.NEGATIVE_INFINITY;
  }).toBeGreaterThanOrEqual(12);
});

test("transition play fills the desktop Explore control row", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "desktop-chrome", "The desktop Explore control row is desktop-only.");
  test.setTimeout(90_000);
  await enterSite(page);
  await stopButton(page, 1).click();
  await expectAudioPlaying(page);
  await page.locator("audio").evaluate((audio) => audio.dispatchEvent(new Event("ended")));
  await expect(page.locator("body")).toHaveClass(/is-transition-audio/);

  const miniTitle = page.locator("#mini-player-title .mini-player-title-track");
  const miniPlay = page.locator("#mini-player-toggle");
  const miniTimeline = page.locator("#mini-player .mini-player-timeline");
  await expect.poll(async () => {
    const [title, play, timeline] = await Promise.all([
      miniTitle.boundingBox(),
      miniPlay.boundingBox(),
      miniTimeline.boundingBox(),
    ]);
    if (!title || !play || !timeline) return Number.POSITIVE_INFINITY;
    const leftGap = play.x - (title.x + title.width);
    const rightGap = timeline.x - (play.x + play.width);
    return Math.abs(leftGap - rightGap);
  }).toBeLessThanOrEqual(4);

  await openFullPlayer(page);
  await expect(page.locator("#player-overlay")).toHaveClass(/is-map-panel/);
  const playerPlay = page.locator("#player-play-button");
  const playerControls = page.locator("#player-overlay .player-controls");
  await expect.poll(async () => {
    const [play, controls] = await Promise.all([playerPlay.boundingBox(), playerControls.boundingBox()]);
    return play && controls ? controls.width - play.width : Number.POSITIVE_INFINITY;
  }).toBeLessThanOrEqual(2);
});
