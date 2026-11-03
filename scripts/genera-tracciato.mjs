#!/usr/bin/env node
// Genera il tracciato pedonale tra le tappe di un sito comunale seguendo le
// strade reali di OpenStreetMap (router OSRM, profilo foot) e lo scrive in
// app.js al posto di `routeGeoJson` e `ROUTE_STOP_ANCHORS`.
//
// Uso, dalla cartella del sito:
//   node scripts/genera-tracciato.mjs            genera, scrive app.js e il report
//   node scripts/genera-tracciato.mjs --dry-run  genera solo report e GeoJSON
//
// Correzioni: data/tracciato-vincoli.json, per esempio
//   { "tratti": { "1-2": { "via": [[43.7231, 10.5201]], "nota": "resta su Via Roma" } } }
// I punti "via" sono [lat, lon] da attraversare nell'ordine. Il tracciato non si
// corregge mai a mano: si aggiunge un vincolo e si rilancia lo script.

import { readFile, writeFile, mkdir } from "node:fs/promises";
import path from "node:path";

const ROUTER = process.env.TRACCIATO_ROUTER || "https://routing.openstreetmap.de/routed-foot/route/v1/foot";
const SNAP_WARNING_METERS = 15;
const DETOUR_WARNING_RATIO = 3;
const dryRun = process.argv.includes("--dry-run");

const appPath = path.resolve("app.js");
const constraintsPath = path.resolve("data/tracciato-vincoli.json");
const geojsonPath = path.resolve("data/tracciato.geojson");
const reportPath = path.resolve("data/tracciato-report.md");

function extractLiteral(source, declaration) {
  const start = source.indexOf(declaration);
  if (start < 0) throw new Error(`Non trovo "${declaration}" in app.js`);
  const open = source.indexOf("[", start);
  let depth = 0;
  let inString = null;
  for (let index = open; index < source.length; index += 1) {
    const char = source[index];
    if (inString) {
      if (char === "\\") index += 1;
      else if (char === inString) inString = null;
      continue;
    }
    if (char === '"' || char === "'" || char === "`") inString = char;
    else if (char === "[") depth += 1;
    else if (char === "]") {
      depth -= 1;
      if (depth === 0) return source.slice(open, index + 1);
    }
  }
  throw new Error(`Array "${declaration}" non chiuso in app.js`);
}

function haversine([lon1, lat1], [lon2, lat2]) {
  const toRad = (value) => (value * Math.PI) / 180;
  const a =
    Math.sin(toRad(lat2 - lat1) / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(toRad(lon2 - lon1) / 2) ** 2;
  return 6371000 * 2 * Math.asin(Math.sqrt(a));
}

const round = (value) => Math.round(value * 1e6) / 1e6;

async function routeLeg(points) {
  const coordinates = points.map(([lon, lat]) => `${lon},${lat}`).join(";");
  const url = `${ROUTER}/${coordinates}?overview=full&geometries=geojson&steps=true`;
  const response = await fetch(url, { headers: { "User-Agent": "travel-podcasting-genera-tracciato" } });
  if (!response.ok) throw new Error(`Router ${response.status} per ${url}`);
  const data = await response.json();
  if (data.code !== "Ok") throw new Error(`Router: ${data.code} ${data.message || ""}`);
  return data;
}

const source = await readFile(appPath, "utf8");
const tappe = new Function(`return ${extractLiteral(source, "const tappe = [")};`)();
let constraints = { tratti: {} };
try {
  constraints = JSON.parse(await readFile(constraintsPath, "utf8"));
} catch (error) {
  if (error.code !== "ENOENT") throw error;
}

const stops = tappe.map((tappa) => ({
  numero: tappa.numero,
  titolo: tappa.titolo,
  point: [tappa.longitudine, tappa.latitudine],
}));

const line = [];
const anchors = [];
const reportRows = [];
const warnings = [];

function push(point) {
  const last = line[line.length - 1];
  const rounded = [round(point[0]), round(point[1])];
  if (!last || last[0] !== rounded[0] || last[1] !== rounded[1]) line.push(rounded);
}

for (let index = 0; index < stops.length; index += 1) {
  const stop = stops[index];
  push(stop.point);
  anchors.push([stop.numero, line.length - 1]);

  const next = stops[index + 1];
  if (!next) break;

  const key = `${stop.numero}-${next.numero}`;
  const via = (constraints.tratti?.[key]?.via || []).map(([lat, lon]) => [lon, lat]);
  const data = await routeLeg([stop.point, ...via, next.point]);
  const route = data.routes[0];
  route.geometry.coordinates.forEach(push);

  const streets = [];
  route.legs.flatMap((leg) => leg.steps).forEach((step) => {
    const name = step.name || "senza nome";
    if (step.distance > 0 && streets[streets.length - 1] !== name) streets.push(name);
  });
  const straight = haversine(stop.point, next.point);
  const snapStart = data.waypoints[0].distance;
  const snapEnd = data.waypoints[data.waypoints.length - 1].distance;
  reportRows.push(
    `| ${key} | ${Math.round(route.distance)} m | ${Math.round(straight)} m | ${via.length} | ${streets.join(" → ")} |`,
  );
  if (straight > 30 && route.distance / straight > DETOUR_WARNING_RATIO) {
    warnings.push(`Tratto ${key}: percorso ${Math.round(route.distance)} m contro ${Math.round(straight)} m in linea d'aria. Controllare se serve un vincolo "via".`);
  }
  [[stop, snapStart], [next, snapEnd]].forEach(([target, snap]) => {
    if (snap > SNAP_WARNING_METERS) {
      warnings.push(`Tappa ${target.numero} (${target.titolo}): marker a ${Math.round(snap)} m dalla strada più vicina. Verificare coordinate o accesso.`);
    }
  });
}

const totalMeters = line.slice(1).reduce((sum, point, index) => sum + haversine(line[index], point), 0);
const geojson = {
  type: "FeatureCollection",
  features: [
    {
      type: "Feature",
      properties: {
        name: "Tracciato pedonale generato da OSM",
        router: ROUTER,
        generato: new Date().toISOString(),
      },
      geometry: { type: "LineString", coordinates: line },
    },
  ],
};

const uniqueWarnings = [...new Set(warnings)];
const report = [
  "# Report tracciato",
  "",
  `Generato il ${new Date().toISOString().slice(0, 16).replace("T", " ")} UTC con \`scripts/genera-tracciato.mjs\` (router: ${ROUTER}).`,
  `Lunghezza totale: ${Math.round(totalMeters)} m, ${line.length} punti, ${stops.length} tappe.`,
  "",
  "| Tratto | Percorso | Linea d'aria | Vincoli via | Strade |",
  "| --- | --- | --- | --- | --- |",
  ...reportRows,
  "",
  "## Avvisi",
  "",
  ...(uniqueWarnings.length ? uniqueWarnings.map((warning) => `- ${warning}`) : ["- Nessuno."]),
  "",
  "Il marker di ogni tappa è un vertice del tracciato: il breve raccordo tra strada e marker è la distanza indicata negli avvisi quando supera 15 m.",
  "",
].join("\n");

await mkdir(path.dirname(geojsonPath), { recursive: true });
await writeFile(geojsonPath, `${JSON.stringify(geojson, null, 2)}\n`);
await writeFile(reportPath, report);

if (!dryRun) {
  const routeStart = source.indexOf("const routeGeoJson = {");
  const anchorsStart = source.indexOf("const ROUTE_STOP_ANCHORS = new Map(");
  const anchorsEnd = source.indexOf(");", anchorsStart) + 2;
  if (routeStart < 0 || anchorsStart < routeStart) {
    throw new Error("app.js: routeGeoJson deve precedere ROUTE_STOP_ANCHORS");
  }
  const block = [
    "// Generato da scripts/genera-tracciato.mjs: non modificare a mano.",
    "// Correzioni in data/tracciato-vincoli.json, esito in data/tracciato-report.md.",
    `const routeGeoJson = ${JSON.stringify(geojson)};`,
    "",
    `const ROUTE_STOP_ANCHORS = new Map(${JSON.stringify(anchors)});`,
  ].join("\n");
  const commentStart = source.lastIndexOf("// Generato da scripts/genera-tracciato.mjs", routeStart);
  const blockStart = commentStart >= 0 && routeStart - commentStart < 200 ? commentStart : routeStart;
  await writeFile(appPath, source.slice(0, blockStart) + block + source.slice(anchorsEnd));
}

console.log(report);
console.log(dryRun ? "Dry run: app.js non modificato." : "app.js aggiornato.");
