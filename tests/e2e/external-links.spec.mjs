import { mkdir, writeFile } from "node:fs/promises";
import { expect, test } from "@playwright/test";
import { enterSite } from "./helpers.mjs";

const reportDirectory = new URL("../../work/external-links/", import.meta.url);
const protectedStatuses = new Set([401, 403, 429]);

const linksToCheck = [
  { name: "izi.TRAVEL", selector: ".logo-izi", hostname: "izi.travel", kind: "platform" },
  { name: "Loquis", selector: ".logo-loquis", hostname: "www.loquis.com", kind: "platform" },
  { name: "Spotify", selector: ".logo-spotify", hostname: "open.spotify.com", kind: "platform" },
];

function classifyStatus(status) {
  if (status >= 200 && status < 400) return { outcome: "PASS", detail: `HTTP ${status}` };
  if (protectedStatuses.has(status)) {
    return { outcome: "WARN", detail: `HTTP ${status}: servizio raggiungibile ma protetto o limitato` };
  }
  return { outcome: "FAIL", detail: `HTTP ${status}` };
}

async function probeUrl(request, href) {
  let lastError;

  for (let attempt = 1; attempt <= 2; attempt += 1) {
    try {
      const response = await request.get(href, {
        failOnStatusCode: false,
        maxRedirects: 10,
        timeout: 15_000,
        headers: {
          Accept: "text/html,application/xhtml+xml",
          "User-Agent": "Vicopisano-Link-Monitor/1.0",
        },
      });
      const status = response.status();
      const finalUrl = response.url();
      await response.dispose();

      if (status >= 500 && attempt === 1) {
        await new Promise((resolve) => setTimeout(resolve, 1_000));
        continue;
      }

      return { status, finalUrl, ...classifyStatus(status) };
    } catch (error) {
      lastError = error;
      if (attempt === 1) {
        await new Promise((resolve) => setTimeout(resolve, 1_000));
      }
    }
  }

  return {
    outcome: "FAIL",
    detail: `Errore di rete o timeout: ${lastError?.message || "errore sconosciuto"}`,
  };
}

function validateStructure(definition, href, siteOrigin) {
  if (!href) return "href assente";

  let url;
  try {
    url = new URL(href);
  } catch {
    return "URL non valido";
  }

  if (definition.protocol && url.protocol !== definition.protocol) {
    return `protocollo inatteso: ${url.protocol}`;
  }
  if (definition.hostname && url.hostname !== definition.hostname) {
    return `dominio inatteso: ${url.hostname}`;
  }

  if (definition.requiredParameter) {
    const value = url.searchParams.get(definition.requiredParameter);
    if (!value) return `parametro ${definition.requiredParameter} assente`;
    if (!value.includes(siteOrigin)) return `parametro ${definition.requiredParameter} non contiene il sito pubblico`;
  }

  if (definition.kind === "email") {
    if (!url.searchParams.get("subject")) return "oggetto email assente";
    const body = url.searchParams.get("body");
    if (!body || !body.includes(siteOrigin)) return "corpo email privo del sito pubblico";
  }

  return null;
}

function buildMarkdownReport(report) {
  const lines = [
    "# Controllo settimanale link esterni",
    "",
    `Data: ${report.checkedAt}`,
    `Sito: ${report.baseURL}`,
    "",
    `Risultato: ${report.summary.pass} PASS, ${report.summary.warn} WARN, ${report.summary.pending} PENDING, ${report.summary.fail} FAIL`,
    "",
    "| Esito | Destinazione | HTTP | Dettaglio |",
    "| --- | --- | ---: | --- |",
  ];

  for (const result of report.links) {
    lines.push(
      `| ${result.outcome} | ${result.name} | ${result.status ?? "-"} | ${result.detail.replaceAll("|", "\\|")} |`,
    );
  }

  return `${lines.join("\n")}\n`;
}

test("public platform links remain valid", async ({ page, request }, testInfo) => {
  const baseURL = process.env.E2E_BASE_URL || "https://transcendent-meerkat-166cbe.netlify.app";
  const siteOrigin = new URL(baseURL).origin;

  await enterSite(page);

  const results = await Promise.all(linksToCheck.map(async (definition) => {
    const control = page.locator(definition.selector);
    const href = (await control.getAttribute("href")) || (await control.getAttribute("data-platform-url"));
    if (!href) {
      return {
        name: definition.name,
        href: null,
        outcome: "PENDING",
        detail: "Collegamento intenzionalmente non pubblicato",
      };
    }
    const structureError = validateStructure(definition, href, siteOrigin);

    if (structureError) {
      return {
        name: definition.name,
        href,
        outcome: "FAIL",
        detail: structureError,
      };
    }

    if (definition.kind === "email") {
      return {
        name: definition.name,
        href,
        outcome: "PASS",
        detail: "mailto e parametri validi",
      };
    }

    return { name: definition.name, href, ...(await probeUrl(request, href)) };
  }));

  const report = {
    checkedAt: new Date().toISOString(),
    baseURL,
    summary: {
      pass: results.filter(({ outcome }) => outcome === "PASS").length,
      warn: results.filter(({ outcome }) => outcome === "WARN").length,
      pending: results.filter(({ outcome }) => outcome === "PENDING").length,
      fail: results.filter(({ outcome }) => outcome === "FAIL").length,
    },
    links: results,
  };
  const markdown = buildMarkdownReport(report);

  await mkdir(reportDirectory, { recursive: true });
  await Promise.all([
    writeFile(new URL("report.json", reportDirectory), `${JSON.stringify(report, null, 2)}\n`),
    writeFile(new URL("report.md", reportDirectory), markdown),
  ]);
  await testInfo.attach("external-links-report", {
    body: Buffer.from(markdown),
    contentType: "text/markdown",
  });

  console.log(`\n${markdown}`);
  expect(
    report.summary.fail,
    results.filter(({ outcome }) => outcome === "FAIL").map(JSON.stringify).join("\n"),
  ).toBe(0);
});
