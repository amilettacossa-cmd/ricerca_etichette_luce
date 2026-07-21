const SHEET_NAME = 'Foto etichette OLO';
const DRIVE_FOLDER_ID = '1dKTLH3o1jgcxMHRQoF4t8zqTkON0dq-F';

const DIPENDENTI = [
  'Alfredo Miletta Cossa',
  'Stefano Bitetto',
  'Simone Miletta Cossa',
  'Nicolò Fiore',
  'Alessandro Finotti',
  'Luca Di Marco',
  'Marco Miletta Cossa',
  'Christian Fichera',
  'Federico Merolla',
  'Andrea Pesenti',
  'Danilo Quattrocchi',
  'Gabriele Spinelli',
  'Federico Bonardi'
];

/**
 * GET:
 * - senza parametri: verifica che il servizio sia operativo
 * - ?action=search&olo=CODICE: cerca il codice e restituisce la foto
 */
function doGet(e) {
  try {
    const action = String((e && e.parameter && e.parameter.action) || '').trim();
    const codiceOlo = normalizzaCodice(
      e && e.parameter ? e.parameter.olo : ''
    );

    if (action !== 'search' && !codiceOlo) {
      return rispostaJson({
        success: true,
        service: 'LUCE Foto Etichette OLO',
        status: 'operativo'
      });
    }

    if (!codiceOlo || codiceOlo.length < 3) {
      return rispostaJson({
        success: false,
        message: 'Codice OLO non valido'
      });
    }

    const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
    const foglio = spreadsheet.getSheetByName(SHEET_NAME);

    if (!foglio) {
      throw new Error('Foglio "' + SHEET_NAME + '" non trovato');
    }

    const ultimaRiga = foglio.getLastRow();

    if (ultimaRiga < 2) {
      return rispostaJson({
        success: false,
        message: 'Nessuna etichetta trovata per questo codice OLO'
      });
    }

    // Legge le colonne A-F.
    const righe = foglio
      .getRange(2, 1, ultimaRiga - 1, 6)
      .getDisplayValues();

    const indice = righe.findIndex(function (riga) {
      return normalizzaCodice(riga[2]) === codiceOlo;
    });

    if (indice === -1) {
      return rispostaJson({
        success: false,
        message: 'Nessuna etichetta trovata per il codice OLO ' + codiceOlo
      });
    }

    const rigaTrovata = righe[indice];
    const nomeFile = String(rigaTrovata[4] || codiceOlo + '.jpg').trim();

    const cartella = DriveApp.getFolderById(DRIVE_FOLDER_ID);
    let files = cartella.getFilesByName(nomeFile);
    let file = files.hasNext() ? files.next() : null;

    // Recupero alternativo, utile se il nome del file è stato modificato.
    if (!file) {
      files = cartella.getFilesByName(codiceOlo + '.jpg');
      file = files.hasNext() ? files.next() : null;
    }

    if (!file) {
      throw new Error(
        'Il codice è presente nel foglio, ma la foto non è stata trovata nella cartella Drive'
      );
    }

    const blob = file.getBlob();
    const mimeType = blob.getContentType() || 'image/jpeg';
    const imageBase64 = Utilities.base64Encode(blob.getBytes());

    return rispostaJson({
      success: true,
      oloCode: codiceOlo,
      date: rigaTrovata[0],
      employee: rigaTrovata[1],
      fileName: file.getName(),
      imageDataUrl: 'data:' + mimeType + ';base64,' + imageBase64
    });

  } catch (errore) {
    return rispostaJson({
      success: false,
      message: errore && errore.message
        ? errore.message
        : 'Errore durante la ricerca'
    });
  }
}

/**
 * POST: mantiene il caricamento già esistente.
 */
function doPost(e) {
  const lock = LockService.getScriptLock();

  try {
    lock.waitLock(30000);

    const contenuto = e && e.postData ? e.postData.contents : '{}';
    const data = JSON.parse(contenuto);

    const tecnico = String(data.employee || '').trim();
    const codiceOlo = normalizzaCodice(data.oloCode);
    const immagineBase64 = String(data.imageBase64 || '');
    const mimeType = String(data.mimeType || 'image/jpeg');

    if (!DIPENDENTI.includes(tecnico)) {
      throw new Error('Tecnico non valido');
    }

    if (!codiceOlo || codiceOlo.length < 3) {
      throw new Error('Codice OLO non valido');
    }

    if (!immagineBase64) {
      throw new Error('Foto mancante');
    }

    const formatiConsentiti = ['image/jpeg', 'image/png', 'image/webp'];

    if (!formatiConsentiti.includes(mimeType)) {
      throw new Error('Formato immagine non consentito');
    }

    const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
    const foglio = spreadsheet.getSheetByName(SHEET_NAME);

    if (!foglio) {
      throw new Error('Foglio "' + SHEET_NAME + '" non trovato');
    }

    const ultimaRiga = foglio.getLastRow();

    if (ultimaRiga >= 2) {
      const codiciEsistenti = foglio
        .getRange(2, 3, ultimaRiga - 1, 1)
        .getDisplayValues()
        .flat();

      const indiceDuplicato = codiciEsistenti.findIndex(function (codiceEsistente) {
        return normalizzaCodice(codiceEsistente) === codiceOlo;
      });

      if (indiceDuplicato !== -1) {
        const numeroRiga = indiceDuplicato + 2;
        const datiEsistenti = foglio
          .getRange(numeroRiga, 1, 1, 3)
          .getDisplayValues()[0];

        return rispostaJson({
          success: false,
          duplicate: true,
          date: datiEsistenti[0],
          employee: datiEsistenti[1],
          oloCode: datiEsistenti[2],
          message: 'Esiste già una foto caricata per questo codice OLO'
        });
      }
    }

    const cartella = DriveApp.getFolderById(DRIVE_FOLDER_ID);
    const bytes = Utilities.base64Decode(immagineBase64);
    const nomeFile = codiceOlo + '.jpg';
    const blob = Utilities.newBlob(bytes, 'image/jpeg', nomeFile);
    const file = cartella.createFile(blob);
    const urlFile = file.getUrl();

    foglio.appendRow([
      new Date(),
      tecnico,
      codiceOlo,
      'Sì',
      nomeFile,
      ''
    ]);

    const nuovaRiga = foglio.getLastRow();

    foglio
      .getRange(nuovaRiga, 6)
      .setFormula('=HYPERLINK("' + urlFile + '";"Apri foto")');

    foglio
      .getRange(nuovaRiga, 1)
      .setNumberFormat('dd/MM/yyyy HH:mm');

    return rispostaJson({
      success: true,
      duplicate: false,
      fileName: nomeFile,
      fileUrl: urlFile,
      message: 'Caricamento effettuato. Grazie!'
    });

  } catch (errore) {
    return rispostaJson({
      success: false,
      duplicate: false,
      message: errore && errore.message
        ? errore.message
        : 'Errore sconosciuto'
    });

  } finally {
    try {
      lock.releaseLock();
    } catch (erroreLock) {
      // Nessuna operazione necessaria.
    }
  }
}

function normalizzaCodice(valore) {
  return String(valore || '')
    .trim()
    .toUpperCase()
    .replace(/\s+/g, '');
}

function rispostaJson(dati) {
  return ContentService
    .createTextOutput(JSON.stringify(dati))
    .setMimeType(ContentService.MimeType.JSON);
}
