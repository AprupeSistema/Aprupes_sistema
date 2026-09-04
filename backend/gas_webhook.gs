const SHEET_ID = '1GjwMhuMzRzYOZ3o3nEo5LvKOCfTxGlgepS56n4wECbU';

function getSpreadsheet() {
  return SpreadsheetApp.openById(SHEET_ID);
}

function getSheetData(sheet) {
  if (!sheet) return [];
  const lastRow = sheet.getLastRow();
  const lastCol = sheet.getLastColumn();
  if (lastRow === 0 || lastCol === 0) return [];
  const range = sheet.getRange(1, 1, lastRow, lastCol);
  const values = range.getValues();
  if (values.length === 0) return [];
  const headers = values[0];
  const rows = [];
  for (let i = 1; i < values.length; i++) {
    const row = {};
    let hasData = false;
    for (let j = 0; j < headers.length; j++) {
      if (values[i][j] !== '' && values[i][j] !== null && values[i][j] !== undefined) {
        hasData = true;
      }
      row[headers[j].toString().toLowerCase().replace(/ /g, '_')] = values[i][j];
    }
    if (hasData) rows.push(row);
  }
  return rows;
}

function appendRow(sheet, data) {
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  const row = new Array(headers.length).fill('');
  headers.forEach((h, i) => {
    const key = h.toString().toLowerCase().replace(/ /g, '_');
    if (data[key] !== undefined) row[i] = data[key];
  });
  sheet.appendRow(row);
}

function findRow(sheet, conditions) {
  if (!sheet) return null;
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return null;
  const range = sheet.getRange(1, 1, lastRow, sheet.getLastColumn());
  const values = range.getValues();
  const headers = values[0];
  const colMap = {};
  headers.forEach((h, i) => { colMap[h.toString().toLowerCase().replace(/ /g, '_')] = i; });
  for (let i = 1; i < values.length; i++) {
    let match = true;
    for (const [field, value] of conditions) {
      const colIdx = colMap[field];
      if (colIdx === undefined || String(values[i][colIdx]) !== String(value)) {
        match = false;
        break;
      }
    }
    if (match) return { row: i + 1, data: values[i], headers: headers };
  }
  return null;
}

function setCellValue(sheet, rowNum, field, value) {
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  const colMap = {};
  headers.forEach((h, i) => { colMap[h.toString().toLowerCase().replace(/ /g, '_')] = i; });
  const colIdx = colMap[field];
  if (colIdx !== undefined) {
    sheet.getRange(rowNum, colIdx + 1).setValue(value);
  }
}

function doGet(e) {
  try {
    const action = e && e.parameter && e.parameter.action;
    if (action === 'load') {
      return handleLoadInitial();
    }
    return createResponse(400, { error: 'Nezināma darbība: ' + action });
  } catch (err) {
    return createResponse(500, { error: err.toString() });
  }
}

function doPost(e) {
  try {
    let data;
    if (e && e.postData && e.postData.contents) {
      data = JSON.parse(e.postData.contents);
    } else if (e && e.parameter && e.parameter.data) {
      data = JSON.parse(e.parameter.data);
    } else {
      return createResponse(400, { error: 'Nav datu' });
    }
    return routeAction(data);
  } catch (err) {
    return createResponse(500, { error: err.toString() });
  }
}

function routeAction(data) {
  const action = data.action;
  switch (action) {
    case 'createClient': return handleCreateClient(data);
    case 'createEmployee': return handleCreateEmployee(data);
    case 'mark': return handleMark(data);
    case 'updateClient': return handleUpdate(data, 'klienti');
    case 'updateEmployee': return handleUpdate(data, 'darbinieki');
    default: return createResponse(200, { success: true });
  }
}

function handleLoadInitial() {
  const ss = getSpreadsheet();
  return createResponse(200, {
    darbinieki: getSheetData(ss.getSheetByName('darbinieki')),
    klienti: getSheetData(ss.getSheetByName('klienti')),
    atzimes: getSheetData(ss.getSheetByName('atzimes')),
    atzimes_log: getSheetData(ss.getSheetByName('atzimes_log')),
    dienas_ierakti: getSheetData(ss.getSheetByName('dienas_ierakti')),
    uzdevomi: getSheetData(ss.getSheetByName('uzdevomi'))
  });
}

function handleCreateClient(data) {
  const ss = getSpreadsheet();
  const sheet = ss.getSheetByName('klienti');
  const newId = 'c_' + Date.now();
  appendRow(sheet, {
    id: newId,
    vards: data.data.vards,
    uzvards: data.data.uzvards,
    dzimis: data.data.dzimis || '',
    dieta: data.data.dieta || '',
    saskarsmes: data.data.saskarsmes || '',
    aktivs: true
  });
  return createResponse(200, { success: true, id: newId });
}

function handleCreateEmployee(data) {
  const ss = getSpreadsheet();
  const sheet = ss.getSheetByName('darbinieki');
  const newId = 'e_' + Date.now();
  appendRow(sheet, {
    id: newId,
    vards: data.data.vards,
    uzvards: data.data.uzvards,
    loma: data.data.loma,
    pin: data.data.pin,
    aktivs: true,
    parole: data.data.parole || ''
  });
  return createResponse(200, { success: true, id: newId });
}

function handleUpdate(data, sheetName) {
  const ss = getSpreadsheet();
  const sheet = ss.getSheetByName(sheetName);
  const row = findRow(sheet, [['id', data.data.id]]);
  if (!row) return createResponse(404, { error: 'Nav atrasts' });
  Object.keys(data.data).forEach(f => {
    if (f !== 'id' && data.data[f] !== undefined) setCellValue(sheet, row.row, f, data.data[f]);
  });
  return createResponse(200, { success: true });
}

function handleMark(data) {
  const ss = getSpreadsheet();
  const atzimesSheet = ss.getSheetByName('atzimes');
  const logSheet = ss.getSheetByName('atzimes_log');
  const m = data.data;
  const today = m.date || Utilities.formatDate(new Date(), ss.getSpreadsheetTimeZone(), 'yyyy-MM-dd');
  const newId = 'm_' + Date.now();
  const nowStr = Utilities.formatDate(new Date(), ss.getSpreadsheetTimeZone(), 'yyyy-MM-dd HH:mm:ss');

  appendRow(atzimesSheet, {
    id: newId,
    klients_id: m.clientId,
    darbinieks_id: m.employeeId,
    datums: today,
    periods: m.shift || 'R',
    kategorija: m.category,
    lauka_nosaukums: m.field,
    vērtība: m.value,
    pēdējā_vērtība: m.value,
    pēdējais_laiks: nowStr,
    darbinieks_pēdējais: m.employeeId
  });

  appendRow(logSheet, {
    id: 'l_' + Date.now(),
    atzimes_id: newId,
    klients_id: m.clientId,
    darbinieks_id: m.employeeId,
    datums: today,
    laiks: new Date().toTimeString().split(' ')[0],
    periods: m.shift || 'R',
    kategorija: m.category,
    lauka_nosaukums: m.field,
    vērtība: m.value,
    papilgs_info: '',
    izveidots: nowStr
  });

  return createResponse(200, { success: true, id: newId });
}

function createResponse(status, data) {
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}
