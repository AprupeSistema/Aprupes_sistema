# Aprūpes sistēma – projekta instrukcijas

## Sistēmas pārskats

Trīs daļu arhitektūra:
- **GitHub Pages** – programmas ekrāns (HTML/CSS/JS)
- **Google Apps Script** – slēpta datu vārteja
- **Google Sheets** – centrālā datubāze

## Konfigurācija

1. Atvērt `js/config.js` un aizstāt `GAS_URL` ar reālo Google Apps Script Web App URL.
2. Google Apps Script izvietot ar `Deploy as Web App` (`Anyone` piekļuve).
3. Google Sheets izveidot ar 8 lapām: `darbinieki`, `klienti`, `atzimes`, `atzimes_log`, `dienas_ierakti`, `sessions`, `uzdevomi`, `pamaciba`.

## Lappušu kolonnu galvenes

Sheets jāsagatavo pēc `Aprupes_sistema.xlsx` parauga (jau ir repo).

## Testēšana

```bash
# In-memory datu un loģikas testi
node test.js

# Excel eksporta loģikas tests
node test_final.js
```

Testi pārbauda:
- Konfigurācijas ielādi
- DB CRUD (IndexedDB in-memory fallback)
- Klientu meklēšanu un kārtošanu
- Laukuma kartējumus
- Excel šūnu rakstīšanu abām lapām (1-15 un 16-31)

## Sintakses pārbaude

```bash
node -c js/config.js
node -c js/db.js
node -c js/sync.js
node -c js/login.js
node -c js/aprupe.js
node -c js/care_form.js
node -c js/control.js
node -c js/admin.js
node -c js/excel_export.js
```

Visiem jāizvada tukšs (bez kļūdām).

## Lokālā izstrāde

```bash
# Vai nu Python HTTP serveris
python -m http.server 8000

# Vai npx http-server
npx http-server -p 8000

# Vai npx serve
npx serve .
```

Pēc tam atvērt `http://localhost:8000`.

## Failu karte

| Fails | Apraksts |
|-------|----------|
| `index.html` | PIN autorizācija |
| `aprupe.html` | Aprūpētāja klientu saraksts |
| `aprupetajs.html` | Klienta aprūpes forma |
| `control.html` | Kontroliera panelis + Excel eksports |
| `admin.html` | Administratora panelis |
| `js/config.js` | Konfigurācija, lauku definīcijas |
| `js/db.js` | IndexedDB datubāze |
| `js/sync.js` | Fona sinhronizācija ar Google Sheets |
| `js/excel_export.js` | Excel eksports (xlsx bibliotēka) |
| `backend/gas_webhook.gs` | Google Apps Script backend |
| `css/*.css` | Stili |
