# Ricerca foto etichette OLO – LUCE

Questa cartella contiene una webapp indipendente che permette di inserire un codice OLO e visualizzare la foto archiviata.

## 1. Aggiornare Apps Script

Nel progetto Apps Script già utilizzato per il caricamento delle foto:

1. sostituire tutto il contenuto di `Code.gs` con il file `AppsScript-Foto-OLO-COMPLETO.gs`;
2. salvare;
3. aprire **Distribuisci → Gestisci distribuzioni**;
4. modificare la distribuzione esistente;
5. scegliere **Nuova versione**;
6. lasciare:
   - Esegui come: **Me**
   - Chi può accedere: **Chiunque**
7. distribuire.

Il collegamento `/exec` rimane normalmente lo stesso:

https://script.google.com/macros/s/AKfycbyrwXd4aVDVoKZyg01VwCTiEGrOCisxmhDuixuhofUjRBEjvmgoFFeuDvnh-s4B5C-4/exec

## 2. Pubblicare la webapp

Caricare `index.html` e `logo-luce.png` in una cartella o repository GitHub Pages.

La pagina è già configurata con il collegamento Apps Script indicato sopra.

## Sicurezza

La cartella Drive può restare privata. La foto viene letta dallo script usando i permessi del proprietario e trasmessa alla pagina soltanto quando viene trovato il codice OLO.
