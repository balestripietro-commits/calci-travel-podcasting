// Google Apps Script: riceve le email dallo sportello del sito e le aggiunge al Foglio Google.
// Va incollato nel progetto Apps Script legato al Foglio (Estensioni > Apps Script),
// poi distribuito come "App web": esegui come "Io", accesso "Chiunque".
const NOME_FOGLIO = "Iscrizioni";

function doPost(e) {
  try {
    const dati = JSON.parse(e.postData.contents);
    const email = String(dati.email || "").trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email) || dati.consent !== true) {
      return risposta({ ok: false });
    }
    const foglio = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(NOME_FOGLIO);
    const esistenti = foglio.getLastRow() > 1
      ? foglio.getRange(2, 2, foglio.getLastRow() - 1, 1).getValues().flat()
      : [];
    if (!esistenti.includes(email)) {
      foglio.appendRow([new Date(), email, "sì", dati.language || "", dati.page || ""]);
    }
    return risposta({ ok: true });
  } catch (errore) {
    return risposta({ ok: false });
  }
}

function risposta(oggetto) {
  return ContentService.createTextOutput(JSON.stringify(oggetto)).setMimeType(ContentService.MimeType.JSON);
}
