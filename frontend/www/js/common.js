const API_BASE = `${window.location.protocol}//${window.location.host}/api`;
let authToken = localStorage.getItem('authToken') || null;
let currentUser = JSON.parse(localStorage.getItem('currentUser') || 'null');

async function apiGet(path) {
    try {
        const res = await fetch(`${API_BASE}${path}`, { headers: { 'Authorization': `Bearer ${authToken}` } });
        if (!res.ok) { const err = await res.json().catch(() => ({error: res.statusText})); throw new Error(err.error || `HTTP ${res.status}`); }
        return res.json();
    } catch (e) { console.error('apiGet failed:', path, e); throw e; }
}

async function apiPost(path, data) {
    try {
        const res = await fetch(`${API_BASE}${path}`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${authToken}` }, body: JSON.stringify(data) });
        if (!res.ok) { const err = await res.json().catch(() => ({error: res.statusText})); throw new Error(err.error || `HTTP ${res.status}`); }
        return res.json();
    } catch (e) { console.error('apiPost failed:', path, e); throw e; }
}

async function apiDelete(path) {
    try {
        const res = await fetch(`${API_BASE}${path}`, { method: 'DELETE', headers: { 'Authorization': `Bearer ${authToken}` } });
        if (!res.ok) { const err = await res.json().catch(() => ({error: res.statusText})); throw new Error(err.error || `HTTP ${res.status}`); }
        return res.json();
    } catch (e) { console.error('apiDelete failed:', path, e); throw e; }
}

async function loginWithPin(pin, role) {
    const body = role ? { pin, role } : { pin };
    const res = await fetch(`${API_BASE}/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    if (!res.ok) { const err = await res.json(); throw new Error(err.error || 'Nepareizs PIN'); }
    const data = await res.json(); authToken = data.token; currentUser = data.user;
    localStorage.setItem('authToken', authToken); localStorage.setItem('currentUser', JSON.stringify(currentUser));
    return data;
}

async function loginWithPassword(parole, role) {
    const res = await fetch(`${API_BASE}/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ parole, role }) });
    if (!res.ok) { const err = await res.json(); throw new Error(err.error || 'Nepareiza parole'); }
    const data = await res.json(); authToken = data.token; currentUser = data.user;
    localStorage.setItem('authToken', authToken); localStorage.setItem('currentUser', JSON.stringify(currentUser));
    return data;
}

function showScreen(name) {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    const screen = document.getElementById(`screen-${name}`);
    if (screen) screen.classList.add('active');
}

let syncCooldown = false;

async function syncWithServer(showToasts = false) {
    if (typeof syncPending === 'function') {
        return syncPending();
    }
    return { synced: 0, failed: 0, skipped: true };
}

function updateSyncStatus(status) {
    const indicator = document.getElementById('sync-status');
    if (!indicator) return;
    
    const configs = {
        'synced': { text: '✓ Tiekarīts', class: 'sync-synced', action: null },
        'syncing': { text: '⟳ Sinhronizā...', class: 'sync-syncing', action: null },
        'pending': { text: `⚠ ${getPendingCount()} nesaksyncināts`, class: 'sync-pending', action: syncPending },
        'partial': { text: '⚠ Daļēji saglabāts', class: 'sync-pending', action: syncPending },
        'expired': { text: '⏳ Atsvaidzināt kešu', class: 'sync-error', action: () => { if (confirm('Keša dati ir novecojuši. Atjaunot?')) { preloadAllData(); } } },
        'error': { text: '✗ Sinhronizācijas kļūda', class: 'sync-error', action: syncPending },
        'offline': { text: '○ Nav interneta', class: 'sync-offline', action: null }
    };
    
    const config = configs[status] || configs['offline'];
    indicator.textContent = config.text;
    indicator.className = `sync-status ${config.class}`;
    indicator.title = config.action ? 'Klikšķini, lai sinhronizētu' : '';
    indicator.style.cursor = config.action ? 'pointer' : 'default';
    indicator.onclick = config.action;
}

async function checkSyncStatus() {
    const indicator = document.getElementById('sync-status');
    if (!indicator) return;
    
    if (!navigator.onLine) {
        updateSyncStatus('offline');
        return;
    }
    
    try {
        const count = await getUnsyncedCount();
        if (count === 0) {
            updateSyncStatus('synced');
        } else {
            updateSyncStatus('partial');
            indicator.textContent = `⚠ ${count} ieraksti nosūtīsi vēlāk`;
        }
    } catch (e) {
        console.error('checkSyncStatus error:', e);
        updateSyncStatus('error');
    }
}

async function checkServerHealth() {
    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 3000);
        const res = await fetch(`${API_BASE}/health`, { method: 'GET', signal: controller.signal });
        clearTimeout(timeoutId);
        return res.ok;
    } catch (e) {
        return false;
    }
}

function logout() { authToken = null; currentUser = null; localStorage.removeItem('authToken'); localStorage.removeItem('currentUser'); }

function showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = message;
    document.body.appendChild(toast);
    
    setTimeout(() => toast.classList.add('show'), 10);
    setTimeout(() => { toast.classList.remove('show'); setTimeout(() => toast.remove(), 300); }, 3000);
}

function showModal(id) { document.getElementById(id)?.classList.remove('hidden'); }
function hideModal(id) { document.getElementById(id)?.classList.add('hidden'); }

function validateField(field, rules) {
    const value = field.value.trim();
    const errorEl = field.parentElement.querySelector('.field-error');
    
    for (const rule of rules) {
        if (rule.type === 'required' && !value) {
            field.classList.add('invalid');
            if (errorEl) { errorEl.textContent = rule.message; errorEl.classList.remove('hidden'); }
            return false;
        }
        if (rule.type === 'minLength' && value.length < rule.value) {
            field.classList.add('invalid');
            if (errorEl) { errorEl.textContent = rule.message; errorEl.classList.remove('hidden'); }
            return false;
        }
        if (rule.type === 'pattern' && !rule.pattern.test(value)) {
            field.classList.add('invalid');
            if (errorEl) { errorEl.textContent = rule.message; errorEl.classList.remove('hidden'); }
            return false;
        }
    }
    
    field.classList.remove('invalid');
    if (errorEl) errorEl.classList.add('hidden');
    return true;
}

function markUnsavedChanges() {
    hasUnsavedChanges = true;
    document.querySelectorAll('.unsaved-indicator').forEach(el => el.classList.add('visible'));
}

function clearUnsavedChanges() {
    hasUnsavedChanges = false;
    document.querySelectorAll('.unsaved-indicator').forEach(el => el.classList.remove('visible'));
}

function showUnsavedChangesWarning() {
    if (!hasUnsavedChanges) return true;
    return confirm('Ir nesaglabātas izmaiņas. Vai tiešām vēlaties atstāt bez saglabāšanas?');
}

function showEmptyState(container, message, icon = '📭') {
    container.innerHTML = `<div class="empty-state"><div class="empty-icon">${icon}</div><p>${message}</p></div>`;
}

function showLoadingState(container, message = 'Ielādē...') {
    container.innerHTML = `<div class="loading-state"><div class="spinner"></div><p>${message}</p></div>`;
}

function showErrorState(container, message, retryCallback) {
    container.innerHTML = `<div class="error-state"><div class="error-icon">⚠️</div><p>${message}</p>${retryCallback ? '<button class="btn btn-secondary" onclick="' + retryCallback.name + '()">Mēģināt vēlreiz</button>' : ''}</div>`;
}

let currentClient = null;
let formActive = false;
let autinsCount = 0;
let hasUnsavedChanges = false;

window.addEventListener('online', () => { 
    updateSyncStatus('syncing');
    syncWithServer(false); 
});
window.addEventListener('offline', () => updateSyncStatus('offline'));

document.addEventListener('DOMContentLoaded', () => {
    initSQLite().catch(e => console.error('SQLite init failed:', e));
    checkSyncStatus();
    setInterval(() => checkSyncStatus(), 30000);
    startSyncLoop();
});
