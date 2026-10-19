# Travel Podcasting — Calci

Anteprima locale in italiano del sito di Calci, basata sulla struttura e sulle interazioni del sito di Vicopisano. Repo GitHub privata: [calci-travel-podcasting](https://github.com/balestripietro-commits/calci-travel-podcasting). Iacopo è stato aggiunto da Pietro come collaboratore il 2026-10-19; invito in attesa di accettazione. Netlify non è configurato.

## Stato

- Sette tappe, coordinate, descrizioni e copioni italiani dai materiali di progetto caricati da Iacopo.
- Audio italiano delle tappe, intermezzo e audio finale accodato all’audio della tappa 7.
- Le altre lingue restano visibili ma non attivabili; il sito apre sempre in italiano.
- Palette Calci blu, crema e oro; numerazione viola Travel Podcasting.
- Mascotte e maschere di Brunelleschi temporanee; modalità di sostituzione in `SOSTITUZIONE_ASSET.md`.
- Trascrizioni, sottotitoli e cue labiali automatici da revisionare prima della pubblicazione.
- Le foto e i crediti da verificare sono indicati in `data/tappe.json`; le tappe senza foto approvata mostrano un riquadro neutro.
- Percorso e coordinate 1 e 7 indicativi/proposti, da confermare con il Comune.

## Avvio locale

```sh
npm run dev
```

Per preparare i file statici: `npm run build`.

## Riferimenti

- `data/tappe.json`: dati, copioni, coordinate e registro fonti/immagini.
- `audio/transcripts/`: trascrizioni italiane sincronizzate.
- `audio/subtitles/`: sottotitoli in formato SRT.
- `audio/cues/`: Rhubarb JSON per le forme della bocca.
- `SOSTITUZIONE_ASSET.md`: sostituzione di audio, immagini e maschere.

Prototipo locale non pubblicato.
