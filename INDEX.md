# Indice — Travel Podcasting Calci

## Repository e collaborazione
- Repo GitHub privata: [calci-travel-podcasting](https://github.com/balestripietro-commits/calci-travel-podcasting), branch `main`.
- Iacopo aggiunto da Pietro come collaboratore il 2026-10-19; invito in attesa di accettazione.
- Netlify non configurato; il sito non è pubblicato.

## Sito
- `index.html` — interfaccia italiana.
- `app.js` — sette tappe, mappa, player, lingue e sincronizzazione.
- `style.css`, `design-system.css`, `theme-calci.css` — layout, core condiviso e tema Calci.
- `build-static.mjs`, `dev-server.mjs` — build e anteprima locale.

## Contenuti e media
- `data/tappe.json` — dati e provenienza delle sette tappe.
- `audio/it/` — sette tracce, intermezzo e originale dell’audio finale.
- `audio/transcripts/` — trascrizioni sincronizzate, bozza automatica.
- `audio/subtitles/` — sottotitoli SRT, bozza automatica.
- `audio/cues/` — cue labiali Rhubarb.
- `tappa_N_<nome>.webp` (radice) — foto delle tappe 1–7 caricate da Iacopo il 31/10/2026, collegate in `STOP_ARTWORKS` di `app.js`. `assets/stops/` contiene le foto provvisorie precedenti, non più usate.
- `scripts/genera-tracciato.mjs` — genera il tracciato pedonale OSM (`npm run tracciato`); vincoli in `data/tracciato-vincoli.json`, esito in `data/tracciato-report.md` e `data/tracciato.geojson`.
- `assets/mascotte-mouth/` — maschere temporanee della mascotte.
- `SOSTITUZIONE_ASSET.md` — procedura di aggiornamento dei file.
- `ASSET_E_FONTI.md` — materiali, crediti e palette.
- `REGISTRO_PROGETTO.md` — decisioni, fonti, verifiche e punti da confermare.

## Direzione concordata
- Solo italiano attivo; altre lingue mostrate ma bloccate.
- Contenuti reali sulle tappe; lorem ipsum in presentazione e sezioni editoriali.
- Blu Calci, superfici crema, oro per i controlli e viola Travel Podcasting per i numeri.
- Coordinate non confermate restano indicate come proposte o indicative. Il tracciato si genera solo con lo script, mai a mano.

- Sportello email opzionale (primo passo dell'onboarding, prima della scelta lingua): montato il 23/10/2026 ma spento (`EMAIL_GATE_ENABLED = false` in `app.js`). Riattivazione, destinazione (Foglio Google tramite `apps-script/raccolta-email.gs`) e prerequisiti (consenso e informativa del Comune) sono nel playbook dei siti comunali. Test: `tests/e2e/email-step.spec.mjs`.
