const fs = require('fs');
const XLSX = require('xlsx');

console.log('=== Final Excel Export Test ===\n');

const wb = XLSX.readFile('Aprūpes lapas.xlsx');

const FIELD_ROWS_S1 = {};
for (let r = 9; r <= 31; r++) FIELD_ROWS_S1[r] = r;
const FIELD_ROWS_S2 = {};
for (let r = 9; r <= 31; r++) FIELD_ROWS_S2[r] = r - 5;

const marks = [
  { date: '2026-09-01', shift: 'R', category: 'temp', field: 'temperatura', value: '36.6' },
  { date: '2026-09-01', shift: 'V', category: 'temp', field: 'temperatura', value: '36.8' },
  { date: '2026-09-01', shift: 'R', category: 'edinasana', field: 'brokastis', value: 'X' },
  { date: '2026-09-01', shift: 'R', category: 'higiena', field: 'mutes_dobuma_kopsana', value: 'X' },
  { date: '2026-09-01', shift: 'R', category: 'paraksts', field: 'aprupetaja_paraksts', value: 'Bērziņš' },
  { date: '2026-09-15', shift: 'R', category: 'temp', field: 'temperatura', value: '37.5' },
  { date: '2026-09-15', shift: 'V', category: 'edinasana', field: 'vakariņi', value: '½' },
  { date: '2026-09-16', shift: 'R', category: 'temp', field: 'temperatura', value: '36.9' },
  { date: '2026-09-30', shift: 'R', category: 'paraksts', field: 'aprupetaja_paraksts', value: 'Bērziņš' },
  { date: '2026-09-31', shift: 'R', category: 'paraksts', field: 'aprupetaja_paraksts', value: 'Bērziņš' }
];

const rowMap = {
  'temp|temperatura': 9,
  'higiena|mutes_dobuma_kopsana': 10,
  'higiena|vana_dns': 11,
  'higiena|daleja_apmazgasana': 12,
  'higiena|velas_maina': 13,
  'higiena|nagu_kopsana': 14,
  'higiena|matu_kopsana': 15,
  'higiena|bardas_skushana': 16,
  'aktivitate|parvietojas_ar_palidzlekli': 17,
  'aktivitate|stav_ar_palidziigu': 18,
  'aktivitate|sedz_ar_palidziigu': 19,
  'edinasana|brokastis': 20,
  'edinasana|pusdienas': 21,
  'edinasana|launags': 22,
  'edinasana|vakariņi': 23,
  'sikdrumi|urina_daudzums': 24,
  'sikdrumi|uznemts_ml': 25,
  'citsi_pasakomi|adas_kopsana': 26,
  'fiziologija|vedera_izeja': 27,
  'citsi_pasakomi|pastaigas': 28,
  'citsi_pasakomi|ciemini': 29,
  'citsi_pasakomi|autins_biksitu_skaits': 30,
  'paraksts|aprupetaja_paraksts': 31
};

const sheet1 = wb.Sheets['APRŪPES DOKUMANTĀCIJA_1'];
const sheet2 = wb.Sheets['APRŪPES DOKUMANTĀCIJA_2'];

marks.forEach(m => {
  const day = parseInt(m.date.split('-')[2]);
  const isSheet1 = day <= 15;
  const startDay = isSheet1 ? 1 : 16;
  const targetRow = isSheet1 ? FIELD_ROWS_S1[rowMap[m.category + '|' + m.field]] : FIELD_ROWS_S2[rowMap[m.category + '|' + m.field]];
  const dayOffset = day - startDay;
  const col = 2 + dayOffset * 2 + (m.shift === 'V' ? 1 : 0);
  const ws = isSheet1 ? sheet1 : sheet2;
  const addr = XLSX.utils.encode_cell({ r: targetRow - 1, c: col });
  ws[addr] = { t: 's', v: m.value };
  console.log('Day ' + day + ' ' + m.shift + ' ' + m.category + '/' + m.field + ' -> sheet' + (isSheet1?1:2) + ' ' + XLSX.utils.encode_col(col) + targetRow + ' = ' + m.value);
});

XLSX.writeFile(wb, 'final_test.xlsx');
console.log('\nWritten to final_test.xlsx');

const wb2 = XLSX.readFile('final_test.xlsx');
const checks = [
  { sheet: 'APRŪPES DOKUMANTĀCIJA_1', cell: 'C9', expected: '36.6', label: 'Day 1 R temp' },
  { sheet: 'APRŪPES DOKUMANTĀCIJA_1', cell: 'D9', expected: '36.8', label: 'Day 1 V temp' },
  { sheet: 'APRŪPES DOKUMANTĀCIJA_1', cell: 'C10', expected: 'X', label: 'Day 1 R mutes' },
  { sheet: 'APRŪPES DOKUMANTĀCIJA_1', cell: 'C20', expected: 'X', label: 'Day 1 R brokastis' },
  { sheet: 'APRŪPES DOKUMANTĀCIJA_1', cell: 'C31', expected: 'Bērziņš', label: 'Day 1 R paraksts' },
  { sheet: 'APRŪPES DOKUMANTĀCIJA_1', cell: 'AE9', expected: '37.5', label: 'Day 15 R temp (high)' },
  { sheet: 'APRŪPES DOKUMANTĀCIJA_1', cell: 'AF23', expected: '½', label: 'Day 15 V vakariņas' },
  { sheet: 'APRŪPES DOKUMANTĀCIJA_2', cell: 'C4', expected: '36.9', label: 'Day 16 R temp' },
  { sheet: 'APRŪPES DOKUMANTĀCIJA_2', cell: 'AE26', expected: 'Bērziņš', label: 'Day 30 R paraksts' },
  { sheet: 'APRŪPES DOKUMANTĀCIJA_2', cell: 'AG26', expected: 'Bērziņš', label: 'Day 31 R paraksts' }
];

let passed = 0;
let failed = 0;
checks.forEach(c => {
  const cell = wb2.Sheets[c.sheet][c.cell];
  const value = cell ? cell.v : 'UNDEFINED';
  if (value === c.expected) {
    console.log('  ✓ ' + c.label + ' (' + c.cell + ') = ' + value);
    passed++;
  } else {
    console.log('  ✗ ' + c.label + ' (' + c.cell + ') = ' + value + ' (expected ' + c.expected + ')');
    failed++;
  }
});

console.log('\n=== Results: ' + passed + ' passed, ' + failed + ' failed ===');
if (failed === 0) console.log('✅ ALL EXCEL EXPORT TESTS PASSED');
else console.log('❌ Some tests failed');
