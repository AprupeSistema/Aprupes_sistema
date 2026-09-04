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
    await this.loadClient();
    await this.loadMarks();
    await this.loadHistory();
    this.renderForm();
    this.renderHistory();
    this.renderSignature();
    this.sync.loadInitialData().then(async () => {
      await this.loadClient();
      await this.loadMarks();
      await this.loadHistory();
      this.renderForm();
      this.renderHistory();
      this.renderSignature();
    });
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
      console.log('[care_form] clientId from URL:', this.clientId, 'type:', typeof this.clientId);
      console.log('[care_form] all clients:', allClients.map(c => ({ id: c.id, ID: c.ID, vards: c.vards, uzvards: c.uzvards })));
      this.client = allClients.find(c => c.id === this.clientId || c.ID === this.clientId || String(c.id) === String(this.clientId));
    }
    if (!this.client) {
      console.warn('[care_form] client not found for id:', this.clientId);
      this.toast('Klients nav atrasts');
      setTimeout(() => window.location.href = 'aprupe.html', 1500);
      return;
    }

    const vards = this.client.vards || this.client.Vārds || '';
    const uzvards = this.client.uzvards || this.client.Uzvārds || '';
    document.getElementById('clientName').textContent = vards + ' ' + uzvards;
    document.getElementById('clientName2').textContent = vards + ' ' + uzvards;
    document.getElementById('clientDob').textContent = 'Dzimis: ' + this.formatDob(this.client.dzimis || this.client['Dzimšanas datums']);
    const diet = this.client.dieta || this.client.Diēta || '';
    const saskarsme = this.client.saskarsmes || this.client['Saskarsmes īpatnības'] || '';
    document.getElementById('clientDiet').textContent = diet || 'Diēta nav norādīta';
    document.getElementById('clientDiet').classList.toggle('empty', !diet);
    document.getElementById('clientSaskarsme').textContent = saskarsme || 'Saskarsme nav norādīta';
    document.getElementById('clientSaskarsme').classList.toggle('empty', !saskarsme);
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
    this.updateCategoryStatuses();
  }

  updateCategoryStatuses() {
    const shift = this.currentShift;

    const tempMark = this.getMark(shift, 'temp', 'temperatura');
    const tempEl = document.getElementById('status-temp');
    if (tempEl) {
      if (tempMark && tempMark.value) {
        const v = parseFloat(tempMark.value);
        if (!isNaN(v) && v >= 37) {
          tempEl.textContent = '🔥 ' + tempMark.value + '°C';
          tempEl.className = 'cat-status alert';
        } else {
          tempEl.textContent = '✓ ' + tempMark.value + '°C';
          tempEl.className = 'cat-status completed';
        }
      } else {
        tempEl.textContent = 'Nav mērīts';
        tempEl.className = 'cat-status';
      }
    }

    const higienaFields = CONFIG.FIELD_DEFINITIONS.higiena.fields;
    const higienaDone = higienaFields.filter(f => this.getMark(shift, 'higiena', f.field)).length;
    const higienaEl = document.getElementById('status-higiena');
    if (higienaEl) {
      if (higienaDone === higienaFields.length) {
        higienaEl.textContent = '✓ Viss pabeigts';
        higienaEl.className = 'cat-status completed';
      } else if (higienaDone > 0) {
        higienaEl.textContent = higienaDone + ' / ' + higienaFields.length;
        higienaEl.className = 'cat-status';
      } else {
        higienaEl.textContent = 'Nav sākts';
        higienaEl.className = 'cat-status';
      }
    }

    const aktFields = CONFIG.FIELD_DEFINITIONS.aktivitate.fields;
    const aktDone = aktFields.filter(f => this.getMark(shift, 'aktivitate', f.field)).length;
    const aktEl = document.getElementById('status-aktivitate');
    if (aktEl) {
      if (aktDone === aktFields.length) {
        aktEl.textContent = '✓ Viss pabeigts';
        aktEl.className = 'cat-status completed';
      } else if (aktDone > 0) {
        aktEl.textContent = aktDone + ' / ' + aktFields.length;
        aktEl.className = 'cat-status';
      } else {
        aktEl.textContent = 'Nav sākts';
        aktEl.className = 'cat-status';
      }
    }

    const edinFields = CONFIG.FIELD_DEFINITIONS.edinasana.fields;
    const edinDone = edinFields.filter(f => this.getMark(shift, 'edinasana', f.field)).length;
    const edinEl = document.getElementById('status-edinasana');
    if (edinEl) {
      if (edinDone === edinFields.length) {
        edinEl.textContent = '✓ Visas ēdienreizes';
        edinEl.className = 'cat-status completed';
      } else if (edinDone > 0) {
        edinEl.textContent = edinDone + ' / ' + edinFields.length;
        edinEl.className = 'cat-status';
      } else {
        edinEl.textContent = 'Nav sākts';
        edinEl.className = 'cat-status';
      }
    }

    const urins = this.getMark(shift, 'sikdrumi', 'urina_daudzums');
    const uznemts = this.getMark(shift, 'sikdrumi', 'uznemts_ml');
    const sikEl = document.getElementById('status-sikdrumi');
    if (sikEl) {
      if (urins || uznemts) {
        sikEl.textContent = '✓ Ierakstīts';
        sikEl.className = 'cat-status completed';
      } else {
        sikEl.textContent = 'Nav ierakstu';
        sikEl.className = 'cat-status';
      }
    }

    const fizMark = this.getMark(shift, 'fiziologija', 'vedera_izeja');
    const fizEl = document.getElementById('status-fiziologija');
    if (fizEl) {
      if (fizMark && fizMark.value) {
        fizEl.textContent = '✓ ' + fizMark.value;
        fizEl.className = 'cat-status completed';
      } else {
        fizEl.textContent = 'Nav ieraksta';
        fizEl.className = 'cat-status';
      }
    }

    const autins = this.getMark(shift, 'citsi_pasakomi', 'autins_biksitu_skaits');
    const citiEl = document.getElementById('status-citi');
    if (citiEl) {
      if (autins && autins.value) {
        citiEl.textContent = '👶 ' + autins.value + ' maiņas';
        citiEl.className = 'cat-status completed';
      } else {
        citiEl.textContent = 'Nav ierakstu';
        citiEl.className = 'cat-status';
      }
    }
  }

  setupEventListeners() {
    document.getElementById('backBtn').addEventListener('click', () => {
      window.location.href = 'aprupe.html';
    });

    document.querySelectorAll('.shift-tab').forEach(tab => {
      tab.addEventListener('click', (e) => {
        document.querySelectorAll('.shift-tab').forEach(t => t.classList.remove('active'));
        e.currentTarget.classList.add('active');
        this.currentShift = e.currentTarget.dataset.shift;
        this.updateCategoryStatuses();
      });
    });

    document.getElementById('signBtn').addEventListener('click', () => {
      this.handleSign();
    });

    document.querySelectorAll('.category-card').forEach(card => {
      card.addEventListener('click', (e) => {
        const cat = e.currentTarget.dataset.cat;
        this.openCategoryModal(cat);
      });
    });

    document.getElementById('modalClose').addEventListener('click', () => {
      this.closeCategoryModal();
    });
    document.getElementById('categoryModal').addEventListener('click', (e) => {
      if (e.target.id === 'categoryModal') this.closeCategoryModal();
    });
  }

  openCategoryModal(cat) {
    const modal = document.getElementById('categoryModal');
    const title = document.getElementById('modalTitle');
    const body = document.getElementById('modalBody');
    const shift = this.currentShift;
    const titles = {
      temp: '🌡️ Temperatūra',
      higiena: '🧼 Higiēna',
      aktivitate: '🚶 Aktivitāte',
      edinasana: '🍽️ Ēdīšana',
      sikdrumi: '💧 Šķidrumi',
      fiziologija: '🚽 Vēdera izeja',
      citi: '📋 Citi pasākumi'
    };
    title.textContent = titles[cat] || cat;
    let html = '';
    if (cat === 'temp') html = this.renderTempSection(shift);
    else if (cat === 'higiena') html = this.renderHigienaSection(shift);
    else if (cat === 'aktivitate') html = this.renderAktivitateSection(shift);
    else if (cat === 'edinasana') html = this.renderEdinasanaSection(shift);
    else if (cat === 'sikdrumi') html = this.renderSikdrumiSection(shift);
    else if (cat === 'fiziologija') html = this.renderFiziologijaSection(shift);
    else if (cat === 'citi') html = this.renderCitiPasakumiSection(shift);
    body.innerHTML = html;
    modal.style.display = 'flex';
    this.bindFormEvents();
  }

  closeCategoryModal() {
    document.getElementById('categoryModal').style.display = 'none';
    this.updateCategoryStatuses();
  }

  sectionCard(cssClass, emoji, title, statusKey, body) {
    let status = '';
    if (statusKey) {
      const completed = this.isSectionCompleted(statusKey);
      status = completed ? '<span class="section-status completed">Pabeigts</span>' : '<span class="section-status">Aktīvs</span>';
    }
    return `<div class="section-card ${cssClass}">
      <div class="section-header">
        <div class="section-title"><span class="section-emoji">${emoji}</span><span>${title}</span></div>
        ${status}
      </div>
      ${body}
    </div>`;
  }

  isSectionCompleted(sectionKey) {
    if (sectionKey === 'temp') {
      const m = this.getMark(this.currentShift, 'temp', 'temperatura');
      return m && m.value !== '';
    }
    if (sectionKey === 'edinasana') {
      const fields = CONFIG.FIELD_DEFINITIONS.edinasana.fields;
      return fields.some(f => {
        const m = this.getMark(this.currentShift, 'edinasana', f.field);
        return m && m.value;
      });
    }
    return false;
  }

  renderTempSection(shift) {
    const mark = this.getMark(shift, 'temp', 'temperatura');
    const value = mark ? mark.value : '';
    const numVal = parseFloat(value);
    const isFever = !isNaN(numVal) && numVal >= 37;

    const body = `
      <div class="section-row">
        <div class="section-row-label">
          <span>Pēdējā vērtība</span>
          ${value ? `<span class="current-value ${isFever ? 'fever' : ''}">${value}°C${isFever ? ' 🔥' : ''}</span>` : '<span class="current-value empty"></span>'}
        </div>
        <input type="number" step="0.1" min="30" max="45" class="number-input temp-input ${isFever ? 'fever' : ''} ${value ? 'has-value' : ''}" data-cat="temp" data-field="temperatura" value="${value}" placeholder="36.6">
      </div>
    `;
    return this.sectionCard('section-temp', '🌡️', 'Temperatūra', 'temp', body);
  }

  renderHigienaSection(shift) {
    const fields = CONFIG.FIELD_DEFINITIONS.higiena.fields;
    let body = '';
    fields.forEach(f => {
      const mark = this.getMark(shift, 'higiena', f.field);
      const hasValue = mark && mark.value === 'X';
      body += `
        <div class="section-row">
          <div class="section-row-label">
            <span>${f.label}</span>
            <span class="current-value ${hasValue ? '' : 'empty'}">${hasValue ? '✓ Izpildīts' : ''}</span>
          </div>
          <div class="opt-group">
            <button class="opt-btn ${hasValue ? 'active' : ''}" data-cat="higiena" data-field="${f.field}" data-value="X" data-shift="${shift}">
              ${hasValue ? '✓' : 'X'}
            </button>
          </div>
        </div>
      `;
    });
    return this.sectionCard('section-higiena', '🧼', 'Higiēna', null, body);
  }

  renderAktivitateSection(shift) {
    const fields = CONFIG.FIELD_DEFINITIONS.aktivitate.fields;
    let body = '';
    fields.forEach(f => {
      const mark = this.getMark(shift, 'aktivitate', f.field);
      const hasValue = mark && mark.value === 'X';
      body += `
        <div class="section-row">
          <div class="section-row-label">
            <span>${f.label}</span>
            <span class="current-value ${hasValue ? '' : 'empty'}">${hasValue ? '✓' : ''}</span>
          </div>
          <div class="opt-group">
            <button class="opt-btn ${hasValue ? 'active' : ''}" data-cat="aktivitate" data-field="${f.field}" data-value="X" data-shift="${shift}">
              ${hasValue ? '✓' : 'X'}
            </button>
          </div>
        </div>
      `;
    });
    return this.sectionCard('section-aktivitate', '🚶', 'Aktivitāte', null, body);
  }

  renderEdinasanaSection(shift) {
    const fields = CONFIG.FIELD_DEFINITIONS.edinasana.fields;
    let body = '';
    fields.forEach(f => {
      const mark = this.getMark(shift, 'edinasana', f.field);
      const current = mark ? mark.value : '';
      const valueLabel = current === 'X' ? '✓ Visa' : current === '½' ? '½ Puse' : current === 'A' ? '✗ Atteicās' : '';
      body += `
        <div class="section-row">
          <div class="section-row-label">
            <span>${f.label}</span>
            <span class="current-value ${valueLabel ? '' : 'empty'}">${valueLabel}</span>
          </div>
          <div class="opt-group">
            <button class="opt-btn ${current === 'X' ? 'active' : ''}" data-cat="edinasana" data-field="${f.field}" data-value="X" data-shift="${shift}">X</button>
            <button class="opt-btn food-half ${current === '½' ? 'active' : ''}" data-cat="edinasana" data-field="${f.field}" data-value="½" data-shift="${shift}">½</button>
            <button class="opt-btn refused ${current === 'A' ? 'active' : ''}" data-cat="edinasana" data-field="${f.field}" data-value="A" data-shift="${shift}">A</button>
          </div>
        </div>
      `;
    });
    return this.sectionCard('section-edinasana', '🍽️', 'Ēdīšana', 'edinasana', body);
  }

  renderSikdrumiSection(shift) {
    const urinsMark = this.getMark(shift, 'sikdrumi', 'urina_daudzums');
    const uznemtsMark = this.getMark(shift, 'sikdrumi', 'uznemts_ml');
    const body = `
      <div class="section-row">
        <div class="section-row-label">
          <span>Diennakts urīna daudzums (ml)</span>
          ${urinsMark && urinsMark.value ? `<span class="current-value">${urinsMark.value} ml</span>` : '<span class="current-value empty"></span>'}
        </div>
        <input type="number" min="0" step="50" class="number-input ${urinsMark && urinsMark.value ? 'has-value' : ''}" data-cat="sikdrumi" data-field="urina_daudzums" value="${urinsMark ? urinsMark.value : ''}" placeholder="0">
      </div>
      <div class="section-row">
        <div class="section-row-label">
          <span>Uzņemts H2O (24h, ml)</span>
          ${uznemtsMark && uznemtsMark.value ? `<span class="current-value">${uznemtsMark.value} ml</span>` : '<span class="current-value empty"></span>'}
        </div>
        <input type="number" min="0" step="50" class="number-input ${uznemtsMark && uznemtsMark.value ? 'has-value' : ''}" data-cat="sikdrumi" data-field="uznemts_ml" value="${uznemtsMark ? uznemtsMark.value : ''}" placeholder="0">
      </div>
    `;
    return this.sectionCard('section-sikdrumi', '💧', 'Šķidrumi', null, body);
  }

  renderFiziologijaSection(shift) {
    const mark = this.getMark(shift, 'fiziologija', 'vedera_izeja');
    const current = mark ? mark.value : '';
    const labels = { 'N': 'Normāla', 'A': 'Aizcietējums', 'S': 'Svecīte', 'C': 'Caureja', 'K': 'Klizma' };
    const valueLabel = labels[current] || '';
    const body = `
      <div class="section-row">
        <div class="section-row-label">
          <span>Vērtība</span>
          <span class="current-value ${valueLabel ? '' : 'empty'}">${valueLabel}</span>
        </div>
        <div class="opt-group">
          <button class="opt-btn fiziologija ${current === 'N' ? 'active' : ''}" data-cat="fiziologija" data-field="vedera_izeja" data-value="N" data-shift="${shift}">N</button>
          <button class="opt-btn fiziologija ${current === 'A' ? 'active' : ''}" data-cat="fiziologija" data-field="vedera_izeja" data-value="A" data-shift="${shift}">A</button>
          <button class="opt-btn fiziologija ${current === 'S' ? 'active' : ''}" data-cat="fiziologija" data-field="vedera_izeja" data-value="S" data-shift="${shift}">S</button>
          <button class="opt-btn fiziologija ${current === 'C' ? 'active' : ''}" data-cat="fiziologija" data-field="vedera_izeja" data-value="C" data-shift="${shift}">C</button>
          <button class="opt-btn fiziologija ${current === 'K' ? 'active' : ''}" data-cat="fiziologija" data-field="vedera_izeja" data-value="K" data-shift="${shift}">K</button>
        </div>
      </div>
    `;
    return this.sectionCard('section-fiziologija', '🚽', 'Vēdera izeja', null, body);
  }

  renderCitiPasakumiSection(shift) {
    const markAda = this.getMark(shift, 'citsi_pasakomi', 'adas_kopsana');
    const markPastaiga = this.getMark(shift, 'citsi_pasakomi', 'pastaigas');
    const markCiemini = this.getMark(shift, 'citsi_pasakomi', 'ciemini');
    const markAutins = this.getMark(shift, 'citsi_pasakomi', 'autins_biksitu_skaits');

    const cieminiVal = markCiemini ? markCiemini.value : '';
    const body = `
      <div class="section-row">
        <div class="section-row-label">
          <span>Ādas kopšanas līdzekļi</span>
          <span class="current-value ${markAda && markAda.value === 'X' ? '' : 'empty'}">${markAda && markAda.value === 'X' ? '✓' : ''}</span>
        </div>
        <div class="opt-group">
          <button class="opt-btn ${markAda && markAda.value === 'X' ? 'active' : ''}" data-cat="citsi_pasakomi" data-field="adas_kopsana" data-value="X" data-shift="${shift}">
            ${markAda && markAda.value === 'X' ? '✓' : 'X'}
          </button>
        </div>
      </div>
      <div class="section-row">
        <div class="section-row-label">
          <span>Pastaigas svaigā gaisā</span>
          <span class="current-value ${markPastaiga && markPastaiga.value === 'X' ? '' : 'empty'}">${markPastaiga && markPastaiga.value === 'X' ? '✓' : ''}</span>
        </div>
        <div class="opt-group">
          <button class="opt-btn ${markPastaiga && markPastaiga.value === 'X' ? 'active' : ''}" data-cat="citsi_pasakomi" data-field="pastaigas" data-value="X" data-shift="${shift}">
            ${markPastaiga && markPastaiga.value === 'X' ? '✓' : 'X'}
          </button>
        </div>
      </div>
      <div class="section-row">
        <div class="section-row-label">
          <span>Ciemiņi</span>
          <span class="current-value ${cieminiVal ? '' : 'empty'}">${cieminiVal || ''}</span>
        </div>
        <div class="opt-group">
          <button class="opt-btn ${cieminiVal === 'X' ? 'active' : ''}" data-cat="citsi_pasakomi" data-field="ciemini" data-value="X" data-shift="${shift}">Jā</button>
          <button class="opt-btn refused ${cieminiVal === 'Nē' ? 'active' : ''}" data-cat="citsi_pasakomi" data-field="ciemini" data-value="Nē" data-shift="${shift}">Nē</button>
        </div>
      </div>
      <div class="section-row">
        <div class="section-row-label">
          <span>Autiņbiksīšu maiņa</span>
          <span class="current-value" id="diaperCount">${markAutins && markAutins.value ? markAutins.value + ' šodien' : ''}</span>
        </div>
        <button class="opt-btn diaper-btn" data-cat="citsi_pasakomi" data-field="autins_biksitu_skaits" data-shift="${shift}">
          <span class="diaper-icon">👶</span>
          <span>+1 maiņa</span>
        </button>
      </div>
    `;
    return this.sectionCard('section-citi', '📋', 'Citi pasākumi', null, body);
  }

  bindFormEvents() {
    document.querySelectorAll('.opt-btn:not(.diaper-btn)').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const cat = e.currentTarget.dataset.cat;
        const field = e.currentTarget.dataset.field;
        const value = e.currentTarget.dataset.value;
        const shift = e.currentTarget.dataset.shift;
        this.handleOptionSelect(shift, cat, field, value, e.currentTarget);
      });
    });

    document.querySelectorAll('.diaper-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const cat = e.currentTarget.dataset.cat;
        const field = e.currentTarget.dataset.field;
        const shift = e.currentTarget.dataset.shift;
        this.handleDiaperIncrement(shift, cat, field, e.currentTarget);
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

  async handleDiaperIncrement(shift, category, field, btn) {
    const key = shift + '|' + category + '|' + field;
    const existing = this.marks.get(key);
    const currentCount = existing ? parseInt(existing.value) || 0 : 0;
    const newCount = currentCount + 1;

    btn.classList.add('pulse');
    setTimeout(() => btn.classList.remove('pulse'), 300);

    await this.saveMark({
      clientId: this.clientId,
      shift: shift,
      category: category,
      field: field,
      value: String(newCount),
      prevValue: existing ? existing.value : null,
      type: existing ? 'Labots' : 'Jauns'
    });

    const logEntry = {
      id: this.db.generateId(),
      markId: 'diaper_' + Date.now(),
      clientId: this.clientId,
      employeeId: this.currentUser.id,
      date: new Date().toISOString().split('T')[0],
      time: new Date().toTimeString().split(' ')[0],
      shift: shift,
      category: category,
      field: field,
      value: '+1 (kopā: ' + newCount + ')',
      type: 'Jauns',
      created: new Date().toISOString()
    };
    await this.db.add('atzimes_log', logEntry);

    this.sync.enqueueChange({
      action: 'mark',
      table: 'atzimes',
      data: {
        clientId: this.clientId,
        employeeId: this.currentUser.id,
        date: logEntry.date,
        shift: shift,
        category: category,
        field: field,
        value: String(newCount)
      }
    });

    this.toast('✓ Maiņa pievienota (' + newCount + ')');
    this.openCategoryModal('citi');
    await this.loadHistory();
    this.renderHistory();
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

    const catMap = { temp: 'temp', higiena: 'higiena', aktivitate: 'aktivitate', edinasana: 'edinasana', sikdrumi: 'sikdrumi', fiziologija: 'fiziologija', citsi_pasakomi: 'citi' };
    const openCat = catMap[category];
    if (openCat) {
      this.openCategoryModal(openCat);
    }
    await this.loadHistory();
    this.renderHistory();
    this.toast('Saglabāts');
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
    const catMap = { temp: 'temp', higiena: 'higiena', aktivitate: 'aktivitate', edinasana: 'edinasana', sikdrumi: 'sikdrumi', fiziologija: 'fiziologija', citsi_pasakomi: 'citi' };
    const openCat = catMap[category];
    if (openCat) {
      this.openCategoryModal(openCat);
    }
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
