function initAdminPanel() {
    console.log('initAdminPanel called');
    const tabs = document.querySelectorAll('.admin-tabs .tab');
    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            tabs.forEach(t => t.classList.remove('active'));
            document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
            tab.classList.add('active');
            document.getElementById(`tab-${tab.dataset.tab}`).classList.add('active');
            if (tab.dataset.tab === 'users') loadUsers();
            if (tab.dataset.tab === 'clients') loadClients();
            if (tab.dataset.tab === 'statistika') loadStatistikaTab();
            if (tab.dataset.tab === 'mysql') loadMySQLConfig();
        });
    });
    
    document.getElementById('btn-admin-logout').addEventListener('click', () => { logout(); window.location.href = 'index.html'; });
    document.getElementById('btn-mysql-sync')?.addEventListener('click', syncToMySQL);
    document.getElementById('btn-preload-data')?.addEventListener('click', preloadAllData);
    document.getElementById('btn-add-user').addEventListener('click', () => { console.log('add user btn clicked'); alert('Pievienot lietotāju: nospiests!'); document.getElementById('modal-user-title').textContent = 'Pievienot lietotāju'; document.getElementById('form-user').reset(); document.getElementById('form-user').dataset.userId = ''; showModal('modal-user'); });
    document.getElementById('btn-user-cancel').addEventListener('click', () => { console.log('cancel user'); hideModal('modal-user'); });
    document.getElementById('form-user').addEventListener('submit', (e) => { console.log('form-user submit event fired'); alert('forma lietotajs: submit!'); saveUser(e); });
    document.getElementById('btn-add-client').addEventListener('click', () => { console.log('add client btn clicked'); alert('Pievienot klientu: nospiests!'); document.getElementById('modal-client-title').textContent = 'Pievienot klientu'; document.getElementById('form-client').reset(); document.getElementById('form-client').dataset.clientId = ''; showModal('modal-client'); });
    document.getElementById('btn-client-cancel').addEventListener('click', () => { console.log('cancel client'); hideModal('modal-client'); });
    document.getElementById('form-client').addEventListener('submit', (e) => { console.log('form-client submit event fired'); alert('forma klients: submit!'); saveClient(e); });
    document.getElementById('form-mysql-config')?.addEventListener('submit', saveMySQLConfig);
    document.getElementById('btn-test-mysql')?.addEventListener('click', testMySQLConnection);
    
    loadUsers(); loadClients();
    checkMySQLStatus();
}

async function checkMySQLStatus() {
    const indicator = document.getElementById('mysql-status');
    if (!indicator) return;
    
    try {
        const res = await fetch(`${API_BASE}/sync/status`);
        const data = await res.json();
        if (data.mysql === 'connected') {
            indicator.textContent = '✓ MySQL';
            indicator.className = 'mysql-status mysql-connected';
        } else {
            indicator.textContent = '✗ MySQL';
            indicator.className = 'mysql-status mysql-disconnected';
        }
    } catch (e) {
        indicator.textContent = '? MySQL';
        indicator.className = 'mysql-status mysql-unknown';
    }
}

async function syncToMySQL() {
    const btn = document.getElementById('btn-mysql-sync');
    if (!btn) return;
    
    btn.disabled = true;
    btn.textContent = 'Sinhronizē...';
    
    try {
        const res = await fetch(`${API_BASE}/sync/mysql`, { method: 'POST', headers: { 'Authorization': `Bearer ${authToken}` } });
        const data = await res.json();
        
        if (data.status === 'ok') {
            showToast(`MySQL sinhronizācija veikta: ${data.result.atzimes} atzīmes, ${data.result.ieraksti} ieraksti`, 'success');
        } else {
            const errorMsg = data.result.errors.join(', ');
            if (errorMsg.includes('MySQL nav konfigurēts') || errorMsg.includes('Access denied')) {
                showToast(`MySQL kļūda: Pārbaudiet konfigurāciju MySQL tabā`, 'error');
            } else {
                showToast(`MySQL kļūda: ${errorMsg}`, 'error');
            }
        }
        
        checkMySQLStatus();
    } catch (e) {
        showToast('MySQL sinhronizācijas kļūda', 'error');
    } finally {
        btn.disabled = false;
        btn.textContent = 'MySQL Sync';
    }
}

async function loadUsers() {
    const container = document.getElementById('users-table');
    showLoadingState(container, 'Ielādē lietotājus...');
    console.log('loadUsers called');
    
    try {
        const users = await apiGet('/users');
        console.log('loadUsers got', users.length, 'users');
        let html = '<table><thead><tr><th>Vārds</th><th>Uzvārds</th><th>Loma</th><th>PIN</th><th>Status</th><th>Darbības</th></tr></thead><tbody>';
        users.forEach(u => {
            html += `<tr><td>${u.vards}</td><td>${u.uzvards}</td><td>${u.loma}</td><td>****</td><td>${u.is_active ? 'Aktīvs' : 'Bloķēts'}</td><td><button class="btn btn-secondary" style="width:auto;padding:4px 8px;font-size:12px;" onclick="editUser(${u.id})">R</button><button class="btn btn-secondary" style="width:auto;padding:4px 8px;font-size:12px;" onclick="deleteUser(${u.id})">D</button></td></tr>`;
        });
        html += '</tbody></table>';
        container.innerHTML = html;
    } catch (e) {
        console.error('loadUsers error', e);
        showErrorState(container, 'Neizdevās ielādēt lietotājus', loadUsers);
    }
}

async function saveUser(e) {
    e.preventDefault();
    console.log('saveUser called');
    alert('saveUser: sākas!');
    const userId = document.getElementById('form-user').dataset.userId;
    const user = { vards: document.getElementById('user-vards').value, uzvards: document.getElementById('user-uzvards').value, loma: document.getElementById('user-loma').value, pin_kods: document.getElementById('user-pin').value, parole: document.getElementById('user-parole').value };
    console.log('saveUser payload', user);
    
    if (!user.vards || !user.uzvards) {
        showToast('Aizpildiet visus laukus', 'error');
        return;
    }
    if (!userId && !user.pin_kods) {
        showToast('PIN jābūt 6 cipariem', 'error');
        return;
    }
    if (user.pin_kods && !/^\d{6}$/.test(user.pin_kods)) {
        showToast('PIN jābūt 6 cipariem', 'error');
        return;
    }
    
    if (user.parole && user.parole.length < 6) {
        showToast('Parolei jābūt vismaz 6 simboli', 'error');
        return;
    }
    
    const saveBtn = document.getElementById('form-user').querySelector('button[type="submit"]');
    saveBtn.disabled = true;
    saveBtn.textContent = 'Saglabā...';
    
    try {
        if (userId) {
            await fetch(`${API_BASE}/users/${userId}`, { method: 'PUT', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${authToken}` }, body: JSON.stringify(user) });
        } else {
            await apiPost('/users', user);
        }
        hideModal('modal-user'); loadUsers();
        showToast('Lietotājs saglabāts', 'success');
    } catch (err) {
        console.error('saveUser error', err);
        showToast('Neizdevās saglabāt lietotāju. Pārbaudiet datus un mēģiniet vēlreiz.', 'error');
    } finally {
        saveBtn.disabled = false;
        saveBtn.textContent = 'Saglabāt';
    }
}

async function deleteUser(id) { if (!confirm('Dzēst?')) return; await fetch(`${API_BASE}/users/${id}`, { method: 'DELETE', headers: { 'Authorization': `Bearer ${authToken}` } }); loadUsers(); }
async function editUser(id) {
    console.log('editUser called', id);
    const users = await apiGet('/users');
    const user = users.find(u => u.id === id);
    if (!user) return;
    document.getElementById('modal-user-title').textContent = 'Rediģēt';
    document.getElementById('user-vards').value = user.vards;
    document.getElementById('user-uzvards').value = user.uzvards;
    document.getElementById('user-loma').value = user.loma;
    document.getElementById('user-pin').value = '';
    document.getElementById('user-parole').value = '';
    document.getElementById('form-user').dataset.userId = id;
    showModal('modal-user');
}

async function loadClients() {
    const container = document.getElementById('clients-list');
    showLoadingState(container, 'Ielādē klientus...');
    console.log('loadClients called');
    
    try {
        const klienti = await apiGet('/klienti');
        console.log('loadClients got', klienti.length, 'clients');
        container.innerHTML = '';
        if (klienti.length === 0) { showEmptyState(container, 'Nav klientu'); return; }
        klienti.forEach(k => {
            const card = document.createElement('div');
            card.className = 'client-card';
            card.innerHTML = `<div><div class="client-name">${k.vards} ${k.uzvards}</div><div class="client-meta">${k.dzimšanas_datums}${k.dieta ? ' · ' + k.dieta : ''}</div></div><div class="client-actions"><button class="btn btn-secondary" style="width:auto;padding:4px 8px;font-size:12px;" onclick="editClient(${k.id})" title="Rediģēt">✏️</button><button class="btn btn-secondary" style="width:auto;padding:4px 8px;font-size:12px;" onclick="deleteClient(${k.id})" title="Dzēst">🗑️</button></div>`;
            container.appendChild(card);
        });
    } catch (e) {
        console.error('loadClients error', e);
        showErrorState(container, 'Neizdevās ielādēt klientus', loadClients);
    }
}

async function saveClient(e) {
    e.preventDefault();
    console.log('saveClient called');
    alert('saveClient: sākas!');
    const clientId = document.getElementById('form-client').dataset.clientId;
    const client = { vards: document.getElementById('client-vards').value, uzvards: document.getElementById('client-uzvards').value, dzimšanas_datums: document.getElementById('client-dzimsana').value, dieta: document.getElementById('client-dieta').value, saskarsmes_ipatnibas: document.getElementById('client-saskarsme').value, is_active: 1 };
    console.log('saveClient payload', client);
    
    if (!client.vards || !client.uzvards || !client.dzimšanas_datums) {
        showToast('Aizpildiet visus laukus', 'error');
        return;
    }
    
    const saveBtn = document.getElementById('form-client').querySelector('button[type="submit"]');
    saveBtn.disabled = true;
    saveBtn.textContent = 'Saglabā...';
    
    try {
        if (clientId) {
            await fetch(`${API_BASE}/klienti/${clientId}`, { method: 'PUT', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${authToken}` }, body: JSON.stringify(client) });
        } else {
            await apiPost('/klienti', client);
        }
        hideModal('modal-client'); loadClients();
        showToast('Klients saglabāts', 'success');
    } catch (err) {
        console.error('saveClient error', err);
        showToast('Neizdevās saglabāt klientu. Pārbaudiet datus un mēģiniet vēlreiz.', 'error');
    } finally {
        saveBtn.disabled = false;
        saveBtn.textContent = 'Saglabāt';
    }
}

async function deleteClient(id) { if (!confirm('Dzēst klientu?')) return; await fetch(`${API_BASE}/klienti/${id}`, { method: 'DELETE', headers: { 'Authorization': `Bearer ${authToken}` } }); loadClients(); }
async function editClient(id) {
    console.log('editClient called', id);
    const klienti = await apiGet('/klienti');
    const k = klienti.find(c => c.id === id);
    if (!k) return;
    document.getElementById('modal-client-title').textContent = 'Rediģēt klientu';
    document.getElementById('client-vards').value = k.vards;
    document.getElementById('client-uzvards').value = k.uzvards;
    document.getElementById('client-dzimsana').value = k.dzimšanas_datums;
    document.getElementById('client-dieta').value = k.dieta || '';
    document.getElementById('client-saskarsme').value = k.saskarsmes_ipatnibas || '';
    document.getElementById('form-client').dataset.clientId = id;
    showModal('modal-client');
}

async function importExcel() {
    const fileInput = document.getElementById('excel-file');
    const file = fileInput.files[0];
    if (!file) return;
    const formData = new FormData(); formData.append('file', file);
    const res = await fetch(`${API_BASE}/import-clients`, { method: 'POST', headers: { 'Authorization': `Bearer ${authToken}` }, body: formData });
    const data = await res.json();
    document.getElementById('import-status').textContent = data.status === 'ok' ? `✓ ${data.count} klienti` : '✗ ' + data.message;
}

async function downloadTemplate() {
    const res = await fetch(`${API_BASE}/template/clients`, { headers: { 'Authorization': `Bearer ${authToken}` } });
    if (!res.ok) { alert('Kļūda lejupielādējot veidni'); return; }
    const blob = await res.blob();
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'klientu_veidne.xlsx'; a.click();
}

async function loadStatistikaTab() {
    const workers = await apiGet('/users');
    const select = document.getElementById('stat-klient');
    if (select) { select.innerHTML = '<option value="">Visi</option>'; workers.filter(w => w.loma === 'aprupetajs').forEach(w => { select.innerHTML += `<option value="${w.id}">${w.vards} ${w.uzvards}</option>`; }); }
    if (typeof loadStatistika === 'function') loadStatistika();
}

let statistikaData = [];

async function loadStatistika() {
    const klients_id = document.getElementById('stat-klient').value;
    const monthInput = document.getElementById('stat-month').value;
    let url = `${API_BASE}/statistika`;
    const params = new URLSearchParams();
    if (klients_id) params.append('klients_id', klients_id);
    if (monthInput) { const [year, month] = monthInput.split('-'); params.append('no', `${year}-${month}-01`); params.append('līdz', `${year}-${month}-31`); }
    url += '?' + params.toString();
    
    const res = await fetch(url, { headers: { 'Authorization': `Bearer ${authToken}` } });
    statistikaData = await res.json();
    renderStatistika();
}

function renderStatistika() {
    const container = document.getElementById('stat-chart-container');
    if (!statistikaData.length) { container.innerHTML = '<p style="text-align:center;padding:20px;">Nav datu</p>'; document.getElementById('stat-total').textContent = '0'; document.getElementById('stat-temp').textContent = '-'; document.getElementById('stat-refusals').textContent = '0'; return; }
    
    const total = statistikaData.length;
    const temps = statistikaData.filter(d => d.kategorija === 'temp' && d.vertiba).map(d => parseFloat(d.vertiba)).filter(t => !isNaN(t));
    const avgTemp = temps.length ? (temps.reduce((a, b) => a + b, 0) / temps.length).toFixed(1) : '-';
    const refusals = statistikaData.filter(d => d.vertiba === 'A').length;
    
    document.getElementById('stat-total').textContent = total;
    document.getElementById('stat-temp').textContent = avgTemp + '°C';
    document.getElementById('stat-refusals').textContent = refusals;
    
    const categories = {};
    statistikaData.forEach(d => { categories[d.kategorija] = (categories[d.kategorija] || 0) + 1; });
    
    container.innerHTML = '<canvas id="stat-chart" width="400" height="200"></canvas>';
    const ctx = document.getElementById('stat-chart').getContext('2d');
    new Chart(ctx, { type: 'bar', data: { labels: Object.keys(categories), datasets: [{ label: 'Ieraksti', data: Object.values(categories), backgroundColor: 'rgba(37, 99, 235, 0.8)' }] }, options: { responsive: true, scales: { y: { beginAtZero: true, ticks: { stepSize: 1 } } } } });
}

async function exportExcel() {
    const klients_id = document.getElementById('stat-klient').value;
    const monthInput = document.getElementById('stat-month').value;
    if (!monthInput) { alert('Izvēlieties mēnesi'); return; }
    const [year, month] = monthInput.split('-');
    const url = `${API_BASE}/export/excel?month=${month}&year=${year}${klients_id ? '&klients_id=' + klients_id : ''}`;
    const res = await fetch(url, { headers: { 'Authorization': `Bearer ${authToken}` } });
    if (!res.ok) { alert('Kļūda eksportējot'); return; }
    const blob = await res.blob();
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `aprupes_${month}_${year}.xlsx`; a.click();
}

async function loadMySQLConfig() {
    try {
        const res = await fetch(`${API_BASE}/mysql/config`, { headers: { 'Authorization': `Bearer ${authToken}` } });
        const data = await res.json();
        if (data.host) {
            document.getElementById('mysql-host').value = data.host;
            document.getElementById('mysql-port').value = data.port || 3306;
            document.getElementById('mysql-user').value = data.user;
            document.getElementById('mysql-password').value = data.password || '';
            document.getElementById('mysql-database').value = data.database;
        }
    } catch (e) {
        console.error('Failed to load MySQL config', e);
    }
}

async function testMySQLConnection() {
    const statusEl = document.getElementById('mysql-status-text');
    statusEl.textContent = 'Pārbauda...';
    statusEl.className = 'status-text';
    
    const config = {
        host: document.getElementById('mysql-host').value,
        port: parseInt(document.getElementById('mysql-port').value) || 3306,
        user: document.getElementById('mysql-user').value,
        password: document.getElementById('mysql-password').value,
        database: document.getElementById('mysql-database').value
    };
    
    try {
        const res = await fetch(`${API_BASE}/mysql/test`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${authToken}` },
            body: JSON.stringify(config)
        });
        const data = await res.json();
        if (data.status === 'ok') {
            statusEl.textContent = '✓ ' + data.message;
            statusEl.className = 'status-text status-success';
        } else {
            statusEl.textContent = '✗ ' + data.message;
            statusEl.className = 'status-text status-error';
        }
    } catch (e) {
        statusEl.textContent = '✗ Kļūda: ' + e.message;
        statusEl.className = 'status-text status-error';
    }
}

async function saveMySQLConfig(e) {
    e.preventDefault();
    const statusEl = document.getElementById('mysql-status-text');
    statusEl.textContent = 'Saglabā...';
    statusEl.className = 'status-text';
    
    const config = {
        host: document.getElementById('mysql-host').value,
        port: parseInt(document.getElementById('mysql-port').value) || 3306,
        user: document.getElementById('mysql-user').value,
        password: document.getElementById('mysql-password').value,
        database: document.getElementById('mysql-database').value,
        enabled: true
    };
    
    try {
        const res = await fetch(`${API_BASE}/mysql/config`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${authToken}` },
            body: JSON.stringify(config)
        });
        const data = await res.json();
        if (data.status === 'ok') {
            statusEl.textContent = '✓ Konfigurācija saglabāta!';
            statusEl.className = 'status-text status-success';
            checkMySQLStatus();
        } else {
            statusEl.textContent = '✗ Kļūda saglabājot';
            statusEl.className = 'status-text status-error';
        }
    } catch (e) {
        statusEl.textContent = '✗ Kļūda: ' + e.message;
        statusEl.className = 'status-text status-error';
    }
}

document.addEventListener('DOMContentLoaded', initAdminPanel);
