class AprupeController {
  constructor() {
    this.db = null;
    this.sync = null;
    this.clients = [];
    this.filteredClients = [];
    this.currentUser = null;
    this.todayMarks = new Map();
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

    const syncStatusEl = document.getElementById('syncStatus');
    const unsubscribe = window.addEventListener('syncStatusChange', (e) => {
      syncStatusEl.textContent = e.detail;
      syncStatusEl.className = 'sync-badge ' + e.detail.replace(/ /g, '-');
    });

    this.setupSearch();
    await this.sync.loadInitialData();
    await this.loadClients();
    await this.loadTodayMarks();
    this.renderCards();
  }

  setupSearch() {
    const searchBox = document.getElementById('searchBox');
    const searchCount = document.getElementById('searchCount');

    searchBox.addEventListener('input', (e) => {
      const term = e.target.value.trim().toLowerCase();
      this.filterClients(term);
      if (term) {
        searchCount.textContent = this.filteredClients.length + ' klienti atrasti';
      } else {
        searchCount.textContent = this.clients.length + ' klienti';
      }
    });

    searchBox.focus();
  }

  async loadClients() {
    this.clients = await this.db.getAll(CONFIG.STORES.KLIENTI);
    this.clients = this.clients.filter(c => {
      const aktivs = c.aktivs;
      return aktivs === true || aktivs === 'true' || aktivs === 1 || aktivs === '1';
    });
    this.clients.sort((a, b) => {
      const aName = ((a.uzvards || a.Uzvārds || '') + ' ' + (a.vards || a.Vārds || '')).toLowerCase();
      const bName = ((b.uzvards || b.Uzvārds || '') + ' ' + (b.vards || b.Vārds || '')).toLowerCase();
      return aName.localeCompare(bName);
    });
  }

  async loadTodayMarks() {
    const today = new Date().toISOString().split('T')[0];
    const allMarks = await this.db.getAll(CONFIG.STORES.ATZIMES);
    const todayMarks = allMarks.filter(m => m.date === today);

    todayMarks.forEach(mark => {
      const key = mark.clientId + '|' + mark.category + '|' + mark.field;
      this.todayMarks.set(key, mark);
    });

    const signedClients = new Set();
    todayMarks.forEach(m => {
      if (m.category === 'paraksts') {
        signedClients.add(m.clientId);
      }
    });
    this.signedToday = signedClients;
  }

  filterClients(term) {
    if (!term) {
      this.filteredClients = [...this.clients];
      return;
    }

    const lowerTerm = term.toLowerCase();
    this.filteredClients = this.clients.filter(client => {
      const vards = (client.vards || client.Vārds || '').toLowerCase();
      const uzvards = (client.uzvards || client.Uzvārds || '').toLowerCase();
      return vards.includes(lowerTerm) || uzvards.includes(lowerTerm);
    });
  }

  getClientStatus(clientId) {
    const today = new Date().toISOString().split('T')[0];
    const marks = Array.from(this.todayMarks.values()).filter(m => m.clientId === clientId);

    if (this.signedToday && this.signedToday.has(clientId)) {
      return { text: 'Pabeigts', class: 'status-complete' };
    }

    if (marks.length > 0) {
      return { text: marks.length + ' atzīmes', class: 'status-pending' };
    }

    return { text: 'Nav atzīmēts', class: 'status-not-started' };
  }

  renderCards() {
    const grid = document.getElementById('clientGrid');
    if (this.filteredClients.length === 0 && this.clients.length === 0) {
      grid.innerHTML = '<div class="loading">Nav klientu datu. Pārbaudiet internetu.</div>';
      return;
    }

    if (this.filteredClients.length === 0) {
      grid.innerHTML = '<div class="client-not-found">Klients nav atrasts</div>';
      return;
    }

    grid.innerHTML = this.filteredClients.map(client => {
      const id = client.id || client.ID;
      const vards = client.vards || client.Vārds || '';
      const uzvards = client.uzvards || client.Uzvārds || '';
      const dzimis = client.dzimis || client['Dzimšanas datums'] || '';
      const dieta = client.dieta || client.Diēta || '';
      const saskarsmes = client.saskarsmes || client['Saskarsmes īpatnības'] || '';

      const status = this.getClientStatus(id);
      const age = this.calculateAge(dzimis);
      const displayName = vards + ' ' + uzvards;

      let statusText = status.text;
      let statusClass = status.class;
      if (this.signedToday && this.signedToday.has(id)) {
        statusText = 'Pabeigts';
        statusClass = 'status-complete';
      }

      return `
        <div class="client-card" onclick="window.location.href='aprupetajs.html?client=${id}'">
          <div>
            <div class="client-card-name">${this.escapeHtml(vards)} ${this.escapeHtml(uzvards)}</div>
            <div class="client-card-dob">${age} gadi${dieta ? ', ' + dieta : ''}</div>
          </div>
          <div class="client-card-status">
            <span class="status-indicator ${statusClass}"></span>
            ${statusText}
          </div>
          <button class="open-btn" onclick="event.stopPropagation(); window.location.href='aprupetajs.html?client=${id}'">Atvērt</button>
        </div>
      `;
    }).join('');

    const searchCount = document.getElementById('searchCount');
    if (!searchCount.textContent) {
      searchCount.textContent = this.clients.length + ' klienti';
    }
  }

  calculateAge(dob) {
    if (!dob) return '';
    const birth = new Date(dob);
    if (isNaN(birth.getTime())) return '';
    const today = new Date();
    let age = today.getFullYear() - birth.getFullYear();
    const m = today.getMonth() - birth.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
    return age >= 0 ? age : '';
  }

  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text || '';
    return div.innerHTML;
  }

  logout() {
    sessionStorage.removeItem('careUser');
    window.location.href = 'index.html';
  }
}

document.getElementById('logoutBtn').addEventListener('click', () => {
  if (window.aprupeController) {
    window.aprupeController.logout();
  }
});

document.addEventListener('DOMContentLoaded', () => {
  window.aprupeController = new AprupeController();
});
