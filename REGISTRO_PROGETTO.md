# Registro progetto — Calci

## Stato e perimetro

- Stato: prototipo in italiano disponibile in locale e su repo GitHub privata; pronto per revisione con il Comune. Iacopo è stato invitato come collaboratore; l’accettazione è in attesa.
- Obiettivo: ripartire dal sito completo di Vicopisano, mantenendone impianto e interazioni; sostituire identità, tappe, copy, audio e colori di Calci.
- Pubblico previsto: confronto con Pietro e amministrazione comunale; nessuna pubblicazione o deploy Netlify eseguito.
- Lingua: italiano attivo; le altre lingue restano visibili ma non selezionabili.
- Testi: reali sulle sette tappe; lorem ipsum in presentazione e sezioni editoriali generiche.
- Voce narrativa: Padre Gherardo, dai materiali di progetto. Mascotte Brunelleschi temporanea per ora, in attesa dei nuovi frame.

## Repository, workspace e pubblicazione

- Master locale: `/Users/pietrobalestri/LocalDev/Travel podcasting/github-sites/Calci`.
- Sito di riferimento: `/Users/pietrobalestri/LocalDev/Travel podcasting/github-sites/Vicopisano`.
- Cartella di origine del DOCX e dei media: `/Users/pietrobalestri/Library/CloudStorage/GoogleDrive-balestripietro@gmail.com/My Drive/Imprendiamo/Travel podcasting/Delivering/Calci/`.
- Repo GitHub: [balestripietro-commits/calci-travel-podcasting](https://github.com/balestripietro-commits/calci-travel-podcasting), privata, branch `main`, creata il 2026-10-19. Il commit iniziale è `4bbde7c`.
- Collaborazione: Pietro ha aggiunto Iacopo Piccaluga e lo ha avvisato di accettare l’invito; stato riportato da Pietro il 2026-10-19, accettazione non ancora confermata. Non pianificare contributi GitHub di Iacopo fino alla conferma dell’accesso.
- Netlify e URL di pubblicazione: non configurati.
- Cartella destinazione del sito: il master locale Calci indicato sopra.

## Decisioni aggiornate al 18/10/2026

| Tema | Decisione | Stato |
|---|---|---|
| Interfaccia | Copiata la struttura e le interazioni del sito completo di Vicopisano; tema colore specifico Calci. | Implementata |
| Palette | Blu scuro/blu, crema e oro; mantenuto il viola Travel Podcasting per numeri e marcatori tappa. | Implementata in `theme-calci.css` |
| Italiano | Avvio sempre in italiano; chips delle altre lingue visibili, ma il click mostra lingua non disponibile. | Implementata |
| Tappe | Sette nomi, coordinate, copioni e testi audio italiani dai materiali Drive caricati da Iacopo. | Implementati |
| Intro/editoriali | Lorem ipsum; mantenere contenuto reale nei blocchi delle tappe. | Implementato |
| Audio | Sette file runtime; intermezzo tra tappe; traccia finale accodata all’audio della tappa 7, con originale finale separato. | Implementato |
| Sottotitoli/trascrizioni | Whisper large-v3-turbo con timestamp parola; JSON sincronizzati e SRT. Bozze da revisionare. | Generati |
| Cue labiali | Rhubarb 1.14 fonetico, GHX, per sette tappe, intermezzo e finale. | Generati |
| Mascotte | Riutilizzare temporaneamente Brunelleschi. Sostituzione drop-in con Padre Gherardo mantenendo i percorsi. | Provvisoria |
| Immagini | Usare solo le foto locali idonee; riquadro neutro per le altre. | Implementato; diritti foto 4–6 da verificare |
| Pubblicazione | Anteprima solo locale; nessun sito esterno pubblicato. | Rispettato |

## Tappe, coordinate e questioni aperte

| # | Nome breve | Coordinate | Stato da conservare |
|---|---|---|---|
| 1 | Certosa Monumentale di Calci | 43.721944, 10.522778 | Indicative nel documento; da validare |
| 2 | Via Roma | 43.725401, 10.515545 | Definitive nel documento; Comune da validare |
| 3 | Ponte sulla Zambra | 43.725596, 10.513961 | Definitive nel documento; il punto coincide con il ponticello pedonale di via Poggio della Propositura |
| 4 | Pieve dei Santi Giovanni ed Ermolao | 43.726188, 10.512938 | Definitive nel documento; Comune da validare |
| 5 | Palazzo Comunale | 43.725750, 10.515601 | Definitive nel documento; Comune da validare |
| 6 | Piazza Garibaldi | 43.725658, 10.515502 | Definitive nel documento; Comune da validare |
| 7 | Monte Serra | 43.725700, 10.515900 | Parco Sandro Pertini proposto; punto e coordinate da confermare |

Il tracciato in mappa resta informativo.

### Tracciato pedonale — aggiornamento 31/10/2026

Sopralluogo di Iacopo a Calci con il sito sul telefono: Google Maps guidava bene, ma la mappa del sito univa le tappe con linee dritte (tra Certosa e tappa 2 sembrava una strada inesistente).

- `routeGeoJson` in `app.js` ora segue la rete pedonale OpenStreetMap (© OpenStreetMap contributors, ODbL), con i passaggi indicati da Iacopo come punti obbligati; `ROUTE_STOP_ANCHORS` indica il vertice di ogni tappa, così il tratto evidenziato in giallo è quello reale tra la tappa precedente e quella attiva.
- 1→2: via Roma dalla Certosa, circa 730 m. 2→3: via Roma, Le Gemelle, Piazza Cavallotti, via Poggio della Propositura, ponticello sulla Zambra (circa 190 m). 3→4: via Poggio della Propositura e Piazza Cairoli fino alla Pieve (circa 120 m). 4→5: via Roma, ponte sulla Zambra, sentiero nel parco fino a Piazza Garibaldi (circa 280 m), invece di ripercorrere la strada dell'andata. 5→6→7: pochi metri in piazza.
- `MAPS_WAYPOINTS_BY_STOP`: il link Google Maps verso la tappa 3 passa da Piazza Cavallotti, quello verso la tappa 5 dal parco.
- Tappa 2 lasciata alle coordinate del documento. Iacopo ha proposto di spostarla a metà di via Roma, senza esserne sicuro: punto esatto da concordare con lui (il copione funziona in entrambi i casi: «alle nostre spalle la Certosa… tra poco la Pieve»).
- Da verificare sul posto: che il passaggio nel parco sia quello proposto da Maps e percorribile negli orari di apertura. Non presentare i punti 1 e 7 come confermati. Mancano foto approvate alle tappe 2, 3 e 7; diritti/crediti delle foto 4, 5 e 6 vanno verificati.

## Audio, trascrizioni e QA

- WAV master e copioni: Drive `Delivering/Calci/Audio Demo/` e `Travel Podcasting Calci.docx`.
- Elaborazione: MP3 runtime, JSON di trascrizione con segmenti e parole, SRT italiani e cue labiali Rhubarb.
- Controlli eseguiti: `node --check app.js`; build `npm run build`; parsing HTML e JSON; tutti i 7 marker rilevati nel browser; audio tappa 1 riprodotto; sottotitoli sincronizzati visibili; lingue diverse da IT non attivabili; viewport 390×844 senza overflow orizzontale.
- Limiti: trascrizioni e cue automatici non revisionati con ascolto completo; non eseguita suite E2E con Playwright; foto 4–6 e coordinate richiedono approvazione.
- Prima del rilascio: revisione editoriale/audio, verifica crediti e diritti, conferma tappe/coordinate con il Comune, controllo con Padre Gherardo e maschere finali.
