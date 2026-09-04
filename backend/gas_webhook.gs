/**
 * Google Apps Script – Aprūpes sistēmas tehniskā vārteja
 * Saturu pārvalda: darbinieki, klienti, atzimes, atzimes_log, dienas_ierakti
 */

const SHEET_ID = '';
const ALLOWED_ORIGINS = ['https://YOUR_GITHUB_PAGES_URL'];

function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);
    const action = data.action;

    switch (action) {
      case 'mark':
        return handleMark(data);
      case 'createClient':
        return handleCreateClient(data);
      case 'createEmployee':
        return handleCreateEmployee(data);
      case 'updateClient':
        return handleUpdateClient(data);
      case 'updateEmployee':
        return handleUpdateEmployee(data);
      case 'createTask':
        return handleCreateTask(data);
      case 'logDay':
        return handleLogDay(data);
      default:
        return createResponse(400, { error: 'Nezināma darbība' });
    }
  } catch (err) {
    console.error('doPost error:', err);
    return createResponse(500, { error: err.toString() });
  }
}

function doGet(e) {
  const action = e.parameter.action;

  switch (action) {
    case 'load':
      return handleLoadInitial();
    case 'getLog':
      return handleGetLog(e.parameter);
    case 'getStats':
      return handleGetStats(e.parameter);
    case 'getAudit':
      return handleGetAudit(e.parameter);
    case 'getTemplate':
      return handleGetTemplate();
    case 'getPending':
      return handleGetPending();
    default:
      return createResponse(400, { error: 'Nezināma darbība' });
  }
}

function handleMark(data) {
  const ss = SpreadsheetApp.openById(SHEET_ID);
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);

  try {
    const atzimesSheet = ss.getSheetByName('atzimes');
    const logSheet = ss.getSheetByName('atzimes_log');
    const log = [];

    const clientId = data.clientId;
    const employeeId = data.employeeId;
    const date = data.date || Utilities.formatDate(new Date(), ss.getSpreadsheetTimeZone(), 'yyyy-MM-dd');
    const shift = data.shift || 'R';
    const field = data.field;
    const newValue = data.value;
    const reason = data.reason || null;

    if (!clientId || !employeeId || !field) {
      return createResponse(400, { error: 'Trūkst informācija' });
    }

    const existing = findRow(atzimesSheet, [
      ['clientId', clientId],
      ['date', date],
      ['shift', shift],
      ['field', field]
    ]);

    const now = new Date();
    const nowStr = Utilities.formatDate(now, ss.getSpreadsheetTimeZone(), 'yyyy-MM-dd HH:mm:ss');

    if (existing) {
      const rowData = getRowData(atzimesSheet, existing.row);
      const oldValue = rowData['value'] || null;

      setCellValue(atzimesSheet, existing.row, 'value', newValue);
      setCellValue(atzimesSheet, existing.row, 'lastModified', nowStr);
      setCellValue(atzimesSheet, existing.row, 'lastBy', employeeId);

      const prevValue = rowData['prevValue'] || null;
      log.push({
        id: Utilities.getUuid(),
        markId: rowData['id'],
        clientId: clientId,
        employeeId: employeeId,
        date: date,
        time: nowStr.split(' ')[1],
        shift: shift,
        category: data.category,
        field: field,
        value: newValue,
        prevValue: oldValue,
        reason: reason,
        type: 'Labots'
      });
    } else {
      const newId = Utilities.getUuid();
      const row = {
        id: newId,
        clientId: clientId,
        employeeId: employeeId,
        date: date,
        shift: shift,
        category: data.category,
        field: field,
        value: newValue,
        lastValue: '',
        lastModified: nowStr,
        lastBy: employeeId
      };
      appendRow(atzimesSheet, row);

      log.push({
        id: Utilities.getUuid(),
        markId: newId,
        clientId: clientId,
        employeeId: employeeId,
        date: date,
        time: nowStr.split(' ')[1],
        shift: shift,
        category: data.category,
        field: field,
        value: newValue,
        prevValue: null,
        reason: reason,
        type: 'Jauns'
      });
    }

    log.forEach(entry => appendRow(logSheet, entry));

    return createResponse(200, { success: true, log: log });
  } finally {
    lock.releaseLock();
  }
}

function handleLoadInitial() {
  try {
    const ss = SpreadsheetApp.openById(SHEET_ID);
    const result = {};

    result.darbinieki = getSheetData(ss.getSheetByName('darbinieki'));
    result.klienti = getSheetData(ss.getSheetByName('klienti'));
    result.atzimes = getSheetData(ss.getSheetByName('atzimes'));
    result.atzimes_log = getSheetData(ss.getSheetByName('atzimes_log'));
    result.dienas_ierakti = getSheetData(ss.getSheetByName('dienas_ierakti'));
    result.uzdevomi = getSheetData(ss.getSheetByName('uzdevomi'));

    return createResponse(200, result);
  } catch (err) {
    console.error('handleLoad error:', err);
    return createResponse(500, { error: err.toString() });
  }
}

function handleGetLog(params) {
  try {
    const ss = SpreadsheetApp.openById(SHEET_ID);
    const logSheet = ss.getSheetByName('atzimes_log');
    const clientId = params.clientId || null;
    const date = params.date || null;
    const category = params.category || null;
    const employeeId = params.employeeId || null;
    const onlyEdited = params.onlyEdited === 'true';

    let data = getSheetData(logSheet);

    if (clientId) data = data.filter(r => r.clientId === clientId);
    if (date) data = data.filter(r => r.date === date);
    if (category) data = data.filter(r => r.category === category);
    if (employeeId) data = data.filter(r => r.employeeId === employeeId);
    if (onlyEdited) data = data.filter(r => r.type === 'Labots' || r.type === 'Labots kļūdaini');

    data.sort((a, b) => new Date(b.date + ' ' + b.time) - new Date(a.date + ' ' + a.time));

    return createResponse(200, { log: data });
  } catch (err) {
    return createResponse(500, { error: err.toString() });
  }
}

function handleGetStats(params) {
  try {
    const ss = SpreadsheetApp.openById(SHEET_ID);
    const date = params.date || Utilities.formatDate(new Date(), ss.getSpreadsheetTimeZone(), 'yyyy-MM-dd');
    const clientId = params.clientId || null;

    const atzimes = getSheetData(ss.getSheetByName('atzimes'));
    const dayMarks = atzimes.filter(a => a.date === date);

    const klienti = getSheetData(ss.getSheetByName('klienti'));
    const activeClients = klienti.filter(k => k.aktivs !== false && k.aktivs !== 'false' && k.aktivs !== 0);

    const stats = {
      totalClients: activeClients.length,
      tempHigh: dayMarks.filter(m => m.category === 'temp' && parseFloat(m.value) >= 37).length,
      nutrition: {
        brokastis: dayMarks.filter(m => m.category === 'edinasana' && m.field === 'brokastis').length,
        pusdienas: dayMarks.filter(m => m.category === 'edinasana' && m.field === 'pusdienas').length,
        launags: dayMarks.filter(m => m.category === 'edinasana' && m.field === 'launags').length,
        vakariņi: dayMarks.filter(m => m.category === 'edinasana' && m.field === 'vakariņi').length
      },
      fluid: {
        intake: dayMarks.filter(m => m.category === 'sikdrumi' && m.field === 'uznemts_ml').reduce((s, m) => s + (parseFloat(m.value) || 0), 0),
        urine: dayMarks.filter(m => m.category === 'sikdrumi' && m.field === 'urina_daudzums').reduce((s, m) => s + (parseFloat(m.value) || 0), 0)
      },
      bowel: {
        normal: dayMarks.filter(m => m.field === 'vedera_izeja' && m.value === 'N').length,
        constipated: dayMarks.filter(m => m.field === 'vedera_izeja' && m.value === 'A').length,
        diarrhea: dayMarks.filter(m => m.field === 'vedera_izeja' && m.value === 'C').length
      },
      visits: dayMarks.filter(m => m.category === 'citsi_pasakomi' && m.field === 'ciemini').length,
      bedChanges: dayMarks.filter(m => m.category === 'citsi_pasakomi' && m.field === 'autins_biksitu_skaits').reduce((s, m) => s + (parseInt(m.value) || 0), 0),
      completed: dayMarks.filter(m => m.category === 'paraksts').length,
      edits: dayMarks.filter(m => false).length
    };

    const log = getSheetData(ss.getSheetByName('atzimes_log'));
    const todayLog = log.filter(l => l.date === date);
    stats.edits = todayLog.filter(l => l.type === 'Labots').length;

    const lastEdit = todayLog.length > 0 ? todayLog[todayLog.length - 1] : null;
    stats.lastEditor = lastEdit ? lastEdit.employeeId : '';

    return createResponse(200, { stats: stats, date: date });
  } catch (err) {
    return createResponse(500, { error: err.toString() });
  }
}

function handleGetAudit(params) {
  try {
    const ss = SpreadsheetApp.openById(SHEET_ID);
    const logSheet = ss.getSheetByName('atzimes_log');
    let data = getSheetData(logSheet);

    const clientId = params.clientId;
    const date = params.date;
    if (clientId) data = data.filter(r => r.clientId === clientId);
    if (date) data = data.filter(r => r.date === date);

    const darbinieki = getSheetData(ss.getSheetByName('darbinieki'));
    const empMap = {};
    darbinieki.forEach(d => empMap[d.id] = d);

    data.forEach(entry => {
      const emp = empMap[entry.employeeId];
      if (emp) entry.employeeName = emp.uzvards;
    });

    return createResponse(200, { log: data });
  } catch (err) {
    return createResponse(500, { error: err.toString() });
  }
}

function handleGetTemplate() {
  try {
    const folder = DriveApp.getFileById(SHEET_ID).getParents().next();
    const templateId = '';

    return createResponse(200, {
      templateId: templateId,
      sheets: ['APRŪPES DOKUMANTĀCIJA_1', 'APRŪPES DOKUMANTĀCIJA_2']
    });
  } catch (err) {
    return createResponse(500, { error: err.toString() });
  }
}

function handleGetPending() {
  return createResponse(200, { pending: 0 });
}

function handleCreateClient(data) {
  const ss = SpreadsheetApp.openById(SHEET_ID);
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);

  try {
    const sheet = ss.getSheetByName('klienti');
    const newId = Utilities.getUuid();
    appendRow(sheet, {
      id: newId,
      vards: data.vards,
      uzvards: data.uzvards,
      dzimis: data.dzimis,
      dieta: data.dieta || '',
      saskarsmes: data.saskarsmes || '',
      aktivs: true
    });
    return createResponse(200, { success: true, id: newId });
  } finally {
    lock.releaseLock();
  }
}

function handleCreateEmployee(data) {
  const ss = SpreadsheetApp.openById(SHEET_ID);
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);

  try {
    const sheet = ss.getSheetByName('darbinieki');
    const newId = Utilities.getUuid();
    const pin = data.pin || Math.floor(1000 + Math.random() * 9000).toString();
    appendRow(sheet, {
      id: newId,
      vards: data.vards,
      uzvards: data.uzvards,
      loma: data.loma,
      pin: pin,
      aktivs: true,
      parole: data.parole || null
    });
    return createResponse(200, { success: true, id: newId, pin: pin });
  } finally {
    lock.releaseLock();
  }
}

function handleUpdateClient(data) {
  const ss = SpreadsheetApp.openById(SHEET_ID);
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);

  try {
    const sheet = ss.getSheetByName('klienti');
    const row = findRow(sheet, [['id', data.id]]);
    if (!row) return createResponse(404, { error: 'Klients nav atrasts' });

    const fields = ['vards', 'uzvards', 'dzimis', 'dieta', 'saskarsmes', 'aktivs'];
    fields.forEach(f => {
      if (data[f] !== undefined) setCellValue(sheet, row.row, f, data[f]);
    });

    return createResponse(200, { success: true });
  } finally {
    lock.releaseLock();
  }
}

function handleUpdateEmployee(data) {
  const ss = SpreadsheetApp.openById(SHEET_ID);
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);

  try {
    const sheet = ss.getSheetByName('darbinieki');
    const row = findRow(sheet, [['id', data.id]]);
    if (!row) return createResponse(404, { error: 'Darbinieks nav atrasts' });

    const fields = ['vards', 'uzvards', 'loma', 'pin', 'aktivs', 'parole'];
    fields.forEach(f => {
      if (data[f] !== undefined) setCellValue(sheet, row.row, f, data[f]);
    });

    return createResponse(200, { success: true });
  } finally {
    lock.releaseLock();
  }
}

function handleCreateTask(data) {
  const ss = SpreadsheetApp.openById(SHEET_ID);
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);

  try {
    const sheet = ss.getSheetByName('uzdevomi');
    const newId = Utilities.getUuid();
    appendRow(sheet, {
      id: newId,
      teksts: data.teksts,
      darbinieks: data.darbinieks || '',
      termins: data.termins || '',
      prioritate: data.prioritate || 'vidēja',
      statuss: 'jauns',
      pabeigts: false
    });
    return createResponse(200, { success: true, id: newId });
  } finally {
    lock.releaseLock();
  }
}

function handleLogDay(data) {
  const ss = SpreadsheetApp.openById(SHEET_ID);
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);

  try {
    const sheet = ss.getSheetByName('dienas_ierakti');
    const newId = Utilities.getUuid();
    appendRow(sheet, {
      id: newId,
      klients_id: data.clientId,
      darbinieks_id: data.employeeId,
      datums: data.date || Utilities.formatDate(new Date(), ss.getSpreadsheetTimeZone(), 'yyyy-MM-dd'),
      statuss: data.status || 'pabeigts',
      ir_pabeigts: data.completed !== false,
      labotajs_id: data.lastEditor || data.employeeId
    });
    return createResponse(200, { success: true, id: newId });
  } finally {
    lock.releaseLock();
  }
}

function getSheetData(sheet) {
  if (!sheet) return [];
  const range = sheet.getDataRange();
  const values = range.getValues();
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
  const range = sheet.getDataRange();
  const values = range.getValues();
  const headers = values[0];

  const colMap = {};
  headers.forEach((h, i) => { colMap[h.toString().toLowerCase().replace(/ /g, '_')] = i; });

  for (let i = 1; i < values.length; i++) {
    let match = true;
    for (const [field, value] of conditions) {
      const colIdx = colMap[field];
      if (colIdx === undefined || values[i][colIdx] !== value) {
        match = false;
        break;
      }
    }
    if (match) {
      return { row: i + 1, data: values[i], headers: headers };
    }
  }
  return null;
}

function setCellValue(sheet, rowNum, field, value) {
  const range = sheet.getRange(1, 1, 1, sheet.getLastColumn());
  const headers = range.getValues()[0];
  const colMap = {};
  headers.forEach((h, i) => { colMap[h.toString().toLowerCase().replace(/ /g, '_')] = i; });
  const colIdx = colMap[field];
  if (colIdx !== undefined) {
    sheet.getRange(rowNum, colIdx + 1).setValue(value);
  }
}

function getRowData(sheet, rowNum) {
  const range = sheet.getRange(1, 1, 1, sheet.getLastColumn());
  const headers = range.getValues()[0];
  const rowData = sheet.getRange(rowNum, 1, 1, headers.length).getValues()[0];
  const result = {};
  headers.forEach((h, i) => {
    result[h.toString().toLowerCase().replace(/ /g, '_')] = rowData[i];
  });
  return result;
}

function createResponse(status, data) {
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

function verifyPin(pin, employee) {
  if (!employee || !employee.pin) return false;
  return String(employee.pin) === String(pin);
}

function authenticatePin(pin) {
  const ss = SpreadsheetApp.openById(SHEET_ID);
  const data = getSheetData(ss.getSheetByName('darbinieki'));
  const emp = data.find(e => String(e.pin) === String(pin) && (e.aktivs === true || e.aktivs === 'true' || e.aktivs === 1));
  if (!emp) return null;
  return {
    id: emp.id,
    vards: emp.vards,
    uzvards: emp.uzvards,
    loma: emp.loma,
    aktivs: emp.aktivs
  };
}
