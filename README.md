# Aprūpes Sistēma (BAS)

Offline-first Android/Web aplikācija aprūpes darbiniekiem.

## Tehnoloģijas
- **Backend:** Python Flask + SQLite (primārā DB)
- **Frontend:** HTML5/CSS3/JS (Apache Cordova)
- **Admin:** Web UI
- **Sync:** MySQL (optional, admin dators) ↔ SQLite (planšete/PC)

## Mapju struktūra
```
C:\Users\davis\Desktop\Aprupes_sistema\
├── backend/
│   ├── app.py              # Flask serveris
│   ├── config.py           # Konfigurācija
│   ├── requirements.txt    # Python dependencies
│   ├── db_init.sql         # SQLite shēma
│   ├── services/
│   │   └── database.py     # SQLite datubāzes slānis
│   └── routes/
│       ├── auth.py         # Autentifikācija
│       ├── klienti.py      # Klientu pārvaldība
│       ├── atzimes.py      # Dienas atzīmes
│       ├── uzdevumi.py     # Papildu uzdevumi
│       ├── statistika.py   # Statistika
│       ├── setup.py        # Setup wizard
│       └── sync.py         # Sinhronizācija
├── frontend/
│   └── www/
│       ├── index.html      # Galvenā lapa
│       ├── css/style.css   # Stili
│       └── js/
│           ├── api.js      # API helpers
│           ├── sqlite.js   # SQLite wrapper
│           ├── app.js      # Galvenā loģika
│           ├── care_form.js # Aprūpes forma
│           └── admin_panel.js # Admin panelis
├── admin/
│   └── js/
│       └── admin_panel.js  # Admin panelis
├── data/
│   └── bas.db              # SQLite datubāze (automātiski izveidota)
├── exports/                # Excel eksporti
├── uzdevums.md             # Projekta uzdevumi
└── README.md               # Šis fails
```

## Sākotnējā iestatīšana

### 1. Backend dependencies
```powershell
cd C:\Users\davis\Desktop\Aprupes_sistema\backend
pip install -r requirements.txt
```

### 2. Flask serveris
```powershell
cd C:\Users\davis\Desktop\Aprupes_sistema\backend
python app.py
```
Serveris pieejams uz `http://localhost:5000`

### 3. Frontend
Atver Chrome browserī:
```
C:\Users\davis\Desktop\Aprupes_sistema\frontend\www\index.html
```

### 4. Pirmā reize - Setup
1. Ievadi sākotnējā admina vārdu, uzvārdu, paroli
2. Spiež "Izveidot admin"
3. Automātiski tiek izveidota SQLite DB `data/bas.db`

## Lietotāju lomas

| Loma | PIN | Parole | Pieejamība |
|------|-----|--------|-------------|
| Aprūpētājs | 6 cipari (piem. `123456`) | Nav | Klienti, forma |
| Vadītājs (Admin) | Nav | Jā | Pilna pārvaldība |
| Kontrole | Nav | Jā | Statistika, eksports |

## Sinhronizācija

### MySQL ↔ SQLite
- **Admin dators** (ar MySQL): importē Excel, pārvalda lietotājus
- **Planšete/PC** (bez MySQL): darbina SQLite, offline režīms
- **Sync:** kad abi ir vienā tīklā, dati sinhronizējas automātiski

### Sync endpoints
- `GET /api/sync/status` — status
- `POST /api/sync/push` — nosūtīt atzīmes
- `GET /api/sync/pull` — saņemt lietotājus/klientus

## Excel formāti

### Imports
Augšupielādē `.xlsx` ar kolonām:
- `Vārds`, `Uzvārds`, `Dzimšanas datums`, `Diēta`, `Saskarsmes īpatnības`

### Eksports
Admin → Statistika → filtrē mēnesi → "Excel"

Saglabā formātu ar:
- Galveniem
- Datiem pēc kategorijām
- Aprūpētāja parakstu

## API endpoints

| Metode | Ceļš | Apraksts |
|--------|------|----------|
| POST | `/api/login` | `{"pin":"123456"}` vai `{"parole":"...", "role":"admin"}` |
| GET | `/api/klienti` | Visi aktīvie klienti |
| GET | `/api/users` | Visi lietotāji |
| POST | `/api/users` | Izveidot lietotāju |
| PUT | `/api/users/<id>` | Atjaunot lietotāju |
| DELETE | `/api/users/<id>` | Dzēst lietotāju |
| POST | `/api/atzimes/batch` | Saglabāt atzīmes |
| GET | `/api/statistika` | Statistika |
| POST | `/api/import-clients` | Excel imports |
| GET | `/api/export/excel` | Excel eksports |

## Drošība
- PIN: 6 cipari, nevar būt vienkārši (`000000`, `123456`, utt.)
- Paroles: hashētas ar werkzeug
- JWT tokeni: 24h derīgums
