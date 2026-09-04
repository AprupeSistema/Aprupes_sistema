const FIELD_ALIASES = {
  'vārds': 'vards',
  'uzvārds': 'uzvards',
  'loma': 'loma',
  'pin_kods': 'pin',
  'aktīvs': 'aktivs',
  'dzimšanas_datums': 'dzimis',
  'diēta': 'dieta',
  'saskarsmes_īpatnības': 'saskarsmes',
  'parole': 'parole',
  'id': 'id',
  'klients_id': 'klienti_id',
  'darbinieks_id': 'darbinieki_id',
  'datums': 'datums',
  'periods': 'periods',
  'kategorija': 'kategorija',
  'lauka_nosaukums': 'lauka_nosaukums',
  'vērtība': 'vertiba',
  'pēdējā_vērtība': 'pedeja_vertiba',
  'pēdējais_laiks': 'pedeja_laiks',
  'darbinieks_pēdējais': 'darbinieks_pedejais',
  'atzīmes_id': 'atzimes_id',
  'laiks': 'laiks',
  'papildus_info': 'papilgs_info',
  'izveidots': 'izveidots',
  'teksts': 'teksts',
  'termiņš': 'termins',
  'prioritāte': 'prioritate',
  'statuss': 'statuss',
  'pabeigts': 'pabeigts',
  'labotājs_id': 'labotajs_id',
  '24h': 'h24'
};

function normalizeRow(row) {
  const out = {};
  for (const key of Object.keys(row)) {
    const k = key.toLowerCase().trim();
    const target = FIELD_ALIASES[k] || k.replace(/ /g, '_');
    let v = row[key];
    if (target === 'pin' && typeof v === 'number') v = String(v);
    if (target === 'aktivs' && typeof v === 'string') {
      v = v === 'TRUE' || v === 'true' || v === '1';
    }
    if (v === null || v === undefined) v = '';
    out[target] = v;
  }
  return out;
}

class SyncManager {
  constructor(db, config) {
    this.db = db;
    this.config = config;
    this.queue = [];
    this.syncing = false;
    this.online = navigator.onLine;
    this.syncInterval = null;
    this.init();
  }

  init() {
    window.addEventListener('online', () => {
      this.online = true;
      this.sync();
    });
    window.addEventListener('offline', () => {
      this.online = false;
    });
    this.syncInterval = setInterval(() => this.sync(), 30000);
  }

  updateStatus(newStatus) {
    this.config.currentStatus = newStatus;
    window.dispatchEvent(new CustomEvent('syncStatusChange', { detail: newStatus }));
  }

  enqueueChange(change) {
    const record = {
      id: this.db.generateId(),
      ...change,
      ts: Date.now(),
      status: 'pending'
    };
    this.queue.push(record);
    this.db.add('pending', record);
    if (this.online) this.sync();
    return record;
  }

  async sync() {
    if (this.syncing) return;
    let pending;
    try {
      pending = await this.db.getAll('pending');
    } catch (e) {
      pending = [];
    }
    const unsynced = pending.filter(p => p.status !== 'synced');
    if (unsynced.length === 0) {
      this.updateStatus('Saglabāts');
      return;
    }
    if (!this.online) {
      this.updateStatus('Bezsaistē');
      return;
    }
    this.syncing = true;
    this.updateStatus('Gaida nosūtīšanu');
    for (const item of unsynced) {
      try {
        const ok = await this.sendToServer(item);
        if (ok) {
          item.status = 'synced';
          await this.db.put('pending', item);
        } else {
          item.status = 'error';
          await this.db.put('pending', item);
        }
      } catch (err) {
        item.status = 'error';
        await this.db.put('pending', item);
      }
    }
    const stillPending = unsynced.filter(p => p.status !== 'synced');
    this.updateStatus(stillPending.length > 0 ? 'Neizdevās nosūtīt' : 'Saglabāts');
    this.syncing = false;
  }

  async sendToServer(item) {
    const payload = JSON.stringify({
      action: item.action,
      data: item.data,
      clientId: item.id
    });
    const url = this.config.GAS_URL;
    const ts = Date.now();
    try {
      await fetch(url + '?t=' + ts, {
        method: 'POST',
        mode: 'no-cors',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: payload
      });
      console.log('[sync] POST sent', item.action, item.id);
      return true;
    } catch (err) {
      console.error('[sync] POST failed', err);
      try {
        await fetch(url + '?data=' + encodeURIComponent(payload) + '&t=' + ts, {
          method: 'GET',
          mode: 'no-cors'
        });
        return true;
      } catch (err2) {
        console.error('[sync] GET fallback failed', err2);
        return false;
      }
    }
  }
    }
  }

  async loadInitialData() {
    const result = { offline: false, count: {} };
    const sheets = ['darbinieki', 'klienti', 'atzimes', 'atzimes_log', 'dienas_ierakti', 'uzdevomi'];

    try {
      const url = this.config.GAS_URL + '?action=load';
      console.log('[sync] GET', url);
      const response = await fetch(url, { method: 'GET', redirect: 'follow' });
      console.log('[sync] status', response.status, response.statusText);
      if (response.ok) {
        const text = await response.text();
        console.log('[sync] response first 200:', text.substring(0, 200));
        let data;
        try { data = JSON.parse(text); } catch (pe) {
          console.error('[sync] JSON parse failed:', pe);
          throw new Error('Nederīgs JSON: ' + text.substring(0, 100));
        }
        for (const sheet of sheets) {
          const rows = (data && data[sheet]) || [];
          await this.db.clear(sheet);
          for (const row of rows) {
            const normalized = normalizeRow(row);
            const id = normalized.id || (sheet + '_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5));
            normalized.id = id;
            await this.db.add(sheet, normalized);
          }
          result.count[sheet] = rows.length;
        }
        await this.db.setMeta('lastSync', Date.now());
        await this.db.setMeta('initData', true);
        return result;
      } else {
        console.warn('[sync] non-ok', response.status);
      }
    } catch (err) {
      console.error('[sync] load failed:', err);
    }

    result.offline = true;
    for (const sheet of sheets) {
      result.count[sheet] = 0;
    }
    return result;
  }

  async hasLocalData() {
    const clients = await this.db.getAll('klienti');
    return clients.length > 0;
  }

  async getUnsyncedCount() {
    const pending = await this.db.getAll('pending');
    return pending.filter(p => p.status !== 'synced').length;
  }

  async getUnsyncedItems() {
    const pending = await this.db.getAll('pending');
    return pending.filter(p => p.status !== 'synced');
  }
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { SyncManager, normalizeRow, FIELD_ALIASES };
}
if (typeof globalThis !== 'undefined') {
  globalThis.SyncManager = SyncManager;
  globalThis.normalizeRow = normalizeRow;
}
