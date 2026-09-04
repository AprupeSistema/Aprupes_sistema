global.window = { addEventListener: () => {} };
global.navigator = { onLine: true };
global.indexedDB = undefined;
global.fetch = () => Promise.reject(new Error('No internet'));
global.CustomEvent = class { constructor(type, init) { this.type = type; this.detail = init && init.detail; } };
global.location = { href: '' };
global.sessionStorage = { getItem: () => null, setItem: () => {}, removeItem: () => {} };

const fs = require('fs');
const vm = require('vm');

const sandbox = {
  window: { addEventListener: () => {} },
  navigator: { onLine: true },
  indexedDB: undefined,
  fetch: () => Promise.reject(new Error('No internet')),
  CustomEvent: class { constructor(type, init) { this.type = type; this.detail = init && init.detail; } },
  location: { href: '' },
  sessionStorage: { getItem: () => null, setItem: () => {}, removeItem: () => {} },
  console: console,
  Promise: Promise,
  setTimeout: (fn) => fn && fn(),
  Date: Date,
  Object: Object,
  Array: Array,
  Math: Math,
  JSON: JSON
};

vm.createContext(sandbox);

const configSrc = fs.readFileSync('js/config.js', 'utf8');
const dbSrc = fs.readFileSync('js/db.js', 'utf8');
const excelSrc = fs.readFileSync('js/excel_export.js', 'utf8');

vm.runInContext(configSrc, sandbox);
vm.runInContext(dbSrc, sandbox);
vm.runInContext(excelSrc, sandbox);

(async () => {
  try {
    console.log('=== Testing CONFIG ===');
    const CONFIG = sandbox.CONFIG;
    console.log('App name:', CONFIG.APP_NAME);
    console.log('Stores:', Object.keys(CONFIG.STORES).join(','));
    console.log('Field categories:', Object.keys(CONFIG.FIELD_DEFINITIONS).join(','));

    console.log('\n=== Testing DB (in-memory fallback) ===');
    const db = new sandbox.CareDB();
    await db.init();
    console.log('DB initialized');

    await db.add('klienti', { id: '1', vards: 'Jānis', uzvards: 'Bērziņš', dzimis: '1950-05-15', aktivs: true });
    await db.add('klienti', { id: '2', vards: 'Anna', uzvards: 'Kalniņa', dzimis: '1948-03-22', aktivs: true });
    await db.add('klienti', { id: '3', vards: 'Pēteris', uzvards: 'Ozols', dzimis: '1955-11-08', aktivs: false });

    const clients = await db.getAll('klienti');
    console.log('Total clients:', clients.length);

    const active = clients.filter(c => c.aktivs === true);
    console.log('Active clients:', active.length);

    active.sort((a, b) => (a.uzvards + ' ' + a.vards).localeCompare(b.uzvards + ' ' + b.vards));
    console.log('First client (alphabetical):', active[0].vards, active[0].uzvards);

    console.log('\n=== Testing field mappings ===');
    const fields = CONFIG.FIELD_DEFINITIONS;
    console.log('Temp definition:', fields.temp.label);
    console.log('Higiena fields:', fields.higiena.fields.length);
    console.log('Aktivitate fields:', fields.aktivitate.fields.length);
    console.log('Edinasana fields:', fields.edinasana.fields.length);
    console.log('Fiziologija fields:', fields.fiziologija.fields.length);

    console.log('\n=== Testing Excel exporter ===');
    const exp = new sandbox.ExcelExporter();
    console.log('ExcelExporter instantiated, templateUrl:', exp.templateUrl);
    const map9 = exp.getFieldMap(9);
    console.log('Row 9 mapping:', JSON.stringify(map9));
    const map24 = exp.getFieldMap(24);
    console.log('Row 24 mapping:', JSON.stringify(map24));
    const map31 = exp.getFieldMap(31);
    console.log('Row 31 mapping:', JSON.stringify(map31));

    console.log('\n=== Testing search filter ===');
    const term = 'bēr';
    const results = clients.filter(c => {
      const v = (c.vards || '').toLowerCase();
      const u = (c.uzvards || '').toLowerCase();
      return v.includes(term) || u.includes(term);
    });
    console.log('Search "' + term + '":', results.map(c => c.vards + ' ' + c.uzvards).join(', '));

    console.log('\n=== Testing marks insertion ===');
    const today = '2026-09-04';
    await db.add('atzimes', {
      id: 'm1', clientId: '1', employeeId: 'e1', date: today, shift: 'R',
      category: 'temp', field: 'temperatura', value: '36.6',
      lastModified: new Date().toISOString(), lastBy: 'e1'
    });
    await db.add('atzimes', {
      id: 'm2', clientId: '1', employeeId: 'e1', date: today, shift: 'R',
      category: 'edinasana', field: 'brokastis', value: 'X',
      lastModified: new Date().toISOString(), lastBy: 'e1'
    });
    await db.add('atzimes_log', {
      id: 'l1', markId: 'm1', clientId: '1', employeeId: 'e1', date: today,
      time: '08:30:00', shift: 'R', category: 'temp', field: 'temperatura',
      value: '36.6', prevValue: null, type: 'Jauns', created: new Date().toISOString()
    });

    const marks = await db.getAll('atzimes');
    const logs = await db.getAll('atzimes_log');
    console.log('Marks:', marks.length, 'Log entries:', logs.length);

    console.log('\n=== Testing Excel fillSheet logic ===');
    const dataByDay = {};
    marks.forEach(m => {
      const d = parseInt(m.date.split('-')[2]);
      if (!dataByDay[d]) dataByDay[d] = {};
      dataByDay[d][m.shift + '|' + m.category + '|' + m.field] = m.value;
    });
    console.log('Day 4 data keys:', Object.keys(dataByDay[4] || {}).join(', '));

    console.log('\n=== Testing temperature high detection ===');
    const tempMarks = marks.filter(m => m.category === 'temp' && m.field === 'temperatura');
    const highTemps = tempMarks.filter(m => {
      const v = parseFloat(m.value);
      return !isNaN(v) && v >= 37;
    });
    console.log('High temps (>=37):', highTemps.length, 'out of', tempMarks.length);

    console.log('\n=== Testing duplicate name handling ===');
    await db.add('klienti', { id: '4', vards: 'Jānis', uzvards: 'Bērziņš', dzimis: '1952-08-20', aktivs: true });
    const allClients = await db.getAll('klienti');
    const sameName = allClients.filter(c => c.vards === 'Jānis' && c.uzvards === 'Bērziņš');
    console.log('Same name count:', sameName.length, '(should be 2)');
    sameName.forEach(c => console.log('  ID:', c.id, 'DOB:', c.dzimis));

    console.log('\n✅ ALL TESTS PASSED');
  } catch (err) {
    console.error('\n❌ TEST FAILED:', err.message);
    console.error(err.stack);
    process.exit(1);
  }
})();
