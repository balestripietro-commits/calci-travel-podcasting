// Controllo dei collegamenti: verifica che ogni file citato dal sito esista nella cartella pubblicata.
// Uso: node scripts/check-links.mjs [cartella]   (predefinita: dist). Esce con errore se manca qualcosa.
import { existsSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";

const root = path.resolve(process.argv[2] || "dist");
// File che ogni sito deve avere; gli altri (lingue aggiuntive, tema) si controllano solo se ci sono.
const required = ["index.html", "app.js", "style.css", "design-system.css", "brand-extras.js", "brand-guide.js"];
const optional = ["languages-extra.js", "multilingual-data.js", "multilingual-extra.js", ...(existsSync(root) ? readdirSync(root).filter((f) => /^theme-.+\.css$/.test(f)) : [])];
const sources = [...required, ...optional.filter((f) => existsSync(path.join(root, f)))];
const refs = new Map();
const add = (file, from) => { const clean = decodeURIComponent(file.split("?")[0].split("#")[0]); if (clean && !refs.has(clean)) refs.set(clean, from); };

for (const name of sources) {
  const full = path.join(root, name);
  if (!existsSync(full)) { add(name, "elenco dei file"); continue; }
  const text = readFileSync(full, "utf8");
  // percorsi di audio, trascrizioni, cue, immagini e pagine
  for (const m of text.matchAll(/(?:audio|assets|condivisione|tappa)\/[A-Za-z0-9_\-./%]+\.(?:mp3|json|png|webp|jpe?g|svg|html|woff2?)/g)) add(m[0], name);
  // file nella radice citati dall'HTML e dal CSS
  if (name === "index.html") for (const m of text.matchAll(/(?:src|href)="([^":#]+\.(?:js|css|webp|png|jpe?g|svg|ico))(?:\?[^"]*)?"/g)) add(m[1], name);
  if (name === "app.js") for (const m of text.matchAll(/"((?:tappa_\d+_[a-z_0-9]+|logo_[a-z_]+|mascotte_[a-z_]+)\.(?:webp|png|jpe?g))"/g)) add(m[1], name);
}
// numero delle tappe, letto da app.js (il sito può averne un numero qualsiasi)
const appText = existsSync(path.join(root, "app.js")) ? readFileSync(path.join(root, "app.js"), "utf8") : "";
const stops = [...new Set([...appText.matchAll(/["']?numero["']?\s*:\s*(\d+)/g)].map((m) => Number(m[1])))].sort((a, b) => a - b);
// un'icona di blocco schermo per ogni tappa; pagina e immagine di condivisione solo se il sito le ha
const hasShare = existsSync(path.join(root, "tappa")) || existsSync(path.join(root, "condivisione"));
for (const n of stops) { add(`assets/lock/tappa-${n}.png`, "tappe"); if (hasShare) { add(`tappa/${n}/index.html`, "tappe"); add(`condivisione/tappa-${n}.png`, "tappe"); } }
// per ogni audio, trascrizione e cue corrispondenti
for (const file of [...refs.keys()]) {
  const m = file.match(/^audio\/([a-z]{2})\/(\d\d_[a-z_]+?)(?:_([a-z]{2}))?\.mp3$/);
  if (!m) continue;
  const [, lang, base, suffix] = m;
  add(`audio/transcripts/${base}_${lang}.json`, file);
  add(`audio/cues/${base}${suffix ? "_" + suffix : ""}.json`, file);
}
const missing = [...refs].filter(([file]) => !existsSync(path.join(root, file)));
console.log(`Controllo collegamenti: ${refs.size} file citati, ${missing.length} mancanti (${root}).`);
for (const [file, from] of missing) console.log(`  MANCA  ${file}   (citato in ${from})`);
process.exit(missing.length ? 1 : 0);
