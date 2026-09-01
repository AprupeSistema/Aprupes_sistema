let currentBlock = null;
let actionInProgress = false;
let diaperHistory = [];
let workersCache = {};

function initCareForm() {
    currentBlock = null;
    actionInProgress = false;
    
    document.getElementById('btn-detail-back').onclick = () => {
        if (!confirm('Ir nesaglabātas izmaiņas. Vai tiešām vēlaties atgriezties?')) return;
        showScreen('aprupetajs');
        window.dispatchEvent(new CustomEvent('refresh-dashboard'));
    };
    
    document.getElementById('btn-block-back').onclick = () => {
        showScreen('client-detail');
        loadClientDetail();
    };
    
    const saveBtn = document.getElementById('btn-save-care');
    if (saveBtn) {
        saveBtn.onclick = async () => {
            await saveCareForm();
        };
    }
    
    const signBtn = document.getElementById('btn-sign-care');
    if (signBtn) {
        signBtn.onclick = async () => {
            await signCare();
        };
    }
    
    if (currentUser && document.getElementById('caregiver-signature')) {
        document.getElementById('caregiver-signature').textContent = `${currentUser.vards} ${currentUser.uzvards}`;
    }
}

async function saveCareForm() {
    if (!currentClient) return;
    const now = new Date();
    const datums = now.toISOString().split('T')[0];
    
    try {
        const atzimes = await apiGet(`/atzimes?klients_id=${currentClient.id}&no=${datums}&līdz=${datums}`);
        const hasAny = atzimes.length > 0;
        
        const dayRecord = {
            klienta_id: currentClient.id,
            darbinieks_id: currentUser.id,
            datums: datums,
            status: hasAny ? 'pabeigta' : 'nav_veikta',
            ir_pabeigts: hasAny ? 1 : 0
        };
        
        const res = await fetch(`${API_BASE}/ieraksti`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${authToken}` },
            body: JSON.stringify(dayRecord)
        });
        
        if (res.ok) {
            showToast('Aprūpe saglabāta', 'success');
            showScreen('aprupetajs');
            window.dispatchEvent(new CustomEvent('refresh-dashboard'));
        } else {
            showToast('Kļūda saglabājot', 'error');
        }
    } catch (e) {
        console.error('Failed to save care form:', e);
        showToast('Kļūda saglabājot', 'error');
    }
}

function getTempStatus(value) {
    const temp = parseFloat(value);
    if (isNaN(temp)) return { status: 'normal', label: 'N', class: 'normal' };
    if (temp >= 37) return { status: 'abnormal', label: 'SARKANS', class: 'abnormal' };
    return { status: 'normal', label: 'N', class: 'normal' };
}

function updateTempDisplay(value) {
    const display = document.getElementById('temp-value-display');
    const statusEl = document.getElementById('temp-status-display');
    if (!display || !statusEl) return;
    
    if (!value) {
        display.textContent = '—';
        statusEl.textContent = '';
        return;
    }
    
    display.textContent = `${value} °C`;
    const tempStatus = getTempStatus(value);
    statusEl.textContent = tempStatus.label;
    statusEl.className = `temp-status ${tempStatus.class}`;
}

async function saveTemp() {
    if (actionInProgress) return;
    const input = document.getElementById('temp-input');
    const value = input.value.trim();
    if (!value) {
        showToast('Ievadi temperatūru', 'warning');
        return;
    }
    
    actionInProgress = true;
    await saveSingleEvent('temp', 'temperatura', value);
    updateTempDisplay(value);
    hideTempInput();
    actionInProgress = false;
}

async function signCare() {
    if (actionInProgress) return;
    actionInProgress = true;
    await saveSingleEvent('paraksts', 'aprupetaja_paraksts', 'X');
    showToast('Parakstīts', 'success');
    actionInProgress = false;
}

function openClientDetail(client) {
    currentClient = client;
    document.getElementById('detail-client-name').textContent = `${client.vards} ${client.uzvards}`;
    document.getElementById('detail-date').textContent = new Date().toISOString().split('T')[0];
    showScreen('client-detail');
    initCareForm();
    loadClientDetail();
}

async function loadClientDetail() {
    if (!currentClient) return;
    const today = new Date().toISOString().split('T')[0];
    
    let atzimes;
    try {
        atzimes = await apiGet(`/atzimes?klients_id=${currentClient.id}&no=${today}&līdz=${today}`);
        await cacheClientAtzimes(currentClient.id, atzimes);
    } catch (e) {
        console.warn('Offline: using cached atzimes');
        atzimes = await getCachedAtzimes(currentClient.id);
        if (atzimes.length === 0) {
            showToast('Nav interneta — dati var būt novecoti', 'warning');
        }
    }
        
    try {
        const fluids = atzimes.filter(a => a.kategorija === 'sikdrumi' && a.lauka_nosaukums === 'uznemts_ml');
        const totalFluids = fluids.reduce((sum, a) => sum + (parseFloat(a.vertiba) || 0), 0);
        document.getElementById('fluids-hint').textContent = `${Math.round(totalFluids)} ml`;
        
        const urine = atzimes.filter(a => a.kategorija === 'sikdrumi' && a.lauka_nosaukums === 'urins_ml');
        const totalUrine = urine.reduce((sum, a) => sum + (parseFloat(a.vertiba) || 0), 0);
        document.getElementById('physiology-hint').textContent = `${Math.round(totalUrine)} ml`;
        
        const tempRecords = atzimes.filter(a => a.kategorija === 'temp' && a.lauka_nosaukums === 'temperatura');
        if (tempRecords.length > 0) {
            const latest = tempRecords.sort((a, b) => new Date(b.laika_zimogs) - new Date(a.laika_zimogs))[0];
            updateTempDisplay(latest.vertiba);
        } else {
            updateTempDisplay('');
        }
        
        const hygiene = atzimes.filter(a => a.kategorija === 'higiena');
        if (hygiene.length > 0) {
            const latest = hygiene.sort((a, b) => new Date(b.laika_zimogs) - new Date(a.lauka_nosaukums))[0];
            document.getElementById('hygiene-hint').textContent = FIELD_LABELS[latest.lauka_nosaukums] || latest.lauka_nosaukums;
        }
        
        const meals = atzimes.filter(a => a.kategorija === 'edinasana');
        if (meals.length > 0) {
            const latest = meals.sort((a, b) => new Date(b.laika_zimogs) - new Date(a.lauka_nosaukums))[0];
            document.getElementById('meals-hint').textContent = FIELD_LABELS[latest.lauka_nosaukums] || latest.lauka_nosaukums;
        }
        
        const activity = atzimes.filter(a => a.kategorija === 'aktivitate');
        if (activity.length > 0) {
            const latest = activity.sort((a, b) => new Date(b.laika_zimogs) - new Date(a.lauka_nosaukums))[0];
            document.getElementById('activity-hint').textContent = FIELD_LABELS[latest.lauka_nosaukums] || latest.lauka_nosaukums;
        }
        
        const pastaiga = atzimes.find(a => a.kategorija === 'citi_pasakumi' && a.lauka_nosaukums === 'pastaiga');
        document.getElementById('pastaiga-hint').textContent = pastaiga ? '✓' : 'Nav veikts';
        
        const ciemini = atzimes.find(a => a.kategorija === 'citi_pasakumi' && a.lauka_nosaukums === 'ciemini');
        document.getElementById('ciemini-hint').textContent = ciemini ? (ciemini.vertiba === 'Jā' ? 'Jā' : 'Nē') : 'Nav veikts';
        
        const autins = atzimes.filter(a => a.kategorija === 'citi_pasakumi' && a.lauka_nosaukums === 'autins_biksitu_skaits');
        const totalDiapers = autins.reduce((sum, a) => sum + (parseInt(a.vertiba, 10) || 0), 0);
        document.getElementById('autins-hint').textContent = totalDiapers > 0 ? `${totalDiapers} maiņas` : 'Nav veikts';
        
        const signature = atzimes.find(a => a.kategorija === 'paraksts' && a.lauka_nosaukums === 'aprupetaja_paraksts');
        const signBtn = document.getElementById('btn-sign-care');
        const signSection = document.getElementById('signature-section');
        if (signature) {
            if (signBtn) signBtn.textContent = 'Parakstīts';
            if (signBtn) signBtn.disabled = true;
            if (signSection) signSection.classList.add('signed');
        } else {
            if (signBtn) signBtn.textContent = 'Parakstīties';
            if (signBtn) signBtn.disabled = false;
            if (signSection) signSection.classList.remove('signed');
        }
        
        // Mark completed actions
        completedActions.clear();
        atzimes.forEach(a => {
            const actionKey = `${a.kategorija}_${a.lauka_nosaukums}_${a.vertiba}`;
            completedActions.add(actionKey);
        });
        
        // Update button states
        document.querySelectorAll('.action-item').forEach(btn => {
            const onclick = btn.getAttribute('onclick') || '';
            const match = onclick.match(/quickAction\('([^']+)',\s*'([^']+)',\s*'([^']+)'\)/);
            if (match) {
                const key = `${match[1]}_${match[2]}_${match[3]}`;
                if (completedActions.has(key)) {
                    btn.classList.add('completed');
                    if (!btn.textContent.includes('✓')) {
                        btn.textContent = btn.textContent + ' ✓';
                    }
                }
            }
        });
        
    } catch (e) {
        console.error('Failed to load client detail:', e);
    }
}

function showTempInput() {
    document.getElementById('temp-input-area').classList.remove('hidden');
    document.getElementById('temp-input').value = '';
    document.getElementById('temp-input').focus();
}

function hideTempInput() {
    document.getElementById('temp-input-area').classList.add('hidden');
}

async function fetchWorkers() {
    if (Object.keys(workersCache).length > 0) return;
    try {
        const users = await apiGet('/users');
        users.forEach(u => { workersCache[u.id] = u; });
    } catch (e) {
        console.error('Failed to fetch workers:', e);
    }
}

async function loadDiaperHistory() {
    if (!currentClient) return;
    const today = new Date().toISOString().split('T')[0];
    try {
        await fetchWorkers();
        const atzimes = await apiGet(`/atzimes?klients_id=${currentClient.id}&no=${today}&līdz=${today}`);
        await cacheClientAtzimes(currentClient.id, atzimes);
        diaperHistory = atzimes
            .filter(a => a.kategorija === 'citi_pasakumi' && a.lauka_nosaukums === 'autins_biksitu_skaits')
            .sort((a, b) => new Date(b.laika_zimogs) - new Date(a.laika_zimogs));
        renderDiaperHistory();
    } catch (e) {
        console.warn('Offline: using cached diaper history');
        const cached = await getCachedAtzimes(currentClient.id);
        diaperHistory = cached
            .filter(a => a.kategorija === 'citi_pasakumi' && a.lauka_nosaukums === 'autins_biksitu_skaits')
            .sort((a, b) => new Date(b.laika_zimogs) - new Date(a.laika_zimogs));
        renderDiaperHistory();
    }
}

function renderDiaperHistory() {
    const tbody = document.getElementById('diaper-history-body');
    if (!tbody) return;
    
    const total = diaperHistory.reduce((sum, a) => sum + (parseInt(a.vertiba, 10) || 0), 0);
    const countEl = document.getElementById('diaper-count-display');
    if (countEl) countEl.textContent = total;
    
    if (diaperHistory.length === 0) {
        tbody.innerHTML = '<tr><td colspan="3">Nav maiņu</td></tr>';
        return;
    }
    
    tbody.innerHTML = diaperHistory.map(change => {
        const worker = workersCache[change.darbinieka_id];
        const workerName = worker ? `${worker.vards} ${worker.uzvards}` : '—';
        return `
            <tr>
                <td>${new Date(change.laika_zimogs).toLocaleTimeString('lv-LV', {hour: '2-digit', minute:'2-digit'})}</td>
                <td>${workerName}</td>
                <td>+1 maiņa</td>
            </tr>
        `;
    }).join('');
}

function showBlockActions(block, clearInputs = false) {
    currentBlock = block;
    const titles = {
        hygiene: 'Higiēna',
        meals: 'Ēdināšana',
        fluids: 'Šķidrums',
        physiology: 'Fizioloģija',
        activity: 'Aktivitāte',
        other: 'Citi',
        pastaiga: 'Pastaiga',
        ciemini: 'Ciemiņi',
        autins_biksitu: 'Autiņbikšu maiņa'
    };
    document.getElementById('block-title').textContent = titles[block] || block;
    
    const content = document.getElementById('block-actions-content');
    content.innerHTML = getBlockActionsHTML(block);
    
    if (clearInputs) {
        setTimeout(() => {
            const fluidInput = document.getElementById('fluid-amount-input');
            const urineInput = document.getElementById('urine-amount-input');
            if (fluidInput) fluidInput.value = '';
            if (urineInput) urineInput.value = '';
        }, 0);
    }
    
    showScreen('block-actions');
    
    if (block === 'autins_biksitu') {
        setTimeout(() => loadDiaperHistory(), 0);
    }
    
    setTimeout(() => {
        document.querySelectorAll('.action-item').forEach(btn => {
            const onclick = btn.getAttribute('onclick') || '';
            const match = onclick.match(/quickAction\('([^']+)',\s*'([^']+)',\s*'([^']+)'\)/);
            if (match) {
                const key = `${match[1]}_${match[2]}_${match[3]}`;
                if (completedActions.has(key)) {
                    btn.classList.add('completed');
                    if (!btn.textContent.includes('✓')) {
                        btn.textContent = btn.textContent + ' ✓';
                    }
                }
            }
        });
    }, 50);
}

function getCurrentMealBlock() {
    const hour = new Date().getHours();
    if (hour >= 9 && hour < 11) return 'brokasti';
    if (hour >= 11 && hour < 16) return 'pusdienas';
    if (hour >= 16 && hour < 18) return 'vakariņas';
    if (hour >= 18 && hour < 24) return 'launags';
    return 'brokasti';
}

function showMealBlock() {
    showBlockActions('meals');
    
    // Highlight current meal block
    setTimeout(() => {
        const block = getCurrentMealBlock();
        document.querySelectorAll('.meal-group').forEach(group => {
            if (group.dataset.meal === block) {
                group.classList.add('current-meal');
            } else {
                group.classList.remove('current-meal');
            }
        });
    }, 50);
}

function showAllMeals() {
    showBlockActions('meals');
    setTimeout(() => {
        document.querySelectorAll('.meal-group').forEach(group => {
            group.classList.remove('hidden', 'current-meal');
        });
    }, 50);
}

function getBlockActionsHTML(block) {
    if (block === 'hygiene') {
        return `
            <div class="block-actions-list">
                <div class="action-item" onclick="quickAction('higiena', 'mutes_dobuma_kopsana', 'X')">Mutes dobuma kopšana</div>
                <div class="action-item" onclick="quickAction('higiena', 'vanna_dusha', 'X')">Vanna, duša</div>
                <div class="action-item" onclick="quickAction('higiena', 'dalej_apmazgasana', 'X')">Daļēja apmazgāšana</div>
                <div class="action-item" onclick="quickAction('higiena', 'velas_maina', 'X')">Veļas maiņa</div>
                <div class="action-item" onclick="quickAction('higiena', 'nagu_kopsana', 'X')">Nagu kopšana</div>
                <div class="action-item" onclick="quickAction('higiena', 'matu_kopsana', 'X')">Matu kopšana</div>
                <div class="action-item" onclick="quickAction('higiena', 'bardas_skusana', 'X')">Bārdas skūšana</div>
            </div>
        `;
    } else if (block === 'meals') {
        return `
            <div class="block-actions-list">
                <div class="meal-group" data-meal="brokasti">
                    <div class="meal-header">Brokastis *</div>
                    <div class="meal-options">
                        <div class="action-item meal-btn" onclick="selectMeal('edinasana', 'brokasti', 'X', this)">X — visa porcija</div>
                        <div class="action-item meal-btn" onclick="selectMeal('edinasana', 'brokasti', '½', this)">½ — puse porcijas</div>
                        <div class="action-item meal-btn" onclick="selectMeal('edinasana', 'brokasti', 'A', this)">A — atteicās</div>
                    </div>
                </div>
                <div class="meal-group" data-meal="pusdienas">
                    <div class="meal-header">Pusdienas *</div>
                    <div class="meal-options">
                        <div class="action-item meal-btn" onclick="selectMeal('edinasana', 'pusdienas', 'X', this)">X — visa porcija</div>
                        <div class="action-item meal-btn" onclick="selectMeal('edinasana', 'pusdienas', '½', this)">½ — puse porcijas</div>
                        <div class="action-item meal-btn" onclick="selectMeal('edinasana', 'pusdienas', 'A', this)">A — atteicās</div>
                    </div>
                </div>
                <div class="meal-group" data-meal="launags">
                    <div class="meal-header">Launags *</div>
                    <div class="meal-options">
                        <div class="action-item meal-btn" onclick="selectMeal('edinasana', 'launags', 'X', this)">X — visa porcija</div>
                        <div class="action-item meal-btn" onclick="selectMeal('edinasana', 'launags', '½', this)">½ — puse porcijas</div>
                        <div class="action-item meal-btn" onclick="selectMeal('edinasana', 'launags', 'A', this)">A — atteicās</div>
                    </div>
                </div>
                <div class="meal-group" data-meal="vakariņas">
                    <div class="meal-header">Vakariņas *</div>
                    <div class="meal-options">
                        <div class="action-item meal-btn" onclick="selectMeal('edinasana', 'vakariņas', 'X', this)">X — visa porcija</div>
                        <div class="action-item meal-btn" onclick="selectMeal('edinasana', 'vakariņas', '½', this)">½ — puse porcijas</div>
                        <div class="action-item meal-btn" onclick="selectMeal('edinasana', 'vakariņas', 'A', this)">A — atteicās</div>
                    </div>
                </div>
            </div>
            <div class="time-hint" style="margin-top: 12px; font-size: 12px; color: var(--text-secondary);">
                * — obligātie ieraksti
            </div>
        `;
    } else if (block === 'fluids') {
        return `
            <div class="block-actions-list">
                <div class="action-item fluid-action">
                    <input type="number" id="fluid-amount-input" class="input-number" placeholder="ml" min="0" style="width:120px;">
                    <button class="btn btn-primary btn-small" onclick="addFluidAmount()">Pievienot šķidrumu</button>
                </div>
            </div>
        `;
    } else if (block === 'physiology') {
        return `
            <div class="block-actions-list">
                <div class="action-item fluid-action">
                    <input type="number" id="urine-amount-input" class="input-number" placeholder="ml" min="0" style="width:120px;">
                    <button class="btn btn-primary btn-small" onclick="addUrineAmount()">Pievienot urīnu</button>
                </div>
                <div class="action-item" onclick="quickAction('sikdrumi', 'vedera_izeja', 'N')">Zarnu darbība — normāla</div>
                <div class="action-item" onclick="quickAction('sikdrumi', 'vedera_izeja', 'A')">Zarnu darbība — aizcietējums</div>
            </div>
        `;
    } else if (block === 'activity') {
        return `
            <div class="block-actions-list">
                <div class="action-item" onclick="quickAction('aktivitate', 'parvietosanas', 'X')">Pārvietošanās ar palīglīdzekli</div>
                <div class="action-item" onclick="quickAction('aktivitate', 'stav_ar_palidzibu', 'X')">Stāv ar palīdzību</div>
                <div class="action-item" onclick="quickAction('aktivitate', 'sez_ar_palidzibu', 'X')">Sēž ar palīdzību</div>
            </div>
        `;
    } else if (block === 'other') {
        return `
            <div class="block-actions-list">
                <div class="action-item" onclick="quickAction('citi_pasakumi', 'pastaiga', 'X')">🚶 Pastaiga</div>
                <div class="action-item" onclick="quickAction('citi_pasakumi', 'ciemini', 'Jā')">👥 Ciemiņi — Jā</div>
                <div class="action-item" onclick="quickAction('citi_pasakumi', 'ciemini', 'Nē')">👥 Ciemiņi — Nē</div>
                <div class="action-item" onclick="quickAction('citi_pasakumi', 'autins_biksitu_skaits', '1')">🍼 Autiņbikšu maiņa</div>
            </div>
        `;
    } else if (block === 'pastaiga') {
        return `
            <div class="block-actions-list">
                <div class="action-item" onclick="quickAction('citi_pasakumi', 'pastaiga', 'X')">🚶 Pastaiga</div>
            </div>
        `;
    } else if (block === 'ciemini') {
        return `
            <div class="block-actions-list">
                <div class="action-item" onclick="quickAction('citi_pasakumi', 'ciemini', 'Jā')">👥 Ciemiņi — Jā</div>
                <div class="action-item" onclick="quickAction('citi_pasakumi', 'ciemini', 'Nē')">👥 Ciemiņi — Nē</div>
            </div>
        `;
    } else if (block === 'autins_biksitu') {
        return `
            <div class="block-actions-list">
                <div class="action-item" onclick="quickAction('citi_pasakumi', 'autins_biksitu_skaits', '1')">🍼 +1 maiņa</div>
            </div>
            <div class="diaper-count-display" style="margin-top: 12px; font-size: 14px; font-weight: 600;">
                Šodienas maiņas: <span id="diaper-count-display">0</span>
            </div>
            <div class="diaper-table-container" style="margin-top: 12px;">
                <table class="diaper-table">
                    <thead>
                        <tr><th>Laiks</th><th>Aprūpētājs</th><th>Darbība</th></tr>
                    </thead>
                    <tbody id="diaper-history-body">
                        <tr><td colspan="3">Ielādē...</td></tr>
                    </tbody>
                </table>
            </div>
        `;
    }
    return '<p>Nav pieejamu darbību</p>';
}

let recentActions = new Map();

async function selectMeal(category, field, value, btn) {
    if (actionInProgress) return;
    
    const actionKey = `${category}_${field}_${value}`;
    const now = Date.now();
    
    if (recentActions.has(actionKey) && now - recentActions.get(actionKey) < 1000) {
        showToast('Jau saglabāts!', 'warning');
        return;
    }
    
    actionInProgress = true;
    recentActions.set(actionKey, now);
    
    btn.classList.add('completed');
    btn.textContent = btn.textContent + ' ✓';
    
    try {
        await saveSingleEvent(category, field, value);
        completedActions.add(`${category}_${field}_${value}`);
        showToast('Saglabāts!', 'success');
    } catch (e) {
        console.error('Failed:', e);
        showToast('Kļūda', 'error');
        btn.classList.remove('completed');
        btn.textContent = btn.textContent.replace(' ✓', '');
    } finally {
        actionInProgress = false;
    }
}

async function quickAction(category, field, value) {
    if (actionInProgress) return;
    
    if (category === 'sikdrumi' && field === 'vedera_izeja') {
        const today = new Date().toISOString().split('T')[0];
        const existingCount = completedActions.size; // rough check
        // We'll let the backend enforce the limit, but show warning
        if (completedActions.has('sikdrumi_vedera_izeja_N') || completedActions.has('sikdrumi_vedera_izeja_A')) {
            const count = [...completedActions].filter(k => k.startsWith('sikdrumi_vedera_izeja_')).length;
            if (count >= 2) {
                showToast('Vēdera izziņa jau ierakstīta 2x dienā', 'warning');
                return;
            }
        }
    }
    
    const actionKey = `${category}_${field}_${value}`;
    const now = Date.now();
    
    if (recentActions.has(actionKey) && now - recentActions.get(actionKey) < 1000) {
        showToast('Jau saglabāts!', 'warning');
        return;
    }
    
    actionInProgress = true;
    recentActions.set(actionKey, now);
    
    const btn = event.target.closest('.action-item');
    if (btn) {
        btn.classList.add('completed');
        btn.textContent = btn.textContent + ' ✓';
    }
    
    try {
        await saveSingleEvent(category, field, value);
        completedActions.add(actionKey);
        showToast('Saglabāts!', 'success');
        if (category === 'citi_pasakumi' && field === 'autins_biksitu_skaits') {
            if (!workersCache[currentUser.id]) {
                workersCache[currentUser.id] = currentUser;
            }
            diaperHistory.unshift({
                laika_zimogs: new Date().toISOString(),
                darbinieka_id: currentUser.id,
                vertiba: '1'
            });
            renderDiaperHistory();
        }
    } catch (e) {
        console.error('Failed:', e);
        showToast('Kļūda', 'error');
        if (btn) {
            btn.classList.remove('completed');
            btn.textContent = btn.textContent.replace(' ✓', '');
        }
    } finally {
        actionInProgress = false;
    }
}

async function addFluidAmount() {
    if (actionInProgress) return;
    const input = document.getElementById('fluid-amount-input');
    const amount = parseFloat(input.value);
    if (isNaN(amount) || amount <= 0) {
        showToast('Ievadi derīgu daudzumu', 'warning');
        return;
    }
    actionInProgress = true;
    await saveSingleEvent('sikdrumi', 'uznemts_ml', amount.toString());
    actionInProgress = false;
}

async function addUrineAmount() {
    if (actionInProgress) return;
    const input = document.getElementById('urine-amount-input');
    const amount = parseFloat(input.value);
    if (isNaN(amount) || amount <= 0) {
        showToast('Ievadi derīgu daudzumu', 'warning');
        return;
    }
    actionInProgress = true;
    await saveSingleEvent('sikdrumi', 'urins_ml', amount.toString());
    actionInProgress = false;
}

async function saveSingleEvent(kategorija, lauka_nosaukums, vertiba) {
    if (!currentClient || !currentUser) return;
    const now = new Date();
    const datums = now.toISOString().split('T')[0];
    let maingaDatums = datums;
    if (now.getHours() < 6) {
        const yesterday = new Date(now);
        yesterday.setDate(yesterday.getDate() - 1);
        maingaDatums = yesterday.toISOString().split('T')[0];
    }
    
    const atzime = {
        klienta_id: currentClient.id,
        darbinieka_id: currentUser.id,
        datums: datums,
        maipas_datums: maingaDatums,
        laika_zimogs: now.toISOString(),
        kategorija: kategorija,
        lauka_nosaukums: lauka_nosaukums,
        vertiba: vertiba,
        papildus_info: null,
        ir_labots: 0,
        sākotnējā_vertiba: null
    };
    
    try {
        await saveMark(atzime);
        
        if (kategorija === 'citi_pasakumi' && lauka_nosaukums === 'autins_biksitu_skaits') {
            diaperHistory.unshift({
                laika_zimogs: now.toISOString(),
                darbinieka_id: currentUser.id,
                vertiba: vertiba,
                klienta_id: currentClient.id,
                kategorija: kategorija,
                lauka_nosaukums: lauka_nosaukums
            });
            renderDiaperHistory();
            
            const cached = await getCachedAtzimes(currentClient.id);
            cached.unshift({
                laika_zimogs: now.toISOString(),
                darbinieka_id: currentUser.id,
                vertiba: vertiba,
                klienta_id: currentClient.id,
                kategorija: kategorija,
                lauka_nosaukums: lauka_nosaukums
            });
            await cacheClientAtzimes(currentClient.id, cached);
        }
        
        if (navigator.onLine && authToken) {
            syncWithServer(false);
        } else {
            updateSyncStatus('offline');
        }
    } catch (e) {
        console.error('Failed to save event:', e);
        showToast('Kļūda saglabājot', 'error');
    }
}
