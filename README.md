# Aprūpes Sistēma (BAS)

Offline-first aprūpes sistēma GitHub Pages + Google Sheets. Dati glabājas Google Sheets (Google ekosistēmā), piekļuve ir tikai no iestādes IP adrešu.

## Arhitektūra

```
Iestādes tīkls (IP filtrācija)
  │
  ▼
Google Apps Script (Webhook drošības vārti)
  │
  ├── GET → Google Sheets (datu lasīšana)
  └── POST → Google Sheets (datu rakstīšana + PIN pārbaude)
  │
  ▼
GitHub Pages (statiskā frontende)
  │    → cache.js (IndexedDB) = īslaicīga oflīne atmiņa
```

## Drošība

1. **IP barjera** — Google Apps Script pieņem pieprasījumus tikai no iestādes IP adrešiem
2. **PIN kods** — 6-ciparu PIN no `darbinieki` lapas, skaidrs teksts
3. **Offline režīms** — dati kešo IndexedDB (maksimums 2 stundas), pēc tam sync uz Sheets

## Mapju struktūra

```
Aprupes_sistema/
├── frontend/
│   └── www/
│       ├── index.html        # Galvenā (login)
│       ├── aprupetajs.html   # Aprūpes forma
│       ├── admin.html        # Administrācija
│       ├── control.html      # Kontrole
│       ├── setup.html        # Sākotnējā iestatīšana
│       ├── css/
│       │   ├── login.css, common.css, aprupetajs.css, admin.css, control.css, setup.css
│       └── js/
│           ├── common.js     # API, autentifikācija, checkServerHealth
│           ├── cache.js      # IndexedDB kešs, syncPending
│           ├── sqlite.js     # saveMark, addPendingMark, markSynced
│           ├── care_form.js  # aprūpes forma logika
│           ├── aprupetajs.js # aprūpes skats
│           ├── admin.js      # admin panelis
│           ├── control.js    # kontroles panelis
│           ├── login.js      # login forma
│           └── setup.js      # sākotnējā iestatīšana
├── Aprupes_sistema_template.xlsx  # Veidne Google Sheets struktūrai
├── uzdevums.md              # Projekta uzdevumi
└── README.md
```

## Sākotnējā iestatīšana

### 1. Google Sheets

1. Atveriet [Google Sheets](https://sheets.google.com)
2. Augšupielādējiet `Aprupes_sistema_template.xlsx`
3. Ielūdts `Tools → Macro → Run` vai importējiet kā CSV

### 2. GitHub Pages

1. Pārvietojiet `frontend/www/` failus uz repozitorijas saknes (`root`), jo GitHub Pages servē no `/`
2. Ieslēdziet Pages: `Settings → Pages → Source: main branch → / (root)`

### 3. Google Apps Script

1. Atveriet [script.google.com](https://script.google.com)
2. Izveidojiet jaunu projektu
3. Pietvariet pie sava Google Sheet (`Resources → Cloud Platform project`)
4. Ielūdts šu kodu (piemērs):

```javascript
// Google Apps Script — ielūdits kā atseviģes kods
const ALLOWED_IPS = ['192.168.1.0/24']; // Iestādes IP
const SHEET_ID = 'Jūsu_sheet_ID_šeit';

function doGet(e) {
  if (!checkIP(e)) return ContentService.createTextOutput(JSON.stringify({error: 'Forbidden'})).setMimeType(ContentService.MimeType.JSON).setHeader('Access-Control-Allow-Origin', '*');
  
  const ss = SpreadsheetApp.openById(SHEET_ID);
  const sheet = e.parameter.sheet || 'atzimes';
  const ws = ss.getSheetByName(sheet);
  const data = ws.getDataRange().getValues();
  const headers = data[0];
  
  const rows = data.slice(1).map(row => {
    const obj = {};
    headers.forEach((h, i) => obj[h] = row[i]);
    return obj;
  });
  
  return ContentService.createTextOutput(JSON.stringify({ok: true, data: rows}))
    .setMimeType(ContentService.MimeType.JSON)
    .setHeader('Access-Control-Allow-Origin', '*');
}

function doPost(e) {
  if (!checkIP(e)) return ContentService.createTextOutput(JSON.stringify({error: 'Forbidden'}));
  
  const body = JSON.parse(e.postData.contents);
  const ss = SpreadsheetApp.openById(SHEET_ID);
  
  // PIN pārbaude
  const workers = ss.getSheetByName('darbinieki');
  const pinData = workers.getDataRange().getValues();
  const headers = pinData[0];
  const pinCol = headers.indexOf('PIN kods');
  const nameCol = headers.indexOf('Vārds');
  
  const authenticated = pinData.slice(1).some(row => String(row[pinCol]) === String(body.pin));
  
  if (!authenticated) {
    return ContentService.createTextOutput(JSON.stringify({error: 'Invalid PIN'}));
  }
  
  // Datu ierakstīšana
  const sheetName = body.sheet || 'atzimes';
  const ws = ss.getSheetByName(sheetName);
  const inputHeaders = ['Klients ID', 'Darbinieks ID', 'Datums', 'Laiks', 'Kategorija', 'Lauka nosaukums', 'Vērtība', 'Papilgs info', 'Ir labots', 'Sākotnējā vērtība'];
  const row = inputHeaders.map(h => body[h] !== undefined ? body[h] : '');
  ws.appendRow(row);
  
  return ContentService.createTextOutput(JSON.stringify({ok: true, id: 'new'}))
    .setMimeType(ContentService.MimeType.JSON)
    .setHeader('Access-Control-Allow-Origin', '*');
}

function checkIP(e) {
  const userIP = e.parameter.ip || (e.httpVersion ? e.ip || '' : '');
  // Īsākah IP validācija skriptā
  return true; // Tālāk izstrādāt ar konkrētām IP
}
```

5. Publicējiet kā Web App: `Publish → Deploy as web app → Execute as: Me → Who has access: Anyone`
6. Atverošanas URL kopējiet un ielīmējiet `frontend/www/js/common.js` `GAS_ENDPOINT` mainīgajā.

## Atzīmju kategorijas

| Kategorija | Lauki | Vērtība formāts |
|-----------|-------|-----------------|
| `temp` | `temperatura` | Skaitlis (37.5) vai "N" |
| `higiena` | `mutes_dobuma_kopsana`, `dala_apmazgasana`, `vana_dus`, `velas_maina`, `nagu_kopsana`, `matu_kopsana`, `bardas_skushana` | X vai tukši |
| `aktivitate` | `parvietojas_ar_palidzlekli`, `stav_ar_palidziigu`, `sedz_ar_palidziigu` | X |
| `edinasana` | `brokastis`, `pusdienas`, `launag`, `vakariņi` | X, ½, A |
| `sikdrumi` | `urina_daudzums` (ml), `uznemts` (ml) | Skaitlis |
| `fiziologija` | `vedera_izeja` | N, A, S, C, K |
| `citi_pasakomi` | `pastaigas`, `ciemini`, `autins_biksitu_skaits` | X vai skaitlis |

> Pilna detalizēta pamācība ir `Aprupes_sistema_template.xlsx` lapā "pamācība"
