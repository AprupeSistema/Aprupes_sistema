# Aprūpes sistēma

Bezmaksas sociālās aprūpes dokumentēšanas sistēma, kas strādā ar Google Sheets kā datubāzi un GitHub Pages kā programmas ekrānu.

## Arhitektūra

```
GitHub Pages (HTML/CSS/JS)  →  Google Apps Script  →  Google Sheets
         ↑                                                  ↓
         └──────── Lokālais IndexedDB kešs ←────────────── ┘
```

- **Klienta puse**: Pārlūkprogramma ar IndexedDB kešu
- **Serveris**: Google Apps Script (slēpta datu vārteja)
- **Datu bāze**: Google Sheets ar 8 loģiskām lapām

## Lapas

- `index.html` - PIN autorizācija
- `aprupe.html` - Aprūpētāja sākumlapa (klientu kartītes + meklēšana)
- `aprupetajs.html` - Konkrēta klienta aprūpes forma
- `control.html` - Kontroliera panelis (statistika, vēsture, Excel eksports)
- `admin.html` - Administratora panelis (klienti, darbinieki, iestatījumi)

## Datu struktūra (Google Sheets)

- `darbinieki` - lietotāji, lomas, PIN
- `klienti` - klientu pamatdati
- `atzimes` - aktuālās vērtības (pašreizējais stāvoklis)
- `atzimes_log` - nemaināma visu izmaiņu vēsture
- `dienas_ierakti` - dienas pabeigšanas statuss
- `sessions` - aktīvās sesijas
- `uzdevomi` - papildu uzdevumi
- `pamaciba` - lauku skaidrojumi

## Konfigurācija

1. Atvērt `js/config.js` un iestatīt:
   ```js
   GAS_URL: 'https://script.google.com/macros/s/JŪSU_DEPLOYMENT/exec'
   ```

2. Google Apps Script backend (`backend/gas_webhook.gs`) izvietot ar `Deploy as Web App`:
   - Execute as: `Me`
   - Who has access: `Anyone`

3. Google Sheets izveidot ar šīm lapām un aizpildīt kolonnu galvenes atbilstoši `pamaciba` lapai.

## Lokālā izstrāde

```bash
# Instalēt atkarības (XLSX bibliotēka)
npm install

# Palaist lokālu serveri
npm run dev
```

Pēc tam atvērt `http://localhost:3000` pārlūkā.

## Sistēmas principi

- **Vienkāršība**: katra poga dara vienu skaidru darbību
- **Lokāls pirmais**: dati tiek saglabāti ierīcē uzreiz, pēc tam sinhronizēti fonā
- **Bez dublēšanās**: viena poga - viena darbība, viena datu vieta
- **Latviešu valoda**: lietotājam netiek rādīti API, tokeni, tehniski termini
- **Drošība**: PIN autentifikācija, lomas, audita žurnāls
- **MK veidlapa**: Excel eksports saglabā oriģinālo `Aprūpes lapas.xlsx` formatējumu

## Sezonas / Periodi

- **Pilns mēnesis** - izvēlas klientu un mēnesi
- **Slimnīcas periods** - no/līdz konkrētam datumam
- **Pakalpojuma beigas** - līdz pēdējai aprūpes dienai

## Testēšana

```bash
# Pārbaudīt sintakse
node -c js/*.js
```

Pārbaudāmie scenāriji:
- 1 klients un 100+ klienti
- Tukšs dzimšanas datums
- Atkārtots klikšķis
- Vērtības labojums
- Darbs bez interneta
- Interneta atjaunošanās
- Excel eksports

## Licenzes un autortiesības

Šis ir bezmaksas rīks sociālajai aprūpei. Izmantojiet bez maksas.
