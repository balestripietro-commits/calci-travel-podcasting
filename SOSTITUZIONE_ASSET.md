# Sostituzione degli asset di Calci

Mantenere i nomi e i percorsi sotto indicati permette di cambiare i file senza toccare il codice.

## Maschere di Padre Gherardo

Percorso `assets/mascotte-mouth/`: `mascotte_A.webp`, `mascotte_B.webp`, `mascotte_C.webp`, `mascotte_D.webp`, `mascotte_E.webp`, `mascotte_F.webp`, `mascotte_G.webp`, `mascotte_H.webp`, `mascotte_X.webp`. L’immagine statica è `mascotte_calci.webp`. Al momento maschere e posa sono quelle temporanee usate dal sito di Vicopisano. Alla consegna di Padre Gherardo, sostituire i nove frame e la posa mantenendo i percorsi; rigenerare i cue se cambia anche l’audio.

## Fotografie

File correnti: `tappa_1_certosa.webp` … `tappa_7_monte_serra.webp` nella radice, da `GTM/Trattative/Calci/Produzione/Foto tappe` (Drive). Per sostituirne una: webp lato lungo 1000 px qualità 82 (`cwebp -q 82 -resize 1000 0`), stesso nome, nuovo `?v=` in `STOP_ARTWORKS` di `app.js`. Nessun credito in pagina: le foto sono di progetto, tranne la tappa 6 (vedi `REGISTRO_PROGETTO.md`).

## Audio e allineamenti

Il nome base dei file in `audio/it/` corrisponde a quelli in `audio/transcripts/`, `audio/subtitles/` e `audio/cues/`. `audio/it/final_outro.mp3` conserva l’originale della traccia finale; nel percorso è accodato alla tappa 7.

Per aggiornare una tappa, sostituire il relativo MP3 e rigenerare soltanto trascrizione JSON, SRT e Rhubarb JSON con lo stesso nome base. Per la tappa 7, allineare il master completo con l’audio finale accodato. Tutte le trascrizioni automatiche richiedono revisione umana prima della pubblicazione.

### Rigenerazione tecnica

Da una WAV italiana revisionata, Whisper produce la bozza con parole temporizzate:

```sh
whisper "master.wav" --model large-v3-turbo --language Italian --task transcribe --word_timestamps True --output_format json --output_dir /tmp/calci-whisper
```

I cue si rigenerano con Rhubarb 1.14 e tutte le forme labiali usate dal sito:

```sh
rhubarb -r phonetic -f json --extendedShapes GHX "master.wav" -o "audio/cues/NOME_TRACCIA.json"
```

Per la tappa 7, creare prima il master completo concatenando WAV della tappa e `audio/it/final_outro.mp3`; usare lo stesso master per Whisper e Rhubarb. I nomi dei JSON di trascrizione e degli SRT seguono `NOME_TRACCIA_it`.

