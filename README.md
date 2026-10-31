# Travel Podcasting — Calci

Anteprima locale in italiano del sito di Calci, basata sulla struttura e sulle interazioni del sito di Vicopisano. Repo GitHub privata: [calci-travel-podcasting](https://github.com/balestripietro-commits/calci-travel-podcasting). Iacopo è stato aggiunto da Pietro come collaboratore il 2026-10-19; invito in attesa di accettazione. Netlify non è configurato.

## Stato

- Sette tappe, coordinate, descrizioni e copioni italiani dai materiali di progetto caricati da Iacopo.
- Audio italiano delle tappe, intermezzo e audio finale accodato all’audio della tappa 7.
- Le altre lingue restano visibili ma non attivabili; il sito apre sempre in italiano.
- Palette Calci blu, crema e oro; numerazione viola Travel Podcasting.
- Mascotte e maschere di Brunelleschi temporanee; modalità di sostituzione in `SOSTITUZIONE_ASSET.md`.
- Trascrizioni, sottotitoli e cue labiali automatici da revisionare prima della pubblicazione.
- Controllo del 29 ottobre 2026 sugli MP3 italiani: i tempi dei sottotitoli coincidono con le parole pronunciate (scarto mediano 0,02 s su tutte le tracce). I cue Rhubarb sono già centrati sul parlato (la bocca si apre circa 70 ms prima della voce e si chiude circa 60 ms dopo, su 185 attacchi di frase), quindi l'anticipo aggiuntivo del sito (`MASCOT_LIP_SYNC_LEAD_SECONDS`) è stato portato da 80 a 0 ms.
- Le foto e i crediti da verificare sono indicati in `data/tappe.json`; le tappe senza foto approvata mostrano un riquadro neutro.
- Percorso e coordinate 1 e 7 indicativi/proposti, da confermare con il Comune.
- Tracciato aggiornato il 31 ottobre 2026 dopo il sopralluogo di Iacopo: la mappa disegna il percorso pedonale sulle strade reali (OpenStreetMap) invece delle linee dritte tra le tappe. 1→2 lungo via Roma (circa 730 m); 2→3 via Roma, Le Gemelle, Piazza Cavallotti, via Poggio della Propositura e ponticello sulla Zambra; 3→4 verso la Pieve; 4→5 via Roma, ponte e passaggio nel parco lungo la Zambra fino a Piazza Garibaldi. Il pulsante Google Maps passa dagli stessi punti per le tappe 3 e 5. Tappa 2 non spostata: Iacopo aveva proposto di metterla a metà di via Roma, punto esatto da concordare.

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
