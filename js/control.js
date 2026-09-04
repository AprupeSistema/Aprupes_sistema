class ControlPanel {
  constructor() {
    this.db = null;
    this.sync = null;
    this.currentUser = null;
    this.allClients = [];
    this.allEmployees = [];
    this.allLog = [];
    this.allMarks = [];
    this.init();
  }

  async init() {
    const userData = sessionStorage.getItem('careUser');
    if (!userData) {
      window.location.href = 'index.html';
      return;
    }
    this.currentUser = JSON.parse(userData);

    this.db = new CareDB();
    await this.db.init();
    window.careDB = this.db;
    this.sync = new SyncManager(this.db, CONFIG);
    window.careSync = this.sync;

    this.setupUI();
    await this.sync.loadInitialData();
    await this.loadData();
    this.renderAll();
  }

  setupUI() {
    document.getElementById('backBtn').addEventListener('click', () => {
      window.location.href = 'index.html';
    });
    document.getElementById('logoutBtn').addEventListener('click', () => {
      sessionStorage.removeItem('careUser');
      window.location.href = 'index.html';
    });

    const today = new Date().toISOString().split('T')[0];
    document.getElementById('dateFilter').value = today;

    document.getElementById('refreshBtn').addEventListener('click', () => this.renderAll());
    document.getElementById('exportBtn').addEventListener('click', () => this.exportExcel());
    document.getElementById('onlyEdited').addEventListener('change', () => this.renderHistory());
  }

  async loadData() {
    this.allClients = await this.db.getAll('klienti');
    this.allEmployees = await this.db.getAll('darbinieki');
    this.allMarks = await this.db.getAll('atzimes');
    this.allLog = await this.db.getAll('atzimes_log');

    const clientFilter = document.getElementById('clientFilter');
    clientFilter.innerHTML = '<option value="">Visi klienti</option>' +
      this.allClients.map(c => {
        const name = (c.vards || c.Vārds || '') + ' ' + (c.uzvards || c.Uzvārds || '');
        return `<option value="${c.id || c.ID}">${name}</option>`;
      }).join('');

    const empFilter = document.getElementById('employeeFilter');
    empFilter.innerHTML = '<option value="">Visi</option>' +
      this.allEmployees.map(e => {
        const name = (e.vards || e.Vārds || '') + ' ' + (e.uzvards || e.Uzvārds || '');
        return `<option value="${e.id || e.ID}">${name}</option>`;
      }).join('');
  }

  getFilteredData() {
    const date = document.getElementById('dateFilter').value;
    const clientId = document.getElementById('clientFilter').value;
    const employeeId = document.getElementById('employeeFilter').value;
    const onlyEdited = document.getElementById('onlyEdited').checked;

    let marks = this.allMarks.filter(m => m.date === date);
    if (clientId) marks = marks.filter(m => m.clientId === clientId);
    if (employeeId) marks = marks.filter(m => m.employeeId === employeeId);

    let log = this.allLog.filter(l => l.date === date);
    if (clientId) log = log.filter(l => l.clientId === clientId);
    if (employeeId) log = log.filter(l => l.employeeId === employeeId);
    if (onlyEdited) log = log.filter(l => l.type === 'Labots');

    return { marks, log, date, clientId, employeeId, onlyEdited };
  }

  renderAll() {
    const data = this.getFilteredData();
    this.renderStats(data);
    this.renderHistory();
  }

  renderStats(data) {
    const { marks, date, clientId } = data;
    const activeClients = this.allClients.filter(c => c.aktivs === true || c.aktivs === 'true' || c.aktivs === 1 || c.aktivs === '1');
    const targetClients = clientId ? [clientId] : activeClients.map(c => c.id || c.ID);

    const completed = new Set();
    marks.filter(m => m.category === 'paraksts').forEach(m => completed.add(m.clientId));

    let tempHigh = 0;
    let fluid = 0;
    let urine = 0;
    let diapers = 0;

    marks.forEach(m => {
      if (m.category === 'temp' && m.field === 'temperatura') {
        const v = parseFloat(m.value);
        if (!isNaN(v) && v >= 37) tempHigh++;
      }
      if (m.category === 'sikdrumi' && m.field === 'uznemts_ml') {
        fluid += parseFloat(m.value) || 0;
      }
      if (m.category === 'sikdrumi' && m.field === 'urina_daudzums') {
        urine += parseFloat(m.value) || 0;
      }
      if (m.category === 'citsi_pasakomi' && m.field === 'autins_biksitu_skaits') {
        diapers += parseInt(m.value) || 0;
      }
    });

    const incomplete = targetClients.length - completed.size;
    const edits = this.allLog.filter(l => l.date === date && l.type === 'Labots').length;

    document.getElementById('statTotal').textContent = targetClients.length;
    document.getElementById('statCompleted').textContent = completed.size;
    document.getElementById('statIncomplete').textContent = incomplete;
    document.getElementById('statFever').textContent = tempHigh;
    document.getElementById('statFluid').textContent = fluid;
    document.getElementById('statUrine').textContent = urine;
    document.getElementById('statDiapers').textContent = diapers;
    document.getElementById('statEdits').textContent = edits;
  }

  renderHistory() {
    const data = this.getFilteredData();
    const { log } = data;

    const clientMap = {};
    this.allClients.forEach(c => {
      clientMap[c.id || c.ID] = (c.vards || c.Vārds || '') + ' ' + (c.uzvards || c.Uzvārds || '');
    });

    const empMap = {};
    this.allEmployees.forEach(e => {
      empMap[e.id || e.ID] = (e.vards || e.Vārds || '') + ' ' + (e.uzvards || e.Uzvārds || '');
    });

    const body = document.getElementById('historyBody');
    if (log.length === 0) {
      body.innerHTML = '<tr><td colspan="8" class="loading">Nav datu</td></tr>';
      return;
    }

    body.innerHTML = log.map(l => `
      <tr>
        <td>${l.time || ''}</td>
        <td>${this.escapeHtml(clientMap[l.clientId] || '-')}</td>
        <td>${this.escapeHtml(empMap[l.employeeId] || '-')}</td>
        <td>${l.category || ''}</td>
        <td>${l.field || ''}</td>
        <td>${this.escapeHtml(l.value || '-')}</td>
        <td>${this.escapeHtml(l.prevValue || '-')}</td>
        <td>${l.type || ''}</td>
      </tr>
    `).join('');
  }

  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text || '';
    return div.innerHTML;
  }

  async exportExcel() {
    if (typeof XLSX === 'undefined') {
      this.toast('Excel bibliotēka nav ielādēta');
      return;
    }

    const date = document.getElementById('dateFilter').value;
    const clientId = document.getElementById('clientFilter').value;

    if (!clientId) {
      this.toast('Izvēlieties klientu Excel eksportam');
      return;
    }

    const client = this.allClients.find(c => (c.id || c.ID) === clientId);
    if (!client) return;

    try {
      const exporter = new ExcelExporter();
      const year = parseInt(date.split('-')[0]);
      const month = parseInt(date.split('-')[1]);

      const clientMarks = this.allMarks.filter(m => m.clientId === clientId);
      const filename = await exporter.generateMonth(client, year, month, clientMarks);
      this.toast('Excel lejupielādēts: ' + filename);
    } catch (err) {
      this.toast('Eksporta kļūda: ' + err.message);
      console.error(err);
    }
  }

  getFieldForRow(row) {
    return null;
  }

  toast(message) {
    const toast = document.getElementById('toast');
    toast.textContent = message;
    toast.classList.add('show');
    setTimeout(() => toast.classList.remove('show'), 3000);
  }
}

document.addEventListener('DOMContentLoaded', () => {
  window.controlPanel = new ControlPanel();
});
