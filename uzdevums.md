# Tehniskais Projekts un Izstrādes Plāns:
## "Aprūpes Sistēma" — Offline-First Android aplikācija ar papildu uzdevumiem

---

## 1. Projekta Pārskats

| Īpašība | Apraksts |
|---|---|
| Nosaukums | Aprūpes Sistēma (BAS) |
| Platforma | Android (visas versijas, .apk instalācija bez veikala) |
| Režīms | Offline-First — darbojas bez interneta, sinhronizācija fonā |
| Lietotāji | Divas grupas: **Aprūpētāji** (iekšējais panels), **Vadība** (administrācijas panels) |

---

## 2. Tehnoloģiju Steks

| Komponente | Tehnoloģija |
|---|---|
| Izstrādes vide | Visual Studio Code |
| Android iepakošana | Apache Cordova |
| Frontend | HTML5, CSS3, vanilla JavaScript |
| Lokālā DB | SQLite (Cordova plugins) |
| Backend | Python 3 + Flask |
| Centrālā DB | MySQL (XAMPP pakete) |
| Statistika | Chart.js |
| Autentifikācija | JWT (PyJWT) |

---

## 3. Drošība un Lietotāju Pārvaldība

### 3.1 Lomas

| Loma | Funkcijas | Interfeiss |
|---|---|---|
| **Aprūpētājs** | Izveidot aprūpes atzīmes, skatīt klientus, saņemt papildu uzdevumus | Mobilā aplikācija |
| **Vadība** | Administrācijas panelis: statistika, papildu uzdevumi, klientu un darbinieku pārvaldība | Web pārlūkprogrammā (PC) |

### 3.2 Autentifikācija

| Komponents | Apraksts |
|---|---|
| **PIN kods** | 4 cipari. Katrs darbinieks saņem unikālu PIN, ko viņš neizmanto citos sistēmās. PIN tiek izmantats darbinieka identificēšanai un darbības reģistrācijai. Sesija beidzas pēc 5 minūtēm **neaktivitātes.** Sesijas taimauts ir **izslēgts**, kamēr ir atvērta un aktīvs aprūpes forma. |
| **Vadītāja parole** | Paroles hashēšana ar Werkzeug bibliotēku. Vadība piekļūst ar paroli. |
| **JWT token** | Pēc veiksmīgā login saņem JWT tokenu (24h) |

### 3.3 PIN pārvaldība

- Vadība izveido un pārvalda visus PIN kodus admin panelī.
- Darbinieks neizmanto PIN nekur citur — tas ir vienīgais vietēja sistēmas piekļuves veids.
- Ja PIN ir aizmirsts, vadība to var resetēt jebkurā briljantā.
- Katrs klikšķis tiek fiksēts ar precīzu laika zīmogu un darbinieka ID.

---

## 4. Datubāzes Šķemenas

### 4.A. Centrālā Datubāze (MySQL — uz PC)

```sql
-- 1. Darbinieki (aprūpētāji + vadība)
CREATE TABLE darbinieki (
    id INT AUTO_INCREMENT PRIMARY KEY,
    vards VARCHAR(50) NOT NULL,
    uzvards VARCHAR(50) NOT NULL,
    pin_kods VARCHAR(4) NOT NULL UNIQUE,
    parole_hash VARCHAR(255) NOT NULL,
    loma ENUM('aprupetajs', 'admin') DEFAULT 'aprupetajs',
    is_active TINYINT(1) DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. Klienti (bez personas koda, tikai tie dati, kas vajadzīgi aprūpei)
CREATE TABLE klienti (
    id INT AUTO_INCREMENT PRIMARY KEY,
    vards VARCHAR(50) NOT NULL,
    uzvards VARCHAR(50) NOT NULL,
    dzimšanas_datums DATE NOT NULL,
    dieta VARCHAR(100),
    saskarsmes_ipatnibas VARCHAR(255),
    bilde_url VARCHAR(255),
    status ENUM('aktīvs', 'slimnīcā', 'izrakstīts') DEFAULT 'aktīvs',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- 3. Dienas atzīmes (visi papīra veidlapas lauki kā neatkarīgi rindiņi)
CREATE TABLE dienas_atzimes (
    id INT AUTO_INCREMENT PRIMARY KEY,
    klienta_id INT NOT NULL,
    darbinieka_id INT NOT NULL,
    datums DATE NOT NULL,
    maipas_datums DATE NOT NULL,
    laika_zimogs DATETIME NOT NULL,
    kategorija VARCHAR(50) NOT NULL,
    lauka_nosaukums VARCHAR(100) NOT NULL,
    vertiba VARCHAR(50) NOT NULL,
    papildus_info VARCHAR(255),
    ir_labots TINYINT(1) DEFAULT 0,
    sākotnējā_vertiba VARCHAR(255),
    sinhronizets TINYINT(1) DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (klienta_id) REFERENCES klienti(id),
    FOREIGN KEY (darbinieka_id) REFERENCES darbinieki(id)
);

-- 4. Papildu uzdevumi (no vadības, parādās kā peldoši logi)
CREATE TABLE papildu_uzdevumi (
    id INT AUTO_INCREMENT PRIMARY KEY,
    teksts VARCHAR(500) NOT NULL,
    piešķirt_darbiniekam_id INT NOT NULL,
    prioritate ENUM('zema', 'vidēja', 'augša') DEFAULT 'vidēja',
    termiņš DATETIME,
    ir_pabeigts TINYINT(1) DEFAULT 0,
    pabeigts_laika_zimogs DATETIME NULL,
    sinhronizets TINYINT(1) DEFAULT 0,
    izveidots TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (piešķirt_darbiniekam_id) REFERENCES darbinieki(id)
);

-- 5. Apmeklējuma reģistrs
CREATE TABLE apmeklesanas (
    id INT AUTO_INCREMENT PRIMARY KEY,
    klienta_id INT NOT NULL,
    darbinieka_id INT NOT NULL,
    datums DATE NOT NULL,
    laika_zimogs DATETIME NOT NULL,
    ir_pabeigta TINYINT(1) DEFAULT 0,
    FOREIGN KEY (klienta_id) REFERENCES klienti(id),
    FOREIGN KEY (darbinieka_id) REFERENCES darbinieki(id)
);
```

### 4.B. Lokālā Datubāse (SQLite — ierīcē)

Pilnīgi identiska struktūra. Pirmajā palaišanā JS izveido visas tabulas ar `CREATE TABLE IF NOT EXISTS`. Visi dati ierakstās ar `sinhronizets = 0` (nozīme: "nav nosūtīts uz MySQL"). Pēc veiksmīgas sinhronizācijas lauks mainās uz `1` ("nosūtīts"). Tabulā `dienas_atzages` nav UNIQUE ierobežojuma, lai vienā dienā varētu būt vairāki ieraksti (piemēram, rīta un vakara temperatūra, vairākas autiņbiksīšu maiņas).

---

## 5. API Galapunkti (Python Flask)

| Metode | Ceļš | Funkcija | Atbilde |
|---|---|---|---|
| POST | `/api/login` | Autentificē PIN (aprūpētājs) vai paroli (vadība) | JWT token |
| GET | `/api/klienti` | Iegriež klientu sarakstu | JSON masīvs |
| GET | `/api/apmeklesanas?datums=YYYY-MM-DD&darbinieks_id=X` | Iegriež šodienas apmeklējumus | JSON |
| POST | `/api/atzimes/batch` | Saņem saglabātās atzīmes no SQLite | `{status: "ok", count: N}` |
| GET | `/api/papildu_uzdevumi?darbinieks_id=X` | Iegriež jaunus papildu uzdevumus | JSON masīvs |
| POST | `/api/papildu_uzdevumi/pabeigts` | Atzīmē papildu uzdevumu pabeigtu | `{status: "ok"}` |
| POST | `/api/sync_up` | Health-check | `{status: "ok"}` |
| GET | `/api/statistika?klients_id=X&no=YYYY-MM-DD&līdz=YYYY-MM-DD` | Atgriež datus katgorijās, sakārtotus pēc `laika_zimoga` hronoloģiskā secībā (ietver rīta un vakara mērījumus vienā dienā) | JSON |

---

## 6. Grafiskais Interfeiss (UI/UX)

### 6.1 Principi

- **Interfeiss ir vienkāršs kā pogas.** Nav menu, nav dropdown. Katrs ekrāns = viena darbība.
- **Pogas ir lielas (min 72x72dp).** Fonā ir spilgs, krāsas ir kontrastas.
- **Ievades tipi skaidri noteikti:**
  - Izvēles lauki → pogas (X / P / A, N / A / S / C / K, Jā / Nē)
  - Skaitļi → ciparu ievade (temperatūra, urīna daudzums, uzņemts, skaitītāji)
  - Teksts → tikai nepieciešamības gadījumā (ķermeņa kosanās līdzeklis)
- **Statusa josla (augšmalā):**Visās ekrānos redzama neliela josla augšpusē, kas parāda:
  - **Sync statuss:** Zaļš punktiņš "Sinhronizēts" (ja pēdējā sinhronizācija ir veiksmīga) / Sarkans punktiņš "Offline" (ja nav WiFi).
  - **Baterijas līmenis:** Procenti (piemēram, "87%") — parādās, kad zem 20%.

### 6.2 Ekrāni aplikācijā (Aprūpētāja puse)

#### Ekrāns 1: Autorizācija
- Liela PIN ievades poga (cipari 0–9)
- Automātiska sesija iebūvē

#### Ekrāns 2: Klientu saraksts
- Kartas ar klienta vārdu, dzimušā datums vecumu, attēlu
- Zemāk — zaļa poga "Sākt apmeklējumu" uz katru karti

#### Ekrāns 3: Darbību izvēlne
- [ Veikt aprūpi ] — galvenā funkcija
- [ Papildu uzdevumi ] — parāda gaidīganus papildu uzdevumus
- [ Vēsture ] — iepriekšējās atzīmes

#### Ekrāns 4: Dienas aprūpes forma (saskaņā ar PDF)

**Ieeja:** Klients, datums (automātisk), vecums (automātisk), maiņa (Rīts / Vakars / Nakts — automātiski noteikts no laika), maipas_datums (automātisk: ja forma tiek saglabāta pēc pusnaktīm, maipas_datums = iepriekšējais kalendārā datums)

**Sadaļas un lauki (pilnīgi saskaņoti ar Pielikumu 13):**

1. **Temperatūra**
   - Ievade: cipari (piemēram, 36.5)
   - Automātiska atzīme: ≥37 → sarkans, <37 → zaļi "N"

2. **Higiēna un kopšana**
   - Katrs punkts: trīs pogas [X] [P] [A]
   - Mutes dobuma kopšana / Protēšana
   - Vanna, duša
   - Daļēja apmazgāšana
   - Veļas maiņa
   - Nagu kopšana
   - Matu kopšana / mazgāšana pēc vajadzības
   - Bārdas skūšana

3. **Aktivitāte un mobilitāte**
   - Katrs punkts: trīs pogas [X] [P] [A]
   - Pārvietošanās ar palīglīdzekli
   - Stāv ar palīdzību
   - Sēž ar palīdzību

4. **Ēdināšana**
   - Trīs pogas katai rezei: [X] (visa porcija) [½] (puse) [A] (atteicās)
   - Brokastis
   - Pusdienas
   - Launags
   - Vakariņas

5. **Ūdens un fizioloģija**
   - Diennakts urīna daudzums (ml): ciparu ievade
   - Uzņemts diennaktē (ml): ciparu ievade
   - Ādas kopšanas līdzeklis: teksta ievade (neobligāts)
   - Vēdera izeja: pogas [N] [A] [S] [C] [K]

6. **Citi ikdienas pasākumi**
   - Pastaiga ar saiga: [X] [P] [A]
   - Ciemiņi: [Jā] [Nē]
   - Autiņbiksīšu skaits (diennakts): skaitītājs [+]/[-]

7. **Nobeigums**
   - Automātiska: "Paraksts = PIN + datums + precīzais laika zīmogs"
   - [ Saglabāt ] — zaļā poga

#### Ekrāns 5: Papildu uzdevumi (peldoši logi)

Peldošie logi ir elementi **iekus ejās BAS aplikācijas WebView** (CSS `position: fixed`), ne Android sistēmas peldošie logi. Tie parādās ekrāna stūrīs:
- Logi ir miniatūri, neaizveramas forma
- Klikšķinot — atveras mazā logi ar:
  - Uzdevuma teksts
  - Termiņš (zaļi = laikā, sarkani = tuvināšos)
  - [ Pilda ] / [ Atzīmēt kā nesoignu ]

---

## 7. Papildu Uzdevumu Sistema (Peldoši logi)

### Problēma:
Vadība dod papildu uzdevumus (piemēram: "Pārbaudi istabu 3"), bet tas nedrīkst traucēt pamata aprūpes darbu.

### Risinājums: Peldoši logi

```
┌─────────────────────────────────────┐
│ [Klients: Anna, 75g.] [Forma]       │
│ [Temperatūra] 36.5°C   [N]          │
│ [Higiēna] Vanna  [X]   Duša [P]     │
│ ... forma tiek piepildīta ...       │
│                                     │
│   ◯ [Papildu: Pārbaudi istabu 3]    │  ← Peldošais logs (gaida)
│                                     │
│ [Saglabāt]                          │
└─────────────────────────────────────┘
```

### Kā tas darbojas:

1. **Izveidošana:** Vadība web panelī ieraksta uzdevumu → saglabājas `papildu_uzdevumi` tabulā → sinhronizējas cauri API.
2. **Saņemšana:** Kad ierīce sinhronizējas (katrās 30 sekundēs vai manuāli), saņem jaunus papildu uzdevumus.
3. **Parādīšana:**
   - Ja forma **nav aktīva** → peldošais logs parādās ekrāna stūrī ar pilnu vizualizāciju.
   - Ja forma **ir aktīva** (tiek aizpildīta) → peldošais logs mierīgi gaida stūrī, **neizvelk logi**.
4. **Pabeigšana:** Kad forma ir saglabāta → logi parāda: "Jums ir 1 gaidīgs papildu uzdevums".
5. **Termiņš:** Ja termiņš tuvināšos (24h) → mierīga vibrācija tikai pēc forma pabeigšanas.
6. **Prioritāte:** Augša → peldošais logs gaiļo; Vidēja → mierīgi gaida; Zema → parādās tikai pēc forma pabeigšanas.

> **Pazīme:** Papildu uzdevumi **nekad** neatveras virs aktīvās formas.

---

## 8. Offline-First & Sinhronizācijas Loģika

1. **Pirmajā palaišanā:** JS izveido vietējo SQLite DB (`initSQLite()`).
2. **Vienmēr rakstās lokāli:** Katrs klikšķis → SQLite rindā ar `sinhronizets = 0`.
3. **Sinhronizācija:** Katrās 30 sekundēs (ja ir lokāla WiFi):
   - `GET /api/klienti` → atjaunina lokālo klientu sarakstu.
   - `GET /api/papildu_uzdevumi` → lejupielādē jaunus papildu uzdevumus.
   - `POST /api/atzimes/batch` → augšupielādē visas `sinhronizets = 0` atzīmes. Katrs ieraksts satur `laika_zimogs` un `darbinieka_id`. Serveris izmanto `INSERT ... ON DUPLICATE KEY UPDATE` vai transakciju, lai izvairītos no dublikātiem, ja ieraksts jau eksistē (piemēram, divas ierīces, kas sinhronizē vienlaicumā). Pēc veiksmīgas augšupielādes lauks mainās uz `sinhronizets = 1`.
4. **Offline režīmā:** Viss darbs turpinās lokāli. Dati neatkāsina. Sinhronizācija notiek, kad atkal ir pieejama lokālā WiFi.

---

## 9. Administrācijas Panels (Web UI)

### Piekļuve:
- URL: `http://<server-ip>:5000/admin`
- Parole vadītājam.

### Ekrāni:

1. **Klientu pārvaldība**
   - Tabula: vārds, uzvārds, vecums, status (aktīvs / slimnīcā / izrakstīts), diēta, pēdējā apmeklēšanas diena
   - [ Pievienot ] [ Rediģēt ] [ Dzēst ]
   - API: `/api/klienti` atgriež tikai klientus ar statusu "aktīvs"

2. **Darbinieku pārvaldība**
   - Tabula: vārds, uzvārds, PIN, loma, aktīvs
   - [ Pievienot ] [ Mainīt PIN ] [ Bloķēt ]

3. **Papildu uzdevumi**
   - Forma: teksts, piešķirt darbiniekam, prioritāte, termiņš
   - Saraksts: visi uzdevoki ar statusu:
     - **Gaida** — izveidots, nav pabeigts, termiņš nav pagājis
     - **Pabeigts** — uzdevām atzīmēts kā pabeigts
     - **Nokavēts** — termiņš ir pagājis un uzdevums nav pabeigts

4. **Statistika**
   - Diagrammas: temperatūras tendences, ēdienrežīma, higiēnas atzīmju procentos, papildu uzdevumu izpilde
   - Filtrēt pēc klienta / mēneša / nedēļas
   - Eksportēt kā CSV ar vienu klikšķi

5. **Audit / Vēsture**
   - Pilna logi: katrs klikšķis → kas, kad, kāda vērtība
   - Labojumu vēsture: `ir_labots = 1` rindas parāda, kas darbinieks labojis, kad, un sākotnējā vertība
   - Meklēt pēc: darbinieks, klients, datums, vai tikai labojumi (`?tikai_labojumi=1`)

---

## 10. Izstrādes Plāns no A līdz Z

### Solis 1: Vides sagatavošana (PC)

1. Ir instalēts: Python 3.10+, pip, VS Code, MySQL (XAMPP), Git, Node.js, npm, Java JDK.
2. Uzstādīt trūgsoptās Python paketes:
   ```
   pip install flask flask-cors PyJWT pymysql werkzeug
   ```
3. Uzstādīt Cordova:
   ```
   npm install -g cordova
   ```
4. Izveidot projekta mapi:
   ```
   bas_sistema/
   ├── backend/
   │   ├── app.py
   │   ├── config.py
   │   ├── requirements.txt
   │   ├── db_init.sql
   │   ├── routes/
   │   │   ├── auth.py
   │   │   ├── klienti.py
   │   │   ├── atzimes.py
   │   │   ├── uzdevumi.py
   │   │   └── statistika.py
   │   ├── models/
   │   │   ├── darbinieks.py
   │   │   ├── klients.py
   │   │   ├── atzime.py
   │   │   └── uzdevums.py
   │   └── services/
   │       ├── auth_service.py
   │       ├── sync_service.py
   │       └── statistika_service.py
   ├── frontend/
   │   ├── www/
   │   │   ├── index.html
   │   │   ├── css/
   │   │   │   └── style.css
   │   │   └── js/
   │   │       ├── app.js
   │   │       ├── api.js
   │   │       ├── sqlite.js
   │   │       ├── sync.js
   │   │       ├── care_form.js
   │   │       └── papildu_uzdevumi.js
   │   ├── config.xml
   │   └── plugins/
   ├── admin/
   │   ├── index.html
   │   ├── css/
   │   │   └── admin.css
   │   └── js/
   │       ├── admin.js
   │       ├── klienti.js
   │       ├── darbinieki.js
   │       ├── papildu_uzdevumi.js
   │       └── statistika.js
   ├── tests/
   │   ├── backend/
   │   └── frontend/
   ├── docs/
   │   └── README.md
   ├── .gitignore
   └── README.md
   ```
5. Inicializēt Git: `git init`, izveidot `.gitignore`.

---

### Solis 2: Backend izveide (Python Flask) — `/backend`

1. `requirements.txt`:
   ```
   flask
   flask-cors
   pymysql
   PyJWT
   werkzeug
   ```
2. Izveidot `db_init.sql` no sadaļas 4.A (visas tabulas).
3. Izveidot mapju struktūru `/backend`:
   ```
   backend/
   ├── app.py              ← Flask app + Blueprint reģistrācija
   ├── config.py           ← DB/secret konfigurācija
   ├── requirements.txt
   ├── db_init.sql
   ├── routes/             ← API galapunkti
   │   ├── auth.py         ← /api/login
   │   ├── klienti.py      ← /api/klienti, /api/apmeklesanas
   │   ├── atzimes.py      ← /api/atzimes/batch
   │   ├── uzdevumi.py     ← /api/papildu_uzdevumi, /api/papildu_uzdevumi/pabeigts
   │   └── statistika.py   ← /api/statistika
   ├── models/             ← DB modeļi
   │   ├── darbinieks.py
   │   ├── klients.py
   │   ├── atzime.py
   │   └── uzdevums.py
   └── services/           ← Bizness loģika
       ├── auth_service.py   ← PIN/autorizācija
       ├── sync_service.py   ← Sinhronizācijas loģika
       └── statistika_service.py ← Datu apkopošana
   ```
4. Izveidot `db_init.sql` no sadaļas 4.A (visas tabulas).
5. `app.py` reģistrē visus Blueprint maršrutus un palaid `Flask app.run(host='0.0.0.0', port=5000)`.
6. API galapunkti (sadaļa 5): `/api/login`, `/api/klienti`, `/api/apmeklesanas`, `/api/atzimes/batch`, `/api/papildu_uzdevumi`, `/api/papildu_uzdevumi/pabeigts`, `/api/sync_up`, `/api/statistika`.

**Testa punkts:** `python app.py` → `http://localhost:5000/api/klienti` atgriež `[]`.

---

### Solis 3: Frontend izveide (HTML/CSS/JS) — `/frontend`

#### Struktūra (Cordova www/):
```
frontend/
├── www/
│   ├── index.html          ← Viinā SPA
│   ├── css/
│   │   └── style.css       ← Lielas pogas, kontrastas krāsas
│   └── js/
│       ├── app.js          ← Galvenā: ekrānu pārslēgšana, initSQLite
│       ├── api.js          ← API saziņa (fetch wrapper)
│       ├── sqlite.js       ← CREATE TABLE, saveMark, getPendingSync, markSynced
│       ├── sync.js         ← syncWithServer() + setInterval
│       ├── care_form.js    ← Dienas formas logika
│       └── papildu_uzdevumi.js ← Peldošie logi: createFloatingBubble, updateBubbleState
├── config.xml              ← Cordova konfigurācija
└── plugins/
```

#### SPA ekrāni (pārslēgami cauri `showScreen()`):
```
'login'          → PIN ievade
'klienti_list'   → Kartas ar klientiem
'form_choice'    → Veikt aprūpi | Papildu uzdevumi | Vēsture
'care_form'      → Dienas forma
'papildu_uzdevumi'  → Saraksts ar papildu uzdevumiem
'history'        → Iepriekšējās atzīmes
```

#### SQLite integrācija:
- `initSQLite()` — izveido visas tabulas ar `CREATE TABLE IF NOT EXISTS`
- `saveMark()` — saglabā atzīmi ar `sinhronizets = 0`
- `getPendingSync()` — iegriež rindas ar `sinhronizets = 0`
- `markSynced(id)` — maina uz `sinhronizets = 1`

#### Sinhronizācija:
- `syncWithServer()`:
  1. GET `/api/klienti`
  2. GET `/api/papildu_uzdevumi?darbinieks_id=X`
  3. POST `/api/atzimes/batch`
- Intervāls: `setInterval(syncWithServer, 30000)` (katrās 30 sekundēs, kad ir WiFi)
- Manuālā: [ Atjaunināt ] poga

#### Dienas forma (saskaņā ar PDF un Pielikumu 13):
- Izvēles lauki → pogas [X] [P] [A] (cietkļāvi, krāsu atjauninās)
- Skaitļi → ciparu ievade (temperatūra, urīns, skaitītāji)
- Teksts → tikai "Ādas kopšanas līdzeklis" (neobligāts)
- Temperatūra: ≥37 → sarkans, <37 → "N" (zaļi)
- Saglabāšana → visi lauki kā atsevišķas rindas tabulā `dienas_atzimes`

---

### Solis 4: Offline + Sync + Papildu uzdevumi

1. Pārbaudīt, ka forma saglabā datus SQLite bez interneta.
2. Pievienot peldošos logus: `createFloatingBubble(text, deadline)`.
3. `updateBubbleState()`:
   - Forma aktīva → logi gaida (neizvelk)
   - Forma pabeigta → logi parādās
4. Testa scenārijs:
   - Admin izveido papildu uzdevumu
   - Ierīce sinhronizējas → logs parādās stūrī
   - Sāk forma → logs gaida
   - Pabeidz formu → logs kļūst aktīvubs

---

### Solis 5: Iepakošana → Android .apk (Apache Cordova)

1. ```
   npm install -g cordova
   cd frontend
   cordova create . com.bas.sistema "Aprūpes Sistēma"
   ```
2. Pārvietot `index.html`, `style.css`, `app.js` uz `www/`.
3. Pievienot pluginus:
   ```
   cordova plugin add cordova-plugin-sqlite-storage
   cordova plugin add cordova-plugin-network-information
   ```
4. Izveidot `config.xml` — atļaut internetpiekļuvi un storage piekļuvi.
5. ```
   cordova build android --release
   ```
6. APK fails parādās: `platforms/android/app/build/outputs/apk/release/`
7. Uzinstādēt uz planšetēm caur USB vai lokālo tīklu (bez Google Play).

---

### Solis 6: Risku Novēršana

| Problēma | Risinājums |
|---|---|
| Internets izslēgs | SQLite turpina. Sync gaida līdz WiFi atsagainde. |
| Planšete pazaudēta | Pieraksti PIN → dati iepakoti no MySQL. |
| Papildu uzdevums izlaists | Termiņš sarkans. Vibrācija pēc forma pabeiges. |
| Duplikāta atzīme | Katrs ieraksts = unikāls ID + laiks. |
| Sinhronizācijas konflikt | POST /api/atzimes/batch izmanto INSERT ... ON DUPLICATE KEY UPDATE. |
| Sesijas nokavēšanās forma | Taimauts ir izslēgts, kamēr forma ir atvērta. |
| Labojums neatzīmēts | Ir_labots = 1 fiksē katru korekciju ar sākotnējā_vertiba. |
| Maiņas pārlej dienā | maipas_datums fiksē kuru dienu pieder ieraksts. |
| Klients statuss maināts | Tikai aktīvi klienti parādās sarakstā. |
| PIN aizmirsts | Vadītajs resetē admin panelī. |
| APK kļūda | Atkārtotā `cordova build android`. Pārbaudīt logus. |
| Statistika nestrādā | Pārbauti `GET /api/statistika` atbilstību. |

---

## 11. Testēšanas Plāns

1. **Backend testi:** Flask galapunkti testē ar `pytest` (katrs routes/ fails varat vienītā).
2. **Frontend testi (PC):** Web pārlūkprogrammā (Chrome) — iziet cauri visiem ekrāniem, veikt formu → saglabāt → pārbaudīt SQLite.
3. **Frontend testi (Android emulator):** `cordova build android` → instalēt Android emulatorā. Pārbaudīt peldošos logus, sync, offline režīmu.
4. **Sync tests:** Izslēgt Wi-Fi → 3 atzīmes → ieslēgt Wi-Fi → dati parādās MySQL.
5. **Papildu uzdevumu tests:** Admin izveido → logs stūrī → forma aktīva → logs gaida → forma pabeigta → logs kļūst aktīvs.
6. **Fiziska planšete:** Gala testēšana uz reālas planšetes. Emulator neaizvieto touch feedback un WiFi sincus uz reālās ierīces.
7. **Nakts maiņas tests:** Simulēt formu, kas sākas plkst. 22:00 un tiek saglabāta plkst. 02:00 nakst. Pārbaudīt, ka `maipas_datums` = iepriekšējais datums.
8. **Korekcijas tests:** Labot esošo lauku, pārbaudīt, ka `ir_labots = 1` un `sākotnējā_vertiba` satur veco vērtību.
9. **Statusa filtrēšana:** Pievienot klientu ar statusu "slimnīcā", pārbaudīt, ka viņš neparādās sarakstā.
10. **Konfliktu sinhronizācija:** Divas ierīces sinhronizē vienlaicumā — pārbaudīt, ka MySQL nekļūst ar Duplicate entry.
11. **Taimauta pausēšana:** Sākt formu, gaidīt 6 minūtes bez aktivitātes, bet forma ir atvērta — pārbaudīt, ka sesija nemirst.

---

## 12. Noslēgums

Šis ir loģisks, detalizēts tehnisks projekts no A līdz Z. Katrs solis ir noteikts ar konkrēkiem testpunktiem. Nav nekādas neizmēģinātās tehnoloģijas. Interfeiss ir vienkāršs, lai darbinieks varētu izmantot to bez IT prasmēm.

---

## 13. Pielikums: Formas lauku kartējums (PDF → Datubāze)

| PDF seksa | Kategorija | Lauka nosaukums | Ievades tips | Vērtība/opcijas |
|---|---|---|---|---|
| Temperatūra | temp | temperatura | Cipars | Skaitlis (°C). ≥37 → sarkans, <37 → "N" |
| Higiēna | higiena | mutes_dobuma_kopsana | Pogs | X / P / A |
| Higiēna | higiena | vanna_dusha | Pogs | X / P / A |
| Higiēna | higiena | dalean_apmazgasana | Pogs | X / P / A |
| Higiēna | higiena | velas_maina | Pogs | X / P / A |
| Higiēna | higiena | nagju_kopsana | Pogs | X / P / A |
| Higiēna | higiena | matu_kopsana | Pogs | X / P / A |
| Higiēna | higiena | bardas_skushana | Pogs | X / P / A |
| Aktivitāte | aktivitate | transporta_pārvietosanas | Pogs | X / P / A |
| Aktivitāte | aktivitate | stāv_ar_palīdzību | Pogs | X / P / A |
| Aktivitāte | aktivitate | sež_ar_palīdzību | Pogs | X / P / A |
| Ēdienrežīms | edienas | brokasti | Pogs | X / ½ / A |
| Ēdienrežīms | edienas | pusdienas | Pogs | X / ½ / A |
| Ēdienrežīms | edienas | launags | Pogs | X / ½ / A |
| Ēdienrežīms | edienas | vakariņi | Pogs | X / ½ / A |
| Šķidrumi | sikdrumi | urīns_ml | Cipars | Skaitlis (ml) |
| Šķidrumi | sikdrumi | uzņemts_ml | Cipars | Skaitlis (ml) |
| Šķidrumi | sikdrumi | ķermeņa_kosanas_līdzeklis | Teksts | Brīvs teksts (neobligāts) |
| Šķidrumi | sikdrumi | vēdera_izeja | Pogs | N / A / S / C / K |
| Cits | citi | pastaiga | Pogs | X / P / A |
| Cits | citi | ciemiņi | Pogs | Jā / Nē |
| Cits | citi | autiņbiksīšu_skaits | Cipars | Skaitlis (skaits) |
| Nobeigums | paraksts | paraksts | Automātiski | PIN + datums + laika zīmogs |
