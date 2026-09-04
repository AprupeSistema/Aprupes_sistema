class CareFormController {
  constructor() {
    this.db = null;
    this.sync = null;
    this.client = null;
    this.clientId = null;
    this.currentShift = 'R';
    this.marks = new Map();
    this.currentUser = null;
    this.history = [];
    this.init();
  }

  async init() {
    const userData = sessionStorage.getItem('careUser');
    if (!userData) {
      window.location.href = 'index.html';
      return;
    }
    this.currentUser = JSON.parse(userData);

    const params = new URLSearchParams(window.location.search);
    this.clientId = params.get('client');
    if (!this.clientId) {
      window.location.href = 'aprupe.html';
      return;
    }

    this.db = new CareDB();
    await this.db.init();
    window.careDB = this.db;
    this.sync = new SyncManager(this.db, CONFIG);
    window.careSync = this.sync;

    window.addEventListener('syncStatusChange', (e) => {
      const badge = document.getElementById('syncStatus');
      badge.textContent = e.detail;
    });

    this.setupEventListeners();
    await this.sync.loadInitialData();
    await this.loadClient();
    await this.loadMarks();
    await this.loadHistory();
    this.renderForm();
    this.renderHistory();
    this.renderSignature();
  }

  setupEventListeners() {
    document.getElementById('backBtn').addEventListener('click', () => {
      window.location.href = 'aprupe.html';
    });

    document.querySelectorAll('.shift-tab').forEach(tab => {
      tab.addEventListener('click', (e) => {
        document.querySelectorAll('.shift-tab').forEach(t => t.classList.remove('active'));
        e.target.classList.add('active');
        this.currentShift = e.target.dataset.shift;
        this.renderForm();
      });
    });

    document.getElementById('signBtn').addEventListener('click', () => {
      this.handleSign();
    });
  }

  async loadClient() {
    this.client = await this.db.get('klienti', this.clientId);
    if (!this.client) {
      const allClients = await this.db.getAll('klienti');
      this.client = allClients.find(c => c.id === this.clientId || c.ID === this.clientId);
    }
    if (!this.client) {
      this.toast('Klients nav atrasts');
      setTimeout(() => window.location.href = 'aprupe.html', 1500);
      return;
    }

    const vards = this.client.vards || this.client.Vārds || '';
    const uzvards = this.client.uzvards || this.client.Uzvārds || '';
    document.getElementById('clientName').textContent = vards + ' ' + uzvards;
    document.getElementById('clientDob').textContent = this.formatDob(this.client.dzimis || this.client['Dzimšanas datums']);
    document.getElementById('clientDiet').textContent = this.client.dieta || this.client.Diēta || '-';
    document.getElementById('clientSaskarsme').textContent = this.client.saskarsmes || this.client['Saskarsmes īpatnības'] || '-';
  }

  formatDob(dob) {
    if (!dob) return 'Dzimšanas datums nav norādīts';
    const d = new Date(dob);
    if (isNaN(d.getTime())) return dob;
    return d.toLocaleDateString('lv-LV');
  }

  async loadMarks() {
    const today = new Date().toISOString().split('T')[0];
    const allMarks = await this.db.getAll('atzimes');
    this.marks.clear();
    allMarks.filter(m => m.clientId === this.clientId && m.date === today)
            .forEach(m => {
              const key = m.shift + '|' + m.category + '|' + m.field;
              this.marks.set(key, m);
            });
  }

  async loadHistory() {
    const today = new Date().toISOString().split('T')[0];
    const allLog = await this.db.getAll('atzimes_log');
    this.history = allLog
      .filter(l => l.clientId === this.clientId && l.date === today)
      .sort((a, b) => new Date(b.time || 0) - new Date(a.time || 0));

    const employees = await this.db.getAll('darbinieki');
    const empMap = {};
    employees.forEach(e => {
      const id = e.id || e.ID;
      const uzvards = e.uzvards || e.Uzvārds || '';
      empMap[id] = uzvards;
    });
    this.empMap = empMap;
  }

  getMark(shift, category, field) {
    return this.marks.get(shift + '|' + category + '|' + field);
  }

  renderForm() {
    const container = document.getElementById('formContainer');
    const fields = CONFIG.FIELD_DEFINITIONS;
    const shift = this.currentShift;
    const today = new Date().toISOString().split('T')[0];

    let html = '';

    html += this.renderTempSection(shift);
    html += this.renderHigienaSection(shift);
    html += this.renderAktivitateSection(shift);
    html += this.renderEdinasanaSection(shift);
    html += this.renderSikdrumiSection(shift);
    html += this.renderFiziologijaSection(shift);
    html += this.renderCitiPasakumiSection(shift);

    container.innerHTML = html;
    this.bindFormEvents();
  }

  renderTempSection(shift) {
    const mark = this.getMark(shift, 'temp', 'temperatura');
    const value = mark ? mark.value : '';
    return `
      <div class="form-section">
        <h3>🌡️ Temperatūra</h3>
        <div class="form-row">
          <span class="field-label">Pēdējā vērtība:</span>
          <div class="field-controls">
            <input type="number" step="0.1" min="30" max="45" class="number-input" data-cat="temp" data-field="temperatura" value="${value}" placeholder="36.6">
          </div>
        </div>
      </div>
    `;
  }

  renderHigienaSection(shift) {
    const fields = CONFIG.FIELD_DEFINITIONS.higiena.fields;
    let html = `<div class="form-section"><h3>🧼 Higiēna</h3>`;
    fields.forEach(f => {
      const mark = this.getMark(shift, 'higiena', f.field);
      const active = mark && mark.value;
      const hasValue = mark && mark.value === 'X';
      html += `
        <div class="form-row">
          <span class="field-label">${f.label}</span>
          <div class="field-controls">
            <button class="opt-btn ${hasValue ? 'active' : ''}" data-cat="higiena" data-field="${f.field}" data-value="X" data-shift="${shift}">
              ${hasValue ? '✓' : 'X'}
            </button>
          </div>
        </div>
      `;
    });
    html += '</div>';
    return html;
  }

  renderAktivitateSection(shift) {
    const fields = CONFIG.FIELD_DEFINITIONS.aktivitate.fields;
    let html = `<div class="form-section"><h3>🚶 Aktivitāte</h3>`;
    fields.forEach(f => {
      const mark = this.getMark(shift, 'aktivitate', f.field);
      const hasValue = mark && mark.value === 'X';
      html += `
        <div class="form-row">
          <span class="field-label">${f.label}</span>
          <div class="field-controls">
            <button class="opt-btn ${hasValue ? 'active' : ''}" data-cat="aktivitate" data-field="${f.field}" data-value="X" data-shift="${shift}">
              ${hasValue ? '✓' : 'X'}
            </button>
          </div>
        </div>
      `;
    });
    html += '</div>';
    return html;
  }

  renderEdinasanaSection(shift) {
    const fields = CONFIG.FIELD_DEFINITIONS.edinasana.fields;
    let html = `<div class="form-section"><h3>🍽️ Ēdīšana</h3>`;
    fields.forEach(f => {
      const mark = this.getMark(shift, 'edinasana', f.field);
      const current = mark ? mark.value : '';
      html += `
        <div class="form-row">
          <span class="field-label">${f.label}</span>
          <div class="field-controls">
            <button class="opt-btn ${current === 'X' ? 'active' : ''}" data-cat="edinasana" data-field="${f.field}" data-value="X" data-shift="${shift}">X</button>
            <button class="opt-btn food-half ${current === '½' ? 'active' : ''}" data-cat="edinasana" data-field="${f.field}" data-value="½" data-shift="${shift}">½</button>
            <button class="opt-btn ${current === 'A' ? 'active' : ''}" data-cat="edinasana" data-field="${f.field}" data-value="A" data-shift="${shift}">A</button>
          </div>
        </div>
      `;
    });
    html += '</div>';
    return html;
  }

  renderSikdrumiSection(shift) {
    const urinsMark = this.getMark(shift, 'sikdrumi', 'urina_daudzums');
    const uznemtsMark = this.getMark(shift, 'sikdrumi', 'uznemts_ml');
    return `
      <div class="form-section">
        <h3>💧 Šķidrumi</h3>
        <div class="form-row">
          <span class="field-label">Diennakts urīna daudzums (ml)</span>
          <div class="field-controls">
            <input type="number" min="0" step="50" class="number-input" data-cat="sikdrumi" data-field="urina_daudzums" value="${urinsMark ? urinsMark.value : ''}" placeholder="0">
          </div>
        </div>
        <div class="form-row">
          <span class="field-label">Uzņemts H2O (24h, ml)</span>
          <div class="field-controls">
            <input type="number" min="0" step="50" class="number-input" data-cat="sikdrumi" data-field="uznemts_ml" value="${uznemtsMark ? uznemtsMark.value : ''}" placeholder="0">
          </div>
        </div>
      </div>
    `;
  }

  renderFiziologijaSection(shift) {
    const mark = this.getMark(shift, 'fiziologija', 'vedera_izeja');
    const current = mark ? mark.value : '';
    return `
      <div class="form-section">
        <h3>🚽 Vēdera izeja</h3>
        <div class="form-row">
          <span class="field-label">Vērtība</span>
          <div class="field-controls">
            <button class="opt-btn ${current === 'N' ? 'active' : ''}" data-cat="fiziologija" data-field="vedera_izeja" data-value="N" data-shift="${shift}">N</button>
            <button class="opt-btn ${current === 'A' ? 'active' : ''}" data-cat="fiziologija" data-field="vedera_izeja" data-value="A" data-shift="${shift}">A</button>
            <button class="opt-btn ${current === 'S' ? 'active' : ''}" data-cat="fiziologija" data-field="vedera_izeja" data-value="S" data-shift="${shift}">S</button>
            <button class="opt-btn ${current === 'C' ? 'active' : ''}" data-cat="fiziologija" data-field="vedera_izeja" data-value="C" data-shift="${shift}">C</button>
            <button class="opt-btn ${current === 'K' ? 'active' : ''}" data-cat="fiziologija" data-field="vedera_izeja" data-value="K" data-shift="${shift}">K</button>
          </div>
        </div>
      </div>
    `;
  }

  renderCitiPasakumiSection(shift) {
    const markAda = this.getMark(shift, 'citsi_pasakomi', 'adas_kopsana');
    const markPastaiga = this.getMark(shift, 'citsi_pasakomi', 'pastaigas');
    const markCiemini = this.getMark(shift, 'citsi_pasakomi', 'ciemini');
    const markAutins = this.getMark(shift, 'citsi_pasakomi', 'autins_biksitu_skaits');

    return `
      <div class="form-section">
        <h3>📋 Citi pasākumi</h3>
        <div class="form-row">
          <span class="field-label">Ādas kopšanas līdzekļi</span>
          <div class="field-controls">
            <button class="opt-btn ${markAda && markAda.value === 'X' ? 'active' : ''}" data-cat="citsi_pasakomi" data-field="adas_kopsana" data-value="X" data-shift="${shift}">
              ${markAda && markAda.value === 'X' ? '✓' : 'X'}
            </button>
          </div>
        </div>
        <div class="form-row">
          <span class="field-label">Pastaigas svaigā gaisā</span>
          <div class="field-controls">
            <button class="opt-btn ${markPastaiga && markPastaiga.value === 'X' ? 'active' : ''}" data-cat="citsi_pasakomi" data-field="pastaigas" data-value="X" data-shift="${shift}">
              ${markPastaiga && markPastaiga.value === 'X' ? '✓' : 'X'}
            </button>
          </div>
        </div>
        <div class="form-row">
          <span class="field-label">Ciemiņi</span>
          <div class="field-controls">
            <button class="opt-btn ${markCiemini && markCiemini.value === 'X' ? 'active' : ''}" data-cat="citsi_pasakomi" data-field="ciemini" data-value="X" data-shift="${shift}">Jā</button>
            <button class="opt-btn ${markCiemini && markCiemini.value === 'Nē' ? 'active' : ''}" data-cat="citsi_pasakomi" data-field="ciemini" data-value="Nē" data-shift="${shift}">Nē</button>
          </div>
        </div>
        <div class="form-row">
          <span class="field-label">Autiņbiksīšu maiņa (skaits)</span>
          <div class="field-controls">
            <input type="number" min="0" step="1" class="number-input" data-cat="citsi_pasakomi" data-field="autins_biksitu_skaits" value="${markAutins ? markAutins.value : ''}" placeholder="0">
          </div>
        </div>
      </div>
    `;
  }

  bindFormEvents() {
    document.querySelectorAll('.opt-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const cat = e.currentTarget.dataset.cat;
        const field = e.currentTarget.dataset.field;
        const value = e.currentTarget.dataset.value;
        const shift = e.currentTarget.dataset.shift;
        this.handleOptionSelect(shift, cat, field, value, e.currentTarget);
      });
    });

    document.querySelectorAll('.number-input').forEach(input => {
      let debounceTimer;
      input.addEventListener('input', (e) => {
        const cat = e.currentTarget.dataset.cat;
        const field = e.currentTarget.dataset.field;
        const value = e.currentTarget.value;
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => {
          if (value !== '' && value !== null) {
            this.handleNumberChange(cat, field, value);
          }
        }, 600);
      });
      input.addEventListener('blur', (e) => {
        const cat = e.currentTarget.dataset.cat;
        const field = e.currentTarget.dataset.field;
        const value = e.currentTarget.value;
        if (value !== '' && value !== null) {
          this.handleNumberChange(cat, field, value);
        }
      });
    });
  }

  async handleOptionSelect(shift, category, field, value, btn) {
    const key = shift + '|' + category + '|' + field;
    const existing = this.marks.get(key);

    if (existing && existing.value === value) {
      await this.saveMark({
        clientId: this.clientId,
        shift: shift,
        category: category,
        field: field,
        value: '',
        prevValue: value,
        type: 'Labots'
      });
      this.marks.delete(key);
    } else {
      await this.saveMark({
        clientId: this.clientId,
        shift: shift,
        category: category,
        field: field,
        value: value,
        prevValue: existing ? existing.value : null,
        type: existing ? 'Labots' : 'Jauns'
      });
    }

    this.renderForm();
    await this.loadHistory();
    this.renderHistory();
  }

  async handleNumberChange(category, field, value) {
    await this.saveMark({
      clientId: this.clientId,
      shift: this.currentShift,
      category: category,
      field: field,
      value: value,
      prevValue: null,
      type: 'Jauns'
    });
    this.toast('Saglabāts');
    await this.loadHistory();
    this.renderHistory();
  }

  async saveMark(data) {
    const today = new Date().toISOString().split('T')[0];
    const now = new Date();
    const timeStr = now.toTimeString().split(' ')[0];

    const id = this.db.generateId();

    const mark = {
      id: id,
      clientId: data.clientId,
      employeeId: this.currentUser.id,
      date: today,
      shift: data.shift,
      category: data.category,
      field: data.field,
      value: data.value,
      lastModified: now.toISOString(),
      lastBy: this.currentUser.id
    };

    const key = data.shift + '|' + data.category + '|' + data.field;
    this.marks.set(key, mark);

    await this.db.put('atzimes', mark);

    const logEntry = {
      id: this.db.generateId(),
      markId: id,
      clientId: data.clientId,
      employeeId: this.currentUser.id,
      date: today,
      time: timeStr,
      shift: data.shift,
      category: data.category,
      field: data.field,
      value: data.value,
      prevValue: data.prevValue,
      type: data.type,
      created: now.toISOString()
    };
    await this.db.add('atzimes_log', logEntry);

    this.sync.enqueueChange({
      action: 'mark',
      table: 'atzimes',
      data: {
        clientId: data.clientId,
        employeeId: this.currentUser.id,
        date: today,
        shift: data.shift,
        category: data.category,
        field: data.field,
        value: data.value,
        reason: data.type === 'Labots' ? 'Labots' : null
      }
    });

    this.toast('Saglabāts');
  }

  renderHistory() {
    const container = document.getElementById('historyContainer');
    if (this.history.length === 0) {
      container.innerHTML = '<div class="loading">Nav ierakstu</div>';
      return;
    }

    container.innerHTML = this.history.map(entry => {
      const actor = this.empMap[entry.employeeId] || 'Nezināms';
      const fieldLabel = this.getFieldLabel(entry.category, entry.field);
      const valueDisplay = this.formatHistoryValue(entry.category, entry.field, entry.value);
      const isEdit = entry.type === 'Labots';
      const time = entry.time || '';
      return `
        <div class="history-item">
          <div class="history-action">
            <strong>${time}</strong> – ${fieldLabel}: <strong>${valueDisplay}</strong>
            ${isEdit ? '<span class="history-edit-tag">Labots</span>' : ''}
          </div>
          <div class="history-actor">${actor}</div>
        </div>
      `;
    }).join('');
  }

  getFieldLabel(category, field) {
    if (category === 'temp' && field === 'temperatura') return 'Temperatūra';
    if (category === 'paraksts') return 'Paraksts';

    const cat = CONFIG.FIELD_DEFINITIONS[category];
    if (!cat || !cat.fields) return field;

    const f = cat.fields.find(x => x.field === field);
    return f ? f.label : field;
  }

  formatHistoryValue(category, field, value) {
    if (category === 'temp' && field === 'temperatura') {
      const v = parseFloat(value);
      if (!isNaN(v) && v >= 37) return `<span style="color:#e74c3c">${value}°C</span>`;
      return value || '-';
    }
    if (!value || value === '') return 'notīrīts';
    return value;
  }

  async renderSignature() {
    const signBtn = document.getElementById('signBtn');
    const signedBy = document.getElementById('signedBy');

    const today = new Date().toISOString().split('T')[0];
    const signature = this.history.find(h => h.category === 'paraksts');

    if (signature) {
      const actor = this.empMap[signature.employeeId] || 'Nezināms';
      signBtn.textContent = '✓ Parakstīts';
      signBtn.classList.add('signed');
      signBtn.disabled = true;
      signedBy.textContent = 'Parakstīja: ' + actor + ' (' + signature.time + ')';
      signedBy.style.display = 'block';
    } else {
      signBtn.textContent = 'Parakstīties';
      signBtn.classList.remove('signed');
      signBtn.disabled = false;
      signedBy.style.display = 'none';
    }
  }

  async handleSign() {
    const today = new Date().toISOString().split('T')[0];
    const now = new Date();
    const timeStr = now.toTimeString().split(' ')[0];

    const signatureValue = this.currentUser.uzvards || this.currentUser.vards || '';

    const mark = {
      id: this.db.generateId(),
      clientId: this.clientId,
      employeeId: this.currentUser.id,
      date: today,
      shift: this.currentShift,
      category: 'paraksts',
      field: 'aprupetaja_paraksts',
      value: signatureValue,
      lastModified: now.toISOString(),
      lastBy: this.currentUser.id
    };

    await this.db.put('atzimes', mark);

    const logEntry = {
      id: this.db.generateId(),
      markId: mark.id,
      clientId: this.clientId,
      employeeId: this.currentUser.id,
      date: today,
      time: timeStr,
      shift: this.currentShift,
      category: 'paraksts',
      field: 'aprupetaja_paraksts',
      value: signatureValue,
      type: 'Jauns',
      created: now.toISOString()
    };
    await this.db.add('atzimes_log', logEntry);

    this.sync.enqueueChange({
      action: 'mark',
      table: 'atzimes',
      data: {
        clientId: this.clientId,
        employeeId: this.currentUser.id,
        date: today,
        shift: this.currentShift,
        category: 'paraksts',
        field: 'aprupetaja_paraksts',
        value: signatureValue
      }
    });

    await this.loadHistory();
    this.renderSignature();
    this.toast('Parakstīts');
  }

  toast(message) {
    const toast = document.getElementById('toast');
    toast.textContent = message;
    toast.classList.add('show');
    setTimeout(() => toast.classList.remove('show'), 2000);
  }
}

document.addEventListener('DOMContentLoaded', () => {
  window.careForm = new CareFormController();
});
