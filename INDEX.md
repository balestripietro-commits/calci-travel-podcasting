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
- `assets/stops/` — fotografie fornite per le tappe.
- `assets/mascotte-mouth/` — maschere temporanee della mascotte.
- `SOSTITUZIONE_ASSET.md` — procedura di aggiornamento dei file.
- `ASSET_E_FONTI.md` — materiali, crediti e palette.
- `REGISTRO_PROGETTO.md` — decisioni, fonti, verifiche e punti da confermare.

## Direzione concordata
- Solo italiano attivo; altre lingue mostrate ma bloccate.
- Contenuti reali sulle tappe; lorem ipsum in presentazione e sezioni editoriali.
- Blu Calci, superfici crema, oro per i controlli e viola Travel Podcasting per i numeri.
- Coordinate/tracciato non confermati restano indicati come proposti o indicativi.

- Sportello email opzionale (primo passo dell'onboarding, prima della scelta lingua): montato il 23/10/2026 ma spento (`EMAIL_GATE_ENABLED = false` in `app.js`). Riattivazione, destinazione (Foglio Google tramite `apps-script/raccolta-email.gs`) e prerequisiti (consenso e informativa del Comune) sono nel playbook dei siti comunali. Test: `tests/e2e/email-step.spec.mjs`.
