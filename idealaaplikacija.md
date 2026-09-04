# IDEĀLĀ APRŪPES SISTĒMA

## 1. Filozofija

Sistēmai jābūt tik vienkāršai, lai aprūpētājam nebūtu jādomā par tehnoloģiju. Viņš atrod klientu, izvēlas vajadzīgo aprūpes sadaļu, nospiež vienu skaidru pogu un turpina darbu.

Galvenie principi:

- vienkāršība pirms funkciju daudzuma;
- viena darbība ir viens skaidrs klikšķis;
- nekas nedrīkst pazust;
- labošana ir normāla darbība, nevis kļūda;
- katrai izmaiņai ir redzams kas, kad un ko izmainīja;
- dati vispirms tiek saglabāti ierīcē, pēc tam fonā Google Sheets;
- aprūpētājam nav jāredz API, tokeni, sinhronizācijas kodi vai tehniskas kļūdas;
- sistēmai jābūt ātrai arī ar 100 un vairāk klientiem.

## 2. Mērķis

Izveidot bezmaksas aprūpes sistēmu, kas saglabā esošās Google Sheets loģiku un aprūpes lapas struktūru, bet ikdienas darbā ir ātrāka, skaidrāka un drošāka par manuālu tabulas aizpildīšanu.

Rezultāts:

1. Aprūpētājs klientu atrod dažu sekunžu laikā.
2. Aprūpes atzīme ekrānā parādās uzreiz.
3. Dati tiek saglabāti lokāli arī bez interneta.
4. Google Sheets saņem datus automātiski fonā.
5. Vadība redz aktuālo stāvokli.
6. Kontrolieris redz vēsturi un var saprast katru labojumu.
7. Excel aprūpes lapa tiek aizpildīta 1:1, nemainot veidnes formatējumu.

## 3. Reālistiskais ātruma princips

Milisekundes ir sasniedzamas lietotāja darbībai ierīcē:

- klientu meklēšana: lokāli, bez servera pieprasījuma;
- pogas nospiešana un krāsas maiņa: uzreiz;
- lokālā saglabāšana: parasti 1-20 ms;
- vēstures atvēršana: no lokālās datubāzes.

Google Sheets interneta sinhronizācija nevar garantēt milisekundes. Tās ilgums ir atkarīgs no interneta, Google un ierīces. Lietotājam tas nav jāgaida: programma saglabā uzreiz un sinhronizē fonā.

## 4. Lietotāju skati

### Aprūpētājs

Vienīgais svarīgais mērķis: ātri un pareizi atzīmēt aprūpi.

Sākuma ekrānā:

- viena meklēšanas josla tikai pēc vārda un uzvārda;
- klientu kartītes sakārtotas alfabētiski pēc uzvārda un vārda;
- reāllaika filtrēšana ar katru ievadīto burtu;
- rezultātos paliek tikai tie klienti, kuru vārdā vai uzvārdā ir ievadītais teksts;
- meklēšana darbojas arī tad, ja ievada tikai vārdu vai tikai uzvārdu;
- meklēšana nav atkarīga no lielajiem/mazajiem burtiem;
- klienta kartītē redzams tikai vārds, uzvārds un šodienas aprūpes statuss;
- personas kods un citi nevajadzīgi identifikācijas dati netiek rādīti;
- nav atsevišķu filtru pēc vecuma, diētas, statusa vai citiem kritērijiem;
- nav sarežģītas kārtošanas izvēlnes aprūpētāja sākuma ekrānā.

Klienta ekrānā vienmēr redzams:

- vārds un uzvārds;
- dzimšanas datums;
- diēta;
- saskarsmes īpatnības;
- šodienas aprūpes statuss;
- poga Atpakaļ.

### Klientu kartīšu sistēma

Kartīšu sistēma ir galvenais aprūpētāja sākuma ekrāns. Tā ir piemērotāka par lielu tabulu, jo kartīte ir ātri uztverama, viegli nospiežama un saprotama arī lietotājam bez IT pieredzes.

Klientu skaits:

- parastais apjoms: līdz 100 klientiem;
- maksimālais paredzētais apjoms: 500 klienti;
- klientu skaits netiek mākslīgi ierobežots zem 500;
- līdz 500 kartītēm meklēšanai jādarbojas bez jūtamas aizkaves.

Kartītes noteikumi:

- katrs aktīvais klients tiek parādīts vienā kartītē;
- vienādus vārdus un uzvārdus atšķir ar sistēmas iekšējo ID, ko aprūpētājam nerāda;
- kartītes galvenais teksts ir vārds un uzvārds;
- kartītē nav personas koda, adreses, telefona vai cita darba veikšanai nevajadzīga privāta datu lauka;
- kartītei ir skaidra poga `Sākt aprūpi` vai `Atvērt`;
- klikšķis uz kartītes atver konkrēto klientu, nevis citu līdzīgu klientu;
- meklēšanas rezultāti atjaunojas uzreiz, bez pogas `Meklēt`;
- ja nekas neatbilst, tiek parādīts tikai `Klients nav atrasts`;
- pēc meklēšanas notīrīšanas atkal redzami visi aktīvie klienti;
- neaktīvie klienti aprūpētāja sākuma sarakstā netiek rādīti.

### Reāllaika meklēšanas darbība

Meklēšana notiek jau ielādētajā klientu sarakstā, nevis ar jaunu pieprasījumu Google Sheets pie katra burta. Tas nodrošina ātrumu un stabilitāti.

Prasības:

- rezultāts sāk mainīties pēc pirmā ievadītā burta;
- meklēšana nedrīkst gaidīt interneta atbildi;
- meklēšanai ar 100 klientiem jābūt tūlītējai;
- meklēšanai ar 500 klientiem jābūt tūlītējai;
- meklēšanā tiek izmantots tikai `Vārds` un `Uzvārds`;
- personas kods sistēmā netiek vākti, glabāti vai izmantoti meklēšanai;
- ja ir divi vienādi vārdi un uzvārdi, kartītē drīkst papildus rādīt tikai drošu atšķiršanas informāciju, piemēram, dzimšanas datumu, ja tas nepieciešams.

### Kontrolieris

Kontrolierim jāredz fakti, nevis jāmeklē dati tabulā:

- visi klienti;
- šodienas un izvēlēta perioda statuss;
- nepabeigtā aprūpe;
- temperatūras novirzes;
- ēdināšanas rezultāti;
- šķidruma un urīna kopsavilkums;
- vēdera izejas ieraksti;
- aktivitātes un pastaigas;
- ciemiņu ieraksti;
- kas, kad un ko laboja.

### Administrators

Administratoram jāpārvalda tikai sistēmas pamati:

- klienti;
- darbinieki;
- lomas un PIN;
- klienta datu labošana;
- Google Sheets savienojuma pārbaude;
- Excel veidnes lejupielāde.

## 5. Aprūpes kartes struktūra

Kartes struktūra paliek saskaņā ar esošo `range_aprupe.txt` un `Aprūpes lapas.xlsx`.

### Temperatūra

- ievade ar skaitli, piemēram, 36.6;
- zem 37: normāla;
- 37 vai vairāk: sarkana;
- atkārtota ievade tajā pašā datumā un maiņā labo esošo vērtību;
- vēsturē redzama iepriekšējā temperatūra.

### Higiēna

Katram punktam viena pašreizējā vērtība:

- X: izpildīts;
- P: patstāvīgi;
- A: atteicās.

Atkārtots klikšķis nedrīkst veidot jaunu kopsavilkuma ierakstu. Tas labo esošo vērtību un auditā saglabā iepriekšējo.

### Ēdināšana

Katrai ēdienreizei ir trīs izvēles:

- X: visa porcija;
- ½: puse porcijas;
- A: atteicās.

Vienai ēdienreizei drīkst būt viena aktuālā vērtība. Ja X nomaina uz ½, ekrānā paliek iekrāsota tikai ½, Google Sheets kopsavilkumā ir ½, bet vēsturē paliek X un redzams labotājs.

### Šķidrums

Šķidruma ieraksts ir notikums, nevis viena poga:

- kas: aprūpētājs;
- kad: datums un laiks;
- cik: mililitri;
- aktuālais dienas kopsavilkums;
- apakšā tabula ar visiem šīs dienas ierakstiem.

### Fizioloģija

Atsevišķa karte `Vēdera izeja`:

- N: normāla;
- A: aizcietējums;
- S: svecīte;
- C: caureja;
- K: klizma.

Atsevišķi tiek uzskaitīts urīns mililitros. Abiem veidiem ir tabula ar kas, kad un cik/kāda vērtība.

### Aktivitāte

Katrs notikums tiek rādīts tabulā:

- pārvietojas ar palīglīdzekli;
- stāv ar palīdzību;
- sēž ar palīdzību;
- kas to atzīmēja;
- datums un laiks;
- aktuālā vērtība.

Atkārtots klikšķis nedrīkst pārvērst vienu darbību par nejaušu skaitītāju.

### Pastaiga

Pastaigai ir sava karte un tabula:

- kas devās pastaigā;
- kad;
- cik ilgi vai kāda piezīme;
- pašreizējais statuss;
- pilna vēsture.

### Ciemiņi

`Jā` un `Nē` ir viena maināma vērtība, nevis divas vienlaicīgas atzīmes. Mainot Jā uz Nē:

- ekrānā iekrāsota tikai Nē;
- aktuālajā kopsavilkumā ir Nē;
- vēsturē redzams Jā, pēc tam Nē;
- katram ierakstam redzams darbinieks un laiks.

### Autiņbikšu maiņa

Šī ir notikumu uzskaite:

- poga `+1 maiņa`;
- šodienas kopskaits;
- tabula: laiks, aprūpētājs, darbība;
- katra maiņa paliek vēsturē.

### Paraksts

Parakstā tiek saglabāts aprūpētāja uzvārds, nevis tehniska vērtība `X`. Google Sheets jābūt redzamam, kurš parakstīja aprūpi.

## 6. Datu modelis

Google Sheets paliek centrālā datu glabātuve, bet programma ikdienā nestrādā tieši ar vizuālo Excel izkārtojumu.

Jābūt šādām loģiskām lapām:

- `darbinieki`: lietotāji, lomas, PIN, aktīvs;
- `klienti`: klienta pamatdati;
- `atzimes`: viena aktuālā vērtība katram klientam, datumam, maiņai, kategorijai un laukam;
- `atzimes_log`: nemaināma visu izmaiņu vēsture;
- `dienas_ierakti`: dienas pabeigšanas statuss;
- `uzdevomi`: papildu uzdevumi;
- `pamācība`: lauku skaidrojumi.

`atzimes` nav jāizmanto kā notikumu vēsture. Tā ir pašreizējā bilde. `atzimes_log` ir vēsture. Šādi abas lapas nav “gandrīz vienādas”, bet katrai ir viens skaidrs mērķis.

Katram žurnāla ierakstam jābūt:

- ieraksta ID;
- atzīmes ID;
- klienta ID;
- darbinieka ID;
- datumam un laikam;
- maiņai;
- kategorijai un laukam;
- jaunajai vērtībai;
- iepriekšējai vērtībai;
- izmaiņas veidam: jauns ieraksts vai labojums.

## 7. Drošība bez liekas sarežģīšanas

Lietotājam nav jāredz tokeni vai tehniski autentifikācijas elementi. Bezmaksas variantam pietiek ar:

- Google Apps Script kā slēptu datu vārteju;
- piekļuvi tikai publicētajai programmai;
- darbinieka PIN;
- atsevišķām lomām;
- aktīva/neaktīva lietotāja statusu;
- auditācijas žurnālu;
- datu rezerves kopijām Google Sheets.

Svarīgi: “bez API” praktiski nozīmē “bez API, ko lietotājam jāredz vai jākonfigurē”. Lai programma un Google Sheets automātiski sarunātos, tehniska datu vārteja tomēr ir nepieciešama. Tā paliek kodā un netraucē aprūpētāja darbu.

## 8. Ātrdarbība

Lai programma būtu ātra arī ar 100 klientiem:

1. Pirmajā ielādē paņem klientus un šodienas kopsavilkumu vienā pieprasījumā.
2. Klientu meklēšanu veic lokāli.
3. Atvērta klienta vēsturi glabā lokālajā datubāzē.
4. Pēc klikšķa vispirms raksta lokāli, pēc tam sinhronizē fonā.
5. Nekad nelasa 1000 tukšas formatētas rindas.
6. Nekad neformatē visas Google lapas pie katra klikšķa.
7. Datus ielādē tikai vajadzīgajam datumam vai klientam.
8. Vienu un to pašu pieprasījumu nelaiž paralēli vairākas reizes.
9. Pēc saglabāšanas negaida Google atbildi, lai mainītu ekrāna stāvokli.
10. Kļūdas gadījumā atkārto sinhronizāciju fonā, nevis bloķē aprūpētāju.

## 9. Excel eksports

Eksportam vienmēr izmanto esošo `Aprūpes lapas.xlsx` veidni.

Atļauts:

- mainīt tikai vērtības noteiktajās šūnās;
- saglabāt Rīta/Vakara kolonnu struktūru;
- aizpildīt tikai izvēlētā klienta datus;
- saglabāt temperatūras sarkano marķējumu pēc veidnes noteikumiem.

Aizliegts:

- izveidot jaunu pliku workbook;
- pārbūvēt apvienotās šūnas;
- mainīt kolonnu platumus;
- mainīt rindas augstumus;
- izdzēst veidnes lapas;
- pārrakstīt formatējumu.

Ja veidne nav pieejama, eksportu neveido un parāda skaidru kļūdu.

## 10. Kontroles un statistikas minimums

Vadībai un kontrolierim nav nepieciešama sarežģīta analītikas platforma. Pietiek ar pārskatāmu paneli:

- klientu skaits;
- aprūpes pabeigtība šodien;
- nepabeigtie klienti;
- temperatūras virs 37;
- ēdināšana pa ēdienreizēm;
- uzņemtais šķidrums;
- urīna daudzums;
- vēdera izejas veidi;
- pastaigas;
- autiņbikšu maiņu skaits;
- labojumu skaits;
- pēdējais labotājs.

Filtri:

- datums vai periods;
- klients;
- aprūpētājs;
- kategorija;
- tikai labotie ieraksti.

## 11. Izstrādes uzdevumi

### 1. Datu līguma sakārtošana

- noteikt vienu lauku nosaukumu komplektu programmā;
- noņemt dubultos `ID`/`id` un citus atkārtojumus;
- noteikt datuma formātu `YYYY-MM-DD`;
- noteikt laika formātu ISO;
- nošķirt aktuālo vērtību no vēstures.

### 2. Google Sheets backend

- vienāds GET/POST pieprasījumu formāts;
- droša datu lasīšana;
- tukšo rindu ignorēšana;
- datuma filtrēšana pēc reālā notikuma laika;
- vienas aktuālās atzīmes atjaunošana;
- rakstīšanas bloķēšana paralēlu klikšķu laikā;
- pilns audits katram labojumam.

### 3. Lokālā programma

- klienti un šodienas dati lokālajā kešā;
- tūlītēja ekrāna reakcija;
- fonā esoša sinhronizācija;
- atkārtota sinhronizācija pēc interneta atjaunošanās;
- redzams, ja ir nesinhronizēti dati;
- nekad nezaudēt lokāli saglabātu ierakstu.

### 4. Aprūpētāja lietošana

- ātra klienta meklēšana;
- stabilas kartītes;
- viena izvēle vienam laukam;
- notikumu tabulas šķidrumiem, urīnam, aktivitātēm, pastaigām un ciemiņiem;
- atsevišķa vēdera izejas kartīte;
- uzvārds parakstā;
- skaidra labojuma vizualizācija.

### 5. Kontroliera panelis

- PIN autentifikācija;
- šodienas pārskats;
- perioda pārskats;
- filtri;
- detalizēta vēsture;
- labotāja un iepriekšējās vērtības attēlojums;
- eksports.

### 6. Administratora panelis

- klientu izveide un labošana;
- darbinieku izveide un labošana;
- lomu izvēle;
- PIN maiņa;
- aktīva statusa maiņa;
- datu pārbaude pirms dzēšanas;
- klientu dublikātu meklēšana.

### 7. Excel migrācija

- izmantot tikai oriģinālo veidni;
- izveidot vienu lauku-to-šūnas karti no `range_aprupe.txt`;
- ierakstīt tikai vērtības;
- pārbaudīt apvienotās šūnas un stilus;
- pārbaudīt Rīta/Vakara kolonnas;
- nepieļaut formatējuma rezerves failu.

### 8. Testēšana

Jāpārbauda:

- 1 klients;
- 100 klienti;
- tukšs dzimšanas datums;
- pilns klienta profils;
- atkārtots klikšķis;
- vērtības labojums;
- divi vienlaicīgi klikšķi;
- darbs bez interneta;
- interneta atjaunošanās;
- kontroliera login;
- Excel eksports;
- vecie dati ar nepareizu datumu;
- temperatūras sarkanā atzīme.

## 12. Galīgais lietotāja scenārijs

Aprūpētājs:

1. Ievada PIN.
2. Redz klientus uzreiz.
3. Ieraksta klienta vārdu.
4. Atver klientu.
5. Nospiež vajadzīgo aprūpes pogu.
6. Redz vērtību uzreiz.
7. Vajadzības gadījumā nomaina vērtību.
8. Redz vēsturi tabulā.
9. Parakstās ar savu uzvārdu.
10. Aizver klientu.

Viņam nav jāzina, kur dati glabājas, kā darbojas sinhronizācija vai kas ir API.

Vadība:

1. Atver paneli.
2. Redz šodienas kopsavilkumu.
3. Atrod klientu vai darbinieku.
4. Redz aktuālās vērtības.
5. Atver vēsturi.
6. Redz labotāju, laiku un iepriekšējo vērtību.
7. Lejupielādē Excel ar oriģinālo formatējumu.

## 13. Pogas un programmas saruna ar lietotāju

Poga nav dekorācija. Katrai pogai ir viena nozīme, viens rezultāts un saprotams nosaukums.

### Pogas noteikumi

- viena poga dara vienu lietu;
- pogas teksts pasaka, kas notiks pēc nospiešanas;
- `Saglabāt` saglabā, `Atpakaļ` atgriež, `Aizvērt` aizver, `Labot` labo;
- viena un tā pati darbība visā programmā saucas vienādi;
- izvēles pogai uzreiz mainās stāvoklis un krāsa;
- izvēlētajai vērtībai ir tikai viena atzīme;
- atkārtots klikšķis neveido dublikātu;
- darbība tiek bloķēta tikai uz klikšķa apstrādes brīdi;
- pēc klikšķa nav jāgaida un nav jāmin, vai saglabāšana notika;
- neveiksmīgas sinhronizācijas gadījumā ieraksts tomēr paliek saglabāts ierīcē;
- dzēšanas poga nekad nav blakus parastai saglabāšanas pogai bez skaidra apstiprinājuma.

### Programmas valoda

Programma runā vienkāršā, mierīgā un pareizā latviešu valodā. Aprūpētājam netiek rādīti:

- API;
- tokeni;
- HTTP kodi;
- `Failed to fetch`;
- `Offline` programmētāja nozīmē;
- datubāzes vai koda kļūdas;
- tehniski termini, kas nepalīdz izdarīt darbu.

Lietotājam tiek rādīts tikai tas, kas jādara:

- `Saglabāts`;
- `Saglabāts ierīcē, nosūtīsim vēlāk`;
- `Neizdevās nosūtīt, dati nav pazaudēti`;
- `Lūdzu, izvēlies vērtību`;
- `Dzimšanas datums nav norādīts`;
- `Nav ierakstu`.

Pēc darbības programmai jāatbild vizuāli, nevis tikai klusām jāmaina dati. Lietotājam vienmēr ir jāredz, kāds ir pašreizējais stāvoklis.

## 14. Apzināta un praktiska drošība

Šajā iestādes darba modelī administrators apzināti redz darbinieku PIN un paroles. Tas ir pieņemts darba organizācijas lēmums, jo administratoram jāspēj ātri palīdzēt aprūpētājam, atjaunot piekļuvi un nomainīt aizmirstus piekļuves datus.

Tas nozīmē:

- administratoram PIN un paroles ir redzamas administratora panelī;
- aprūpētājam nav jāatceras lietotājvārdi, e-pasti vai sarežģītas paroles;
- aprūpētājs izvēlas savu vārdu un ievada PIN;
- kontrolieris izmanto savu atsevišķo PIN;
- loma nosaka, ko katrs drīkst redzēt un mainīt;
- katra administratora piekļuves datu maiņa tiek reģistrēta;
- neaktīvu darbinieku nevar izmantot loginam;
- administrators nedrīkst nejauši mainīt klienta aprūpes vēsturi bez audita ieraksta.

Šajā projektā drošība nav veidota kā šķērslis ikdienas darbam. Tā ir pietiekama, saprotama un samērīga ar reālo darba vidi. Tehniskā aizsardzība paliek sistēmā, bet aprūpētājam netiek uzlikta lieka atbildība par tehnoloģiju.

## 15. Nekādu dublēšanos

Vienai funkcijai ir viena vieta, viens nosaukums un viens datu avots.

- klienta pamatdati tiek laboti vienā administrēšanas vietā;
- aktuālā aprūpes vērtība tiek glabāta vienā aktuālajā ierakstā;
- vēsture tiek glabāta tikai audita žurnālā;
- šķidruma un autiņbikšu dati tiek glabāti kā atsevišķi notikumi;
- dienas pabeigšana tiek glabāta atsevišķi no aprūpes atzīmēm;
- GUI nedrīkst rādīt divas vienādas pogas vienai darbībai;
- Google Sheets nedrīkst veidot jaunu aktuālo rindu katram labojumam;
- Excel fails nav otra datubāze, bet drukājams pārskats;
- kļūdas paziņojums nedrīkst atkārtoties vairākās vietās;
- vienu un to pašu klientu nedrīkst rādīt divas reizes bez skaidra iemesla.

Ja lietotājs redz divus līdzīgus elementus, sistēmai jāatbild, kāpēc tie atšķiras. Ja atšķirības nav, otrs elements jānoņem.

## 16. Oficiālā MK veidlapa un drukāšana

`Aprūpes lapas.xlsx` ir oficiālā MK noteikumu veidlapa. Tā nav dizaina paraugs, ko drīkst pārveidot, bet obligāts dokumenta formāts.

Arī `range_aprupe.txt` ir sistēmas tehniskā karte, kas nosaka, kurā veidlapas šūnā nonāk katra vērtība. Šie abi faili ir projekta pamats un paliek nemainīgi.

### Eksporta absolūtie noteikumi

- katram klientam tiek sagatavots atsevišķs fails;
- failā ir konkrētā klienta vārds un uzvārds;
- dati tiek ievietoti esošajā MK veidnē 1:1;
- tiek mainītas tikai paredzēto šūnu vērtības;
- netiek mainīts veidlapas dizains;
- netiek dzēstas vai pārbūvētas lapas;
- netiek mainītas apvienotās šūnas;
- netiek mainīti kolonnu platumi;
- netiek mainīti rindu augstumi;
- netiek mainīti fonti, apmales, krāsas vai drukas iestatījumi;
- tukšas vērtības neaizstāj veidnes formatējumu;
- temperatūra virs 37 tiek attēlota atbilstoši veidnes noteikumam;
- pirms lejupielādes sistēma pārbauda, ka veidne ir pieejama.

### Parastā mēneša izdruka

Katru mēnesi tiek sagatavota pilna klienta aprūpes lapa:

1. izvēlas klientu;
2. izvēlas mēnesi;
3. sistēma paņem šī klienta datus par šo mēnesi;
4. sistēma ievieto vērtības MK veidnē;
5. tiek lejupielādēts drukai gatavs fails ar klienta vārdu un uzvārdu.

### Slimnīca

Ja klients atrodas slimnīcā, sistēma ļauj sagatavot tikai faktiski sniegtā pakalpojuma periodu:

- no mēneša sākuma līdz aizbraukšanas datumam;
- no atgriešanās datuma līdz mēneša beigām;
- vai jebkuru lietotāja izvēlētu datumu intervālu.

Neaizpildītais slimnīcas periods netiek mākslīgi aizpildīts. Izdrukā jābūt skaidram periodam, par kuru iestāde faktiski sniedza aprūpi.

### Pakalpojuma beigas

Ja klients pamet pakalpojumu, sistēma ļauj sagatavot noslēguma izdruku:

- no mēneša sākuma līdz pēdējai aprūpes dienai;
- ar klienta vārdu un uzvārdu;
- ar visām līdz tam veiktajām atzīmēm;
- ar aprūpētāju parakstiem;
- ar skaidru beigu datumu.

Pēc pakalpojuma beigām klienta vēsturiskie dati netiek dzēsti. Klients kļūst neaktīvs, bet viņa dokumentācija paliek pieejama kontrolei un atkārtotai izdrukai.

### Drukas periods

Eksporta logā vienmēr jābūt skaidrai izvēlei:

- pilns mēnesis;
- izvēlēts datumu intervāls;
- līdz slimnīcas sākumam;
- no slimnīcas beigām;
- līdz pakalpojuma beigām.

Izdrukā nedrīkst sajaukt vairākus klientus vai vairākus pakalpojuma periodus vienā failā.

## 17. Obligātie kvalitātes vārti

Funkcija nav pabeigta, kamēr nav izturēti šie pārbaudes jautājumi:

- vai aprūpētājs saprot pogu bez paskaidrojuma;
- vai pēc viena klikšķa redzama pareizā vērtība;
- vai atkārtots klikšķis neveido dublikātu;
- vai labojot iepriekšējā vērtība paliek vēsturē;
- vai redzams, kas laboja un kad;
- vai bez interneta dati nepazūd;
- vai kļūdas ziņojums ir saprotams latviešu valodā;
- vai administrators var palīdzēt bez liekas konfigurēšanas;
- vai kontrolieris redz aktuālo stāvokli un vēsturi;
- vai ar 100 klientiem meklēšana un ekrāna darbības paliek tūlītējas;
- vai Excel fails saglabā MK veidlapas formatējumu;
- vai iespējams izdrukāt pilnu mēnesi, slimnīcas periodu un pakalpojuma beigu periodu;
- vai vienā vietā nav atkārtotu datu, pogu vai funkciju.

## 18. Pareizā arhitektūra šai iestādei

Šai sociālās aprūpes iestādei pareizākais bezmaksas risinājums ir vienkāršs trīs daļu modelis:

1. **GitHub Pages** ir programmas ekrāns. Tur atrodas HTML, CSS un JavaScript, ko lietotājs atver pārlūkā.
2. **Google Apps Script** ir tehniska datu vārteja starp programmu un Google Sheets. Lietotājs to neredz un nekonfigurē.
3. **Google Sheets** ir centrālā datubāze, kur glabājas klienti, darbinieki, aktuālās atzīmes, vēsture un dienas statuss.

Šis ir piemērots risinājums, jo:

- nav jāpērk serveris;
- nav jāmaksā par datubāzi;
- nav jāuztur atsevišķs dators 24 stundas diennaktī;
- Google nodrošina datu pieejamību un rezerves iespējas;
- iestāde var izmantot esošo Google ekosistēmu;
- aprūpētājiem ir viena vienkārša tīmekļa programma;
- oficiālā MK veidlapa paliek atsevišķi un nemainīgi saglabāta.

Tehniskā vārteja ir nepieciešama, lai GitHub Pages programma varētu droši sazināties ar Google Sheets. Tā nav papildu lieta, kas jālieto aprūpētājam.

## 19. Iestādes Wi-Fi un 24/7 darbība

Pamatdarbs notiek iestādes Wi-Fi tīklā. Ja šajā tīklā ir pieejams internets, programma var lasīt un rakstīt Google Sheets.

Tomēr profesionāli jānošķir divi jēdzieni:

- **programmas pieejamība 24/7:** lietotājs var atvērt programmu jebkurā laikā;
- **interneta pieejamība 24/7:** Wi-Fi, internets, Google vai ierīce nekad nepārtrūkst.

Otro nevar garantēt ar bezmaksas tīmekļa risinājumu. Tāpēc sistēmai jābūt noturīgai pret īslaicīgu pārtraukumu:

- klientu saraksts un šodienas dati tiek saglabāti ierīcē;
- aprūpētājs var turpināt darbu, ja uz brīdi nav interneta;
- katrs ieraksts tiek saglabāts lokāli ar precīzu ierīces laiku;
- sinhronizācija notiek automātiski, kad savienojums atjaunojas;
- lietotājam nav atkārtoti jāievada jau saglabāta informācija;
- sistēma nedrīkst veidot dublikātu, ja sinhronizācijas pieprasījums atkārtojas;
- redzams vienkāršs statuss: `Saglabāts`, `Nosūtīts`, `Gaida nosūtīšanu`.

Ja internets nav pieejams ilgāk, aprūpētājs turpina darbu. Administratoram un kontrolierim jāredz, ka konkrēti dati vēl nav nosūtīti uz Google Sheets.

## 20. Pilnīga kontrole un izsekojamība

Sociālās aprūpes sistēmā katram darbības ierakstam jāspēj atbildēt uz jautājumiem:

- kurš to izdarīja;
- kurš bija klients;
- kas tika izdarīts;
- kāda bija vērtība;
- kad tas notika pēc iestādes datuma;
- cikos tas notika pēc precīza laika;
- kurā maiņā tas notika;
- vai tas bija jauns ieraksts vai labojums;
- kāda bija iepriekšējā vērtība;
- kāda ir jaunā vērtība;
- kurš veica labojumu;
- kad tika veikts labojums;
- kāpēc tika veikts labojums;
- vai ieraksts ir nosūtīts uz centrālo datubāzi.

### Obligātie audita lauki

Katram aprūpes ierakstam un labojumam jābūt:

- unikālam ieraksta ID;
- klienta ID un klienta vārdam izdrukas skatā;
- darbinieka ID un darbinieka uzvārdam pārskata skatā;
- aprūpes datumam;
- faktiskajam notikuma laikam;
- maiņai: Rīts, Vakars vai cita noteiktā maiņa;
- kategorijai;
- laukam;
- jaunajai vērtībai;
- iepriekšējai vērtībai, ja notiek labojums;
- darbības tipam: `Jauns`, `Labots`, `Sinhronizēts`;
- labojuma iemeslam, ja mainīta jau saglabāta vērtība;
- izveidošanas laikam;
- pēdējās izmaiņas laikam.

Iemesla laukam jābūt īsam un saprotamam, piemēram:

- `Kļūdaini nospiesta poga`;
- `Nepareizi ievadīts daudzums`;
- `Mainījās klienta stāvoklis`;
- `Labots pēc pārbaudes`;
- `Cits`.

Ja konkrētam ierakstam iemesls nav nepieciešams, sistēma to neprasa. Ja tiek mainīta oficiāli nozīmīga vērtība vai jau pabeigta diena, iemesls ir obligāts.

## 21. Tiesības iestādes darba modelī

Tiesības tiek veidotas pēc principa “katram tikai tas, kas vajadzīgs darbam”.

### Aprūpētājs

- redz aktīvos klientus;
- redz klienta aprūpei nepieciešamos pamatdatus;
- ievada un labo aprūpes atzīmes atbilstoši noteiktajai kārtībai;
- redz savas darbības rezultātu;
- nevar mainīt sistēmas lietotājus;
- nevar dzēst vēsturi;
- nevar mainīt oficiālās veidnes.

### Kontrolieris

- redz klientu aprūpes stāvokli;
- redz aktuālos ierakstus;
- redz pilnu audita vēsturi;
- redz labotāju, laiku, iepriekšējo un jauno vērtību;
- redz nepabeigtos un nesinhronizētos ierakstus;
- var sagatavot pārskatus un izdrukas;
- nevar nemanāmi mainīt aprūpes datus.

### Administrators

- pārvalda lietotājus, PIN, paroles un lomas;
- apzināti redz darbinieku PIN un paroles, jo tas ir iestādes darba organizācijas lēmums;
- redz sistēmas statusu un sinhronizācijas problēmas;
- pārvalda klientu pamatdatus;
- drīkst veikt administratīvus labojumus tikai ar pilnu audita ierakstu;
- nedrīkst dzēst vēsturiskus aprūpes faktus.

## 22. Google Sheets darba kārtība

Google Sheets nav paredzēts ikdienas manuālai datu labošanai. Ikdienas darbs notiek programmā.

Google Sheets tiek izmantots:

- datu glabāšanai;
- vadības pārbaudei;
- rezerves kopijām;
- tehniskai datu atjaunošanai ārkārtas situācijā;
- Excel un MK veidlapas datu sagatavošanai.

Lapas nav jāapvieno vienā lielā tabulā. Katrai lapai ir viena loma:

- `klienti` ir klientu pamatdati;
- `darbinieki` ir lietotāju dati;
- `atzimes` ir aktuālais stāvoklis;
- `atzimes_log` ir nemaināma vēsture;
- `dienas_ierakti` ir dienas statuss;
- MK veidne ir drukājams dokuments, nevis datubāzes lapa.

## 23. Darbības nepārtrauktība

Ja kaut kas tehniski nedarbojas, aprūpes darbs nedrīkst apstāties.

Sistēmai jābūt šādai kārtībai:

1. Programma mēģina saglabāt ierakstu ierīcē.
2. Lietotājs uzreiz redz, ka ieraksts ir saglabāts.
3. Programma mēģina nosūtīt ierakstu uz Google Sheets.
4. Ja nosūtīšana neizdodas, ieraksts paliek rindā nosūtīšanai.
5. Savienojumam atjaunojoties, programma mēģina vēlreiz.
6. Ja problēma turpinās, to redz administrators, nevis aprūpētājs tehniska kļūdas teksta veidā.
7. Neviens ieraksts netiek dzēsts tikai tāpēc, ka nav interneta.

Reizi noteiktā periodā administratoram jāpārbauda:

- vai Google Sheets ir pieejams;
- vai nav nenosūtītu ierakstu;
- vai rezerves kopija ir izveidota;
- vai var atvērt un izdrukāt iepriekšējo mēnesi;
- vai lietotāji ar pareizajām lomām var ielogoties.

## 24. Īsais pareizās sistēmas modelis

Aprūpētājs redz tikai vienkāršu programmu.

Google Sheets glabā datus.

GitHub Pages rāda ekrānu.

Google Apps Script savieno abas puses.

Iestādes Wi-Fi nodrošina ikdienas piekļuvi internetam.

Lokālā saglabāšana aizsargā darbu pārtraukuma laikā.

Kontrolieris redz pilnu patiesību par notikumiem.

Administrators var palīdzēt lietotājiem un redz piekļuves datus, kā to prasa iestādes darba modelis.

MK veidlapa un `range_aprupe.txt` paliek nemainīgi un nodrošina juridiski vajadzīgo 1:1 izdruku.

Tas ir pietiekami vienkāršs, bezmaksas un uzturams risinājums, ja datu loģika tiek ieviesta konsekventi un netiek jaukta aktuālā vērtība ar vēsturi.

## 25. Galvenais secinājums

Ideālā sistēma nav tā, kurā ir visvairāk tehnoloģiju. Tā ir sistēma, kurā aprūpētājs izdara pareizo darbību bez liekiem jautājumiem, vadība redz patiesu ainu un katrs ieraksts ir izsekojams.

Google Sheets var palikt kā bezmaksas centrālā datu vieta. Programmai jābūt lokālai, ātrai un vienkāršai. Tehniskā sinhronizācija jāpaslēpj fonā. Aktuālā vērtība jāatdala no vēstures, labojumiem jābūt normāliem, un Excel jāaizpilda tikai ar vērtībām, saglabājot oriģinālo veidni.
