let allWorkers = [];
let selectedWorker = null;
let selectedRole = null;
let pinProcessing = false;

function initLoginScreen() {
    document.getElementById('login-date').textContent = new Date().toLocaleDateString('lv-LV');
    const searchInput = document.getElementById('worker-search');
    const workerList = document.getElementById('worker-list');
    
    loadWorkers();
    
    searchInput.addEventListener('input', (e) => {
        const query = e.target.value.toLowerCase();
        const filtered = allWorkers.filter(w => w.loma === 'aprupetajs' && w.is_active && `${w.vards} ${w.uzvards}`.toLowerCase().includes(query));
        renderWorkers(filtered);
    });
    
    document.getElementById('btn-admin-login').addEventListener('click', () => showPinModal('admin'));
    document.getElementById('btn-control-login').addEventListener('click', () => showPinModal('kontrolieris'));
    initPinKeypad();
}

async function loadWorkers() {
    try {
        const res = await fetch(`${API_BASE}/users`);
        const workers = await res.json();
        allWorkers = workers;
        renderWorkers(workers.filter(w => w.loma === 'aprupetajs' && w.is_active));
    } catch (e) { console.error('Failed to load workers:', e); }
}

function renderWorkers(workers) {
    const list = document.getElementById('worker-list');
    list.innerHTML = '';
    if (workers.length === 0) { list.innerHTML = '<div style="text-align:center;padding:20px;color:var(--text-secondary);">Nav aprūpētāju</div>'; return; }
    workers.forEach(w => {
        const card = document.createElement('div');
        card.className = 'worker-card';
        card.innerHTML = `<div><div class="worker-name">${w.vards} ${w.uzvards}</div><div class="worker-role">Aprūpētājs</div></div><div class="worker-arrow">›</div>`;
        card.addEventListener('click', () => showPinModal('aprupetajs', w));
        list.appendChild(card);
    });
}

function showPinModal(role, worker = null) {
    selectedRole = role;
    selectedWorker = worker;
    const modal = document.getElementById('pin-modal');
    const title = document.getElementById('pin-modal-title');
    const pinInput = document.getElementById('pin-input');
    const pinKeysContainer = document.querySelector('.pin-keys');
    
    if (role === 'aprupetajs' && worker) { title.textContent = `${worker.vards} ${worker.uzvards} — PIN`; }
    else if (role === 'admin') { title.textContent = 'Vadītāja PIN'; }
    else { title.textContent = 'Kontroliera parole'; }
    
    pinInput.value = ''; 
    if (role === 'kontrolieris') {
        pinInput.type = 'text';
        pinInput.maxLength = 50;
        pinInput.inputMode = 'text';
        if (pinKeysContainer) pinKeysContainer.style.display = 'none';
    } else {
        pinInput.type = 'password';
        pinInput.maxLength = 6;
        pinInput.inputMode = 'numeric';
        if (pinKeysContainer) pinKeysContainer.style.display = 'grid';
    }
    modal.classList.remove('hidden'); pinInput.focus();
    
    // Show/hide 24h checkbox based on role
    const chk24h = document.getElementById('chk-24h');
    const chkContainer = document.getElementById('24h-checkbox-container');
    if (chkContainer) {
        if (role === 'aprupetajs' && worker) {
            chkContainer.style.display = 'flex';
            if (chk24h && worker.ir_24h !== undefined) {
                chk24h.checked = !!worker.ir_24h;
            } else if (chk24h) {
                chk24h.checked = true;
            }
        } else {
            chkContainer.style.display = 'none';
        }
    }
    
    document.getElementById('btn-pin-cancel').onclick = () => { modal.classList.add('hidden'); selectedWorker = null; selectedRole = null; };
}

async function submitPin() {
    if (pinProcessing) return;
    pinProcessing = true;
    const pinInput = document.getElementById('pin-input');
    const errorEl = document.getElementById('pin-error');
    const val = pinInput.value;
    if (!val) { errorEl.textContent = 'Ievadi PIN vai paroli'; errorEl.classList.remove('hidden'); pinProcessing = false; return; }
    if (selectedRole !== 'kontrolieris' && val.length < 6) { errorEl.textContent = 'PIN jābūt 6 cipariem'; errorEl.classList.remove('hidden'); pinProcessing = false; return; }
    
    try {
        if (selectedWorker) { 
            await loginWithPin(val, 'aprupetajs'); 
            // Update 24h flag if changed
            const chk24h = document.getElementById('chk-24h');
            if (chk24h && currentUser && currentUser.id) {
                const is24h = chk24h.checked ? 1 : 0;
                if (currentUser.ir_24h !== is24h) {
                    try {
                        await fetch(`${API_BASE}/users/${currentUser.id}`, {
                            method: 'PUT',
                            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${authToken}` },
                            body: JSON.stringify({ ir_24h: is24h })
                        });
                        currentUser.ir_24h = is24h;
                        localStorage.setItem('currentUser', JSON.stringify(currentUser));
                    } catch (e) { console.error('Failed to update 24h flag:', e); }
                }
            }
            window.location.href = 'aprupetajs.html'; 
        }
        else if (selectedRole === 'admin') { await loginWithPin(val, 'admin'); window.location.href = 'admin.html'; }
        else { await loginWithPassword(val, 'kontrolieris'); window.location.href = 'control.html'; }
        document.getElementById('pin-modal').classList.add('hidden');
        errorEl.classList.add('hidden');
    } catch (err) { errorEl.textContent = err.message || 'Kļūda'; errorEl.classList.remove('hidden'); pinInput.value = ''; }
    pinProcessing = false;
}

function initPinKeypad() {
    const pinInput = document.getElementById('pin-input');
    const keys = document.querySelectorAll('.pin-key');
    
    keys.forEach(key => {
        key.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            if (pinProcessing) return;
            const val = key.dataset.val;
            if (val === 'clear') pinInput.value = '';
            else if (val === 'backspace') pinInput.value = pinInput.value.slice(0, -1);
            else if (pinInput.value.length < 6) pinInput.value += val;
            if (pinInput.value.length >= 6) submitPin();
        });
    });
    
    pinInput.addEventListener('keydown', (e) => {
        if (selectedRole === 'kontrolieris') {
            if (e.key === 'Enter') { e.preventDefault(); submitPin(); }
            return;
        }
        e.preventDefault();
        if (pinProcessing) return;
        if (e.key >= '0' && e.key <= '9' && pinInput.value.length < 6) {
            pinInput.value += e.key;
            if (pinInput.value.length >= 6) submitPin();
        } else if (e.key === 'Backspace') {
            pinInput.value = pinInput.value.slice(0, -1);
        } else if (e.key === 'Escape') {
            document.getElementById('btn-pin-cancel').click();
        }
    });
}

document.addEventListener('DOMContentLoaded', initLoginScreen);
