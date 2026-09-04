const ALLOWED_ORIGINS = ['https://aprupesistema.github.io'];

const DEMO_DATA = {
  darbinieki: [
    { id: '1', vards: 'Dāvis', uzvards: 'Strazds', loma: 'administrators', pin: '1234', aktivs: true, parole: '' }
  ],
  klienti: [],
  atzimes: [],
  atzimes_log: [],
  dienas_ierakti: [],
  uzdevomi: []
};

function doGet(e) {
  try {
    const action = e && e.parameter && e.parameter.action;
    if (action === 'load') {
      return createResponse(200, DEMO_DATA);
    }
    return createResponse(400, { error: 'Nezināma darbība: ' + action });
  } catch (err) {
    return createResponse(500, { error: 'Kļūda: ' + err.toString() + ' | Stack: ' + err.stack });
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
    return createResponse(200, { success: true, received: data });
  } catch (err) {
    return createResponse(500, { error: err.toString() });
  }
}

function createResponse(status, data) {
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}
