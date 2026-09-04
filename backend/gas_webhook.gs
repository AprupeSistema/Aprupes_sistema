function getStore() {
  const props = PropertiesService.getScriptProperties();
  let data = props.getProperty('data');
  if (!data) {
    data = {
      darbinieki: [
        { id: '1', vards: 'Dāvis', uzvards: 'Strazds', loma: 'administrators', pin: '1234', aktivs: true, parole: '' }
      ],
      klienti: [],
      atzimes: [],
      atzimes_log: [],
      dienas_ierakti: [],
      uzdevomi: []
    };
    props.setProperty('data', JSON.stringify(data));
  } else {
    data = JSON.parse(data);
  }
  return data;
}

function setStore(data) {
  PropertiesService.getScriptProperties().setProperty('data', JSON.stringify(data));
}

function doGet(e) {
  try {
    const action = e && e.parameter && e.parameter.action;
    if (action === 'load') {
      return createResponse(200, getStore());
    }
    if (action === 'getLog') {
      return createResponse(200, { log: getStore().atzimes_log });
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

    const action = data.action;
    const store = getStore();

    if (action === 'createClient') {
      const id = 'c_' + Date.now();
      const c = data.data;
      store.klienti.push({
        id: id,
        vards: c.vards,
        uzvards: c.uzvards,
        dzimis: c.dzimis || '',
        dieta: c.dieta || '',
        saskarsmes: c.saskarsmes || '',
        aktivs: true
      });
      setStore(store);
      return createResponse(200, { success: true, id: id, count: store.klienti.length });
    }

    if (action === 'createEmployee') {
      const id = 'e_' + Date.now();
      const e = data.data;
      store.darbinieki.push({
        id: id,
        vards: e.vards,
        uzvards: e.uzvards,
        loma: e.loma,
        pin: String(e.pin),
        aktivs: true,
        parole: e.parole || ''
      });
      setStore(store);
      return createResponse(200, { success: true, id: id });
    }

    if (action === 'updateClient') {
      const idx = store.klienti.findIndex(c => c.id === data.data.id);
      if (idx >= 0) {
        Object.assign(store.klienti[idx], data.data);
        setStore(store);
        return createResponse(200, { success: true });
      }
      return createResponse(404, { error: 'Nav atrasts' });
    }

    if (action === 'updateEmployee') {
      const idx = store.darbinieki.findIndex(e => e.id === data.data.id);
      if (idx >= 0) {
        Object.assign(store.darbinieki[idx], data.data);
        setStore(store);
        return createResponse(200, { success: true });
      }
      return createResponse(404, { error: 'Nav atrasts' });
    }

    if (action === 'mark') {
      const id = 'm_' + Date.now();
      const m = data.data;
      const today = m.date || new Date().toISOString().split('T')[0];
      const nowStr = new Date().toISOString();

      store.atzimes.push({
        id: id,
        clientId: m.clientId,
        employeeId: m.employeeId,
        date: today,
        shift: m.shift || 'R',
        category: m.category,
        field: m.field,
        value: m.value,
        lastModified: nowStr,
        lastBy: m.employeeId
      });
      store.atzimes_log.push({
        id: 'l_' + Date.now(),
        markId: id,
        clientId: m.clientId,
        employeeId: m.employeeId,
        date: today,
        time: new Date().toTimeString().split(' ')[0],
        shift: m.shift || 'R',
        category: m.category,
        field: m.field,
        value: m.value,
        prevValue: null,
        type: 'Jauns',
        created: nowStr
      });
      setStore(store);
      return createResponse(200, { success: true, id: id });
    }

    if (action === 'createTask' || action === 'logDay') {
      setStore(store);
      return createResponse(200, { success: true });
    }

    return createResponse(400, { error: 'Nezināma darbība: ' + action });
  } catch (err) {
    return createResponse(500, { error: err.toString() });
  }
}

function createResponse(status, data) {
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}
