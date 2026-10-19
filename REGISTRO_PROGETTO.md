# Registro progetto — Calci

## Stato e perimetro

- Stato: prototipo locale in italiano, pronto per revisione con il Comune.
- Obiettivo: ripartire dal sito completo di Vicopisano, mantenendone impianto e interazioni; sostituire identità, tappe, copy, audio e colori di Calci.
- Pubblico previsto: confronto con Pietro e amministrazione comunale; nessuna pubblicazione o deploy eseguito.
- Lingua: italiano attivo; le altre lingue restano visibili ma non selezionabili.
- Testi: reali sulle sette tappe; lorem ipsum in presentazione e sezioni editoriali generiche.
- Voce narrativa: Padre Gherardo, dai materiali di progetto. Mascotte Brunelleschi temporanea per ora, in attesa dei nuovi frame.

## Repository, workspace e pubblicazione

- Master locale: `/Users/pietrobalestri/LocalDev/Travel podcasting/github-sites/Calci`.
- Sito di riferimento: `/Users/pietrobalestri/LocalDev/Travel podcasting/github-sites/Vicopisano`.
- Cartella di origine del DOCX e dei media: `/Users/pietrobalestri/Library/CloudStorage/GoogleDrive-balestripietro@gmail.com/My Drive/Imprendiamo/Travel podcasting/Delivering/Calci/`.
- Repo GitHub dedicata, URL pubblico e Netlify: non creati/configurati; da decidere in seguito.
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
| 3 | Ponte sulla Zambra | 43.725596, 10.513961 | Definitive nel documento; percorso verso la Pieve da controllare |
| 4 | Pieve dei Santi Giovanni ed Ermolao | 43.726188, 10.512938 | Definitive nel documento; Comune da validare |
| 5 | Palazzo Comunale | 43.725750, 10.515601 | Definitive nel documento; Comune da validare |
| 6 | Piazza Garibaldi | 43.725658, 10.515502 | Definitive nel documento; Comune da validare |
| 7 | Monte Serra | 43.725700, 10.515900 | Parco Sandro Pertini proposto; punto e coordinate da confermare |

Il tracciato in mappa resta informativo e indicativo. Non presentare i punti 1 e 7 come confermati. Mancano foto approvate alle tappe 2, 3 e 7; diritti/crediti delle foto 4, 5 e 6 vanno verificati.

## Audio, trascrizioni e QA

- WAV master e copioni: Drive `Delivering/Calci/Audio Demo/` e `Travel Podcasting Calci.docx`.
- Elaborazione: MP3 runtime, JSON di trascrizione con segmenti e parole, SRT italiani e cue labiali Rhubarb.
- Controlli eseguiti: `node --check app.js`; build `npm run build`; parsing HTML e JSON; tutti i 7 marker rilevati nel browser; audio tappa 1 riprodotto; sottotitoli sincronizzati visibili; lingue diverse da IT non attivabili; viewport 390×844 senza overflow orizzontale.
- Limiti: trascrizioni e cue automatici non revisionati con ascolto completo; non eseguita suite E2E con Playwright; foto 4–6 e coordinate richiedono approvazione.
- Prima del rilascio: revisione editoriale/audio, verifica crediti e diritti, conferma tappe/coordinate con il Comune, controllo con Padre Gherardo e maschere finali.
