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
      this.updateStatus(CONFIG.STATUS.PENDING);
    });
    this.syncInterval = setInterval(() => this.sync(), 30000);
  }

  updateStatus(newStatus) {
    this.config.currentStatus = newStatus;
    const event = new CustomEvent('syncStatusChange', { detail: newStatus });
    window.dispatchEvent(event);
  }

  enqueueChange(change) {
    const record = {
      id: this.db.generateId(),
      ...change,
      ts: Date.now(),
      status: CONFIG.STATUS.PENDING
    };
    this.queue.push(record);
    this.db.add(CONFIG.STORES.PENDING, record);
    if (this.online) {
      this.sync();
    }
    return record;
  }

  async sync() {
    if (this.syncing || !this.online) return;
    this.syncing = true;

    let pending;
    try {
      pending = await this.db.getAll(CONFIG.STORES.PENDING);
    } catch (e) {
      pending = [];
    }

    if (pending.length === 0) {
      this.syncing = false;
      this.updateStatus(CONFIG.STATUS.SAVED);
      return;
    }

    this.updateStatus(CONFIG.STATUS.PENDING);

    const unsynced = pending.filter(p => p.status === CONFIG.STATUS.PENDING);
    if (unsynced.length === 0) {
      this.syncing = false;
      return;
    }

    for (const item of unsynced) {
      try {
        await this.sendToServer(item);
        item.status = CONFIG.STATUS.SYNCED;
        await this.db.put(CONFIG.STORES.PENDING, item);
      } catch (err) {
        item.status = CONFIG.STATUS.ERROR;
        await this.db.put(CONFIG.STORES.PENDING, item);
        console.error('Sync failed for item:', item.id, err);
      }
    }

    const stillPending = unsynced.filter(p => p.status !== CONFIG.STATUS.SYNCED);
    if (stillPending.length > 0) {
      this.updateStatus(CONFIG.STATUS.ERROR);
    } else {
      this.updateStatus(CONFIG.STATUS.SAVED);
    }

    this.syncing = false;
  }

  async sendToServer(item) {
    const payload = {
      action: item.action,
      table: item.table,
      data: item.data,
      clientId: item.id,
      deviceTime: new Date().toISOString()
    };

    const response = await fetch(this.config.GAS_URL, {
      method: 'POST',
      mode: 'no-cors',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    return true;
  }

  async loadInitialData() {
    const hasGas = this.config.GAS_URL && !this.config.GAS_URL.includes('YOUR_GAS_DEPLOYMENT');
    if (!hasGas) {
      return await this._loadDemoData();
    }

    try {
      const response = await fetch(this.config.GAS_URL + '?action=load&deviceTime=' + Date.now());
      const text = await response.text();
      let data;
      try {
        data = JSON.parse(text);
      } catch (e) {
        data = null;
      }

      if (!data || !data.darbinieki) {
        return await this._loadDemoData();
      }

      await this.db.clear('darbinieki');
      await this.db.clear('klienti');
      await this.db.clear('atzimes');
      await this.db.clear('atzimes_log');
      await this.db.clear('dienas_ierakti');
      await this.db.clear('uzdevomi');

      for (const row of data.darbinieki) { await this.db.add('darbinieki', row); }
      for (const row of data.klienti) { await this.db.add('klienti', row); }
      for (const row of data.atzimes) { await this.db.add('atzimes', row); }
      for (const row of data.atzimes_log) { await this.db.add('atzimes_log', row); }
      for (const row of data.dienas_ierakti) { await this.db.add('dienas_ierakti', row); }
      for (const row of data.uzdevomi) { await this.db.add('uzdevomi', row); }

      await this.db.setMeta('lastSync', Date.now());
      await this.db.setMeta('initData', true);
      this.updateStatus(CONFIG.STATUS.SAVED);

      return { offline: false, count: {
        darbinieki: data.darbinieki ? data.darbinieki.length : 0,
        klienti: data.klienti ? data.klienti.length : 0
      }};
    } catch (err) {
      console.error('Initial load failed:', err);
      const hasLocal = await this.hasLocalData();
      if (!hasLocal) {
        return await this._loadDemoData();
      }
      return { offline: true, hasLocal: true };
    }
  }

  async _loadDemoData() {
    return { offline: true, demo: false, error: 'Nav GAS_URL' };
  }

  async hasLocalData() {
    const clients = await this.db.getAll('klienti');
    return clients.length > 0;
  }

  async getUnsyncedCount() {
    const pending = await this.db.getAll(CONFIG.STORES.PENDING);
    return pending.filter(p => p.status !== CONFIG.STATUS.SYNCED).length;
  }

  async getUnsyncedItems() {
    const pending = await this.db.getAll(CONFIG.STORES.PENDING);
    return pending.filter(p => p.status !== CONFIG.STATUS.SYNCED);
  }
}
